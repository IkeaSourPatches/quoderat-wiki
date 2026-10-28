import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactElement,
  type RefObject,
} from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ChevronLeft, ChevronRight, Pause, Play, Rewind, RotateCcw } from 'lucide-react';
import type { Article } from '../api';
import type { Language } from '../i18n';
import { createEngine, dwell, type Engine, type Move, type Refs } from './fx';
import {
  ACT_NUMERALS,
  APEX,
  AXIOM_ORIGIN,
  CREATURES,
  ELEMENT_COLOR,
  FEUD,
  H,
  ILAR,
  KIND_NAMES,
  KINGDOM_OF,
  LAW,
  MINOR,
  NC,
  ORIGO_TOWNS,
  REGION,
  S,
  STOPS,
  T,
  TIP,
  TOWNS,
  W,
  actName,
  creatureAt,
  fate,
  lawStates,
  myth,
  parseTimeline,
  present,
  relatedSlugs,
  rng,
  splitActs,
  type Creature,
  type Floor,
  type Kind,
  type L,
  type P,
} from './world';
import './timeline.css';

// The world, rewound: the timeline as one living scene. A slider moves the whole
// world through history in place, and the text of one moment sits beside it.
// All text comes from the timeline article; this file only arranges it.

const ERA = ['#2f7a6e', '#a8853a', '#4f68a3', '#9a3a30', '#4f9a5c', '#7a4f9e', '#b8a167'];
const LAST = STOPS.length - 1;
// Slider positions: floors evenly spaced, with the Feud's acts dividing its segment.
const pct = (i: number) => ((STOPS[i].floor + (STOPS[i].act ?? 0) / 4) / 6) * 100;
const nearest = (x: number) =>
  STOPS.reduce((best, _, i) => (Math.abs(pct(i) - x) < Math.abs(pct(best) - x) ? i : best), 0);
const cls = (...names: (string | false | null | undefined)[]) => names.filter(Boolean).join(' ');

// Mortal dots in each settlement, the same on every visit.
type Dot = { x: number; y: number; tint: string | null };
const ELEMENTS = Object.values(ELEMENT_COLOR);
function townDots(at: P, seed: number, hollow: boolean): Dot[] {
  const r = rng(seed),
    dots: Dot[] = [];
  for (let tries = 0; dots.length < 7 && tries < 400; tries++) {
    const a = r() * Math.PI * 2,
      d = (hollow ? 8 : 3) + r() * 12;
    const x = at[0] + Math.cos(a) * d,
      y = at[1] + Math.sin(a) * d * 0.62;
    if (dots.some((o) => Math.hypot(o.x - x, o.y - y) < 4.8)) continue;
    dots.push({ x, y, tint: r() < 0.42 ? ELEMENTS[Math.floor(r() * ELEMENTS.length)] : null });
  }
  return dots;
}
const ELITES = [KINGDOM_OF.number, KINGDOM_OF.nc];
const DOTS = TOWNS.map((p, i) => townDots(p, 11 + i * 7, ELITES.includes(i)));
const ORIGO_DOTS = ORIGO_TOWNS.map((p, i) =>
  townDots(p, 91 + i * 7, false).map((d) => ({ ...d, tint: d.tint ?? ELEMENTS[i] })),
);
const DUST = (() => {
  const r = rng(99);
  return Array.from({ length: 70 }, () => [r() * W, r() * 385, 0.4 + r() * 0.9, 2 + r() * 5, r() * 5]);
})();

function Glyph({ kind }: { kind: Kind }) {
  if (kind === 'dragon')
    return (
      <>
        <path d="M-10 7C-10 1-3 2-3-3C-3-7 2-9 7-6" />
        <path d="M-3-3L3-12L4-4" />
        <path d="M7-6L10.5-4L7-3" />
        <circle className="eye" cx="5.1" cy="-6.3" r=".9" />
      </>
    );
  if (kind === 'unicorn')
    return (
      <>
        <path className="horn" d="M-.5-2L3-13L4.2-1.5M0-5.4L3.7-6M1-9L3.5-9.4" />
        <path d="M-7 8C-8 2-5-3 1-2C6-1 8 3 7 8" />
        <circle className="eye" cx="2" cy="2" r=".9" />
      </>
    );
  if (kind === 'phoenix')
    return (
      <>
        <path d="M0-11C6-5 7 2 0 9C-7 2-6-5 0-11Z" />
        <path d="M0-3C2 0 2 3 0 5C-2 3-2 0 0-3Z" />
        <path d="M-11-3Q-6 2-3 0M11-3Q6 2 3 0" />
      </>
    );
  if (kind === 'kitsune')
    return (
      <>
        <path d="M-8-9L-3-3L3-3L8-9L7 2L0 9L-7 2Z" />
        <path d="M-3.5 1h2M1.5 1h2" />
        <path className="cloak" d="M10-3L16 9L6 9Z" />
      </>
    );
  if (kind === 'troll')
    return (
      <>
        <path d="M-8 9L-9 0Q-7-10 0-11Q8-10 9-1L8 9Z" />
        <path className="face" d="M-4-2h2.4M1.6-2h2.4M-2.5 3.5h5" />
      </>
    );
  return null;
}

