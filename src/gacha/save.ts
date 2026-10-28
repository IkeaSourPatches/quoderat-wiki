import { addPulls, decodeCollection, emptyCollection, type Collection } from './collection';
import { emptyPity, validatePity, type MixedReward, type PityState } from './pool';
// Ranked recipes start a fresh collection; later visits preserve this save.
export const SAVE_KEY = 'quoderat-gacha-ranked-v1';
// One-time rules reset: retire all previous gacha saves, without touching other site data.
export function readCurrentSave(storage: Pick<Storage, 'getItem' | 'removeItem'>): GachaSave {
  for (const key of ['quoderat-gacha-save-v1', 'quoderat-gacha-totems', 'quoderat-gacha-holders'])
    storage.removeItem(key);
  return loadSave(storage.getItem(SAVE_KEY));
}
export type HolderLog = { total: number; copies: Record<string, number> };
export type GachaSave = { version: 2; totems: Collection; holders: HolderLog; pity: PityState };
export const emptySave = (): GachaSave => ({
  version: 2,
  totems: emptyCollection(),
  holders: { total: 0, copies: {} },
  pity: emptyPity(),
});
function holders(value: HolderLog): HolderLog {
  if (
    !value ||
    !Number.isSafeInteger(value.total) ||
    value.total < 0 ||
    !value.copies ||
    typeof value.copies !== 'object' ||
    Array.isArray(value.copies)
  )
    throw new Error('Invalid holder save');
  let total = 0;
  for (const [slug, count] of Object.entries(value.copies)) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || !Number.isSafeInteger(count) || count <= 0)
      throw new Error('Invalid holder copies');
    total += count;
  }
  if (!Number.isSafeInteger(total) || total !== value.total) throw new Error('Invalid holder total');
  return value;
}
export function loadSave(raw: string | null): GachaSave {
  if (raw === null) return emptySave();
  const v = JSON.parse(raw);
  if (v?.version !== 2 || !v.totems || typeof v.totems !== 'object') throw new Error('Invalid ranked save');
  validatePity(v.pity);
  const totems = decodeCollection(JSON.stringify(v.totems));
  if (v.totems.version !== 4 || totems.items.some((t) => t.tier === null)) throw new Error('Unranked inventory');
  return { version: 2, totems, holders: holders(v.holders), pity: v.pity };
}
export function applyDraw(save: GachaSave, rewards: MixedReward[], pity: PityState): GachaSave {
  validatePity(pity);
  const copies = { ...save.holders.copies };
  let total = save.holders.total;
  for (const r of rewards)
    if (r.kind === 'holder') {
      copies[r.rating.slug] = (copies[r.rating.slug] || 0) + 1;
      total++;
    }
  return {
    version: 2,
    pity,
    holders: holders({ total, copies }),
    totems: addPulls(
      save.totems,
      rewards.flatMap((r) => (r.kind === 'totem' ? [r.totem] : [])),
    ),
  };
}
