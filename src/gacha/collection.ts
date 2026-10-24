import { FAMILIES, TIERS, type TierId, type Totem } from './pool';

export const STORAGE_KEY = 'quoderat-gacha-totems';
export const DISPLAY_SLOTS = 8;
export type TotemItem = { id: number; family: string; power: number; count: number; tier: TierId | null };
export type Collection = { version: 4; misses: number; total: number; recent: Totem[]; items: TotemItem[]; slots: (number | null)[]; nextId: number; recovered: boolean; migratedPools: boolean };
export const emptyCollection = (): Collection => ({ version: 4, misses: 0, total: 0, recent: [], items: [], slots: Array(DISPLAY_SLOTS).fill(null), nextId: 1, recovered: false, migratedPools: false });
const integer = (n: unknown): n is number => Number.isSafeInteger(n) && (n as number) >= 0;
const positive = (n: unknown): n is number => integer(n) && n > 0;
const familyValid = (id: unknown) => FAMILIES.some(f => f.id === id);
const valid = (t: any): t is Totem => !!t && familyValid(t.family)
  && TIERS.some(r => r.id === t.tier && integer(t.depth) && t.depth >= r.depth[0] && t.depth <= (r.id === 'elite' ? 39 : r.depth[1]));
const safeSum = (a: number, b: number) => { const n = a + b; if (!integer(n)) throw new Error('Collection is too large'); return n; };

// v3 kept only family totals. Preserve each as one merged item rather than inventing lost copies.
export function decodeCollection(raw: string | null): Collection {
  if (!raw) return emptyCollection();
  const v = JSON.parse(raw);
  if (!v || !integer(v.total) || !Array.isArray(v.recent) || !v.recent.every(valid)) throw new Error('Invalid save');
  if (v.misses !== undefined && (!integer(v.misses) || v.misses > 9)) throw new Error('Invalid legacy counter');
  const base = { ...emptyCollection(), misses: v.misses ?? 0, total: v.total, recent: v.recent.slice(0, 50).map((t: Totem) => t.tier === 'elite' && t.depth >= 36 ? { ...t, tier: 'epic' as const } : t), recovered: v.recovered === true };
  if (v.version === 4) {
    if (!Array.isArray(v.items) || !v.items.every((t: TotemItem) => t && positive(t.id) && familyValid(t.family) && positive(t.power) && positive(t.count) && (t.tier === null || (TIERS.some(r => r.id === t.tier && t.power >= r.depth[0] && t.power <= r.depth[1]))))) throw new Error('Invalid items');
    const ids = new Set(v.items.map((t: TotemItem) => t.id));
    if (ids.size !== v.items.length || !positive(v.nextId) || v.items.some((t: TotemItem) => t.id >= v.nextId)) throw new Error('Invalid item IDs');
    if (!Array.isArray(v.slots) || v.slots.length !== DISPLAY_SLOTS || v.slots.some((id: unknown) => id !== null && !ids.has(id)) || new Set(v.slots.filter((id: unknown) => id !== null)).size !== v.slots.filter((id: unknown) => id !== null).length) throw new Error('Invalid display slots');
    v.items.reduce((sum: number, t: TotemItem) => safeSum(sum, t.power), 0);
    v.items.reduce((sum: number, t: TotemItem) => safeSum(sum, t.count), 0);
    return { ...base, items: v.items, slots: v.slots, nextId: v.nextId, migratedPools: v.migratedPools === true };
  }
  let pools: { family: string; count: number; power: number }[];
  if (v.version === undefined) {
    pools = v.recent.map((t: Totem) => ({ family: t.family, count: 1, power: t.depth }));
    base.recovered = v.total > v.recent.length;
  } else if (v.version === 2) {
    if (!Array.isArray(v.stacks) || !v.stacks.every((t: any) => t && positive(t.count) && valid(t))) throw new Error('Invalid stacks');
    pools = v.stacks.map((t: Totem & { count: number }) => ({ family: t.family, count: t.count, power: t.depth * t.count }));
  } else if (v.version === 3 && Array.isArray(v.pools)) pools = v.pools;
  else throw new Error('Invalid collection version');
  const byFamily = new Map<string, TotemItem>();
  for (const p of pools) {
    if (!p || !familyValid(p.family) || !positive(p.count) || !positive(p.power)) throw new Error('Invalid pool');
    const old = byFamily.get(p.family);
    byFamily.set(p.family, { id: old?.id ?? byFamily.size + 1, family: p.family, count: safeSum(old?.count ?? 0, p.count), power: safeSum(old?.power ?? 0, p.power), tier: null });
  }
  return { ...base, items: [...byFamily.values()], nextId: byFamily.size + 1, migratedPools: byFamily.size > 0 };
}

