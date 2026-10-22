// Motion for the rewound world: the camera, the laws that change places, and a
// canvas of particles drawn over the scene. Every effect is a pure function of
// its progress, so rewinding plays the same effect backwards.

import { APEX, AXIOM_ORIGIN, CAMERA, CREATURES, ELEMENT_COLOR, ENSA_FROM, H, ILAR, ILAR_FROM, KINGDOM_OF, NC, ORIGO_TOWNS, PASSES, ROUTES, S, SLOT, TOWNS, W, lawSlots, rng, type P } from './world';

export type Move = 'fwd' | 'back' | 'jump';
type FxKind = 'condense' | 'axiom' | 'gods' | 'hunt' | 'totems' | 'demotion' | 'paradox' | 'restoration' | 'present';
// The effect that opens each stop. The long vacancy has none: nothing happens, for generations.
const FX_AT: (FxKind | null)[] = ['condense', 'axiom', 'gods', 'hunt', 'totems', 'demotion', 'paradox', null, 'restoration', 'present'];
const SECONDS: Record<FxKind, number> = { condense: 3.4, axiom: 3.2, gods: 1.8, hunt: 5.4, totems: 3.6, demotion: 3, paradox: 5.4, restoration: 3.6, present: 3.4 };
// How long play mode lingers on a stop, in milliseconds.
export const dwell = (s: number) => { const kind = FX_AT[s]; return Math.max(5600, ((kind ? SECONDS[kind] : 3) + 2.6) * 1000); };
// When stepping forward, Number and Sets move only after the moment's opening beat.
const RIG_DELAY: Partial<Record<number, number>> = { [S.demotion]: .7, [S.paradox]: 2.5, [S.restoration]: 2 };

export type Refs = {
  world: SVGGElement | null; number: SVGGElement | null; sets: SVGGElement | null;
  apexNumber: SVGLineElement | null; apexSets: SVGLineElement | null; setsNumber: SVGLineElement | null; threadNumber: SVGLineElement | null;
};
type Node = { x: number; y: number; tx: number; ty: number; at: number };
type Fx = { kind: FxKind; t0: number; dur: number; rev: boolean; data: any[] };
type Mote = { x: number; y: number; vx: number; vy: number; life: number; max: number; color: string; size: number };

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const ease = (t: number) => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const bell = (t: number) => Math.sin(Math.PI * clamp(t));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const ELEMENTS = Object.values(ELEMENT_COLOR);
function rgba(hex: string, a: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
}
// The point a fraction u of the way along a polyline.
function along(path: P[], u: number): P {
  const lengths = path.slice(1).map((p, i) => Math.hypot(p[0] - path[i][0], p[1] - path[i][1]));
  let d = clamp(u) * lengths.reduce((a, b) => a + b, 0);
  for (let i = 0; i < lengths.length; i++) {
    if (d <= lengths[i] || i === lengths.length - 1) {
      const t = lengths[i] ? clamp(d / lengths[i]) : 0;
      return [lerp(path[i][0], path[i + 1][0], t), lerp(path[i][1], path[i + 1][1], t)];
    }
    d -= lengths[i];
  }
  return path[path.length - 1];
}
// The point a fraction u of the way along an arc that rises `height` above the straight line.
function arc(a: P, b: P, u: number, height: number): P {
  const e = ease(clamp(u));
  return [lerp(a[0], b[0], e), lerp(a[1], b[1], e) - Math.sin(Math.PI * e) * height];
}