function creatureState(c: Creature, s: number) {
  if (s < S.hunt) return '';
  if (c.kind === 'unicorn') return 'hunted';
  if (c.kind === 'troll') return 'stone';
  if (c.kind === 'phoenix') return 'reborn';
  if (c.kind === 'kitsune') return s === S.present ? 'trader' : 'hidden';
  return 'diminished';
}

type Tip = { title: string; caption?: string; body: string };
function tipFor(key: string, s: number, floors: Floor[], lang: Language): Tip | null {
  const t = (l: L) => l[lang];
  const [kind, id] = key.split(':');
  const law = (title: L, body: L): Tip => ({ title: t(title), body: t(body) });
  if (kind === 'all')
    return law(LAW.all, s === S.creation ? TIP.undiscovered : s === S.axiom ? TIP.allHeld : TIP.allVacant);
  if (kind === 'number')
    return law(
      LAW.number,
      s < S.gods
        ? TIP.undiscovered
        : s < S.demotion
          ? TIP.numberFirst
          : s === S.demotion
            ? TIP.numberDemoted
            : s < S.restoration
              ? TIP.numberIlar
              : TIP.numberUnder,
    );
  if (kind === 'sets')
    return law(
      LAW.sets,
      s < S.demotion
        ? TIP.undiscovered
        : s === S.demotion
          ? TIP.setsFirst
          : s === S.paradox
            ? TIP.setsBroken
            : s === S.vacancy
              ? TIP.setsEmpty
              : TIP.setsEnsa,
    );
  if (kind === 'nc') return law(LAW.nc, s < S.gods ? TIP.undiscovered : TIP.nc);
  if (kind === 'minor')
    return law({ en: 'A law', zh: '一条法则' }, s >= MINOR[Number(id)].at ? TIP.minor : TIP.undiscovered);
  if (kind === 'dynasty') return law({ en: 'A dynasty', zh: '一个王朝' }, TIP.dynasty);
  if (kind === 'kingdom') return law({ en: 'A kingdom', zh: '王国' }, TIP.kingdom);
  if (kind === 'empire') return law({ en: 'Kingdoms and empires', zh: '王国与帝国' }, TIP.empire);
  if (kind === 'elite') return law({ en: 'Totem holder', zh: '图腾持有者' }, TIP.elite);
  if (kind === 'ilar')
    return law({ en: 'Ilar Hesabu', zh: '伊拉尔·赫萨布' }, s === S.present ? TIP.ilarNow : TIP.ilarFled);
  if (kind === 'llama' || kind === 'origo' || kind === 'range' || kind === 'peak') return law(REGION[kind], TIP[kind]);
  if (kind === 'town') {
    if (s === S.creation)
      return {
        title: t(KIND_NAMES.mortal),
        caption: t({ en: 'Their creation myth', zh: '他们的创世神话' }),
        body: `${myth(floors, KIND_NAMES.mortal[lang])} ${t(TIP.mortalsPlain)}`.trim(),
      };
    return law(KIND_NAMES.mortal, s < S.totems ? TIP.mortalsAxiom : s < S.present ? TIP.mortalsTotem : TIP.mortalsNow);
  }
  if (kind === 'creature') {
    const c = CREATURES.find((x) => x.id === id);
    if (!c) return null;
    const name = KIND_NAMES[c.kind][lang];
    const title = t(KIND_NAMES[c.kind]) + (c.element === 'earth' ? ` · ${t({ en: 'earth tribe', zh: '土龙族' })}` : '');
    if (s < S.hunt)
      return { title, caption: t({ en: 'Their creation myth', zh: '它们的创世神话' }), body: myth(floors, name) };
    return { title, body: (s === S.present && present(floors, name)) || fate(floors, name) };
  }
  return null;
}

