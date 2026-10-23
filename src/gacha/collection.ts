import { FAMILIES, TIERS, type Totem } from './pool';

export const STORAGE_KEY = 'quoderat-gacha-totems';
export type Stack = Totem & { count: number };
export type Collection = { version: 2; total: number; merges: number; recent: Totem[]; stacks: Stack[]; recovered: boolean };
export const emptyCollection = (): Collection => ({ version: 2, total: 0, merges: 0, recent: [], stacks: [], recovered: false });
export const stackKey = (t: Totem) => `${t.family}:${t.depth}`;
const integer = (n: unknown): n is number => Number.isSafeInteger(n) && (n as number) >= 0;
const valid = (t: any): t is Totem => !!t && FAMILIES.some(f => f.id === t.family)
  && TIERS.some(r => r.id === t.tier && integer(t.depth) && t.depth >= r.depth[0] && t.depth <= r.depth[1]);

function add(stacks: Stack[], totems: (Totem & { count?: number })[]): Stack[] {
  const map = new Map(stacks.map(t => [stackKey(t), { ...t }]));
  for (const t of totems) {
    const key = stackKey(t), count = (map.get(key)?.count ?? 0) + (t.count ?? 1);
    if (!Number.isSafeInteger(count)) throw new Error('Collection is too large.');
    map.set(key, { family: t.family, tier: t.tier, depth: t.depth, count });
  }
  return [...map.values()].sort((a, b) => a.family.localeCompare(b.family) || b.depth - a.depth);
}

// Validate local data before using it. Legacy saves can recover only their last 50 pulls.
export function decodeCollection(raw: string | null): Collection {
  if (!raw) return emptyCollection();
  const v = JSON.parse(raw);
  if (!v || !integer(v.total) || !Array.isArray(v.recent) || !v.recent.every(valid)) throw new Error('Invalid save');
  if (v.version === undefined) return { ...emptyCollection(), total: v.total, recent: v.recent.slice(0, 50), stacks: add([], v.recent), recovered: v.total > v.recent.length };
  if (v.version !== 2 || !integer(v.merges) || !Array.isArray(v.stacks)
      || !v.stacks.every((t: any) => t && integer(t.count) && t.count > 0 && valid(t))) throw new Error('Invalid collection');
  return { version: 2, total: v.total, merges: v.merges, recent: v.recent.slice(0, 50), stacks: add([], v.stacks), recovered: v.recovered === true };
}

export function addPulls(saved: Collection, got: Totem[]): Collection {
  if (!got.every(valid) || !Number.isSafeInteger(saved.total + got.length)) throw new Error('Invalid pulls');
  return { ...saved, total: saved.total + got.length, recent: [...got, ...saved.recent].slice(0, 50), stacks: add(saved.stacks, got) };
}
export function mergeReward(t: Totem): Totem | null {
  if (!valid(t) || t.depth >= 39) return null;
  const depth = t.depth + 1;
  return { family: t.family, depth, tier: TIERS.find(r => depth >= r.depth[0] && depth <= r.depth[1])!.id };
}
export function mergeStack(saved: Collection, key: string): Collection {
  const stack = saved.stacks.find(t => stackKey(t) === key);
  const reward = stack && mergeReward(stack);
  if (!stack || stack.count < 3 || !reward) return saved;
  const remaining = saved.stacks.map(t => stackKey(t) === key ? { ...t, count: t.count - 3 } : t).filter(t => t.count > 0);
  return { ...saved, merges: saved.merges + 1, stacks: add(remaining, [reward]) };
}
