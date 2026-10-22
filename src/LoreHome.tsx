import type { Article } from './api';
import { translate, type Language } from './i18n';

// This index contains only setting articles. Characters have their own main section.
export function LoreHome({ language, articles, browse }: {
  language: Language; articles: Article[]; browse: (category: string) => void;
}) {
  const text = (en: string, zh: string) => language === 'zh' ? zh : en;
  const sections = [
    ['World & laws', '∴', 'The foundations of reality', '现实的根基', 'Laws, inheritance, disproof, and the Axiom.', '法则、继承、证伪与公理。'],
    ['The pantheon', '♜', 'The order of the divine', '众神的秩序', 'The hierarchy of laws, their reach, and their limits.', '法则的层级、范围与边界。'],
    ['Creatures', '✧', 'Power before the gods', '神明之前的力量', 'Dragons, mythical families, totems, and the legacy of the hunt.', '龙族、神兽族群、图腾与狩猎的遗产。'],
    ['Timeline', '⌛', 'The world that came before', '世界的来路', 'Descend through the floors of the Tower of History.', '沿着历史之塔的楼层，回望过去。'],
  ];
  return <div className="lore-home">
    <header className="lore-intro"><p className="eyebrow">{text('QUODERAT / THE LORE LIBRARY', '证毕 / 世界设定馆')}</p><span className="lore-seal" aria-hidden="true">∴</span><h1>{text('The workings of a world.', '一个世界的运行之理。')}</h1><p>{text('Every law has a history. Every power has its limits. Explore the setting, one section at a time.', '每条法则都有历史，每种力量都有边界。从一个分区开始，深入世界的设定。')}</p></header>
    <div className="lore-section-grid">{sections.map(([category, symbol, en, zh, description, zdescription], index) => <button key={category} onClick={() => browse(category)}>
      <div className="lore-card-top"><small>0{index + 1} / {translate(language, category)}</small><span aria-hidden="true">{symbol}</span></div>
      <h2>{text(en, zh)}</h2><p>{text(description, zdescription)}</p>
      <div className="lore-card-footer"><span>{articles.filter(a => a.category === category).length} {text('entries', '个条目')}</span><span>{text('Explore section', '进入分区')} ↗</span></div>
    </button>)}</div>
    <button className="lore-all" onClick={() => browse('All lore')}>{text('Browse all lore', '浏览全部设定')} →</button>
  </div>;
}
