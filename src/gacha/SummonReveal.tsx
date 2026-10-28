import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type MouseEvent } from 'react';
import type { Language } from '../i18n';
import { MAX_UPGRADE, familyById, tierById, upgradeLevel, type HolderRating, type Text, type Totem } from './pool';
import { figurePaths } from './construction';
import { createRevealEngine, type RevealEngine, type RevealEvent } from './revealCanvas';
import { PIGMENTS, figureFor, revealPlan, stageInk, type Grade } from './revealPlan';
import { cardBackArt, compassArt, holderArt, totemArt } from './art';
import { Sigil } from './Sigil';
import './reveal.css';

// The summon reveal. Rewards are already saved before this opens; it only decides how they are shown.
//   construct – the world draws a ruler-and-compass construction that keeps going while the batch is good
//   cards     – the figure bursts and deals the cards face down; ordinary cards turn over by themselves,
//               while SS, 4★, 5★ and first-time holders wait, glowing, for their own splash
//   summary   – everything face up, with Pull again and Done
// Clicking anywhere moves things along; Skip and Escape go straight to the summary.

export type RevealItem = { kind: 'totem'; totem: Totem } | { kind: 'holder'; rating: HolderRating; copies: number };
type Props = {
  language: Language;
  items: RevealItem[];
  featured: string;
  nameOf: (slug: string) => string;
  lawOf: (slug: string) => string;
  emblemOf: (slug: string) => string;
  canPullAgain: boolean;
  onAgain: (count: 1 | 10) => void;
  onDone: () => void;
};
type Phase = 'construct' | 'cards' | 'summary';

const CAPTIONS: { ref: Text; prop: Text }[] = [
  { ref: { en: 'Euclid I.1', zh: '欧几里得 I.1' }, prop: { en: 'On a given straight line, construct an equilateral triangle.', zh: '在给定的线段上作等边三角形。' } },
  { ref: { en: 'Euclid IV.15', zh: '欧几里得 IV.15' }, prop: { en: 'In a given circle, inscribe a regular hexagon.', zh: '在给定的圆内作内接正六边形。' } },
  { ref: { en: 'Euclid IV.11', zh: '欧几里得 IV.11' }, prop: { en: 'In a given circle, inscribe a regular pentagon.', zh: '在给定的圆内作内接正五边形。' } },
  { ref: { en: 'Gauss, 1796', zh: '高斯，1796' }, prop: { en: 'The regular 17-gon can be constructed with ruler and compass.', zh: '正十七边形可以用尺规作出。' } },
];
// How long a splash stays up before moving on by itself, by grade.
const SPLASH_MS: Record<Grade, number> = { 0: 2000, 1: 2000, 2: 2100, 3: 2700, 4: 3600 };

