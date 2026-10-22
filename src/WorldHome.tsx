import type { Article } from './api';
import { translate, type Language } from './i18n';

// The world introduction is editorial presentation of the existing canon.
// It is typeset like a proof: a theorem, its axioms, and the people bound by them.
// Article slugs connect every invitation to the same bilingual reading pages.

const featured = ['the-spear-and-shield', 'the-open-question', 'ilar-hesabu', 'sai'];
const loreSections = [
  ['World & laws', 'Laws, inheritance, disproof and the Axiom.', '法则、继承、证伪与公理。'],
  ['The pantheon', 'Who holds which law, and how far it reaches.', '谁执掌哪条法则，其范围又有多广。'],
  ['Creatures', 'Dragons, the other families, and the legacy of the hunt.', '龙族、其他神兽族群与狩猎的遗产。'],
  ['Timeline', 'The Tower of History, floor by floor.', '历史之塔，一层一层。'],
];

// Sai's botched four-colour map: regions D and G share a border and a colour.
const regions: [string, string][] = [
  ['M0 0 L120 0 L105 70 L0 85 Z', 'verdigris'],
  ['M120 0 L300 0 L300 60 L190 75 L105 70 Z', 'oxblood'],
  ['M0 85 L105 70 L130 135 L0 160 Z', 'oxblood'],
  ['M105 70 L190 75 L200 140 L130 135 Z', 'ochre'],
  ['M190 75 L300 60 L300 150 L200 140 Z', 'verdigris'],
  ['M0 160 L130 135 L150 200 L0 200 Z', 'verdigris'],
  ['M130 135 L200 140 L300 150 L300 200 L150 200 Z', 'ochre'],
];

