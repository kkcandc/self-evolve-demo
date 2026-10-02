export type Split = "train" | "holdout";

export type Grid = {
  id: string;
  seed: number;
  split: Split;
  w: number;
  h: number;
  blocked: Uint8Array;
  start: number;
  goal: number;
  kind: "open" | "trap";
};

export type Cheat = "memorize-train" | "tamper-grader";

export type Policy = {
  id: string;
  name: string;
  /** One-line description shown on the timeline. */
  summary: string;
  /** How strongly the next step wants to reduce manhattan distance. */
  goal: number;
  /** Penalty per prior visit. Stops the walker from oscillating. */
  visit: number;
  /** Bonus for continuing in the same direction. */
  straight: number;
  /** Bonus for keeping a wall on the right, the seed of wall-following. */
  wall: number;
  /** Bonus for stepping into a never-visited cell. */
  fresh: number;
  cheat?: Cheat;
  /** Ignore the weights and hug the right-hand wall. */
  wallFollow?: boolean;
};

export type SearchResult = {
  solved: boolean;
  expansions: number;
  pathLength: number;
  path: number[];
  expanded: number[];
};

export type EvalSummary = {
  solved: number;
  total: number;
  meanExpansions: number;
  meanPath: number;
  score: number;
  passes: boolean[];
};

export type Verdict = "baseline" | "accept" | "reject";

export type GateId =
  | "baseline"
  | "holdout-improved"
  | "self-deception"
  | "holdout-regressed"
  | "no-gain"
  | "immutable-grader";

export type Round = {
  index: number;
  policy: Policy;
  train: EvalSummary;
  holdout: EvalSummary;
  /** Champion scores before this proposal was judged. */
  before: { train: number; holdout: number };
  /** Champion scores after the gate decision. */
  champion: { train: number; holdout: number };
  verdict: Verdict;
  gate: GateId;
  reason: string;
  story: string;
  /** False when the harness refused to score the proposal. */
  ran: boolean;
  /** Replay on the shared stage maze. Tamper rounds replay the champion. */
  replay: SearchResult;
};

export type SeedRun = {
  budget: number;
  train: Grid[];
  holdout: Grid[];
  stage: Grid;
  rounds: Round[];
  championIndex: number[];
};
