"use client";

import type { Round } from "../lib/types";

const W = 640;
const H = 250;
const PAD = { l: 38, r: 14, t: 18, b: 28 };

type Props = {
  rounds: Round[];
  revealed: number;
};

export function ScoreChart({ rounds, revealed }: Props) {
  const shown = rounds.slice(0, Math.max(0, revealed) + 1);
  const innerW = W - PAD.l - PAD.r;
  const innerH = H - PAD.t - PAD.b;
  const max = 120;
  const xOf = (index: number) =>
    PAD.l + (index / Math.max(1, rounds.length - 1)) * innerW;
  const yOf = (score: number) => PAD.t + (1 - Math.max(0, score) / max) * innerH;

  const landed = stepPath(
    shown.map((round) => [xOf(round.index), yOf(round.champion.holdout)]),
  );
  const self = seriesPath(
    shown.filter((round) => round.ran).map((round) => [xOf(round.index), yOf(round.train.score)]),
  );
  const external = seriesPath(
    shown
      .filter((round) => round.ran)
      .map((round) => [xOf(round.index), yOf(round.holdout.score)]),
  );

  const latest = shown[shown.length - 1];
  const label = latest
    ? `Round ${latest.index}. Self-score ${latest.ran ? latest.train.score.toFixed(1) : "not scored"}. Holdout ${latest.ran ? latest.holdout.score.toFixed(1) : "not scored"}.`
    : "Score chart";

  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
      {[0, 60, 120].map((tick) => (
        <g key={tick}>
          <line
            x1={PAD.l}
            x2={W - PAD.r}
            y1={yOf(tick)}
            y2={yOf(tick)}
            className="gridline"
          />
          <text x={PAD.l - 8} y={yOf(tick) + 4} className="tick" textAnchor="end">
            {tick}
          </text>
        </g>
      ))}
      <path d={landed} className="series landed" />
      <path d={self} className="series self" />
      <path d={external} className="series external" />
      {shown.map((round) => {
        if (!round.ran) {
          return (
            <text
              key={round.index}
              x={xOf(round.index)}
              y={yOf(60)}
              className="blocked-mark"
              textAnchor="middle"
            >
              blocked
            </text>
          );
        }
        return (
          <g key={round.index}>
            <circle cx={xOf(round.index)} cy={yOf(round.train.score)} r={4.5} className="dot self" />
            {round.verdict === "reject" ? (
              <RejectMark x={xOf(round.index)} y={yOf(round.holdout.score)} />
            ) : (
              <circle
                cx={xOf(round.index)}
                cy={yOf(round.holdout.score)}
                r={5.5}
                className={round.verdict === "accept" ? "dot landed-dot" : "dot external"}
              />
            )}
          </g>
        );
      })}
    </svg>
  );
}

function seriesPath(points: number[][]): string {
  if (points.length === 0) return "";
  return points
    .map(([x, y], index) => `${index === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`)
    .join(" ");
}

function stepPath(points: number[][]): string {
  if (points.length === 0) return "";
  let d = `M ${points[0][0].toFixed(1)} ${points[0][1].toFixed(1)}`;
  for (let i = 1; i < points.length; i++) {
    d += ` L ${points[i][0].toFixed(1)} ${points[i - 1][1].toFixed(1)}`;
    d += ` L ${points[i][0].toFixed(1)} ${points[i][1].toFixed(1)}`;
  }
  return d;
}

function RejectMark({ x, y }: { x: number; y: number }) {
  const s = 4.5;
  return (
    <path
      d={`M ${x - s} ${y - s} L ${x + s} ${y + s} M ${x + s} ${y - s} L ${x - s} ${y + s}`}
      className="reject-mark"
    />
  );
}
