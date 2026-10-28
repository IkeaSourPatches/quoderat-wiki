// Keep it flat: the simulation behind Aldous Vane's game, kept free of drawing code
// so it can be stepped and tuned headlessly (see scripts/check-game.mjs).
//
// Canon it follows: Aldous "lets the floor tilt". Those with time drift to the
// centre and the rest drift away. An assembly ends when it gives way to a
// standing committee, which is the moment his own test made him record.

export type Kind = 'time' | 'busy' | 'heir' | 'aldous';
export type Member = {
  id: number;
  kind: Kind;
  name: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  m: number;
  born: number; // simulation time the member appeared, for the join animation
  goal: number; // wander angle for heirs and Aldous
};
export type Note =
  | { t: number; type: 'event'; key: string }
  | { t: number; type: 'join'; name: number; x: number; y: number }
  | { t: number; type: 'leave'; name: number; x: number; y: number; reason: number }
  | { t: number; type: 'nudge'; x: number; y: number };
export type Over = { reason: 'committee' | 'dissolved'; years: number; names: number[] };
export type State = {
  t: number;
  members: Member[];
  nextId: number;
  names: number[];
  pull: number;
  push: number;
  committee: number;
  nextJoin: number;
  fired: string[];
  notes: Note[];
  over: Over | null;
  seed: number;
};

export const HALL = { cx: 300, cy: 300, R: 270, DAIS: 58, YEAR: 6, LIMIT: 3, MIN: 4, MAX: 18 };
const IN = 26,
  OUT = 20,
  DAMP = 1.6,
  TAP = 240,
  FLING = 760;
const DOORS = [0, Math.PI / 2, Math.PI, Math.PI * 1.5];
const AURA = { heir: [95, 2.2], aldous: [125, 2.6] } as const;
export const NAME_COUNT = 24;

export const year = (s: State) => s.t / HALL.YEAR;
// The tilt starts gentle so a new player can find their feet, then keeps growing.
export const ramp = (s: State) => Math.min(1, 0.45 + s.t / 14) * (1 + 0.03 * year(s));

function random(s: State) {
  s.seed = (s.seed * 16807) % 2147483647;
  return (s.seed - 1) / 2147483646;
}
function nextName(s: State) {
  if (!s.names.length) s.names = Array.from({ length: NAME_COUNT }, (_, i) => i).sort(() => random(s) - 0.5);
  return s.names.pop()!;
}
function add(s: State, kind: Kind, x: number, y: number, vx = 0, vy = 0): Member {
  const big = kind === 'aldous' ? [18, 5] : kind === 'heir' ? [16, 3] : [14, 1];
  const m: Member = {
    id: s.nextId++,
    kind,
    name: kind === 'time' || kind === 'busy' ? nextName(s) : -1,
    x,
    y,
    vx,
    vy,
    r: big[0],
    m: big[1],
    born: s.t,
    goal: random(s) * Math.PI * 2,
  };
  s.members.push(m);
  return m;
}
function atDoor(s: State, kind: Kind) {
  const a = DOORS[Math.floor(random(s) * DOORS.length)] + (random(s) - 0.5) * 0.15;
  const r = HALL.R - 24;
  const m = add(s, kind, HALL.cx + Math.cos(a) * r, HALL.cy + Math.sin(a) * r, -Math.cos(a) * 70, -Math.sin(a) * 70);
  if (m.name >= 0) s.notes.push({ t: s.t, type: 'join', name: m.name, x: m.x, y: m.y });
  return m;
}

export function create(seed = 1 + Math.floor(Math.random() * 2147483000)): State {
  const s: State = {
    t: 0,
    members: [],
    nextId: 1,
    names: [],
    pull: 1,
    push: 1,
    committee: 0,
    nextJoin: HALL.YEAR * 2,
    fired: [],
    notes: [],
    over: null,
    seed,
  };
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + (random(s) - 0.5) * 0.4,
      r = 120 + random(s) * 80;
    add(s, i % 2 ? 'busy' : 'time', HALL.cx + Math.cos(a) * r, HALL.cy + Math.sin(a) * r);
  }
  s.notes.push({ t: 0, type: 'event', key: 'start' });
  return s;
}

