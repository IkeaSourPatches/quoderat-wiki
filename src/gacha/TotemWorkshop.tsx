import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { Language } from '../i18n';
import { FAMILIES, familyById, tierById, type Text } from './pool';
import { equipTotem, inventoryStacks, mergeCandidates, mergeTotems, discardTotem, type Collection } from './collection';

export function TotemWorkshop({ saved, language, onChange, onSummon }: {
  saved: Collection; language: Language; onChange: (next: Collection) => boolean; onSummon: () => void;
}) {
  const text = (en: string, zh: string) => language === 'zh' ? zh : en;
  const tx = (t: Text) => language === 'zh' ? t.zh : t.en;
  const workbenchTitle = useRef<HTMLHeadingElement>(null);
  const [selectedId, select] = useState<number | null>(null);
  useEffect(() => { if (selectedId !== null) workbenchTitle.current?.focus(); }, [selectedId]);
  const [activeSlot, setSlot] = useState(0);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(0);
  const [notice, setNotice] = useState('');
  const selected = saved.items.find(t => t.id === selectedId);
  const upgrade = selected ? mergeCandidates(saved, selected.id) : null;
  const choose = (id: number) => { select(id); setConfirmDiscard(false); setNotice(''); };
  const commit = (next: Collection, message: string) => { if (!onChange(next)) return false; setNotice(message); return true; };
  const stacks = inventoryStacks(saved);
  const selectedStack = stacks.find(s => s.items.some(t => t.id === selectedId));
  const filtered = stacks.filter(t => filter === 'all' || t.family === filter);
  const currentPage = Math.min(page, Math.max(0, Math.ceil(filtered.length / 24) - 1));
  const equipped = saved.slots.flatMap(id => { const t = saved.items.find(t => t.id === id); return t ? [t] : []; });
  const active = saved.items.find(t => t.id === saved.slots[activeSlot]);
  const name = (family: string) => tx(familyById(family).power);
  return <section className="gc-banner gc-workshop" role="tabpanel" aria-label={text('Totem display and workshop', '图腾展示与工坊')}>
    <header className="gc-mage">
      <span className="gc-mage-sigil" aria-hidden="true">✧</span>
      <div><small>{text('THE MAGE’S WORKSHOP', '法师工坊')}</small><h2>{text('Eight places. Your signature.', '八个位置，你的印记。')}</h2>
      <p>{text('Choose a display slot, then equip a totem from your inventory. Upgrade matching totems: 10 B → A, 20 A → S, 30 S → SS. Removing a display returns it to inventory.', '选择展示位，再从收藏中装备图腾。同类型升级：10 B → A、20 A → S、30 S → SS。卸下后，图腾仍保留在收藏中。')}</p></div>
    </header>
    <div className="gc-collection-stats"><span>{text(`${equipped.length} / 8 equipped`, `已装备 ${equipped.length} / 8`)}</span><span>{text(`Display power: ${equipped.reduce((n, t) => n + t.power, 0)}`, `展示力量：${equipped.reduce((n, t) => n + t.power, 0)}`)}</span><span>{text(`${saved.items.length} inventory items`, `收藏 ${saved.items.length} 件`)}</span></div>
    <ol className="gc-display" aria-label={text('Eight display slots', '八个展示位')}>
      {saved.slots.map((id, i) => {
        const t = saved.items.find(t => t.id === id), f = t ? familyById(t.family) : null;
        return <li key={i} style={{ '--c': f?.colour ?? '#c9b482' } as CSSProperties}>
          <button className={`gc-display-slot${activeSlot === i ? ' active' : ''}${t ? ' filled' : ''}`} aria-pressed={activeSlot === i}
            aria-label={text(`Slot ${i + 1}: ${t ? `${name(t.family)}, power ${t.power}` : 'empty'}`, `展示位 ${i + 1}：${t ? `${name(t.family)}，力量 ${t.power}` : '空'}`)}
            onClick={() => { setSlot(i); setConfirmDiscard(false); }}>
            <small>{String(i + 1).padStart(2, '0')}</small><span className="gc-display-glyph" aria-hidden="true">{f?.glyph ?? '+'}</span>
            <strong>{t ? name(t.family) : text('Empty slot', '空展示位')}</strong><span>{t ? text(`${t.power} power`, `力量 ${t.power}`) : text('Select to equip', '选择以装备')}</span>
          </button>
          {t && <button className="games-link gc-unequip" onClick={() => commit(equipTotem(saved, null, i), text(`Slot ${i + 1} cleared. Totem kept in inventory.`, `已清空展示位 ${i + 1}，图腾仍在收藏中。`))}>{text('Unequip', '卸下')}<span className="gc-sr-only"> {i + 1}</span></button>}
        </li>;
      })}
    </ol>
    <div className="gc-workbench">
      <header><small>{text('WORKBENCH', '合成台')}</small><h3 ref={workbenchTitle} tabIndex={-1}>{selected ? `${name(selected.family)} · #${selected.id}` : text('Select a totem below', '从下方选择图腾')}</h3></header>
      {selected ? <>
        <label className="gc-copy-picker">{text('Copy in this stack', '此堆叠中的图腾')}
          <select value={selected.id} onChange={e => choose(Number(e.target.value))}>
            {selectedStack?.items.map(t => <option key={t.id} value={t.id}>#{t.id} · {t.power} {text('power', '力量')}{saved.slots.includes(t.id) ? text(` · slot ${saved.slots.indexOf(t.id) + 1}`, ` · 展示位 ${saved.slots.indexOf(t.id) + 1}`) : text(' · unequipped', ' · 未装备')}</option>)}
          </select>
        </label>
        <p>{text(`${selected.power} power · ${selected.count} original ${selected.count === 1 ? 'totem' : 'totems'}`, `力量 ${selected.power} · 来自 ${selected.count} 个原始图腾`)}</p>
        <div className="gc-workbench-actions">
          <button className="games-btn" disabled={saved.slots[activeSlot] === selected.id} onClick={() => commit(equipTotem(saved, selected.id, activeSlot), text(`Equipped in slot ${activeSlot + 1}.`, `已装备到展示位 ${activeSlot + 1}。`))}>
            {text(`${active && active.id !== selected.id ? 'Replace' : 'Equip in'} slot ${activeSlot + 1}`, `${active && active.id !== selected.id ? '替换' : '装备到'}展示位 ${activeSlot + 1}`)}
          </button>
          <button className="games-link" onClick={() => setConfirmDiscard(!confirmDiscard)}>{text('Discard…', '丢弃……')}</button>
        </div>
        {active && active.id !== selected.id && <p className="gc-recipe">{text(`${name(active.family)} (${active.power}) will stay in your inventory.`, `${name(active.family)}（${active.power}）将留在收藏中。`)}</p>}
        {confirmDiscard && <div className="gc-discard-confirm" role="group" aria-label={text('Confirm discard', '确认丢弃')}>
          <p>{text(`Discard ${name(selected.family)} #${selected.id} and its ${selected.power} power permanently?${saved.slots.includes(selected.id) ? ' It will also be removed from your display.' : ''}`, `永久丢弃 ${name(selected.family)} #${selected.id} 及其 ${selected.power} 点力量？${saved.slots.includes(selected.id) ? '它也会从展示位移除。' : ''}`)}</p>
          <button className="games-btn quiet" onClick={() => { if (commit(discardTotem(saved, selected.id), text('Totem discarded.', '图腾已丢弃。'))) { select(null); setConfirmDiscard(false); } }}>{text('Confirm discard', '确认丢弃')}</button>
          <button className="games-link" onClick={() => setConfirmDiscard(false)}>{text('Cancel', '取消')}</button>
        </div>}
        <div className="gc-merge-controls">
          {upgrade?.recipe ? <>
            <h4>{upgrade.recipe.cost} {selected.tier ? tx(tierById(selected.tier).name) : ''} → 1 {tx(tierById(upgrade.recipe.next).name)}</h4>
            <p>{text(`Matching available: ${upgrade.available} / ${upgrade.recipe.cost}. Other equipped totems are protected. Lowest-power unequipped copies are used first.`, `可用同类型同等级图腾：${upgrade.available} / ${upgrade.recipe.cost}。其他已装备图腾不会被消耗，优先使用未装备且力量最低的图腾。`)}</p>
            <p className="gc-merge-preview">{text('Result: ', '结果：')}{name(selected.family)} · {tx(tierById(upgrade.recipe.next).name)} · {tierById(upgrade.recipe.next).depth[0]} {text('power', '力量')}</p>
            {upgrade.available >= upgrade.recipe.cost && <p className="gc-recipe">{text('Consumes: ', '消耗：')}{upgrade.ids.map(id => `#${id}`).join(', ')}. {text('The selected totem becomes the upgrade and keeps its slot.', '所选图腾将升级并保留展示位。')}</p>}
            <button className="games-btn quiet" disabled={upgrade.available < upgrade.recipe.cost} onClick={() => { if (commit(mergeTotems(saved, selected.id, upgrade.ids.slice(1)), text('Totem upgraded.', '图腾已升级。'))) setConfirmDiscard(false); }}>{text(`Consume ${upgrade.recipe.cost} & upgrade`, `消耗 ${upgrade.recipe.cost} 个并升级`)}</button>
          </> : <p>{text('SS is the highest rank. Keep duplicates for another slot; their power cannot be added together.', 'SS 为最高等级。重复图腾可用于其他展示位，力量不能相加。')}</p>}
        </div>
      </> : <p>{text('Equip your favourites, merge matching types, or discard what you no longer want.', '装备喜爱的图腾，合并同类型图腾，或丢弃不再需要的图腾。')}</p>}
      <p className="gc-workshop-status" role="status">{notice}</p>
    </div>
    <div className="gc-inventory-heading"><h3>{text('Your inventory', '你的收藏')}</h3><label className="gc-filter">{text('Type', '类型')} <select value={filter} onChange={e => { setFilter(e.target.value); setPage(0); }}><option value="all">{text('All types', '全部类型')}</option>{FAMILIES.map(f => <option key={f.id} value={f.id}>{tx(f.power)}</option>)}</select></label></div>
    {!saved.items.length ? <div className="gc-empty"><p>{text('Pull some totems to start your display.', '抽取图腾，开始布置你的展示。')}</p><button className="games-btn" onClick={onSummon}>{text('Go to the banner', '前往卡池')}</button></div> : <>
      <p className="gc-recipe">{text('Automatically stacked by type and rank. Select a stack to manage individual copies.', '按类型与等级自动堆叠。选择堆叠后可管理其中的单个图腾。')}</p>
      <ul className="gc-totem-inventory">{filtered.slice(currentPage * 24, currentPage * 24 + 24).map(stack => {
        const f = familyById(stack.family), representative = stack.items.find(t => !saved.slots.includes(t.id)) ?? stack.items[0];
        const isSelected = selectedStack?.key === stack.key;
        return <li key={stack.key}><button className={`gc-totem-item${isSelected ? ' selected' : ''}`} style={{ '--c': f.colour } as CSSProperties} aria-pressed={isSelected} onClick={() => choose(representative.id)}>
          <small>{stack.tier ? tx(tierById(stack.tier).name) : text('Merged', '已合并')} <span className="gc-stack-count">×{stack.items.length}</span></small>
          <span className="gc-glyph" aria-hidden="true">{f.glyph}</span><strong>{tx(f.power)}</strong>
          <b>{stack.minPower === stack.maxPower ? stack.minPower : `${stack.minPower}–${stack.maxPower}`} <span>{text('power each', '单个力量')}</span></b>
          <em>{text(`${stack.equipped} equipped · ${stack.items.length - stack.equipped} available`, `已装备 ${stack.equipped} · 可用 ${stack.items.length - stack.equipped}`)}</em>
        </button></li>;
      })}</ul>
      {!filtered.length && <p>{text('No totems of this type yet.', '尚无此类型的图腾。')}</p>}
      {filtered.length > 24 && <nav className="gc-inventory-pages" aria-label={text('Inventory pages', '收藏分页')}><button className="games-link" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>{text('Previous', '上一页')}</button><span>{currentPage + 1} / {Math.ceil(filtered.length / 24)}</span><button className="games-link" disabled={(currentPage + 1) * 24 >= filtered.length} onClick={() => setPage(currentPage + 1)}>{text('Next', '下一页')}</button></nav>}
    </>}
    <p className="gc-history">{text(`Totems drawn: ${saved.total} · Inventory power: ${saved.items.reduce((n, t) => n + t.power, 0)}`, `累计抽取图腾：${saved.total} · 收藏力量：${saved.items.reduce((n, t) => n + t.power, 0)}`)}</p>
  </section>;
}
