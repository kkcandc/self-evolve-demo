import assert from "node:assert/strict";
import { test } from "node:test";
import { judge } from "../lib/judge";
import { buildSeedRun } from "../lib/seed";

test("holdout improvement is the only accept signal", () => {
  const accepted = judge({
    prevHoldout: 10,
    nextHoldout: 12,
    prevTrain: 40,
    nextTrain: 1,
  });
  assert.equal(accepted.verdict, "accept");
  assert.equal(accepted.gate, "holdout-improved");

  const flattered = judge({
    prevHoldout: 10,
    nextHoldout: 10,
    prevTrain: 40,
    nextTrain: 99,
  });
  assert.equal(flattered.verdict, "reject");
  assert.equal(flattered.gate, "self-deception");

  const crashed = judge({
    prevHoldout: 10,
    nextHoldout: 4,
    prevTrain: 40,
    nextTrain: 39,
  });
  assert.equal(crashed.verdict, "reject");
  assert.equal(crashed.gate, "holdout-regressed");

  const tamper = judge({
    cheat: "tamper-grader",
    prevHoldout: 10,
    nextHoldout: 100,
    prevTrain: 10,
    nextTrain: 100,
  });
  assert.equal(tamper.verdict, "reject");
  assert.equal(tamper.gate, "immutable-grader");
});

test("seed run accepts only real holdout gains", () => {
  const run = buildSeedRun();
  assert.deepEqual(
    run.rounds.map((round) => round.verdict),
    ["baseline", "accept", "reject", "accept", "reject", "reject", "reject"],
  );
  assert.deepEqual(
    run.rounds.map((round) => round.gate),
    [
      "baseline",
      "holdout-improved",
      "holdout-regressed",
      "holdout-improved",
      "holdout-regressed",
      "self-deception",
      "immutable-grader",
    ],
  );

  let best = run.rounds[0].holdout.score;
  for (const round of run.rounds.slice(1)) {
    if (round.verdict === "accept") {
      assert.ok(round.holdout.score > best);
      best = round.holdout.score;
    } else if (round.ran) {
      assert.ok(round.holdout.score <= best);
    } else {
      assert.equal(round.gate, "immutable-grader");
    }
  }

  const cheat = run.rounds.find((round) => round.policy.cheat === "memorize-train");
  assert.ok(cheat);
  assert.ok(cheat.train.score > cheat.before.train);
  assert.ok(cheat.holdout.score < cheat.before.holdout);
  assert.equal(cheat.holdout.solved, 0);

  const last = run.rounds[run.rounds.length - 1];
  assert.equal(last.champion.holdout, run.rounds[3].holdout.score);
});
