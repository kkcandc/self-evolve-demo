import type { Policy } from "./types";

const n = (value: number) => value.toFixed(2);

/** The proposal as the walker would read it. Display only. The harness runs the weights. */
export function renderPolicy(policy: Policy): string {
  if (policy.cheat === "tamper-grader") {
    return [
      "function externalScore(result) {",
      "  return 100;",
      "}",
      "",
      "// lib/eval.ts is frozen.",
      "// A proposal that rewrites it never runs.",
    ].join("\n");
  }

  if (policy.cheat === "memorize-train") {
    return [
      "function solve(maze) {",
      "  if (TRAIN_IDS.has(maze.id)) {",
      "    return memorizedOptimal(maze.id);",
      "  }",
      "  return walk(maze, chaseTheExit);",
      "}",
    ].join("\n");
  }

  if (policy.wallFollow) {
    return [
      "function nextStep(dir, open) {",
      "  const order = [right(dir), dir, left(dir), back(dir)];",
      "  return order.find((turn) => open(turn));",
      "}",
    ].join("\n");
  }

  return [
    "function stepScore(cell, seen, dir) {",
    "  const dist = manhattan(cell, goal);",
    `  const fresh = seen[cell] === 0 ? ${n(policy.fresh)} : 0;`,
    "  return (",
    `      ${n(-policy.goal)} * dist`,
    `    + ${n(-policy.visit)} * seen[cell]`,
    `    + ${n(policy.straight)} * continuing(dir)`,
    `    + ${n(policy.wall)} * wallOnRight(cell)`,
    "    + fresh",
    "  );",
    "}",
  ].join("\n");
}

export function changedLines(previous: string, next: string): boolean[] {
  const prev = new Set(previous.split("\n"));
  return next.split("\n").map((line) => line.trim().length > 0 && !prev.has(line));
}
