import type { Language } from '../i18n';
import { ResetProgress } from './progress';
import './games.css';

// The games shelf: each game is built on one character's law.
export const games = [
  { slug: 'play/sai', who: ['Sai', '彩'], law: ['Four Color Theorem', '四色定理'], title: ['Sai’s map', '彩的地图'], blurb: ['Sai has botched a four-colour map on purpose. Fix it so no neighbours match.', '彩故意把一张四色地图涂错了。修好它，让相邻区域颜色各不相同。'], art: 'map' },
  { slug: 'play/flat', who: ['Aldous Vane', '奥尔德斯·维恩'], law: ['Iron Law of Oligarchy', '寡头铁律'], title: ['Keep it flat', '保持扁平'], blurb: ['Keep a commune equal while the floor tilts. Those with time drift to the dais; the busy drift out the door.', '在倾斜的地板上让公社保持平等。有时间的人漂向讲台，忙碌的人漂向门口。'], art: 'hall' },
  { slug: 'play/court', who: ['The Spear and Shield', '矛盾'], law: ['Law of Non-Contradiction', '不矛盾律'], title: ['The Spear and Shield’s court', '矛盾的法庭'], blurb: ['Cross-examine witnesses and present the evidence their story contradicts. Near him, a lie can’t hold.', '盘问证人，出示与其说法相矛盾的证据。在他身边，谎言无法立足。'], art: 'court' },
  { slug: 'play/axiom', who: ['The first law holder', '第一位执律者'], law: ['Law of All Laws', '万法之法'], title: ['The Axiom’s test', '公理的试炼'], blurb: ['Break the Axiom and score a point. No one ever has.', '破解公理，得到一分。从来没有人做到过。'], art: 'switch' },
] as const;

function Art({ kind }: { kind: string }) {
  if (kind === 'map') return <svg viewBox="0 0 120 80" aria-hidden="true"><path d="M0 0H50L44 30L0 36Z" fill="#46858a" /><path d="M50 0H120V26L78 32L44 30Z" fill="#b65e50" /><path d="M0 36L44 30L54 58L0 66Z" fill="#c6a451" /><path d="M44 30L78 32L82 60L54 58Z" fill="#c6a451" /><path d="M78 32L120 26V80H60L54 58L82 60Z" fill="#8876a5" /><path d="M0 66L54 58L60 80H0Z" fill="#46858a" /><path d="M44 30L54 58" stroke="#f1ebd9" strokeWidth="2.5" strokeDasharray="4 3" /></svg>;
  if (kind === 'hall') return <svg viewBox="0 0 120 80" aria-hidden="true"><rect width="120" height="80" fill="#16241e" /><circle cx="60" cy="40" r="34" fill="#1f3329" stroke="#c9b482" strokeWidth="1.5" /><circle cx="60" cy="40" r="9" fill="#16241e" stroke="#c9b482" /><path d="M60 40m-26 0a26 26 0 1 0 52 0a26 26 0 1 0-52 0" fill="none" stroke="#c9b48233" strokeWidth="3" />{[[52, 37, '#d8bf7f'], [64, 44, '#d8bf7f'], [60, 33, '#d8bf7f'], [34, 30, '#8fa99b'], [86, 52, '#8fa99b'], [44, 58, '#8fa99b'], [82, 24, '#d8bf7f']].map(([x, y, c], i) => <circle key={i} cx={x} cy={y} r="4" fill={c as string} />)}<circle cx="60" cy="40" r="12" fill="none" stroke="#e07b55" strokeWidth="2" strokeDasharray="30 50" /></svg>;
  if (kind === 'court') return <svg viewBox="0 0 120 80" aria-hidden="true"><rect width="120" height="80" fill="#16241e" /><circle cx="44" cy="42" r="22" fill="#1f3329" stroke="#c9b482" strokeWidth="2" /><circle cx="44" cy="42" r="6" fill="#c9b482" /><path d="M112 42H66" stroke="#d9d2bd" strokeWidth="3" /><path d="M70 34L56 42L70 50Z" fill="#c9b482" /><path d="M60 26L66 34M66 52L60 60M54 30L58 36" stroke="#f1dca0" strokeWidth="2" /><text x="96" y="70" fill="#c9b482" fontSize="12" fontFamily="'Songti SC','Noto Serif CJK SC',serif" textAnchor="middle">矛盾</text></svg>;
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
    <p className="games-foot"><ResetProgress language={language} /></p>
  </div>;
}
