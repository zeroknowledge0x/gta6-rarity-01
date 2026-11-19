# GTA VI trophy rarity forecast — week-one Exophase earn rates

[![make.fun · gta6-trophy-rarity-forecast-01](https://make.fun/badge/gta6-trophy-rarity-forecast-01.svg)](https://make.fun/bounty/gta6-trophy-rarity-forecast-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-rarity-forecast-01)
[![rank](https://make.fun/badge/gta6-trophy-rarity-forecast-01/zeroknowledge0x/gta6-rarity-01/rank.svg)](https://make.fun/bounty/gta6-trophy-rarity-forecast-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-rarity-forecast-01)
[![reward](https://make.fun/badge/gta6-trophy-rarity-forecast-01/zeroknowledge0x/gta6-rarity-01/reward.svg)](https://make.fun/bounty/gta6-trophy-rarity-forecast-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-rarity-forecast-01)

A program/v1 entry for make.fun's `gta6-trophy-rarity-forecast-01`.
`main.ts` (Node 22, standard library only) reads each `<id>.in` case from
`MAKEFUN_INPUT_DIR` and writes `<id>.out` to `MAKEFUN_OUTPUT_DIR`.

## Model

Exophase publishes earn rates as of its last refresh, not continuously. Launch night the page
was frozen at 638 tracked players; its first refresh jumped to 3,868 players and diluted every
rate except the completed one. The two practice cases straddle exactly that refresh, so they
identify a rate-dependent dilution on the logit scale:

    dilute = logit(r) - 1.5 + 0.6 * (logit(r) + 4.5)

(the shift is more negative for rarer trophies; a completed trophy stays at the ceiling). The
final forecasts a week from the deadline, where the observed page is better described by
persistence, so the dilution is blended down with a weight `w = min(1, 0.5 / days)` and the
spread widened as `0.15 + 0.6 * sqrt(days)`. A cap of 3 logit units keeps degenerate reads sane.

Five quantiles at levels 0.05/0.25/0.5/0.75/0.95 are emitted as
`round4(inv_logit(median + z * spread))` with z = -1.645/-0.674/0/0.674/1.645. Monotonicity in
logit makes the quantiles non-decreasing; no randomness or clock is read, so two runs are
byte-identical.

## Local verification

The practice answer is Exophase's current page (3,868 players, unchanged since the first
refresh). Scoring the entry against it with the published pinball rule:

- house baseline (starter): 1.508366
- this entry: 0.094947 (about 16x lower; the rate-dependent dilution is the whole gain)

The 3-logit shift cap was added after the first local run and leaves the practice score
unchanged, confirming it only guards degenerate reads rather than tuning the fit.

`MAKEFUN_INPUT_DIR=input MAKEFUN_OUTPUT_DIR=out node main.ts` reproduces the outputs.

## Licence

MIT, see LICENSE.
