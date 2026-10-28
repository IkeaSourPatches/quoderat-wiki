import { writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { pool, seeded } from './gacha-modules.mjs';
const { rollOutcome, emptyPity, BASE_RATES } = pool;
// 20 independent replications; Student t interval of replication estimates.
const repeats = 20,
  minimum = 500000;
const ci = (values) => {
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const se = Math.sqrt(values.reduce((a, b) => a + (b - mean) ** 2, 0) / (values.length - 1) / values.length);
  return { mean, low: mean - 2.093 * se, high: mean + 2.093 * se };
};
const output = {
  method:
    '20 independent seeded replications of at least 500,000 pulls per mode. Approximate 95% Student-t intervals across replications; cold starts included. Mixed mode alternates a single and a ten-pull. Featured gaps are completed intervals starting from zero pity after a featured reward (batch position may vary).',
  modes: {},
};
for (const [mode, modeIndex] of ['singles', 'tens', 'mixed'].map((m, i) => [m, i])) {
  const runs = [];
  const hist = Array(161).fill(0);
  for (let rep = 0; rep < repeats; rep++) {
    const rng = seeded(7391 + modeIndex * 1000 + rep);
    let state = emptyPity(),
      n = 0,
      batches = 0,
      valid = 0,
      fives = 0,
      features = 0,
      rares = 0,
      sinceFeatured = 0,
      gaps = 0,
      gapSum = 0,
      turn = 0;
    const counts = Array(7).fill(0),
      localHist = Array(161).fill(0);
    while (n < minimum) {
      const size = mode === 'singles' ? 1 : mode === 'tens' ? 10 : turn++ % 2 === 0 ? 1 : 10;
      let hasRare = false;
      for (let j = 0; j < size; j++) {
        const d = rollOutcome(state, size === 10 && j === 9 && !hasRare, rng);
        state = d.state;
        n++;
        sinceFeatured++;
        counts[d.index]++;
        if (d.index < 5) {
          hasRare = true;
          rares++;
        }
        if (d.index === 0) {
          fives++;
          if (d.featured) {
            features++;
            assert.ok(sinceFeatured <= 160);
            hist[sinceFeatured]++;
            localHist[sinceFeatured]++;
            gaps++;
            gapSum += sinceFeatured;
            sinceFeatured = 0;
          }
        }
      }
      if (size === 10) {
        batches++;
        valid += Number(hasRare);
        assert.ok(hasRare);
      }
    }
    runs.push({
      n,
      tiers: counts.map((c) => (c / n) * 100),
      fiveGap: n / fives,
      rareGap: n / rares,
      rareRate: (rares / n) * 100,
      featuredShare: (features / fives) * 100,
      featuredGap: gapSum / gaps,
      batchSuccess: batches ? (valid / batches) * 100 : null,
      hist: localHist,
      gaps,
    });
  }
  const metric = (k) => ci(runs.map((r) => r[k]));
  const distribution = hist
    .map((count, pulls) => ({ pulls, count, probability: ci(runs.map((r) => r.hist[pulls] / r.gaps)) }))
    .slice(1);
  output.modes[mode] = {
    pulls: runs.reduce((a, r) => a + r.n, 0),
    tiers: BASE_RATES.map((b, i) => ({ tier: b.label, base: b.chance * 100, ...ci(runs.map((r) => r.tiers[i])) })),
    fiveGap: metric('fiveGap'),
    rareGap: metric('rareGap'),
    rareRate: metric('rareRate'),
    featuredShare: metric('featuredShare'),
    featuredGap: metric('featuredGap'),
    batchSuccess: mode === 'singles' ? null : metric('batchSuccess'),
    distribution,
  };
  console.log(mode, JSON.stringify({ ...output.modes[mode], distribution: undefined }));
}
const root = new URL('../docs/', import.meta.url);
writeFileSync(new URL('gacha-simulation.json', root), JSON.stringify(output, null, 2) + '\n');
writeFileSync(
  new URL('gacha-effective-rates.csv', root),
  'mode,pulls,tier,base_percent,effective_percent,ci95_low,ci95_high\n' +
    Object.entries(output.modes)
      .flatMap(([mode, r]) => r.tiers.map((t) => [mode, r.pulls, t.tier, t.base, t.mean, t.low, t.high].join(',')))
      .join('\n') +
    '\n',
);
writeFileSync(
  new URL('gacha-featured-distribution.csv', root),
  'mode,pulls_to_featured,count,probability,ci95_low,ci95_high\n' +
    Object.entries(output.modes)
      .flatMap(([mode, r]) =>
        r.distribution.map((d) =>
          [
            mode,
            d.pulls,
            d.count,
            d.probability.mean,
            Math.max(0, d.probability.low),
            Math.min(1, d.probability.high),
          ].join(','),
        ),
      )
      .join('\n') +
    '\n',
);
const compact = Object.fromEntries(
  Object.entries(output.modes).map(([k, r]) => [
    k,
    { five: r.tiers[0].mean, rare: r.rareRate.mean, featured: r.featuredGap.mean },
  ]),
);
writeFileSync(new URL('../src/gacha/effective-rates.json', import.meta.url), JSON.stringify(compact, null, 2) + '\n');