export function addPulls(saved: Collection, got: Totem[]): Collection {
  if (!got.every(valid)) throw new Error('Invalid pulls');
  const nextId = safeSum(saved.nextId, got.length);
  safeSum(saved.items.reduce((n, t) => safeSum(n, t.power), 0), got.reduce((n, t) => n + t.depth, 0));
  return { ...saved, nextId, total: safeSum(saved.total, got.length), recent: [...got, ...saved.recent].slice(0, 50),
    items: [...saved.items, ...got.map((t, i) => ({ id: saved.nextId + i, family: t.family, power: t.depth, count: 1, tier: t.tier === 'elite' && t.depth >= 36 ? 'epic' as const : t.tier }))] };
}
function item(saved: Collection, id: number) {
  const found = saved.items.find(t => t.id === id);
  if (!found) throw new Error('Totem no longer exists');
  return found;
}
export function equipTotem(saved: Collection, id: number | null, slot: number): Collection {
  if (!Number.isInteger(slot) || slot < 0 || slot >= DISPLAY_SLOTS) throw new Error('Invalid slot');
  if (id !== null) item(saved, id);
  const slots = saved.slots.map(old => id !== null && old === id ? null : old);
  slots[slot] = id;
  return { ...saved, slots };
}
export const MERGE_RECIPES: Partial<Record<TierId, { cost: number; next: TierId }>> = {
  common: { cost: 10, next: 'strong' }, strong: { cost: 20, next: 'elite' }, elite: { cost: 30, next: 'epic' },
};
export function mergeCandidates(saved: Collection, targetId: number) {
  const target = item(saved, targetId), recipe = target.tier ? MERGE_RECIPES[target.tier] : undefined;
  const extras = saved.items.filter(t => t.id !== targetId && t.family === target.family && t.tier === target.tier && !saved.slots.includes(t.id))
    .sort((a, b) => a.power - b.power || a.id - b.id);
  return { recipe, ids: [targetId, ...extras.slice(0, recipe ? recipe.cost - 1 : 0).map(t => t.id)], available: 1 + extras.length };
}
export function mergeTotems(saved: Collection, targetId: number, sourceIds: number[]): Collection {
  const target = item(saved, targetId), recipe = target.tier ? MERGE_RECIPES[target.tier] : undefined;
  const ids = [targetId, ...sourceIds];
  if (!recipe || ids.length !== recipe.cost || new Set(ids).size !== ids.length) throw new Error('Incorrect upgrade recipe');
  const inputs = ids.map(id => item(saved, id));
  if (inputs.some(t => t.family !== target.family || t.tier !== target.tier) || sourceIds.some(id => saved.slots.includes(id))) throw new Error('Use matching unequipped ingredients');
  const tier = TIERS.find(t => t.id === recipe.next)!;
  const merged = { ...target, power: tier.depth[0], count: inputs.reduce((n, t) => safeSum(n, t.count), 0), tier: recipe.next };
  return { ...saved, items: saved.items.filter(t => !sourceIds.includes(t.id)).map(t => t.id === targetId ? merged : t) };
}
export function discardTotem(saved: Collection, id: number): Collection {
  item(saved, id);
  return { ...saved, items: saved.items.filter(t => t.id !== id), slots: saved.slots.map(slot => slot === id ? null : slot) };
}

/** Presentation-only stacks: equipment, power and upgrade ingredients remain individual items. */
export function inventoryStacks(saved: Collection) {
  const groups = new Map<string, TotemItem[]>();
  for (const t of saved.items) {
    const key = `${t.family}:${t.tier}`;
    const items = groups.get(key) ?? [];
    items.push(t); groups.set(key, items);
  }
  return [...groups].map(([key, items]) => ({ key, family: items[0].family, tier: items[0].tier,
    items: items.sort((a, b) => b.power - a.power || a.id - b.id),
    equipped: items.filter(t => saved.slots.includes(t.id)).length,
    minPower: items.reduce((n, t) => Math.min(n, t.power), Infinity), maxPower: items.reduce((n, t) => Math.max(n, t.power), 0),
  })).sort((a, b) => a.family.localeCompare(b.family) || TIERS.findIndex(t => t.id === b.tier) - TIERS.findIndex(t => t.id === a.tier));
}
