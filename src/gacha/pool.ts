// Gacha base: data and pull logic, kept free of React so it can be checked on its own.
//
// Canon this builds on (data/sources):
// - Totems are the slain creatures' power, condensed back out by the world. One totem per
//   creature family; a mortal can hold totems from several families.
// - The stronger a totem, the rarer it is. Typical depth 20-30; stronger ones exist but are
//   rarer. A hybrid's half-blood is 40-60 and a full creature 90-100.
// - Body totems are rarer than others: petrified trolls keep their power locked inside.
// - Laws carry two ratings: range (the docs call it scope) decides power and status, and
//   impact factor is how much a law has shaped history and daily life.
//
// Everything marked PROVISIONAL is a site mechanic, not canon, and is open for discussion.
// Star ratings for holders are a hand-made tier list (see HOLDERS below).

export type Text = { en: string; zh: string };

export type TotemFamily = {
  id: string;
  power: Text;
  creature: Text;
  note: Text;
  glyph: string;
  colour: string;
  /** PROVISIONAL relative draw weight. Only "body is rarer" is canon; the 0.5 is not. */
  weight: number;
};

export const FAMILIES: TotemFamily[] = [
  { id: 'earth', power: { en: 'Earth', zh: '土' }, creature: { en: 'Dragons', zh: '龙族' }, note: { en: 'Solids, from soil to metal', zh: '固体，从泥土到金属' }, glyph: '▲', colour: '#b08a5a', weight: 1 },
  { id: 'water', power: { en: 'Water', zh: '水' }, creature: { en: 'Dragons', zh: '龙族' }, note: { en: 'Liquids, ice and steam included', zh: '液体，冰与蒸汽亦属其中' }, glyph: '≈', colour: '#4f8fa8', weight: 1 },
  { id: 'air', power: { en: 'Air', zh: '气' }, creature: { en: 'Dragons', zh: '龙族' }, note: { en: 'Gases, everything in the atmosphere', zh: '气体，大气中的一切' }, glyph: '◌', colour: '#9fb7c4', weight: 1 },
  { id: 'plasma', power: { en: 'Plasma', zh: '等离子' }, creature: { en: 'Dragons', zh: '龙族' }, note: { en: 'Fire and lightning', zh: '火与闪电' }, glyph: 'ϟ', colour: '#d0663f', weight: 1 },
  { id: 'life', power: { en: 'Life and healing', zh: '生命与治愈' }, creature: { en: 'Unicorns', zh: '独角兽' }, note: { en: 'Every life totem is a piece of their dead', zh: '每个生命图腾都是它们死者的碎片' }, glyph: '✚', colour: '#7fb38a', weight: 1 },
  { id: 'renewal', power: { en: 'Renewal', zh: '重生' }, creature: { en: 'Phoenixes', zh: '不死鸟' }, note: { en: 'Released each time a phoenix was killed', zh: '每次不死鸟被杀时释放' }, glyph: '❋', colour: '#e0a24a', weight: 1 },
  { id: 'illusion', power: { en: 'Illusion and concealment', zh: '幻术与隐匿' }, creature: { en: 'Kitsune', zh: '狐仙' }, note: { en: 'Includes the cloak that hides you from law holders', zh: '包括能对执律者隐身的隐匿' }, glyph: '☾', colour: '#a58bc4', weight: 1 },
  { id: 'body', power: { en: 'The body', zh: '躯体' }, creature: { en: 'Trolls', zh: '巨魔' }, note: { en: 'Rarer: most troll power is locked in stone', zh: '更稀有：巨魔的力量大多封锁在石中' }, glyph: '■', colour: '#8e8f86', weight: 0.5 },
];

export type TierId = 'common' | 'strong' | 'elite' | 'epic';
export type Tier = { id: TierId; name: Text; depth: [number, number]; chance: number };

// PROVISIONAL odds and depth bands. Canon fixes only the order (stronger is rarer), the
// typical band (20-30) and a ceiling below a hybrid's 40, so elite totems stay under 40.
export const TIERS: Tier[] = [
  { id: 'common', name: { en: 'B', zh: 'B' }, depth: [20, 25], chance: 0.75 },
  { id: 'strong', name: { en: 'A', zh: 'A' }, depth: [26, 30], chance: 0.15 },
  { id: 'elite', name: { en: 'S', zh: 'S' }, depth: [31, 35], chance: 0.07 },
  { id: 'epic', name: { en: 'SS', zh: 'SS' }, depth: [36, 39], chance: 0.03 },
];

/** Canon depth landmarks, drawn on every totem's depth bar for scale. */
export const DEPTH_LANDMARKS: { from: number; to: number; label: Text }[] = [
  { from: 20, to: 30, label: { en: 'Typical totem', zh: '普通图腾' } },
  { from: 40, to: 60, label: { en: 'Hybrid', zh: '混血种' } },
  { from: 90, to: 100, label: { en: 'Full creature', zh: '完整神兽' } },
];

export type Totem = { family: string; tier: TierId; depth: number };
export type Rng = () => number;

function pickWeighted<T>(items: readonly T[], weight: (item: T) => number, rng: Rng): T {
  const total = items.reduce((sum, item) => sum + weight(item), 0);
  let roll = rng() * total;
  for (const item of items) {
    roll -= weight(item);
    if (roll < 0) return item;
  }
  return items[items.length - 1];
}

