// Verified self-update controller, built on the proof and decision primitives.
//   proof:    checkProof gates promotion on an artifact-bound, passing proof.
//   decision: every step is appended to a hash-chained DecisionLog.
//
// The controller is generic: it does not know how to deploy or verify. Callers
// inject those. The live wiring is in live.ts; the tests inject simulators.

import { checkProof, type Proof } from './proof.ts';
import { DecisionLog, verifyChain, type DecisionRecord } from './decision.ts';

export type Candidate = { revision: string };

export type UpdatePorts = {
  /** Deploy a candidate; returns the artifact digest now live (e.g. the SHA). */
  deploy: (revision: string) => Promise<string>;
  /** Verify the live deployment; returns a proof bound to an artifact digest. */
  verify: (revision: string) => Promise<Proof>;
  /** Restore a known-good revision after a failed candidate. */
  rollback: (revision: string) => Promise<string>;
};

export type UpdateResult = {
  promoted: boolean;
  reason: string;
  liveRevision: string;
  records: readonly DecisionRecord[];
  chainOk: boolean;
};

/**
 * Deploy a candidate, verify it, and promote only if the proof admits.
 * On refusal, roll back to `knownGood`. Every step is recorded and the chain
 * is verified before returning.
 */
export async function update(
  candidate: Candidate,
  knownGood: string,
  ports: UpdatePorts,
  subject = 'self-update',
  now: () => Date = () => new Date(),
): Promise<UpdateResult> {
  const log = new DecisionLog(now);

  log.append({ subject, action: 'deploy', argsRef: candidate.revision, outcome: 'allow', reason: 'deploy candidate' });
  const deployedDigest = await ports.deploy(candidate.revision);

  const proof = await ports.verify(candidate.revision);
  const decision = checkProof(proof, deployedDigest);

  if (decision.admitted) {
    log.append({
      subject,
      action: 'promote',
      argsRef: candidate.revision,
      outcome: 'approve',
      reason: decision.reason,
    });
    return finalize(true, decision.reason, candidate.revision, log);
  }

  // Refused: do not keep the candidate live. Restore the known-good revision.
  log.append({
    subject,
    action: 'promote',
    argsRef: candidate.revision,
    outcome: 'deny',
    reason: decision.reason,
  });
  const restored = await ports.rollback(knownGood);
  log.append({
    subject,
    action: 'rollback',
    argsRef: knownGood,
    outcome: 'allow',
    reason: `restored known-good ${knownGood}`,
  });
  return finalize(false, decision.reason, restored, log);
}

function finalize(promoted: boolean, reason: string, liveRevision: string, log: DecisionLog): UpdateResult {
  return {
    promoted,
    reason,
    liveRevision,
    records: log.records,
    chainOk: verifyChain(log.records).ok,
  };
}
