import type { AppState, ID, LiftExercise, LiftSet, RoutePoint, Student, Visibility, Workout } from '../data/types';
import { KM_PER_MILE, studentById } from '../data/selectors';

// Pure feed helpers that the shared selectors don't cover yet. Kept free of React so they
// can move into src/data/selectors.ts once the contract owner accepts them.

/** Students who gave kudos to a workout, newest first. Proposed for src/data/selectors.ts. */
export function kudosGivers(state: AppState, workoutId: ID): Student[] {
  return state.kudos
    .filter(k => k.workoutId === workoutId)
    .sort((a, b) => b.at.localeCompare(a.at))
    .map(k => studentById(state, k.studentId))
    .filter((s): s is Student => !!s);
}

export function fullName(s: Pick<Student, 'firstName' | 'lastName'>) {
  return `${s.firstName} ${s.lastName}`;
}

// ---------- Lifting ----------

/** Heaviest set; ties go to more reps. Bodyweight sets count only when nothing is loaded. */
export function bestSet(sets: LiftSet[]): LiftSet | null {
  let best: LiftSet | null = null;
  for (const s of sets) {
    if (!best || s.weight > best.weight || (s.weight === best.weight && s.reps > best.reps)) best = s;
  }
  return best;
}

export type BestLift = { exercise: string; set: LiftSet };

export function bestLift(exercises: LiftExercise[]): BestLift | null {
  let out: BestLift | null = null;
  for (const e of exercises) {
    const s = bestSet(e.sets);
    if (s && (!out || s.weight > out.set.weight || (s.weight === out.set.weight && s.reps > out.set.reps))) out = { exercise: e.name, set: s };
  }
  return out;
}

export function formatSet(s: LiftSet) {
  return s.weight > 0 ? `${s.weight} × ${s.reps}` : `BW × ${s.reps}`;
}

export function exerciseVolume(e: LiftExercise) {
  return e.sets.reduce((sum, s) => sum + s.reps * s.weight, 0);
}

/** 12,450 -> "12.5k"; small numbers stay exact. */
export function compactNumber(n: number) {
  if (n >= 100000) return `${Math.round(n / 1000)}k`;
  if (n >= 10000) return `${Math.round(n / 100) / 10}k`;
  return n.toLocaleString('en-US');
}

// ---------- Distance ----------

/** Miles as a bare number string for scoreboard cells ("3.12", "24.8"). */
export function miles(km: number) {
  const mi = km / KM_PER_MILE;
  return mi.toFixed(mi >= 10 ? 1 : 2);
}

/** Pace split into value + unit for the scoreboard ("8:42", "/mi"). */
export function paceParts(durationSec: number, km: number) {
  if (!(km > 0) || !(durationSec > 0)) return { value: '-', unit: '' };
  const perMile = Math.round((durationSec / km) * KM_PER_MILE);
  return { value: `${Math.floor(perMile / 60)}:${String(perMile % 60).padStart(2, '0')}`, unit: '/mi' };
}

export function mph(durationSec: number, km: number) {
  if (!(km > 0) || !(durationSec > 0)) return '-';
  return (km / KM_PER_MILE / (durationSec / 3600)).toFixed(1);
}

/** Duration split for the scoreboard: "1:05" + "h" or "48" + "min". */
export function durationParts(sec: number) {
  const totalMin = Math.round(sec / 60);
  const h = Math.floor(totalMin / 60), m = totalMin % 60;
  return h ? { value: `${h}:${String(m).padStart(2, '0')}`, unit: 'h' } : { value: String(m), unit: 'min' };
}

// ---------- Route sketch ----------

export type Pt = { x: number; y: number };

/**
 * Projects GPS points into a width x height box (equirectangular, north up), keeping the
 * aspect ratio and centring the shape. Thins long tracks to at most `maxPoints`.
 */
export function projectRoute(route: RoutePoint[], width: number, height: number, pad = 6, maxPoints = 80): Pt[] {
  if (route.length < 2 || width <= 0 || height <= 0) return [];
  const step = Math.max(1, Math.ceil(route.length / maxPoints));
  const pts = route.filter((_, i) => i % step === 0 || i === route.length - 1);
  const midLat = (Math.min(...pts.map(p => p.lat)) + Math.max(...pts.map(p => p.lat))) / 2;
  const k = Math.cos((midLat * Math.PI) / 180);
  const xs = pts.map(p => p.lng * k), ys = pts.map(p => -p.lat);
  const minX = Math.min(...xs), minY = Math.min(...ys);
  const spanX = Math.max(...xs) - minX, spanY = Math.max(...ys) - minY;
  const span = Math.max(spanX, spanY);
  if (span === 0) return [];
  const scale = Math.min((width - pad * 2) / (spanX || span), (height - pad * 2) / (spanY || span));
  const offX = (width - spanX * scale) / 2, offY = (height - spanY * scale) / 2;
  return pts.map((_, i) => ({ x: offX + (xs[i] - minX) * scale, y: offY + (ys[i] - minY) * scale }));
}

/** A segment drawn as a rotated View: centre, length and angle. */
export function segment(a: Pt, b: Pt) {
  const dx = b.x - a.x, dy = b.y - a.y;
  return { cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2, length: Math.hypot(dx, dy), angle: Math.atan2(dy, dx) };
}

// ---------- Misc ----------

export const VISIBILITY_LABEL: Record<Visibility, { label: string; icon: string }> = {
  campus: { label: 'Campus', icon: 'school-outline' },
  friends: { label: 'Followers', icon: 'people-outline' },
  private: { label: 'Only you', icon: 'lock-closed-outline' },
};

export function kindLabel(w: Workout) {
  switch (w.kind) {
    case 'lift': return 'Lift';
    case 'run': return 'Run';
    case 'ride': return 'Ride';
    case 'sport': return 'Sport';
    case 'class': return 'Class';
    default: return 'Workout';
  }
}

export function plural(n: number, one: string, many = `${one}s`) {
  return `${n} ${n === 1 ? one : many}`;
}

/** "Thu, Oct 8 · 6:30 PM" */
export function fullDate(iso: string) {
  const d = new Date(iso);
  const day = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return `${day} · ${time}`;
}
