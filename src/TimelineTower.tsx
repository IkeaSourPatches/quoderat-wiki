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
        return <blockquote key={k}><cite>{who}</cite><p>{said}</p></blockquote>;
      })}</div>);
      i = j;
    } else {
      out.push(<Markdown key={i} remarkPlugins={[remarkGfm]}>{blocks[i]}</Markdown>);
      i++;
    }
  }
  return <div className="tt-body">{out}</div>;
}

export function TimelineTower({ language, article }: { language: Language; article: Article }) {
  const text = (en: string, zh: string) => language === 'zh' ? zh : en;
  const { preface, intro, floors } = useMemo(() => parse(article.body), [article.body]);
  const refs = useRef<(HTMLElement | null)[]>([]);
  const entrance = useRef<HTMLElement | null>(null);
  const [current, setCurrent] = useState(0);
  const motion = () => matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';

  // Open the page at the entrance, at the bottom of the tower.
  useEffect(() => {
    const toEntrance = () => entrance.current?.scrollIntoView({ block: 'center' });
    toEntrance();
    // Web fonts change the tower's height, so settle again once they load.
    document.fonts?.ready.then(toEntrance);
  }, [article.slug]);

  // Light the floor nearest the middle of the screen.
  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      for (const e of entries) if (e.isIntersecting) setCurrent(Number((e.target as HTMLElement).dataset.floor));
    }, { rootMargin: '-45% 0px -45% 0px' });
    refs.current.forEach(el => el && observer.observe(el));
    return () => observer.disconnect();
  }, [floors.length]);

  const go = (i: number) => refs.current[i]?.scrollIntoView({ block: 'center', behavior: motion() });
  const n = Math.max(floors.length - 1, 1);

  return <div className="tt">
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

    <div className="tt-tower">
      <div className="tt-roof" aria-hidden="true">{text('Still being built', '仍在建造')}</div>
      {floors.map((f, i) => ({ f, i })).reverse().map(({ f, i }) =>
        <section key={i} data-floor={i} ref={el => { refs.current[i] = el; }}
          className={`tt-floor${i === current ? ' on' : ''}${i === floors.length - 1 ? ' top' : ''}`}
          style={{ ['--w' as string]: `${64 + (36 * i) / n}%` }} aria-labelledby={`tt-floor-${i}`}>
          <div className="tt-numeral" aria-hidden="true">{f.numeral}</div>
          <div className="tt-content">
            <h2 id={`tt-floor-${i}`}><span className="tt-sr">{text(`Floor ${f.numeral}: `, `第 ${f.numeral} 层：`)}</span>{f.title}</h2>
            <FloorBody body={f.body} />
          </div>
        </section>)}
      <section className="tt-entrance" ref={entrance}>
        <div className="tt-door" aria-hidden="true" />
        <div>
          <h2>{text('The entrance', '入口')}</h2>
          {intro && <p>{intro}</p>}
          <button onClick={() => go(0)}>{text('Start climbing', '开始攀登')}</button>
        </div>
      </section>
    </div>
    {preface && <div className="tt-note"><Markdown remarkPlugins={[remarkGfm]}>{preface}</Markdown></div>}
  </div>;
}
