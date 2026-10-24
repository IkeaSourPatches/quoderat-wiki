# Gacha analysis: what the pity system actually does

Evidence for tuning the banner. Every number here comes from `node scripts/analyze-gacha.mjs` (about 40 seconds), which writes the full results, including the pulls-to-5★ distribution, to `gacha-analysis.json`. The rules themselves are in `gacha-pity.md`.

**Method.** Rates and distributions are exact for single pulls: the script follows the probability of every pity state (big counter 0–79 × small counter 0–14) instead of sampling. It calls the production `outcomeTable`. The what-if designs use a copy of the rules with adjustable settings, and the script first checks that this copy matches production in all 1,200 states. Collection costs are a seeded simulation of 1,000 players using the production `rollOutcome`. The exact rates agree with the 10-million-draw simulation in `gacha-simulation.json` to two decimal places. Ten-pull figures come from that simulation.

> **Sections 1–5 describe the rules before tuning** (5★ 0.1% to pull 65, +6 points a pull from 66). **Section 6 is the tuning that was applied.** `gacha-analysis.json` always holds the current rules; the previous rules stay in it as candidate A.

## 1. Effective rates (single pulls)

| Result | Base | Effective |
| --- | ---: | ---: |
| 5★ holder | 0.10% | 1.50% |
| 4★ holder | 0.65% | 0.78% |
| SS totem | 1.50% | 1.80% |
| 3★ holder | 4.25% | 5.11% |
| S totem | 3.50% | 4.21% |
| A totem | 15.00% | 14.43% |
| B totem | 75.00% | 72.16% |

S+ is 13.41% of pulls, about one in 7.5. 18.9% of S+ results come from the 15-pull guarantee. Ten-pulls get slightly more S+ (14.37%) and 4★ (0.85%) because of their own guarantee; the 5★ rate is the same.

## 2. The 5★ comes from the soft pity, not the base rate

- Only 7.67% of first 5★ arrive in pulls 1–65, when the 0.1% base rate applies. The other 92% land in pulls 66–75.
- The average is 66.8 pulls, the median 69 and the 99th percentile 75. Reaching the pull-80 guarantee has a probability of effectively zero.
- The featured holder has two peaks: about 75 pulls when the 50/50 is won and about 140 when it is lost. Median 75, 90th percentile 142, average 100. The 160-pull worst case is unreachable in practice (99th percentile 146).

## 3. The S+ guarantee barely affects the 5★ rate

| Rules | 5★ rate | Average | Median |
| --- | ---: | ---: | ---: |
| Current | 1.50% | 66.8 | 69 |
| Forced S+ cannot raise 5★ odds | 1.48% | 67.5 | 69 |
| No 15-pull guarantee | 1.48% | 67.5 | 69 |

The 5★ rate is set by where the ramp starts: roughly 1 ÷ the ramp's first boosted pull. A gentler ramp barely changes it.

## 4. Collection costs (production rules, single pulls)

| Goal | Average | Median | 90th percentile |
| --- | ---: | ---: | ---: |
| Featured 5★ to +6 (7 copies) | 698 | 697 | 826 |
| All five 5★ | 1,608 | 1,413 | 2,642 |
| All five 4★ | 1,469 | 1,309 | 2,501 |
| One specific 4★ (Voss) to +6 | 4,440 | 4,188 | 6,742 |
| All 16 holders | 1,963 | 1,811 | 2,976 |

Each 4★ holder is about 1 in 640 pulls, rarer than the featured 5★ (about 1 in 100). This is intended: a favourite below the top tier takes a long time.

## 5. Candidate designs for the featured holder

Goal: getting the featured holder early is possible but rare enough to feel lucky, the usual wait is moderate, and no one waits too long. "Within N" is the chance of the featured holder within the first N pulls from zero pity.

| Design | 5★ average | Within 10 | Within 30 | Within 50 | Median | 90th pct | 99th pct | Worst | Average |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| A Current: 0.1%, ramp from 66, guaranteed at 80, 50/50 | 66.8 | 0.5% | 1.8% | 3.0% | 75 | 142 | 146 | 160 | 100 |
| B Genshin-like: 0.6%, ramp from 74, guaranteed at 90 | 59.7 | 3.0% | 10.5% | 17.6% | 79 | 154 | 160 | 180 | 90 |
| C 0.6%, ramp from 61, guaranteed at 75, 50/50 | 52.0 | 3.0% | 10.5% | 17.6% | 67 | 129 | 135 | 150 | 78 |
| D As C, with 75/25 | 52.0 | 4.4% | 14.8% | 24.1% | 64 | 124 | 133 | 150 | 65 |
| E 0.8%, ramp from 51, guaranteed at 65, 50/50 | 42.9 | 4.0% | 13.8% | 23.2% | 57 | 109 | 115 | 130 | 64 |
| F As E, with 75/25 | 42.9 | 5.9% | 19.3% | 30.8% | 54 | 102 | 113 | 130 | 54 |
| G 1%, ramp from 41, guaranteed at 55, 50/50 | 35.1 | 5.0% | 17.1% | 58.5% | 46 | 89 | 94 | 110 | 53 |

