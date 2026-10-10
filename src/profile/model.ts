import type { AppState, Group, ID, ProfileStats, Student, Workout } from '../data/types';
import { ACTIVITY_BY_ID, activityName } from '../data/activities';
import {
  KM_PER_MILE, formatDistance, liftVolume, myGroups, personalRecords, profileStats, streakDays, weeklyTotals, workoutsFor,
} from '../data/selectors';
import type { Stat } from '../ui';

// Pure helpers for the Profile screens. Built on the shared selectors only.

/**
 * Stats as the viewer is allowed to see them. Your own profile counts everything; another
 * student's profile counts only workouts you can see, so private sessions never leak via PRs.
 */
export function statsFor(state: AppState, studentId: ID, viewerId: ID, now: Date = new Date()): ProfileStats {
  if (studentId === viewerId) return profileStats(state, studentId, now);
  const visible = workoutsFor(state, studentId, viewerId);
  return { streakDays: streakDays(visible, now), totalSessions: visible.length, week: weeklyTotals(visible, now), prs: personalRecords(visible) };
}

/** The four scoreboard cells: streak, sessions this week, active time, distance. */
export function scoreboardStats(stats: ProfileStats): Stat[] {
  const sec = stats.week.activeSec;
  const time = sec < 3600 ? { value: String(Math.round(sec / 60)), unit: 'min' } : { value: (sec / 3600).toFixed(1), unit: 'hr' };
  const miles = stats.week.distanceKm / KM_PER_MILE;
  return [
    { label: 'Streak', value: String(stats.streakDays), unit: stats.streakDays === 1 ? 'day' : 'days' },
    { label: 'Week', value: String(stats.week.sessions), unit: stats.week.sessions === 1 ? 'session' : 'sessions' },
    { label: 'Time', ...time },
    { label: 'Dist', value: miles >= 100 ? String(Math.round(miles)) : miles.toFixed(1), unit: 'mi' },
  ];
}

export function groupsInCommon(state: AppState, a: ID, b: ID): Group[] {
  return myGroups(state, a).filter(g => g.memberIds.includes(b));
}

export function sharedInterests(a: Student, b: Student): ID[] {
  return a.interests.filter(i => b.interests.includes(i));
}

export function workoutIcon(w: Workout) {
  switch (w.kind) {
    case 'lift': return 'barbell-outline';
    case 'run': return 'walk-outline';
    case 'ride': return 'bicycle-outline';
    default: return ACTIVITY_BY_ID[w.activityId]?.icon ?? 'fitness-outline';
  }
}

/** One short, true fact about a workout for list rows: distance, volume or the activity. */
export function workoutFact(w: Workout) {
  switch (w.kind) {
    case 'run': case 'ride': return formatDistance(w.distanceKm);
    case 'lift': {
      const v = liftVolume(w);
      return v ? `${v.toLocaleString()} lb moved` : `${w.exercises.length} exercises`;
    }
    default: return activityName(w.activityId);
  }
}

export function shortDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}
