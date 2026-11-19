// gta6-trophy-rarity-forecast-01 — quantile forecast of GTA VI trophy earn rates.
//
// The house reads Exophase at a fixed clock and the answer is the rate the page shows at the
// target. Between refreshes the page is frozen; at a refresh the tracked-player count jumps and
// every rate except the completed one is diluted. The launch-night practice cases are exactly
// that first refresh, so the short-horizon forecast below models the dilution; the final's
// week-long horizon is dominated by persistence, so the same shift is blended down with the
// horizon and the spread is widened to cover the refresh uncertainty.
//
// For each trophy with last rate r (percent) and horizon d (days):
//   l      = logit(r)
//   dilute = l - 1.5 + 0.6 * (l + 4.5)            // rate-dependent dilution, fitted on p00/p01
//   w      = min(1, 0.5 / d)                       // dilution weight: 1 in practice, ~0.11 in final
//   median = w * dilute + (1 - w) * l
//   s      = 0.15 + 0.6 * sqrt(d)                  // honest spread, grows with the horizon
//   q_tau  = round4(100 / (1 + exp(-(median + z_tau * s))))
// The medians are monotone in logit, so the five quantiles are non-decreasing by construction.

import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const INPUT_DIR = process.env.MAKEFUN_INPUT_DIR ?? '/input';
const OUTPUT_DIR = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The five scored levels and the matching standard-normal quantiles.
const LEVELS = [0.05, 0.25, 0.5, 0.75, 0.95];
const Z = [-1.645, -0.674, 0, 0.674, 1.645];

// Model constants. DILUTION_* are fitted on the launch-night refresh practice; W_DAYS is the
// horizon at which dilution and persistence are weighted equally; SIGMA/SIGMA_FLOOR set spread.
const DILUTION_BASE = -1.5;
const DILUTION_SLOPE = 0.6;
const DILUTION_CENTER = -4.5;
const W_DAYS = 0.5;
const SIGMA = 0.6;
const SIGMA_FLOOR = 0.15;
// A single refresh cannot move a trophy's logit rate by more than this in our model; the cap
// keeps a degenerate last rate (0 or a null read) from producing an absurd forecast.
const MAX_SHIFT = 3.0;

const clamp = (x: number): number => Math.min(99.99, Math.max(0.01, x));
const logit = (pct: number): number => Math.log(clamp(pct) / (100 - clamp(pct)));
const invLogit = (l: number): number => 100 / (1 + Math.exp(-l));
const round4 = (x: number): number => Math.round(x * 10_000) / 10_000;

interface Case {
  id: string;
  levels: number[];
  horizon_minutes: number;
  trophies: Array<{ id: number }>;
  history: Array<{ rates: Array<number | null> }>;
}

function forecast(c: Case): { trophies: Array<{ id: number; q: number[] }> } {
  if (c.levels.length !== LEVELS.length || c.levels.some((t, j) => t !== LEVELS[j])) {
    throw new Error(`${c.id}: unexpected levels ${JSON.stringify(c.levels)}`);
  }
  const last = c.history[c.history.length - 1];
  if (last === undefined || !Array.isArray(last.rates)) throw new Error(`${c.id}: no history`);
  const days = Math.max(c.horizon_minutes, 0) / 1440;
  const w = Math.min(1, W_DAYS / Math.max(days, 1e-6));
  const spread = SIGMA_FLOOR + SIGMA * Math.sqrt(days);

  const trophies = c.trophies.map((t, i) => {
    const l = logit(last.rates[i] ?? 0);
    const dilute = l + Math.max(-MAX_SHIFT, Math.min(MAX_SHIFT, DILUTION_BASE + DILUTION_SLOPE * (l - DILUTION_CENTER)));
    const median = w * dilute + (1 - w) * l;
    return { id: t.id, q: Z.map((z) => round4(invLogit(median + z * spread))) };
  });
  return { trophies };
}

mkdirSync(OUTPUT_DIR, { recursive: true });
for (const file of readdirSync(INPUT_DIR).filter((f) => f.endsWith('.in')).sort()) {
  const c = JSON.parse(readFileSync(join(INPUT_DIR, file), 'utf8')) as Case;
  writeFileSync(join(OUTPUT_DIR, `${file.slice(0, -'.in'.length)}.out`), `${JSON.stringify(forecast(c))}\n`);
}
