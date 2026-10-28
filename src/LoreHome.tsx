import type { Article } from './api';
import { Globe2, Scale, Flame, ScrollText, type LucideIcon } from 'lucide-react';
import { translate, type Language } from './i18n';

// This index contains only setting articles. Characters have their own main section.
export function LoreHome({
  language,
  articles,
  browse,
}: {
  language: Language;
  articles: Article[];
  browse: (category: string) => void;
}) {
  const text = (en: string, zh: string) => (language === 'zh' ? zh : en);
  const sections: [string, LucideIcon, string, string, string, string][] = [
    [
      'World & laws',
      Globe2,
      'The foundations of reality',
      '现实的根基',
      'Laws, inheritance, disproof, and the Axiom.',
      '法则、继承、证伪与公理。',
    ],
    [
      'The pantheon',
      Scale,
      'The order of the divine',
      '众神的秩序',
      'The hierarchy of laws, their reach, and their limits.',
      '法则的层级、范围与边界。',
    ],
    [
      'Creatures',
      Flame,
      'Power before the gods',
      '神明之前的力量',
      'Dragons, mythical families, totems, and the legacy of the hunt.',
      '龙族、神兽族群、图腾与狩猎的遗产。',
    ],
    [
      'Timeline',
      ScrollText,
      'The world that came before',
      '世界的来路',
      'Rewind the world and watch history change it.',
      '倒转时间，看历史如何改变世界。',
    ],
  ];
  return (
    <div className="lore-home">
      <header className="lore-intro">
        <h1>{text('The workings of a world.', '一个世界的运行之理。')}</h1>
        <p>
          {text(
            'Every law has a history. Every power has its limits. Explore the setting, one section at a time.',
            '每条法则都有历史，每种力量都有边界。从一个分区开始，深入世界的设定。',
          )}
        </p>
      </header>
      <div className="lore-section-grid">
        {sections.map(([category, Icon, en, zh, description, zdescription]) => (
          <button key={category} onClick={() => browse(category)}>
            <div className="lore-card-top">
              <small>{translate(language, category)}</small>
              <Icon aria-hidden="true" size={26} strokeWidth={1.4} />
            </div>
            <h2>{text(en, zh)}</h2>
            <p>{text(description, zdescription)}</p>
            <div className="lore-card-footer">
              <span>
                {((n) => text(`${n} ${n === 1 ? 'entry' : 'entries'}`, `${n} 个条目`))(
                  articles.filter((a) => a.category === category).length,
                )}
              </span>
              <span>{text('Explore section', '进入分区')} ↗</span>
            </div>
          </button>
        ))}
      </div>
      <button className="lore-all" onClick={() => browse('All lore')}>
        {text('Browse all lore', '浏览全部设定')} →
      </button>
    </div>
  );
}
