// The world, rewound: the data behind the timeline view, kept free of drawing code
// so scripts/check-localization.mjs can verify it.
//
// Every sentence the view shows comes from the timeline article, or is a plain
// label or paraphrase of it. Nothing here adds canon. The scene's continents are
// deliberately rough shapes, so they do not commit the world to a map.

export type L = { en: string; zh: string };
export type P = [number, number];
export type Floor = { numeral: string; title: string; body: string };
// One stop on the slider: a floor of the timeline doc, or one act of the Feud.
export type Stop = { floor: number; act?: number };

export const FEUD = 5;
export const STOPS: Stop[] = [
  { floor: 0 },
  { floor: 1 },
  { floor: 2 },
  { floor: 3 },
  { floor: 4 },
  { floor: 5, act: 0 },
  { floor: 5, act: 1 },
  { floor: 5, act: 2 },
  { floor: 5, act: 3 },
  { floor: 6 },
];
// Named stops, so the scene rules below read as history rather than numbers.
export const S = {
  creation: 0,
  axiom: 1,
  gods: 2,
  hunt: 3,
  totems: 4,
  demotion: 5,
  paradox: 6,
  vacancy: 7,
  restoration: 8,
  present: 9,
} as const;

// ---------- Reading the article ----------

const zhNumerals: Record<string, string> = {
  零: '0',
  一: 'I',
  二: 'II',
  三: 'III',
  四: 'IV',
  五: 'V',
  六: 'VI',
  七: 'VII',
  八: 'VIII',
  九: 'IX',
  十: 'X',
};

