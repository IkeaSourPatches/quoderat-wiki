import { readFileSync } from 'node:fs';
import ts from 'typescript';
const url = (s) => `data:text/javascript;base64,${Buffer.from(s).toString('base64')}`;
const compile = (name) =>
  ts.transpileModule(readFileSync(new URL(`../src/gacha/${name}.ts`, import.meta.url), 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
  }).outputText;
const poolURL = url(compile('pool'));
const collectionURL = url(compile('collection').replaceAll("'./pool'", JSON.stringify(poolURL)));
export const pool = await import(poolURL);
export const collection = await import(collectionURL);
export const save = await import(
  url(
    compile('save')
      .replaceAll("'./pool'", JSON.stringify(poolURL))
      .replaceAll("'./collection'", JSON.stringify(collectionURL)),
  )
);
export function seeded(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
