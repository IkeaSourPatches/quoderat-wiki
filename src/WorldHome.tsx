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
        <div className="world-actions"><button onClick={() => open('lore')}>{text('Explore the lore', '探索世界设定')} <span>↗</span></button><button onClick={() => browse('Characters')}>{text('Meet its people', '认识其中的人物')} <span>→</span></button></div>
      </div>
      <div className="world-seal" aria-hidden="true"><div className="seal-circle"/><div className="seal-square"/><span>∴</span><small>QUODERAT · Q.E.D.</small><i>LAW · POWER · PROOF</i></div>
    </section>
    <section className="world-premise"><p className="eyebrow">{text('01 / THE PREMISE', '01 / 世界的前提')}</p><h2>{text('Power has a premise.\nEvery premise can be questioned.', '力量有所依据。\n依据可以被质疑。')}</h2><p>{text('Each law belongs to a single holder. Its reach determines their power; its formulation defines their vulnerability. Some inherit a dynasty. Others discover a law. All must live with what they claim.', '每条法则只属于一位执律者。法则的范围决定力量，其具体表述也界定弱点。有人继承王朝，有人发现法则；所有人都必须承受自己所主张的一切。')}</p></section>
    <section className="world-people"><div><p className="eyebrow">{text('02 / LIVES WITHIN THE LAWS','02 / 法则之中的人生')}</p><h2>{text('A law is not a life.','法则之外，还有人生。')}</h2><p>{text('Behind every principle is someone with something to lose.','每一条原则背后，都有一个不能承受失去的人。')}</p></div><div className="world-people-grid">{['ilar-hesabu','tertia','ensa'].map((slug,index)=>{const a=articles.find(a=>a.slug===slug);return a&&<button key={slug} onClick={()=>open(slug)}><span className="people-symbol" aria-hidden="true">{['ℕ','∨','∈'][index]}</span><small>{a.stats['Held law']}</small><h3>{a.title}</h3><span>{text('Discover their story','阅读人物故事')} ↗</span></button>})}</div><button className="world-text-link" onClick={()=>browse('Characters')}>{text('Meet all the characters','查看所有人物')} →</button></section>
    <section className="home-lore-invitation"><div><p className="eyebrow">{text('PLAY / A PUZZLE FROM SAI','游玩 / 彩的谜题')}</p><h2>{text('Surely you can do better.','你肯定能做得更好。')}</h2><p>{text('Sai has made a spectacular mess of a four-colour map. Take the brush. Prove him wrong.','彩把一张四色地图涂得一团糟。接过画笔，证明他错了。')}</p></div><button onClick={() => open('play')}>{text('Play the impossible advertisement','挑战不可能广告')} ↗</button></section>
    <section className="home-lore-invitation"><div><p className="eyebrow">{text('03 / THE LORE LIBRARY','03 / 世界设定馆')}</p><h2>{text('Look beneath the surface.','深入世界的底层。')}</h2><p>{text('The rules, the pantheon, the creatures, and the history. A dedicated library for the foundations of Quoderat.','世界与法则、众神、神兽与历史。在独立的设定馆中，探索证毕的根基。')}</p></div><button onClick={() => open('lore')}>{text('Open the lore library','进入设定馆')} ↗</button></section>
    <div className="letter-invitation"><span aria-hidden="true">✉</span><div><h2>{text("A question for the author?", "有话想对作者说？")}</h2><p>{text("Leave an idea, a question, or a possibility for this world.", "为这个世界留下一份想法、一个问题，或一种可能。")}</p></div><button onClick={() => open("suggestions")}>{text("Write a letter ↗", "写一封信 ↗")}</button></div><section className="world-closing"><span aria-hidden="true">✧</span><p>{text('A world still unfolding.','一个仍在展开的世界。')}</p><small>{text('Explore the setting. Follow its people. Question its laws.','探索设定，走近人物，质疑法则。')}</small></section>
  </div>;
}
