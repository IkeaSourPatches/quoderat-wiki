import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { Article } from '../api';
import { emblems } from '../emblems';
import type { Language } from '../i18n';
import { DEPTH_LANDMARKS, FAMILIES, HOLDERS, MAX_UPGRADE, TIERS, BASE_RATES, CURRENT_BANNER, outcomeTable, validateBanner, PITY_LIMIT, pullMixed, upgradeLevel, type HolderRating, familyById,  tierById, type Text, type Totem } from './pool';
import { STORAGE_KEY, emptyCollection } from './collection';
import { SAVE_KEY, loadSave, emptySave, applyDraw, type GachaSave } from './save';
import '../game/games.css';
import './gacha.css';
import effectiveRates from './effective-rates.json';

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
    try { return { save: loadSave(localStorage.getItem(SAVE_KEY), localStorage.getItem(STORAGE_KEY), localStorage.getItem('quoderat-gacha-holders')), failed: false }; }
    catch { return { save: emptySave(), failed: true }; }
  });
  const [game, setGame] = useState<GachaSave>(initial.save);
  const saved = game.totems, holderLog = game.holders;
  const [storageFailed, setStorageFailed] = useState(false);
  const [familyFilter, setFamilyFilter] = useState('all');
  const save = (next: GachaSave) => {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(next)); setStorageFailed(false); }
    catch { setStorageFailed(true); return false; }
    setGame(next); return true;
  };
  const owned = saved.pools.reduce((sum, t) => sum + t.count, 0);

  const reset = () => {
    if (!window.confirm(text('Erase your totem inventory? Pity counters are kept.', '清空图腾收藏？保底计数将保留。'))) return;
    setResults([]); save({ ...game, totems: emptyCollection() });
  };
  // Only holders whose character page exists can be pulled, so names never go missing.
  const pages = new Map(articles.map(a => [a.slug, a]));
  const pool = HOLDERS.filter(h => pages.has(h.slug));
  const nameOf = (slug: string) => pages.get(slug)?.title ?? slug;
  const lawOf = (slug: string) => pages.get(slug)?.stats['Held law'] ?? '';
  const stars = (n: number) => <StarRow n={n} label={text(`${n} stars`, `${n} 星`)} />;

  let rosterReady = true;
  try { validateBanner(CURRENT_BANNER, pool); } catch { rosterReady = false; }
  const blocked = initial.failed || !rosterReady;
  const pull = (count: number) => {
    if (drawing.current || blocked) return;
    drawing.current = true;
    try {
      const draw = pullMixed(count, Math.random, pool, game.pity);
      const next = applyDraw(game, draw.rewards, draw.state);
      if (!save(next)) { drawing.current = false; return; }
      const copies = { ...holderLog.copies };
      setResults(draw.rewards.map(r => r.kind === 'totem' ? r : { ...r, copies: copies[r.rating.slug] = (copies[r.rating.slug] || 0) + 1 }));
      const animate = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      setRevealing(animate); drawing.current = animate;
    } catch { drawing.current = false; setStorageFailed(true); }
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

    {initial.failed && <p className="gc-warning" role="alert">{text('Your save could not be read. Drawing is paused to protect it; no saved data has been overwritten.', '无法读取存档。为保护数据，抽取已暂停，原数据未被覆盖。')}</p>}
    {!rosterReady && <p className="gc-warning" role="alert">{text('The banner roster is incomplete. Please wait for the character pages to load.', '卡池名单尚未完整加载，请等待人物页面加载。')}</p>}
    {storageFailed && <p className="gc-warning" role="alert">{text('Could not save this action. Your previous collection and pity are unchanged.', '此次操作未能保存，原收藏与保底计数未变。')}</p>}
    {banner === 'banner' ? <section className="gc-banner gc-summon" role="tabpanel">
      <div className={`gc-reveal-stage${revealing ? ' revealing' : ''}`} aria-busy={revealing}>
        <div className="gc-summon-orbit" aria-hidden="true"><span>✧</span></div>
        <small>{text('FEATURED 5★ · ONE SHARED BANNER', '当期 5★ · 混合卡池')}</small>
        <h2>{revealing ? text('Something is taking shape…', '某种力量正在成形……') : nameOf(CURRENT_BANNER.featured)}</h2>
        <p role="status">{revealing ? text('Your rewards are already in your collection.', '奖励已存入你的收藏。') : text('Law holders and totems share every draw.', '每次抽取都可能获得执律者或图腾。')}</p>
        {revealing && <button className="games-btn quiet" onClick={finishReveal}>{text('Skip animation', '跳过动画')}</button>}
      </div>
      <div className="gc-actions">
        <button className="games-btn" disabled={revealing || blocked} onClick={() => pull(1)}>{text('Pull ×1', '抽取 ×1')}</button>
        <button className="games-btn quiet" disabled={revealing || blocked} onClick={() => pull(10)}>{text('Pull ×10', '抽取 ×10')}</button>
      </div>
      <div className="gc-pity-counters" aria-live="polite">
        <div><small>{text('S+ guarantee', 'S+ 保底')}</small><strong>{game.pity.small} / 15</strong><span>{text(`Within ${PITY_LIMIT - game.pity.small} pulls`, `最多再抽 ${PITY_LIMIT - game.pity.small} 次`)}</span></div>
        <div><small>{text('5★ guarantee', '5★ 保底')}</small><strong>{game.pity.big} / 80</strong><span>{text(`Next single: ${percent(outcomeTable(game.pity)[0])} 5★`, `下次单抽：${percent(outcomeTable(game.pity)[0])} 5★`)}</span></div>
        <div><small>{text('Next 5★', '下一个 5★')}</small><strong>{game.pity.featuredGuaranteed ? text('Featured guaranteed', '必为当期角色') : '50 / 50'}</strong><span>{nameOf(CURRENT_BANNER.featured)}</span></div>
      </div>
      <p className="gc-guarantee">{text('Every ten-pull includes S+. All holders, S and SS count as S+.', '每次十连至少获得一个 S+。所有执律者、S 与 SS 均计入 S+。')}</p>
      <details className="gc-banner-odds"><summary>{text('Rates & guarantees', '概率与保底')}</summary>
        <table className="gc-rate-table"><caption>{text('Base rates before guarantees', '保底前的基础概率')}</caption>
          <thead><tr><th>{text('Outcome', '结果')}</th><th>{text('Chance', '概率')}</th></tr></thead>
          <tbody>{BASE_RATES.map(r => <tr key={r.label}><td>{r.label}</td><td>{percent(r.chance)}</td></tr>)}</tbody>
        </table>
        <p>{text('After 14 consecutive non-S+ results, pull 15 guarantees S+. If the first nine results of a ten-pull contain no S+, its tenth guarantees S+. Both protections can trigger together, producing one reward.', '连续 14 抽未出 S+，第 15 抽必出。十连前九抽未出 S+，第十抽必出。两种保底同时触发时仅获得一个奖励。')}</p>
        <p>{text('5★ stays at 0.6% through pull 54, then adds 1 percentage point per pull: 55 = 1.6%, 66 = 12.6%, 79 = 25.6%, 80 = 100%. Other tiers scale proportionally. Forced S+ removes A/B and renormalizes all remaining tiers, including 5★ (pull 66 becomes about 57%).', '5★ 前 54 抽为 0.6%，此后每抽增加 1 个百分点：第 55 抽 1.6%、第 66 抽 12.6%、第 79 抽 25.6%、第 80 抽 100%。其他等级按比例缩放。S+ 保底移除 A/B，再对包括 5★ 在内的剩余等级归一化（第 66 抽约为 57%）。')}</p>
        <p>{text('Every 5★ has a 50% featured chance. An off-banner 5★ guarantees the next 5★ is featured. All 5★ reset both counters; other S+ reset only the small counter. Lower results never consume the featured guarantee.', '每个 5★ 有 50% 概率为当期角色。抽到非当期 5★ 后，下个 5★ 必为当期。5★ 重置大小保底；其他 S+ 仅重置小保底。较低等级不会消耗当期保底。')}</p>
        <p>{text('Counters and the featured guarantee carry across banners and sessions; the ten-pull tracker belongs only to its batch. Old collections are preserved; new 5★ pity starts at zero because old saves did not record it. Resetting an inventory keeps pity.', '大小保底与当期保证跨卡池、跨访问保留；十连追踪仅限本次十连。旧收藏保留，旧版本未记录的 5★ 保底从零开始。清空收藏不会清空保底。')}</p>
        <p>{text('Off-banner 5★ (equally likely): ', '非当期 5★（等概率）：')}{[...new Set([...CURRENT_BANNER.permanent, ...CURRENT_BANNER.pastFeatured])].filter(s => s !== CURRENT_BANNER.featured).map(nameOf).join(' · ')}</p>
        <p>{text('Featured from zero pity: minimum 1, maximum 160 pulls. Effective rates include guarantees and depend on single versus ten-pull play.', '零保底起抽：当期角色最少 1 抽、最多 160 抽。实际概率包含保底，随单抽或十连方式变化。')}</p>
        <table className="gc-rate-table"><caption>{text('Simulated effective rates · 10 million pulls per mode', '模拟实际概率 · 每种方式 1,000 万抽')}</caption>
          <thead><tr><th>{text('Mode', '方式')}</th><th>5★</th><th>S+</th></tr></thead>
          <tbody>{(['singles', 'tens', 'mixed'] as const).map(mode => <tr key={mode}><td>{mode === 'singles' ? text('Singles', '单抽') : mode === 'tens' ? text('Ten-pulls', '十连') : text('Alternating ×1 / ×10', '交替单抽与十连')}</td><td>{effectiveRates[mode].five.toFixed(3)}%</td><td>{effectiveRates[mode].rare.toFixed(3)}%</td></tr>)}</tbody>
        </table>
        <p>{text(`Featured: 1 minimum / approximately ${effectiveRates.singles.featured.toFixed(1)} pulls on average with singles, ${effectiveRates.tens.featured.toFixed(1)} with ten-pulls / 160 maximum. These are simulated intervals between featured rewards, not a promise for an individual session.`, `当期角色：最少 1 抽 / 单抽平均约 ${effectiveRates.singles.featured.toFixed(1)} 抽、十连平均约 ${effectiveRates.tens.featured.toFixed(1)} 抽 / 最多 160 抽。这是两次当期奖励间隔的模拟值，并非单次游玩的承诺。`)}</p>
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
      <p className="gc-history">{history(text(`Holder pulls: ${holderLog.total}`, `执律者抽取次数：${holderLog.total}`), () => { if (window.confirm(text('Erase holder inventory? Pity is kept.', '清空执律者收藏？保底保留。'))) { setResults([]); save({ ...game, holders: { total: 0, copies: {} } }); } }, holderLog.total)}</p>
    </section>}

    <p className="gc-fine">{text('Star ratings, odds, depth bands, upgrades and power pools are site game mechanics, not canon. Your collection is saved on this browser and device only; clearing browser data erases it.', '星级、概率、深度区间、升级与力量池是网站游戏机制，并非正典。收藏仅保存在当前浏览器与设备中；清除浏览器数据会删除收藏。')}</p>
  </div>;
}