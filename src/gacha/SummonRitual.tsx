import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import type { Language } from '../i18n';
import type { MixedReward } from './pool';
import './ritual.css';
const SEALS = [[200, 54], [346, 200], [200, 346], [54, 200]] as const;
const GLYPHS = ['∀', '∃', '⇒', '∴'];
const quality = (r: MixedReward) => r.kind === 'holder' ? r.rating.stars === 5 ? 4 : r.rating.stars === 4 ? 3 : 2 : ({ common: 0, strong: 1, elite: 2, epic: 3 })[r.totem.tier];
const COLOURS = ['#a9c2b2', '#78c5db', '#a697ed', '#d69df4', '#f4cd77'];

/** Rewards are already saved. This component only controls their presentation. */
export function SummonRitual({ language, rewards, onComplete }: { language: Language; rewards: MixedReward[]; onComplete: () => void }) {
  const text = (en: string, zh: string) => language === 'zh' ? zh : en;
  const [lit, setLit] = useState<number[]>([]);
  const [released, setReleased] = useState(false);
  const complete = useRef(onComplete);
  complete.current = onComplete;
  useEffect(() => {
    if (!released) return;
    const timer = window.setTimeout(() => complete.current(), 1000);
    return () => window.clearTimeout(timer);
  }, [released]);
  const ignite = (i: number) => { if (!released) setLit(old => old.includes(i) ? old : [...old, i]); };
  const trace = (e: PointerEvent<HTMLDivElement>) => {
    if (!e.buttons || released) return;
    const box = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - box.left) / box.width * 400, y = (e.clientY - box.top) / box.height * 400;
    SEALS.forEach(([sx, sy], i) => { if (Math.hypot(x - sx, y - sy) < 40) ignite(i); });
  };
  const rarity = Math.max(0, ...rewards.map(quality));
  return <div className={`gc-ritual${lit.length === 4 ? ' ready' : ''}${released ? ' released' : ''}`} style={{ '--ritual-colour': COLOURS[rarity] } as CSSProperties}>
    <small>{text('THE PROOF OF ARRIVAL', '降临之证')}</small>
    <h2>{released ? text('The world answers.', '世界回应了。') : lit.length === 4 ? text('Let the proof unfold.', '让证明展开。') : text('Wake the four seals.', '唤醒四道印记。')}</h2>
    <p className="gc-ritual-instruction" role="status">{released ? text('Revealing your summons…', '正在揭示召唤……') : lit.length === 4 ? text('Press the centre to reveal your summons.', '按下中心，揭示召唤。') : text(`Drag through the seals, or tap each one. ${lit.length} / 4 lit.`, `划过印记，或逐个点击。已点亮 ${lit.length} / 4。`)}</p>
    <div className="gc-ritual-diagram" onPointerDown={trace} onPointerMove={trace}>
      <svg viewBox="0 0 400 400" aria-hidden="true" className="gc-ritual-svg">
        <circle cx="200" cy="200" r="184" className="ritual-outer" />
        <circle cx="200" cy="200" r="164" strokeDasharray="1 12" className="ritual-ticks" />
        <circle cx="200" cy="200" r="112" className="ritual-inner" />
        <path d="M200 54 346 200 200 346 54 200Z" className="ritual-outline" />
        {SEALS.map(([x, y], i) => <g key={i} className={lit.includes(i) ? 'seal-path lit' : 'seal-path'}>
          <path d={`M${x} ${y} L200 200`} /><path d={`M${x} ${y} L${SEALS[(i + 1) % 4][0]} ${SEALS[(i + 1) % 4][1]}`} />
          <circle cx={x} cy={y} r="31" />
        </g>)}
        {Array.from({ length: 16 }, (_, i) => <path key={i} className="ritual-ray" d="M200 100V20" transform={`rotate(${i * 22.5} 200 200)`} style={{ '--ray': i } as CSSProperties} />)}
      </svg>
      {SEALS.map(([x, y], i) => <button key={i} className={`gc-seal${lit.includes(i) ? ' lit' : ''}`} style={{ left: `${x / 4}%`, top: `${y / 4}%` }} onClick={() => ignite(i)} disabled={released}
        aria-label={text(`Light seal ${i + 1}`, `点亮印记 ${i + 1}`)} aria-pressed={lit.includes(i)}>{GLYPHS[i]}</button>)}
      <button className="gc-ritual-core" disabled={lit.length < 4 || released} onClick={() => setReleased(true)} aria-label={text('Reveal summons', '揭示召唤')}><span aria-hidden="true">{released ? '✧' : '□'}</span><small>{lit.length === 4 ? 'Q.E.D.' : `${lit.length} / 4`}</small></button>
    </div>
    <div className="gc-ritual-drops" aria-hidden="true">{rewards.map((r, i) => <span key={i} style={{ '--drop-colour': COLOURS[quality(r)], '--drop': i } as CSSProperties} />)}</div>
    <button className="games-link gc-ritual-skip" onClick={onComplete}>{text('Skip ritual · reveal now', '跳过仪式 · 立即揭示')}</button>
    <p className="gc-ritual-note">{text('Your rewards are saved. The ritual does not change the odds.', '奖励已保存，仪式不会改变概率。')}</p>
  </div>;
}
