"use client";

import { useEffect, useRef } from "react";
import type { Grid } from "../lib/types";

type Tone = "live" | "accept" | "reject";

type Props = {
  grid: Grid;
  trail: number[];
  path: number[];
  progress: number;
  tone: Tone;
};

export function MazeView({ grid, trail, path, progress, tone }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const drawArgs = useRef({ grid, trail, path, progress, tone });
  drawArgs.current = { grid, trail, path, progress, tone };

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    const draw = () => {
      const css = wrap.clientWidth;
      if (css < 8) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const nextW = Math.floor(css * dpr);
      const nextH = Math.floor(css * dpr);
      if (canvas.width !== nextW || canvas.height !== nextH) {
        canvas.width = nextW;
        canvas.height = nextH;
        canvas.style.width = `${css}px`;
        canvas.style.height = `${css}px`;
      }
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const args = drawArgs.current;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      paint(ctx, css, args.grid, args.trail, args.path, args.progress, args.tone);
    };

    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(wrap);
    return () => observer.disconnect();
  }, [grid, trail, path, progress, tone]);

  return (
    <div className="maze-wrap" ref={wrapRef}>
      <canvas ref={canvasRef} aria-hidden="true" />
    </div>
  );
}

function paint(
  ctx: CanvasRenderingContext2D,
  size: number,
  grid: Grid,
  trail: number[],
  path: number[],
  progress: number,
  tone: Tone,
) {
  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = "#090b10";
  ctx.fillRect(0, 0, size, size);

  const cell = size / grid.w;
  const inset = cell * 0.16;
  const shown = Math.max(
    0,
    Math.min(trail.length - 1, Math.round(progress * Math.max(0, trail.length - 1))),
  );
  const head = trail[shown] ?? grid.start;
  const rgb = tone === "reject" ? "255, 93, 115" : tone === "accept" ? "214, 255, 74" : "94, 224, 197";

  for (let y = 0; y < grid.h; y++) {
    for (let x = 0; x < grid.w; x++) {
      const i = y * grid.w + x;
      if (grid.blocked[i]) continue;
      ctx.fillStyle = "#171c27";
      roundRect(ctx, x * cell + inset, y * cell + inset, cell - inset * 2, cell - inset * 2, cell * 0.18);
      ctx.fill();
    }
  }

  const seen = new Map<number, number>();
  for (let s = 0; s <= shown; s++) seen.set(trail[s], s);
  for (const [i, step] of seen) {
    const x = i % grid.w;
    const y = (i / grid.w) | 0;
    const age = shown === 0 ? 1 : step / shown;
    ctx.fillStyle = `rgba(${rgb}, ${0.18 + age * 0.55})`;
    roundRect(
      ctx,
      x * cell + inset,
      y * cell + inset,
      cell - inset * 2,
      cell - inset * 2,
      cell * 0.18,
    );
    ctx.fill();
  }

  if (progress > 0.92 && path.length > 1) {
    ctx.beginPath();
    path.forEach((i, n) => {
      const cx = (i % grid.w) * cell + cell / 2;
      const cy = ((i / grid.w) | 0) * cell + cell / 2;
      if (n === 0) ctx.moveTo(cx, cy);
      else ctx.lineTo(cx, cy);
    });
    ctx.strokeStyle = `rgba(${rgb}, 0.95)`;
    ctx.lineWidth = Math.max(2, cell * 0.16);
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.stroke();
  }

  mark(ctx, grid.start, grid.w, cell, "#f4f1ea", false);
  mark(ctx, grid.goal, grid.w, cell, tone === "reject" ? "#ff5d73" : "#d6ff4a", true);

  const hx = (head % grid.w) * cell + cell / 2;
  const hy = ((head / grid.w) | 0) * cell + cell / 2;
  ctx.beginPath();
  ctx.fillStyle = "#f7f4ee";
  ctx.arc(hx, hy, Math.max(3, cell * 0.2), 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.strokeStyle = `rgba(${rgb}, 1)`;
  ctx.lineWidth = Math.max(2, cell * 0.1);
  ctx.arc(hx, hy, Math.max(5, cell * 0.34), 0, Math.PI * 2);
  ctx.stroke();
}

function mark(
  ctx: CanvasRenderingContext2D,
  index: number,
  w: number,
  cell: number,
  color: string,
  diamond: boolean,
) {
  const cx = (index % w) * cell + cell / 2;
  const cy = ((index / w) | 0) * cell + cell / 2;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = color;
  if (diamond) {
    ctx.rotate(Math.PI / 4);
    const s = cell * 0.22;
    ctx.fillRect(-s, -s, s * 2, s * 2);
  } else {
    ctx.beginPath();
    ctx.arc(0, 0, cell * 0.16, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}
