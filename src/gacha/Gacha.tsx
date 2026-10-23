import { useState, type CSSProperties } from 'react';
import type { Article } from '../api';
import type { Language } from '../i18n';
import { emblems } from '../emblems';
import {
  DEPTH_LANDMARKS, HOLDERS, MAX_UPGRADE, STAR_ODDS, TIERS, familyById, pullHolders, pullTotems, tierById, upgradeLevel,
  type HolderRating, type Text, type Totem,
} from './pool';
import '../game/games.css';
import './gacha.css';

// The gacha page. Law holders and totems each have a banner; pulls stay in this browser.

function useStored<T>(key: string, empty: T, valid: (value: any) => boolean) {
  const [value, setValue] = useState<T>(() => {
    try { const saved = JSON.parse(localStorage.getItem(key) || 'null'); if (saved && valid(saved)) return saved as T; } catch { /* Start fresh. */ }
    return empty;
  });
  const save = (next: T) => { setValue(next); try { localStorage.setItem(key, JSON.stringify(next)); } catch { /* Memory only. */ } };
  return [value, save] as const;
}

type TotemLog = { total: number; recent: Totem[] };
type HolderLog = { total: number; copies: Record<string, number> };
type HolderResult = { rating: HolderRating; copies: number };
const percent = (chance: number) => `${+(chance * 100).toFixed(1)}%`;

const StarRow = ({ n, label }: { n: number; label: string }) =>
  <span className="gc-stars" role="img" aria-label={label}>{'★'.repeat(n)}<i>{'★'.repeat(5 - n)}</i></span>;

const DepthBar = ({ depth, tx, label }: { depth: number; tx: (t: Text) => string; label: string }) =>
  <div className="gc-depth" role="img" aria-label={label}>
    {DEPTH_LANDMARKS.map(z => <span key={z.from} className="gc-zone" style={{ left: `${z.from}%`, width: `${z.to - z.from}%` }} title={tx(z.label)} />)}
    <span className="gc-marker" style={{ left: `${depth}%` }} />
  </div>;

const Pips = ({ level, label }: { level: number; label: string }) =>
  <span className="gc-pips" role="img" aria-label={label}>{Array.from({ length: MAX_UPGRADE }, (_, i) => <i key={i} className={i < level ? 'on' : ''} />)}</span>;

