import { mulberry32 } from "./rng";
import type { Grid, Split } from "./types";

export const DIRS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
] as const;

export function bfsPath(grid: Grid): number[] | null {
  const { w, start, goal, blocked } = grid;
  const n = grid.w * grid.h;
  const prev = new Int32Array(n).fill(-1);
  const seen = new Uint8Array(n);
  const q = [start];
  seen[start] = 1;
  for (let qi = 0; qi < q.length; qi++) {
    const cur = q[qi];
    if (cur === goal) break;
    const x = cur % w;
    const y = (cur / w) | 0;
    for (let d = 0; d < 4; d++) {
      const nx = x + DIRS[d][0];
      const ny = y + DIRS[d][1];
      if (nx < 0 || ny < 0 || nx >= grid.w || ny >= grid.h) continue;
      const ni = ny * w + nx;
      if (blocked[ni] || seen[ni]) continue;
      seen[ni] = 1;
      prev[ni] = cur;
      q.push(ni);
    }
  }
  if (!seen[goal]) return null;
  const path = [goal];
  let cur = goal;
  while (cur !== start) {
    cur = prev[cur];
    path.push(cur);
  }
  path.reverse();
  return path;
}

/** Recursive-backtracker maze. Odd dimensions, one corridor between junctions. */
export function carveMaze(
  id: string,
  seed: number,
  split: Split,
  cells: number,
): Grid {
  const rand = mulberry32(seed);
  const w = cells * 2 + 1;
  const h = cells * 2 + 1;
  const blocked = new Uint8Array(w * h).fill(1);
  const stack = [0];
  const seen = new Uint8Array(cells * cells);
  seen[0] = 1;
  const open = (x: number, y: number) => {
    blocked[y * w + x] = 0;
  };
  open(1, 1);
  const look = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ] as const;
  while (stack.length) {
    const cur = stack[stack.length - 1];
    const cx = cur % cells;
    const cy = (cur / cells) | 0;
    const neighbors: number[] = [];
    for (let d = 0; d < 4; d++) {
      const nx = cx + look[d][0];
      const ny = cy + look[d][1];
      if (nx < 0 || ny < 0 || nx >= cells || ny >= cells) continue;
      const ni = ny * cells + nx;
      if (!seen[ni]) neighbors.push(ni);
    }
    if (!neighbors.length) {
      stack.pop();
      continue;
    }
    const ni = neighbors[(rand() * neighbors.length) | 0];
    seen[ni] = 1;
    const nx = ni % cells;
    const ny = (ni / cells) | 0;
    open(nx * 2 + 1, ny * 2 + 1);
    open(cx + nx + 1, cy + ny + 1);
    stack.push(ni);
  }
  return {
    id,
    seed,
    split,
    w,
    h,
    blocked,
    start: w + 1,
    goal: (h - 2) * w + (w - 2),
    kind: split === "holdout" ? "trap" : "open",
  };
}

export function renderAscii(grid: Grid, path?: number[]): string {
  const onPath = new Set(path ?? []);
  const rows: string[] = [];
  for (let y = 0; y < grid.h; y++) {
    let row = "";
    for (let x = 0; x < grid.w; x++) {
      const i = y * grid.w + x;
      if (i === grid.start) row += "S";
      else if (i === grid.goal) row += "G";
      else if (grid.blocked[i]) row += "#";
      else if (onPath.has(i)) row += "·";
      else row += " ";
    }
    rows.push(row);
  }
  return rows.join("\n");
}
