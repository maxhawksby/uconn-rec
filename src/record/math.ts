import type { RoutePoint, WorkoutKind } from '../data/types';
import { KM_PER_MILE } from '../data/selectors';

// Pure recording math: GPS distance, pace, clocks and title suggestions. No React here,
// so scripts/test-record.cjs can check it directly.

const EARTH_RADIUS_M = 6371008.8;
const rad = (deg: number) => (deg * Math.PI) / 180;

/** Great-circle distance between two points, in meters. */
export function haversineMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Fastest believable speed per kind (m/s). Faster jumps are GPS glitches. */
export const MAX_SPEED_MPS = { run: 12, ride: 25 } as const;
/** Fixes less precise than this (meters) are dropped. */
export const MAX_ACCURACY_M = 35;

export type Fix = RoutePoint & { accuracy?: number | null };

/**
 * Decides whether a new GPS fix extends the route. Drops imprecise fixes, duplicates and
 * teleport jumps, so standing still under a tree does not add phantom distance.
 */
export function acceptFix(prev: RoutePoint | undefined, next: Fix, kind: 'run' | 'ride') {
  if (next.accuracy != null && next.accuracy > MAX_ACCURACY_M) return false;
  if (!prev) return true;
  const dt = (next.t - prev.t) / 1000;
  if (dt <= 0) return false;
  const d = haversineMeters(prev, next);
  if (d < 2) return false; // jitter while standing still
  return d / dt <= MAX_SPEED_MPS[kind];
}

/** Route length in km. Segments are separated by pauses; gaps between them don't count. */
export function routeDistanceKm(segments: RoutePoint[][]) {
  let m = 0;
  for (const seg of segments) for (let i = 1; i < seg.length; i++) m += haversineMeters(seg[i - 1], seg[i]);
  return m / 1000;
}

/** Average seconds per km, or null when there's no distance yet. */
export function paceSecPerKm(durationSec: number, km: number) {
  return km > 0.01 && durationSec > 0 ? durationSec / km : null;
}

export const kmToMiles = (km: number) => km / KM_PER_MILE;
export const milesToKm = (mi: number) => mi * KM_PER_MILE;

/** Clock text: 4:05, 12:05, 1:02:05. */
export function formatClock(totalSec: number) {
  const s = Math.max(0, Math.floor(totalSec));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}

/** Pace per mile as a clock ("8:32"), or "--" before there's enough distance. */
export function paceClockPerMile(secPerKm: number | null) {
  if (!secPerKm || !isFinite(secPerKm) || secPerKm * KM_PER_MILE >= 100 * 60) return '--';
  return formatClock(Math.round(secPerKm * KM_PER_MILE));
}

/** Miles with two decimals, e.g. "3.12". */
export function milesText(km: number) {
  return kmToMiles(km).toFixed(2);
}

/** Parses "3.1" or "3,1"; returns NaN for anything else. */
export function parseDecimal(text: string) {
  const t = text.trim().replace(',', '.');
  return /^\d*\.?\d+$|^\d+\.$/.test(t) ? Number(t) : NaN;
}

export function timeOfDay(d: Date) {
  const h = d.getHours();
  if (h >= 4 && h < 11) return 'Morning';
  if (h >= 11 && h < 17) return 'Afternoon';
  if (h >= 17 && h < 21) return 'Evening';
  return 'Night';
}

const KIND_WORD: Record<WorkoutKind, string> = { lift: 'Lift', run: 'Run', ride: 'Ride', sport: 'Game', class: 'Class', other: 'Workout' };

/** "Morning Lift", "Evening Basketball", "Night Run". */
// Catch-all activities read badly in a title ("Evening Something else"), so they use the kind's word.
const GENERIC_ACTIVITIES = new Set(['Something else']);

export function suggestTitle(kind: WorkoutKind, startedAt: Date, activityName?: string) {
  const named = activityName && !GENERIC_ACTIVITIES.has(activityName) && kind !== 'lift' && kind !== 'run' && kind !== 'ride';
  return `${timeOfDay(startedAt)} ${named ? activityName : KIND_WORD[kind]}`;
}
