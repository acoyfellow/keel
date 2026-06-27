export const site = {
  name: 'Keel',
  title: 'Keel: proof gates for self-updating software',
  description:
    'Keel admits a candidate only when a signed, artifact-bound proof passes, then leaves a hash-chained receipt.',
  url: 'https://keel.coey.dev',
  repository: 'https://github.com/acoyfellow/keel',
} as const;

export type ExampleState = 'accepted' | 'refused' | 'neutral';

export type EvidenceExample = {
  readonly title: string;
  readonly claim: string;
  readonly command: string;
  readonly receipt: string;
  readonly result: string;
  readonly state: ExampleState;
};

export const examples: readonly EvidenceExample[] = [
  {
    title: 'Bad live candidate refused',
    claim: 'A candidate that builds but fails a real request cannot promote.',
    command: 'bun run examples/refuse-bad-self-update/run.ts',
    receipt: 'receipts/example-refuse-bad-self-update.md',
    result: 'promotion denied; known-good restored',
    state: 'refused',
  },
  {
    title: 'Stolen token inert',
    claim: 'A valid write token cannot promote a different artifact without a fresh proof.',
    command: 'bun run examples/stolen-token-useless/run.ts',
    receipt: 'receipts/example-stolen-token-useless.md',
    result: 'ref unchanged after replay and forgery attempts',
    state: 'refused',
  },
  {
    title: 'One key cannot ship',
    claim: 'A 2-of-3 threshold blocks a single compromised verifier key.',
    command: 'bun run examples/one-key-cant-ship/run.ts',
    receipt: 'receipts/example-one-key-cant-ship.md',
    result: 'single signer refused; edited log detected',
    state: 'refused',
  },
  {
    title: 'Audit survives restart',
    claim: 'Trust state and signed decisions survive reload and detect tamper.',
    command: 'bun run examples/audit-survives-restart/run.ts',
    receipt: 'receipts/example-audit-survives-restart.md',
    result: '7 checks pass after reload and tamper injection',
    state: 'accepted',
  },
  {
    title: 'Hand-rolled gate deleted',
    claim: 'A toy worker deletes local deploy-gate logic by importing Keel.',
    command: 'bun run examples/delete-the-handrolled-gate/run.ts',
    receipt: 'receipts/example-delete-the-handrolled-gate.md',
    result: '41 owner lines shrink to 25 while attacks flip to refused',
    state: 'accepted',
  },
] as const;

export const quickStart = [
  {
    command: 'bun install',
    note: 'install the library and site workspace',
  },
  {
    command: 'bun test',
    note: 'run deterministic library and content checks',
  },
  {
    command: 'bun run examples/delete-the-handrolled-gate/run.ts',
    note: 'replay the deletion receipt',
  },
] as const;

export const mechanics = [
  'A candidate is named by content digest.',
  'A verifier builds, smokes, and records evidence for that exact digest.',
  'The proof is signed by an active trusted key, or by enough keys for a threshold.',
  'Promotion uses a scoped token and compare-and-swap against the known baseline.',
  'Every decision appends to a hash-chained receipt.',
] as const;

export const boundaries = [
  'Keel does not deploy an app for you.',
  'Keel does not hold long-lived write credentials.',
  'Keel does not trust a passing test without an artifact-bound proof.',
  'Keel does not claim downstream adoption until another project imports it and deletes code.',
] as const;
