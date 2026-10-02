import { buildSeedRun } from "../lib/seed";

const run = buildSeedRun();

console.log("self-evolve seed");
console.log(
  `${run.train.length} training mazes · ${run.holdout.length} holdout mazes · step budget ${run.budget}`,
);
console.log("");
console.log(
  "round  verdict    gate                  self     holdout  solved",
);

for (const round of run.rounds) {
  const self = round.ran ? round.train.score.toFixed(2).padStart(7) : "    n/a";
  const hold = round.ran ? round.holdout.score.toFixed(2).padStart(7) : "    n/a";
  const solved = round.ran
    ? `${round.holdout.solved}/${round.holdout.total}`
    : "blocked";
  console.log(
    `${String(round.index).padStart(5)}  ${round.verdict.padEnd(9)} ${round.gate.padEnd(20)} ${self}  ${hold}  ${solved.padEnd(8)}  ${round.policy.name}`,
  );
}

console.log("");
console.log("Champion rounds:", run.championIndex.join(" → "));
console.log("A proposal lands only when the holdout score strictly rises.");
