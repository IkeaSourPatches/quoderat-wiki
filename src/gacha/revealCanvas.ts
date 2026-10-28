// Canvas for the summon reveal: the construction, the compass that draws it, and the loose power
// of the world drifting as dust until it condenses into the pen. The construction is a pure
// function of its clock (construction.ts); particles are the only state that accumulates.

import { FIGURES, O, onCircle, schedule, COLLAPSE, type Pt, type Timed } from './construction';

export type RevealEvent = { type: 'stage'; stage: number } | { type: 'close' } | { type: 'burst' };
/** Optional SVG art for the compass (see docs/gacha-art-prompts.md). Missing parts are drawn in code. */
export type CompassArt = { head?: HTMLImageElement; needle?: HTMLImageElement; pencil?: HTMLImageElement };
export type RevealOptions = {
  stages: 1 | 2 | 3 | 4;
  /** Ink of each stage, as #rrggbb. */
  inks: readonly string[];
  /** Pigment of the best reward; the finished figure takes it on when it closes. */
  closeInk: string;
  /** Pigments of the whole batch, scattered by the burst. */
  burstInks: readonly string[];
  /** Best grade in the batch, 0–4: a B gets a modest burst, a 5★ the full one. */
  top: number;
  onEvent: (event: RevealEvent) => void;
  art?: CompassArt;
};
export type RevealEngine = {
  resize(width: number, height: number, ratio: number): void;
  start(): void;
  destroy(): void;
  setVisible(visible: boolean): void;
  /** Jump to the end of the construction; the burst follows a moment later. */
  fastForward(): void;
  /** Leave the construction at once, without a burst (used by Skip). */
  finish(): void;
  /** A spray of pigment at a point in canvas pixels, for a card turning over. */
  sparkAt(x: number, y: number, ink: string, count: number): void;
  /** Tint the dust while a reward is on show, or clear it with null. */
  setMood(ink: string | null): void;
  /** The figure's centre in canvas pixels: where the cards are dealt from. */
  centre(): [number, number];
};

