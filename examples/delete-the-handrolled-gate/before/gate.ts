// BEFORE: a toy owner-operated worker's own hand-rolled deploy gate.
//
// This is the kind of code an owner writes the first time they need to answer
// two questions before letting a deploy go live:
//   1. "Is this deploy ok?"      -> a quality/approval check
//   2. "Who approved it?"        -> an authorization check
//
// It is honest about what it is: ad-hoc booleans, string compares, and a
// mutable head pointer. There is NO cryptographic signing (an "approval" is
// just a string field anyone can type), and NO compare-and-swap on the head
// (a promotion writes the head unconditionally, so a stale baseline still
// wins). These two gaps are exactly what `after/` deletes-and-replaces.
//
// LOC accounting: everything between BEGIN GATE and END GATE is the substrate
// the owner would have to maintain. The run harness counts those lines.

export type Deploy = {
  candidate: string; // SHA being deployed
  baseline: string; // SHA the promoter believed was live when it started
  testsPassed: boolean; // did the candidate's tests pass?
  approvedBy: string; // who says this is ok (a bare string -- unsigned!)
  approvalToken: string; // a shared "secret" string the worker trusts
};

export type GateResult = { ok: true; newHead: string } | { ok: false; reason: string };

// >>> BEGIN GATE (hand-rolled substrate the owner must maintain) >>>
export class HandRolledGate {
  // The owner keeps the live head in a plain mutable field.
  private head: string;
  // The set of names the owner decided to "trust", and one shared token string.
  private readonly allowedApprovers: string[];
  private readonly sharedToken: string;

  constructor(initialHead: string, allowedApprovers: string[], sharedToken: string) {
    this.head = initialHead;
    this.allowedApprovers = allowedApprovers;
    this.sharedToken = sharedToken;
  }

  liveHead(): string {
    return this.head;
  }

  // "Is this deploy ok AND who approved it?" -- all ad-hoc.
  promote(d: Deploy): GateResult {
    // is-this-deploy-ok: just a boolean the caller asserts.
    if (!d.testsPassed) {
      return { ok: false, reason: "tests did not pass" };
    }
    // who-approved-it: a name lookup. No signature, so "approvedBy" is whatever
    // string the caller typed. A forged approval is indistinguishable from real.
    let approverKnown = false;
    for (const name of this.allowedApprovers) {
      if (name === d.approvedBy) {
        approverKnown = true;
        break;
      }
    }
    if (!approverKnown) {
      return { ok: false, reason: "approver not in allow-list" };
    }
    // authorization: compare a shared token string. Anyone who knows/guesses
    // the token (or copies a real request) passes. No scope, no expiry.
    if (d.approvalToken !== this.sharedToken) {
      return { ok: false, reason: "bad approval token" };
    }
    // promotion: write the head UNCONDITIONALLY. There is no check that the
    // head is still what the promoter believed (d.baseline). A stale baseline
    // -- a promotion built against an old head -- silently clobbers newer work.
    this.head = d.candidate;
    return { ok: true, newHead: d.candidate };
  }
}
// <<< END GATE <<<
