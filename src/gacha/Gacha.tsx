import { useState, type CSSProperties } from 'react';
import type { Article } from '../api';
import { emblems } from '../emblems';
import type { Language } from '../i18n';
import { DEPTH_LANDMARKS, FAMILIES, HOLDERS, MAX_UPGRADE, STAR_ODDS, TIERS, pullHolders, upgradeLevel, type HolderRating, familyById, pullTotems, tierById, type Text, type Totem } from './pool';
import { STORAGE_KEY, addPulls, decodeCollection, emptyCollection, mergeReward, mergeStack, stackKey, type Collection } from './collection';
import '../game/games.css';
import './gacha.css';

// Law holders and totems have separate local saves; the workshop upgrades owned totems.

function useStored<T>(key: string, empty: T, valid: (value: any) => boolean) {
  const [value, setValue] = useState<T>(() => {
    try { const saved = JSON.parse(localStorage.getItem(key) || 'null'); if (saved && valid(saved)) return saved as T; } catch { /* Start fresh. */ }
    return empty;
  });
  const save = (next: T) => { setValue(next); try { localStorage.setItem(key, JSON.stringify(next)); } catch { /* Memory only. */ } };
  return [value, save] as const;
}

type HolderLog = { total: number; copies: Record<string, number> };
type HolderResult = { rating: HolderRating; copies: number };
const percent = (chance: number) => `${+(chance * 100).toFixed(1)}%`;

const StarRow = ({ n, label }: { n: number; label: string }) =>
  <span className="gc-stars" role="img" aria-label={label}>{'★'.repeat(n)}<i>{'★'.repeat(5 - n)}</i></span>;

function DepthBar({ depth, tx, label }: { depth: number; tx: (t: Text) => string; label: string }) {
  return <div className="gc-depth" role="img" aria-label={label}>
    {DEPTH_LANDMARKS.map(z => <span key={z.from} className="gc-zone" style={{ left: `${z.from}%`, width: `${z.to - z.from}%` }} title={tx(z.label)} />)}
    <span className="gc-marker" style={{ left: `${depth}%` }} />
  </div>;
}

const Pips = ({ level, label }: { level: number; label: string }) =>
  <span className="gc-pips" role="img" aria-label={label}>{Array.from({ length: MAX_UPGRADE }, (_, i) => <i key={i} className={i < level ? 'on' : ''} />)}</span>;