type RGB = [number, number, number];
type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  rgb: RGB;
  kind: 0 | 1 | 2;
  tw: number;
};
type Ring = { t0: number; x: number; y: number; rgb: RGB; r1: number; dur: number; width: number };
type Flash = { t0: number; dur: number; rgb: RGB; peak: number };

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
const bell = (t: number) => Math.sin(Math.PI * clamp(t));
const rgbOf = (hex: string): RGB => {
  const n = parseInt(hex.slice(1), 16);
  return [n >> 16, (n >> 8) & 255, n & 255];
};
const mix = (a: RGB, b: RGB, t: number): RGB => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const rgba = (c: RGB, a: number) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${clamp(a)})`;
const DUST: RGB = [233, 215, 163],
  WHITE_GOLD: RGB = [255, 244, 214];
const LEG = 360; // compass leg length, in figure units

export function createRevealEngine(canvas: HTMLCanvasElement, options: RevealOptions): RevealEngine {
  const ctx = canvas.getContext('2d')!;
  const plan = schedule(options.stages);
  const inks = options.inks.map(rgbOf),
    closeInk = rgbOf(options.closeInk);
  const burstInks = (options.burstInks.length ? options.burstInks : [options.closeInk]).map(rgbOf);
  const arcs = plan.steps.filter((s) => s.kind === 'arc' && s.compass);
  const cues: { t: number; event: RevealEvent }[] = [
    ...plan.stages.map((s, stage) => ({ t: s.t0, event: { type: 'stage', stage } as RevealEvent })),
    { t: plan.close, event: { type: 'close' } },
    { t: plan.burst, event: { type: 'burst' } },
  ];
  let cue = 0,
    t = 0,
    now = 0,
    mode: 'construct' | 'ambient' = 'construct',
    rushed = false;
  let w = 1,
    h = 1,
    dpr = 1,
    k = 1,
    cx = 0,
    cy = 0,
    zoom = 1,
    sx = 0,
    sy = 0;
  let raf = 0,
    running = false,
    visible = true,
    last = 0,
    sparkDebt = 0,
    shake = 0;
  let mood: RGB | null = null,
    glow: RGB = inks[0];
  const motes: Particle[] = [],
    sparks: Particle[] = [],
    rings: Ring[] = [],
    flashes: Flash[] = [];

  // Layout: the figure sits in a square slightly above centre, leaving room for the caption.
  function resize(width: number, height: number, ratio: number) {
    w = Math.max(1, width);
    h = Math.max(1, height);
    // Sharp on retina screens, but capped at about four million pixels: the glow is soft anyway.
    dpr = Math.max(1, Math.min(2, ratio || 1, Math.sqrt(4.2e6 / (w * h))));
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    const side = Math.min(w * 0.94, h * 0.74, 760);
    k = side / 1000;
    cx = w / 2;
    cy = h * 0.45;
    const want = Math.round(clamp((w * h) / 8000, 70, 200));
    while (motes.length < want) motes.push(newMote(true));
    motes.length = want;
  }
  function newMote(anywhere: boolean): Particle {
    const edge = Math.random();
    const x = anywhere ? Math.random() * w : edge < 0.5 ? Math.random() * w : edge < 0.75 ? -4 : w + 4;
    const y = anywhere ? Math.random() * h : edge < 0.5 ? h + 4 : Math.random() * h;
    return {
      x,
      y,
      vx: (Math.random() - 0.5) * 12,
      vy: -4 - Math.random() * 12,
      life: anywhere ? 1 : 0,
      max: Infinity,
      size: 0.6 + Math.random() * 1.3,
      rgb: DUST,
      kind: 0,
      tw: Math.random() * 7,
    };
  }
  const toScreen = (p: Pt): [number, number] => [
    cx + sx + (p[0] - O[0]) * k * zoom,
    cy + sy + (p[1] - O[1]) * k * zoom,
  ];

  // Where each stroke is at progress u, and its path.
  function head(s: Timed, u: number): Pt {
    if (s.kind === 'line') return [lerp(s.a[0], s.b[0], u), lerp(s.a[1], s.b[1], u)];
    if (s.kind === 'arc') return onCircle(s.c, s.r, lerp(s.a0, s.a1, u));
    const lengths = s.pts.slice(1).map((p, i) => Math.hypot(p[0] - s.pts[i][0], p[1] - s.pts[i][1]));
    let d = u * lengths.reduce((a, b) => a + b, 0);
    for (let i = 0; i < lengths.length; i++) {
      if (d <= lengths[i]) {
        const f = lengths[i] ? d / lengths[i] : 0;
        return [lerp(s.pts[i][0], s.pts[i + 1][0], f), lerp(s.pts[i][1], s.pts[i + 1][1], f)];
      }
      d -= lengths[i];
    }
    return s.pts[s.pts.length - 1];
  }
  function trace(s: Timed, u: number) {
    ctx.beginPath();
    if (s.kind === 'line') {
      ctx.moveTo(s.a[0], s.a[1]);
      const p = head(s, u);
      ctx.lineTo(p[0], p[1]);
      return;
    }
    if (s.kind === 'arc') {
      ctx.arc(s.c[0], s.c[1], s.r, s.a0, lerp(s.a0, s.a1, u), s.a1 < s.a0);
      return;
    }
    const lengths = s.pts.slice(1).map((p, i) => Math.hypot(p[0] - s.pts[i][0], p[1] - s.pts[i][1]));
    let d = u * lengths.reduce((a, b) => a + b, 0);
    ctx.moveTo(s.pts[0][0], s.pts[0][1]);
    for (let i = 0; i < lengths.length && d > 0; i++) {
      const f = Math.min(1, d / (lengths[i] || 1));
      ctx.lineTo(lerp(s.pts[i][0], s.pts[i + 1][0], f), lerp(s.pts[i][1], s.pts[i + 1][1], f));
      d -= lengths[i];
    }
  }
  /** Additive passes: a wide haze (figures only), a tighter glow, and the line itself. Widths in screen pixels. */
  function glowStroke(c: RGB, alpha: number, px: number, haze: boolean) {
    const unit = 1 / (k * zoom);
    if (haze) {
      ctx.strokeStyle = rgba(c, alpha * 0.06);
      ctx.lineWidth = px * 8 * unit;
      ctx.stroke();
    }
    ctx.strokeStyle = rgba(c, alpha * 0.15);
    ctx.lineWidth = px * 2.8 * unit;
    ctx.stroke();
    ctx.strokeStyle = rgba(mix(c, [255, 255, 255], 0.25), alpha * 0.95);
    ctx.lineWidth = px * unit;
    ctx.stroke();
  }
  // How bright a stroke of stage s is: drawn bright, settles when its stage ends, recedes when the next begins.
  function strength(stage: number, figure: boolean) {
    let a = figure ? 1 : 0.8;
    const own = plan.stages[stage],
      next = plan.stages[stage + 1];
    if (t > own.t1) a = lerp(a, figure ? 0.82 : 0.36, clamp((t - own.t1) / 0.5));
    if (next && t > next.t0) a = lerp(a, figure ? 0.52 : 0.17, clamp((t - next.t0) / 0.5));
    if (figure && t > plan.close) a = Math.max(a, 1 - 0.15 * clamp((t - plan.close - 0.2) / 0.3));
    if (t > plan.collapse) a = Math.min(1, a + clamp((t - plan.collapse) / COLLAPSE));
    return a;
  }
  // Each stroke keeps its own stage's ink, flashes to a new stage's ink as it floods in, and takes the
  // closing pigment when the figure is stamped.
  function inkOf(stage: number) {
    let c = inks[stage];
    for (let s = stage + 1; s < plan.stages.length; s++) {
      const f = (t - plan.stages[s].t0) / 0.65;
      if (f > 0 && f < 1) c = mix(c, inks[s], 0.85 * bell(f));
    }
    if (t > plan.close) c = mix(c, closeInk, 0.55 * clamp((t - plan.close) / 0.3));
    return c;
  }

  function camera() {
    const end = plan.burst;
    zoom = 1 + 0.04 * clamp(t / end);
    for (let s = 1; s < plan.stages.length; s++) zoom += 0.03 * bell((t - plan.stages[s].t0) / 0.5);
    if (t > plan.collapse) zoom *= 1 - 0.985 * Math.pow(clamp((t - plan.collapse) / COLLAPSE), 3);
    const amp = shake * Math.exp(-8 * (now - shakeAt));
    sx = (Math.random() - 0.5) * amp;
    sy = (Math.random() - 0.5) * amp;
  }
  let shakeAt = 0;
  const quake = (amount: number) => {
    shake = amount;
    shakeAt = now;
  };

  // Compass pose: needle at the centre of the arc being drawn, pencil at its head, leaning the way
  // the pencil travels. Between sweeps it glides to the next arc; after long gaps it fades away.
  type Pose = { n: Pt; p: Pt; lean: Pt; alpha: number };
  const poseOf = (a: Timed, u: number): Pose => {
    const arc = a as Extract<Timed, { kind: 'arc' }>,
      angle = lerp(arc.a0, arc.a1, u),
      turn = Math.sign(arc.a1 - arc.a0) || 1;
    return { n: arc.c, p: head(a, u), lean: [-Math.sin(angle) * turn, Math.cos(angle) * turn], alpha: 1 };
  };
  const between = (a: Pose, b: Pose, s: number): Pose => ({
    n: [lerp(a.n[0], b.n[0], s), lerp(a.n[1], b.n[1], s)],
    p: [lerp(a.p[0], b.p[0], s), lerp(a.p[1], b.p[1], s)],
    lean: [lerp(a.lean[0], b.lean[0], s) * (1 - bell(s) * 0.8), lerp(a.lean[1], b.lean[1], s) * (1 - bell(s) * 0.8)],
    alpha: 1,
  });
  function pose(): Pose | null {
    if (!arcs.length || t > plan.collapse) return null;
    const i = arcs.findIndex((a) => t < a.t1);
    if (i === -1) {
      const end = arcs[arcs.length - 1],
        f = clamp((t - end.t1) / 0.45);
      return f >= 1 ? null : { ...poseOf(end, 1), alpha: 1 - f };
    }
    const a = arcs[i];
    if (t >= a.t0) return poseOf(a, easeInOut(clamp((t - a.t0) / (a.t1 - a.t0))));
    const prev = arcs[i - 1];
    if (prev && a.t0 - prev.t1 < 0.9)
      return between(poseOf(prev, 1), poseOf(a, 0), easeInOut(clamp((t - prev.t1) / (a.t0 - prev.t1))));
    const fadeIn = 1 - clamp((a.t0 - t) / 0.45),
      fadeOut = prev ? 1 - clamp((t - prev.t1) / 0.45) : 0;
    if (fadeIn <= 0 && fadeOut <= 0) return null;
    return fadeIn >= fadeOut ? { ...poseOf(a, 0), alpha: fadeIn } : { ...poseOf(prev, 1), alpha: fadeOut };
  }
  // Drawn as if seen from the front and above: the hinge stands over the middle of the two points,
  // so its height reads as "up" on screen, and its shadow falls down and to the right.
  function drawCompass(q: Pose) {
    const r = Math.hypot(q.p[0] - q.n[0], q.p[1] - q.n[1]);
    const height = Math.sqrt(Math.max(LEG * LEG - (r * r) / 4, 900));
    const mx = (q.n[0] + q.p[0]) / 2,
      my = (q.n[1] + q.p[1]) / 2;
    const hinge: Pt = [mx + q.lean[0] * height * 0.2, my - height * 0.84 + q.lean[1] * height * 0.08];
    const axis = (top: Pt): [number, number] => {
      const ax = top[0] - mx,
        ay = top[1] - my,
        al = Math.hypot(ax, ay) || 1;
      return [ax / al, ay / al];
    };
    const shadow: Pt = [mx + height * 0.3 + q.lean[0] * height * 0.1, my + height * 0.13];
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = q.alpha * 0.3;
    silhouette(shadow, q.n, q.p, ...axis(shadow), '#000');
    ctx.globalAlpha = q.alpha;
    const [px, py] = axis(hinge),
      art = options.art;
    if (art?.needle && ready(art.needle)) legImage(art.needle, hinge, q.n);
    else leg(hinge, q.n, false);
    if (art?.pencil && ready(art.pencil)) legImage(art.pencil, hinge, q.p);
    else leg(hinge, q.p, true);
    if (art?.head && ready(art.head)) headImage(art.head, hinge, px, py);
    else head2(hinge, px, py);
    ctx.restore();
    // The lead glows in the current ink.
    const ink = inkOf(currentStage());
    const g = ctx.createRadialGradient(q.p[0], q.p[1], 0, q.p[0], q.p[1], 26 / (k * zoom));
    g.addColorStop(0, rgba(mix(ink, [255, 255, 255], 0.4), 0.55 * q.alpha));
    g.addColorStop(1, rgba(ink, 0));
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(q.p[0], q.p[1], 26 / (k * zoom), 0, Math.PI * 2);
    ctx.fill();
  }
  const ready = (img: HTMLImageElement) => img.complete && img.naturalWidth > 0;
  function silhouette(hinge: Pt, n: Pt, p: Pt, px: number, py: number, fill: string) {
    ctx.fillStyle = fill;
    for (const tip of [n, p]) {
      quad(hinge, tip, 11, 3);
      ctx.fill();
    }
    ctx.beginPath();
    ctx.arc(hinge[0], hinge[1], 17, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(hinge[0] - py * 5, hinge[1] + px * 5);
    ctx.lineTo(hinge[0] + px * 40 - py * 5, hinge[1] + py * 40 + px * 5);
    ctx.lineTo(hinge[0] + px * 40 + py * 5, hinge[1] + py * 40 - px * 5);
    ctx.lineTo(hinge[0] + py * 5, hinge[1] - px * 5);
    ctx.fill();
  }
  function quad(from: Pt, to: Pt, wide: number, narrow: number) {
    const dx = to[0] - from[0],
      dy = to[1] - from[1],
      len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len,
      ny = dx / len,
      end: Pt = [to[0] - (dx / len) * 22, to[1] - (dy / len) * 22];
    ctx.beginPath();
    ctx.moveTo(from[0] + (nx * wide) / 2, from[1] + (ny * wide) / 2);
    ctx.lineTo(end[0] + (nx * narrow) / 2, end[1] + (ny * narrow) / 2);
    ctx.lineTo(end[0] - (nx * narrow) / 2, end[1] - (ny * narrow) / 2);
    ctx.lineTo(from[0] - (nx * wide) / 2, from[1] - (ny * wide) / 2);
    ctx.closePath();
    return { nx, ny, end };
  }
  function leg(from: Pt, to: Pt, pencil: boolean) {
    const { nx, ny, end } = quad(from, to, 11, 3.6);
    const g = ctx.createLinearGradient(from[0] + nx * 6, from[1] + ny * 6, from[0] - nx * 6, from[1] - ny * 6);
    g.addColorStop(0, '#fff2c9');
    g.addColorStop(0.35, '#d8b469');
    g.addColorStop(0.75, '#8c6b32');
    g.addColorStop(1, '#4a3817');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = '#3a2c12aa';
    ctx.lineWidth = 0.9;
    ctx.stroke();
    ctx.lineCap = 'round';
    if (pencil) {
      // a dark sleeve and the lead
      ctx.strokeStyle = '#2a2722';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(end[0], end[1]);
      ctx.lineTo(lerp(end[0], to[0], 0.7), lerp(end[1], to[1], 0.7));
      ctx.stroke();
      ctx.strokeStyle = '#9a958a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(lerp(end[0], to[0], 0.7), lerp(end[1], to[1], 0.7));
      ctx.lineTo(to[0], to[1]);
      ctx.stroke();
    } else {
      // a steel needle
      ctx.strokeStyle = '#d6dcde';
      ctx.lineWidth = 1.7;
      ctx.beginPath();
      ctx.moveTo(end[0], end[1]);
      ctx.lineTo(to[0], to[1]);
      ctx.stroke();
    }
  }
  function head2(hinge: Pt, px: number, py: number) {
    // Knurled handle pointing away from the legs, then the hinge disc and its screw.
    const tipX = hinge[0] + px * 40,
      tipY = hinge[1] + py * 40;
    const g = ctx.createLinearGradient(hinge[0] - py * 5, hinge[1] + px * 5, hinge[0] + py * 5, hinge[1] - px * 5);
    g.addColorStop(0, '#f7e7b8');
    g.addColorStop(0.5, '#b8924c');
    g.addColorStop(1, '#5a441d');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(hinge[0] - py * 4.5, hinge[1] + px * 4.5);
    ctx.lineTo(tipX - py * 4.5, tipY + px * 4.5);
    ctx.lineTo(tipX + py * 4.5, tipY - px * 4.5);
    ctx.lineTo(hinge[0] + py * 4.5, hinge[1] - px * 4.5);
    ctx.fill();
    ctx.strokeStyle = '#4a3817aa';
    ctx.lineWidth = 1;
    for (let i = 1; i < 7; i++) {
      const bx = hinge[0] + px * (16 + i * 3.6),
        by = hinge[1] + py * (16 + i * 3.6);
      ctx.beginPath();
      ctx.moveTo(bx - py * 4.5, by + px * 4.5);
      ctx.lineTo(bx + py * 4.5, by - px * 4.5);
      ctx.stroke();
    }
    const disc = ctx.createRadialGradient(hinge[0] - 5, hinge[1] - 6, 2, hinge[0], hinge[1], 17);
    disc.addColorStop(0, '#fff4cf');
    disc.addColorStop(0.45, '#cfa75a');
    disc.addColorStop(1, '#5e4720');
    ctx.fillStyle = disc;
    ctx.beginPath();
    ctx.arc(hinge[0], hinge[1], 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#3a2c12';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.fillStyle = '#2f2410';
    ctx.beginPath();
    ctx.arc(hinge[0], hinge[1], 4.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#d9bd7a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(hinge[0] - 3, hinge[1] - 3);
    ctx.lineTo(hinge[0] + 3, hinge[1] + 3);
    ctx.stroke();
  }
  // SVG art contracts (docs/gacha-art-prompts.md): legs are 40 × 400 with the hinge at the top
  // centre and the point at the bottom centre; the head is 120 × 160 with its pivot at (60, 112).
  function legImage(img: HTMLImageElement, from: Pt, to: Pt) {
    ctx.save();
    ctx.translate(from[0], from[1]);
    ctx.rotate(Math.atan2(to[1] - from[1], to[0] - from[0]) - Math.PI / 2);
    const len = Math.hypot(to[0] - from[0], to[1] - from[1]);
    ctx.drawImage(img, -len * 0.05, 0, len * 0.1, len);
    ctx.restore();
  }
  function headImage(img: HTMLImageElement, hinge: Pt, px: number, py: number) {
    ctx.save();
    ctx.translate(hinge[0], hinge[1]);
    ctx.rotate(Math.atan2(px, -py));
    ctx.drawImage(img, -36, -67.2, 72, 96);
    ctx.restore();
  }

  const currentStage = () => {
    let s = 0;
    plan.stages.forEach((st, i) => {
      if (t >= st.t0) s = i;
    });
    return s;
  };
  const backgroundInk = () => {
    let c = inks[0];
    plan.stages.forEach((st, i) => {
      if (i) c = mix(c, inks[i], clamp((t - st.t0) / 0.45));
    });
    return t > plan.close ? mix(c, closeInk, clamp((t - plan.close) / 0.4)) : c;
  };

  function update(dt: number) {
    now += dt;
    if (mode === 'construct') {
      t += dt;
      while (cue < cues.length && cues[cue].t <= t) {
        const { event } = cues[cue++];
        // Stages skipped by fast-forward pass silently; only the burst keeps its fireworks.
        if (!rushed || event.type === 'burst') react(event);
        options.onEvent(event);
      }
      glow = backgroundInk();
    }
    camera();
    // Pens: the heads of the strokes being drawn, in screen pixels.
    const pens: [number, number][] = [];
    if (mode === 'construct' && t < plan.collapse)
      for (const s of plan.steps) {
        if (t >= s.t0 && t < s.t1) pens.push(toScreen(head(s, easeInOut((t - s.t0) / (s.t1 - s.t0)))));
      }
    const ink = inkOf(currentStage());
    sparkDebt += dt * 55 * pens.length;
    while (sparkDebt >= 1 && pens.length) {
      sparkDebt -= 1;
      const [x, y] = pens[(Math.random() * pens.length) | 0],
        a = Math.random() * Math.PI * 2,
        v = 25 + Math.random() * 95;
      sparks.push({
        x,
        y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v,
        life: 0,
        max: 0.25 + Math.random() * 0.35,
        size: 0.7 + Math.random() * 1.3,
        rgb: mix(ink, [255, 255, 255], 0.35),
        kind: 1,
        tw: 0,
      });
    }
    for (const m of motes) {
      m.tw += dt;
      if (m.life < 1) m.life = Math.min(1, m.life + dt * 0.8);
      let nearest = 0,
        best = Infinity;
      pens.forEach(([x, y], i) => {
        const d = Math.hypot(x - m.x, y - m.y);
        if (d < best) {
          best = d;
          nearest = i;
        }
      });
      if (best < 320) {
        // drawn into the nearest pen, with a little swirl
        const [x, y] = pens[nearest],
          ax = (x - m.x) / best,
          ay = (y - m.y) / best,
          pull = 2600 / (best + 30);
        m.vx += (ax * pull - ay * pull * 0.55) * dt;
        m.vy += (ay * pull + ax * pull * 0.55) * dt;
        if (best < 8) {
          sparks.push({
            x,
            y,
            vx: (Math.random() - 0.5) * 80,
            vy: (Math.random() - 0.5) * 80,
            life: 0,
            max: 0.4,
            size: 1.6,
            rgb: mix(ink, [255, 255, 255], 0.5),
            kind: 1,
            tw: 0,
          });
          Object.assign(m, newMote(false));
          continue;
        }
      }
      const damp = Math.exp(-dt * 1.4);
      const lift = mood ? -32 : -9;
      m.vx = m.vx * damp;
      m.vy = lerp(m.vy, lift, 1 - damp);
      m.x += m.vx * dt;
      m.y += m.vy * dt;
      if (mood) m.rgb = mix(m.rgb, mood, dt * 1.5);
      else if (m.rgb !== DUST) m.rgb = mix(m.rgb, DUST, dt * 1.5);
      if (m.y < -8 || m.x < -10 || m.x > w + 10 || m.y > h + 10) Object.assign(m, newMote(false));
    }
    for (const p of sparks) {
      p.life += dt;
      const drag = Math.exp(-dt * (p.kind === 2 ? 2.4 : 3.5));
      p.vx *= drag;
      p.vy = p.vy * drag + (p.kind === 2 ? 30 : 0) * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    for (let i = sparks.length - 1; i >= 0; i--) if (sparks[i].life >= sparks[i].max) sparks.splice(i, 1);
    for (let i = rings.length - 1; i >= 0; i--) if (now - rings[i].t0 > rings[i].dur) rings.splice(i, 1);
    for (let i = flashes.length - 1; i >= 0; i--) if (now - flashes[i].t0 > flashes[i].dur) flashes.splice(i, 1);
  }

  // Effects that go with each cue.
  function react(event: RevealEvent) {
    const [x, y] = [cx, cy];
    if (event.type === 'stage' && event.stage > 0) {
      const c = inks[event.stage],
        gold = event.stage === 3;
      rings.push({ t0: now, x, y, rgb: c, r1: 560 * k, dur: 0.8, width: 2 });
      flashes.push({ t0: now, dur: gold ? 0.8 : 0.55, rgb: c, peak: gold ? 0.42 : 0.22 });
      if (gold) {
        quake(7);
        rings.push({ t0: now + 0.06, x, y, rgb: WHITE_GOLD, r1: 760 * k, dur: 1.1, width: 1.2 });
      }
      burst(x, y, c, gold ? 70 : 34, 420);
    }
    if (event.type === 'close') rings.push({ t0: now, x, y, rgb: closeInk, r1: 470 * k, dur: 0.6, width: 1.6 });
    if (event.type === 'burst') {
      mode = 'ambient';
      const power = 0.45 + 0.1375 * clamp(options.top, 0, 4); // .45 for a B, 1 for a 5★
      flashes.push({ t0: now, dur: 0.7, rgb: mix(closeInk, WHITE_GOLD, 0.5), peak: 0.85 * power });
      rings.push({ t0: now, x, y, rgb: closeInk, r1: Math.max(w, h) * 0.8 * power, dur: 0.9, width: 2.4 });
      if (options.top >= 2)
        rings.push({ t0: now + 0.05, x, y, rgb: WHITE_GOLD, r1: Math.max(w, h) * 0.42, dur: 0.6, width: 1.2 });
      const many = Math.round(clamp((w * h) / 6000, 90, 190) * power);
      for (let i = 0; i < many; i++) burst(x, y, burstInks[(Math.random() * burstInks.length) | 0], 1, 1000);
      if (options.stages === 4) quake(9);
    }
  }
  function burst(x: number, y: number, c: RGB, n: number, speed: number) {
    const reach = Math.min(1.4, Math.max(0.6, w / 1100));
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2,
        v = (0.25 + Math.random() * 0.75) * speed * reach;
      sparks.push({
        x,
        y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v,
        life: 0,
        max: 0.6 + Math.random() * 0.9,
        size: 0.9 + Math.random() * 1.9,
        rgb: mix(c, [255, 255, 255], Math.random() * 0.4),
        kind: 2,
        tw: 0,
      });
    }
  }

  function draw() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // A wash of the current ink behind the figure.
    const strong = mode === 'construct' ? 0.1 + 0.1 * clamp((t - plan.close) / 0.4) : 0.07;
    const wash = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) * 0.6);
    wash.addColorStop(0, rgba(glow, strong));
    wash.addColorStop(1, rgba(glow, 0));
    ctx.fillStyle = wash;
    ctx.fillRect(0, 0, w, h);

    // Figure space: 1000 units across, centred on the figure.
    const s = k * zoom;
    ctx.setTransform(dpr * s, 0, 0, dpr * s, dpr * (cx + sx - O[0] * s), dpr * (cy + sy - O[1] * s));
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    protractor();
    ctx.globalCompositeOperation = 'lighter';
    if (mode === 'construct') {
      for (const step of plan.steps) {
        if (t < step.t0) continue;
        const u = easeInOut(clamp((t - step.t0) / (step.t1 - step.t0)));
        trace(step, u);
        const figure = step.role === 'figure';
        glowStroke(
          inkOf(step.stage),
          strength(step.stage, figure),
          figure ? (w < 600 ? 1.6 : 2) : w < 600 ? 0.9 : 1.1,
          figure || t < step.t1 + 0.3,
        );
        if (u < 1) nib(head(step, u), inkOf(step.stage));
      }
      marks();
      const q = pose();
      if (q) drawCompass(q);
    } else afterimage();

    // Screen space: dust, sparks, rings and flashes.
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalCompositeOperation = 'lighter';
    for (const m of motes) {
      const a = m.life * (0.18 + 0.3 * (0.5 + 0.5 * Math.sin(m.tw * 1.7)));
      ctx.fillStyle = rgba(m.rgb, a);
      ctx.fillRect(m.x - m.size / 2, m.y - m.size / 2, m.size, m.size);
    }
    ctx.lineCap = 'round';
    for (const p of sparks) {
      const f = 1 - p.life / p.max,
        a = p.kind === 2 ? f * f : f;
      if (p.kind === 2) {
        // embers streak along their flight
        ctx.strokeStyle = rgba(p.rgb, a * 0.55);
        ctx.lineWidth = p.size;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.vx * 0.045, p.y - p.vy * 0.045);
        ctx.stroke();
      } else {
        ctx.fillStyle = rgba(p.rgb, a * 0.16);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 3.2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = rgba(p.rgb, a);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const r of rings) {
      const f = clamp((now - r.t0) / r.dur);
      if (f <= 0) continue;
      const radius = Math.max(0.1, r.r1 * easeOut(f));
      ctx.beginPath();
      ctx.arc(r.x + sx, r.y + sy, radius, 0, Math.PI * 2);
      ctx.strokeStyle = rgba(r.rgb, 0.14 * (1 - f));
      ctx.lineWidth = r.width * 7;
      ctx.stroke();
      ctx.strokeStyle = rgba(mix(r.rgb, [255, 255, 255], 0.3), 0.7 * (1 - f));
      ctx.lineWidth = r.width;
      ctx.stroke();
    }
    // Flashes are light, not paint: an additive glow from the figure's centre.
    for (const f of flashes) {
      const p = clamp((now - f.t0) / f.dur),
        a = f.peak * (1 - p) * (1 - p);
      if (a <= 0) continue;
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) * (0.35 + 0.4 * p));
      g.addColorStop(0, rgba(mix(f.rgb, [255, 255, 255], 0.35), a));
      g.addColorStop(0.45, rgba(f.rgb, a * 0.35));
      g.addColorStop(1, rgba(f.rgb, 0));
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }
    ctx.globalCompositeOperation = 'source-over';
  }
  function nib(p: Pt, c: RGB) {
    const r = 20 / (k * zoom);
    const g = ctx.createRadialGradient(p[0], p[1], 0, p[0], p[1], r);
    g.addColorStop(0, rgba([255, 255, 255], 0.9));
    g.addColorStop(0.18, rgba(mix(c, [255, 255, 255], 0.4), 0.55));
    g.addColorStop(1, rgba(c, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(p[0], p[1], r, 0, Math.PI * 2);
    ctx.fill();
  }
  function marks() {
    const unit = 1 / (k * zoom),
      font = clamp((15 * k) / 0.62, 11, 17) * unit;
    ctx.font = `italic ${font}px "STIX Two Text", Cambria, Georgia, serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const m of plan.marks) {
      if (t < m.t) continue;
      const age = t - m.t,
        c = inkOf(m.stage),
        a = strength(m.stage, true);
      ctx.fillStyle = rgba(mix(c, [255, 255, 255], 0.35), a);
      ctx.beginPath();
      ctx.arc(m.p[0], m.p[1], 2.6 * unit, 0, Math.PI * 2);
      ctx.fill();
      if (age < 0.45) {
        ctx.strokeStyle = rgba(c, 0.7 * (1 - age / 0.45));
        ctx.lineWidth = 1.2 * unit;
        ctx.beginPath();
        ctx.arc(m.p[0], m.p[1], (3 + 18 * easeOut(age / 0.45)) * unit, 0, Math.PI * 2);
        ctx.stroke();
      }
      if (!m.label) continue;
      // Labels belong to their own stage and fade when the next one floods in.
      const next = plan.stages[m.stage + 1];
      let la = clamp(age / 0.2) * (next ? 1 - clamp((t - next.t0) / 0.3) : 1) * (1 - clamp((t - plan.close) / 0.3));
      if (la <= 0) continue;
      const dx = m.p[0] - O[0],
        dy = m.p[1] - O[1],
        d = Math.hypot(dx, dy);
      const [ox, oy] = m.side ?? (Math.abs(dy) < 1 ? [0, 1] : [dx / d, dy / d]);
      ctx.fillStyle = rgba([241, 235, 217], 0.78 * la);
      ctx.fillText(m.label, m.p[0] + ox * 16 * unit + oy * 3 * unit, m.p[1] + oy * 16 * unit);
    }
  }
  function protractor() {
    const fade = mode === 'construct' ? 1 - clamp((t - plan.collapse) / COLLAPSE) : 0.55;
    if (fade <= 0) return;
    const unit = 1 / (k * zoom),
      turn = now * 0.012;
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = rgba([201, 180, 130], 0.13 * fade);
    ctx.lineWidth = unit;
    ctx.beginPath();
    ctx.arc(500, 500, 476, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    for (let i = 0; i < 120; i++) {
      const a = turn + (i * Math.PI) / 60,
        long = i % 10 === 0 ? 16 : 6;
      ctx.moveTo(500 + Math.cos(a) * 476, 500 + Math.sin(a) * 476);
      ctx.lineTo(500 + Math.cos(a) * (476 - long), 500 + Math.sin(a) * (476 - long));
    }
    ctx.strokeStyle = rgba([201, 180, 130], 0.2 * fade);
    ctx.stroke();
  }
  // After the burst the finished figure stays as a faint, slowly turning watermark.
  function afterimage() {
    const fig = FIGURES[options.stages - 1],
      unit = 1 / (k * zoom);
    ctx.save();
    ctx.translate(500, 500);
    ctx.rotate(now * 0.02);
    ctx.translate(-500, -500);
    ctx.beginPath();
    for (const [c, r] of fig.circles) {
      ctx.moveTo(c[0] + r, c[1]);
      ctx.arc(c[0], c[1], r, 0, Math.PI * 2);
    }
    for (const pts of fig.polys) pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
    ctx.strokeStyle = rgba(closeInk, 0.085);
    ctx.lineWidth = 1.4 * unit;
    ctx.stroke();
    ctx.restore();
  }

  function frame(time: number) {
    raf = 0;
    if (!running || !visible) return;
    // Keep real time on slow devices, but treat a long stall (a busy tab, a debugger) as a pause.
    const raw = Math.max(0, (time - last) / 1000),
      dt = raw > 0.25 ? 1 / 60 : raw;
    last = time;
    update(dt);
    draw();
    raf = requestAnimationFrame(frame);
  }
  const wake = () => {
    if (running && visible && !raf) {
      last = performance.now();
      raf = requestAnimationFrame(frame);
    }
  };
  const sleep = () => {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  };

  return {
    resize,
    start() {
      running = true;
      wake();
    },
    destroy() {
      running = false;
      sleep();
      motes.length = 0;
      sparks.length = 0;
      rings.length = 0;
      flashes.length = 0;
    },
    setVisible(v) {
      visible = v;
      if (v) wake();
      else sleep();
    },
    fastForward() {
      if (mode === 'construct' && t < plan.collapse) {
        t = plan.collapse;
        rushed = true;
      }
    },
    finish() {
      if (mode === 'construct') {
        mode = 'ambient';
        t = plan.burst;
        cue = cues.length;
      }
    },
    sparkAt(x, y, ink, count) {
      burst(x, y, rgbOf(ink), count, 520);
    },
    setMood(ink) {
      mood = ink ? rgbOf(ink) : null;
    },
    centre: () => [cx, cy],
  };
}