// Escalation by year: each of Aldous's methods tilts the floor further.
const EVENTS: [number, string, (s: State) => void][] = [
  [
    3,
    'agenda',
    (s) => {
      s.pull *= 1.15;
    },
  ],
  [5, 'watch', () => {}],
  [
    6,
    'venue',
    (s) => {
      s.push *= 1.2;
    },
  ],
  [
    8,
    'heir',
    (s) => {
      atDoor(s, 'heir');
    },
  ],
  [
    11,
    'minutes',
    (s) => {
      s.pull *= 1.15;
    },
  ],
  [
    14,
    'readings',
    (s) => {
      s.pull *= 1.1;
      s.push *= 1.1;
    },
  ],
  [
    16,
    'heir2',
    (s) => {
      atDoor(s, 'heir');
    },
  ],
  [
    19,
    'mornings',
    (s) => {
      s.push *= 1.15;
    },
  ],
  [
    22,
    'aldous',
    (s) => {
      atDoor(s, 'aldous');
    },
  ],
  [28, 'page', () => {}],
  [40, 'demote', () => {}],
  [100, 'century', () => {}],
];

const people = (s: State) => s.members.filter((m) => m.kind === 'time' || m.kind === 'busy');
export const onDais = (s: State) =>
  s.members.filter((m) => m.kind === 'time' && Math.hypot(m.x - HALL.cx, m.y - HALL.cy) < HALL.DAIS);

