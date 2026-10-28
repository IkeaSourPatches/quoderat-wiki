// Exact and Monte Carlo analysis of the gacha pity system, kept as evidence for tuning.
// Run: node scripts/analyze-gacha.mjs  ->  prints tables and writes docs/gacha-analysis.json
//
// Exact results walk every pity state (big 0..hard-1, small 0..14) instead of sampling.
// They use the production outcomeTable directly; counterfactual designs use a parametric
// copy that is asserted to reproduce production exactly before it is trusted.
import { writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { pool, seeded } from './gacha-modules.mjs';
const { outcomeTable, rollOutcome, emptyPity, BASE_RATES, HOLDERS, CURRENT_BANNER } = pool;
const LABELS = BASE_RATES.map((r) => r.label),
  BASE = BASE_RATES.map((r) => r.chance);
const SMALL = 15,
  sum = (a) => a.reduce((x, y) => x + y, 0);

// Parametric outcome table. boost5=false: a forced S+ cannot raise 5★ odds. small=false: no 15-pull guarantee.
function design({ base5 = 0.006, start = 54, step = 0.01, hard = 80, boost5 = true, small = true }) {
  const q = (n) => (n >= hard ? 1 : Math.min(1, base5 + Math.max(0, n - start) * step));
  const table = (b, s) => {
    const qq = q(b + 1);
    let w = [qq, ...BASE.slice(1).map((r) => ((1 - qq) * r) / (1 - BASE[0]))];
    if (small && s === SMALL - 1) {
      if (boost5) {
        w[5] = 0;
        w[6] = 0;
      } else if (qq >= 1) w = [1, 0, 0, 0, 0, 0, 0];
      else {
        const rest = sum(w.slice(1, 5));
        w = [qq, ...w.slice(1, 5).map((x) => (x * (1 - qq)) / rest), 0, 0];
      }
    }
    const t = sum(w);
    return w.map((x) => x / t);
  };
  return { table, hard, small };
}
const production = {
  table: (b, s) => outcomeTable({ small: s, big: b, featuredGuaranteed: false }),
  hard: 80,
  small: true,
};
const current = design({});
for (let b = 0; b < 80; b++)
  for (let s = 0; s < SMALL; s++)
    current
      .table(b, s)
      .forEach((p, i) =>
        assert.ok(Math.abs(p - production.table(b, s)[i]) < 1e-12, `parametric copy differs at ${b},${s}`),
      );

const next = (m, b, s, i) => (i === 0 ? [0, 0] : i < 5 ? [b + 1, 0] : [b + 1, m.small ? s + 1 : 0]);
function exact(m) {
  const n = m.hard * SMALL,
    id = (b, s) => b * SMALL + s,
    T = [];
  for (let b = 0; b < m.hard; b++) for (let s = 0; s < SMALL; s++) T[id(b, s)] = m.table(b, s);
  let pi = new Float64Array(n).fill(1 / n);
  for (let it = 0; it < 20000; it++) {
    const nx = new Float64Array(n);
    for (let b = 0; b < m.hard; b++)
      for (let s = 0; s < SMALL; s++) {
        const k = id(b, s);
        if (!pi[k]) continue;
        T[k].forEach((p, i) => {
          if (p) {
            const [b2, s2] = next(m, b, s, i);
            nx[id(b2, s2)] += pi[k] * p;
          }
        });
      }
    pi = nx;
  }
  const rates = LABELS.map((_, i) => sum([...pi].map((p, k) => p * T[k][i])));
  const forced =
    sum([...pi].map((p, k) => (k % SMALL === SMALL - 1 ? p * sum(T[k].slice(0, 5)) : 0))) / sum(rates.slice(0, 5));
  const first = new Float64Array(m.hard + 1);
  let st = new Map([[id(0, 0), 1]]);
  for (let pull = 1; pull <= m.hard; pull++) {
    const nx = new Map();
    for (const [k, p] of st)
      T[k].forEach((w, i) => {
        if (!w) return;
        if (i === 0) {
          first[pull] += p * w;
          return;
        }
        const [b2, s2] = next(m, Math.floor(k / SMALL), k % SMALL, i),
          key = id(b2, s2);
        nx.set(key, (nx.get(key) || 0) + p * w);
      });
    st = nx;
  }
  return { rates, forcedShareOfSPlus: m.small ? forced : 0, first: [...first] };
}
const cdfOf = (d) => d.reduce((a, p, i) => (a.push((a[i - 1] || 0) + p), a), []);
const mean = (d) => sum(d.map((p, i) => p * i));
const quantile = (d, x) => cdfOf(d).findIndex((c) => c >= x - 1e-12);
function featured(first, f = 0.5) {
  const H = first.length - 1,
    g = new Array(2 * H + 1).fill(0);
  first.forEach((p, i) => {
    g[i] += f * p;
    first.forEach((r, j) => {
      g[i + j] += (1 - f) * p * r;
    });
  });
  return g;
}
const summary = (d, f) => {
  const g = featured(d, f),
    c = cdfOf(g);
  return {
    fiveMean: mean(d),
    fiveMedian: quantile(d, 0.5),
    fiveP99: quantile(d, 0.99),
    reachHard: d[d.length - 1],
    featuredWithin10: c[10],
    featuredWithin30: c[30],
    featuredWithin50: c[50],
    featuredMedian: quantile(g, 0.5),
    featuredP90: quantile(g, 0.9),
    featuredP99: quantile(g, 0.99),
    featuredMax: g.length - 1,
    featuredMean: mean(g),
  };
};
const pct = (x) => (x * 100).toFixed(2) + '%',
  out = {
    method:
      'Exact Markov-chain results for single pulls unless noted; collection costs are a seeded Monte Carlo of 1,000 players using production rollOutcome.',
  };

// 1. Production rates
const prod = exact(production);
out.production = {
  rates: Object.fromEntries(LABELS.map((l, i) => [l, prod.rates[i]])),
  sPlus: sum(prod.rates.slice(0, 5)),
  forcedShareOfSPlus: prod.forcedShareOfSPlus,
  ...summary(prod.first, 0.5),
  firstFiveDistribution: prod.first,
};
console.log('Production, single pulls (exact):');
LABELS.forEach((l, i) =>
  console.log(`  ${l.padEnd(3)} base ${pct(BASE[i]).padStart(7)}  effective ${pct(prod.rates[i]).padStart(7)}`),
);
console.log(
  `  S+ ${pct(out.production.sPlus)}, ${pct(prod.forcedShareOfSPlus)} of it from the 15-pull guarantee; 5★ by pull 65: ${pct(cdfOf(prod.first)[65])}`,
);

// 2. Does the S+ guarantee inflate 5★?
out.sPlusEffect = Object.fromEntries(
  [
    ['current', {}],
    ['noFiveBoost', { boost5: false }],
    ['noSmallPity', { small: false }],
  ].map(([k, o]) => {
    const r = exact(design(o));
    return [k, { five: r.rates[0], fiveMean: mean(r.first), fiveMedian: quantile(r.first, 0.5) }];
  }),
);
console.log('\nS+ guarantee effect on 5★:');
for (const [k, v] of Object.entries(out.sPlusEffect))
  console.log(`  ${k.padEnd(12)} 5★ ${pct(v.five)}  mean ${v.fiveMean.toFixed(1)}  median ${v.fiveMedian}`);

// 3. Candidate designs (base rate, ramp start = first boosted pull, hard pity, featured chance)
const candidates = [
  ['Current: 0.6%, +1/pull from 55, hard 80', {}, 0.5],
  ['A previous: 0.1%, +6/pull from 66', { base5: 0.001, start: 65, step: 0.06, hard: 80 }, 0.5],
  ['B Genshin-like', { base5: 0.006, start: 73, step: 0.06, hard: 90 }, 0.5],
  ['C 0.6% ramp 61 hard 75', { base5: 0.006, start: 60, step: 0.06, hard: 75 }, 0.5],
  ['D as C with 75/25', { base5: 0.006, start: 60, step: 0.06, hard: 75 }, 0.75],
  ['E 0.8% ramp 51 hard 65', { base5: 0.008, start: 50, step: 0.06, hard: 65 }, 0.5],
  ['F as E with 75/25', { base5: 0.008, start: 50, step: 0.06, hard: 65 }, 0.75],
  ['G 1% ramp 41 hard 55', { base5: 0.01, start: 40, step: 0.06, hard: 55 }, 0.5],
  ['ramp +3/pull from 66, hard 90', { base5: 0.001, start: 65, step: 0.03, hard: 90 }, 0.5],
  ['ramp +2/pull from 71, hard 100', { base5: 0.001, start: 70, step: 0.02, hard: 100 }, 0.5],
  ['no ramp, hard 100', { base5: 0.001, start: 1e9, step: 0, hard: 100 }, 0.5],
];
out.candidates = candidates.map(([name, o, f]) => ({
  name,
  params: { ...o, featuredChance: f },
  ...summary(exact(design(o)).first, f),
}));
console.log('\nCandidates:  5★ mean | featured <=10  <=30  <=50  median  p90  p99  max  mean');
for (const c of out.candidates)
  console.log(
    `  ${c.name.padEnd(32)} ${c.fiveMean.toFixed(1).padStart(5)} | ${pct(c.featuredWithin10).padStart(6)} ${pct(c.featuredWithin30).padStart(6)} ${pct(c.featuredWithin50).padStart(6)} ${String(c.featuredMedian).padStart(6)} ${String(c.featuredP90).padStart(4)} ${String(c.featuredP99).padStart(4)} ${String(c.featuredMax).padStart(4)} ${c.featuredMean.toFixed(1).padStart(6)}`,
  );

// 4. Collection costs under production rules (Monte Carlo, single pulls)
const off = [...new Set([...CURRENT_BANNER.permanent, ...CURRENT_BANNER.pastFeatured])].filter(
  (s) => s !== CURRENT_BANNER.featured,
);
const fours = HOLDERS.filter((h) => h.stars === 4).map((h) => h.slug),
  threes = HOLDERS.filter((h) => h.stars === 3).map((h) => h.slug);
const goals = { featuredTo6: [], allFive: [], allFour: [], oneFourTo6: [], allHolders: [] },
  rng = seeded(20261024);
for (let player = 0; player < 1000; player++) {
  let state = emptyPity(),
    pulls = 0;
  const copies = new Map(),
    done = {};
  const has = (list) => list.every((s) => copies.get(s) > 0);
  while (Object.keys(done).length < 5 && pulls < 40000) {
    const d = rollOutcome(state, false, rng);
    state = d.state;
    pulls++;
    const pick = (list) => list[Math.floor(rng() * list.length)];
    const who =
      d.index === 0
        ? d.featured
          ? CURRENT_BANNER.featured
          : pick(off)
        : d.index === 1
          ? pick(fours)
          : d.index === 3
            ? pick(threes)
            : null;
    if (!who) continue;
    copies.set(who, (copies.get(who) || 0) + 1);
    const check = (k, ok) => {
      if (!done[k] && ok) {
        done[k] = 1;
        goals[k].push(pulls);
      }
    };
    check('featuredTo6', copies.get(CURRENT_BANNER.featured) >= 7);
    check('allFive', has([CURRENT_BANNER.featured, ...off]));
    check('allFour', has(fours));
    check('oneFourTo6', copies.get(fours[0]) >= 7);
    check('allHolders', has([CURRENT_BANNER.featured, ...off, ...fours, ...threes]));
  }
}
const stats = (a) => {
  const s = [...a].sort((x, y) => x - y);
  return {
    players: s.length,
    mean: sum(s) / s.length,
    median: s[Math.floor(s.length / 2)],
    p90: s[Math.floor(s.length * 0.9)],
  };
};
out.collectionCosts = Object.fromEntries(Object.entries(goals).map(([k, a]) => [k, stats(a)]));
out.collectionCosts.oneFourTo6.holder = fours[0];
console.log('\nCollection costs (1,000 players, single pulls):');
for (const [k, v] of Object.entries(out.collectionCosts))
  console.log(
    `  ${k.padEnd(12)} mean ${v.mean.toFixed(0).padStart(5)}  median ${String(v.median).padStart(5)}  p90 ${String(v.p90).padStart(5)}`,
  );
writeFileSync(new URL('../docs/gacha-analysis.json', import.meta.url), JSON.stringify(out, null, 2) + '\n');
