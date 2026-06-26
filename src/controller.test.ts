import { describe, expect, test } from 'bun:test';
import { update, type UpdatePorts } from './controller.ts';
import { makeProof, type Proof } from './proof.ts';
import { verifyChain } from './decision.ts';

const fixedNow = () => new Date('2026-01-01T00:00:00.000Z');

// A simulator: deploy makes the candidate revision live; verify returns a proof
// the test controls; rollback makes the known-good live again.
function ports(verify: (rev: string, live: string) => Proof): { ports: UpdatePorts; live: () => string } {
  let live = 'none';
  return {
    live: () => live,
    ports: {
      deploy: async (rev) => { live = rev; return rev; },
      rollback: async (rev) => { live = rev; return rev; },
      verify: async (rev) => verify(rev, live),
    },
  };
}

describe('verified self-update controller', () => {
  test('good candidate: proof passes, promotes, chain verifies', async () => {
    const { ports: p, live } = ports((rev) =>
      makeProof({ artifactDigest: rev, verifier: 'probe', policy: 'health@1', result: 'pass', evidence: 'http 200' }),
    );
    const r = await update({ revision: 'good-sha' }, 'old-sha', p, 'test', fixedNow);

    expect(r.promoted).toBe(true);
    expect(r.liveRevision).toBe('good-sha');
    expect(live()).toBe('good-sha');
    expect(r.chainOk).toBe(true);
    expect(r.records.map((x) => x.outcome)).toEqual(['allow', 'approve']);
  });

  test('bad candidate (failing proof): rolls back to known-good, chain verifies', async () => {
    const { ports: p, live } = ports((rev) =>
      makeProof({ artifactDigest: rev, verifier: 'probe', policy: 'health@1', result: 'fail', evidence: 'http 500' }),
    );
    const r = await update({ revision: 'bad-sha' }, 'old-sha', p, 'test', fixedNow);

    expect(r.promoted).toBe(false);
    expect(r.liveRevision).toBe('old-sha');
    expect(live()).toBe('old-sha');
    expect(r.chainOk).toBe(true);
    expect(r.records.map((x) => x.outcome)).toEqual(['allow', 'deny', 'allow']);
  });

  test('lying proof (bound to a different artifact): refused, rolls back', async () => {
    // verifier returns pass but for the wrong digest — checkProof must refuse.
    const { ports: p, live } = ports(() =>
      makeProof({ artifactDigest: 'some-other-sha', verifier: 'probe', policy: 'health@1', result: 'pass', evidence: 'http 200' }),
    );
    const r = await update({ revision: 'good-sha' }, 'old-sha', p, 'test', fixedNow);

    expect(r.promoted).toBe(false);
    expect(r.reason).toContain('does not bind the expected artifact');
    expect(live()).toBe('old-sha');
    expect(verifyChain(r.records).ok).toBe(true);
  });
});
