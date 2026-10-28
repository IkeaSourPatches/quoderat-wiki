// Ruler-and-compass constructions drawn by the summon reveal. Pure geometry and timing, no DOM,
// so scripts/check-reveal.mjs can verify that every figure is exact.
//
// The reveal escalates through four real constructions. Each one is only drawn if the batch is
// good enough to reach it, so how far the figure goes is an honest telegraph of the best reward:
//   1. Euclid I.1   – an equilateral triangle on a given line (every summon)
//   2. Euclid IV.15 – a regular hexagon in a circle (best reward S or 3★)
//   3. Euclid IV.11 – a regular pentagon in a circle, by Ptolemy's golden-ratio steps (SS or 4★)
//   4. The regular 17-gon, which Gauss proved constructible in 1796, by Richmond's 1893 steps (5★)
//
// Everything lives in a 1000 × 1000 box with y pointing down, centred on O = (500, 500).
// Angles are canvas angles: 0 points right and positive angles turn clockwise on screen.

export type Pt = readonly [number, number];
export type Role = 'guide' | 'figure';
export type Shape =
  | { kind: 'line'; a: Pt; b: Pt }
  | { kind: 'arc'; c: Pt; r: number; a0: number; a1: number }
  | { kind: 'poly'; pts: Pt[] };
/** A stroke inside one stage. Times are seconds from the stage's start, at speed 1. */
export type Step = Shape & { role: Role; at: number; dur: number; compass?: boolean };
/** A point that appears during a stage; `side` overrides which way its label sits. */
export type Mark = { p: Pt; at: number; label?: string; side?: Pt };
export type Stage = { steps: Step[]; marks: Mark[]; length: number };

const TAU = Math.PI * 2;
export const O: Pt = [500, 500];
export const onCircle = (c: Pt, r: number, a: number): Pt => [c[0] + r * Math.cos(a), c[1] + r * Math.sin(a)];
export const dist = (a: Pt, b: Pt) => Math.hypot(b[0] - a[0], b[1] - a[1]);
export const dir = (from: Pt, to: Pt) => Math.atan2(to[1] - from[1], to[0] - from[0]);
const opposite = (p: Pt): Pt => [2 * O[0] - p[0], 2 * O[1] - p[1]];
const line = (a: Pt, b: Pt, role: Role, at: number, dur: number): Step => ({ kind: 'line', a, b, role, at, dur });
const arc = (c: Pt, r: number, a0: number, a1: number, at: number, dur: number): Step =>
  ({ kind: 'arc', c, r, a0, a1, role: 'guide', at, dur, compass: true });
const poly = (pts: Pt[], role: Role, at: number, dur: number): Step => ({ kind: 'poly', pts, role, at, dur });
/** When a compass sweep passes a given angle, so a mark can appear as the pencil crosses it. */
const crossing = (s: Step, angle: number) => {
  if (s.kind !== 'arc') return s.at;
  const span = s.a1 - s.a0, sign = Math.sign(span) || 1;
  const turned = ((sign * (angle - s.a0)) % TAU + TAU) % TAU;
  return s.at + Math.min(1, turned / Math.abs(span)) * s.dur;
};

// 1. Euclid I.1. On the given line AB, circles about A and B meet at C; ABC is equilateral.
export const SIDE = 300;
const HEIGHT = SIDE * Math.sqrt(3) / 2;
export const A: Pt = [500 - SIDE / 2, 500 + HEIGHT / 3];
export const B: Pt = [500 + SIDE / 2, 500 + HEIGHT / 3];
export const C: Pt = [500, 500 - 2 * HEIGHT / 3];
const circleA = arc(A, SIDE, 0, -TAU, .4, .58);
const circleB = arc(B, SIDE, Math.PI, 3 * Math.PI, 1.12, .58);
const I1: Stage = {
  steps: [line(A, B, 'figure', 0, .34), circleA, circleB, line(C, A, 'figure', 1.76, .24), line(C, B, 'figure', 1.76, .24)],
  marks: [{ p: A, at: .02, label: 'A' }, { p: B, at: .32, label: 'B' }, { p: C, at: crossing(circleB, dir(B, C)), label: 'C' }],
  length: 2.05,
};

