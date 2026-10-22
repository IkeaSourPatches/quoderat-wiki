import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import type { Language } from '../i18n';
import { create, fling, HALL, nudge, onDais, pick, ramp, step, year, type Member, type Note, type State } from './flat/sim';
import './games.css';

// Keep it flat: Aldous Vane's game. The law always wins; you only decide how long it takes.

type Pair = [string, string];
const names: Pair[] = [['Ama', '阿玛'], ['Bao', '宝'], ['Noor', '努尔'], ['Teo', '特奥'], ['Mina', '米娜'], ['Kofi', '科菲'], ['Lev', '列夫'], ['Yuki', '由纪'], ['Sana', '莎娜'], ['Omar', '奥马尔'], ['Pia', '皮娅'], ['Joon', '俊'], ['Nia', '妮娅'], ['Zhen', '珍'], ['Esi', '埃西'], ['Tavi', '塔维'], ['Rafi', '拉菲'], ['Ilse', '伊尔泽'], ['Lior', '利奥尔'], ['Arlo', '阿洛'], ['Dara', '达拉'], ['Hugo', '雨果'], ['Mei', '梅'], ['Sefa', '塞法']];
const communes: Pair[] = [['The Lantern Commune', '灯笼公社'], ['The Harbour Assembly', '港口议会'], ['The Equal Bread Guild', '平等面包行会'], ['The Open Door Collective', '敞门合作社'], ['The Round Table Co-op', '圆桌合作社'], ['The Shared Net Fishers', '共网渔社']];
const captions: Record<string, Pair> = {
  start: ['Year 1. Everyone has a voice.', '第1年。人人都有发言权。'],
  agenda: ['The agenda grows longer. Those with time drift to the middle.', '议程越来越长。有时间的人向中间靠拢。'],
  watch: ['Aldous Vane adds your commune to his ledger.', '奥尔德斯·维恩把你的公社记进了他的账簿。'],
  venue: ['Meetings move to the far side of the harbour. The busy start drifting away.', '会议挪到了港口另一头。忙碌的人开始渐渐离开。'],
  heir: ['A new member volunteers to take the minutes. Everyone near them drifts faster.', '一位新成员自告奋勇担任记录员。靠近他的人都漂得更快了。'],
  minutes: ['The minutes now need a trained clerk to read.', '会议记录如今得有受过训练的书记才看得懂。'],
  readings: ['Every vote now needs three readings.', '每次表决如今都需要三读。'],
  heir2: ['Another volunteer offers to keep the records.', '又一位志愿者主动提出管理档案。'],
  mornings: ['The hall now opens only on weekday mornings.', '会堂如今只在工作日上午开放。'],
  aldous: ['A quiet clerk from a port city asks to join. Aldous Vane wants to see the law reassert itself.', '一位来自港口城市的沉默书记请求入会。奥尔德斯·维恩想亲眼看着法则重新确立自身。'],
  page: ['Aldous starts a new page in his ledger, just for you.', '奥尔德斯在账簿里为你单独开了新的一页。'],
  demote: ['Forty years flat. If this lasts, it could demote him.', '扁平四十年。若一直维持下去，它可能会让他降格。'],
  century: ['A century. Somewhere in a port city, a clerk has stopped sleeping.', '一个世纪。在某座港口城市，一位书记失眠了。'],
};
const leaving: Pair[] = [['{n} left: the meetings moved again.', '{n}走了：会议又换地方了。'], ['{n} left: the agenda ran past dinner.', '{n}走了：议程开到了晚饭后。'], ['{n} left: couldn’t read the minutes.', '{n}走了：看不懂会议记录。'], ['{n} left: had a shift at the docks.', '{n}走了：要去码头上班。']];
const ledgerKey = 'quoderat-flat-ledger';
type Entry = { n: number; commune: number; years: number; reason: 'committee' | 'dissolved'; names: number[] };
function loadLedger(): Entry[] { try { const v = JSON.parse(localStorage.getItem(ledgerKey) || '[]'); return Array.isArray(v) ? v.filter(e => e && typeof e.years === 'number') : []; } catch { return []; } }

