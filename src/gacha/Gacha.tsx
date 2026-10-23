import { useState, type CSSProperties } from 'react';
import type { Language } from '../i18n';
import { DEPTH_LANDMARKS, FAMILIES, TIERS, familyById, pullTotems, tierById, type Text, type Totem } from './pool';
import { STORAGE_KEY, addPulls, decodeCollection, emptyCollection, mergeReward, mergeStack, stackKey, type Collection } from './collection';
import '../game/games.css';
import './gacha.css';

// The gacha page. Totems pull for real; laws wait until their two ratings are settled.
// Pull history stays in this browser only.

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
  const [banner, setBanner] = useState<'totems' | 'laws' | 'workshop'>('totems');
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

  return <div className="gc">
    <header className="games-head">
      <h1>{text('Gacha', '抽卡')}</h1>
      <p>{text('The world condenses the power of the slain creatures back out as totems. See what it hands you.', '世界把被杀神兽的力量重新凝聚成图腾。看看它会交给你什么。')}</p>
    </header>

    <div className="gc-tabs" role="tablist" aria-label={text('Banners', '卡池')}>
      {(['totems', 'workshop', 'laws'] as const).map(id => <button key={id} role="tab" aria-selected={banner === id} onClick={() => setBanner(id)}>
        {id === 'totems' ? text('Totems', '图腾') : id === 'workshop' ? text('Mage & collection', '法师与收藏') : text('Laws', '法则')}
        {id === 'laws' && <small>{text('soon', '即将')}</small>}
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

    <p className="gc-fine">{text('Odds, depth bands and merging are site game mechanics, not canon. Your collection is saved on this browser and device only; clearing browser data erases it.', '概率、深度区间与合成是网站游戏机制，并非正典。收藏仅保存在当前浏览器与设备中；清除浏览器数据会删除收藏。')}</p>
  </div>;
}