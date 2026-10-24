# Gacha analysis: what the pity system actually does

Evidence for tuning the banner. Every number here comes from `node scripts/analyze-gacha.mjs` (about 40 seconds), which writes the full results, including the pulls-to-5★ distribution, to `gacha-analysis.json`. The rules themselves are in `gacha-pity.md`.

**Method.** Rates and distributions are exact for single pulls: the script follows the probability of every pity state (big counter 0–79 × small counter 0–14) instead of sampling. It calls the production `outcomeTable`. The what-if designs use a copy of the rules with adjustable settings, and the script first checks that this copy matches production in all 1,200 states. Collection costs are a seeded simulation of 1,000 players using the production `rollOutcome`. The exact rates agree with the 10-million-draw simulation in `gacha-simulation.json` to two decimal places. Ten-pull figures come from that simulation.

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

None of these designs is applied yet. Changing the rules also means updating the boundary checks in `check-gacha.mjs`, re-running `simulate-gacha.mjs`, and then re-running this script.