export function Gacha({ language, articles, open }: { language: Language; articles: Article[]; open: (slug: string) => void }) {
  const zh = language === 'zh';
  const tx = (t: Text) => zh ? t.zh : t.en;
  const text = (en: string, cn: string) => zh ? cn : en;
  const [banner, setBanner] = useState<'totems' | 'laws' | 'workshop'>('laws');
  const [results, setResults] = useState<Totem[]>([]);
  const [initial] = useState(() => {
    try { return { saved: decodeCollection(localStorage.getItem(STORAGE_KEY)), failed: false }; }
    catch { return { saved: emptyCollection(), failed: true }; }
  });
  const [saved, setSaved] = useState<Collection>(initial.saved);
  const [storageFailed, setStorageFailed] = useState(initial.failed);
  const [notice, setNotice] = useState<Text | null>(null);
  const [familyFilter, setFamilyFilter] = useState('all');
  const save = (next: Collection) => {
    setSaved(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); setStorageFailed(false); }
    catch { setStorageFailed(true); }
  };
  const owned = saved.stacks.reduce((sum, t) => sum + t.count, 0);

  const pull = (count: number) => {
    const got = pullTotems(count);
    setResults(got); save(addPulls(saved, got)); setNotice(null);
  };
  const reset = () => {
    if (!window.confirm(text('Erase your entire collection and pull history on this browser?', '清空本浏览器中的全部收藏与抽取记录？'))) return;
    setResults([]); save(emptyCollection()); setNotice(null);
  };
  const merge = (key: string) => {
    const stack = saved.stacks.find(t => stackKey(t) === key);
    const reward = stack && mergeReward(stack);
    const next = mergeStack(saved, key);
    if (!reward || next === saved) return;
    save(next);
    const name = familyById(reward.family).power;
    setNotice({ en: `Merged 3 into 1: ${name.en}, depth ${reward.depth}. Added to your collection.`, zh: `三合一完成：${name.zh}，深度 ${reward.depth}。已加入收藏。` });
  };

  // Only holders whose character page exists can be pulled, so names never go missing.
  const pages = new Map(articles.map(a => [a.slug, a]));
  const pool = HOLDERS.filter(h => pages.has(h.slug));
  const nameOf = (slug: string) => pages.get(slug)?.title ?? slug;
  const lawOf = (slug: string) => pages.get(slug)?.stats['Held law'] ?? '';
  const stars = (n: number) => <StarRow n={n} label={text(`${n} stars`, `${n} 星`)} />;

  const [holderLog, saveHolders] = useStored<HolderLog>('quoderat-gacha-holders', { total: 0, copies: {} }, v => typeof v.total === 'number' && typeof v.copies === 'object');
  const [holders, setHolders] = useState<HolderResult[]>([]);

  const pullH = (count: number) => {
    const copies = { ...holderLog.copies };
    const got = pullHolders(count, Math.random, pool).map(rating => ({ rating, copies: copies[rating.slug] = (copies[rating.slug] || 0) + 1 }));
    setHolders(got);
    saveHolders({ total: holderLog.total + count, copies });
  };
  const holderOwned = pool.filter(h => holderLog.copies[h.slug]).length;
  const badge = (copies: number) => copies === 1 ? text('New', '新') : copies - 1 > MAX_UPGRADE ? text('Max', '已满') : `+${upgradeLevel(copies)}`;
  const history = (label: string, reset: () => void, total: number) =>
    <>{label}{total > 0 && <> · <button className="games-link" onClick={reset}>{text('Reset', '重置')}</button></>}</>;


  return <div className="gc">
    <header className="games-head">
      <h1>{text('Gacha', '抽卡')}</h1>
      <p>{text('Pull a law holder, or a totem the world condenses back out of the slain creatures. Repeat holders grow stronger.', '抽取一位执律者，或世界从被杀神兽身上重新凝聚出的图腾。重复抽到的执律者会变得更强。')}</p>
    </header>

    <div className="gc-tabs" role="tablist" aria-label={text('Banners', '卡池')}>
      {(['laws', 'totems', 'workshop'] as const).map(id => <button key={id} role="tab" aria-selected={banner === id} onClick={() => setBanner(id)}>
        {id === 'totems' ? text('Totems', '图腾') : id === 'workshop' ? text('Mage & collection', '法师与收藏') : text('Law holders', '执律者')}
      </button>)}
    </div>

    {storageFailed && <p className="gc-warning" role="alert">{text('Local storage could not be read or saved. Your current collection may only last for this visit.', '无法读取或保存本地数据。当前收藏可能仅在本次访问中保留。')}</p>}
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
        {text(`Totems drawn: ${saved.total} · In collection: ${owned}`, `已抽图腾：${saved.total} · 收藏中：${owned}`)}
        {saved.recent.length > 0 && <> · {text(`Last ${saved.recent.length}:`, `最近 ${saved.recent.length} 个：`)} {TIERS.map(t => `${tx(t.name)} ${saved.recent.filter(r => r.tier === t.id).length}`).join(' · ')}</>}
        {saved.total > 0 && <> · <button className="games-link" onClick={reset}>{text('Reset', '重置')}</button></>}
      </p>
    </section> : banner === 'workshop' ? <section className="gc-banner gc-workshop" role="tabpanel">
      <header className="gc-mage">
        <span className="gc-mage-sigil" aria-hidden="true">✧</span>
        <div><small>{text('THE MAGE’S WORKSHOP', '法师工坊')}</small><h2>{text('Give your duplicates a purpose.', '让重复的收藏有用武之地。')}</h2>
        <p>{text('Merge 3 copies of the same family and depth into 1 totem at +1 depth. Guaranteed, with no fee. Maximum depth: 39.', '将同族群、同深度的三个图腾合为一个，深度 +1。必定成功，无需费用。最高深度：39。')}</p></div>
      </header>
      <div className="gc-collection-stats"><span>{text(`${owned} owned`, `持有 ${owned} 个`)}</span><span>{text(`${saved.stacks.length} varieties`, `${saved.stacks.length} 种收藏`)}</span><span>{text(`Merges: ${saved.merges}`, `已合成 ${saved.merges} 次`)}</span></div>
      {saved.recovered && <p className="gc-warning">{text('Recovered the last 50 pulls available in your old save. Earlier rewards were not stored by the old version.', '已恢复旧存档中保留的最近抽取（最多 50 个）。旧版本未保存更早的奖励。')}</p>}
      <p className="gc-merge-notice" role="status">{notice ? tx(notice) : text('Choose a stack below. Each merge consumes exactly three copies.', '选择下方的收藏。每次合成恰好消耗三个副本。')}</p>
      <label className="gc-filter">{text('Family', '族群')} <select value={familyFilter} onChange={e => setFamilyFilter(e.target.value)}>
        <option value="all">{text('All families', '全部族群')}</option>
        {FAMILIES.map(f => <option key={f.id} value={f.id}>{tx(f.power)}</option>)}
      </select></label>
      {!owned && <div className="gc-empty"><h3>{text('Your shelves are waiting.', '收藏架正等待着你。')}</h3><p>{text('Pull a few totems to start your collection. Every reward stays here after you reload.', '抽取一些图腾来开启收藏。刷新页面后，奖励仍会保留在这里。')}</p><button className="games-btn" onClick={() => setBanner('totems')}>{text('Go to the banner', '前往卡池')}</button></div>}
      <ul className="gc-results gc-inventory">{saved.stacks.filter(t => familyFilter === 'all' || t.family === familyFilter).map(t => {
        const f = familyById(t.family), reward = mergeReward(t), ready = t.count >= 3 && reward;
        return <li key={stackKey(t)} className={`gc-card tier-${t.tier}`} style={{ '--c': f.colour } as CSSProperties}>
          <span className="gc-stock">×{t.count}</span><span className="gc-glyph" aria-hidden="true">{f.glyph}</span><small>{tx(tierById(t.tier).name)}</small><strong>{tx(f.power)}</strong>
          <span className="gc-depth-num">{text('Depth', '深度')} <b>{t.depth}</b></span>
          <p className="gc-recipe">{reward ? text(`3 × depth ${t.depth} → 1 × depth ${reward.depth}`, `3 × 深度 ${t.depth} → 1 × 深度 ${reward.depth}`) : text('Maximum depth reached', '已达到最高深度')}</p>
          <button className="games-btn quiet" disabled={!ready} onClick={() => merge(stackKey(t))}>{ready ? text('Merge 3 → 1', '合成 3 → 1') : reward ? text(`Need ${3 - t.count} more`, `还需 ${3 - t.count} 个`) : text('Complete', '已满级')}</button>
        </li>;
      })}</ul>
      {owned > 0 && !saved.stacks.some(t => familyFilter === 'all' || t.family === familyFilter) && <p>{text('No totems in this family yet.', '尚未收集到该族群的图腾。')}</p>}
    </section> : <section className="gc-banner gc-laws" role="tabpanel">
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
      <h2 className="gc-sub">{text(`Collection ${holderOwned} / ${pool.length}`, `收藏 ${holderOwned} / ${pool.length}`)}</h2>
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
    </section>}

    <p className="gc-fine">{text('Star ratings, odds, depth bands, upgrades and merging are site game mechanics, not canon. Your collection is saved on this browser and device only; clearing browser data erases it.', '星级、概率、深度区间、升级与合成是网站游戏机制，并非正典。收藏仅保存在当前浏览器与设备中；清除浏览器数据会删除收藏。')}</p>
  </div>;
}