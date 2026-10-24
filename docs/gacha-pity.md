# Gacha pity and featured banner

**Status: official site rules as of October 2026.** The tuning record is in `gacha-analysis.md`.

Rollback checkpoint: `6bf462d` (mixed gacha before this system). New saves use `quoderat-gacha-save-v1`; old `quoderat-gacha-totems` and `quoderat-gacha-holders` keys are left intact. Reverting code restores the pre-migration inventory, not rewards earned afterward. Export browser storage before switching implementations if those rewards matter.

## Rules

Base outcomes: 5★ 0.6%, 4★ 0.65%, SS 1.5%, 3★ 4.25%, S 4.5%, A 18.5%, B 70%. All holders plus S/SS are S+.

After 14 consecutive non-S+ draws the next is forced S+. Each ten-pull independently forces its final slot if the first nine have no S+. Both guarantees resolve to one reward.

Upcoming 5★ pity pulls 1–54 have q=0.006; 55–79 have q=0.006+0.01×(pull−54); 80 has q=1. Each non-5★ outcome receives `(1−q)×base/0.994`. Tuned in `gacha-analysis.md` (October 2026): the previous ramp was q=0.001 to pull 65, +0.06 per pull from 66. For forced S+, zero A/B then normalize all remaining outcomes, including 5★. Roll once. This means forced S+ at pull 66 has about 56.8% 5★ and pull 79 about 75.8%.

Any 5★ resets big and small counters. Other S+ reset small and increment big. A/B increment both. Counters store completed misses, with ranges big 0–79 and small 0–14.

Ensa is the initial featured holder. Every 5★ is 50% featured unless the previous 5★ was off-banner, in which case featured is guaranteed. Featured clears the flag; off-banner sets it. Lower outcomes preserve it. Off-banner members are the deduplicated union of configured permanent and past-featured pools, excluding the featured holder, equally weighted. Past-featured starts empty. An incomplete roster blocks drawing.

Counters and featured flag survive banner changes. Each ten-pull is resolved synchronously as its own batch; no batch tracker persists. Inventory resets preserve pity. Legacy saves preserve their small counter and inventory; big pity starts at zero and featured guarantee false because the old system never tracked them. Rewards and pity are written together before animation. Failed writes do not apply rewards or advance counters.

## Simulation

Run `node scripts/simulate-gacha.mjs`. It imports the production outcome engine, performs 20 independent seeded replications per mode, each at least 500,000 draws, and writes the CSVs, full JSON results, and compact UI estimates. Mixed mode alternates one single and one ten-pull. Confidence intervals use Student t (19 degrees of freedom) across replication estimates, preserving within-run dependence. These are approximate simulation intervals, not exact probabilities. Cold starts are included. Featured distributions count completed gaps; terminal incomplete gaps are excluded. Thus the featured mean is a long-run reward interval (ten-pull phase varies), not a separately estimated fresh-batch first-passage mean.

| Mode | Draws | Effective 5★ | Effective S+ | Mean featured gap |
|---|---:|---:|---:|---:|
| Singles | 10,000,000 | 1.8944% | 14.3937% | 79.09 |
| Ten-pulls | 10,000,000 | 1.9262% | 15.2451% | 77.85 |
| Alternating single / ten | 10,000,100 | 1.9188% | 15.0629% | 78.17 |

All simulated ten-pulls contain S+. Featured outcomes are approximately two thirds of 5★ results. Min/max from zero pity are 1/160; the deterministic adversarial test reaches 160. The original proposal's effective-rate bands and expected 135 pulls were not used: the simulation gives around 78–79 pulls per featured reward (around 100 under the previous ramp; see `gacha-analysis.md`).

Files: `gacha-effective-rates.csv` (all seven tiers and 95% intervals), `gacha-featured-distribution.csv` (gap distribution and intervals), `gacha-simulation.json` (also includes mean 5★/S+ gaps, featured fraction, batch protection).

`node scripts/check-gacha.mjs` covers migration, pooling, boundaries, resets, carryover, UP, hard ceiling and 12,000 state/slot combinations. Run the standard repository checks as well when changing this system.