function LawNode({
  name,
  state,
  at,
  label,
  cracked,
  scored,
  nodeRef,
}: {
  name: string;
  state: string;
  at?: P;
  label: string;
  cracked?: boolean;
  scored?: boolean;
  nodeRef?: (el: SVGGElement | null) => void;
}) {
  return (
    <g
      ref={nodeRef}
      className={cls('wr-law', `law-${name}`, state, cracked && 'cracked', scored && 'scored')}
      transform={at ? `translate(${at[0]} ${at[1]})` : undefined}
      data-tip={name}
    >
      <circle className="halo" r="30" fill={`url(#wr-halo-${name})`} />
      <circle className="hit" r="17" />
      <circle className="ring" r="7" />
      <circle className="core" r="4.8" />
      {name === 'sets' && <path className="crack" d="M-6-8L-1-3L-4 1L2 3L4 8" pathLength={1} />}
      <text className="wr-lawname" y="25">
        {label}
      </text>
      <text className="wr-score" x="14" y="-9">
        0–0
      </text>
    </g>
  );
}

function Scene({ stop, language, refs }: { stop: number; language: Language; refs: RefObject<Refs> }) {
  const t = (l: L) => l[language];
  const law = lawStates(stop),
    floor = STOPS[stop].floor;
  const setsOnTop = stop === S.demotion || stop >= S.restoration;
  const early = stop === S.gods || stop === S.hunt;
  const set =
    <K extends keyof Refs>(key: K) =>
    (el: Refs[K]) => {
      refs.current[key] = el;
    };
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="wr-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#040b08" />
          <stop offset=".55" stopColor="#0c1b15" />
          <stop offset=".66" stopColor="#1b2f25" />
          <stop offset="1" stopColor="#0a1410" />
        </linearGradient>
        {ERA.map((c, i) => (
          <radialGradient key={i} id={`wr-tint-${i}`} cx="50%" cy="38%" r="72%">
            <stop offset="0" stopColor={c} stopOpacity=".46" />
            <stop offset=".6" stopColor={c} stopOpacity=".1" />
            <stop offset="1" stopColor={c} stopOpacity="0" />
          </radialGradient>
        ))}
        <radialGradient id="wr-vignette" cx="50%" cy="50%" r="75%">
          <stop offset=".6" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity=".55" />
        </radialGradient>
        <linearGradient id="wr-llama" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#25402f" />
          <stop offset="1" stopColor="#0c1610" />
        </linearGradient>
        <linearGradient id="wr-origo" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1f3a3a" />
          <stop offset="1" stopColor="#0b1515" />
        </linearGradient>
        <linearGradient id="wr-range" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4a5a50" />
          <stop offset=".5" stopColor="#1e2b24" />
          <stop offset="1" stopColor="#0c1510" />
        </linearGradient>
        {(
          [
            ['all', '#fff1c8'],
            ['number', '#f3dc98'],
            ['sets', '#d7e5ff'],
            ['nc', '#f3a47e'],
          ] as const
        ).map(([id, c]) => (
          <radialGradient key={id} id={`wr-halo-${id}`}>
            <stop offset="0" stopColor={c} stopOpacity=".6" />
            <stop offset="1" stopColor={c} stopOpacity="0" />
          </radialGradient>
        ))}
        {CREATURES.map((c) => (
          <radialGradient key={c.id} id={`wr-halo-${c.id}`}>
            <stop offset="0" stopColor={c.color} stopOpacity=".5" />
            <stop offset="1" stopColor={c.color} stopOpacity="0" />
          </radialGradient>
        ))}
      </defs>
      <rect width={W} height={H} fill="url(#wr-sky)" />
      {ERA.map((_, i) => (
        <rect
          key={i}
          width={W}
          height={H}
          fill={`url(#wr-tint-${i})`}
          className={cls('wr-tint', i === floor && 'on')}
        />
      ))}

      <g ref={set('world')}>
        <g className="wr-dust">
          {DUST.map(([x, y, r, d, o], i) => (
            <circle key={i} cx={x} cy={y} r={r} style={{ animationDuration: `${d}s`, animationDelay: `${-o}s` }} />
          ))}
        </g>

        {/* The hierarchy of laws. Ghost lines: laws that exist but wait to be discovered. */}
        <g className="wr-lines">
          <line
            ref={set('apexNumber')}
            className={cls('wr-line', law.number === 'ghost' ? 'ghost' : setsOnTop ? 'off' : 'lit')}
          />
          <line
            ref={set('apexSets')}
            className={cls('wr-line', law.sets === 'ghost' ? 'ghost' : law.sets === 'vacant' ? 'broken' : 'lit')}
          />
          <line ref={set('setsNumber')} className={cls('wr-line', setsOnTop ? 'lit' : 'off')} />
          <line
            x1={APEX[0]}
            y1={APEX[1]}
            x2={NC[0]}
            y2={NC[1]}
            className={cls('wr-line', law.nc === 'ghost' ? 'ghost' : 'lit')}
          />
        </g>
        {MINOR.map((m, i) => (
          <g
            key={i}
            className={cls('wr-minor', stop >= m.at ? 'lit' : 'ghost')}
            transform={`translate(${m.p[0]} ${m.p[1]})`}
            data-tip={`minor:${i}`}
          >
            <circle className="hit" r="11" />
            <circle className="ring" r="3.6" />
            <circle className="core" r="2.2" />
          </g>
        ))}

        {/* The land: Llama, the Limitrest Range, Origo. Rough shapes, not a map. */}
        <g className="wr-land">
          <path className="llama" d="M0 640L0 406C70 398 140 412 210 402C280 393 340 404 384 401L384 640Z" />
          <path className="origo" d="M612 640L612 402C680 410 740 394 810 402C880 410 940 396 1000 404L1000 640Z" />
          <path
            className="contour"
            d="M0 470C120 462 260 478 380 468M612 472C740 464 860 480 1000 468M0 542C140 534 260 550 380 540M612 550C750 540 880 554 1000 544M0 600C150 594 260 606 380 598M612 604C760 596 880 610 1000 600"
          />
          <path
            className="range"
            d="M372 640L372 404L392 384L408 390L424 370L440 392L456 362L476 372L505 280L534 344L552 328L572 388L588 370L602 384L622 404L622 640Z"
          />
          <path
            className="snow"
            d="M492 304L505 280L518 304L511 298L505 306L499 298ZM449 372L456 362L463 371L457 368ZM545 338L552 328L559 337L553 334Z"
          />
          <circle className="hit" cx="505" cy="294" r="18" data-tip="peak" />
        </g>

        <g className={cls('wr-realms', early && 'kingdoms', stop >= S.totems && 'empires')}>
          <path
            className="empire west"
            data-tip="empire"
            d="M36 462C40 432 118 426 156 452C196 480 214 552 196 600C178 636 70 638 46 604C26 572 32 500 36 462Z"
          />
          <path
            className="empire east"
            data-tip="empire"
            d="M214 438C240 416 300 420 340 468C372 510 370 598 322 626C276 646 222 630 214 590C206 540 200 470 214 438Z"
          />
          {ELITES.map((i) => (
            <g key={i} className="kingdom" transform={`translate(${TOWNS[i][0]} ${TOWNS[i][1]})`} data-tip="kingdom">
              <ellipse rx="32" ry="19" />
              <path className="crown" d="M-6-22L-6-28L-3-25L0-30L3-25L6-28L6-22Z" />
            </g>
          ))}
        </g>

        {/* Threads from the first gods down to the kingdoms that form around them. */}
        <g className="wr-threads">
          <line ref={set('threadNumber')} className={cls('wr-thread', early && 'on')} />
          <line
            x1={NC[0]}
            y1={NC[1]}
            x2={TOWNS[KINGDOM_OF.nc][0]}
            y2={TOWNS[KINGDOM_OF.nc][1] - 20}
            className={cls('wr-thread', early && 'on')}
          />
          <line
            x1={NC[0]}
            y1={NC[1]}
            x2={TOWNS[KINGDOM_OF.dynasty][0]}
            y2={TOWNS[KINGDOM_OF.dynasty][1] - 26}
            className={cls('wr-thread dynasty', stop >= S.gods && 'on')}
          />
        </g>

        <LawNode name="all" state={law.all} at={APEX} label={t(LAW.all)} scored />
        <LawNode name="nc" state={law.nc} at={NC} label={t(LAW.nc)} />
        <LawNode name="number" state={law.number} label={t(LAW.number)} nodeRef={set('number')} />
        <LawNode
          name="sets"
          state={law.sets}
          label={t(LAW.sets)}
          cracked={law.setsCracked}
          scored
          nodeRef={set('sets')}
        />

        <g
          className={cls(
            'wr-towns',
            stop >= S.axiom && 'axiom',
            stop >= S.totems && 'totems',
            stop === S.vacancy && 'generations',
            stop === S.present && 'present',
          )}
        >
          {TOWNS.map((p, i) => (
            <g
              key={i}
              className="wr-town"
              data-tip="town"
              style={{
                ['--d' as string]: `${(Math.hypot(p[0] - AXIOM_ORIGIN[0], p[1] - AXIOM_ORIGIN[1]) / 320).toFixed(2)}s`,
                ['--g' as string]: `${(-i * 0.43).toFixed(2)}s`,
              }}
            >
              <circle className="hit" cx={p[0]} cy={p[1]} r="20" />
              {DOTS[i].map((d, j) => (
                <g
                  key={j}
                  className={cls('wr-mortal', d.tint && 'tint')}
                  transform={`translate(${d.x.toFixed(1)} ${d.y.toFixed(1)})`}
                  style={d.tint ? { ['--c' as string]: d.tint } : undefined}
                >
                  <circle className="glow" r="5" />
                  <rect x="-1.7" y="-1.7" width="3.4" height="3.4" />
                  <circle className="ring" r="3.7" />
                </g>
              ))}
            </g>
          ))}
          {ORIGO_TOWNS.map((p, i) => (
            <g key={`o${i}`} className="wr-town origo" data-tip="town">
              <circle className="hit" cx={p[0]} cy={p[1]} r="20" />
              {ORIGO_DOTS[i].map((d, j) => (
                <g
                  key={j}
                  className="wr-mortal tint"
                  transform={`translate(${d.x.toFixed(1)} ${d.y.toFixed(1)})`}
                  style={{ ['--c' as string]: d.tint ?? '#fff' }}
                >
                  <circle className="glow" r="5" />
                  <rect x="-1.7" y="-1.7" width="3.4" height="3.4" />
                  <circle className="ring" r="3.7" />
                </g>
              ))}
            </g>
          ))}
          {ELITES.map((i, k) => (
            <g
              key={`e${i}`}
              className="wr-elite"
              transform={`translate(${TOWNS[i][0]} ${TOWNS[i][1]})`}
              data-tip="elite"
              style={{ ['--c' as string]: k ? ELEMENT_COLOR.plasma : ELEMENT_COLOR.earth }}
            >
              <circle className="glow" r="13" />
              <circle className="ring" r="6" />
              <circle className="core" r="3.4" />
            </g>
          ))}
          <g
            className={cls('wr-dynasty', stop >= S.gods && 'on')}
            transform={`translate(${TOWNS[KINGDOM_OF.dynasty][0]} ${TOWNS[KINGDOM_OF.dynasty][1] - 22})`}
            data-tip="dynasty"
          >
            <circle className="hit" r="10" />
            <path d="M-6 4L-6-2L0-7L6-2L6 4Z" />
          </g>
        </g>

        <g className="wr-creatures">
          {CREATURES.map((c) => {
            const [x, y] = creatureAt(c, stop);
            return (
              <g
                key={c.id}
                className={cls('wr-creature', `k-${c.kind}`, creatureState(c, stop))}
                style={{ transform: `translate(${x}px, ${y}px)`, color: c.color }}
                data-tip={`creature:${c.id}`}
              >
                <circle className="halo" r="22" fill={`url(#wr-halo-${c.id})`} />
                <circle className="hit" r="16" />
                <g className="glyph">
                  <Glyph kind={c.kind} />
                </g>
              </g>
            );
          })}
        </g>

        <g
          className={cls('wr-ilar', stop >= S.paradox && 'on')}
          transform={`translate(${ILAR[0]} ${ILAR[1]})`}
          data-tip="ilar"
        >
          <path className="tunnel" d="M-34 6C-18-4 18-4 34 6" />
          <circle className="hit" r="12" />
          <path className="gem" d="M0-4.5L3.5 0L0 4.5L-3.5 0Z" />
        </g>

        <g className="wr-labels">
          <text x="196" y="630" data-tip="llama">
            {t(REGION.llama)}
          </text>
          <text x="497" y="630" data-tip="range">
            {t(REGION.range)}
          </text>
          <text x="806" y="630" data-tip="origo">
            {t(REGION.origo)}
          </text>
          <text className="peak" x="505" y="268" data-tip="peak">
            {t(REGION.peak)}
          </text>
        </g>
      </g>
      <rect width={W} height={H} fill="url(#wr-vignette)" pointerEvents="none" />
    </svg>
  );
}

