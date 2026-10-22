import { useMemo, useState, type KeyboardEvent } from 'react';
import type { Language } from '../i18n';
import './games.css';

// Vera holds the Law of Superposition: in undisturbed layers, lower layers are older.
// She senses where layers were disturbed, but never who did it. The final level ends
// with "something" sealed under the earth tribe, never a name, so canon stays intact.

type Lang = [string, string];
type Layer = { name: Lang; fill: string; mark?: string };
// A shaft dug from the top of layer `from`, down to a chamber in layer `to`.
type Dig = { x: number; from: number; to: number; id: string };

const W = 600, H = 340, TOP = 40;
const strata: Layer[] = [
  { name: ['Bedrock', '基岩'], fill: '#3d4a44' },
  { name: ['Grey shale', '灰色页岩'], fill: '#56645b' },
  { name: ['Red clay', '红黏土'], fill: '#7a4a3a' },
  { name: ['Sandstone', '砂岩'], fill: '#9b8452' },
  { name: ['Volcanic ash', '火山灰'], fill: '#b9b39c' },
  { name: ['Topsoil', '表土'], fill: '#4f5d3a' },
];
const city: Layer[] = [
  { name: ['First village', '最初的村落'], fill: '#4a4f45', mark: '⌂' },
  { name: ['Stone wall', '石墙'], fill: '#66665a', mark: '▦' },
  { name: ['Lantern Street', '灯笼街'], fill: '#7d6440', mark: '✦' },
  { name: ['Market floor', '集市地面'], fill: '#8e7a58', mark: '◇' },
  { name: ['Today’s square', '今日广场'], fill: '#5d6a4c', mark: '◎' },
];

function bands(layers: Layer[]) {
  const h = (H - TOP) / layers.length;
  // Wavy boundaries, fixed per index, so redraws never move the ground.
  const edge = (i: number) => {
    const y = H - i * h;
    return Array.from({ length: 13 }, (_, k) => [k * 50, i === 0 ? H : y + Math.sin(k * 1.7 + i * 2.3) * (i === layers.length ? 4 : 6)]);
  };
  return layers.map((layer, i) => {
    const lower = edge(i), upper = edge(i + 1);
    const d = `M${lower.map(p => p.join(' ')).join(' L')} L${[...upper].reverse().map(p => p.join(' ')).join(' L')} Z`;
    return { layer, i, d, top: H - (i + 1) * h, bottom: H - i * h, mid: H - (i + .5) * h };
  });
}
const yTop = (b: ReturnType<typeof bands>, i: number) => b[i].top;

function seeded(seed: number) { return () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }; }
function haystack(seed: number, layers: number): Dig[] {
  const r = seeded(seed);
  const n = 13, newest = Math.floor(r() * n);
  return Array.from({ length: n }, (_, i) => {
    const from = i === newest ? layers - 1 : 1 + Math.floor(r() * (layers - 2));
    return { id: `d${i}`, x: 34 + i * (W - 68) / (n - 1) + (r() - .5) * 10, from, to: Math.max(0, from - 1 - Math.floor(r() * 2)) };
  });
}

const press = (fn: () => void) => (e: KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn(); } };

function Cliff({ layers, digs = [], found = [], subtle = false, onLayer, onDig, numbered = [], label }: {
  layers: Layer[]; digs?: Dig[]; found?: string[]; subtle?: boolean; numbered?: number[]; label: string;
  onLayer?: (i: number) => void; onDig?: (d: Dig) => void;
}) {
  const b = useMemo(() => bands(layers), [layers]);
  const half = digs.length > 5 ? 17 : 32;
  return <svg viewBox={`0 0 ${W} ${H}`} className="vd-cliff" role="group" aria-label={label}>
    <defs>
      <pattern id="vd-grain" width="8" height="8" patternUnits="userSpaceOnUse"><path d="M0 6H8M3 2H6" stroke="#0003" strokeWidth="1" /></pattern>
      <pattern id="vd-fill" width="10" height="10" patternUnits="userSpaceOnUse"><rect width="10" height="10" fill="#2b2a22" /><circle cx="2" cy="3" r="1.4" fill="#7a6a4a" /><circle cx="7" cy="7" r="1.1" fill="#5d6a4c" /><circle cx="8" cy="2" r=".8" fill="#9b8452" /></pattern>
    </defs>
    <rect x="0" y="0" width={W} height={TOP} className="vd-sky" />
    {b.map(({ layer, i, d, mid }) => <g key={i} className={`vd-layer${onLayer ? ' tap' : ''}${numbered.includes(i) ? ' done' : ''}`}
      role={onLayer ? 'button' : undefined} tabIndex={onLayer ? 0 : undefined} aria-label={layer.name[0]}
      onClick={onLayer ? () => onLayer(i) : undefined} onKeyDown={onLayer ? press(() => onLayer(i)) : undefined}>
      <title>{layer.name[0]}</title><path d={d} fill={layer.fill} /><path d={d} fill="url(#vd-grain)" />
      {layer.mark && <text x="40" y={mid + 6} className="vd-mark">{layer.mark}</text>}
      {numbered.includes(i) && <text x={W - 36} y={mid + 7} className="vd-num">{numbered.indexOf(i) + 1}</text>}
    </g>)}
    {digs.map(dig => {
      const top = yTop(b, dig.from), chamber = b[dig.to].mid, shown = found.includes(dig.id);
      const shaft = half > 20 ? 9 : 6;
      const d = `M${dig.x - shaft} ${top} V${chamber - 10} Q${dig.x - half + 2} ${chamber - 14} ${dig.x - half} ${chamber + 4} Q${dig.x - half + 4} ${chamber + 20} ${dig.x} ${chamber + 20} Q${dig.x + half - 2} ${chamber + 20} ${dig.x + half} ${chamber + 4} Q${dig.x + half - 2} ${chamber - 14} ${dig.x + shaft} ${chamber - 10} V${top} Z`;
      return <path key={dig.id} d={d} className={`vd-dig${subtle ? ' subtle' : ''}${shown ? ' found' : ''}${onDig ? ' tap' : ''}`} fill="url(#vd-fill)"
        role={onDig ? 'button' : undefined} tabIndex={onDig ? 0 : undefined} aria-label="disturbance"
        onClick={onDig ? e => { e.stopPropagation(); onDig(dig); } : undefined} onKeyDown={onDig ? press(() => onDig(dig)) : undefined} />;
    })}
  </svg>;
}

