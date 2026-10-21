import type { Article } from './api';
import type { Language } from './i18n';

// The world introduction is editorial presentation of the existing canon.
// Article slugs connect every invitation to the same bilingual reading pages.
export function WorldHome({ language, articles, open, browse }: {
  language: Language; articles: Article[]; open: (slug: string) => void; browse: (category: string) => void;
}) {
  const zh = language === 'zh';
  const text = (en: string, cn: string) => zh ? cn : en;
  return <div className="world-home">
    <section className="world-hero">
      <div className="world-hero-copy">
        <p className="eyebrow">{text('AN ORIGINAL FANTASY WORLD · BY AXIOM', '原创奇幻世界 · AXIOM')}</p>
        <h1>{text('Quoderat', '证毕')}<span>QUOD ERAT DEMONSTRANDUM</span></h1>
        <h2>{text('Even gods must withstand a proof.', '即使是神，也必须经得起证明。')}</h2>
        <p>{text('A world of magic, dragons, and living laws. Here, power determines status—and the foundations of a god’s power can be challenged.', '一个有魔法、龙与执律者的世界。在这里，力量决定地位，而神明赖以立足的法则，也可能被挑战。')}</p>
        <div className="world-actions"><button onClick={() => open('premise')}>{text('Enter the world', '走进这个世界')} <span>↗</span></button><button onClick={() => browse('Characters')}>{text('Meet its people', '认识其中的人物')} <span>→</span></button></div>
      </div>
      <div className="world-seal" aria-hidden="true"><div className="seal-circle"/><div className="seal-square"/><span>∴</span><small>QUODERAT · Q.E.D.</small><i>LAW · POWER · PROOF</i></div>
    </section>
    <section className="world-premise"><p className="eyebrow">{text('01 / THE PREMISE', '01 / 世界的前提')}</p><h2>{text('Power has a premise.\nEvery premise can be questioned.', '力量有所依据。\n依据可以被质疑。')}</h2><p>{text('Each law belongs to a single holder. Its reach determines their power; its formulation defines their vulnerability. Some inherit a dynasty. Others discover a law. All must live with what they claim.', '每条法则只属于一位执律者。法则的范围决定力量，其具体表述也界定弱点。有人继承王朝，有人发现法则；所有人都必须承受自己所主张的一切。')}</p></section>
    <section className="world-paths"><p className="eyebrow">{text('02 / EXPLORE QUODERAT', '02 / 探索证毕')}</p><div className="world-path-grid">{[
      ['01','∴','World & laws','The rules beneath reality','现实之下的规则','Laws, inheritance, disproof—and the Axiom.','法则、继承、证伪，以及公理。'],
      ['02','♜','The pantheon','Those who hold the laws','执掌法则的人','Ancient dynasties, uneasy alliances, unfinished feuds.','古老王朝、不安的联盟与未了的宿怨。'],
      ['03','✧','Creatures','Before power was shared','力量共享之前','Dragons, mythical families, and the legacy of the hunt.','龙族、神兽族群，以及大狩猎的遗产。'],
      ['04','⌛','Timeline','A world with a past','一个有过去的世界','Follow the floors of the Tower of History.','沿着历史之塔，逐层回望。'],
    ].map(([number,mark,category,en,cn,desc,zdesc])=><button key={category} onClick={()=>category==='Timeline'?open('timeline'):browse(category)}><small>{number} /</small><span className="path-mark" aria-hidden="true">{mark}</span><h3>{text(en,cn)}</h3><p>{text(desc,zdesc)}</p><span className="path-arrow">↗</span></button>)}</div></section>
    <section className="world-people"><div><p className="eyebrow">{text('03 / LIVES WITHIN THE LAWS','03 / 法则之中的人生')}</p><h2>{text('A law is not a life.','法则之外，还有人生。')}</h2><p>{text('Behind every principle is someone with something to lose.','每一条原则背后，都有一个不能承受失去的人。')}</p></div><div className="world-people-grid">{['ilar-hesabu','tertia','ensa'].map((slug,index)=>{const a=articles.find(a=>a.slug===slug);return a&&<button key={slug} onClick={()=>open(slug)}><span className="people-symbol" aria-hidden="true">{['ℕ','∨','∈'][index]}</span><small>{a.stats['Held law']}</small><h3>{a.title}</h3><span>{text('Discover their story','阅读人物故事')} ↗</span></button>})}</div><button className="world-text-link" onClick={()=>browse('Characters')}>{text('Meet all the characters','查看所有人物')} →</button></section>
    <div className="letter-invitation"><span aria-hidden="true">✉</span><div><h2>{text("A question for the author?", "有话想对作者说？")}</h2><p>{text("Leave an idea, a question, or a possibility for this world.", "为这个世界留下一份想法、一个问题，或一种可能。")}</p></div><button onClick={() => open("suggestions")}>{text("Write a letter ↗", "写一封信 ↗")}</button></div><section className="world-closing"><span aria-hidden="true">✧</span><p>{text('A world still unfolding.','一个仍在展开的世界。')}</p><small>{text('Explore the setting. Follow its people. Question its laws.','探索设定，走近人物，质疑法则。')}</small></section>
  </div>;
}