/** One totem: rarity tier first, then family, then a depth inside the tier's band. */
export function pullTotem(rng: Rng = Math.random): Totem {
  const tier = pickWeighted(TIERS, t => t.chance, rng);
  const family = pickWeighted(FAMILIES, f => f.weight, rng);
  const [low, high] = tier.depth;
  return { family: family.id, tier: tier.id, depth: low + Math.floor(rng() * (high - low + 1)) };
}

export const pullTotems = (count: number, rng: Rng = Math.random): Totem[] =>
  Array.from({ length: count }, () => pullTotem(rng));

export const familyById = (id: string) => FAMILIES.find(f => f.id === id) ?? FAMILIES[0];
export const tierById = (id: string) => TIERS.find(t => t.id === id) ?? TIERS[0];

// Laws: the second banner. Like any gacha, a pull gives a holder; repeat pulls upgrade them.
// Canon gives every law two ratings, range (the docs call it scope) and impact factor.
// Star values here are a hand-made tier list, not a formula and not canon: edit freely.
// Names and laws come from the character articles, so only the slug lives here.

export type Stars = 3 | 4 | 5;
export type HolderRating = { slug: string; stars: Stars; range: number; impact: number };

export const HOLDERS: HolderRating[] = [
  { slug: 'the-spear-and-shield', stars: 5, range: 5, impact: 5 },
  { slug: 'tertia', stars: 5, range: 5, impact: 4 },
  { slug: 'the-open-question', stars: 5, range: 5, impact: 3 },
  { slug: 'ilar-hesabu', stars: 5, range: 5, impact: 5 },
  { slug: 'ensa', stars: 5, range: 5, impact: 4 },
  { slug: 'voss-halloran', stars: 4, range: 4, impact: 5 },
  { slug: 'rudolf-ludwig', stars: 4, range: 4, impact: 4 },
  { slug: 'rushd', stars: 4, range: 4, impact: 5 },
  { slug: 'lian-xiu', stars: 4, range: 3, impact: 5 },
  { slug: 'akhil', stars: 4, range: 3, impact: 4 },
  { slug: 'aldous-vane', stars: 3, range: 2, impact: 4 },
  { slug: 'mattias-krane', stars: 3, range: 2, impact: 3 },
  { slug: 'zaid', stars: 3, range: 2, impact: 4 },
  { slug: 'vera', stars: 3, range: 2, impact: 3 },
  { slug: 'kalyan', stars: 3, range: 2, impact: 2 },
  { slug: 'sai', stars: 3, range: 1, impact: 2 },
];

/** PROVISIONAL odds per star tier; within a tier every holder is equally likely. */
export const STAR_ODDS: { stars: Stars; chance: number }[] = [
  { stars: 5, chance: 0.02 },
  { stars: 4, chance: 0.13 },
  { stars: 3, chance: 0.85 },
];

/** Upgrades: each repeat adds one level, up to this cap. What a level does is not decided yet. */
export const MAX_UPGRADE = 6;
export const upgradeLevel = (copies: number) => Math.max(0, Math.min(copies - 1, MAX_UPGRADE));

export function pullHolder(rng: Rng = Math.random, pool: readonly HolderRating[] = HOLDERS): HolderRating {
  const tiers = STAR_ODDS.filter(o => pool.some(h => h.stars === o.stars));
  const tier = pickWeighted(tiers, o => o.chance, rng);
  return pickWeighted(pool.filter(h => h.stars === tier.stars), () => 1, rng);
}

export const pullHolders = (count: number, rng: Rng = Math.random, pool: readonly HolderRating[] = HOLDERS) =>
  Array.from({ length: count }, () => pullHolder(rng, pool));

// The rare bucket is shared by holders, elite and epic totems.
export const RARE_CHANCE = 0.1;
export const PITY_LIMIT = 10;
export type MixedReward = { kind: 'holder'; rating: HolderRating } | { kind: 'totem'; totem: Totem };
export const isRare = (r: MixedReward) => r.kind === 'holder' || r.totem.tier === 'elite' || r.totem.tier === 'epic';
function totemOfTier(tier: Tier, rng: Rng): Totem {
  const family = pickWeighted(FAMILIES, f => f.weight, rng);
  return { family: family.id, tier: tier.id, depth: tier.depth[0] + Math.floor(rng() * (tier.depth[1] - tier.depth[0] + 1)) };
}
export function pullMixed(count: number, rng: Rng = Math.random, pool: readonly HolderRating[] = HOLDERS, misses = 0): { rewards: MixedReward[]; misses: number } {
  if (!Number.isInteger(count) || count < 0 || !Number.isInteger(misses) || misses < 0 || misses >= PITY_LIMIT) throw new Error('Invalid draw state');
  const rewards: MixedReward[] = [];
  for (let i = 0; i < count; i++) {
    const rare = misses === PITY_LIMIT - 1 || rng() < RARE_CHANCE;
    let reward: MixedReward;
    if (rare && pool.length && rng() < .5) reward = { kind: 'holder', rating: pullHolder(rng, pool) };
    else {
      const tiers = TIERS.filter(t => rare ? t.id === 'elite' || t.id === 'epic' : t.id === 'common' || t.id === 'strong');
      reward = { kind: 'totem', totem: totemOfTier(pickWeighted(tiers, t => t.chance, rng), rng) };
    }
    misses = isRare(reward) ? 0 : misses + 1;
    rewards.push(reward);
  }
  return { rewards, misses };
}
