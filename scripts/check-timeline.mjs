import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

// Exercise the animation lifecycle without requiring a GPU or a browser.
const moduleURL = (text) => `data:text/javascript;base64,${Buffer.from(text).toString('base64')}`;
const compile = (file) =>
  ts.transpileModule(readFileSync(new URL(file, import.meta.url), 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
  }).outputText;
const worldURL = moduleURL(compile('../src/timeline/world.ts'));
const { createEngine } = await import(
  moduleURL(compile('../src/timeline/fx.ts').replace("'./world'", JSON.stringify(worldURL)))
);
const { SLOT, S } = await import(worldURL);
let nextFrame = 0;
const pending = new Map(),
  listeners = new Set();
const media = {
  matches: true,
  addEventListener: (_, fn) => listeners.add(fn),
  removeEventListener: (_, fn) => listeners.delete(fn),
};
globalThis.matchMedia = () => media;
globalThis.window = { devicePixelRatio: 1 };
globalThis.requestAnimationFrame = (fn) => {
  pending.set(++nextFrame, fn);
  return nextFrame;
};
globalThis.cancelAnimationFrame = (id) => pending.delete(id);
const tick = () => {
  const callbacks = [...pending.values()];
  pending.clear();
  callbacks.forEach((fn) => fn(performance.now()));
};
const attributes = {};
const refs = {
  number: {
    setAttribute: (key, value) => {
      attributes[key] = value;
    },
  },
};
const ctx = new Proxy(
  { createLinearGradient: () => ({ addColorStop() {} }) },
  { get: (target, key) => target[key] ?? (() => {}) },
);
const engine = createEngine({ width: 1000, height: 640, getContext: () => ctx }, refs);
engine.resize(1000, 640);
engine.open();
tick();
assert.equal(pending.size, 0, 'reduced motion should not run an idle animation loop');
engine.setStop(S.demotion, 'fwd', S.totems);
tick();
assert.equal(
  attributes.transform,
  `translate(${SLOT.under[0].toFixed(1)} ${SLOT.under[1].toFixed(1)})`,
  'reduced motion snaps to the new law hierarchy',
);
assert.equal(pending.size, 0);
media.matches = false;
listeners.forEach((fn) => fn());
tick();
assert.equal(pending.size, 1, 'enabling motion restarts one loop');
engine.setVisible(false);
assert.equal(pending.size, 0, 'offscreen scenes stop scheduling frames');
engine.setStop(S.restoration, 'fwd', S.vacancy);
assert.equal(pending.size, 0, 'changing an offscreen scene must not wake it');
engine.setVisible(true);
tick();
assert.equal(pending.size, 1, 'returning onscreen resumes animation');
media.matches = true;
listeners.forEach((fn) => fn());
tick();
assert.equal(pending.size, 0, 'changing motion preference stops an existing loop');
engine.destroy();
assert.equal(listeners.size, 0, 'unmount removes the preference listener');
assert.equal(pending.size, 0);
console.log('Verified timeline motion preferences, law placement, visibility, and cleanup.');