type Particle = { x: number; y: number; vx: number; vy: number; life: number; max: number; color: string; size: number };
type Drag = { id: number; pointer: number; x0: number; y0: number; t0: number; x: number; y: number };
const TAU = Math.PI * 2;

export function KeepItFlat({ language, open }: { language: Language; open: (slug: string) => void }) {
  const zh = language === 'zh';
  const text = (p: Pair) => zh ? p[1] : p[0];
  const nameOf = (i: number) => text(names[i % names.length]);
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const stage = useRef<HTMLDivElement | null>(null);
  const sim = useRef<State>(create());
  const phaseRef = useRef<'ready' | 'playing' | 'paused' | 'over'>('ready');
  const [phase, setPhase] = useState<'ready' | 'playing' | 'paused' | 'over'>('ready');
  const [commune, setCommune] = useState(() => Math.floor(Math.random() * communes.length));
  const [hud, setHud] = useState({ year: 1, members: 10, committee: 0 });
  const [caption, setCaption] = useState<Pair>(captions.start);
  const [toasts, setToasts] = useState<{ id: number; text: Pair }[]>([]);
  const [ledger, setLedger] = useState<Entry[]>(loadLedger);
  const [entry, setEntry] = useState<Entry | null>(null);
  const [typed, setTyped] = useState(0);
  const fx = useRef({ particles: [] as Particle[], ripples: [] as { x: number; y: number; t: number }[], trails: new Map<number, [number, number][]>(), seen: 0, drag: null as Drag | null, flash: 0 });
  const go = (p: typeof phase) => { phaseRef.current = p; setPhase(p); };
  // Development-only hook for scripted play-throughs; stripped from production builds.
  if ((import.meta as unknown as { env: { DEV?: boolean } }).env.DEV) Object.assign(window, { __flat: sim });
  // The loop reads the latest drawing function, so a language switch redraws the initials.
  const drawRef = useRef<(s: State, now: number) => void>(() => {});

  const entryText = (e: Entry) => {
    const c = text(communes[e.commune % communes.length]), y = e.years;
    if (e.reason === 'committee') {
      const [a, b, d] = e.names.map(nameOf);
      return zh ? `第${e.n.toLocaleString('en-US')}条。${c}。保持扁平${y}年。一个常设委员会接管了它：${a}、${b}与${d}。不出所料。`
        : `Entry ${e.n.toLocaleString('en-US')}. ${c}. Flat for ${y} ${y === 1 ? 'year' : 'years'}. A standing committee took over: ${a}, ${b} and ${d}. As predicted.`;
    }
    return zh ? `第${e.n.toLocaleString('en-US')}条。${c}。保持扁平${y}年，直到剩下的人少得开不成会。照样归入小圈子一栏。`
      : `Entry ${e.n.toLocaleString('en-US')}. ${c}. Flat for ${y} ${y === 1 ? 'year' : 'years'}, until too few were left to hold a meeting. Filed under cliques anyway.`;
  };

  const start = useCallback(() => {
    sim.current = create();
    fx.current = { particles: [], ripples: [], trails: new Map(), seen: 0, drag: null, flash: 0 };
    setToasts([]); setEntry(null); setTyped(0); setCaption(captions.start);
    go('playing');
    // Bring the whole hall into view before the floor starts to tilt.
    stage.current?.scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }, []);

  // Notes from the simulation become captions, toasts and particles.
  const consume = useCallback((s: State) => {
    const f = fx.current;
    for (; f.seen < s.notes.length; f.seen++) {
      const n: Note = s.notes[f.seen];
      if (n.type === 'event') { setCaption(captions[n.key] ?? captions.start); if (n.key !== 'start') f.flash = 1; }
      if (n.type === 'nudge') f.ripples.push({ x: n.x, y: n.y, t: 0 });
      if (n.type === 'join' || n.type === 'leave') {
        const join = n.type === 'join';
        for (let i = 0; i < 14; i++) {
          const a = Math.random() * TAU, v = 30 + Math.random() * 70;
          f.particles.push({ x: n.x, y: n.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0, max: .7 + Math.random() * .5, color: join ? '#f1dca0' : '#8fa99b', size: 1.5 + Math.random() * 2 });
        }
        const line: Pair = join ? [`${names[n.name % names.length][0]} joined.`, `${names[n.name % names.length][1]}加入了。`]
          : [leaving[n.reason][0].replace('{n}', names[n.name % names.length][0]), leaving[n.reason][1].replace('{n}', names[n.name % names.length][1])];
        const id = n.t + Math.random();
        setToasts(t => [...t.slice(-2), { id, text: line }]);
        setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3200);
      }
    }
    if (s.notes.length > 400) { s.notes.splice(0, f.seen); f.seen = 0; }
  }, []);

  // The game loop: fixed simulation steps, then one drawing pass per frame.
  useEffect(() => {
    let raf = 0, last = performance.now(), acc = 0, hudAt = 0;
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(.05, (now - last) / 1000); last = now;
      const s = sim.current, f = fx.current;
      if (phaseRef.current === 'playing') {
        acc += dt;
        while (acc >= 1 / 120) { step(s, 1 / 120); acc -= 1 / 120; }
        consume(s);
        if (s.over) {
          const all = loadLedger();
          const e: Entry = { n: 4812 + all.length, commune, years: s.over.years, reason: s.over.reason, names: s.over.names };
          const next = [e, ...all].slice(0, 40);
          try { localStorage.setItem(ledgerKey, JSON.stringify(next)); } catch { /* per-viewer convenience only */ }
          setLedger(next); setEntry(e); setTyped(0); go('over');
        }
        if (now - hudAt > 120) { hudAt = now; setHud({ year: Math.floor(year(s)) + 1, members: s.members.filter(m => m.kind === 'time' || m.kind === 'busy').length, committee: s.committee / HALL.LIMIT }); }
      }
      // Effects keep moving even when paused or over, so the hall never looks frozen.
      for (const p of f.particles) { p.life += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= .96; p.vy *= .96; }
      f.particles = f.particles.filter(p => p.life < p.max);
      for (const r of f.ripples) r.t += dt;
      f.ripples = f.ripples.filter(r => r.t < .6);
      f.flash = Math.max(0, f.flash - dt * 1.5);
      drawRef.current(s, now / 1000);
    };
    raf = requestAnimationFrame(frame);
    const hide = () => { if (document.hidden && phaseRef.current === 'playing') go('paused'); };
    document.addEventListener('visibilitychange', hide);
    return () => { cancelAnimationFrame(raf); document.removeEventListener('visibilitychange', hide); };
  }, [commune, consume]);

  // Type the ledger entry out like a clerk writing it.
  useEffect(() => {
    if (!entry) return;
    const full = entryText(entry).length;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { setTyped(full); return; }
    const id = setInterval(() => setTyped(n => { if (n >= full) { clearInterval(id); return n; } return n + 1; }), 24);
    return () => clearInterval(id);
  }, [entry, language]);

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement | null)?.tagName === 'BUTTON') return;
      if (e.key === ' ' || e.key === 'Escape') {
        if (phaseRef.current === 'playing') { e.preventDefault(); go('paused'); }
        else if (phaseRef.current === 'paused') { e.preventDefault(); go('playing'); }
      }
    };
    addEventListener('keydown', key);
    return () => removeEventListener('keydown', key);
  }, []);

  function draw(s: State, now: number) {
    const c = canvas.current; if (!c) return;
    const ctx = c.getContext('2d'); if (!ctx) return;
    const css = c.clientWidth || 600, dpr = window.devicePixelRatio || 1, px = Math.round(css * dpr);
    if (c.width !== px) { c.width = px; c.height = px; }
    ctx.setTransform(px / 600, 0, 0, px / 600, 0, 0);
    ctx.clearRect(0, 0, 600, 600);
    const { cx, cy, R, DAIS } = HALL, tilt = ramp(s) * (s.pull + s.push) / 2, f = fx.current;

    // Floor: a shallow bowl that deepens as the tilt grows.
    const bowl = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
    bowl.addColorStop(0, `rgba(8,14,12,${Math.min(.75, .25 + (tilt - .45) * .35)})`);
    bowl.addColorStop(.55, '#1a2c24'); bowl.addColorStop(1, '#203529');
    ctx.fillStyle = bowl; ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.fill();
    // Benches, in three rings.
    ctx.lineCap = 'round';
    for (const [r, n] of [[118, 14], [178, 20], [234, 26]] as const) {
      ctx.strokeStyle = 'rgba(201,180,130,.13)'; ctx.lineWidth = 9;
      for (let i = 0; i < n; i++) { const a = (i / n) * TAU; ctx.beginPath(); ctx.arc(cx, cy, r, a + .05, a + TAU / n - .05); ctx.stroke(); }
    }
    // The tilt itself: dashes flowing inward (time) and outward (busy).
    ctx.lineWidth = 1.6;
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * TAU + .13, inward = i % 2 === 0, speed = 26 * tilt;
      ctx.strokeStyle = inward ? `rgba(216,191,127,${.10 + .05 * Math.min(2, tilt)})` : `rgba(143,169,155,${.10 + .05 * Math.min(2, tilt)})`;
      ctx.setLineDash([6, 14]); ctx.lineDashOffset = inward ? now * speed : -now * speed;
      ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * (R - 14), cy + Math.sin(a) * (R - 14)); ctx.lineTo(cx + Math.cos(a) * (DAIS + 10), cy + Math.sin(a) * (DAIS + 10)); ctx.stroke();
    }
    ctx.setLineDash([]);
    // The wall, with four doors.
    const doors = [0, Math.PI / 2, Math.PI, Math.PI * 1.5], gap = .17;
    ctx.strokeStyle = '#c9b48288'; ctx.lineWidth = 6;
    for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(cx, cy, R, doors[i] + gap, doors[(i + 1) % 4] + (i === 3 ? TAU : 0) - gap); ctx.stroke(); }
    for (const a of doors) {
      const g = ctx.createRadialGradient(cx + Math.cos(a) * R, cy + Math.sin(a) * R, 0, cx + Math.cos(a) * R, cy + Math.sin(a) * R, 46);
      g.addColorStop(0, 'rgba(241,220,160,.32)'); g.addColorStop(1, 'rgba(241,220,160,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx + Math.cos(a) * R, cy + Math.sin(a) * R, 46, 0, TAU); ctx.fill();
    }
    // The dais, and the committee forming on it.
    const danger = s.committee / HALL.LIMIT, pulse = .5 + .5 * Math.sin(now * 10);
    if (danger > 0) {
      const g = ctx.createRadialGradient(cx, cy, DAIS * .3, cx, cy, DAIS * 2.2);
      g.addColorStop(0, `rgba(208,122,85,${.25 + .35 * danger * pulse})`); g.addColorStop(1, 'rgba(208,122,85,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, DAIS * 2.2, 0, TAU); ctx.fill();
    }
    ctx.fillStyle = '#16241e'; ctx.strokeStyle = '#c9b482'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(cx, cy, DAIS, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = 'rgba(201,180,130,.35)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(cx, cy, DAIS - 9, 0, TAU); ctx.stroke();
    if (danger > 0) {
      ctx.strokeStyle = '#e07b55'; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.arc(cx, cy, DAIS + 7, -Math.PI / 2, -Math.PI / 2 + TAU * Math.min(1, danger)); ctx.stroke();
    }
    // Saboteurs' influence.
    for (const m of s.members) if (m.kind === 'heir' || m.kind === 'aldous') {
      const radius = m.kind === 'aldous' ? 125 : 95;
      const g = ctx.createRadialGradient(m.x, m.y, m.r, m.x, m.y, radius);
      g.addColorStop(0, 'rgba(10,14,12,.55)'); g.addColorStop(1, 'rgba(10,14,12,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(m.x, m.y, radius, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(201,180,130,.35)'; ctx.lineWidth = 1; ctx.setLineDash([3, 7]); ctx.lineDashOffset = -now * 20;
      ctx.beginPath(); ctx.arc(m.x, m.y, radius - 4, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    }
    // Motion trails.
    for (const m of s.members) {
      const speed = Math.hypot(m.vx, m.vy), trail = f.trails.get(m.id) ?? [];
      if (speed > 120) trail.push([m.x, m.y]); else trail.shift();
      while (trail.length > 10) trail.shift();
      f.trails.set(m.id, trail);
      if (trail.length > 1) {
        ctx.strokeStyle = m.kind === 'busy' ? 'rgba(143,169,155,.35)' : 'rgba(241,220,160,.35)'; ctx.lineWidth = m.r * .9;
        ctx.beginPath(); ctx.moveTo(trail[0][0], trail[0][1]); for (const [x, y] of trail) ctx.lineTo(x, y); ctx.stroke();
      }
    }
    // Ripples from nudges.
    for (const r of f.ripples) {
      ctx.strokeStyle = `rgba(241,220,160,${1 - r.t / .6})`; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(r.x, r.y, 14 + r.t * 70, 0, TAU); ctx.stroke();
    }
    // Members.
    const dais = new Set(onDais(s).map(m => m.id));
    const big = css < 440 ? 1.3 : 1;
    for (const m of s.members) drawMember(ctx, m, s, now, dais.has(m.id), big);
    // Particles.
    for (const p of f.particles) { ctx.globalAlpha = 1 - p.life / p.max; ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, TAU); ctx.fill(); }
    ctx.globalAlpha = 1;
    // The aim line while dragging.
    const d = f.drag, held = d && s.members.find(m => m.id === d.id);
    if (d && held) {
      ctx.strokeStyle = '#f1dca0'; ctx.lineWidth = 2; ctx.setLineDash([5, 5]);
      ctx.beginPath(); ctx.moveTo(held.x, held.y); ctx.lineTo(held.x + (d.x - d.x0), held.y + (d.y - d.y0)); ctx.stroke(); ctx.setLineDash([]);
    }
    if (f.flash > 0) { ctx.fillStyle = `rgba(241,220,160,${f.flash * .18})`; ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.fill(); }
  }

  drawRef.current = draw;

  function drawMember(ctx: CanvasRenderingContext2D, m: Member, s: State, now: number, inDais: boolean, big: number) {
    const grow = Math.min(1, (s.t - m.born) / .5), r = m.r * big * (.4 + .6 * grow);
    if (inDais) {
      ctx.strokeStyle = `rgba(224,123,85,${.5 + .5 * Math.sin(now * 12)})`; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(m.x, m.y, r + 5, 0, TAU); ctx.stroke();
    }
    const palette = { time: ['#d8bf7f', '#f6e7b8', '#2a2416'], busy: ['#8fa99b', '#c9d8cd', '#17241e'], heir: ['#141c19', '#c9b482', '#c9b482'], aldous: ['#0b100e', '#e2c98a', '#e2c98a'] }[m.kind];
    const g = ctx.createRadialGradient(m.x - r * .35, m.y - r * .35, r * .1, m.x, m.y, r);
    g.addColorStop(0, palette[1]); g.addColorStop(1, palette[0]);
    ctx.fillStyle = m.kind === 'time' || m.kind === 'busy' ? g : palette[0];
    ctx.strokeStyle = palette[1]; ctx.lineWidth = m.kind === 'aldous' ? 2.5 : 1.5;
    ctx.beginPath(); ctx.arc(m.x, m.y, r, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = palette[2]; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if (m.kind === 'time' || m.kind === 'busy') {
      ctx.font = `600 ${Math.round(r * .95)}px 'STIX Two Text', Georgia, 'Songti SC', serif`;
      ctx.fillText(Array.from(nameOf(m.name))[0], m.x, m.y + 1);
    } else if (m.kind === 'heir') {
      // A quill: the volunteer secretary.
      ctx.strokeStyle = palette[2]; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(m.x - 6, m.y + 6); ctx.lineTo(m.x + 6, m.y - 6); ctx.stroke();
      ctx.beginPath(); ctx.arc(m.x - 6, m.y + 6, 2, 0, TAU); ctx.fill();
    } else {
      ctx.font = `600 ${Math.round(r * 1.05)}px 'STIX Two Text', Georgia, serif`;
      ctx.fillText('A', m.x, m.y + 1);
      for (let i = 0; i < 3; i++) { const a = now * 1.4 + (i * TAU) / 3; ctx.beginPath(); ctx.arc(m.x + Math.cos(a) * (r + 7), m.y + Math.sin(a) * (r + 7), 2, 0, TAU); ctx.fill(); }
    }
  }

  // Pointer input: tap to nudge, drag to fling.
  const toHall = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const rect = canvas.current!.getBoundingClientRect();
    return [(e.clientX - rect.left) * 600 / rect.width, (e.clientY - rect.top) * 600 / rect.height];
  };
  const down = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (phaseRef.current !== 'playing') return;
    const [x, y] = toHall(e), m = pick(sim.current, x, y, (canvas.current?.clientWidth ?? 600) < 440 ? 30 : 20);
    if (!m) return;
    canvas.current!.setPointerCapture(e.pointerId);
    fx.current.drag = { id: m.id, pointer: e.pointerId, x0: x, y0: y, t0: performance.now(), x, y };
  };
  const move = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const d = fx.current.drag; if (!d || d.pointer !== e.pointerId) return;
    [d.x, d.y] = toHall(e);
  };
  const up = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const d = fx.current.drag; if (!d || d.pointer !== e.pointerId) return;
    fx.current.drag = null;
    const m = sim.current.members.find(x => x.id === d.id); if (!m || phaseRef.current !== 'playing') return;
    const dx = d.x - d.x0, dy = d.y - d.y0, secs = Math.max(.12, (performance.now() - d.t0) / 1000);
    if (Math.hypot(dx, dy) < 12) nudge(sim.current, m);
    else fling(sim.current, m, (dx / secs) * 1.2, (dy / secs) * 1.2);
  };

  const best = ledger.reduce((b, e) => Math.max(b, e.years), 0);
  const label = (en: string, cn: string) => zh ? cn : en;

  return <div className="kf">
    <header className="games-head">
      <h1>{label('Keep it flat', '保持扁平')}</h1>
      <p>{label('Aldous Vane holds the Iron Law of Oligarchy: every organisation, however democratic at first, ends up run by a few. Keep your commune equal for as long as you can.', '奥尔德斯·维恩执掌寡头铁律：每一个组织，无论起初多么民主，最终都会由少数人掌控。尽可能久地让你的公社保持平等。')}</p>
    </header>

    <div ref={stage} className={`kf-stage${hud.committee > 0 ? ' danger' : ''}`}>
      <canvas ref={canvas} className="kf-canvas" role="img" aria-label={label('The meeting hall, seen from above', '俯瞰会堂')}
        onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={() => { fx.current.drag = null; }} />
      {phase !== 'ready' && <div className="kf-hud">
        <div className="kf-year"><small>{label('Year', '年份')}</small><b>{hud.year}</b></div>
        <div className="kf-right">
          <span>{label(`${hud.members} members`, `${hud.members} 名成员`)}</span>
          {(phase === 'playing' || phase === 'paused') && <button className="kf-pause" onClick={() => go(phase === 'playing' ? 'paused' : 'playing')}>{phase === 'playing' ? label('Pause', '暂停') : label('Resume', '继续')}</button>}
        </div>
      </div>}
      {phase === 'playing' && <>
        <p className="kf-caption" aria-live="polite" key={caption[0]}>{text(caption)}</p>
        {hud.committee > 0 && <p className="kf-warning" role="alert">{label('A committee is forming!', '委员会正在形成！')}</p>}
        <ul className="kf-toasts" aria-live="polite">{toasts.map(t => <li key={t.id}>{text(t.text)}</li>)}</ul>
      </>}

      {phase === 'ready' && <div className="kf-overlay">
        <div className="kf-card">
          <small>{label('Your commune', '你的公社')}</small>
          <h2>{text(communes[commune])}</h2>
          <ul className="kf-rules">
            <li><i className="dot time" />{label('Gold members have time to spare. They drift toward the dais in the middle.', '金色成员有大把时间。他们会向中央的讲台漂移。')}</li>
            <li><i className="dot ring" />{label('If three gold members stay on the dais for three seconds, they become a standing committee, and it’s over.', '如果三位金色成员在讲台上停留三秒，他们就成了常设委员会，游戏结束。')}</li>
            <li><i className="dot busy" />{label('Grey members are busy. They drift toward the doors, and if too many leave, the commune dissolves.', '灰色成员很忙。他们会向门口漂移，走掉的人太多，公社就会解散。')}</li>
            <li><i className="dot tap" />{label('Tap a member to nudge them back, or drag to fling them.', '点击成员把他们推回去，或拖动把他们甩出去。')}</li>
          </ul>
          <button className="games-btn" onClick={start}>{label('Found the commune', '创立公社')}</button>
        </div>
      </div>}
      {phase === 'paused' && <div className="kf-overlay">
        <div className="kf-card small"><h2>{label('Paused', '已暂停')}</h2><p>{label('The floor keeps its tilt.', '地板依旧倾斜。')}</p><button className="games-btn" onClick={() => go('playing')}>{label('Resume', '继续')}</button></div>
      </div>}
      {phase === 'over' && entry && <div className="kf-overlay">
        <div className="kf-card ledger">
          <small>{label('Aldous Vane’s ledger', '奥尔德斯·维恩的账簿')}</small>
          <h2>{entry.reason === 'committee' ? label('A standing committee took over', '常设委员会接管了公社') : label('The commune dissolved', '公社解散了')}</h2>
          <p className="kf-entry" aria-label={entryText(entry)}><span aria-hidden="true">{entryText(entry).slice(0, typed)}</span><i className="kf-caret" aria-hidden="true" /></p>
          <p className="kf-best">{label(`Longest flat: ${best} ${best === 1 ? 'year' : 'years'}`, `最长扁平纪录：${best}年`)}</p>
          {ledger.length > 1 && <ol className="kf-history">{ledger.slice(1, 6).map(e => <li key={e.n}><span>{label(`Entry ${e.n.toLocaleString('en-US')}`, `第${e.n.toLocaleString('en-US')}条`)}</span><span>{text(communes[e.commune % communes.length])}</span><span>{label(`${e.years} ${e.years === 1 ? 'year' : 'years'}`, `${e.years}年`)}</span></li>)}</ol>}
          <div className="kf-buttons">
            <button className="games-btn" onClick={() => { setCommune(c => (c + 1) % communes.length); start(); }}>{label('Found another commune', '再创立一个公社')}</button>
            <button className="games-btn quiet" onClick={() => open('aldous-vane')}>{label('Read Aldous Vane’s profile', '阅读奥尔德斯·维恩的档案')}</button>
          </div>
        </div>
      </div>}
    </div>

    <p className="games-foot">
      <span className="games-note">{label('Game adaptation, not canon events.', '游戏改编，并非正史事件。')}</span>
      <button className="games-link" onClick={() => open('play')}>{label('All games', '全部游戏')}</button>
    </p>
  </div>;
}
