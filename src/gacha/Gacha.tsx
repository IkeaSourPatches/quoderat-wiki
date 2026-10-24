import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { Article } from '../api';
import { emblems } from '../emblems';
import type { Language } from '../i18n';
import { DEPTH_LANDMARKS, FAMILIES, HOLDERS, MAX_UPGRADE, STAR_ODDS, TIERS, RARE_CHANCE, PITY_LIMIT, pullMixed, upgradeLevel, type HolderRating, familyById,  tierById, type Text, type Totem } from './pool';
import { STORAGE_KEY, addPulls, decodeCollection, emptyCollection, type Collection } from './collection';
import '../game/games.css';
import './gacha.css';

// Law holders and totems have separate local saves; totem depth accumulates by type.

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
const percent = (chance: number) => `${+(chance * 100).toFixed(2)}%`;

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
  const [banner, setBanner] = useState<'banner' | 'laws' | 'workshop'>('banner');
  const [results, setResults] = useState<({ kind: 'totem'; totem: Totem } | ({ kind: 'holder' } & HolderResult))[]>([]);
  const [revealing, setRevealing] = useState(false);
  const drawing = useRef(false);
  useEffect(() => {
    if (!revealing) return;
    const timer = window.setTimeout(() => { setRevealing(false); drawing.current = false; }, 1600);
    return () => window.clearTimeout(timer);
  }, [revealing]);
  const [initial] = useState(() => {
    try { return { saved: decodeCollection(localStorage.getItem(STORAGE_KEY)), failed: false }; }
    catch { return { saved: emptyCollection(), failed: true }; }
  });
  const [saved, setSaved] = useState<Collection>(initial.saved);
  const [storageFailed, setStorageFailed] = useState(initial.failed);
  const [familyFilter, setFamilyFilter] = useState('all');
  const save = (next: Collection) => {
    setSaved(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); setStorageFailed(false); }
    catch { setStorageFailed(true); }
  };
  const owned = saved.pools.reduce((sum, t) => sum + t.count, 0);

  const reset = () => {
    if (!window.confirm(text('Erase your entire collection and pull history on this browser?', '清空本浏览器中的全部收藏与抽取记录？'))) return;
    setResults([]); save(emptyCollection());
  };
  // Only holders whose character page exists can be pulled, so names never go missing.
  const pages = new Map(articles.map(a => [a.slug, a]));
  const pool = HOLDERS.filter(h => pages.has(h.slug));
  const nameOf = (slug: string) => pages.get(slug)?.title ?? slug;
  const lawOf = (slug: string) => pages.get(slug)?.stats['Held law'] ?? '';
  const stars = (n: number) => <StarRow n={n} label={text(`${n} stars`, `${n} 星`)} />;

  const [holderLog, saveHolders] = useStored<HolderLog>('quoderat-gacha-holders', { total: 0, copies: {} }, v => typeof v.total === 'number' && typeof v.copies === 'object');


  const pull = (count: number) => {
    if (drawing.current) return;
    drawing.current = true;
    const copies = { ...holderLog.copies };
    const draw = pullMixed(count, Math.random, pool, saved.misses);
    const got = draw.rewards;
    const totems = got.flatMap(r => r.kind === 'totem' ? [r.totem] : []);
    const rewards = got.map(r => r.kind === 'totem' ? r : { ...r, copies: copies[r.rating.slug] = (copies[r.rating.slug] || 0) + 1 });
    save({ ...addPulls(saved, totems), misses: draw.misses });
    saveHolders({ total: holderLog.total + got.length - totems.length, copies });
    setResults(rewards);
    const animate = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setRevealing(animate); drawing.current = animate;
  };
  const finishReveal = () => { setRevealing(false); drawing.current = false; };
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
      {(['banner', 'laws', 'workshop'] as const).map(id => <button key={id} role="tab" aria-selected={banner === id} onClick={() => setBanner(id)}>
        {id === 'banner' ? text('Summon', '召唤') : id === 'workshop' ? text('Totem pools', '图腾池') : text('Law holders', '执律者')}
      </button>)}
    </div>

    {storageFailed && <p className="gc-warning" role="alert">{text('Local storage could not be read or saved. Your current collection may only last for this visit.', '无法读取或保存本地数据。当前收藏可能仅在本次访问中保留。')}</p>}
    {banner === 'banner' ? <section className="gc-banner gc-summon" role="tabpanel">
      <div className={`gc-reveal-stage${revealing ? ' revealing' : ''}`} aria-busy={revealing}>
        <div className="gc-summon-orbit" aria-hidden="true"><span>✧</span></div>
        <small>{text('ONE WORLD · ONE BANNER', '同一世界 · 同一卡池')}</small>
        <h2>{revealing ? text('Something is taking shape…', '某种力量正在成形……') : text('What will answer?', '谁将回应？')}</h2>
        <p role="status">{revealing ? text('Your rewards are already in your collection.', '奖励已存入你的收藏。') : text('Law holders and totems share every draw.', '每次抽取都可能获得执律者或图腾。')}</p>
        {revealing && <button className="games-btn quiet" onClick={finishReveal}>{text('Skip animation', '跳过动画')}</button>}
      </div>
      <div className="gc-actions">
        <button className="games-btn" disabled={revealing} onClick={() => pull(1)}>{text('Pull ×1', '抽取 ×1')}</button>
        <button className="games-btn quiet" disabled={revealing} onClick={() => pull(10)}>{text('Pull ×10', '抽取 ×10')}</button>
      </div>
      <p className="gc-history">{text(`${percent(RARE_CHANCE)} rare chance: holder, S or SS. Guaranteed within ${PITY_LIMIT - saved.misses} more pulls.`, `${percent(RARE_CHANCE)} 稀有概率：执律者、S 或 SS。最多再抽 ${PITY_LIMIT - saved.misses} 次必出。`)}</p>
      <p className="gc-guarantee">{text('Singles and ten-pulls share the guarantee. Any rare reward resets it.', '单抽与十连共用保底。获得任意稀有奖励后重新计数。')}</p>
      <details className="gc-banner-odds"><summary>{text('Rates & guarantee', '概率与保底')}</summary>
        <table className="gc-rate-table"><caption>{text('Base rates per draw, before the guarantee', '每次抽取的基础概率（保底前）')}</caption>
          <thead><tr><th>{text('Outcome', '结果')}</th><th>{text('Chance', '概率')}</th></tr></thead>
          <tbody>{(pool.length ? [['5★', .001], ['4★', .0065], ['SS', .015], ['3★', .0425], ['S', .035], ['A', .15], ['B', .75]] : [['SS', .03], ['S', .07], ['A', .15], ['B', .75]]).map(([label, chance]) => <tr key={label}><td>{label}</td><td>{percent(Number(chance))}</td></tr>)}</tbody>
        </table>
        <p>{text('After nine non-rare pulls, the next is rare. Within a rare draw: 50% holder, 35% S, 15% SS. The guarantee raises the effective rare rate above 10%.', '连续九次未出稀有后，下次必出。稀有奖励内部：执律者 50%、S 35%、SS 15%。保底会使实际稀有获得率高于 10%。')}</p>
        <p>{text('Totem tier weights: 75 / 15 / 7 / 3. B and A fill the normal bucket; S and SS share the totem side of the rare bucket.', '图腾分级权重：75 / 15 / 7 / 3。B 与 A 分配普通池，S 与 SS 分配稀有池的图腾部分。')}</p>
        <p>{text('Holder star odds', '执律者星级概率')}: {STAR_ODDS.map(o => `${o.stars}★ ${percent(o.chance)}`).join(' · ')}</p>
        <p>{TIERS.map(t => `${tx(t.name)} ${t.depth[0]}–${t.depth[1]}`).join(' · ')}</p>
      </details>
      {!revealing && results.length > 0 && <ul className={`gc-results${results.length === 1 ? ' single' : ''}`} aria-live="polite">
        {results.map((r, i) => {
          if (r.kind === 'holder') {
            const h = r.rating;
            return <li key={`${saved.total + holderLog.total}-${i}`} className={`gc-card gc-holder stars-${h.stars}`} style={{ '--i': i } as CSSProperties}>
              <span className={`gc-badge${r.copies === 1 ? ' new' : ''}`}>{badge(r.copies)}</span>
              <span className="gc-glyph" aria-hidden="true">{emblems[h.slug] || '✧'}</span>
              <small>{text('Law holder', '执律者')}</small>{stars(h.stars)}<strong>{nameOf(h.slug)}</strong><span className="gc-creature">{lawOf(h.slug)}</span>
              <dl className="gc-ratings"><dt>{text('Range', '范围')}</dt><dd>{h.range}/5</dd><dt>{text('Impact', '影响因子')}</dt><dd>{h.impact}/5</dd></dl>
              <Pips level={upgradeLevel(r.copies)} label={text(`Upgrade ${upgradeLevel(r.copies)}`, `升级 ${upgradeLevel(r.copies)}`)} />
            </li>;
          }
          const t = r.totem, f = familyById(t.family);
          return <li key={`${saved.total + holderLog.total}-${i}`} className={`gc-card tier-${t.tier}`} style={{ '--c': f.colour, '--i': i } as CSSProperties}>
            <span className="gc-glyph" aria-hidden="true">{f.glyph}</span><small>{text('Totem', '图腾')} · {tx(tierById(t.tier).name)}</small><strong>{tx(f.power)}</strong><span className="gc-creature">{tx(f.creature)}</span>
            <span className="gc-pool-gain">{text(`+${t.depth} power · Pool total ${saved.pools.find(p => p.family === t.family)?.power ?? 0}`, `力量 +${t.depth} · 池内总计 ${saved.pools.find(p => p.family === t.family)?.power ?? 0}`)}</span>
            <DepthBar depth={t.depth} tx={tx} label={text(`Depth ${t.depth} of 100`, `深度 ${t.depth}/100`)} />
          </li>;
        })}
      </ul>}
    </section> : banner === 'workshop' ? <section className="gc-banner gc-workshop" role="tabpanel">
      <header className="gc-mage">
        <span className="gc-mage-sigil" aria-hidden="true">✧</span>
        <div><small>{text('THE MAGE’S WORKSHOP', '法师工坊')}</small><h2>{text('One pool for every type.', '每种图腾，共用一个池。')}</h2>
        <p>{text('Every pull adds its depth to its type’s power pool. Earth 20 + Earth 25 = Earth 45. Different types stay separate; no matching depths or manual merging needed.', '每次抽取的深度直接加入对应类型的力量池。土 20 + 土 25 = 土 45。不同类型各自累积，无需匹配深度或手动合成。')}</p></div>
      </header>
      <div className="gc-collection-stats"><span>{text(`${owned} owned`, `持有 ${owned} 个`)}</span><span>{text(`${saved.pools.length} types`, `${saved.pools.length} 种类型`)}</span><span>{text(`Total power: ${saved.pools.reduce((n, p) => n + p.power, 0)}`, `总力量：${saved.pools.reduce((n, p) => n + p.power, 0)}`)}</span></div>
      {saved.recovered && <p className="gc-warning">{text('Recovered the last 50 pulls available in your old save. Earlier rewards were not stored by the old version.', '已恢复旧存档中保留的最近抽取（最多 50 个）。旧版本未保存更早的奖励。')}</p>}

      <label className="gc-filter">{text('Family', '族群')} <select value={familyFilter} onChange={e => setFamilyFilter(e.target.value)}>
        <option value="all">{text('All families', '全部族群')}</option>
        {FAMILIES.map(f => <option key={f.id} value={f.id}>{tx(f.power)}</option>)}
      </select></label>
      {!owned && <div className="gc-empty"><h3>{text('Your shelves are waiting.', '收藏架正等待着你。')}</h3><p>{text('Pull a few totems to start your collection. Every reward stays here after you reload.', '抽取一些图腾来开启收藏。刷新页面后，奖励仍会保留在这里。')}</p><button className="games-btn" onClick={() => setBanner('banner')}>{text('Go to the banner', '前往卡池')}</button></div>}
      <ul className="gc-results gc-inventory">{saved.pools.filter(t => familyFilter === 'all' || t.family === familyFilter).map(t => {
        const f = familyById(t.family);
        return <li key={t.family} className="gc-card" style={{ '--c': f.colour } as CSSProperties}>
          <span className="gc-stock">×{t.count}</span><span className="gc-glyph" aria-hidden="true">{f.glyph}</span><strong>{tx(f.power)}</strong>
          <span className="gc-depth-num">{text('Pooled power', '池内力量')} <b>{t.power}</b></span>
          <p className="gc-recipe">{text(`${t.count} totems combined automatically`, `${t.count} 个图腾已自动汇入`)}</p>
        </li>;
      })}</ul>
      {owned > 0 && !saved.pools.some(t => familyFilter === 'all' || t.family === familyFilter) && <p>{text('No totems in this family yet.', '尚未收集到该族群的图腾。')}</p>}
      <p className="gc-history">{history(text(`Totems drawn: ${saved.total}`, `已抽图腾：${saved.total}`), reset, saved.total)}</p>
    </section> : <section className="gc-banner gc-laws" role="tabpanel">
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
      <p className="gc-history">{history(text(`Holder pulls: ${holderLog.total}`, `执律者抽取次数：${holderLog.total}`), () => { setResults([]); saveHolders({ total: 0, copies: {} }); }, holderLog.total)}</p>
    </section>}

    <p className="gc-fine">{text('Star ratings, odds, depth bands, upgrades and power pools are site game mechanics, not canon. Your collection is saved on this browser and device only; clearing browser data erases it.', '星级、概率、深度区间、升级与力量池是网站游戏机制，并非正典。收藏仅保存在当前浏览器与设备中；清除浏览器数据会删除收藏。')}</p>
  </div>;
}