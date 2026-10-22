import { useEffect, useMemo, useRef, useState, type ReactElement } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Article } from './api';
import type { Language } from './i18n';

// The Tower of History, drawn as the timeline describes it: you enter at the
// bottom in the oldest age and climb toward the present. The tower widens as
// it rises, so the page opens at the entrance and is read upward.
// All text comes from the timeline article; this file only arranges it.

type Floor = { numeral: string; title: string; body: string };

const zhNumerals: Record<string, string> = { 零: '0', 一: 'I', 二: 'II', 三: 'III', 四: 'IV', 五: 'V', 六: 'VI', 七: 'VII', 八: 'VIII', 九: 'IX', 十: 'X' };

function parse(body: string) {
  const parts = body.split(/^### /m);
  const preface = parts.shift()?.trim() ?? '';
  let intro = '';
  const floors: Floor[] = [];
  for (const part of parts) {
    const [heading, ...rest] = part.split('\n');
    const text = rest.join('\n').trim();
    const en = heading.match(/^Floor ([0IVXL]+):\s*(.+)$/);
    const zh = heading.match(/^第(.)层：\s*(.+)$/);
    if (en) floors.push({ numeral: en[1], title: en[2].trim(), body: text });
    else if (zh) floors.push({ numeral: zhNumerals[zh[1]] ?? zh[1], title: zh[2].trim(), body: text });
    else if (text && !intro) intro = text;
  }
  return { preface, intro, floors };
}

// Runs of short "Name: text" paragraphs (the creation myths) become a wall of inscriptions.
function FloorBody({ body }: { body: string }) {
  const blocks = body.split(/\n\s*\n/).map(b => b.trim()).filter(Boolean);
  const voice = (b: string) => b.match(/^([^\s:：*#|>\d-][^:：\n]{0,14})[:：]\s*([\s\S]+)$/);
  const out: ReactElement[] = [];
  for (let i = 0; i < blocks.length;) {
    let j = i;
    while (j < blocks.length && voice(blocks[j])) j++;
    if (j - i >= 3) {
      out.push(<div className="tt-voices" key={i}>{blocks.slice(i, j).map((b, k) => {
        const [, who, said] = voice(b)!;
        return <blockquote key={k} style={{ ['--i' as string]: k }}><cite>{who}</cite><p>{said}</p></blockquote>;
      })}</div>);
      i = j;
    } else {
      out.push(<Markdown key={i} remarkPlugins={[remarkGfm]}>{blocks[i]}</Markdown>);
      i++;
    }
  }
  return <div className="tt-body">{out}</div>;
}

// One mood per floor, in order from the oldest age. Extra floors reuse the last.
const eras = ['#2f7a6e', '#a8853a', '#4f68a3', '#9a3a30', '#4f9a5c', '#7a4f9e', '#b8a167'];

// Decorative motion drawn behind each floor's text, keyed by floor position.
function FloorArt({ index }: { index: number }) {
  const art = [
    // 0 Creation: rings condensing toward a point.
    <g key="0">{[18, 30, 42, 54].map((r, i) => <circle key={r} cx="60" cy="60" r={r} className="tt-art-ring" style={{ ['--i' as string]: i }} />)}<circle cx="60" cy="60" r="4" className="tt-art-core" /></g>,
    // I The Axiom: the bracelet, turning.
    <g key="1" className="tt-art-spin"><circle cx="60" cy="60" r="40" className="tt-art-line" strokeDasharray="4 7" /><circle cx="60" cy="60" r="30" className="tt-art-line" /><circle cx="60" cy="20" r="4" className="tt-art-core" /></g>,
    // II The First Gods: a constellation lighting one star at a time.
    <g key="2">{[[20, 30], [48, 18], [70, 40], [96, 26], [36, 70], [84, 82], [58, 98]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="3" className="tt-art-star" style={{ ['--i' as string]: i }} />)}<path d="M20 30L48 18L70 40L96 26M70 40L36 70L58 98L84 82L70 40" className="tt-art-line faint" /></g>,
    // III The Great Hunt: claw marks and rising embers.
    <g key="3"><path d="M30 20L60 100M48 16L78 96M66 14L96 92" className="tt-art-claw" />{[0, 1, 2, 3, 4, 5].map(i => <circle key={i} cx={20 + i * 16} cy="110" r="2.5" className="tt-art-ember" style={{ ['--i' as string]: i }} />)}</g>,
    // IV The First Totems: sparks handed out across the land.
    <g key="4">{[[24, 40], [60, 24], [96, 44], [40, 88], [80, 92], [60, 62]].map(([x, y], i) => <path key={i} d={`M${x} ${y - 7}L${x + 5} ${y}L${x} ${y + 7}L${x - 5} ${y}Z`} className="tt-art-spark" style={{ ['--i' as string]: i }} />)}</g>,
    // V The Feud: two laws pushing against each other.
    <g key="5"><circle cx="44" cy="60" r="30" className="tt-art-line tt-art-push-a" /><circle cx="76" cy="60" r="30" className="tt-art-line tt-art-push-b" /><text x="44" y="68" className="tt-art-glyph tt-art-push-a">ℕ</text><text x="76" y="68" className="tt-art-glyph tt-art-push-b">∈</text></g>,
    // VI The Present: scaffolding and a cursor, still being written.
    <g key="6"><path d="M20 100V30M50 100V20M80 100V30M20 40H80M20 70H80M20 40L50 70L80 40" className="tt-art-line faint" /><rect x="92" y="78" width="10" height="20" className="tt-art-cursor" /></g>,
  ];
  const g = art[index];
  return g ? <svg className="tt-art" viewBox="0 0 120 120" aria-hidden="true">{g}</svg> : null;
}

export function TimelineTower({ language, article }: { language: Language; article: Article }) {
  const text = (en: string, zh: string) => language === 'zh' ? zh : en;
  const { preface, intro, floors } = useMemo(() => parse(article.body), [article.body]);
  const refs = useRef<(HTMLElement | null)[]>([]);
  const root = useRef<HTMLDivElement | null>(null);
  const tower = useRef<HTMLDivElement | null>(null);
  const entrance = useRef<HTMLElement | null>(null);
  const riding = useRef(0);
  const [current, setCurrent] = useState(0);
  const [seen, setSeen] = useState<Set<number>>(() => new Set());
  const [ride, setRide] = useState(false);
  const still = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Open the page at the entrance, at the bottom of the tower.
  useEffect(() => {
    const toEntrance = () => entrance.current?.scrollIntoView({ block: 'center' });
    toEntrance();
    // Web fonts change the tower's height, so settle again once they load.
    document.fonts?.ready.then(toEntrance);
  }, [article.slug]);

  // Light the floor at the middle of the screen; reveal each floor the first time it arrives.
  useEffect(() => {
    const middle = new IntersectionObserver(entries => {
      for (const e of entries) if (e.isIntersecting) setCurrent(Number((e.target as HTMLElement).dataset.floor));
    }, { rootMargin: '-45% 0px -45% 0px' });
    const reveal = new IntersectionObserver(entries => {
      for (const e of entries) if (e.isIntersecting) {
        const i = Number((e.target as HTMLElement).dataset.floor);
        setSeen(prev => prev.has(i) ? prev : new Set(prev).add(i));
      }
    }, { rootMargin: '0px 0px -15% 0px' });
    refs.current.forEach(el => { if (el) { middle.observe(el); reveal.observe(el); } });
    return () => { middle.disconnect(); reveal.disconnect(); };
  }, [floors.length]);

  // The lift shaft fills as you climb: 0 at the entrance, 1 at the roof.
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const t = tower.current, r = root.current;
      if (!t || !r) return;
      const box = t.getBoundingClientRect();
      const climbed = (innerHeight / 2 - box.bottom) / -box.height;
      r.style.setProperty('--climb', String(Math.min(1, Math.max(0, climbed))));
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', onScroll);
    return () => { removeEventListener('scroll', onScroll); removeEventListener('resize', onScroll); cancelAnimationFrame(frame); };
  }, []);

  const go = (i: number) => refs.current[i]?.scrollIntoView({ block: 'center', behavior: still() ? 'auto' : 'smooth' });

  // Ride the lift: climb floor by floor to the present. Any wheel, touch or key stops it.
  const stop = () => { cancelAnimationFrame(riding.current); riding.current = 0; setRide(false); };
  const climb = () => {
    if (still()) { go(floors.length - 1); return; }
    setRide(true);
    const stops = refs.current.slice(0, floors.length).map(el => el ? el.getBoundingClientRect().top + scrollY + el.offsetHeight / 2 - innerHeight / 2 : 0);
    let leg = current, from = scrollY, start = performance.now();
    const travel = 1100, pause = 900;
    const step = (now: number) => {
      const elapsed = now - start, to = stops[leg];
      const t = Math.min(1, elapsed / travel);
      const ease = t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      scrollTo(0, from + (to - from) * ease);
      if (elapsed >= travel + pause) {
        leg++; if (leg >= stops.length) { stop(); return; }
        from = scrollY; start = now;
      }
      riding.current = requestAnimationFrame(step);
    };
    riding.current = requestAnimationFrame(step);
  };
  useEffect(() => {
    if (!ride) return;
    const cancel = () => stop();
    const opts = { passive: true } as AddEventListenerOptions;
    addEventListener('wheel', cancel, opts); addEventListener('touchstart', cancel, opts); addEventListener('keydown', cancel);
    return () => { removeEventListener('wheel', cancel); removeEventListener('touchstart', cancel); removeEventListener('keydown', cancel); };
  }, [ride]);
  useEffect(() => () => cancelAnimationFrame(riding.current), []);

  const n = Math.max(floors.length - 1, 1);
  const era = eras[Math.min(current, eras.length - 1)];

  return <div className="tt" ref={root} style={{ ['--era' as string]: era }}>
    <div className="tt-motes" aria-hidden="true">{Array.from({ length: 28 }, (_, i) => <span key={i} style={{ ['--x' as string]: `${(i * 37) % 100}%`, ['--d' as string]: `${9 + (i * 7) % 11}s`, ['--delay' as string]: `${-((i * 13) % 17)}s`, ['--s' as string]: `${2 + (i % 3)}px` }} />)}</div>

    <header className="tt-head">
      <h1>{article.title}</h1>
      <p>{text('Read it from the bottom up. The oldest age is at the entrance; the present is at the top.', '从下往上阅读。最古老的时代在入口处，当下在塔顶。')}</p>
    </header>

    <nav className="tt-rail" aria-label={text('Floors', '楼层')}>
      {floors.map((f, i) => ({ f, i })).reverse().map(({ f, i }) =>
        <button key={i} className={i === current ? 'on' : ''} aria-current={i === current ? 'step' : undefined} onClick={() => go(i)}>
          <span>{f.numeral}</span><small>{f.title}</small>
        </button>)}
    </nav>

    <div className="tt-tower" ref={tower}>
      <div className="tt-shaft" aria-hidden="true"><i /></div>
      <div className="tt-roof" aria-hidden="true">{text('Still being built', '仍在建造')}</div>
      {floors.map((f, i) => ({ f, i })).reverse().map(({ f, i }) =>
        <section key={i} data-floor={i} ref={el => { refs.current[i] = el; }}
          className={`tt-floor${i === current ? ' on' : ''}${seen.has(i) ? ' seen' : ''}${i === floors.length - 1 ? ' top' : ''}`}
          style={{ ['--w' as string]: `${64 + (36 * i) / n}%`, ['--era-floor' as string]: eras[Math.min(i, eras.length - 1)] }} aria-labelledby={`tt-floor-${i}`}>
          <FloorArt index={i} />
          <div className="tt-numeral" aria-hidden="true">{f.numeral}</div>
          <div className="tt-content">
            <h2 id={`tt-floor-${i}`}><span className="tt-sr">{text(`Floor ${f.numeral}: `, `第 ${f.numeral} 层：`)}</span>{f.title}</h2>
            <FloorBody body={f.body} />
          </div>
        </section>)}
      <section className="tt-entrance" ref={entrance}>
        <div className={`tt-door${ride ? ' open' : ''}`} aria-hidden="true"><span /><span /></div>
        <div>
          <h2>{text('The entrance', '入口')}</h2>
          {intro && <p>{intro}</p>}
          <div className="tt-entrance-actions">
            <button onClick={ride ? stop : climb}>{ride ? text('Stop the lift', '停下电梯') : text('Ride to the present', '乘电梯直达当下')}</button>
            <button className="quiet" onClick={() => go(0)}>{text('Climb on foot', '步行攀登')}</button>
          </div>
        </div>
      </section>
    </div>
    {preface && <div className="tt-note"><Markdown remarkPlugins={[remarkGfm]}>{preface}</Markdown></div>}
    {ride && <button className="tt-stop" onClick={stop}>{text('Stop the lift', '停下电梯')}</button>}
  </div>;
}