// The doc still calls its sections floors ("### Floor III: …", "### 第三层：…").
export function parseTimeline(body: string) {
  const parts = body.split(/^### /m);
  const preface = parts.shift()?.trim() ?? '';
  const floors: Floor[] = [];
  for (const part of parts) {
    const [heading, ...rest] = part.split('\n');
    const text = rest.join('\n').trim();
    const en = heading.match(/^Floor ([0IVXL]+):\s*(.+)$/);
    const zh = heading.match(/^第(.)层：\s*(.+)$/);
    if (en) floors.push({ numeral: en[1], title: en[2].trim(), body: text });
    else if (zh) floors.push({ numeral: zhNumerals[zh[1]] ?? zh[1], title: zh[2].trim(), body: text });
  }
  return { preface, floors };
}

// The Feud is told in numbered acts, and each act is its own stop.
export function splitActs(body: string) {
  const intro: string[] = [],
    acts: string[] = [];
  for (const line of body.split('\n')) {
    const m = line.match(/^\d+\.\s+(.*)$/);
    if (m) acts.push(m[1].trim());
    else if (acts.length) {
      if (line.trim()) acts[acts.length - 1] += ' ' + line.trim();
    } else intro.push(line);
  }
  return { intro: intro.join('\n').trim(), acts };
}
// Each act opens with its name: "The demotion." / "降格。"
export const actName = (act: string) => act.match(/^(.+?[.。])/)?.[1] ?? act;

export type Kind = 'dragon' | 'unicorn' | 'phoenix' | 'kitsune' | 'troll' | 'mortal';
export const KIND_NAMES: Record<Kind, L> = {
  dragon: { en: 'Dragons', zh: '龙族' },
  unicorn: { en: 'Unicorns', zh: '独角兽' },
  phoenix: { en: 'Phoenixes', zh: '不死鸟' },
  kitsune: { en: 'Kitsune', zh: '狐仙' },
  troll: { en: 'Trolls', zh: '巨魔' },
  mortal: { en: 'Mortals', zh: '凡人' },
};
// A race's creation myth, from Floor 0 ("Dragons: the world's first thought…").
export function myth(floors: Floor[], name: string) {
  return floors[0]?.body.match(new RegExp(`^${name}[:：]\\s*(.+)$`, 'm'))?.[1].trim() ?? '';
}
// A family's fate in the Great Hunt, from the bullets of Floor III.
export function fate(floors: Floor[], name: string) {
  return floors[3]?.body.match(new RegExp(`^[*-]\\s+(${name}.+)$`, 'm'))?.[1].trim() ?? '';
}
// The Present's sentence about a family, if it has one.
export function present(floors: Floor[], name: string) {
  const text = floors[6]?.body ?? '';
  const sentences = text.match(/[^.。]+[.。]/g) ?? [];
  return sentences.find((s) => s.toLowerCase().includes(name.toLowerCase()))?.trim() ?? '';
}

// ---------- Interface text ----------

export const T = {
  kicker: { en: 'Timeline', zh: '时间线' },
  title: { en: 'The world, rewound', zh: '倒带的世界' },
  lede: {
    en: 'Drag through history and watch the world change in place. Only world-changing events get a stop, so the stops are spaced by events, not by years.',
    zh: '拖动时间，看世界在原地改变。只有改变世界的事件才能成为一站，所以每一站以事件划分，而非年份。',
  },
  slider: { en: 'Moment in history', zh: '历史时刻' },
  play: { en: 'Play through history', zh: '播放历史' },
  pause: { en: 'Pause', zh: '暂停' },
  again: { en: 'Play again from Creation', zh: '从创世重新播放' },
  earlier: { en: 'Earlier', zh: '更早' },
  later: { en: 'Later', zh: '更晚' },
  rewinding: { en: 'Rewinding', zh: '倒带中' },
  act: { en: 'Act {n} of 4', zh: '第{n}幕，共四幕' },
  hint: { en: 'Select something in the scene, or explore it below.', zh: '选择场景中的事物，或在下方查看详情。' },
  hintTouch: { en: 'Tap something in the scene, or explore it below.', zh: '轻点场景中的事物，或在下方查看详情。' },
  readMore: { en: 'Read more', zh: '延伸阅读' },
  inspect: { en: 'Explore the scene', zh: '探索场景' },
  fullText: { en: 'Read the whole timeline', zh: '阅读完整时间线' },
  adaptation: {
    en: 'The scene illustrates the text. Its shapes are not a map.',
    zh: '场景只是文字的图解，其中的形状并非地图。',
  },
} satisfies Record<string, L>;
export const ACT_NUMERALS = ['一', '二', '三', '四'];

export const REGION: Record<'llama' | 'range' | 'origo' | 'peak', L> = {
  llama: { en: 'Llama', zh: '羊驼' },
  range: { en: 'Limitrest Range', zh: '极限山脉' },
  origo: { en: 'Origo', zh: '原点' },
  peak: { en: 'Mt Limitrest', zh: '极限峰' },
};
export const LAW: Record<'all' | 'number' | 'sets' | 'nc', L> = {
  all: { en: 'Law of All Laws', zh: '万法之法' },
  number: { en: 'Number', zh: '数' },
  sets: { en: 'Sets', zh: '集合' },
  nc: { en: 'Non-Contradiction', zh: '不矛盾律' },
};

// What a thing in the scene is at a given stop. Paraphrases of the article only.
export const TIP: Record<string, L> = {
  undiscovered: {
    en: 'Not yet discovered. The laws always existed, waiting to be discovered.',
    zh: '尚未被发现。法则自古存在，等待被发现。',
  },
  allHeld: {
    en: 'Held by the first law holder, who condensed it into the Axiom and died a mortal’s death.',
    zh: '由第一位执律者执掌。他将其凝结为公理，最终以凡人之躯死去。',
  },
  allVacant: { en: 'Vacant. No one has ever scored a point.', zh: '空缺。从未有人得过一分。' },
  numberFirst: { en: 'Held by its first holder.', zh: '由它的第一位执律者执掌。' },
  numberDemoted: {
    en: 'Demoted to a sublaw of Sets overnight. Its first holder is murdered by Sets’ first holder.',
    zh: '一夜之间沦为集合的子法则。它的第一位执律者被集合的第一位执律者亲手杀害。',
  },
  numberIlar: {
    en: 'Held by Ilar Hesabu, who won its test with answers leaked by his family.',
    zh: '由伊拉尔·赫萨布执掌，他凭借家族泄露的答案赢得了试炼。',
  },
  numberUnder: {
    en: 'Held by Ilar Hesabu, and a sublaw of Sets again.',
    zh: '由伊拉尔·赫萨布执掌，再次成为集合的子法则。',
  },
  setsFirst: {
    en: 'Held by its first holder, who murdered Number’s.',
    zh: '由它的第一位执律者执掌，他杀害了数的第一位执律者。',
  },
  setsBroken: {
    en: 'Vacant. Ilar found a paradox in it and killed its first holder.',
    zh: '空缺。伊拉尔在其中找到悖论，杀死了它的第一位执律者。',
  },
  setsEmpty: {
    en: 'Vacant for generations, a zero-zero tie no one can break.',
    zh: '空置数代，无人能打破的零比零僵局。',
  },
  setsEnsa: {
    en: 'Held by Ensa, who revised it so the paradox can no longer be stated.',
    zh: '由恩莎执掌，她修订了法则，使悖论再也无法被表述。',
  },
  nc: { en: 'Discovered and held by S&S, the Spear and Shield.', zh: '由矛盾发现并执掌。' },
  minor: { en: 'A law discovered through the Axiom.', zh: '一条通过公理发现的法则。' },
  dynasty: {
    en: 'The dynasty founded by S&S’s best friend, which will one day produce Tertia.',
    zh: '矛盾的挚友建立的王朝，日后将诞生特尔提娅。',
  },
  kingdom: { en: 'A mortal kingdom formed around one of the first gods.', zh: '围绕最初的神建立的凡人王国。' },
  empire: {
    en: 'Kingdoms and empires rise around the totem holders, ruling beneath the gods and creatures.',
    zh: '王国与帝国围绕图腾持有者兴起，统治于神与神兽之下。',
  },
  mortalsPlain: { en: 'A scientific civilization with no power of any kind.', zh: '一个科学文明，不具任何力量。' },
  mortalsAxiom: {
    en: 'Mortals can wield laws, and the Axiom’s instructions are released openly.',
    zh: '凡人可以驾驭法则，公理的制作方法被公开发布。',
  },
  mortalsTotem: { en: 'For the first time, ordinary mortals receive power.', zh: '普通凡人第一次获得了力量。' },
  mortalsNow: {
    en: 'Mortals live on both Llama and Origo, and the Axiom sits on every wrist.',
    zh: '凡人同时生活在羊驼与原点，公理戴在每个人的手腕上。',
  },
  elite: {
    en: 'A totem holder of the new elite, powerful enough to challenge kings.',
    zh: '新精英中的图腾持有者，强大到足以挑战君王。',
  },
  ilarFled: {
    en: 'Ilar Hesabu, who assumed Sets was finished and fled to the earth dragons.',
    zh: '伊拉尔·赫萨布。他以为集合已经终结，逃往土龙族。',
  },
  ilarNow: { en: 'Ilar Hesabu, quietly sheltered by the earth tribe.', zh: '伊拉尔·赫萨布，由土龙族悄悄庇护。' },
  armies: {
    en: 'Mortal armies do the actual hunting, paid in creature skin, scales and bone.',
    zh: '真正动手狩猎的是凡人的军队，报酬是神兽的皮、鳞与骨。',
  },
  llama: { en: 'The mortals’ continent, cut off by the Limitrest Range.', zh: '凡人的大陆，以极限山脉与外界相隔。' },
  range: { en: 'The range that cuts Llama off from Origo.', zh: '隔开羊驼与原点的山脉。' },
  origo: { en: 'The creatures’ continent.', zh: '神兽的大陆。' },
  peak: { en: 'The highest peak of the Limitrest Range.', zh: '极限山脉的最高峰。' },
  earthDragon: { en: 'The earth tribe of dragons.', zh: '土龙族。' },
};

// ---------- The layout of the world, in scene units (a 1000 × 640 view) ----------

export const W = 1000,
  H = 640;
export const APEX: P = [300, 62];
export const SLOT = { top: [180, 178] as P, under: [180, 268] as P, aside: [78, 118] as P };
export const NC: P = [420, 160];
// Unnamed laws: ghosts until the stop where the Axiom turns them up.
export const MINOR: { p: P; at: number }[] = [
  { p: [245, 128], at: 2 },
  { p: [352, 108], at: 4 },
  { p: [470, 92], at: 4 },
  { p: [522, 206], at: 5 },
  { p: [300, 224], at: 3 },
  { p: [110, 236], at: 4 },
  { p: [398, 262], at: 6 },
  { p: [40, 184], at: 8 },
  { p: [360, 306], at: 9 },
  { p: [236, 312], at: 9 },
  { p: [452, 40], at: 9 },
  { p: [150, 58], at: 6 },
];
// Mortal settlements on Llama, and the two that appear on Origo in the Present.
export const TOWNS: P[] = [
  [88, 466],
  [170, 540],
  [250, 452],
  [328, 552],
  [110, 606],
  [262, 606],
];
export const ORIGO_TOWNS: P[] = [
  [705, 532],
  [948, 600],
];
export const KINGDOM_OF = { number: 1, nc: 3, dynasty: 2 };
export const AXIOM_ORIGIN = TOWNS[2];
// Ilar comes from the murdered holder's family, in Number's kingdom.
export const ILAR_FROM = TOWNS[KINGDOM_OF.number];
export const ENSA_FROM = TOWNS[0];
// The Great Hunt's columns cross the two passes of the Limitrest Range.
export const PASSES: P[] = [
  [440, 392],
  [572, 388],
];
export const ROUTES: P[][] = [
  [TOWNS[2], [350, 418], PASSES[0], [520, 404], [600, 424], [690, 470], [780, 505]],
  [TOWNS[3], [420, 505], [500, 452], PASSES[1], [640, 438], [720, 520], [840, 575]],
  [TOWNS[1], [300, 500], PASSES[0], [560, 416], [640, 470], [760, 500], [920, 525]],
];

export type Element = 'earth' | 'water' | 'air' | 'plasma';
export const ELEMENT_COLOR: Record<Element, string> = {
  earth: '#d9a15c',
  water: '#6fa9de',
  air: '#d9eef0',
  plasma: '#bd8fe3',
};
export type Creature = { id: string; kind: Kind; at: P; color: string; element?: Element };
export const CREATURES: Creature[] = [
  // Plasma lands lie closest to the mortal settlements.
  { id: 'dragon-plasma', kind: 'dragon', at: [648, 452], color: ELEMENT_COLOR.plasma, element: 'plasma' },
  { id: 'dragon-water', kind: 'dragon', at: [862, 448], color: ELEMENT_COLOR.water, element: 'water' },
  { id: 'dragon-air', kind: 'dragon', at: [950, 404], color: ELEMENT_COLOR.air, element: 'air' },
  { id: 'dragon-earth', kind: 'dragon', at: [760, 582], color: ELEMENT_COLOR.earth, element: 'earth' },
  { id: 'unicorn-1', kind: 'unicorn', at: [790, 524], color: '#eef3f6' },
  { id: 'unicorn-2', kind: 'unicorn', at: [858, 592], color: '#eef3f6' },
  { id: 'kitsune-1', kind: 'kitsune', at: [735, 466], color: '#f2a250' },
  { id: 'kitsune-2', kind: 'kitsune', at: [930, 528], color: '#f2a250' },
  { id: 'troll-1', kind: 'troll', at: [624, 528], color: '#a3c48d' },
  { id: 'troll-2', kind: 'troll', at: [672, 600], color: '#a3c48d' },
  { id: 'phoenix', kind: 'phoenix', at: [868, 262], color: '#ff8c4d' },
];
export const ILAR: P = [760, 614];

// Where a creature stands at a stop. Kitsune hide among mortals from the Hunt on,
// and come back out to trade in the Present; most dragons draw nearer to people.
export function creatureAt(c: Creature, s: number): P {
  if (c.kind === 'kitsune' && s >= S.hunt) {
    if (s === S.present) return c.id === 'kitsune-1' ? [726, 512] : [276, 440];
    return c.id === 'kitsune-1' ? [244, 466] : [340, 566];
  }
  if (s === S.present && c.id === 'dragon-plasma') return [672, 486];
  if (s === S.present && c.id === 'dragon-water') return [850, 470];
  return c.at;
}

// Where Number and Sets sit in the hierarchy at a stop.
export function lawSlots(s: number) {
  const setsOnTop = s === S.demotion || s >= S.restoration;
  return {
    number: setsOnTop ? SLOT.under : SLOT.top,
    sets: setsOnTop ? SLOT.top : SLOT.aside,
    numberUnderSets: setsOnTop,
  };
}
export type LawState = 'ghost' | 'lit' | 'vacant' | 'dying';
export function lawStates(s: number) {
  const all: LawState = s === S.creation ? 'ghost' : s === S.axiom ? 'dying' : 'vacant';
  const number: LawState = s < S.gods ? 'ghost' : s === S.demotion ? 'vacant' : 'lit';
  const sets: LawState = s < S.demotion ? 'ghost' : s === S.demotion || s >= S.restoration ? 'lit' : 'vacant';
  const nc: LawState = s < S.gods ? 'ghost' : 'lit';
  return { all, number, sets, nc, setsCracked: s === S.paradox || s === S.vacancy };
}

// The camera leans towards the action. Zoom is gentler on wide screens.
export const CAMERA: { at: P; zoom: number }[] = [
  { at: [500, 320], zoom: 1 },
  { at: [300, 330], zoom: 1.12 },
  { at: [320, 320], zoom: 1.14 },
  { at: [560, 430], zoom: 1.12 },
  { at: [480, 420], zoom: 1.08 },
  { at: [230, 210], zoom: 1.55 },
  { at: [450, 330], zoom: 1.1 },
  { at: [300, 320], zoom: 1.2 },
  { at: [220, 260], zoom: 1.45 },
  { at: [500, 320], zoom: 1 },
];

// Seeded randomness, so the scene looks the same on every visit.
export function rng(seed: number) {
  let s = seed % 2147483647 || 1;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// Related archive entries for each inspectable subject. Locations are described
// in the timeline itself; the view opens that text instead of inventing pages.
export function relatedSlugs(key: string): string[] {
  const [kind, id] = key.split(':');
  if (kind === 'creature') {
    const creature = CREATURES.find((c) => c.id === id);
    const pages: Record<string, string> = {
      dragon: 'dragons',
      unicorn: 'unicorns-life-and-healing',
      phoenix: 'phoenixes-renewal',
      kitsune: 'kitsune-illusion-and-concealment',
      troll: 'trolls-the-body',
    };
    return creature ? [pages[creature.kind], 'how-creatures-work'].filter(Boolean) : [];
  }
  const pages: Record<string, string[]> = {
    all: ['the-app-and-the-law-of-all-laws', 'the-test'],
    number: ['number-and-sets', 'ilar-hesabu'],
    sets: ['number-and-sets', 'ensa'],
    nc: ['the-law-of-non-contradiction', 'the-spear-and-shield'],
    minor: ['law-holders', 'the-test'],
    dynasty: ['tertia', 'ordinary-people-and-the-climb'],
    kingdom: ['ordinary-people-and-the-climb'],
    empire: ['ordinary-people-and-the-climb'],
    elite: ['how-creatures-work', 'ordinary-people-and-the-climb'],
    ilar: ['ilar-hesabu', 'ersetu'],
    town: ['ordinary-people-and-the-climb', 'how-creatures-work'],
    llama: ['timeline'],
    origo: ['timeline'],
    range: ['timeline'],
    peak: ['timeline'],
  };
  return pages[kind] ?? [];
}
