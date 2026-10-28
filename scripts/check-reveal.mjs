import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { pool, seeded } from './gacha-modules.mjs';

// The summon reveal: exact geometry, an honest telegraph, and a canvas that starts and stops cleanly.
const url = (text) => `data:text/javascript;base64,${Buffer.from(text).toString('base64')}`;
const compile = (name) =>
  ts.transpileModule(readFileSync(new URL(`../src/gacha/${name}.ts`, import.meta.url), 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
  }).outputText;
const constructionURL = url(compile('construction'));
const g = await import(constructionURL);
const plan = await import(url(compile('revealPlan')));
const { createRevealEngine } = await import(
  url(compile('revealCanvas').replaceAll("'./construction'", JSON.stringify(constructionURL)))
);

// 1. Every construction is the real one.
const near = (a, b, what, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${what}: ${a} vs ${b}`);
const d = g.dist;
near(d(g.A, g.B), g.SIDE, 'I.1 AB');
near(d(g.A, g.C), g.SIDE, 'I.1 AC');
near(d(g.B, g.C), g.SIDE, 'I.1 BC');
for (const p of [g.A, g.B, g.C, g.D, g.E, g.F]) near(d(g.O, p), g.R1, 'IV.15 vertex on the circle');
g.HEXAGON.slice(1).forEach((p, i) => near(d(g.HEXAGON[i], p), g.R1, 'IV.15 side equals the radius'));
near(g.PENTAGON_SIDE, 2 * g.R2 * Math.sin(Math.PI / 5), 'IV.11 PN is the pentagon side');
near(d(g.M, g.P), d(g.M, g.N), 'IV.11 N lies on the arc about M');
g.PENTAGON.forEach((p, i) => {
  near(d(g.O, p), g.R2, 'IV.11 vertex on the circle');
  near(d(p, g.PENTAGON[(i + 1) % 5]), g.PENTAGON_SIDE, 'IV.11 equal sides');
});
near(g.N3[0] - 500, g.R3 * Math.cos((6 * Math.PI) / 17), 'Richmond N3 under P3');
near(g.N5[0] - 500, g.R3 * Math.cos((10 * Math.PI) / 17), 'Richmond N5 under P5');
near(d(g.P3, g.HEPTADECAGON[3]), 0, 'Richmond finds P3');
near(d(g.P5, g.HEPTADECAGON[5]), 0, 'Richmond finds P5');
near(d(g.E17, g.N3), d(g.E17, g.K), 'N3 on the circle about E through K');
near(d(g.E17, g.N5), d(g.E17, g.K), 'N5 on the same circle');
near(d([(g.F17[0] + g.P0[0]) / 2, 500], g.K), (g.P0[0] - g.F17[0]) / 2, 'K on the circle on FP0');
near(g.K[0], 500, 'K on OB');
const visits = g.STAR17.slice(0, 17).map((p) => g.HEPTADECAGON.findIndex((v) => d(v, p) < 1e-9));
assert.deepEqual(
  [...visits].sort((a, b) => a - b),
  [...Array(17).keys()],
  'the star visits every vertex once',
);
near(d(g.STAR17[0], g.STAR17[17]), 0, 'the star closes');
// Everything stays inside the 1000 × 1000 figure box.
const inside = ([x, y], m = 0) => x >= -m && x <= 1000 + m && y >= -m && y <= 1000 + m;
for (const stage of g.STAGES)
  for (const s of stage.steps) {
    if (s.kind === 'line') assert.ok(inside(s.a) && inside(s.b), 'line inside the box');
    if (s.kind === 'poly')
      assert.ok(
        s.pts.every((p) => inside(p)),
        'polyline inside the box',
      );
    if (s.kind === 'arc')
      for (let i = 0; i <= 64; i++)
        assert.ok(inside(g.onCircle(s.c, s.r, s.a0 + ((s.a1 - s.a0) * i) / 64), 1e-9), 'arc inside the box');
  }
for (let s = 0; s < 4; s++)
  for (const path of g.figurePaths(s)) assert.ok(!/NaN|undefined/.test(path), 'figure path is valid');
console.log("Verified Euclid I.1, IV.15, IV.11 and Richmond's 17-gon exactly, inside the figure box.");

// 2. Timing: every stroke inside its stage, stages in order, and the longest build under ten seconds.
const budget = { 1: 3.2, 2: 5.2, 3: 7.2, 4: 9.4 };
for (const n of [1, 2, 3, 4]) {
  const s = g.schedule(n);
  assert.equal(s.stages.length, n);
  s.stages.forEach((st, i) => {
    assert.ok(st.t1 > st.t0);
    if (i) assert.ok(st.t0 > s.stages[i - 1].t1, 'a pause between stages');
  });
  for (const step of s.steps)
    assert.ok(
      step.t0 >= s.stages[step.stage].t0 - 1e-9 && step.t1 <= s.stages[step.stage].t1 + 1e-9 && step.t1 > step.t0,
      'stroke inside its stage',
    );
  for (const mark of s.marks)
    assert.ok(
      mark.t >= s.stages[mark.stage].t0 - 1e-9 && mark.t <= s.stages[mark.stage].t1 + 1e-9,
      'mark inside its stage',
    );
  assert.ok(
    s.close > s.stages[n - 1].t1 && s.collapse > s.close && s.burst > s.collapse,
    'close, collapse, burst in order',
  );
  assert.ok(s.burst <= budget[n], `${n} stages burst by ${budget[n]}s (got ${s.burst.toFixed(2)})`);
}
assert.throws(() => g.schedule(5));

// 3. The telegraph is honest: how far the figure goes is decided by the best reward and nothing else.
const { gradeOf, revealPlan, stagesFor, PIGMENTS, stageInk } = plan;
assert.deepEqual([0, 1, 2, 3, 4].map(stagesFor), [1, 1, 2, 3, 4]);
assert.deepEqual([0, 1, 2, 3].map(stageInk), [PIGMENTS[0], PIGMENTS[2], PIGMENTS[3], PIGMENTS[4]]);
assert.throws(() => revealPlan([]));
const rng = seeded(1796);
let state = pool.emptyPity(),
  seen = new Set(),
  copies = {};
for (let batch = 0; batch < 4000; batch++) {
  const draw = pool.pullMixed(batch % 3 ? 10 : 1, rng, pool.HOLDERS, state);
  state = draw.state;
  const items = draw.rewards.map((r) =>
    r.kind === 'holder' ? { ...r, copies: (copies[r.rating.slug] = (copies[r.rating.slug] || 0) + 1) } : r,
  );
  const p = revealPlan(items),
    grades = items.map(gradeOf);
  assert.deepEqual(p.grades, grades);
  assert.equal(p.top, Math.max(...grades));
  assert.equal(p.stages, stagesFor(p.top));
  if (items.some((r) => r.kind === 'holder' && r.rating.stars === 5))
    assert.equal(p.stages, 4, 'a 5★ always reaches the 17-gon');
  if (items.length === 10) assert.ok(p.stages >= 2, 'a ten-pull always has S+, so it always opens past the triangle');
  items.forEach((r, i) =>
    assert.equal(
      p.held[i],
      grades[i] >= 3 || (r.kind === 'holder' && r.copies === 1),
      'held means SS, 4★, 5★ or a new holder',
    ),
  );
  assert.deepEqual(
    [...p.splashOrder].sort((a, b) => a - b),
    p.held.flatMap((h, i) => (h ? [i] : [])),
    'every held card gets exactly one splash',
  );
  p.splashOrder
    .slice(1)
    .forEach((i, n) => assert.ok(grades[i] >= grades[p.splashOrder[n]], 'splashes build up to the best'));
  seen.add(p.stages);
}
assert.deepEqual([...seen].sort(), [1, 2, 3, 4], 'the sample reaches every stage');
console.log(
  'Verified the telegraph on 4,000 seeded batches: stages follow the best reward, every held card gets one splash, best last.',
);

// 4. The canvas: cues in order, fast-forward and skip, and no frames once hidden or destroyed.
let clock = 0,
  nextFrame = 0;
const frames = new Map();
globalThis.requestAnimationFrame = (fn) => {
  frames.set(++nextFrame, fn);
  return nextFrame;
};
globalThis.cancelAnimationFrame = (id) => frames.delete(id);
const tick = (ms = 16) => {
  clock += ms;
  const due = [...frames.values()];
  frames.clear();
  due.forEach((fn) => fn(clock));
};
const gradient = { addColorStop() {} };
const ctx = new Proxy(
  {},
  {
    get: (_, key) => (key === 'createRadialGradient' || key === 'createLinearGradient' ? () => gradient : () => {}),
    set: () => true,
  },
);
const canvas = { width: 0, height: 0, getContext: () => ctx };
const run = (stages, act) => {
  const events = [];
  const e = createRevealEngine(canvas, {
    stages,
    inks: Array.from({ length: stages }, (_, s) => stageInk(s)),
    closeInk: PIGMENTS[4],
    burstInks: PIGMENTS,
    top: stages,
    onEvent: (ev) => events.push(ev.type === 'stage' ? `stage${ev.stage}` : ev.type),
  });
  e.resize(1200, 800, 2);
  assert.equal(canvas.width, 2400);
  assert.equal(canvas.height, 1600);
  e.start();
  act(e, events);
  e.destroy();
  assert.equal(frames.size, 0, 'a destroyed reveal schedules nothing');
  tick();
  return events;
};
const full = run(4, (e) => {
  for (let i = 0; i < 700; i++) tick();
});
assert.deepEqual(full, ['stage0', 'stage1', 'stage2', 'stage3', 'close', 'burst'], 'a full 5★ build in order');
const forwarded = run(3, (e) => {
  tick();
  tick();
  e.fastForward();
  for (let i = 0; i < 10; i++) tick();
  e.fastForward();
  for (let i = 0; i < 40; i++) tick();
});
assert.deepEqual(
  forwarded,
  ['stage0', 'stage1', 'stage2', 'close', 'burst'],
  'fast-forward still passes every cue once, then bursts',
);
const skipped = run(2, (e) => {
  tick();
  e.finish();
  for (let i = 0; i < 400; i++) tick();
});
assert.deepEqual(skipped, ['stage0'], 'skip leaves without a burst');
run(1, (e) => {
  tick();
  e.setVisible(false);
  assert.equal(frames.size, 0, 'a hidden reveal stops drawing');
  e.setVisible(true);
  assert.equal(frames.size, 1, 'and resumes once');
  e.setVisible(true);
  assert.equal(frames.size, 1, 'without doubling its loop');
});
console.log('Verified reveal cues, fast-forward, skip, visibility and cleanup.');
