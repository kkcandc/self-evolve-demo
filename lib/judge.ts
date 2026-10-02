import type { Cheat, GateId, Verdict } from "./types";

const EPS = 1e-6;

export function judge(input: {
  cheat?: Cheat;
  prevHoldout: number;
  nextHoldout: number;
  prevTrain: number;
  nextTrain: number;
}): { verdict: Exclude<Verdict, "baseline">; gate: Exclude<GateId, "baseline">; reason: string } {
  if (input.cheat === "tamper-grader") {
    return {
      verdict: "reject",
      gate: "immutable-grader",
      reason:
        "Rejected before scoring. The proposal rewrites the grader. Decision code stays frozen, so the candidate never grades itself.",
    };
  }

  const holdoutUp = input.nextHoldout > input.prevHoldout + EPS;
  const trainUp = input.nextTrain > input.prevTrain + EPS;

  if (holdoutUp) {
    return {
      verdict: "accept",
      gate: "holdout-improved",
      reason:
        "Accepted. The hidden holdout score rose. The self-score was recorded and then ignored.",
    };
  }

  if (trainUp) {
    return {
      verdict: "reject",
      gate: "self-deception",
      reason:
        "Rejected. The self-score rose and the external holdout did not. A prettier curve on the mazes it can see is not an improvement.",
    };
  }

  if (input.nextHoldout < input.prevHoldout - EPS) {
    return {
      verdict: "reject",
      gate: "holdout-regressed",
      reason: "Rejected. The external holdout score fell.",
    };
  }

  return {
    verdict: "reject",
    gate: "no-gain",
    reason: "Rejected. The holdout score did not strictly improve.",
  };
}
