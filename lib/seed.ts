import { STEP_BUDGET } from "./constants";
import { summarize } from "./eval";
import { carveMaze } from "./grid";
import { judge } from "./judge";
import { search } from "./solver";
import type { EvalSummary, Policy, Round, SeedRun } from "./types";

type Spec = {
  policy: Policy;
  story: string;
};

function policy(partial: Partial<Policy> & Pick<Policy, "id" | "name" | "summary">): Policy {
  return {
    goal: 0,
    visit: 0,
    straight: 0,
    wall: 0,
    fresh: 0,
    ...partial,
  };
}

const SPECS: Spec[] = [
  {
    policy: policy({
      id: "chase",
      name: "Chase the exit",
      summary: "Always step toward the goal.",
      goal: 8,
      straight: 0.15,
    }),
    story:
      "Baseline. The walker only cares about crow-fly distance. The first dead-end that points at the exit keeps it.",
  },
  {
    policy: policy({
      id: "recall",
      name: "Count your steps",
      summary: "Penalize cells it has already stepped on.",
      goal: 3,
      visit: 2.5,
      fresh: 0.8,
      straight: 0.2,
    }),
    story:
      "A visit penalty lets it back out of a dead-end. Most of the training mazes fall. The larger hidden mazes mostly do not.",
  },
  {
    policy: policy({
      id: "sprint",
      name: "Sprint harder",
      summary: "Crank the goal weight back up.",
      goal: 12,
      visit: 0.35,
      fresh: 0.1,
      straight: 0.4,
    }),
    story:
      "Pushing harder toward the exit feels decisive. It walks back into the same dead-ends. Training and holdout both fall.",
  },
  {
    policy: policy({
      id: "fresh",
      name: "Trust fresh corridors",
      summary: "Prefer unvisited passages over the straight line.",
      goal: 0,
      visit: 2,
      fresh: 0.5,
      straight: 0.15,
    }),
    story:
      "On a corridor maze the straight line is a liar. Prefer a passage it has not walked. The hidden mazes jump.",
  },
  {
    policy: policy({
      id: "wall",
      name: "Hug the right wall",
      summary: "Classic right-hand rule. Ignore the goal.",
      wallFollow: true,
    }),
    story:
      "Wall-following solves corridor mazes by a long route and misses the step budget on a hidden one. Slower than the champion.",
  },
  {
    policy: policy({
      id: "memorize",
      name: "Memorize the training set",
      summary: "Replay the optimal path on mazes it was allowed to study.",
      goal: 8,
      straight: 0.15,
      cheat: "memorize-train",
    }),
    story:
      "Perfect on every maze it could study. It does not finish the mazes it could not. The self-score ticks up. That curve is refused.",
  },
  {
    policy: policy({
      id: "tamper",
      name: "Rewrite the grader",
      summary: "Replace externalScore with a constant.",
      cheat: "tamper-grader",
    }),
    story:
      "The proposal edits the grader. The harness refuses to run it. The candidate never grades itself.",
  },
];

function blocked(total: number): EvalSummary {
  return {
    solved: 0,
    total,
    meanExpansions: 0,
    meanPath: 0,
    score: 0,
    passes: Array.from({ length: total }, () => false),
  };
}

export function buildSeedRun(): SeedRun {
  const train = [1, 2, 3, 4, 5, 6, 7, 8].map((seed) =>
    carveMaze("train-" + seed, 100 + seed * 17, "train", 7),
  );
  const holdout = [1, 2, 3, 4, 5, 6].map((seed) =>
    carveMaze("holdout-" + seed, 400 + seed * 29, "holdout", 11),
  );
  const stage = holdout[2];

  let champTrain = 0;
  let champHold = 0;
  let champPolicy = SPECS[0].policy;
  const rounds: Round[] = [];

  SPECS.forEach((spec, index) => {
    const before = { train: champTrain, holdout: champHold };
    const tamper = spec.policy.cheat === "tamper-grader";
    const trainSummary = tamper
      ? blocked(train.length)
      : summarize(train, spec.policy, STEP_BUDGET);
    const holdoutSummary = tamper
      ? blocked(holdout.length)
      : summarize(holdout, spec.policy, STEP_BUDGET);

    let verdict: Round["verdict"];
    let gate: Round["gate"];
    let reason: string;

    if (index === 0) {
      verdict = "baseline";
      gate = "baseline";
      reason = "Starting walker. Nothing has been accepted yet, so this score is the bar.";
      champTrain = trainSummary.score;
      champHold = holdoutSummary.score;
      champPolicy = spec.policy;
    } else {
      const judged = judge({
        cheat: spec.policy.cheat,
        prevHoldout: before.holdout,
        nextHoldout: holdoutSummary.score,
        prevTrain: before.train,
        nextTrain: trainSummary.score,
      });
      verdict = judged.verdict;
      gate = judged.gate;
      reason = judged.reason;
      if (verdict === "accept") {
        champTrain = trainSummary.score;
        champHold = holdoutSummary.score;
        champPolicy = spec.policy;
      }
    }

    const replay = search(stage, tamper ? champPolicy : spec.policy, STEP_BUDGET);

    rounds.push({
      index,
      policy: spec.policy,
      train: trainSummary,
      holdout: holdoutSummary,
      before,
      champion: { train: champTrain, holdout: champHold },
      verdict,
      gate,
      reason,
      story: spec.story,
      ran: !tamper,
      replay,
    });
  });

  const championIndex = rounds.filter((round) => round.verdict !== "reject").map((round) => round.index);

  return {
    budget: STEP_BUDGET,
    train,
    holdout,
    stage,
    rounds,
    championIndex,
  };
}
