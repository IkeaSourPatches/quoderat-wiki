import { useEffect, useRef, useState } from 'react';
import type { Language } from '../i18n';
import './games.css';

// The Axiom's test is breaking the Axiom, and no one has ever scored a point.
// So the Axiom is played as a useless machine: flip its switch and it flips it back.
// Canon is never changed here: every attempt scores zero.

type Arm = 'rest' | 'peek' | 'half' | 'reach' | 'push';
type Variant = 'plain' | 'hesitate' | 'peek' | 'wag' | 'progress' | 'slam';

const storageKey = 'quoderat-axiom-attempts';
const loadAttempts = () => { try { return Math.max(0, Number(localStorage.getItem(storageKey)) || 0); } catch { return 0; } };
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

const lines: [string, string][] = [
  ['Attempt scored. Points: 0.', '尝试已计分。得分：0。'],
  ['Progress: none. Penalty: none.', '进度：无。惩罚：无。'],
  ['The Law of All Laws remains vacant.', '万法之法依然空缺。'],
  ['Still a zero-zero tie. The timer stays paused.', '仍是零比零平局。计时器继续暂停。'],
  ['Your attempt has been noted, along with everyone else’s.', '你的尝试已被记录，和其他所有人的一样。'],
  ['The Axiom thanks you for your interest.', '公理感谢你的关注。'],
  ['Points: 0. As always.', '得分：0。一如既往。'],
  ['That was a good one. Still 0.', '这次不错。仍然是 0。'],
];

export function AxiomMachine({ language, open }: { language: Language; open: (slug: string) => void }) {
  const text = (en: string, zh: string) => language === 'zh' ? zh : en;
  const [on, setOn] = useState(false);
  const [lid, setLid] = useState(false);
  const [arm, setArm] = useState<Arm>('rest');
  const [wag, setWag] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [attempts, setAttempts] = useState(loadAttempts);
  const [line, setLine] = useState<[string, string]>(['Flip the switch to attempt the test.', '拨动开关，尝试这场试炼。']);
  const [mattias, setMattias] = useState(false);
  const alive = useRef(true);
  const idle = useRef<number>(0);
  useEffect(() => { alive.current = true; return () => { alive.current = false; clearTimeout(idle.current); }; }, []);
  useEffect(() => { try { localStorage.setItem(storageKey, String(attempts)); } catch { /* per-viewer convenience only */ } }, [attempts]);

  const fast = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const wait = (ms: number) => sleep(fast() ? Math.min(ms, 120) : ms);

  // One full refusal: lid opens, arm reaches, switch goes back off, arm and lid close.
  async function refuse(variant: Variant) {
    const speed = variant === 'slam' ? .35 : 1;
    if (variant === 'progress') {
      for (let p = 0; p <= 99; p += 3) { setProgress(p); await wait(28); }
      setProgress(99); await wait(1400); setProgress(null);
    }
    await wait(180 * speed); setLid(true);
    if (variant === 'peek') {
      await wait(300); setArm('peek'); await wait(700); setArm('rest'); await wait(350); setLid(false);
      await wait(1100); setLid(true); await wait(120);
    }
    if (variant === 'hesitate') { await wait(260); setArm('half'); await wait(1300); }
    await wait(260 * speed); setArm('reach');
    await wait(260 * speed); setArm('push'); setOn(false);
    if (variant === 'wag') { await wait(250); setWag(true); await wait(1300); setWag(false); }
    await wait(260 * speed); setArm('rest');
    await wait(320 * speed); setLid(false);
  }

  async function flip(byItself = false) {
    if (busy || on) return;
    clearTimeout(idle.current);
    setBusy(true); setOn(true); setMattias(false);
    const n = attempts + (byItself ? 0 : 1);
    if (!byItself) setAttempts(n);
    const variants: Variant[] = ['hesitate', 'peek', 'wag', 'progress', 'slam', 'plain'];
    const variant: Variant = byItself ? 'plain' : n <= 2 ? 'plain' : variants[(n * 7) % variants.length];
    await refuse(variant);
    if (!alive.current) return;
    setLine(byItself
      ? ['Mattias Krane believes you can only score once you stop wanting to. You stopped. Still 0.', '马蒂亚斯·克兰认为，只有不再想赢的人才能得分。你停下了。仍然是 0。']
      : lines[n === 1 ? 0 : (n * 3) % lines.length]);
    setBusy(false);
    // Stop trying for a while and the switch tries for you.
    if (!byItself && n >= 3) idle.current = window.setTimeout(() => { setMattias(true); flip(true); }, 25000);
  }

  return <div className="ax">
    <header className="games-head">
      <h1>{text('The Axiom’s test', '公理的试炼')}</h1>
      <p>{text('The first law holder made breaking the Axiom his test. No one has scored a single point since. Your turn.', '第一位执律者把破解公理定为自己的试炼。从那以后，再没有人得过一分。轮到你了。')}</p>
    </header>

    <div className={`ax-stage${mattias ? ' ax-ghost' : ''}`}>
      <svg viewBox="0 0 400 250" className="ax-svg" aria-hidden="true">
        <ellipse cx="200" cy="236" rx="170" ry="10" className="ax-shadow" />
        <clipPath id="ax-clip"><rect x="0" y="0" width="400" height="226" /></clipPath>
        <g clipPath="url(#ax-clip)"><g className={`ax-arm ${arm}${wag ? ' wag' : ''}`}>
          <rect x="160" y="113" width="164" height="14" rx="7" className="ax-arm-bar" />
          <circle cx="166" cy="120" r="9" className="ax-arm-tip" />
        </g></g>
        <g className={`ax-lever${on ? ' on' : ''}`}>
          <rect x="146" y="80" width="8" height="40" rx="4" className="ax-lever-bar" />
          <circle cx="150" cy="80" r="8" className="ax-lever-knob" />
        </g>
        <rect x="60" y="120" width="280" height="110" rx="6" className="ax-box" />
        <rect x="70" y="130" width="260" height="90" rx="3" className="ax-box-inset" />
        <circle cx="200" cy="175" r="30" className="ax-ring" /><circle cx="200" cy="175" r="22" className="ax-ring thin" />
        <text x="200" y="181" className="ax-mark">Axiom</text>
        <rect x="128" y="116" width="44" height="8" rx="2" className="ax-plate" />
        <rect x="232" y="114" width="90" height="7" rx="2" className={`ax-lid${lid ? ' open' : ''}`} />
      </svg>
      {progress !== null && <div className="ax-progress" role="status"><div style={{ width: `${progress}%` }} /><span>{progress}%</span></div>}
    </div>

    <div className="ax-controls">
      <button role="switch" aria-checked={on} className={`ax-switch${on ? ' on' : ''}`} onClick={() => flip()} disabled={busy}>
        {on ? text('Breaking the Axiom…', '正在破解公理……') : text('Break the Axiom', '破解公理')}
      </button>
      <p className="ax-line" aria-live="polite">{text(...line)}</p>
    </div>

    <dl className="ax-score">
      <div><dt>{text('Your points', '你的得分')}</dt><dd>0</dd></div>
      <div><dt>{text('Your attempts', '你的尝试')}</dt><dd>{attempts}</dd></div>
      <div><dt>{text('Everyone’s points, ever', '所有人的历史得分')}</dt><dd>0</dd></div>
    </dl>

    <p className="games-foot">
      <button className="games-link" onClick={() => open('the-app-and-the-law-of-all-laws')}>{text('Read about the Axiom', '阅读公理条目')}</button>
      <button className="games-link" onClick={() => open('play')}>{text('All games', '全部游戏')}</button>
    </p>
  </div>;
}
