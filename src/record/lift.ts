import type { LiftExercise, LiftSet, Workout } from '../data/types';
import { personalRecords } from '../data/selectors';
import { parseDecimal } from './math';

// Pure lift-logger logic: draft rows, previous sessions and PR detection.

/** A set row while logging. Text fields so half-typed numbers ("182.") survive edits. */
export type SetRow = { id: string; weight: string; reps: string; done: boolean };
export type ExerciseDraft = { id: string; name: string; rows: SetRow[]; previous: LiftSet[] };

const key = (name: string) => name.trim().toLowerCase();

/** The most recent set list for an exercise from a student's own past workouts. */
export function previousSets(history: Workout[], name: string): LiftSet[] {
  const k = key(name);
  const lifts = history.filter(w => w.kind === 'lift').sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  for (const w of lifts) {
    if (w.kind !== 'lift') continue;
    const hit = w.exercises.find(e => key(e.name) === k && e.sets.length);
    if (hit) return hit.sets;
  }
  return [];
}

/** Parses a row; null unless reps are a positive whole number. Blank weight = bodyweight. */
export function parseRow(row: Pick<SetRow, 'weight' | 'reps'>): LiftSet | null {
  const reps = Number(row.reps.trim());
  if (!Number.isInteger(reps) || reps <= 0) return null;
  const weight = row.weight.trim() === '' ? 0 : parseDecimal(row.weight);
  if (!(weight >= 0)) return null;
  return { reps, weight: Math.round(weight * 10) / 10 };
}

export function rowIsValid(row: SetRow) {
  if (row.reps.trim() === '' && row.weight.trim() === '') return true; // untouched rows are fine
  const s = parseRow(row);
  return !!s && s.reps <= 500 && s.weight <= 2000;
}

/** Drafts -> logged exercises: only filled rows count; empty exercises are dropped. */
export function toExercises(drafts: ExerciseDraft[]): LiftExercise[] {
  return drafts
    .map(d => ({ name: d.name.trim(), sets: d.rows.map(parseRow).filter((s): s is LiftSet => !!s) }))
    .filter(e => e.sets.length > 0);
}

export function volume(exercises: LiftExercise[]) {
  return exercises.reduce((sum, e) => sum + e.sets.reduce((s, set) => s + set.reps * set.weight, 0), 0);
}

export function setCount(exercises: LiftExercise[]) {
  return exercises.reduce((n, e) => n + e.sets.length, 0);
}

export type PRHit = { exercise: string; weight: number; reps: number; previous: { weight: number; reps: number } };

const better = (a: LiftSet, b: LiftSet) => a.weight > b.weight || (a.weight === b.weight && a.reps > b.reps);

/**
 * Exercises where today's heaviest set beats the student's previous best (heavier, or the
 * same weight for more reps). A first-ever exercise sets a baseline, not a PR. Bodyweight
 * sets never count, matching personalRecords().
 */
export function detectPRs(history: Workout[], exercises: LiftExercise[]): PRHit[] {
  const prior = new Map(personalRecords(history).map(pr => [key(pr.exercise), pr]));
  const hits: PRHit[] = [];
  for (const e of exercises) {
    const best = e.sets.filter(s => s.weight > 0).reduce<LiftSet | null>((b, s) => (!b || better(s, b) ? s : b), null);
    const prev = prior.get(key(e.name));
    if (best && prev && better(best, prev)) hits.push({ exercise: e.name.trim(), weight: best.weight, reps: best.reps, previous: { weight: prev.weight, reps: prev.reps } });
  }
  return hits;
}

/** Suggested values for a row: the matching set from last session, else the filled row above. */
export function ghostSet(draft: ExerciseDraft, index: number): LiftSet | null {
  const prev = draft.previous[index] ?? draft.previous[draft.previous.length - 1];
  if (prev) return prev;
  for (let i = index - 1; i >= 0; i--) { const s = parseRow(draft.rows[i]); if (s) return s; }
  return null;
}

/** "185 x 5" or "BW x 10". */
export function setLabel(s: LiftSet) {
  return `${s.weight ? s.weight : 'BW'} x ${s.reps}`;
}

export function formatVolume(lb: number) {
  return lb >= 10000 ? `${(lb / 1000).toFixed(1)}k` : Math.round(lb).toLocaleString('en-US');
}
