import { bfsPath, DIRS } from "./grid";
import type { Grid, Policy, SearchResult } from "./types";

/** Index of the direction to the right of DIRS[d]. */
const RIGHT_OF = [2, 3, 1, 0];
const TURN_RIGHT = [2, 3, 1, 0];
const TURN_LEFT = [3, 2, 0, 1];
const TURN_AROUND = [1, 0, 3, 2];

/**
 * One-step walker. The evolved function only scores the next cell.
 * It can loop, waste steps, or walk into a dead end. A frozen harness
 * counts whether it reaches the goal inside the step budget.
 */
export function search(grid: Grid, policy: Policy, budget: number): SearchResult {
  if (policy.cheat === "memorize-train" && grid.split === "train") {
    return memorized(grid);
  }
  if (policy.wallFollow) return wallFollow(grid, budget);

  const { w, h, start, goal } = grid;
  const n = w * h;
  const visited = new Uint16Array(n);
  const trail: number[] = [start];
  visited[start] = 1;
  let pos = start;
  let dir = 0;

  for (let step = 0; step < budget && pos !== goal; step++) {
    const x = pos % w;
    const y = (pos / w) | 0;
    let bestI = -1;
    let bestScore = -Infinity;
    let bestDir = dir;
    for (let d = 0; d < 4; d++) {
      const nx = x + DIRS[d][0];
      const ny = y + DIRS[d][1];
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const ni = ny * w + nx;
      if (grid.blocked[ni]) continue;
      const score = scoreStep(grid, policy, ni, visited[ni], d === dir, d);
      const tie = d === dir ? 0.02 : d === (dir + 1) % 4 ? 0.01 : 0;
      if (score + tie > bestScore) {
        bestScore = score + tie;
        bestI = ni;
        bestDir = d;
      }
    }
    if (bestI < 0) break;
    pos = bestI;
    dir = bestDir;
    visited[pos] += 1;
    trail.push(pos);
  }

  const solved = pos === goal;
  return {
    solved,
    expansions: trail.length - 1,
    pathLength: solved ? trail.length - 1 : 0,
    path: solved ? compress(trail) : [],
    expanded: trail,
  };
}

function scoreStep(
  grid: Grid,
  policy: Policy,
  i: number,
  visits: number,
  straight: boolean,
  dir: number,
): number {
  const manh = manhattan(grid, i);
  const wall = wallOnRight(grid, i, dir) ? 1 : 0;
  return (
    policy.goal * -manh +
    policy.visit * -visits +
    policy.straight * (straight ? 1 : 0) +
    policy.wall * wall +
    policy.fresh * (visits === 0 ? 1 : 0)
  );
}

function manhattan(grid: Grid, i: number): number {
  const x = i % grid.w;
  const y = (i / grid.w) | 0;
  const gx = grid.goal % grid.w;
  const gy = (grid.goal / grid.w) | 0;
  return Math.abs(x - gx) + Math.abs(y - gy);
}

function wallOnRight(grid: Grid, i: number, dir: number): boolean {
  const right = RIGHT_OF[dir];
  const x = i % grid.w;
  const y = (i / grid.w) | 0;
  const nx = x + DIRS[right][0];
  const ny = y + DIRS[right][1];
  if (nx < 0 || ny < 0 || nx >= grid.w || ny >= grid.h) return true;
  return grid.blocked[ny * grid.w + nx] === 1;
}

/** Classic right-hand rule. Solves corridor mazes. Circles islands. */
function wallFollow(grid: Grid, budget: number): SearchResult {
  const { w, h, start, goal } = grid;
  const trail: number[] = [start];
  let pos = start;
  let dir = 1;
  const seenKey = new Set<string>();

  for (let step = 0; step < budget && pos !== goal; step++) {
    const key = `${pos}:${dir}`;
    if (seenKey.has(key)) break;
    seenKey.add(key);
    const x = pos % w;
    const y = (pos / w) | 0;
    const order = [turnRight(dir), dir, turnLeft(dir), turnAround(dir)];
    let moved = false;
    for (const d of order) {
      const nx = x + DIRS[d][0];
      const ny = y + DIRS[d][1];
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const ni = ny * w + nx;
      if (grid.blocked[ni]) continue;
      pos = ni;
      dir = d;
      trail.push(pos);
      moved = true;
      break;
    }
    if (!moved) break;
  }

  const solved = pos === goal;
  return {
    solved,
    expansions: trail.length - 1,
    pathLength: solved ? uniqueLength(trail) : 0,
    path: solved ? compress(trail) : [],
    expanded: trail,
  };
}

function turnRight(dir: number): number {
  return TURN_RIGHT[dir];
}
function turnLeft(dir: number): number {
  return TURN_LEFT[dir];
}
function turnAround(dir: number): number {
  return TURN_AROUND[dir];
}

function compress(trail: number[]): number[] {
  const path: number[] = [];
  const last = new Map<number, number>();
  trail.forEach((cell, i) => last.set(cell, i));
  let i = 0;
  while (i < trail.length) {
    path.push(trail[i]);
    const jump = last.get(trail[i])!;
    i = jump + 1;
  }
  return path;
}

function uniqueLength(trail: number[]): number {
  return Math.max(0, compress(trail).length - 1);
}

function memorized(grid: Grid): SearchResult {
  const path = bfsPath(grid);
  if (!path) {
    return { solved: false, expansions: 0, pathLength: 0, path: [], expanded: [] };
  }
  return {
    solved: true,
    expansions: path.length - 1,
    pathLength: path.length - 1,
    path,
    expanded: path,
  };
}