export function step(s: State, dt: number) {
  if (s.over) return;
  s.t += dt;
  const y = year(s);
  for (const [at, key, apply] of EVENTS)
    if (y >= at && !s.fired.includes(key)) {
      s.fired.push(key);
      apply(s);
      s.notes.push({ t: s.t, type: 'event', key });
    }
  if (s.t >= s.nextJoin && s.members.length < HALL.MAX) {
    atDoor(s, random(s) < Math.min(0.62, 0.52 + 0.004 * y) ? 'time' : 'busy');
    s.nextJoin = s.t + HALL.YEAR * (2 - Math.min(1, y / 30) * 0.8);
  }
  const k = ramp(s);
  const saboteurs = s.members.filter((m) => m.kind === 'heir' || m.kind === 'aldous');
  for (const m of s.members) {
    const dx = m.x - HALL.cx,
      dy = m.y - HALL.cy,
      d = Math.hypot(dx, dy) || 1,
      ux = dx / d,
      uy = dy / d;
    let ax = 0,
      ay = 0;
    if (m.kind === 'time' || m.kind === 'busy') {
      let boost = 1;
      for (const sb of saboteurs) {
        const [radius, mul] = AURA[sb.kind as 'heir' | 'aldous'];
        if (Math.hypot(m.x - sb.x, m.y - sb.y) < radius) boost = Math.max(boost, mul);
      }
      const a = (m.kind === 'time' ? -IN * s.pull : OUT * s.push) * k * boost;
      ax = ux * a;
      ay = uy * a;
    } else {
      // Saboteurs wander slowly around the middle ring; they never lead anything.
      if (random(s) < dt / 5) m.goal = random(s) * Math.PI * 2;
      const ring = m.kind === 'aldous' ? 95 : 125;
      const gx = HALL.cx + Math.cos(m.goal) * ring,
        gy = HALL.cy + Math.sin(m.goal) * ring;
      ax = (gx - m.x) * 0.6;
      ay = (gy - m.y) * 0.6;
    }
    m.vx += ax * dt;
    m.vy += ay * dt;
    const damp = Math.exp(-DAMP * dt);
    m.vx *= damp;
    m.vy *= damp;
    m.x += m.vx * dt;
    m.y += m.vy * dt;
  }
  // Members bump into each other.
  const all = s.members;
  for (let i = 0; i < all.length; i++)
    for (let j = i + 1; j < all.length; j++) {
      const a = all[i],
        b = all[j],
        dx = b.x - a.x,
        dy = b.y - a.y,
        d = Math.hypot(dx, dy),
        min = a.r + b.r;
      if (d >= min || d === 0) continue;
      const nx = dx / d,
        ny = dy / d,
        overlap = min - d,
        total = a.m + b.m;
      a.x -= nx * overlap * (b.m / total);
      a.y -= ny * overlap * (b.m / total);
      b.x += nx * overlap * (a.m / total);
      b.y += ny * overlap * (a.m / total);
      const rel = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
      if (rel < 0) {
        const impulse = -(1.6 * rel) / (1 / a.m + 1 / b.m);
        a.vx -= (impulse / a.m) * nx;
        a.vy -= (impulse / a.m) * ny;
        b.vx += (impulse / b.m) * nx;
        b.vy += (impulse / b.m) * ny;
      }
    }
  // The wall: busy members walk out; everyone else bounces off it.
  for (const m of [...s.members]) {
    const dx = m.x - HALL.cx,
      dy = m.y - HALL.cy,
      d = Math.hypot(dx, dy),
      max = HALL.R - m.r;
    if (d <= max) continue;
    if (m.kind === 'busy') {
      s.members.splice(s.members.indexOf(m), 1);
      s.notes.push({ t: s.t, type: 'leave', name: m.name, x: m.x, y: m.y, reason: Math.floor(random(s) * 4) });
      continue;
    }
    const nx = dx / d,
      ny = dy / d,
      vn = m.vx * nx + m.vy * ny;
    m.x = HALL.cx + nx * max;
    m.y = HALL.cy + ny * max;
    if (vn > 0) {
      m.vx -= 1.5 * vn * nx;
      m.vy -= 1.5 * vn * ny;
    }
  }
  const dais = onDais(s);
  s.committee = dais.length >= 3 ? s.committee + dt : Math.max(0, s.committee - 1.5 * dt);
  if (s.committee >= HALL.LIMIT) {
    const names = dais
      .sort((a, b) => Math.hypot(a.x - HALL.cx, a.y - HALL.cy) - Math.hypot(b.x - HALL.cx, b.y - HALL.cy))
      .slice(0, 3)
      .map((m) => m.name);
    s.over = { reason: 'committee', years: Math.floor(year(s)), names };
  } else if (people(s).length < HALL.MIN) {
    s.over = { reason: 'dissolved', years: Math.floor(year(s)), names: [] };
  }
}

export function pick(s: State, x: number, y: number, reach = 20) {
  let best: Member | null = null,
    bestD = Infinity;
  for (const m of s.members) {
    const d = Math.hypot(m.x - x, m.y - y);
    if (d < m.r + reach && d < bestD) {
      best = m;
      bestD = d;
    }
  }
  return best;
}

// A tap sends a member back where they belong: time-rich outward, busy inward.
export function nudge(s: State, m: Member) {
  const dx = m.x - HALL.cx,
    dy = m.y - HALL.cy,
    d = Math.hypot(dx, dy) || 1;
  const dir = m.kind === 'busy' ? -1 : 1;
  m.vx += ((dx / d) * TAP * dir) / Math.sqrt(m.m);
  m.vy += ((dy / d) * TAP * dir) / Math.sqrt(m.m);
  s.notes.push({ t: s.t, type: 'nudge', x: m.x, y: m.y });
}

export function fling(s: State, m: Member, vx: number, vy: number) {
  const v = Math.hypot(vx, vy),
    scale = v > FLING ? FLING / v : 1;
  m.vx = (vx * scale) / Math.sqrt(m.m);
  m.vy = (vy * scale) / Math.sqrt(m.m);
  s.notes.push({ t: s.t, type: 'nudge', x: m.x, y: m.y });
}