// 2. Euclid IV.15. The circle through A, B and C has radius R1. Stepping R1 around it from each of
// A, B and C finds the opposite points D, E and F; together they make the regular hexagon.
export const R1 = SIDE / Math.sqrt(3);
export const D: Pt = opposite(B), E: Pt = opposite(A), F: Pt = opposite(C);
const aroundC = arc(C, R1, dir(C, O), dir(C, O) + TAU, .52, .26);
const aroundA = arc(A, R1, dir(A, O), dir(A, O) + TAU, .84, .26);
const aroundB = arc(B, R1, dir(B, O), dir(B, O) + TAU, 1.16, .26);
export const HEXAGON: Pt[] = [C, E, B, F, A, D, C];
const IV15: Stage = {
  steps: [arc(O, R1, -Math.PI / 2, 1.5 * Math.PI, .05, .4), aroundC, aroundA, aroundB,
    poly([E, F, D, E], 'figure', 1.48, .32), poly(HEXAGON, 'figure', 1.7, .38)],
  marks: [
    { p: D, at: crossing(aroundA, dir(A, D) + TAU), label: 'D' },
    { p: E, at: crossing(aroundB, dir(B, E) + TAU), label: 'E' },
    { p: F, at: crossing(aroundB, dir(B, F) + TAU), label: 'F' },
  ],
  length: 2.1,
};

// 3. Euclid IV.11, by Ptolemy's construction. With M the midpoint of OQ, the arc about M through the
// top point P cuts the diameter at N, and PN is the side of the regular pentagon in the circle R2.
export const R2 = 300;
export const P: Pt = [500, 500 - R2];
const Q: Pt = [500 + R2, 500];
export const M: Pt = [(O[0] + Q[0]) / 2, 500];
const rM = dist(M, P);
export const N: Pt = [M[0] - rM, 500];
export const PENTAGON_SIDE = dist(P, N);
export const PENTAGON: Pt[] = Array.from({ length: 5 }, (_, k) => onCircle(O, R2, -Math.PI / 2 + k * TAU / 5));
const [V0, V1, V2, V3, V4] = PENTAGON;
const NICK = .17; // how far a marking arc runs past the point it marks
const fromM = arc(M, rM, dir(M, P), -Math.PI, .66, .28);
const fromP = arc(P, PENTAGON_SIDE, dir(P, V1) - NICK, dir(P, V4) + NICK, 1.12, .3);
const fromV1 = arc(V1, PENTAGON_SIDE, dir(V1, V2) - NICK, dir(V1, V2) + NICK, 1.48, .14);
const fromV4 = arc(V4, PENTAGON_SIDE, dir(V4, V3) + NICK, dir(V4, V3) - NICK, 1.66, .14);
export const PENTAGRAM: Pt[] = [V0, V2, V4, V1, V3, V0];
const IV11: Stage = {
  steps: [arc(O, R2, -Math.PI / 2, 1.5 * Math.PI, .05, .38),
    line([500 - R2, 500], Q, 'guide', .45, .18), line(P, [500, 500 + R2], 'guide', .45, .18),
    fromM, line(P, N, 'guide', .96, .12), fromP, fromV1, fromV4,
    poly(PENTAGRAM, 'figure', 1.86, .44), poly([...PENTAGON, V0], 'figure', 2.12, .36)],
  marks: [
    { p: P, at: .05, label: 'P' }, { p: M, at: .64, label: 'M' }, { p: N, at: .94, label: 'N' },
    { p: V1, at: crossing(fromP, dir(P, V1)) }, { p: V4, at: crossing(fromP, dir(P, V4)) },
    { p: V2, at: crossing(fromV1, dir(V1, V2)) }, { p: V3, at: crossing(fromV4, dir(V4, V3)) },
  ],
  length: 2.5,
};

