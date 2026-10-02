# Self-evolve

A walker proposes a new way to score its next step through a maze. A frozen evaluator
accepts the change **only when hidden mazes score higher**.

The self-score — the mazes the walker can study — is drawn on the chart and then ignored.
A prettier training curve is not an improvement. Editing the grader is refused before it runs.

No model API. The seed run is deterministic and executes in the browser. The same harness
runs from Node.

## The loop

```
propose  →  test on training + hidden holdout  →  judge  →  accept or reject
```

The gate in `lib/judge.ts`:

1. A proposal that rewrites the grader never runs.
2. Otherwise the walker is scored by code it does not control.
3. Accept only when the holdout score strictly rises.
4. If the self-score rises and the holdout does not, reject it as self-deception.

## The challenge

The walker is not a global search. It chooses one neighbor at a time with a small scoring
function: distance to the exit, cells it has already stepped on, a bias for straight steps,
or the classic right-hand wall rule. A dead-end that points at the exit will trap a greedy
walker until the step budget runs out.

Training is eight small corridor mazes. Holdout is six larger mazes the proposals are scored
on and cannot memorize. The stage shows holdout maze 3 so you can watch the walk. The number
that decides is the full hidden set.

## Seed story

| Round | Proposal | What the gate does |
| --- | --- | --- |
| 0 | Chase the exit | Baseline. Dead-ends win. |
| 1 | Count your steps | Accept. Holdout rises. |
| 2 | Sprint harder | Reject. Both scores fall. |
| 3 | Trust fresh corridors | Accept. The straight line was a liar. |
| 4 | Hug the right wall | Reject. Slower, and a hidden maze misses the budget. |
| 5 | Memorize the training set | Reject. Self-score ticks up. Holdout goes to zero. |
| 6 | Rewrite the grader | Reject before scoring. Decision code stays frozen. |

`npm test` locks this verdict list. If a weight change flips a real score, the test fails
instead of the UI inventing an acceptance.

## Run it

```bash
npm install
npm test
npm run demo
npm run dev
```

`npm run demo` prints the seed timeline in the terminal. `npm run dev` opens the dashboard.
Space plays and pauses. Right arrow steps one phase.

```bash
npm run build
```

The static site is written to `out/`. Vercel builds it with the Next.js preset (`output: "export"`).

## What this is not

This is an original reimplementation of the idea, not a port of
[DaizeDong/self-evolve](https://github.com/DaizeDong/self-evolve). That project is a
methodology and harness for evolving skills and repositories (MIT). The note that pointed
at it is [here](https://x.com/RoundtableSpace/status/2105330581345103924).

The piece worth keeping: the proposer does not grade itself. Accepted means an outside
score got better.