export function SummonReveal(props: Props) {
  const { language, items } = props;
  const text = (en: string, zh: string) => language === 'zh' ? zh : en;
  const tx = (t: Text) => language === 'zh' ? t.zh : t.en;
  const plan = useMemo(() => revealPlan(items.map(i => i.kind === 'holder' ? { kind: 'holder' as const, rating: i.rating, copies: i.copies } : i)), [items]);
  const back = cardBackArt();

  const root = useRef<HTMLDivElement>(null), canvas = useRef<HTMLCanvasElement>(null);
  const skipButton = useRef<HTMLButtonElement>(null), continueButton = useRef<HTMLButtonElement>(null), doneButton = useRef<HTMLButtonElement>(null);
  const cards = useRef<(HTMLLIElement | null)[]>([]);
  const engine = useRef<RevealEngine | null>(null);
  const timers = useRef<number[]>([]), splashTimer = useRef(0);
  const queue = useRef<number[]>([...plan.splashOrder]);

  const [phase, setPhase] = useState<Phase>('construct');
  const [stage, setStage] = useState(0);
  const [stamped, setStamped] = useState(false);
  const [dealt, setDealt] = useState(false);
  const [skipped, setSkipped] = useState(false);
  const [flipped, setFlipped] = useState<boolean[]>(() => items.map(() => false));
  const [splash, setSplash] = useState<number | null>(null);
  const [armed, setArmed] = useState<number | null>(null);
  const [announce, setAnnounce] = useState('');
  // Timers and engine callbacks read the latest state through this.
  const live = useRef({ phase, splash, armed, flipped });
  live.current = { phase, splash, armed, flipped };

  const later = (fn: () => void, ms: number) => { timers.current.push(window.setTimeout(fn, ms)); };
  const clearTimers = () => { timers.current.forEach(id => window.clearTimeout(id)); timers.current = []; window.clearTimeout(splashTimer.current); };

  const name = (i: number) => { const it = items[i]; return it.kind === 'holder' ? props.nameOf(it.rating.slug) : tx(familyById(it.totem.family).power); };
  const describe = (i: number) => {
    const it = items[i];
    if (it.kind === 'holder') return `${name(i)}, ${text(`${it.rating.stars} stars`, `${it.rating.stars} 星`)}${it.copies === 1 ? text(', new', '，新') : ''}`;
    return `${name(i)} ${text('totem', '图腾')}, ${tierById(it.totem.tier).name.en}, ${text(`depth ${it.totem.depth}`, `深度 ${it.totem.depth}`)}`;
  };

  function flip(i: number) {
    if (live.current.flipped[i]) return;
    live.current.flipped = live.current.flipped.map((v, j) => v || j === i);
    setFlipped(f => f.map((v, j) => v || j === i));
    const el = cards.current[i], box = root.current?.getBoundingClientRect(), g = plan.grades[i];
    if (el && box && g > 0) {
      const r = el.getBoundingClientRect();
      engine.current?.sparkAt(r.left - box.left + r.width / 2, r.top - box.top + r.height / 2, PIGMENTS[g], 6 + g * 10);
    }
  }
  function nextHeld() {
    if (live.current.phase !== 'cards') return;
    const i = queue.current[0];
    if (i === undefined) { later(toSummary, 500); return; }
    setArmed(i);
    later(() => { if (live.current.armed === i && live.current.splash === null) openSplash(i); }, 950);
  }
  function openSplash(i: number) {
    queue.current = queue.current.filter(j => j !== i);
    window.clearTimeout(splashTimer.current);
    setArmed(null); setSplash(i);
    engine.current?.setMood(PIGMENTS[plan.grades[i]]);
    setAnnounce(describe(i));
    splashTimer.current = window.setTimeout(() => closeSplash(i), SPLASH_MS[plan.grades[i]]);
  }
  function closeSplash(i: number) {
    if (live.current.splash !== i) return;
    window.clearTimeout(splashTimer.current);
    live.current.splash = null;
    setSplash(null);
    engine.current?.setMood(null);
    flip(i);
    skipButton.current?.focus({ preventScroll: true });
    later(nextHeld, 700);
  }
  function flipOrdinary() {
    clearTimers();
    items.forEach((_, i) => { if (!plan.held[i]) flip(i); });
    later(nextHeld, 380);
  }
  function toSummary() {
    clearTimers();
    engine.current?.finish();
    engine.current?.setMood(null);
    if (live.current.phase === 'construct') setSkipped(true);
    setFlipped(items.map(() => true)); setSplash(null); setArmed(null); setDealt(true); setPhase('summary');
    setAnnounce(`${text('Summoned', '召唤结果')}: ${items.map((_, i) => name(i)).join(text(', ', '，'))}`);
  }
  // A click on the slate moves the reveal to its next beat.
  function advance() {
    const s = live.current;
    if (s.phase === 'construct') engine.current?.fastForward();
    else if (s.phase === 'cards') {
      if (s.splash !== null) closeSplash(s.splash);
      else if (s.armed !== null) openSplash(s.armed);
      else flipOrdinary();
    }
  }
  const onCard = (i: number) => (e: MouseEvent) => {
    e.stopPropagation();
    const s = live.current;
    if (s.phase !== 'cards' || s.flipped[i] || s.splash !== null) return;
    if (plan.held[i]) openSplash(i); else flip(i);
  };

  const onEvent = useRef<(e: RevealEvent) => void>(() => {});
  onEvent.current = e => {
    if (e.type === 'stage') setStage(e.stage);
    else if (e.type === 'close') setStamped(true);
    else if (e.type === 'burst' && live.current.phase === 'construct') {
      setPhase('cards');
      setAnnounce(text(`${items.length === 1 ? 'One card is' : `${items.length} cards are`} dealt face down.`, `${items.length} 张卡牌背面朝上发出。`));
    }
  };

  // The canvas lives as long as the reveal.
  useEffect(() => {
    const el = canvas.current!, box = root.current!;
    const e = createRevealEngine(el, {
      stages: plan.stages,
      inks: Array.from({ length: plan.stages }, (_, s) => stageInk(s)),
      closeInk: PIGMENTS[plan.top],
      burstInks: plan.grades.map(g => PIGMENTS[g]),
      top: plan.top,
      onEvent: ev => onEvent.current(ev),
      art: compassArt(),
    });
    engine.current = e;
    const fit = () => e.resize(box.clientWidth, box.clientHeight, window.devicePixelRatio);
    fit();
    const observer = new ResizeObserver(fit); observer.observe(box);
    const visibility = () => e.setVisible(document.visibilityState === 'visible');
    document.addEventListener('visibilitychange', visibility);
    e.start();
    return () => { observer.disconnect(); document.removeEventListener('visibilitychange', visibility); e.destroy(); engine.current = null; };
  }, [plan]);

  // Modal behaviour: lock the page behind and take focus (Gacha gives it back to the pull button).
  useEffect(() => {
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    skipButton.current?.focus({ preventScroll: true });
    return () => { document.body.style.overflow = overflow; clearTimers(); };
  }, []);
  useEffect(() => { if (splash !== null) continueButton.current?.focus({ preventScroll: true }); }, [splash]);
  useEffect(() => { if (phase === 'summary') doneButton.current?.focus({ preventScroll: true }); }, [phase]);

  // Deal: measure where each card ends up, start it at the figure's centre, then let it fly out.
  useLayoutEffect(() => {
    if (phase !== 'cards' || dealt) return;
    const box = root.current!.getBoundingClientRect();
    const [x, y] = engine.current?.centre() ?? [box.width / 2, box.height * .45];
    cards.current.forEach((el, i) => {
      if (!el) return;
      const r = el.getBoundingClientRect();
      el.style.setProperty('--dx', `${x - (r.left - box.left + r.width / 2)}px`);
      el.style.setProperty('--dy', `${y - (r.top - box.top + r.height / 2)}px`);
      el.style.setProperty('--rot', `${(i % 2 ? 1 : -1) * (10 + (i * 37) % 17)}deg`);
    });
    let inner = 0;
    const outer = requestAnimationFrame(() => { inner = requestAnimationFrame(() => setDealt(true)); });
    return () => { cancelAnimationFrame(outer); cancelAnimationFrame(inner); };
  }, [phase, dealt]);
  // Once dealt, ordinary cards turn over in order, then the held ones are offered one by one.
  useEffect(() => {
    if (phase !== 'cards' || !dealt) return;
    const ordinary = items.map((_, i) => i).filter(i => !plan.held[i]);
    const landed = 560 + items.length * 45;
    ordinary.forEach((i, n) => later(() => flip(i), landed + n * 95));
    later(nextHeld, landed + ordinary.length * 95 + 320);
    return clearTimers;
  }, [phase, dealt]);

  function keys(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Escape') { e.preventDefault(); if (live.current.phase === 'summary') props.onDone(); else toSummary(); return; }
    if ((e.key === 'Enter' || e.key === ' ') && e.target === root.current) { e.preventDefault(); advance(); return; }
    if (e.key !== 'Tab') return;
    const focusable = [...root.current!.querySelectorAll<HTMLElement>('button:not([disabled]):not([tabindex="-1"])')];
    if (!focusable.length) return;
    const first = focusable[0], last = focusable[focusable.length - 1], at = document.activeElement;
    if (!root.current!.contains(at) || at === root.current) { e.preventDefault(); (e.shiftKey ? last : first).focus(); }
    else if (e.shiftKey && at === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && at === last) { e.preventDefault(); first.focus(); }
  }

  const badge = (it: RevealItem) => {
    if (it.kind === 'totem') return <span className="sr-badge">{text(`Depth ${it.totem.depth}`, `深度 ${it.totem.depth}`)}</span>;
    if (it.copies === 1) return <span className="sr-badge new">{text('New', '新')}</span>;
    return <span className="sr-badge">{it.copies - 1 > MAX_UPGRADE ? text('Max', '已满') : `+${upgradeLevel(it.copies)}`}</span>;
  };
  const rank = (it: RevealItem) => it.kind === 'holder'
    ? <span className="sr-rank" aria-hidden="true">{'★'.repeat(it.rating.stars)}</span>
    : <span className="sr-rank letter" aria-hidden="true">{tx(tierById(it.totem.tier).name)}</span>;
  const sigilOf = (it: RevealItem, className: string) => it.kind === 'holder'
    ? <Sigil className={className} art={holderArt(it.rating.slug)} glyph={props.emblemOf(it.rating.slug)} />
    : <Sigil className={className} art={totemArt(it.totem.family)} glyph={familyById(it.totem.family).glyph} />;
  const sub = (it: RevealItem) => it.kind === 'holder' ? props.lawOf(it.rating.slug) : tx(familyById(it.totem.family).creature);

  const cap = CAPTIONS[stage];
  const hint = phase === 'construct' ? text('Click anywhere to skip ahead', '点击任意处快进')
    : phase === 'cards' && armed !== null && splash === null ? text('Click the glowing card to reveal it', '点击发光的卡牌揭示') : '';
  const single = items.length === 1;
  const splashItem = splash !== null ? items[splash] : null, splashGrade = splash !== null ? plan.grades[splash] : 0;
  const tags: { label: string; lead?: boolean }[] = [];
  if (splashItem?.kind === 'holder') {
    if (splashItem.rating.stars === 5) tags.push(splashItem.rating.slug === props.featured
      ? { label: text('Featured', '当期角色'), lead: true }
      : { label: text(`Off-banner. Your next 5★ will be ${props.nameOf(props.featured)}.`, `非当期。下一个 5★ 必为${props.nameOf(props.featured)}。`) });
    tags.push(splashItem.copies === 1 ? { label: text('New law holder', '新执律者'), lead: splashItem.rating.stars < 5 }
      : { label: splashItem.copies - 1 > MAX_UPGRADE ? text('Fully upgraded', '已满级') : text(`Upgraded to +${upgradeLevel(splashItem.copies)}`, `升级至 +${upgradeLevel(splashItem.copies)}`) });
  } else if (splashItem) tags.push({ label: text(`Depth ${splashItem.totem.depth}`, `深度 ${splashItem.totem.depth}`) });

  return <div ref={root} className={`sr ${phase}${skipped ? ' skipped' : ''}${splash !== null ? ' splashing' : ''}`} role="dialog" aria-modal="true" aria-labelledby="sr-title" tabIndex={-1}
    onClick={advance} onKeyDown={keys} style={{ '--top': PIGMENTS[plan.top] } as CSSProperties}>
    <h2 id="sr-title" className="gc-sr-only">{text('Summon', '召唤')}</h2>
    <canvas ref={canvas} className="sr-canvas" aria-hidden="true" />
    {phase !== 'summary' && <button ref={skipButton} className="sr-skip" onClick={e => { e.stopPropagation(); toSummary(); }}>{text('Skip', '跳过')}</button>}

    {phase === 'construct' && <div className="sr-caption" key={stamped ? 'qed' : stage} style={{ '--ink': stageInk(stage) } as CSSProperties}>
      {stamped ? <span className="sr-qed"><i aria-hidden="true">∎</i>{text('Q.E.D.', '证毕')}</span>
        : <><span className="sr-ref">{tx(cap.ref)}</span><span className="sr-prop">{tx(cap.prop)}</span></>}
    </div>}

    {phase !== 'construct' && <ol className={`sr-cards${single ? ' single' : ''}`}>
      {items.map((it, i) => {
        const g = plan.grades[i], open = flipped[i];
        const style = { '--pig': PIGMENTS[g], '--i': i, '--c': it.kind === 'totem' ? familyById(it.totem.family).colour : PIGMENTS[g] } as CSSProperties;
        return <li key={i} ref={el => { cards.current[i] = el; }} style={style}
          className={`sr-card g${g}${dealt ? '' : ' pre'}${open ? ' flipped' : ''}${armed === i ? ' armed' : ''}${plan.held[i] ? ' held' : ''}`}>
          <div className="sr-deal">
            <button className="sr-card-btn" onClick={onCard(i)} tabIndex={open || phase !== 'cards' ? -1 : 0}
              aria-label={open ? describe(i) : text(`Face-down card ${i + 1}. Reveal`, `背面朝上的第 ${i + 1} 张卡牌，揭示`)}>
              <span className="sr-card-inner">
                <span className="sr-back" aria-hidden="true">
                  {back ? <img src={back} alt="" draggable={false} /> : <CardBack />}
                </span>
                <span className={`sr-face ${it.kind}`} aria-hidden="true">
                  {sigilOf(it, 'sr-face-sigil')}
                  <span className="sr-face-text">{rank(it)}<strong>{name(i)}</strong><small>{sub(it)}</small></span>
                  {badge(it)}
                </span>
              </span>
            </button>
          </div>
        </li>;
      })}
    </ol>}

    {splashItem && splash !== null && <div className={`sr-splash g${splashGrade} ${splashItem.kind}`} onClick={e => { e.stopPropagation(); closeSplash(splash); }}
      style={{ '--pig': PIGMENTS[splashGrade], '--c': splashItem.kind === 'totem' ? familyById(splashItem.totem.family).colour : PIGMENTS[splashGrade] } as CSSProperties}>
      <svg className="sr-halo" viewBox="0 0 1000 1000" aria-hidden="true">
        {figurePaths(figureFor(splashGrade)).map((d, n) => <path key={n} d={d} pathLength={1} style={{ '--n': n } as CSSProperties} />)}
      </svg>
      <div className="sr-splash-body">
        {sigilOf(splashItem, 'sr-splash-sigil')}
        <p className="sr-splash-rank" aria-hidden="true">{splashItem.kind === 'holder'
          ? Array.from({ length: splashItem.rating.stars }, (_, s) => <span key={s} style={{ '--s': s } as CSSProperties}>★</span>)
          : <span style={{ '--s': 0 } as CSSProperties}>{tx(tierById(splashItem.totem.tier).name)}</span>}</p>
        <h3 className="sr-splash-name">{name(splash)}</h3>
        <p className="sr-splash-sub">{splashItem.kind === 'holder' ? sub(splashItem) : tx(familyById(splashItem.totem.family).note)}</p>
        <p className="sr-splash-kind">{splashItem.kind === 'holder' ? text('Law holder', '执律者')
          : text(`Totem condensed from the ${sub(splashItem).toLowerCase()}`, `凝聚自${sub(splashItem)}的图腾`)}</p>
        {tags.length > 0 && <p className="sr-splash-tags">{tags.map(tag => <span key={tag.label} className={tag.lead ? 'lead' : ''}>{tag.label}</span>)}</p>}
      </div>
      <button ref={continueButton} className="sr-continue" onClick={e => { e.stopPropagation(); closeSplash(splash); }}>{text('Continue', '继续')}</button>
    </div>}

    {phase === 'summary' && <div className="sr-actions" onClick={e => e.stopPropagation()}>
      <p>{text('Added to your collection.', '已加入收藏。')}</p>
      <div>
        <button className="games-btn quiet" disabled={!props.canPullAgain} onClick={() => props.onAgain(single ? 1 : 10)}>{single ? text('Pull ×1 again', '再抽 ×1') : text('Pull ×10 again', '再抽 ×10')}</button>
        <button ref={doneButton} className="games-btn" onClick={props.onDone}>{text('Done', '完成')}</button>
      </div>
    </div>}

    {hint && <p className="sr-hint" key={hint} aria-hidden="true">{hint}</p>}
    <p className="gc-sr-only" aria-live="polite">{announce}</p>
  </div>;
}

/** Back of a face-down card when no card-back art is provided: Euclid I.1 in brass, and a tombstone. */
function CardBack() {
  const s = 22, h = s * Math.sqrt(3) / 2, y = 68;
  return <svg viewBox="0 0 100 140" preserveAspectRatio="xMidYMid slice">
    <circle cx={50 - s / 2} cy={y} r={s} /><circle cx={50 + s / 2} cy={y} r={s} />
    <path d={`M${50 - s / 2} ${y}L${50 + s / 2} ${y}L50 ${y - h}Z`} className="tri" />
    <rect x="46.5" y="108" width="7" height="7" className="qed" />
  </svg>;
}
