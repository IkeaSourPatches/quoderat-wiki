import { useEffect, useMemo, useState } from 'react';
import type { Language } from '../i18n';
import { cases, type Evidence, type Line, type Mask, type Mood, type T } from './court/cases';
import './games.css';

// The Spear and Shield's court. Canon: around the holder of Non-Contradiction,
// uncertainty collapses, and bluffs are forced to resolve into a single answer.
// Here that means a statement that contradicts the evidence breaks when presented.

type Phase = 'intro' | 'testimony' | 'clash' | 'break' | 'resolution' | 'closed';
type After = 'testimony' | 'back' | 'next' | 'closed' | 'retry' | `reveal:${string}`;
const PATIENCE = 5;
const solvedKey = 'quoderat-court-solved';
const loadSolved = (): string[] => { try { const v = JSON.parse(localStorage.getItem(solvedKey) || '[]'); return Array.isArray(v) ? v.filter(x => typeof x === 'string') : []; } catch { return []; } };
const still = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

function MaskFace({ mask, mood }: { mask: Mask; mood: Mood }) {
  const brows = { calm: ['M58 74 L80 74', 'M120 74 L142 74'], smug: ['M58 76 L80 72', 'M120 66 L142 72'], nervous: ['M58 72 L80 78', 'M120 78 L142 72'], shocked: ['M58 64 L80 60', 'M120 60 L142 64'], broken: ['M58 70 L80 80', 'M120 80 L142 70'] }[mood];
  const eyes = mood === 'shocked' ? <><circle cx="69" cy="88" r="9" className="ct-eye open" /><circle cx="131" cy="88" r="9" className="ct-eye open" /></>
    : mood === 'smug' ? <><path d="M60 89 Q69 84 78 89" className="ct-line" /><path d="M122 89 Q131 84 140 89" className="ct-line" /></>
    : mood === 'broken' ? <><path d="M62 82 L76 96 M76 82 L62 96" className="ct-line" /><path d="M124 82 L138 96 M138 82 L124 96" className="ct-line" /></>
    : <><circle cx="69" cy="88" r={mood === 'nervous' ? 4 : 5} className="ct-eye" /><circle cx="131" cy="88" r={mood === 'nervous' ? 4 : 5} className="ct-eye" /></>;
  const mouth = { calm: 'M80 132 L120 132', smug: 'M78 130 Q104 142 124 124', nervous: 'M76 134 Q84 128 92 134 Q100 140 108 134 Q116 128 124 134', shocked: '', broken: 'M74 136 L86 128 L96 138 L106 128 L116 138 L126 130' }[mood];
  return <svg viewBox="0 0 200 220" className={`ct-mask ${mood}`} aria-hidden="true">
    <path d="M100 18 C150 18 170 60 168 104 C166 156 136 196 100 200 C64 196 34 156 32 104 C30 60 50 18 100 18 Z" className="ct-face" />
    {mood === 'broken' && <path d="M104 18 L96 62 L110 96 L92 132 L106 168 L98 200" className="ct-crack" />}
    <path d={brows[0]} className="ct-line thick" /><path d={brows[1]} className="ct-line thick" />
    {eyes}
    {mood === 'shocked' ? <ellipse cx="100" cy="136" rx="11" ry="15" className="ct-eye open" /> : <path d={mouth} className="ct-line" />}
    {mood === 'nervous' && <><path d="M160 60 Q166 74 160 80 Q154 74 160 60 Z" className="ct-sweat" /><path d="M44 84 Q49 96 44 101 Q39 96 44 84 Z" className="ct-sweat late" /></>}
    {mask === 'lamp' && <g className="ct-prop"><path d="M140 206 Q156 192 176 200 L170 210 L146 212 Z" className="ct-brass" /><path d="M176 198 Q182 186 178 178 Q172 188 176 198 Z" className="ct-flame" /></g>}
    {mask === 'dice' && <g className="ct-prop dice"><rect x="20" y="176" width="26" height="26" rx="5" className="ct-brass" transform="rotate(-14 33 189)" /><circle cx="29" cy="186" r="2.4" className="ct-pip" /><circle cx="37" cy="193" r="2.4" className="ct-pip" /><rect x="152" y="180" width="24" height="24" rx="5" className="ct-brass" transform="rotate(18 164 192)" /><circle cx="164" cy="192" r="2.4" className="ct-pip" /></g>}
    {mask === 'horn' && <g className="ct-prop"><path d="M150 214 L188 150 L160 212 Z" className="ct-horn" /><path d="M156 202 L176 176 M160 196 L182 164" className="ct-line faint" /></g>}
  </svg>;
}