export function VeraDig({ language, open }: { language: Language; open: (slug: string) => void }) {
  const text = (en: string, zh: string) => language === 'zh' ? zh : en;
  const say = (l: Lang) => text(l[0], l[1]);
  const [level, setLevel] = useState(0);
  const [order, setOrder] = useState<number[]>([]);
  const [answer, setAnswer] = useState<number | null>(null);
  const [found, setFound] = useState<string[]>([]);
  const [misses, setMisses] = useState(0);
  const [seed, setSeed] = useState(() => 1 + Math.floor(Math.random() * 99999));
  const [line, setLine] = useState<Lang | null>(null);
  const [shake, setShake] = useState(0);

  const spotDigs: Dig[] = useMemo(() => [{ id: 's1', x: 140, from: 3, to: 1 }, { id: 's2', x: 330, from: 5, to: 3 }, { id: 's3', x: 490, from: 4, to: 2 }], []);
  const grave: Dig[] = useMemo(() => [{ id: 'g', x: 330, from: 2, to: 0 }], []);
  const hay = useMemo(() => haystack(seed, strata.length), [seed]);
  const newest = hay.find(d => d.from === strata.length - 1)!;
  const digsLeft = 3 - found.length;
  const vaultFound = found.includes(newest.id);

  const reset = (to: number) => { setLevel(to); setOrder([]); setAnswer(null); setFound([]); setMisses(0); setLine(null); };
  const wrong = (l: Lang) => { setLine(l); setShake(s => s + 1); };

  const levels: { title: Lang; brief: Lang }[] = [
    { title: ['Read the cliff', '读懂这面崖壁'], brief: ['Nothing here has been disturbed. Tap the layers from oldest to youngest.', '这里没有任何扰动。从最古老到最年轻，依次点击各层。'] },
    { title: ['Cities on cities', '层层叠建的城市'], brief: ['Someone dug a grave into this town. When?', '有人在这座城镇里挖了一座坟墓。是什么时候？'] },
    { title: ['Find the disturbances', '找出扰动'], brief: ['Three places in this cliff were dug and refilled. Tap all three.', '这面崖壁有三处被挖开后又回填。把三处都点出来。'] },
    { title: ['The haystack', '大海捞针'], brief: ['Earth-tribe ground, riddled with tunnels. Something new is hidden in one of them. You have three digs.', '土龙族的地下，布满隧道。其中一条里藏着新近的东西。你只有三次挖掘机会。'] },
  ];

  function tapLayer(i: number) {
    if (order.includes(i)) return;
    const expected = order.length;
    if (i !== expected) { wrong(i > expected ? ['That layer sits on something older. Start lower.', '这一层压在更古老的东西上面。从更低处开始。'] : ['Already counted. Keep going up.', '已经数过了。继续往上。']); return; }
    const next = [...order, i]; setOrder(next);
    setLine(next.length === strata.length ? ['Bottom is oldest, unless someone dug. Nobody dug here.', '底层最古老，除非有人挖过。这里没人挖过。'] : null);
  }
  function tapSpot(d: Dig) {
    if (found.includes(d.id)) return;
    const next = [...found, d.id]; setFound(next);
    setLine(next.length === 3 ? ['All three. The ground always tells.', '三处都找到了。地层从不说谎。'] : ['One. The layers break off and the fill doesn’t match.', '一处。地层在这里断开，回填的土对不上。']);
  }
  function tapHay(d: Dig) {
    if (found.includes(d.id) || vaultFound || digsLeft <= 0) return;
    setFound(f => [...f, d.id]);
    if (d.id === newest.id) { setLine(['A sealed vault, cut through every layer, even the topsoil. Something is down here. The layers can’t say what.', '一座密封的地窖，穿透了每一层，连表土也不例外。下面有东西。地层说不出那是什么。']); return; }
    const cover = strata[d.from + 1].name;
    setLine([`Old tunnel. The ${cover[0].toLowerCase()} lies unbroken over it, so it was dug before that layer fell.`, `旧隧道。${cover[1]}完好地覆盖在上面，所以它是在那一层沉积之前挖的。`]);
  }

  const done = [order.length === strata.length, answer === 0, found.length === 3, vaultFound][level];
  const graveOptions: Lang[] = [
    ['After Lantern Street, before the Market floor', '灯笼街之后，集市地面之前'],
    ['Before the Stone wall', '石墙之前'],
    ['After Today’s square', '今日广场之后'],
  ];

  return <div className="vd">
    <header className="games-head">
      <h1>{text('Vera’s dig', '维拉的挖掘')}</h1>
      <p>{text('In undisturbed layers, lower layers are older. Vera trusts nothing else.', '在未受扰动的地层中，下层比上层更古老。除此之外，维拉什么都不信。')}</p>
    </header>

    <ol className="vd-steps" aria-label={text('Levels', '关卡')}>
      {levels.map((l, i) => <li key={i} className={i === level ? 'on' : i < level ? 'past' : ''}><button onClick={() => reset(i)}>{i + 1}. {say(l.title)}</button></li>)}
    </ol>

    <section className="vd-board">
      <h2>{say(levels[level].title)}</h2>
      <p className="vd-brief">{say(levels[level].brief)}</p>
      <div className={`vd-frame${shake ? ' shake' : ''}`} key={`${level}-${shake}`}>
        {level === 0 && <Cliff layers={strata} onLayer={tapLayer} numbered={order} label={text('Cliff face', '崖壁')} />}
        {level === 1 && <Cliff layers={city} digs={grave} found={['g']} label={text('Town cross-section', '城镇剖面')} />}
        {level === 2 && <Cliff layers={strata} digs={spotDigs} found={found} subtle onDig={tapSpot} onLayer={() => { setMisses(m => m + 1); wrong(['Undisturbed. Lower is older here.', '没有扰动。这里依然是下层更古老。']); }} label={text('Cliff face', '崖壁')} />}
        {level === 3 && <Cliff layers={strata} digs={hay} found={found} onDig={tapHay} label={text('Earth-tribe ground', '土龙族地下')} />}
      </div>

      {level === 1 && <div className="vd-choices">{graveOptions.map((o, i) =>
        <button key={i} className={`games-btn quiet${answer === i ? (i === 0 ? ' right' : ' wrongpick') : ''}`} disabled={answer === 0 && i !== 0}
          onClick={() => { setAnswer(i); if (i === 0) setLine(['It cuts Lantern Street, and the Market floor lies unbroken on top. So it came between the two.', '它切穿了灯笼街，而集市地面完好地覆盖其上。所以它发生在两者之间。']); else wrong(i === 1 ? ['It cuts through the wall’s layer, so the wall was already there.', '它切穿了石墙那一层，所以石墙早已存在。'] : ['Two layers lie on top of it, unbroken. It’s older than that.', '它上面有两层完好的地层。它比那更古老。']); }}>{say(o)}</button>)}</div>}

      <div className="vd-status">
        {level === 2 && <span>{text(`Found ${found.length} of 3 · wrong taps ${misses}`, `已找到 ${found.length}/3 · 误点 ${misses}`)}</span>}
        {level === 3 && <span>{vaultFound ? text('Found it.', '找到了。') : text(`Digs left: ${digsLeft}`, `剩余挖掘：${digsLeft}`)}</span>}
      </div>
      <p className="vd-line" aria-live="polite">{line ? <><b>{text('Vera:', '维拉：')}</b> {say(line)}</> : ' '}</p>

      <div className="vd-actions">
        {level === 3 && (vaultFound || digsLeft <= 0) && <button className="games-btn" onClick={() => { setSeed(s => s + 7919); reset(3); }}>{text('New ground', '换一片地')}</button>}
        {level === 3 && !vaultFound && digsLeft <= 0 && <p className="vd-hint">{text('Hint: an old tunnel was dug from an old surface, so younger layers cover it. Look for the one that breaks the topsoil.', '提示：旧隧道是从旧地表挖下去的，所以更年轻的地层覆盖着它。找那条穿破表土的。')}</p>}
        {done && level < 3 && <button className="games-btn" onClick={() => reset(level + 1)}>{text('Next level', '下一关')}</button>}
      </div>
    </section>

    <p className="games-foot">
      <button className="games-link" onClick={() => open('vera')}>{text('Read Vera’s profile', '阅读维拉的人物档案')}</button>
      <button className="games-link" onClick={() => open('play')}>{text('All games', '全部游戏')}</button>
    </p>
  </div>;
}