export function Gacha({ language, articles, open }: { language: Language; articles: Article[]; open: (slug: string) => void }) {
  const zh = language === 'zh';
  const tx = (t: Text) => zh ? t.zh : t.en;
  const text = (en: string, cn: string) => zh ? cn : en;
  const [banner, setBanner] = useState<'laws' | 'totems'>('laws');

  // Only holders whose character page exists can be pulled, so names never go missing.
  const pages = new Map(articles.map(a => [a.slug, a]));
  const pool = HOLDERS.filter(h => pages.has(h.slug));
  const nameOf = (slug: string) => pages.get(slug)?.title ?? slug;
  const lawOf = (slug: string) => pages.get(slug)?.stats['Held law'] ?? '';
  const stars = (n: number) => <StarRow n={n} label={text(`${n} stars`, `${n} 星`)} />;

  const [totemLog, saveTotems] = useStored<TotemLog>('quoderat-gacha-totems', { total: 0, recent: [] }, v => typeof v.total === 'number' && Array.isArray(v.recent));
  const [holderLog, saveHolders] = useStored<HolderLog>('quoderat-gacha-holders', { total: 0, copies: {} }, v => typeof v.total === 'number' && typeof v.copies === 'object');
  const [totems, setTotems] = useState<Totem[]>([]);
  const [holders, setHolders] = useState<HolderResult[]>([]);

  const pullT = (count: number) => {
    const got = pullTotems(count);
    setTotems(got);
    saveTotems({ total: totemLog.total + count, recent: [...got, ...totemLog.recent].slice(0, 50) });
  };
  const pullH = (count: number) => {
    const copies = { ...holderLog.copies };
    const got = pullHolders(count, Math.random, pool).map(rating => ({ rating, copies: copies[rating.slug] = (copies[rating.slug] || 0) + 1 }));
    setHolders(got);
    saveHolders({ total: holderLog.total + count, copies });
  };
  const owned = pool.filter(h => holderLog.copies[h.slug]).length;
  const badge = (copies: number) => copies === 1 ? text('New', '新') : copies - 1 > MAX_UPGRADE ? text('Max', '已满') : `+${upgradeLevel(copies)}`;
  const history = (label: string, reset: () => void, total: number) =>
    <>{label}{total > 0 && <> · <button className="games-link" onClick={reset}>{text('Reset', '重置')}</button></>}</>;

  return <div className="gc">
    <header className="games-head">
      <h1>{text('Gacha', '抽卡')}</h1>
      <p>{text('Pull a law holder, or a totem the world condenses back out of the slain creatures. Repeat holders grow stronger.', '抽取一位执律者，或世界从被杀神兽身上重新凝聚出的图腾。重复抽到的执律者会变得更强。')}</p>
    </header>

    <div className="gc-tabs" role="tablist" aria-label={text('Banners', '卡池')}>
      {(['laws', 'totems'] as const).map(id => <button key={id} role="tab" aria-selected={banner === id} onClick={() => setBanner(id)}>
        {id === 'laws' ? text('Law holders', '执律者') : text('Totems', '图腾')}
      </button>)}
    </div>

    {banner === 'laws' ? <section className="gc-banner" role="tabpanel">
      <ul className="gc-odds">{STAR_ODDS.map(o => <li key={o.stars} className={`stars-${o.stars}`}>
        <strong>{stars(o.stars)}</strong>
        <span>{text(`${pool.filter(h => h.stars === o.stars).length} holders`, `${pool.filter(h => h.stars === o.stars).length} 位执律者`)}</span>
        <b>{percent(o.chance)}</b>
      </li>)}</ul>
      <div className="gc-actions">
        <button className="games-btn" disabled={!pool.length} onClick={() => pullH(1)}>{text('Pull ×1', '抽取 ×1')}</button>
        <button className="games-btn quiet" disabled={!pool.length} onClick={() => pullH(10)}>{text('Pull ×10', '抽取 ×10')}</button>
      </div>
      {holders.length > 0 && <ul className={`gc-results${holders.length === 1 ? ' single' : ''}`} aria-live="polite">
        {holders.map(({ rating: h, copies }, i) => <li key={`${holderLog.total}-${i}`} className={`gc-card gc-holder stars-${h.stars}`} style={{ '--i': i } as CSSProperties}>
          <span className={`gc-badge${copies === 1 ? ' new' : ''}`}>{badge(copies)}</span>
          <span className="gc-glyph" aria-hidden="true">{emblems[h.slug] || '✧'}</span>
          {stars(h.stars)}
          <strong>{nameOf(h.slug)}</strong>
          <span className="gc-creature">{lawOf(h.slug)}</span>
          <dl className="gc-ratings">
            <dt>{text('Range', '范围')}</dt><dd><StarRow n={h.range} label={text(`Range ${h.range} of 5`, `范围 ${h.range}/5`)} /></dd>
            <dt>{text('Impact', '影响因子')}</dt><dd><StarRow n={h.impact} label={text(`Impact factor ${h.impact} of 5`, `影响因子 ${h.impact}/5`)} /></dd>
          </dl>
        </li>)}
      </ul>}
      <h2 className="gc-sub">{text(`Collection ${owned} / ${pool.length}`, `收藏 ${owned} / ${pool.length}`)}</h2>
      <ul className="gc-collection">{[...pool].sort((a, b) => b.stars - a.stars).map(h => {
        const copies = holderLog.copies[h.slug] || 0, level = upgradeLevel(copies);
        return <li key={h.slug} className={`stars-${h.stars}${copies ? '' : ' missing'}`}>
          {copies ? <button onClick={() => open(h.slug)} title={text('Read their page', '阅读人物页面')}>
            <span className="gc-glyph" aria-hidden="true">{emblems[h.slug] || '✧'}</span>
            <strong>{nameOf(h.slug)}</strong>
            {stars(h.stars)}
            <Pips level={level} label={text(`Upgrade ${level} of ${MAX_UPGRADE}`, `升级 ${level}/${MAX_UPGRADE}`)} />
          </button> : <span className="gc-unknown">
            <span className="gc-glyph" aria-hidden="true">?</span>
            <strong>{text('Not yet pulled', '尚未抽到')}</strong>
            {stars(h.stars)}
          </span>}
        </li>;
      })}</ul>
      <p className="gc-history">{history(text(`Holder pulls: ${holderLog.total}`, `执律者抽取次数：${holderLog.total}`), () => { setHolders([]); saveHolders({ total: 0, copies: {} }); }, holderLog.total)}</p>
    </section> : <section className="gc-banner" role="tabpanel">
      <ul className="gc-odds">{TIERS.map(t => <li key={t.id} className={`tier-${t.id}`}>
        <strong>{tx(t.name)}</strong><span>{text('Depth', '深度')} {t.depth[0]}–{t.depth[1]}</span><b>{percent(t.chance)}</b>
      </li>)}</ul>
      <div className="gc-actions">
        <button className="games-btn" onClick={() => pullT(1)}>{text('Pull ×1', '抽取 ×1')}</button>
        <button className="games-btn quiet" onClick={() => pullT(10)}>{text('Pull ×10', '抽取 ×10')}</button>
      </div>
      {totems.length > 0 && <ul className={`gc-results${totems.length === 1 ? ' single' : ''}`} aria-live="polite">
        {totems.map((r, i) => {
          const f = familyById(r.family), t = tierById(r.tier);
          return <li key={`${totemLog.total}-${i}`} className={`gc-card tier-${r.tier}`} style={{ '--c': f.colour, '--i': i } as CSSProperties}>
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
      <p className="gc-history">{history(text(`Totems drawn: ${totemLog.total}`, `已抽图腾：${totemLog.total}`) + (totemLog.recent.length ? ` · ${TIERS.map(t => `${tx(t.name)} ${totemLog.recent.filter(r => r.tier === t.id).length}`).join(' · ')}` : ''), () => { setTotems([]); saveTotems({ total: 0, recent: [] }); }, totemLog.total)}</p>
    </section>}

    <p className="gc-fine">{text('Star ratings are a hand-made tier list. Odds, depth bands and upgrade levels are provisional site mechanics, not canon. Pulls are saved in this browser only.', '星级是手工排定的分级表。概率、深度区间与升级等级是网站的暂定机制，并非正典。抽取记录只保存在本浏览器中。')}</p>
  </div>;
}