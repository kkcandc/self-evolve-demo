"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { buildSeedRun } from "../lib/seed";
import { changedLines, renderPolicy } from "../lib/source";
import type { Policy, Round } from "../lib/types";
import { MazeView } from "./MazeView";
import { ScoreChart } from "./ScoreChart";

type Phase = "idle" | "propose" | "test" | "verdict";

const PROPOSE_MS = 900;
const TEST_MS = 2800;
const VERDICT_MS = 1700;

export function Dashboard() {
  const run = useMemo(() => buildSeedRun(), []);
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("idle");
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [progress, setProgress] = useState(1);
  const [reduced, setReduced] = useState(false);
  const userPaused = useRef(false);
  const actions = useRef({ togglePlay: () => {}, step: () => {} });

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduced(media.matches);
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (!userPaused.current) setPlaying(true);
    }, 1200);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!playing) return;
    const last = run.rounds.length - 1;
    if (phase === "idle" && index >= last) {
      setPlaying(false);
      return;
    }
    const wait =
      phase === "idle"
        ? 420
        : phase === "propose"
          ? PROPOSE_MS
          : phase === "test"
            ? reduced
              ? 700
              : TEST_MS
            : VERDICT_MS;
    const timer = window.setTimeout(() => {
      if (phase === "idle") {
        setIndex((value) => value + 1);
        setPhase("propose");
        setProgress(0);
        return;
      }
      if (phase === "propose") {
        setPhase("test");
        setProgress(reduced ? 1 : 0);
        return;
      }
      if (phase === "test") {
        setProgress(1);
        setPhase("verdict");
        return;
      }
      setPhase("idle");
    }, wait / speed);
    return () => window.clearTimeout(timer);
  }, [playing, phase, index, speed, reduced, run.rounds.length]);

  useEffect(() => {
    if (phase !== "test" || reduced) return;
    let frame = 0;
    const started = performance.now();
    const duration = TEST_MS / speed;
    const tick = (now: number) => {
      const next = Math.min(1, (now - started) / duration);
      setProgress(next);
      if (next < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [phase, index, speed, reduced]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (event.code === "Space") {
        event.preventDefault();
        actions.current.togglePlay();
      } else if (event.code === "ArrowRight") {
        event.preventDefault();
        actions.current.step();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const round = run.rounds[index];
  const revealed = phase === "propose" || phase === "test" ? Math.max(0, index - 1) : index;
  const source = renderPolicy(round.policy);
  const previous = championBefore(run.rounds, index);
  const changed = previous
    ? changedLines(renderPolicy(previous), source)
    : source.split("\n").map(() => false);
  const visual = phase === "propose" ? lastLanded(run.rounds, index) : round;
  const trailProgress = phase === "test" ? progress : 1;
  const tone = visualTone(round, visual, phase);
  const status = statusLine(round, phase, run.holdout.length, run.train.length);

  actions.current = { togglePlay, step };

  function togglePlay() {
    if (playing) {
      userPaused.current = true;
      setPlaying(false);
      return;
    }
    userPaused.current = false;
    if (phase === "idle" && index >= run.rounds.length - 1) {
      setIndex(0);
      setPhase("idle");
      setProgress(1);
    }
    setPlaying(true);
  }

  function step() {
    userPaused.current = true;
    setPlaying(false);
    if (phase === "idle") {
      if (index < run.rounds.length - 1) {
        setIndex(index + 1);
        setPhase("propose");
        setProgress(0);
      }
      return;
    }
    if (phase === "propose") {
      setPhase("test");
      setProgress(reduced ? 1 : 0);
      return;
    }
    if (phase === "test") {
      setProgress(1);
      setPhase("verdict");
      return;
    }
    setPhase("idle");
  }

  function reset() {
    userPaused.current = true;
    setPlaying(false);
    setIndex(0);
    setPhase("idle");
    setProgress(1);
  }

  function jump(next: number) {
    userPaused.current = true;
    setPlaying(false);
    setIndex(next);
    setPhase("idle");
    setProgress(1);
  }

  const steps = Math.max(0, visual.replay.expanded.length - 1);
  const shownSteps = Math.round(trailProgress * steps);

  return (
    <div className="app">
      <header className="app-head">
        <div>
          <p className="eyebrow">kkcandc · client-side harness · no model API</p>
          <h1>Self-evolve</h1>
          <p className="lede">
            A walker proposes the next scoring function. It lands{" "}
            <em>only</em> when a frozen evaluator, on mazes the walker cannot see, scores it higher.
          </p>
        </div>
        <div className="controls">
          <button className="play" type="button" onClick={togglePlay}>
            {playing ? "Pause" : "Play"}
          </button>
          <button type="button" onClick={step}>
            Step
          </button>
          <button type="button" onClick={reset}>
            Reset
          </button>
          <div className="speed" role="group" aria-label="Playback speed">
            {[1, 2, 4].map((value) => (
              <button
                key={value}
                type="button"
                className={speed === value ? "on" : ""}
                onClick={() => setSpeed(value)}
                aria-pressed={speed === value}
              >
                {value}×
              </button>
            ))}
          </div>
        </div>
      </header>

      <p className="sr" aria-live="polite">
        {status} {round.reason}
      </p>

      <section className="stage-grid">
        <article className="panel maze-panel">
          <div className="panel-head">
            <div>
              <p className="kicker">Stage · holdout maze 3 of {run.holdout.length}</p>
              <h2>{round.policy.name}</h2>
            </div>
            <p className={`phase phase-${phase}`}>{phaseLabel(phase)}</p>
          </div>
          <div className="maze-frame">
            <MazeView
              grid={run.stage}
              trail={visual.replay.expanded}
              path={visual.replay.path}
              progress={trailProgress}
              tone={tone}
            />
            {phase !== "propose" && phase !== "test" && round.verdict !== "baseline" ? (
              <div key={round.index} className={`stamp stamp-${round.verdict}`} aria-hidden="true">
                {round.verdict}
              </div>
            ) : null}
          </div>
          <div className="maze-meta">
            <span>
              <i className="swatch start" /> Start
            </span>
            <span>
              <i className="swatch goal" /> Exit
            </span>
            <span className="steps">
              {phase === "propose"
                ? "Champion stays on the maze while the next scorer is written."
                : round.ran
                  ? `${shownSteps} / ${run.budget} steps${visual.replay.solved ? " · reached" : " · stuck"}`
                  : "Stage kept the champion. This proposal was not run."}
            </span>
          </div>
          <p className="status">{status}</p>
        </article>

        <div className="side">
          <article className="panel rule">
            <p className="kicker">The gate</p>
            <ol>
              <li>The walker may change its scorer.</li>
              <li>The walker may not change the grader.</li>
              <li>The self-score is recorded and ignored.</li>
              <li>Accept only if the holdout score strictly rises.</li>
            </ol>
          </article>

          <article className="panel">
            <div className="panel-head">
              <p className="kicker">Scores</p>
              <div className="legend">
                <span>
                  <i className="swatch self" /> Self
                </span>
                <span>
                  <i className="swatch external" /> Holdout
                </span>
                <span>
                  <i className="swatch landed" /> Landed
                </span>
              </div>
            </div>
            <ScoreChart rounds={run.rounds} revealed={revealed} />
            <ScoreReadout round={round} visible={phase === "idle" || phase === "verdict"} />
          </article>

          <article className="panel code-panel">
            <div className="panel-head">
              <div>
                <p className="kicker">Proposal {round.index}</p>
                <h2>{round.policy.name}</h2>
                <p className="summary">{round.policy.summary}</p>
              </div>
            </div>
            <pre className="code">
              {source.split("\n").map((line, lineIndex) => (
                <div key={lineIndex} className={changed[lineIndex] ? "changed" : ""}>
                  {line.length ? line : " "}
                </div>
              ))}
            </pre>
            <p className="story">{round.story}</p>
            {phase === "idle" || phase === "verdict" ? <p className="reason">{round.reason}</p> : null}
            <SuiteDots
              round={round}
              progress={phase === "test" ? progress : phase === "propose" ? 0 : 1}
            />
          </article>
        </div>
      </section>

      <section className="timeline" aria-label="Proposal timeline">
        {run.rounds.map((item) => {
          const settled = item.index < index || (item.index === index && phase !== "propose" && phase !== "test");
          const active = item.index === index;
          return (
            <button
              key={item.policy.id}
              type="button"
              className={`round-card ${item.verdict} ${active ? "active" : ""} ${settled ? "settled" : "future"}`}
              onClick={() => jump(item.index)}
            >
              <span className="round-index">0{item.index}</span>
              <span className="round-name">{item.policy.name}</span>
              <span className={`pill pill-${settled ? item.verdict : "queued"}`}>
                {settled ? item.verdict : active ? phaseLabel(phase) : "queued"}
              </span>
              <span className="round-delta">
                {settled && item.index > 0 && item.ran
                  ? formatDelta(item.holdout.score - item.before.holdout)
                  : item.index === 0
                    ? "bar"
                    : "—"}
              </span>
            </button>
          );
        })}
      </section>
    </div>
  );
}

function ScoreReadout({ round, visible }: { round: Round; visible: boolean }) {
  if (!visible) {
    return <p className="readout pending">Scoring after the walk finishes.</p>;
  }
  if (!round.ran) {
    return (
      <p className="readout">
        <strong>Grader untouched.</strong> No self-score and no holdout score were produced.
      </p>
    );
  }
  const delta = round.index === 0 ? null : round.holdout.score - round.before.holdout;
  return (
    <div className="readout">
      <div>
        <span className="kicker self">Self-score</span>
        <strong>{round.train.score.toFixed(1)}</strong>
        <em>
          {round.train.solved}/{round.train.total} training mazes
        </em>
      </div>
      <div>
        <span className="kicker external">Holdout · decides</span>
        <strong>{round.holdout.score.toFixed(1)}</strong>
        <em>
          {round.holdout.solved}/{round.holdout.total} hidden mazes
          {delta === null ? "" : ` · ${formatDelta(delta)}`}
        </em>
      </div>
    </div>
  );
}

function SuiteDots({ round, progress }: { round: Round; progress: number }) {
  if (!round.ran) return null;
  return (
    <div className="suites">
      <DotRow label="Training" passes={round.train.passes} progress={progress} />
      <DotRow label="Holdout" passes={round.holdout.passes} progress={progress} />
    </div>
  );
}

function DotRow({
  label,
  passes,
  progress,
}: {
  label: string;
  passes: boolean[];
  progress: number;
}) {
  const shown = Math.round(progress * passes.length);
  return (
    <div className="dot-row">
      <span>{label}</span>
      <span className="dots">
        {passes.map((pass, index) => (
          <i
            key={index}
            className={index < shown ? (pass ? "pass" : "fail") : "pending"}
            title={index < shown ? (pass ? "solved" : "missed the budget") : "pending"}
          />
        ))}
      </span>
    </div>
  );
}

function championBefore(rounds: Round[], index: number): Policy | null {
  for (let i = index - 1; i >= 0; i--) {
    if (rounds[i].verdict !== "reject") return rounds[i].policy;
  }
  return null;
}

function lastLanded(rounds: Round[], index: number): Round {
  for (let i = index - 1; i >= 0; i--) {
    if (rounds[i].verdict !== "reject") return rounds[i];
  }
  return rounds[0];
}

function visualTone(round: Round, visual: Round, phase: Phase): "live" | "accept" | "reject" {
  if (phase === "propose" || phase === "test") return "live";
  if (!round.ran) return "accept";
  if (visual.verdict === "reject") return "reject";
  if (visual.verdict === "accept") return "accept";
  return "live";
}

function phaseLabel(phase: Phase): string {
  if (phase === "propose") return "Proposing";
  if (phase === "test") return "Testing";
  if (phase === "verdict") return "Judging";
  return "Landed";
}

function statusLine(round: Round, phase: Phase, holdout: number, train: number): string {
  if (phase === "propose") return `Writing proposal ${round.index}: ${round.policy.name}.`;
  if (phase === "test") {
    return `Walking ${train} training mazes and ${holdout} hidden holdout mazes. The stage is one holdout maze.`;
  }
  if (!round.ran) return "The harness stopped this proposal before scoring.";
  if (round.verdict === "baseline") return "This is the bar. Later proposals have to beat its holdout score.";
  return round.story;
}

function formatDelta(delta: number): string {
  const sign = delta > 0 ? "+" : delta < 0 ? "−" : "";
  return `${sign}${Math.abs(delta).toFixed(1)} holdout`;
}