export function createEngine(canvas: HTMLCanvasElement, refs: Refs) {
  const ctx = canvas.getContext('2d')!;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  let scale = 1, mobile = false, visible = true, raf = 0, last = performance.now();
  let stop = 0, fx: Fx | null = null, aurora = 1, trails = 0, moteClock = 0;
  const motes: Mote[] = [];
  const first = lawSlots(0);
  const node = (p: P): Node => ({ x: p[0], y: p[1], tx: p[0], ty: p[1], at: 0 });
  const rig = { number: node(first.number), sets: node(first.sets) };
  const cam = { x: 500, y: 320, z: 1 };

  function target() {
    const c = CAMERA[stop];
    const z = mobile ? 1.08 + (c.zoom - 1) * 1.2 : 1 + (c.zoom - 1) * .6;
    const hw = W / 2 / z, hh = H / 2 / z;
    return { x: clamp(c.at[0], hw, W - hw), y: clamp(c.at[1], hh, H - hh), z };
  }
  const line = (el: SVGLineElement | null, a: P, b: P) => {
    if (!el) return;
    el.setAttribute('x1', a[0].toFixed(1)); el.setAttribute('y1', a[1].toFixed(1));
    el.setAttribute('x2', b[0].toFixed(1)); el.setAttribute('y2', b[1].toFixed(1));
  };
  function apply() {
    refs.world?.setAttribute('transform', `translate(${W / 2} ${H / 2}) scale(${cam.z.toFixed(4)}) translate(${(-cam.x).toFixed(2)} ${(-cam.y).toFixed(2)})`);
    const n: P = [rig.number.x, rig.number.y], s: P = [rig.sets.x, rig.sets.y];
    refs.number?.setAttribute('transform', `translate(${n[0].toFixed(1)} ${n[1].toFixed(1)})`);
    refs.sets?.setAttribute('transform', `translate(${s[0].toFixed(1)} ${s[1].toFixed(1)})`);
    line(refs.apexNumber, APEX, n); line(refs.apexSets, APEX, s); line(refs.setsNumber, s, n);
    line(refs.threadNumber, n, TOWNS[KINGDOM_OF.number]);
  }

  function make(kind: FxKind, now: number, rev: boolean): Fx {
    const r = rng(1 + (Math.floor(now) % 99991));
    const data: any[] = [];
    if (kind === 'condense') {
      for (let i = 0; i < 180; i++) {
        const c = CREATURES[Math.floor(r() * CREATURES.length)], a = r() * Math.PI * 2, d = 120 + r() * 380;
        data.push({ tx: c.at[0], ty: c.at[1], dx: Math.cos(a) * d, dy: Math.sin(a) * d * .55 - 40, spin: (r() - .5) * 4, delay: r() * .35, size: .8 + r() * 1.8, color: c.color });
      }
    } else if (kind === 'axiom' || kind === 'demotion' || kind === 'paradox' || kind === 'restoration') {
      for (let i = 0; i < 40; i++) data.push({ a: r() * Math.PI * 2, v: 20 + r() * 80, size: .7 + r() * 1.6 });
    } else if (kind === 'gods') {
      for (const p of [SLOT.top, NC]) for (let i = 0; i < 26; i++) data.push({ x: p[0], y: p[1], a: r() * Math.PI * 2, v: 20 + r() * 70, size: .7 + r() * 1.5, color: p === NC ? '#f3a47e' : '#f3d98e' });
    } else if (kind === 'hunt') {
      ROUTES.forEach((_, route) => { for (let i = 0; i < 14; i++) data.push({ t: 'army', route, i, jitter: (r() - .5) * 8 }); });
      for (const c of CREATURES) {
        const n = c.kind === 'unicorn' ? 26 : c.kind === 'dragon' ? 9 : c.kind === 'phoenix' ? 14 : 0;
        for (let i = 0; i < n; i++) data.push({ t: 'soak', x: c.at[0] + (r() - .5) * 18, y: c.at[1] + (r() - .5) * 12, dx: (r() - .5) * 40, dy: 30 + r() * 46, delay: .42 + r() * .3, size: .8 + r() * 1.5, color: c.color });
      }
      for (let i = 0; i < 12; i++) data.push({ t: 'spoil', route: i % 2, delay: r() * .08, jitter: (r() - .5) * 8 });
    } else if (kind === 'totems') {
      for (let i = 0; i < 120; i++) {
        const town = TOWNS[Math.floor(r() * TOWNS.length)];
        data.push({ sx: 20 + r() * 960, sy: 430 + r() * 190, tx: town[0] + (r() - .5) * 26, ty: town[1] + (r() - .5) * 16, lift: 30 + r() * 90, delay: r() * .4, size: .8 + r() * 1.6, color: ELEMENTS[Math.floor(r() * ELEMENTS.length)] });
      }
    } else if (kind === 'present') {
      for (let i = 0; i < 28; i++) {
        const to = ORIGO_TOWNS[i % 2], from = PASSES[Math.floor(r() * 2)];
        data.push({ sx: from[0], sy: from[1], tx: to[0] + (r() - .5) * 26, ty: to[1] + (r() - .5) * 14, delay: r() * .45, lift: 20 + r() * 40 });
      }
    }
    // Rewinding runs faster than history did.
    return { kind, t0: now, dur: SECONDS[kind] * 1000 * (rev ? .6 : 1), rev, data };
  }

  function dot(x: number, y: number, size: number, color: string, alpha: number) {
    if (alpha <= .01) return;
    ctx.fillStyle = color;
    ctx.globalAlpha = alpha * .28; ctx.beginPath(); ctx.arc(x, y, size * 3.2, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = alpha; ctx.beginPath(); ctx.arc(x, y, size, 0, Math.PI * 2); ctx.fill();
  }
  // A jagged strike between two points.
  function bolt(a: P, b: P, alpha: number, color: string, seed: number) {
    if (alpha <= .01) return;
    const steps = 9, nx = -(b[1] - a[1]), ny = b[0] - a[0], len = Math.hypot(nx, ny) || 1;
    ctx.strokeStyle = color; ctx.lineCap = 'round';
    for (const [width, k] of [[6, .18], [1.8, 1]] as const) {
      // The same seed draws the glow and the core along the same jagged path.
      const r = rng(seed);
      ctx.globalAlpha = alpha * k; ctx.lineWidth = width; ctx.beginPath(); ctx.moveTo(a[0], a[1]);
      for (let i = 1; i < steps; i++) {
        const t = i / steps, off = (r() - .5) * 16;
        ctx.lineTo(lerp(a[0], b[0], t) + nx / len * off, lerp(a[1], b[1], t) + ny / len * off);
      }
      ctx.lineTo(b[0], b[1]); ctx.stroke();
    }
  }
  function comet(a: P, b: P, u: number, height: number, color: string, size: number) {
    for (let j = 0; j < 16; j++) {
      const uu = u - j * .012;
      if (uu <= 0) break;
      const [x, y] = arc(a, b, uu, height);
      dot(x, y, Math.max(.4, size - j * .13), color, (1 - j / 16) * (j ? .5 : 1));
    }
  }
  function burst(data: any[], at: P, q: number, color: string, fall = 0) {
    if (q <= 0 || q >= 1) return;
    const e = 1 - Math.pow(1 - q, 3);
    for (const d of data) dot(at[0] + Math.cos(d.a) * d.v * e, at[1] + Math.sin(d.a) * d.v * e + fall * q * q, d.size, color, (1 - q) * .9);
  }

  function draw(f: Fx, p: number) {
    const num: P = [rig.number.x, rig.number.y], sets: P = [rig.sets.x, rig.sets.y];
    if (f.kind === 'condense') {
      // The world condenses raw power into living vessels: the first creatures.
      for (const d of f.data) {
        const q = clamp((p - d.delay) / .62);
        if (q <= 0) continue;
        const s = 1 - ease(q), ang = d.spin * s;
        const x = d.tx + (d.dx * Math.cos(ang) - d.dy * Math.sin(ang)) * s, y = d.ty + (d.dx * Math.sin(ang) + d.dy * Math.cos(ang)) * s;
        dot(x, y, d.size * (.6 + s), d.color, Math.min(1, q * 5) * (1 - clamp((q - .85) / .15)) * .9);
      }
    } else if (f.kind === 'axiom') {
      // A bead of light leaves the Law of All Laws and settles on Llama as the Axiom.
      burst(f.data, APEX, clamp(p / .3), '#f6e3a4');
      const q = clamp(p / .32);
      if (q > 0 && q < 1) comet(APEX, AXIOM_ORIGIN, q, 30, '#f6e3a4', 2.6);
      // Its instructions are released openly, and spread.
      ctx.save(); ctx.beginPath(); ctx.rect(0, 396, W, H); ctx.clip();
      for (let i = 0; i < 3; i++) {
        const w = clamp((p - .3 - i * .12) / .6);
        if (w <= 0 || w >= 1) continue;
        const rr = 12 + ease(w) * 430;
        ctx.globalAlpha = (1 - w) * .6; ctx.strokeStyle = '#e9cf86'; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.ellipse(AXIOM_ORIGIN[0], AXIOM_ORIGIN[1], rr, rr * .42, 0, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.restore();
    } else if (f.kind === 'gods') {
      const q = clamp(p / .7);
      if (q > 0 && q < 1) for (const d of f.data) { const e = 1 - Math.pow(1 - q, 3); dot(d.x + Math.cos(d.a) * d.v * e, d.y + Math.sin(d.a) * d.v * e, d.size, d.color, (1 - q) * .9); }
    } else if (f.kind === 'hunt') {
      for (const d of f.data) {
        if (d.t === 'army') {
          // Mortal armies cross the Limitrest Range into Origo.
          const u = clamp((p - d.route * .06) * 1.45 - d.i * .028);
          if (u <= 0 || u >= 1) continue;
          const [x, y0] = along(ROUTES[d.route], u), y = y0 + d.jitter * .4;
          ctx.globalCompositeOperation = 'source-over';
          ctx.globalAlpha = Math.min(1, u * 12) * (1 - clamp((u - .9) / .1));
          ctx.fillStyle = '#e4876a'; ctx.beginPath(); ctx.arc(x, y, 1.9, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = '#f1c9a8'; ctx.lineWidth = .8; ctx.beginPath(); ctx.moveTo(x + 1.4, y - 1); ctx.lineTo(x + 3.4, y - 6.5); ctx.stroke();
          ctx.globalCompositeOperation = 'lighter';
        } else if (d.t === 'soak') {
          // The power soaks into the world.
          const q = clamp((p - d.delay) / .45);
          if (q > 0 && q < 1) dot(d.x + d.dx * q, d.y + d.dy * ease(q), d.size, d.color, bell(q) * .85);
        } else {
          // Spoils go home: skin, scales and bone.
          const u = clamp((p - .64 - d.delay) / .34);
          if (u <= 0 || u >= 1) continue;
          const [x, y] = along(ROUTES[d.route], 1 - u);
          dot(x, y + d.jitter * .4, 1.3, '#efe3c6', bell(u) * .8);
        }
      }
      // Daylight catches the trolls.
      const q = clamp((p - .5) / .22);
      if (q > 0 && q < 1) for (const c of CREATURES) if (c.kind === 'troll') {
        const g = ctx.createRadialGradient(c.at[0], c.at[1], 0, c.at[0], c.at[1], 50);
        g.addColorStop(0, `rgba(255,248,220,${.75 * bell(q)})`); g.addColorStop(1, 'rgba(255,248,220,0)');
        ctx.globalAlpha = 1; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(c.at[0], c.at[1], 50, 0, Math.PI * 2); ctx.fill();
      }
    } else if (f.kind === 'totems') {
      // The world hands out totems: power rises out of the ground into ordinary mortals.
      for (const d of f.data) {
        const q = clamp((p - d.delay) / .58);
        if (q <= 0 || q >= 1) continue;
        const e = ease(q);
        dot(lerp(d.sx, d.tx, e), lerp(d.sy, d.ty, e) - Math.sin(Math.PI * e) * d.lift, d.size, d.color, bell(q) * .95);
      }
    } else if (f.kind === 'demotion') {
      // Sets is discovered where it always waited.
      burst(f.data, sets, clamp(p / .3), '#d6e4ff');
      // Sets' first holder murders Number's first holder by hand.
      const q = clamp((p - .55) / .2);
      if (q > 0 && q < 1) { bolt(sets, num, bell(q), '#ff7a66', 7); dot(num[0], num[1], 5, '#ff7a66', bell(q)); }
    } else if (f.kind === 'paradox') {
      // Ilar wins Number's test, then strikes Sets one stroke after another.
      const won = clamp((p - .03) / .1);
      if (won > 0 && won < 1) dot(num[0], num[1], 4 + 8 * won, '#f6d77e', 1 - won);
      [.12, .22, .32].forEach((at, i) => {
        const q = clamp((p - at) / .07);
        if (q > 0 && q < 1) { bolt(num, sets, bell(q), '#fff1c4', 11 + i * 17); dot(sets[0], sets[1], 6, '#fff1c4', bell(q)); }
      });
      // The original Sets breaks.
      burst(f.data, sets, clamp((p - .34) / .3), '#cfe0ff', 30);
      // Ilar assumes Sets is finished and flees over the range to the earth dragons.
      const u = clamp((p - .6) / .34);
      if (u > 0 && u < 1) comet(ILAR_FROM, ILAR, u, 320, '#f6d77e', 2.6);
      const land = clamp((p - .93) / .07);
      if (land > 0 && land < 1) dot(ILAR[0], ILAR[1], 7 * land, '#f6d77e', 1 - land);
    } else if (f.kind === 'restoration') {
      // Ensa wins Sets' test, the first to score in generations.
      const u = clamp(p / .33);
      if (u > 0 && u < 1) comet(ENSA_FROM, sets, u, 60, '#f4f8ff', 2.4);
      burst(f.data, sets, clamp((p - .3) / .25), '#e9f1ff');
    } else if (f.kind === 'present') {
      // Mortals settle Origo too.
      for (const d of f.data) {
        const q = clamp((p - d.delay) / .55);
        if (q <= 0 || q >= 1) continue;
        const e = ease(q);
        dot(lerp(d.sx, d.tx, e), lerp(d.sy, d.ty, e) - Math.sin(Math.PI * e) * d.lift, 1.4, '#efe6cf', bell(q) * .9);
      }
    }
  }

  // Power in the air over Origo, fading after the Hunt broke the dragons' monopoly.
  function drawAurora(now: number) {
    const bands: [string, number, number][] = [[ELEMENT_COLOR.earth, 318, 0], [ELEMENT_COLOR.water, 268, 1.7], [ELEMENT_COLOR.air, 214, 3.1], [ELEMENT_COLOR.plasma, 166, 4.4]];
    for (const [color, base, phase] of bands) {
      const g = ctx.createLinearGradient(560, 0, 1000, 0);
      g.addColorStop(0, rgba(color, 0)); g.addColorStop(.3, rgba(color, 1)); g.addColorStop(1, rgba(color, .8));
      ctx.strokeStyle = g; ctx.lineCap = 'round';
      ctx.beginPath();
      for (let x = 560; x <= 1000; x += 10) {
        const y = base + Math.sin(x * .011 + now * .00035 + phase) * 14 + Math.sin(x * .027 + now * .0006 + phase * 2) * 6;
        if (x === 560) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.globalAlpha = aurora * .14; ctx.lineWidth = 28; ctx.stroke();
      ctx.globalAlpha = aurora * .2; ctx.lineWidth = 7; ctx.stroke();
    }
  }
  // Star trails for the long vacancy: generations pass under a sky that keeps turning.
  function drawTrails(now: number) {
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, 398); ctx.clip();
    ctx.strokeStyle = '#ebe4cc'; ctx.lineWidth = .8;
    for (let i = 0; i < 13; i++) {
      const rr = 40 + i * 27, a0 = now * .00011 * (1 + i * .04) + i * 1.3;
      ctx.globalAlpha = trails * (.1 + (i % 3) * .05);
      ctx.beginPath(); ctx.arc(APEX[0], APEX[1], rr, a0, a0 + .9 + (i % 4) * .3); ctx.stroke();
    }
    ctx.restore();
  }
  function spawnMote() {
    if (motes.length > 80) return;
    const r = Math.random, color = ELEMENTS[Math.floor(r() * ELEMENTS.length)];
    if (stop <= S.gods) motes.push({ x: 620 + r() * 370, y: 420 + r() * 190, vx: (r() - .5) * 6, vy: -(14 + r() * 18), life: 0, max: 4 + r() * 3, color, size: .6 + r() * .9 });
    else if (stop === S.hunt) motes.push({ x: 600 + r() * 390, y: 150 + r() * 200, vx: (r() - .5) * 4, vy: 12 + r() * 14, life: 0, max: 5 + r() * 3, color, size: .6 + r() * .9 });
    else motes.push({ x: r() * W, y: 440 + r() * 180, vx: (r() - .5) * 5, vy: -(8 + r() * 12), life: 0, max: 3.5 + r() * 3, color, size: .5 + r() * .8 });
  }
  function ambient(dt: number, now: number) {
    aurora += ((stop <= S.gods ? 1 : stop === S.hunt ? .45 : .26) - aurora) * (1 - Math.exp(-dt * 1.2));
    trails += ((stop === S.vacancy ? 1 : 0) - trails) * (1 - Math.exp(-dt * 1.4));
    drawAurora(now);
    if (trails > .01) drawTrails(now);
    moteClock += dt;
    while (moteClock > .1) { moteClock -= .1; spawnMote(); }
    for (let i = motes.length - 1; i >= 0; i--) {
      const m = motes[i];
      m.life += dt; m.x += m.vx * dt; m.y += m.vy * dt;
      if (m.life >= m.max) { motes.splice(i, 1); continue; }
      dot(m.x, m.y, m.size, m.color, bell(m.life / m.max) * .55);
    }
  }

  function frame(now: number) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(.05, (now - last) / 1000);
    last = now;
    if (!visible) return;
    const still = reduce.matches, tg = target(), kc = still ? 1 : 1 - Math.exp(-dt * 1.7), kr = still ? 1 : 1 - Math.exp(-dt * 3.4);
    cam.x += (tg.x - cam.x) * kc; cam.y += (tg.y - cam.y) * kc; cam.z += (tg.z - cam.z) * kc;
    for (const n of [rig.number, rig.sets]) if (now >= n.at) { n.x += (n.tx - n.x) * kr; n.y += (n.ty - n.y) * kr; }
    apply();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(scale * cam.z, 0, 0, scale * cam.z, scale * (W / 2 - cam.x * cam.z), scale * (H / 2 - cam.y * cam.z));
    ctx.globalCompositeOperation = 'lighter';
    if (!still) ambient(dt, now);
    if (fx) {
      const p = clamp((now - fx.t0) / fx.dur);
      draw(fx, fx.rev ? 1 - p : p);
      if (p >= 1) fx = null;
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  }

  function setStop(s: number, move: Move, prev: number, replay = false) {
    stop = s;
    const now = performance.now(), slots = lawSlots(s);
    const delay = move === 'fwd' && !replay && !reduce.matches ? (RIG_DELAY[s] ?? 0) : 0;
    for (const key of ['number', 'sets'] as const) {
      const n = rig[key];
      n.tx = slots[key][0]; n.ty = slots[key][1]; n.at = now + delay * 1000;
    }
    fx = null;
    if (reduce.matches) return;
    const kind = move === 'back' ? FX_AT[prev] : move === 'fwd' || replay ? FX_AT[s] : null;
    if (kind) fx = make(kind, now, move === 'back');
  }
  function resize(width: number, height: number) {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.max(1, Math.round(width * dpr)); canvas.height = Math.max(1, Math.round(height * dpr));
    scale = canvas.width / W; mobile = width < 560;
    const tg = target(); cam.x = tg.x; cam.y = tg.y; cam.z = tg.z;
  }

  apply();
  raf = requestAnimationFrame(frame);
  return {
    setStop, resize,
    setVisible(v: boolean) { visible = v; },
    destroy() { cancelAnimationFrame(raf); },
    // Plays the opening of the first stop, for the first visit.
    open() { if (!reduce.matches) fx = make('condense', performance.now(), false); },
  };
}
export type Engine = ReturnType<typeof createEngine>;