function Icon({ kind }: { kind: Evidence['icon'] }) {
  const d = {
    book: <><rect x="6" y="5" width="20" height="24" rx="2" /><path d="M11 5V29M14 11H22M14 16H22" /></>,
    scroll: <><path d="M8 6H24V26H8Z" /><path d="M8 6Q4 6 4 10Q4 14 8 14M24 26Q28 26 28 22Q28 18 24 18M12 12H20M12 17H20M12 22H18" /></>,
    box: <><rect x="5" y="11" width="22" height="15" rx="2" /><path d="M5 16H27M13 16V20H19V16M11 11V8H21V11" /></>,
    bracelet: <><circle cx="16" cy="16" r="10" /><circle cx="16" cy="16" r="6" /><circle cx="16" cy="6" r="2.5" /></>,
    pouch: <><path d="M10 12Q6 26 16 27Q26 26 22 12Z" /><path d="M10 12Q16 8 22 12M12 9L16 5L20 9" /></>,
    seal: <><circle cx="16" cy="13" r="8" /><path d="M11 19L9 28L16 24L23 28L21 19" /></>,
  }[kind];
  return <svg viewBox="0 0 32 32" className="ct-icon" aria-hidden="true">{d}</svg>;
}

function Cat({ on }: { on: boolean }) {
  return <svg viewBox="0 0 24 24" className={`ct-cat${on ? '' : ' gone'}`} aria-hidden="true"><path d="M4 20V8L8 3L10 8H14L16 3L20 8V20Q12 23 4 20Z" /><circle cx="9" cy="13" r="1.3" /><circle cx="15" cy="13" r="1.3" /></svg>;
}

function Speech({ line, who, lang, onNext }: { line: Line; who: string; lang: Language; onNext: () => void }) {
  const full = line.text[lang === 'zh' ? 'zh' : 'en'];
  const [n, setN] = useState(0);
  useEffect(() => {
    if (still()) { setN(full.length); return; }
    setN(0);
    const id = setInterval(() => setN(x => { if (x >= full.length) { clearInterval(id); return x; } return x + 1; }), 18);
    return () => clearInterval(id);
  }, [full]);
  const done = n >= full.length;
  return <button className={`ct-speech ${line.who}`} onClick={() => done ? onNext() : setN(full.length)} autoFocus>
    {who && <span className="ct-who">{who}</span>}
    <span className="ct-said" aria-live="polite" aria-label={full}><span aria-hidden="true">{full.slice(0, n)}</span></span>
    <span className="ct-more" aria-hidden="true">{done ? '▸' : ''}</span>
  </button>;
}

