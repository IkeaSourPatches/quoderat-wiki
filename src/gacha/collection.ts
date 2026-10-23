import { FAMILIES, TIERS, type Totem } from './pool';

export const STORAGE_KEY = 'quoderat-gacha-totems';
export type Pool = { family: string; count: number; power: number };
export type Collection = { version: 3; total: number; recent: Totem[]; pools: Pool[]; recovered: boolean };
export const emptyCollection = (): Collection => ({ version: 3, total: 0, recent: [], pools: [], recovered: false });
const integer = (n: unknown): n is number => Number.isSafeInteger(n) && (n as number) >= 0;
const familyValid = (id: unknown) => FAMILIES.some(f => f.id === id);
const valid = (t: any): t is Totem => !!t && familyValid(t.family)
  && TIERS.some(r => r.id === t.tier && integer(t.depth) && t.depth >= r.depth[0] && t.depth <= r.depth[1]);

function combine(pools: Pool[]): Pool[] {
  const map = new Map<string, Pool>();
  for (const p of pools) {
    const old = map.get(p.family);
    const next = { family: p.family, count: (old?.count ?? 0) + p.count, power: (old?.power ?? 0) + p.power };
    if (!integer(next.count) || !integer(next.power)) throw new Error('Collection is too large');
    map.set(p.family, next);
  }
  return [...map.values()].sort((a, b) => a.family.localeCompare(b.family));
}
const fromTotems = (items: (Totem & { count?: number })[]) => combine(items.map(t => ({ family: t.family, count: t.count ?? 1, power: t.depth * (t.count ?? 1) })));

// Older saves migrate their remaining rewards, without recreating consumed copies.
export function decodeCollection(raw: string | null): Collection {
  if (!raw) return emptyCollection();
  const v = JSON.parse(raw);
  if (!v || !integer(v.total) || !Array.isArray(v.recent) || !v.recent.every(valid)) throw new Error('Invalid save');
  const base = { ...emptyCollection(), total: v.total, recent: v.recent.slice(0, 50), recovered: v.recovered === true };
  if (v.version === undefined) return { ...base, pools: fromTotems(v.recent), recovered: v.total > v.recent.length };
  if (v.version === 2) {
    if (!Array.isArray(v.stacks) || !v.stacks.every((t: any) => t && integer(t.count) && t.count > 0 && valid(t))) throw new Error('Invalid stacks');
    return { ...base, pools: fromTotems(v.stacks) };
  }
  if (v.version !== 3 || !Array.isArray(v.pools) || !v.pools.every((p: any) => p && familyValid(p.family) && integer(p.count) && p.count > 0 && integer(p.power) && p.power > 0)) throw new Error('Invalid pools');
  return { ...base, pools: combine(v.pools) };
}

export function addPulls(saved: Collection, got: Totem[]): Collection {
  if (!got.every(valid) || !integer(saved.total + got.length)) throw new Error('Invalid pulls');
  return { ...saved, total: saved.total + got.length, recent: [...got, ...saved.recent].slice(0, 50), pools: combine([...saved.pools, ...fromTotems(got)]) };
}
