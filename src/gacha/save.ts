import { addPulls, decodeCollection, emptyCollection, type Collection } from './collection';
import { emptyPity, validatePity, type MixedReward, type PityState } from './pool';
export const SAVE_KEY = 'quoderat-gacha-save-v1';
export type HolderLog = { total: number; copies: Record<string, number> };
export type GachaSave = { version: 1; totems: Collection; holders: HolderLog; pity: PityState };
export const emptySave = (): GachaSave => ({ version: 1, totems: emptyCollection(), holders: { total: 0, copies: {} }, pity: emptyPity() });
function holders(value: HolderLog): HolderLog {
  if (!value || !Number.isSafeInteger(value.total) || value.total < 0 || !value.copies || typeof value.copies !== 'object' || Array.isArray(value.copies)) throw new Error('Invalid holder save');
  let total = 0;
  for (const [slug, count] of Object.entries(value.copies)) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || !Number.isSafeInteger(count) || count <= 0) throw new Error('Invalid holder copies');
    total += count;
  }
  if (!Number.isSafeInteger(total) || total !== value.total) throw new Error('Invalid holder total');
  return value;
}
export function loadSave(raw: string | null, legacyTotems: string | null, legacyHolders: string | null): GachaSave {
  if (raw !== null) {
    const v = JSON.parse(raw);
    if (v?.version !== 1) throw new Error('Unknown save version');
    validatePity(v.pity);
    return { version: 1, totems: decodeCollection(JSON.stringify(v.totems)), holders: holders(v.holders), pity: v.pity };
  }
  const totems = decodeCollection(legacyTotems);
  return { version: 1, totems, holders: legacyHolders ? holders(JSON.parse(legacyHolders)) : { total: 0, copies: {} },
    pity: { ...emptyPity(), small: totems.misses } };
}
export function applyDraw(save: GachaSave, rewards: MixedReward[], pity: PityState): GachaSave {
  validatePity(pity);
  const copies = { ...save.holders.copies };
  let total = save.holders.total;
  for (const r of rewards) if (r.kind === 'holder') { copies[r.rating.slug] = (copies[r.rating.slug] || 0) + 1; total++; }
  return { version: 1, pity, holders: holders({ total, copies }),
    totems: addPulls(save.totems, rewards.flatMap(r => r.kind === 'totem' ? [r.totem] : [])) };
}