Rows that only change the ramp (+3% per pull from 66 with a guarantee at 90, +2% per pull from 71 with a guarantee at 100, and no ramp with a guarantee at 100) are in the JSON. All three are slower than the current rules without adding any early luck.

**Takeaway.** Under the current rules, almost no one gets lucky early: 0.5% within 10 pulls and 1.8% within 30. Nearly everyone gets the featured holder at the same few pulls, so getting it never feels like luck. Raising the base rate to 0.6–0.8% creates real lucky pulls (3–6% within 10, 10–19% within 30). Starting the ramp earlier and moving the guarantee to match shortens the wait for the unlucky half.

Design C was chosen as the starting point, then adjusted; see section 6. Changing the rules also means updating the boundary checks in `check-gacha.mjs`, re-running `simulate-gacha.mjs`, and then re-running this script.
## 6. Applied tuning (October 2026)

**Brief:** design C as the base, with the featured median at 70 and the guarantee kept at 80. The guarantee should decide a 5★ rarely, but sometimes, so the ramp should not be steep.

**Search.** With a 0.6% base rate and the guarantee at 80, every ramp start and step was tried (start 51–76, step 1–8 points). Only two settings give a featured median of exactly 70 while making the guarantee rare but real: +1 point a pull from 55, where 1.04% of 5★ reach the guarantee, and +1.5 points a pull from 59, where 0.49% do. The first was chosen: it is the gentler ramp and the one that reaches 80 more often.

**Rules now.** 5★ is 0.6% for pulls 1–54, then rises 1 point a pull (55 = 1.6%, 66 = 12.6%, 79 = 25.6%), and is certain at 80. B moves from 75% to 74.5% so the base table still adds up to 100%. Everything else is unchanged: the S+ guarantees, the 50/50 and its guarantee, and the 160-pull worst case.

| Measure (exact, single pulls) | Before | After |
| --- | ---: | ---: |
| Effective 5★ rate | 1.50% | 1.91% |
| Average pulls per 5★ | 66.8 | 52.4 |
| Median pulls per 5★ | 69 | 61 |
| 5★ within 10 pulls | about 1% | 5.8% |
| 5★ decided by the pull-80 guarantee | about 0% | 1.05% |
| Featured within 10 pulls | 0.5% | 3.0% |
| Featured within 30 pulls | 1.8% | 10.4% |
| Featured within 50 pulls | 3.0% | 17.6% |
| **Featured median** | 75 | **70** |
| Featured 90th / 99th percentile | 142 / 146 | 130 / 145 |
| Featured average | 100.3 | 78.6 |
| S+ rate | 13.41% | 13.62% |

Where the first 5★ lands now: 32.5% before the ramp (pulls 1–54), 66.5% during it (55–79) and 1.05% at the guarantee.

| Collection cost (1,000 players) | Before (median) | After (median) |
| --- | ---: | ---: |
| Featured 5★ to +6 | 697 | 540 |
| All five 5★ | 1,413 | 1,108 |
| All five 4★ | 1,309 | 1,314 |
| One specific 4★ to +6 | 4,188 | 4,363 |
| All 16 holders | 1,811 | 1,612 |

4★ costs are unchanged within simulation noise, so they stay a long-term goal as intended.

**Side effect.** Ten-pulls now give a slightly higher 5★ rate than singles (1.948% vs 1.909% in the 10-million-draw simulation). A forced S+ slot multiplies the 5★ chance by about ten, and with the higher base rate that boost is no longer negligible. The difference is about 2% of the rate. It shortens the featured average only from 78.4 to 77.0 pulls.

Simulation (`gacha-simulation.json`) and exact results agree: the featured average is 78.45 simulated against 78.59 exact for singles.

## 7. Lower-tier rate change (October 2026)

**Brief:** make pulls feel less dry by moving weight from B to A and S. The first proposal was S 5% / A 18% / B 70%. It cut the time between S+ results from 7.3 to 6.8 pulls, but it made S totems clearly more common than 3★ holders (5.7% vs 4.8% effective) and moved the featured median to 71. **Applied instead: S 4.5% / A 18.5% / B 70%**, with the ramp unchanged.

| Exact, single pulls | Before (S 3.5 / A 15 / B 74.5) | After (S 4.5 / A 18.5 / B 70) |
| --- | ---: | ---: |
| One S+ every… | 7.34 pulls | 6.95 pulls |
| S+ rate | 13.62% | 14.39% |
| S+ that came from the 15-pull guarantee | 18.1% | 15.4% |
| Effective S totem / 3★ holder | 4.14% / 5.03% | 5.16% / 4.87% |
| Effective 4★ holder | 0.77% | 0.75% |
| Effective 5★ | 1.91% | 1.89% |
| **Featured median** | 70 | **70** |
| Featured within 30 pulls | 10.4% | 10.2% |
| Featured average | 78.6 | 79.2 |
| Featured 90th percentile | 130 | 131 |

Holders become about 3% rarer. The 15-pull guarantee picks among all S+ results in proportion to their rates, so a larger S share means fewer forced slots become holders. Collection medians (1,000 players): featured to +6 is 549, all 16 holders 1,637, and one specific 4★ to +6 4,493.
