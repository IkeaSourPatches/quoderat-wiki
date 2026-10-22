import type { Language } from '../i18n';
import './games.css';

// The games shelf: each game is built on one character's law.
const games = [
  { slug: 'play/sai', who: ['Sai', '彩'], law: ['Four Color Theorem', '四色定理'], title: ['Sai’s map', '彩的地图'], blurb: ['Sai has botched a four-colour map on purpose. Fix it so no neighbours match.', '彩故意把一张四色地图涂错了。修好它，让相邻区域颜色各不相同。'], art: 'map' },
  { slug: 'play/vera', who: ['Vera', '维拉'], law: ['Law of Superposition', '叠覆律'], title: ['Vera’s dig', '维拉的挖掘'], blurb: ['Read cliffs, date a grave, find the tunnels, then search earth-tribe ground for something hidden.', '解读崖壁，推断坟墓的年代，找出隧道，再到土龙族地下寻找隐藏之物。'], art: 'layers' },
  { slug: 'play/axiom', who: ['The first law holder', '第一位执律者'], law: ['Law of All Laws', '万法之法'], title: ['The Axiom’s test', '公理的试炼'], blurb: ['Break the Axiom and score a point. No one ever has.', '破解公理，得到一分。从来没有人做到过。'], art: 'switch' },
] as const;

function Art({ kind }: { kind: string }) {
  if (kind === 'map') return <svg viewBox="0 0 120 80" aria-hidden="true"><path d="M0 0H50L44 30L0 36Z" fill="#46858a" /><path d="M50 0H120V26L78 32L44 30Z" fill="#b65e50" /><path d="M0 36L44 30L54 58L0 66Z" fill="#c6a451" /><path d="M44 30L78 32L82 60L54 58Z" fill="#c6a451" /><path d="M78 32L120 26V80H60L54 58L82 60Z" fill="#8876a5" /><path d="M0 66L54 58L60 80H0Z" fill="#46858a" /><path d="M44 30L54 58" stroke="#f1ebd9" strokeWidth="2.5" strokeDasharray="4 3" /></svg>;
  if (kind === 'layers') return <svg viewBox="0 0 120 80" aria-hidden="true">{['#4f5d3a', '#b9b39c', '#9b8452', '#7a4a3a', '#56645b'].map((c, i) => <rect key={c} x="0" y={i * 16} width="120" height="16" fill={c} />)}<path d="M74 0V44Q60 44 60 54Q60 64 76 64Q92 64 92 54Q92 44 80 44V0Z" fill="#2b2a22" stroke="#c9b482" strokeDasharray="3 2" /></svg>;
  return <svg viewBox="0 0 120 80" aria-hidden="true"><rect x="16" y="40" width="88" height="34" rx="3" fill="#1d3329" stroke="#c9b482" /><rect x="42" y="18" width="5" height="24" rx="2.5" fill="#d9d2bd" transform="rotate(-22 44 40)" /><rect x="70" y="36" width="30" height="4" fill="#c9b482" transform="rotate(-40 100 38)" /><text x="60" y="62" fill="#c9b482" fontSize="10" fontStyle="italic" textAnchor="middle" fontFamily="Georgia,serif">0 – 0</text></svg>;
}

export function GameShelf({ language, open }: { language: Language; open: (slug: string) => void }) {
  const t = (pair: readonly [string, string]) => language === 'zh' ? pair[1] : pair[0];
  return <div className="gs">
    <header className="games-head">
      <h1>{language === 'zh' ? '游玩' : 'Play'}</h1>
      <p>{language === 'zh' ? '每个游戏都建立在一位人物的法则之上。' : 'Each game is built on one character’s law.'}</p>
    </header>
    <ul className="gs-list">{games.map(g => <li key={g.slug}><button onClick={() => open(g.slug)}>
      <Art kind={g.art} />
      <span className="gs-text"><small>{t(g.who)} · {t(g.law)}</small><strong>{t(g.title)}</strong><span>{t(g.blurb)}</span></span>
    </button></li>)}</ul>
  </div>;
}
