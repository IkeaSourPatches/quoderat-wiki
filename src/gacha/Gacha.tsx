import { useState, type CSSProperties } from 'react';
import type { Language } from '../i18n';
import { DEPTH_LANDMARKS, TIERS, familyById, pullTotems, tierById, type Text, type Totem } from './pool';
import '../game/games.css';
import './gacha.css';

// The gacha page. Totems pull for real; laws wait until their two ratings are settled.
// Pull history stays in this browser only.

const storageKey = 'quoderat-gacha-totems';
type Saved = { total: number; recent: Totem[] };
const empty: Saved = { total: 0, recent: [] };
const load = (): Saved => {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || 'null');
    if (saved && typeof saved.total === 'number' && Array.isArray(saved.recent)) return saved;
  } catch { /* Unreadable or blocked storage starts fresh. */ }
  return empty;
};
const store = (saved: Saved) => { try { localStorage.setItem(storageKey, JSON.stringify(saved)); } catch { /* Kept in memory only. */ } };
const percent = (chance: number) => `${+(chance * 100).toFixed(1)}%`;

function DepthBar({ depth, tx, label }: { depth: number; tx: (t: Text) => string; label: string }) {
  return <div className="gc-depth" role="img" aria-label={label}>
    {DEPTH_LANDMARKS.map(z => <span key={z.from} className="gc-zone" style={{ left: `${z.from}%`, width: `${z.to - z.from}%` }} title={tx(z.label)} />)}
    <span className="gc-marker" style={{ left: `${depth}%` }} />
  </div>;
}

export function Gacha({ language }: { language: Language }) {
  const zh = language === 'zh';
  const tx = (t: Text) => zh ? t.zh : t.en;
  const text = (en: string, cn: string) => zh ? cn : en;
  const [banner, setBanner] = useState<'totems' | 'laws'>('totems');
  const [results, setResults] = useState<Totem[]>([]);
  const [saved, setSaved] = useState<Saved>(load);

  const pull = (count: number) => {
    const got = pullTotems(count);
    const next = { total: saved.total + count, recent: [...got, ...saved.recent].slice(0, 50) };
    setResults(got); setSaved(next); store(next);
  };
  const reset = () => { setResults([]); setSaved(empty); store(empty); };

  return <div className="gc">
    <header className="games-head">
      <h1>{text('Gacha', '抽卡')}</h1>
      <p>{text('The world condenses the power of the slain creatures back out as totems. See what it hands you.', '世界把被杀神兽的力量重新凝聚成图腾。看看它会交给你什么。')}</p>
    </header>

    <div className="gc-tabs" role="tablist" aria-label={text('Banners', '卡池')}>
      {(['totems', 'laws'] as const).map(id => <button key={id} role="tab" aria-selected={banner === id} onClick={() => setBanner(id)}>
        {id === 'totems' ? text('Totems', '图腾') : text('Laws', '法则')}
        {id === 'laws' && <small>{text('soon', '即将')}</small>}
      </button>)}
    </div>

    {banner === 'totems' ? <section className="gc-banner" role="tabpanel">
      <ul className="gc-odds">{TIERS.map(t => <li key={t.id} className={`tier-${t.id}`}>
        <strong>{tx(t.name)}</strong><span>{text('Depth', '深度')} {t.depth[0]}–{t.depth[1]}</span><b>{percent(t.chance)}</b>
      </li>)}</ul>
      <div className="gc-actions">
        <button className="games-btn" onClick={() => pull(1)}>{text('Pull ×1', '抽取 ×1')}</button>
        <button className="games-btn quiet" onClick={() => pull(10)}>{text('Pull ×10', '抽取 ×10')}</button>
      </div>
      {results.length > 0 && <ul className={`gc-results${results.length === 1 ? ' single' : ''}`} aria-live="polite">
        {results.map((r, i) => {
          const f = familyById(r.family), t = tierById(r.tier);
          return <li key={`${saved.total}-${i}`} className={`gc-card tier-${r.tier}`} style={{ '--c': f.colour, '--i': i } as CSSProperties}>
            <span className="gc-glyph" aria-hidden="true">{f.glyph}</span>
            <small>{tx(t.name)}</small>
            <strong>{tx(f.power)}</strong>
            <span className="gc-creature">{tx(f.creature)}</span>
            <span className="gc-note">{tx(f.note)}</span>
            <span className="gc-depth-num">{text('Depth', '深度')} <b>{r.depth}</b><small>/100</small></span>
            <DepthBar depth={r.depth} tx={tx} label={text(`Depth ${r.depth} of 100`, `深度 ${r.depth}/100`)} />
          </li>;
        })}
      </ul>}
      <p className="gc-history">
        {text(`Totems drawn: ${saved.total}`, `已抽图腾：${saved.total}`)}
        {saved.recent.length > 0 && <> · {text(`Last ${saved.recent.length}:`, `最近 ${saved.recent.length} 个：`)} {TIERS.map(t => `${tx(t.name)} ${saved.recent.filter(r => r.tier === t.id).length}`).join(' · ')}</>}
        {saved.total > 0 && <> · <button className="games-link" onClick={reset}>{text('Reset', '重置')}</button></>}
      </p>
    </section> : <section className="gc-banner gc-laws" role="tabpanel">
      <p className="gc-lede">{text('Every law is rated twice. Range decides power, and power decides status. Impact factor measures how much a law has shaped history and daily life, so a narrow law with heavy impact can carry more prestige than its power alone suggests.', '每条法则都有两个评级。范围决定力量，力量决定地位。影响因子衡量一条法则在多大程度上塑造了历史与日常生活，所以一条影响深远的狭窄法则，其声望可能超过其力量本身所显示的。')}</p>
      <svg className="gc-axes" viewBox="0 0 320 220" role="img" aria-label={text('Range runs left to right, impact factor bottom to top.', '范围自左向右，影响因子自下而上。')}>
        <path d="M40 190H300M40 190V20" />
        <path className="gc-grid" d="M170 190V20M40 105H300" />
        <text x="300" y="210" textAnchor="end">{text('Range →', '范围 →')}</text>
        <text x="30" y="20" textAnchor="end" transform="rotate(-90 30 20)">{text('Impact factor →', '影响因子 →')}</text>
        <text className="gc-zone-label" x="105" y="58" textAnchor="middle">{text('narrow, heavy impact', '狭窄而影响深远')}</text>
        <text className="gc-zone-label" x="235" y="148" textAnchor="middle">{text('the broadest laws', '最广的法则')}</text>
      </svg>
      <h2>{text('Still to decide', '尚待决定')}</h2>
      <ul className="gc-open">
        <li>{text('The scale for each axis, and who rates each law.', '每个维度的刻度，以及由谁为每条法则评级。')}</li>
        <li>{text('How two ratings become one rarity: a sum, the higher of the two, or a grid of tiers.', '两个评级如何合成一个稀有度：相加、取较高者，还是一张分级表。')}</li>
        <li>{text('What a pull gives. A held law is unique and only passes through its test, so is it a law, its holder, or a chance at the test?', '抽到的是什么。已被执掌的法则独一无二，只能通过试炼传承：抽到的是法则、执律者，还是一次试炼的机会？')}</li>
      </ul>
      <div className="gc-actions"><button className="games-btn" disabled>{text('Pull — rules not set', '抽取 — 规则未定')}</button></div>
    </section>}

    <p className="gc-fine">{text('Odds, depth bands and family weights are provisional site mechanics, not canon. Pulls are saved in this browser only.', '概率、深度区间与族群权重是网站的暂定机制，并非正典。抽取记录只保存在本浏览器中。')}</p>
  </div>;
}