// 4. The regular 17-gon by Richmond's construction (1893). OJ is a quarter of OB; angle OJE is a
// quarter of angle OJP0; angle EJF is 45°. The circle on FP0 cuts OB at K, and the circle about E
// through K cuts the diameter at N3 and N5, directly below the vertices P3 and P5.
export const R3 = 400;
export const P0: Pt = [500 + R3, 500];
export const J: Pt = [500, 500 - R3 / 4];
const quarter = Math.acos(((O[0] - J[0]) * (P0[0] - J[0]) + (O[1] - J[1]) * (P0[1] - J[1])) / (dist(J, O) * dist(J, P0))) / 4;
export const E17: Pt = [500 + dist(J, O) * Math.tan(quarter), 500];
export const F17: Pt = [500 - dist(J, O) * Math.tan(Math.PI / 4 - quarter), 500];
const cF: Pt = [(F17[0] + P0[0]) / 2, 500], rF = (P0[0] - F17[0]) / 2;
export const K: Pt = [500, 500 - Math.sqrt(rF * rF - (cF[0] - 500) ** 2)];
const rE = dist(E17, K);
export const N3: Pt = [E17[0] + rE, 500], N5: Pt = [E17[0] - rE, 500];
export const P3: Pt = [N3[0], 500 - Math.sqrt(R3 * R3 - (N3[0] - 500) ** 2)];
export const P5: Pt = [N5[0], 500 - Math.sqrt(R3 * R3 - (N5[0] - 500) ** 2)];
/** Vertices counter-clockwise on screen from P0, so vertex k is P_k in Richmond's naming. */
export const HEPTADECAGON: Pt[] = Array.from({ length: 17 }, (_, k) => onCircle(O, R3, -k * TAU / 17));
export const STAR_STEP = 7;
export const STAR17: Pt[] = Array.from({ length: 18 }, (_, i) => HEPTADECAGON[(i * STAR_STEP) % 17]);
const onFP0 = arc(cF, rF, 0, -Math.PI, 1, .26);
const aboutE = arc(E17, rE, 0, -Math.PI, 1.3, .26);
const RICHMOND: Stage = {
  steps: [arc(O, R3, 0, -TAU, .05, .38),
    line([500 - R3, 500], P0, 'guide', .45, .16), line([500, 500 - R3], [500, 500 + R3], 'guide', .45, .16),
    line(J, P0, 'guide', .64, .1), line(J, E17, 'guide', .76, .1), line(J, F17, 'guide', .88, .1),
    onFP0, aboutE, line(N3, P3, 'guide', 1.58, .12), line(N5, P5, 'guide', 1.58, .12),
    poly(STAR17, 'figure', 2.06, .64), poly([...HEPTADECAGON, HEPTADECAGON[0]], 'figure', 2.4, .4)],
  marks: [
    { p: J, at: .62, label: 'J', side: [-1, 0] }, { p: E17, at: .86, label: 'E' }, { p: F17, at: .98, label: 'F' },
    { p: K, at: crossing(onFP0, dir(cF, K)), label: 'K', side: [1, 0] },
    { p: N3, at: 1.3, label: 'N₃' }, { p: N5, at: 1.56, label: 'N₅' },
    ...HEPTADECAGON.map((p, k) => ({ p, at: 1.72 + k * .022, label: k === 0 ? 'P₀' : k === 3 ? 'P₃' : k === 5 ? 'P₅' : undefined })),
  ],
  length: 2.85,
};

export const STAGES: Stage[] = [I1, IV15, IV11, RICHMOND];

/** The finished figure of each stage, used as the halo behind a reveal and on the idle stage. */
export const FIGURES: { polys: Pt[][]; circles: [Pt, number][] }[] = [
  { polys: [[A, B, C, A]], circles: [[A, SIDE], [B, SIDE]] },
  { polys: [[A, B, C, A], [D, E, F, D], HEXAGON], circles: [[O, R1]] },
  { polys: [PENTAGRAM, [...PENTAGON, V0]], circles: [[O, R2]] },
  { polys: [STAR17, [...HEPTADECAGON, HEPTADECAGON[0]]], circles: [[O, R3]] },
];
const fmt = (n: number) => +n.toFixed(2);
export const figurePaths = (stage: number): string[] => {
  const f = FIGURES[stage];
  return [
    ...f.circles.map(([c, r]) => `M${fmt(c[0] - r)} ${fmt(c[1])}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`),
    ...f.polys.map(pts => 'M' + pts.map(p => `${fmt(p[0])} ${fmt(p[1])}`).join('L')),
  ];
};

// Playback. Earlier stages speed up when more follow, so a long build still lands in about nine
// seconds; the pause after each stage is where the figure either closes or breaks open.
export const PAUSE = .24, CLOSE = .5, COLLAPSE = .36;
export const SPEEDS: Record<1 | 2 | 3 | 4, number[]> = { 1: [1.1], 2: [1.25, 1.05], 3: [1.45, 1.3, 1.05], 4: [1.7, 1.55, 1.3, 1] };
export type Timed = Step & { stage: number; t0: number; t1: number };
export type TimedMark = Mark & { stage: number; t: number };
export type Schedule = {
  steps: Timed[]; marks: TimedMark[];
  stages: { t0: number; t1: number }[];
  /** The figure stops growing and is stamped. */
  close: number;
  /** The figure starts collapsing into its centre. */
  collapse: number;
  /** The collapse ends in the burst that deals the cards. */
  burst: number;
};

export function schedule(count: 1 | 2 | 3 | 4): Schedule {
  if (![1, 2, 3, 4].includes(count)) throw new Error('A summon draws one to four stages');
  const steps: Timed[] = [], marks: TimedMark[] = [], stages: { t0: number; t1: number }[] = [];
  let t = 0;
  STAGES.slice(0, count).forEach((stage, s) => {
    const speed = SPEEDS[count][s], t0 = t;
    for (const step of stage.steps) steps.push({ ...step, stage: s, t0: t0 + step.at / speed, t1: t0 + (step.at + step.dur) / speed });
    for (const mark of stage.marks) marks.push({ ...mark, stage: s, t: t0 + mark.at / speed });
    stages.push({ t0, t1: t0 + stage.length / speed });
    t = t0 + stage.length / speed + PAUSE;
  });
  const close = t, collapse = close + CLOSE;
  return { steps, marks, stages, close, collapse, burst: collapse + COLLAPSE };
}
