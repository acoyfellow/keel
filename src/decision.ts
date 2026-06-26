import { createHash } from "node:crypto";

export type DecisionOutcome = "allow" | "deny" | "approve" | "expire";

export type DecisionInput = {
  subject: string;
  approver?: string;
  action: string;
  argsRef?: string;
  outcome: DecisionOutcome;
  timestamp?: string;
  reason: string;
};

export type DecisionRecord = Omit<DecisionInput, "timestamp"> & {
  timestamp: string;
  previousHash: string | null;
  hash: string;
};

export type ChainVerification =
  | { ok: true; brokenIndex: null }
  | { ok: false; brokenIndex: number };

export class DecisionLog {
  readonly records: DecisionRecord[] = [];
  readonly #now: () => Date;

  constructor(now: () => Date = () => new Date()) {
    this.#now = now;
  }

  append(input: DecisionInput): DecisionRecord {
    const body = {
      ...input,
      timestamp: input.timestamp ?? this.#now().toISOString(),
      previousHash: this.records.at(-1)?.hash ?? null,
    };
    const record = { ...body, hash: hashRecord(body) };
    this.records.push(record);
    return record;
  }
}

export function verifyChain(records: readonly DecisionRecord[]): ChainVerification {
  for (let index = 0; index < records.length; index++) {
    const record = records[index];
    const expectedPreviousHash = index === 0 ? null : records[index - 1].hash;
    if (record.previousHash !== expectedPreviousHash || record.hash !== hashRecord(withoutHash(record))) {
      return { ok: false, brokenIndex: index };
    }
  }
  return { ok: true, brokenIndex: null };
}

function withoutHash({ hash: _hash, ...body }: DecisionRecord): Omit<DecisionRecord, "hash"> {
  return body;
}

function hashRecord(value: unknown): string {
  return createHash("sha256").update(stableJson(value)).digest("hex");
}

function stableJson(value: unknown): string {
  if (value === undefined) return '"[undefined]"';
  if (typeof value === "bigint") return JSON.stringify(value.toString());
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  return `{${Object.entries(value as Record<string, unknown>)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`)
    .join(",")}}`;
}