export function SpearShieldCourt({ language, open }: { language: Language; open: (slug: string) => void }) {
  const zh = language === 'zh';
  const tr = (x: T) => zh ? x.zh : x.en;
  const label = (en: string, cn: string) => zh ? cn : en;
  const [view, setView] = useState<'menu' | 'case'>('menu');
  const [ci, setCi] = useState(0);
  const [phase, setPhase] = useState<Phase>('intro');
  const [ti, setTi] = useState(0);
  const [si, setSi] = useState(0);
  const [revealed, setRevealed] = useState<string[]>([]);
  const [dialog, setDialog] = useState<{ lines: Line[]; at: number; after: After } | null>(null);
  const [patience, setPatience] = useState(PATIENCE);
  const [selected, setSelected] = useState<string | null>(null);
  const [mood, setMood] = useState<Mood>('calm');
  const [notice, setNotice] = useState<T | null>(null);
  const [card, setCard] = useState(0);
  const [shake, setShake] = useState(0);
  const [solved, setSolved] = useState(loadSolved);

  const c = cases[ci], testimony = c.testimonies[ti];
  const visible = useMemo(() => testimony.statements.filter(s => !s.hidden || revealed.includes(s.id)), [testimony, revealed]);
  const statement = visible[Math.min(si, visible.length - 1)];
  const line = dialog ? dialog.lines[dialog.at] : null;
  const evidence = c.evidence.find(e => e.id === selected) ?? null;
  const whoName = (l: Line) => ({ you: label('You', '你'), witness: tr(c.witness.name), magistrate: label('Magistrate', '法官'), cat: label('The cat', '猫'), narrator: '' })[l.who];

  useEffect(() => { if (line?.who === 'witness' && line.mood) setMood(line.mood); }, [line]);
  useEffect(() => { if (!notice) return; const id = setTimeout(() => setNotice(null), 2600); return () => clearTimeout(id); }, [notice]);
  useEffect(() => { if (!card) return; const id = setTimeout(() => setCard(0), still() ? 600 : 1500); return () => clearTimeout(id); }, [card]);
  useEffect(() => {
    if (phase !== 'clash') return;
    const id = setTimeout(() => { setPhase('break'); setDialog({ lines: testimony.breakthrough, at: 0, after: 'next' }); }, still() ? 500 : 2100);
    return () => clearTimeout(id);
  }, [phase, testimony]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (view !== 'case' || phase !== 'testimony' || dialog) return;
      if (e.key === 'ArrowRight') step(1);
      if (e.key === 'ArrowLeft') step(-1);
    };
    addEventListener('keydown', key);
    return () => removeEventListener('keydown', key);
  });

  function begin(index: number) {
    setCi(index); setView('case'); setPhase('intro'); setTi(0); setSi(0); setRevealed([]); setPatience(PATIENCE);
    setSelected(null); setMood('calm'); setNotice(null);
    setDialog({ lines: cases[index].intro, at: 0, after: 'testimony' });
  }
  function next() {
    if (!dialog) return;
    if (dialog.at + 1 < dialog.lines.length) { setDialog({ ...dialog, at: dialog.at + 1 }); return; }
    const after = dialog.after;
    setDialog(null);
    if (after === 'testimony' || after === 'retry') {
      if (after === 'retry') { setPatience(PATIENCE); setRevealed([]); }
      setSi(0); setPhase('testimony'); setMood('calm'); setCard(x => x + 1);
    } else if (after === 'back') {
      setPhase('testimony');
    } else if (after.startsWith('reveal:')) {
      const id = after.slice(7), list = testimony.statements.filter(s => !s.hidden || revealed.includes(s.id) || s.id === id);
      setRevealed(r => [...r, id]); setSi(list.findIndex(s => s.id === id)); setPhase('testimony');
      setNotice({ en: 'New statement added to the testimony.', zh: '证词中加入了一句新的陈述。' });
    } else if (after === 'next') {
      if (ti + 1 < c.testimonies.length) { setTi(ti + 1); setSi(0); setRevealed([]); setSelected(null); setPhase('testimony'); setCard(x => x + 1); }
      else { setPhase('resolution'); setDialog({ lines: c.resolution, at: 0, after: 'closed' }); }
    } else if (after === 'closed') {
      setPhase('closed');
      const list = solved.includes(c.id) ? solved : [...solved, c.id];
      setSolved(list);
      try { localStorage.setItem(solvedKey, JSON.stringify(list)); } catch { /* per-viewer convenience only */ }
    }
  }
  function step(d: number) {
    const n = si + d;
    if (n >= visible.length) { setSi(0); setNotice({ en: 'The witness starts again from the top.', zh: '证人从头再说一遍。' }); }
    else setSi(Math.max(0, n));
  }
  function press() {
    const reveal = statement.reveals && !revealed.includes(statement.reveals);
    setDialog({ lines: statement.press, at: 0, after: reveal ? `reveal:${statement.reveals}` : 'back' });
  }
  function present() {
    if (!selected) { setNotice({ en: 'Choose a piece of evidence first.', zh: '请先选择一件证据。' }); return; }
    if (statement.contradicts === selected) { setPhase('clash'); setMood('shocked'); return; }
    const left = patience - 1;
    setPatience(left); setShake(x => x + 1); setMood('smug');
    const retort = testimony.wrong[(si + left) % testimony.wrong.length];
    if (left <= 0) setDialog({ after: 'retry', at: 0, lines: [
      { who: 'witness', text: retort, mood: 'smug' },
      { who: 'cat', text: { en: 'The cat stands, stretches, and stalks out of the court.', zh: '猫站起来，伸了个懒腰，昂首走出了法庭。' } },
      { who: 'magistrate', text: { en: 'The court takes that as a sign. We will hear the testimony again.', zh: '法庭把这当作一个信号。我们重新听一遍证词。' } },
    ] });
    else setDialog({ after: 'back', at: 0, lines: [{ who: 'witness', text: retort, mood: 'smug' }, { who: 'cat', text: { en: 'The cat’s tail flicks.', zh: '猫的尾巴甩了一下。' } }] });
  }

  if (view === 'menu') return <div className="ct">
    <header className="games-head">
      <h1>{label('The Spear and Shield’s court', '矛盾的法庭')}</h1>
      <p>{label('In the city where the Spear and Shield’s dynasty lives, an old man with a cat sits at the back of every trial. Nobody looks at him. Near him, no story can stay both true and false: find where the testimony contradicts the evidence, and it collapses.', '在矛盾的王朝所在的城市里，每一场审判的后排都坐着一位带着猫的老人。没有人看他一眼。在他身边，没有任何说法能同时既真又假：找出证词与证据矛盾之处，谎言便会崩塌。')}</p>
    </header>
    <ol className="ct-cases">{cases.map((k, i) => <li key={k.id}><button onClick={() => begin(i)}>
      <span className="ct-case-n">{i + 1}</span>
      <span className="ct-case-text"><strong>{tr(k.title)}</strong><small>{tr(k.witness.name)} · {tr(k.witness.role)}</small></span>
      <span className={`ct-case-state${solved.includes(k.id) ? ' done' : ''}`}>{solved.includes(k.id) ? label('Closed', '已结案') : label('Open', '待审')}</span>
    </button></li>)}</ol>
    <p className="games-foot">
      <span className="games-note">{label('Cases are game adaptations, not canon events.', '案件为游戏改编，并非正史事件。')}</span>
      <button className="games-link" onClick={() => open('the-spear-and-shield')}>{label('Read the Spear and Shield’s profile', '阅读矛盾的人物档案')}</button>
      <button className="games-link" onClick={() => open('play')}>{label('All games', '全部游戏')}</button>
    </p>
  </div>;

  return <div className="ct">
    <div className="ct-top">
      <button className="games-link" onClick={() => setView('menu')}>{label('All cases', '全部案件')}</button>
      <h1>{label(`Case ${ci + 1}`, `第${ci + 1}案`)} · {tr(c.title)}</h1>
      <div className="ct-patience" aria-label={label(`The cat’s patience: ${patience} of ${PATIENCE}`, `猫的耐心：${patience}/${PATIENCE}`)}>
        <small>{label('The cat’s patience', '猫的耐心')}</small>
        <span>{Array.from({ length: PATIENCE }, (_, i) => <Cat key={i} on={i < patience} />)}</span>
      </div>
    </div>

    <div className={`ct-bench${shake ? ' shake' : ''}`} key={`b${shake}`}>
      <figure className="ct-witness">
        <MaskFace mask={c.witness.mask} mood={mood} />
        <figcaption><strong>{tr(c.witness.name)}</strong><small>{tr(c.witness.role)}</small></figcaption>
      </figure>

      <div className="ct-stand">
        {phase === 'testimony' && !dialog && <>
          <p className="ct-testimony-title">{label('Testimony', '证词')} · {tr(testimony.title)}<span>{label(`Statement ${si + 1} of ${visible.length}`, `第 ${si + 1} 句，共 ${visible.length} 句`)}</span></p>
          <blockquote className="ct-statement" key={statement.id}>{tr(statement.text)}</blockquote>
          <div className="ct-controls">
            <button className="ct-arrow" onClick={() => step(-1)} disabled={si === 0} aria-label={label('Previous statement', '上一句')}>‹</button>
            <button className="games-btn quiet" onClick={press}>{label('Press', '追问')}</button>
            <button className="games-btn" onClick={present} disabled={!selected}>{evidence ? label(`Present: ${tr(evidence.name)}`, `出示：${tr(evidence.name)}`) : label('Present evidence', '出示证据')}</button>
            <button className="ct-arrow" onClick={() => step(1)} aria-label={label('Next statement', '下一句')}>›</button>
          </div>
        </>}
        {line && <Speech key={`${phase}-${dialog!.at}-${line.text.en}`} line={line} who={whoName(line)} lang={language} onNext={next} />}
        {phase === 'closed' && <div className="ct-closed">
          <div className="ct-closed-stamp" aria-hidden="true">{label('Case closed', '结案')}</div>
          <h2>{tr(c.title)}</h2>
          <div className="ct-controls">
            {ci + 1 < cases.length && <button className="games-btn" onClick={() => begin(ci + 1)}>{label('Next case', '下一案')}</button>}
            <button className="games-btn quiet" onClick={() => setView('menu')}>{label('All cases', '全部案件')}</button>
          </div>
        </div>}
        {notice && <p className="ct-notice" role="status">{tr(notice)}</p>}
      </div>
    </div>

    {(phase === 'testimony' || phase === 'break' || phase === 'clash') && <section className="ct-record" aria-label={label('Court record', '法庭记录')}>
      <h2>{label('Court record', '法庭记录')}</h2>
      <div className="ct-evidence">{c.evidence.map(e => <button key={e.id} className={selected === e.id ? 'on' : ''} aria-pressed={selected === e.id} onClick={() => setSelected(selected === e.id ? null : e.id)}>
        <Icon kind={e.icon} /><span>{tr(e.name)}</span>
      </button>)}</div>
      <p className="ct-detail">{evidence ? tr(evidence.detail) : label('Choose a piece of evidence to read it, then present it against a statement.', '选择一件证据查看详情，然后针对某句证词出示。')}</p>
    </section>}

    {phase === 'clash' && <div className="ct-clash" role="alert" aria-label={label('Contradiction!', '矛盾！')}>
      <div className="ct-flash" />
      <svg viewBox="0 0 120 120" className="ct-shield" aria-hidden="true"><circle cx="60" cy="60" r="50" /><circle cx="60" cy="60" r="34" /><circle cx="60" cy="60" r="9" /><path d="M60 10V110M10 60H110" /></svg>
      <svg viewBox="0 0 260 40" className="ct-spear" aria-hidden="true"><path d="M8 20H200" /><path d="M200 8L252 20L200 32Z" /><path d="M30 12V28M42 12V28" /></svg>
      <div className="ct-shards" aria-hidden="true">{Array.from({ length: 14 }, (_, i) => <i key={i} style={{ ['--a' as string]: `${(i * 360) / 14}deg`, ['--d' as string]: `${120 + (i * 37) % 120}px` }} />)}</div>
      <div className="ct-stamp" aria-hidden="true">矛盾</div>
      <div className="ct-sub" aria-hidden="true">{label('Contradiction! Spear, meet shield.', '以子之矛，陷子之盾！')}</div>
      <blockquote className="ct-broken" aria-hidden="true"><span>{tr(statement.text)}</span><span>{tr(statement.text)}</span></blockquote>
    </div>}

    {card > 0 && phase === 'testimony' && <div className="ct-card" key={`c${card}`} aria-hidden="true"><small>{label('Testimony', '证词')}</small><strong>{tr(testimony.title)}</strong></div>}

    <p className="games-foot">
      <span className="games-note">{label('Cases are game adaptations, not canon events.', '案件为游戏改编，并非正史事件。')}</span>
      <button className="games-link" onClick={() => open('play')}>{label('All games', '全部游戏')}</button>
    </p>
  </div>;
}