export function WorldHome({ language, articles, open, browse, emblems, lawExpressions }: {
  language: Language; articles: Article[]; open: (slug: string) => void; browse: (category: string) => void;
  emblems: Record<string, string>; lawExpressions: Record<string, string>;
}) {
  const text = (en: string, cn: string) => language === 'zh' ? cn : en;
  const people = featured.map(slug => articles.find(a => a.slug === slug)).filter((a): a is Article => !!a);
  const count = (category: string) => articles.filter(a => a.category === category).length;
  // Folio numbers match each character's position in the Characters gallery.
  const folio = (slug: string) => String(articles.filter(a => a.category === 'Characters').findIndex(a => a.slug === slug) + 1).padStart(3, '0');
  const characters = count('Characters');
  return <div className="qd-home">
    <section className="qd-theorem" aria-labelledby="qd-title">
      <p className="qd-runin">{text('Theorem.', '定理。')}</p>
      <h1 id="qd-title">{text('Quoderat', '证毕')}</h1>
      <p className="qd-statement">{text('Even gods must withstand a proof.', '即使是神，也必须经得起证明。')}</p>
      <p className="qd-proof"><em>{text('Proof.', '证明。')}</em> {text(
        'In this world each natural law can have only one holder at a time, and holding it makes you a god. Power decides status, and status rests on a law that someone, somewhere, is trying to disprove.',
        '在这个世界里，每一条自然法则同一时间只能有一位执律者，执掌它便成为神。力量决定地位，而地位立足于一条法则之上，总有人在某处试图证伪它。'
      )}<span className="qd-qed" aria-label={text('end of proof', '证毕')} /></p>
      <div className="qd-actions">
        <button className="qd-primary" onClick={() => open('lore')}>{text('Explore the lore', '探索世界设定')}</button>
        <button className="qd-secondary" onClick={() => browse('Characters')}>{text(`Meet all ${characters} characters`, `认识全部 ${characters} 位人物`)}</button>
      </div>
    </section>

    <section className="qd-axioms" aria-labelledby="qd-axioms-title">
      <h2 id="qd-axioms-title">{text('The rules every god lives by', '每位神都要遵守的规则')}</h2>
      <ol>
        <li><strong>{text('One law, one holder.', '一条法则，一位执律者。')}</strong> {text('A law can never be shared, and no one can hold two.', '法则永远不能共享，也没有人能同时执掌两条。')}</li>
        <li><strong>{text('Reach is power.', '范围即力量。')}</strong> {text('The broader the law, the more of the world its holder can nudge.', '法则越宽广，执律者能推动的世界就越多。')}</li>
        <li><strong>{text('Wording is weakness.', '措辞即弱点。')}</strong> {text('Disprove a holder’s formulation and their law shrinks, or they die.', '证伪执律者的表述，其法则便会缩小，或者他们会死去。')}</li>
      </ol>
      <button className="qd-link" onClick={() => open('law-holders')}>{text('Read how law holders work', '阅读执律者如何运作')}</button>
    </section>

    <section className="qd-people" aria-labelledby="qd-people-title">
      <div className="qd-section-head">
        <h2 id="qd-people-title">{text('A law is not a life.', '法则之外，还有人生。')}</h2>
        <p>{text('Behind every principle is someone with something to lose.', '每一条原则背后，都有一个不能承受失去的人。')}</p>
      </div>
      <div className="entry-list character-gallery qd-gallery">
        {people.map((a, index) => <button key={a.slug} onClick={() => open(a.slug)}>
          <div className={`character-art tone-${index % 4}`} aria-hidden="true">
            <span className="folio-number">{folio(a.slug)} / QUODERAT</span>
            <div className="engraving-orbit" /><div className="engraving-diamond" />
            <span className="character-emblem">{emblems[a.slug] || '✧'}</span>
            <span className="art-law">{a.stats['Held law']}</span>
          </div>
          <span><small>No. {folio(a.slug)} · {translate(language, 'Folio')}</small><h2>{a.title}</h2><p>{lawExpressions[a.slug] || a.stats['Held law']}</p></span>
        </button>)}
      </div>
      <button className="qd-link" onClick={() => browse('Characters')}>{text(`See all ${characters} characters`, `查看全部 ${characters} 位人物`)}</button>
    </section>

    <section className="qd-ways" aria-label={text('More to explore', '更多内容')}>
      <div className="qd-library">
        <h2>{text('The lore library', '世界设定馆')}</h2>
        <p>{text('The rules beneath the stories, sorted into four sections.', '故事之下的规则，分为四个分区。')}</p>
        <ul>{loreSections.map(([category, en, cn]) => <li key={category}>
          <button onClick={() => browse(category)}>
            <span className="qd-row-title">{translate(language, category)}</span>
            <span className="qd-row-note">{text(en, cn)}</span>
            <span className="qd-row-count">{count(category)}</span>
          </button>
        </li>)}</ul>
      </div>
      <div className="qd-play">
        <svg viewBox="0 0 300 200" role="img" aria-label={text('A four-colour map with two neighbouring regions painted the same colour', '一张四色地图，其中两块相邻区域涂成了同一种颜色')}>
          {regions.map(([d, tone], i) => <path key={i} d={d} className={`qd-region ${tone}`} />)}
          <path d="M130 135 L200 140" className="qd-mistake" />
        </svg>
        <h2>{text('Surely you can do better.', '你肯定能做得更好。')}</h2>
        <p>{text('Sai has painted two neighbouring regions the same colour, on purpose. Take the brush and prove him wrong.', '彩故意把两块相邻的区域涂成了同一种颜色。接过画笔，证明他错了。')}</p>
        <button className="qd-primary" onClick={() => open('play/sai')}>{text('Fix Sai’s map', '修好彩的地图')}</button>
      </div>
    </section>

    <aside className="qd-letter">
      <p>{text('Have a question or an idea for this world?', '对这个世界有疑问或想法？')}</p>
      <button className="qd-link" onClick={() => open('suggestions')}>{text('Write to the author', '给作者写信')}</button>
    </aside>
  </div>;
}
