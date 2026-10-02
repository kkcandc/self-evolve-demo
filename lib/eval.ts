import { search } from "./solver";
import type { EvalSummary, Grid, Policy } from "./types";

export function summarize(
  grids: Grid[],
  policy: Policy,
  budget: number,
): EvalSummary {
  let solved = 0;
  let exp = 0;
  let path = 0;
  const passes: boolean[] = [];
  for (const grid of grids) {
    const result = search(grid, policy, budget);
    passes.push(result.solved);
    if (result.solved) {
      solved++;
      exp += result.expansions;
      path += result.pathLength;
    }
  }
  const meanExpansions = solved ? exp / solved : budget;
  const meanPath = solved ? path / solved : 0;
  const success = grids.length ? solved / grids.length : 0;
  const efficiency = solved ? 1 - Math.min(meanExpansions, budget) / budget : 0;
  const score = success * 100 + efficiency * 18;
  return {
    solved,
    total: grids.length,
    meanExpansions,
    meanPath,
    score,
    passes,
  };
}