// Runs of short "Name: text" paragraphs (the creation myths) become a set of voices.
function FloorBody({ body }: { body: string }) {
  const blocks = body
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean);
  const voice = (b: string) => b.match(/^([^\s:：*#|>\d-][^:：\n]{0,14})[:：]\s*([\s\S]+)$/);
  const out: ReactElement[] = [];
  for (let i = 0; i < blocks.length;) {
    let j = i;
    while (j < blocks.length && voice(blocks[j])) j++;
    if (j - i >= 3) {
      out.push(
        <div className="wr-voices" key={i}>
          {blocks.slice(i, j).map((b, k) => {
            const [, who, said] = voice(b)!;
            return (
              <blockquote key={k}>
                <cite>{who}</cite>
                <p>{said}</p>
              </blockquote>
            );
          })}
        </div>,
      );
      i = j;
    } else {
      out.push(
        <Markdown key={i} remarkPlugins={[remarkGfm]}>
          {blocks[i]}
        </Markdown>,
      );
      i++;
    }
  }
  return <div className="wr-body">{out}</div>;
}
function FeudBody({ body, act }: { body: string; act: number }) {
  const { intro, acts } = splitActs(body);
  return (
    <div className="wr-body">
      <Markdown remarkPlugins={[remarkGfm]}>{intro}</Markdown>
      <ol className="wr-acts">
        {acts.map((a, i) => (
          <li key={i} className={cls(i === act && 'on', i < act && 'past')}>
            {i === act ? <Markdown remarkPlugins={[remarkGfm]}>{a}</Markdown> : <span>{actName(a)}</span>}
          </li>
        ))}
      </ol>
    </div>
  );
}

export function WorldRewound({
  language,
  article,
  articles,
}: {
  language: Language;
  article: Article;
  articles: Article[];
}) {
  const t = (l: L) => l[language];
  const { preface, floors } = useMemo(() => parseTimeline(article.body), [article.body]);
  const [stop, setStop] = useState(0);
  const [move, setMove] = useState<Move>('fwd');
  const [playing, setPlaying] = useState(false);
  const [rewinding, setRewinding] = useState(false);
  const [drag, setDrag] = useState<number | null>(null);
  const [selected, setSelected] = useState('town');
  const [touch] = useState(() => typeof matchMedia !== 'undefined' && matchMedia('(hover: none)').matches);
  const refs = useRef<Refs>({
    world: null,
    number: null,
    sets: null,
    apexNumber: null,
    apexSets: null,
    setsNumber: null,
    threadNumber: null,
  });
  const engine = useRef<Engine | null>(null);
  const view = useRef<HTMLDivElement | null>(null);
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const track = useRef<HTMLDivElement | null>(null);
  const fullText = useRef<HTMLDetailsElement | null>(null);
  const stopRef = useRef(0);
  const rewindTimer = useRef(0);

  useEffect(() => {
    const e = createEngine(canvas.current!, refs.current);
    engine.current = e;
    const resize = new ResizeObserver(([entry]) => e.resize(entry.contentRect.width, entry.contentRect.height));
    const seen = new IntersectionObserver(([entry]) => e.setVisible(entry.isIntersecting));
    resize.observe(view.current!);
    seen.observe(view.current!);
    e.open();
    return () => {
      resize.disconnect();
      seen.disconnect();
      e.destroy();
      engine.current = null;
      window.clearTimeout(rewindTimer.current);
    };
  }, []);

  const go = (target: number, how?: Move, replay = false) => {
    const prev = stopRef.current,
      next = Math.max(0, Math.min(LAST, target));
    if (next === prev && !replay) return;
    const m: Move = how ?? (next === prev + 1 ? 'fwd' : next === prev - 1 ? 'back' : 'jump');
    stopRef.current = next;
    setSelected((key) =>
      (['kingdom', 'dynasty'].includes(key) && next < S.gods) ||
      (['elite', 'empire'].includes(key) && next < S.totems) ||
      (key === 'ilar' && next < S.paradox)
        ? 'town'
        : key,
    );
    setStop(next);
    setMove(replay ? 'fwd' : m);
    engine.current?.setStop(next, m, prev, replay);
    window.clearTimeout(rewindTimer.current);
    setRewinding(m === 'back');
    if (m === 'back') rewindTimer.current = window.setTimeout(() => setRewinding(false), 1400);
  };
  const goRef = useRef(go);
  goRef.current = go;

  // Play mode lingers on each moment long enough to watch it, then moves on.
  useEffect(() => {
    if (!playing) return;
    if (stop >= LAST) {
      setPlaying(false);
      return;
    }
    const id = window.setTimeout(() => goRef.current(stopRef.current + 1, 'fwd'), dwell(stop));
    return () => window.clearTimeout(id);
  }, [playing, stop]);
  const togglePlay = () => {
    if (playing) {
      setPlaying(false);
      return;
    }
    if (stopRef.current === LAST) go(0, 'jump', true);
    setPlaying(true);
  };
  const step = (d: number) => {
    setPlaying(false);
    go(stopRef.current + d);
  };

  const updateTrack = (clientX: number) => {
    const r = track.current!.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((clientX - r.left) / r.width) * 100));
    setDrag(x);
    goRef.current(nearest(x));
  };
  const onTrackDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!e.isPrimary || e.button !== 0) return;
    e.preventDefault();
    e.currentTarget.focus();
    e.currentTarget.setPointerCapture(e.pointerId);
    setPlaying(false);
    updateTrack(e.clientX);
  };
  const onTrackKey = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    const s = stopRef.current,
      floor = STOPS[s].floor;
    const target =
      e.key === 'ArrowRight' || e.key === 'ArrowUp'
        ? s + 1
        : e.key === 'ArrowLeft' || e.key === 'ArrowDown'
          ? s - 1
          : e.key === 'Home'
            ? 0
            : e.key === 'End'
              ? LAST
              : e.key === 'PageUp'
                ? STOPS.findIndex((x) => x.floor === Math.min(6, floor + 1) && !x.act)
                : e.key === 'PageDown'
                  ? STOPS.findIndex((x) => x.floor === Math.max(0, STOPS[s].act ? floor : floor - 1) && !x.act)
                  : -1;
    if (target < 0) return;
    e.preventDefault();
    setPlaying(false);
    go(target);
  };

  // Selection survives pointer movement and stays readable outside the artwork.
  const inspect = (e: ReactPointerEvent<HTMLDivElement>) => {
    const el = (e.target as Element).closest('[data-tip]');
    if (el) setSelected(el.getAttribute('data-tip')!);
  };

  const current = STOPS[stop],
    f = floors[current.floor],
    isFeud = current.floor === FEUD && current.act !== undefined;
  const actLabel = isFeud
    ? language === 'zh'
      ? T.act.zh.replace('{n}', ACT_NUMERALS[current.act!])
      : T.act.en.replace('{n}', String(current.act! + 1))
    : '';
  const valueText = f ? `${f.numeral} · ${f.title}${isFeud ? ` · ${actLabel}` : ''}` : '';
  const shownTip = tipFor(selected, stop, floors, language);
  const inspectKeys = [
    ...new Set([
      'town',
      'all',
      'number',
      'sets',
      'nc',
      'llama',
      'origo',
      'range',
      'peak',
      'creature:dragon-earth',
      'creature:unicorn-1',
      'creature:phoenix',
      'creature:kitsune-1',
      'creature:troll-1',
      ...(stop >= S.gods ? ['kingdom', 'dynasty'] : []),
      ...(stop >= S.totems ? ['elite', 'empire'] : []),
      ...(stop >= S.paradox ? ['ilar'] : []),
      selected,
    ]),
  ];
  const momentLabel = (i: number) => {
    const moment = STOPS[i],
      floor = floors[moment.floor];
    const name = moment.act === undefined ? floor?.title : actName(splitActs(floor?.body ?? '').acts[moment.act] ?? '');
    return `${floor?.numeral ?? ''} · ${name}`;
  };
  const related = relatedSlugs(selected).flatMap((slug) => articles.filter((entry) => entry.slug === slug));
  const thumb = drag ?? pct(stop);
  const playLabel = playing ? t(T.pause) : stop === LAST ? t(T.again) : t(T.play);

  return (
    <div
      className={cls('wr', `wr-${move}`, rewinding && 'rewinding')}
      data-stop={stop}
      style={{ ['--era' as string]: ERA[current.floor] ?? ERA[0] }}
    >
      <header className="wr-head">
        <small>{t(T.kicker)}</small>
        <h1>{t(T.title)}</h1>
        <p>{t(T.lede)}</p>
      </header>

      <div className="wr-stage">
        <div className="wr-main">
          <div className="wr-moment">
            <label htmlFor="wr-moment">
              {t(T.slider)}
              <span>
                {String(stop + 1).padStart(2, '0')} / {STOPS.length}
              </span>
            </label>
            <select
              id="wr-moment"
              value={stop}
              onChange={(e) => {
                setPlaying(false);
                go(Number(e.target.value));
              }}
            >
              {STOPS.map((_, i) => (
                <option key={i} value={i}>
                  {momentLabel(i)}
                </option>
              ))}
            </select>
          </div>
          <div className="wr-view" ref={view} data-stop={stop} onPointerDown={inspect}>
            <Scene stop={stop} language={language} refs={refs} />
            <canvas ref={canvas} aria-hidden="true" />
            {rewinding && (
              <div className="wr-chip">
                <Rewind size={13} />
                {t(T.rewinding)}
              </div>
            )}
          </div>
          <div className="wr-time">
            <button
              className="wr-play"
              aria-pressed={playing}
              onClick={togglePlay}
              aria-label={playLabel}
              title={playLabel}
            >
              {playing ? <Pause size={18} /> : stop === LAST ? <RotateCcw size={18} /> : <Play size={18} />}
            </button>
            <div
              ref={track}
              className={cls('wr-track', drag !== null && 'dragging')}
              role="slider"
              tabIndex={0}
              aria-label={t(T.slider)}
              aria-valuemin={0}
              aria-valuemax={LAST}
              aria-valuenow={stop}
              aria-valuetext={valueText}
              onPointerDown={onTrackDown}
              onPointerMove={(e) => {
                if (e.currentTarget.hasPointerCapture(e.pointerId)) updateTrack(e.clientX);
              }}
              onPointerUp={(e) => {
                if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
                setDrag(null);
              }}
              onPointerCancel={() => setDrag(null)}
              onLostPointerCapture={() => setDrag(null)}
              onKeyDown={onTrackKey}
            >
              <div className="wr-rail">
                <i style={{ width: `${thumb}%` }} />
              </div>
              {STOPS.map((s, i) => (
                <span
                  key={i}
                  className={cls('wr-tick', s.act ? 'minor' : 'major', i === stop && 'on', i < stop && 'past')}
                  style={{ left: `${pct(i)}%`, ['--tick' as string]: ERA[s.floor] }}
                >
                  {!s.act && <b>{floors[s.floor]?.numeral}</b>}
                </span>
              ))}
              <span className="wr-thumb" style={{ left: `${thumb}%` }} />
            </div>
          </div>
          <p className="wr-caption">
            <span>{t(touch ? T.hintTouch : T.hint)}</span>
            <span>{t(T.adaptation)}</span>
          </p>
          <section className="wr-inspect" aria-label={t(T.inspect)}>
            <label htmlFor="wr-inspect">{t(T.inspect)}</label>
            <select id="wr-inspect" value={selected} onChange={(e) => setSelected(e.target.value)}>
              {inspectKeys.map((key) => (
                <option key={key} value={key}>
                  {tipFor(key, stop, floors, language)?.title}
                </option>
              ))}
            </select>
            {shownTip && (
              <div className="wr-inspect-body">
                {shownTip.caption && <small>{shownTip.caption}</small>}
                <p>{shownTip.body}</p>
              </div>
            )}
            <nav className="wr-related" aria-label={t(T.readMore)}>
              <small>{t(T.readMore)}</small>
              {related.map((entry) => (
                <a
                  key={entry.slug}
                  href={`#${entry.slug}`}
                  onClick={
                    entry.slug === 'timeline'
                      ? (e) => {
                          e.preventDefault();
                          if (fullText.current) {
                            fullText.current.open = true;
                            fullText.current.querySelector('summary')?.focus();
                            fullText.current.scrollIntoView({ block: 'start' });
                          }
                        }
                      : undefined
                  }
                >
                  {entry.slug === 'timeline' ? t(T.fullText) : entry.title}
                  <span aria-hidden="true"> ↗</span>
                </a>
              ))}
            </nav>
          </section>
        </div>

        <aside className="wr-card">
          <header>
            <span className="wr-numeral">{f?.numeral}</span>
            {isFeud && <small>{actLabel}</small>}
          </header>
          <h2 aria-live="polite" aria-atomic="true">
            {isFeud ? momentLabel(stop).split(' · ').slice(1).join(' · ') : f?.title}
          </h2>
          <div className="wr-card-body" key={stop}>
            {f && (isFeud ? <FeudBody body={f.body} act={current.act!} /> : <FloorBody body={f.body} />)}
          </div>
          <footer>
            <button className="wr-step" onClick={() => step(-1)} disabled={stop === 0}>
              <ChevronLeft size={16} />
              {t(T.earlier)}
            </button>
            <button className="wr-step" onClick={() => step(1)} disabled={stop === LAST}>
              {t(T.later)}
              <ChevronRight size={16} />
            </button>
          </footer>
        </aside>
      </div>

      <details className="wr-full" ref={fullText}>
        <summary>{t(T.fullText)}</summary>
        {floors.map((fl, i) => (
          <section key={i}>
            <h3>
              <span>{fl.numeral}</span>
              {fl.title}
            </h3>
            <FloorBody body={fl.body} />
          </section>
        ))}
      </details>
      {preface && (
        <div className="wr-note">
          <Markdown remarkPlugins={[remarkGfm]}>{preface}</Markdown>
        </div>
      )}
    </div>
  );
}
