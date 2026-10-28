// What the summon reveal shows, decided before anything is drawn. Pure, so it can be checked.
import type { MixedReward } from './pool';

/** 0 B · 1 A · 2 S or 3★ · 3 SS or 4★ · 4 5★ */
export type Grade = 0 | 1 | 2 | 3 | 4;

// Pigments of an illuminated proof, one per grade: chalk, verdigris, lapis, amethyst, gilt.
export const PIGMENTS = ['#e6e1cc', '#7fd3b6', '#7aa7ff', '#c49dff', '#f6c95f'] as const;

export const gradeOf = (r: MixedReward): Grade => r.kind === 'holder'
  ? r.rating.stars === 5 ? 4 : r.rating.stars === 4 ? 3 : 2
  : ({ common: 0, strong: 1, elite: 2, epic: 3 } as const)[r.totem.tier];

/** How many constructions the best reward earns: B and A stop at the triangle. */
export const stagesFor = (grade: Grade) => (grade < 2 ? 1 : grade) as 1 | 2 | 3 | 4;

/** Ink of each stage: the triangle is chalk, every later stage is the pigment it stands for. */
export const stageInk = (stage: number) => PIGMENTS[stage === 0 ? 0 : stage + 1];

/** Which construction frames a reward of this grade (halo behind its splash). */
export const figureFor = (grade: Grade) => Math.max(0, grade - 1);

export type RevealPlan = {
  grades: Grade[];
  /** Best grade in the batch; decides how far the construction goes and the closing ink. */
  top: Grade;
  stages: 1 | 2 | 3 | 4;
  /** Cards that wait face down and open with their own splash: SS, 4★, 5★, and any holder pulled for the first time. */
  held: boolean[];
  /** Splash order: lowest grade first so the best reward comes last; ties keep pull order. */
  splashOrder: number[];
};

export function revealPlan(rewards: (MixedReward & { copies?: number })[]): RevealPlan {
  if (!rewards.length) throw new Error('Nothing to reveal');
  const grades = rewards.map(gradeOf);
  const top = Math.max(...grades) as Grade;
  const held = rewards.map((r, i) => grades[i] >= 3 || (r.kind === 'holder' && r.copies === 1));
  const splashOrder = grades.map((g, i) => ({ g, i })).filter(({ i }) => held[i]).sort((a, b) => a.g - b.g || a.i - b.i).map(({ i }) => i);
  return { grades, top, stages: stagesFor(top), held, splashOrder };
}
