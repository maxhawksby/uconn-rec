import type { AppState, FeedItem, ID, PersonalRecord, ProfileStats, School, Student, WeeklyTotals, Workout, Meetup, Group, GroupMessage } from './types';
import { SCHOOLS, SCHOOL_BY_ID, PILOT_UNLOCK_AT } from './schools';

// Pure read functions over AppState. No React, no storage: safe to unit test and to
// reimplement as Supabase queries later.

// ---------- Schools and sign-up gating ----------

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function emailDomain(email: string) {
  const at = normalizeEmail(email).split('@');
  return at.length === 2 && at[0] ? at[1] : '';
}

export function schoolForEmail(email: string, schools: School[] = SCHOOLS): School | undefined {
  const domain = emailDomain(email);
  if (!domain) return undefined;
  return schools.find(s => s.emailDomains.some(d => domain === d || domain.endsWith('.' + d)));
}

export function searchSchools(query: string, schools: School[] = SCHOOLS, limit = 25): School[] {
  const q = query.trim().toLowerCase();
  const hits = q
    ? schools.filter(s => [s.name, s.shortName, s.city, s.state, ...s.emailDomains].some(f => f.toLowerCase().includes(q)))
    : schools;
  return [...hits].sort((a, b) => Number(b.isPilot) - Number(a.isPilot) || a.name.localeCompare(b.name)).slice(0, limit);
}

export type SignupGate =
  | { ok: true; school: School }
  | { ok: false; reason: 'invalid-email' | 'domain-mismatch' | 'unknown-school' }
  | { ok: false; reason: 'waitlist'; school: School };

/** Decides what happens when a student submits an email for a chosen school. */
export function signupGate(email: string, schoolId: ID): SignupGate {
  const school = SCHOOL_BY_ID[schoolId];
  if (!school) return { ok: false, reason: 'unknown-school' };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(email))) return { ok: false, reason: 'invalid-email' };
  if (schoolForEmail(email, [school])?.id !== school.id) return { ok: false, reason: 'domain-mismatch' };
  if (!school.isPilot) return { ok: false, reason: 'waitlist', school };
  return { ok: true, school };
}

export function waitlistStatus(state: AppState, schoolId: ID, email?: string) {
  const entries = state.waitlist.filter(w => w.schoolId === schoolId);
  const index = email ? entries.findIndex(w => w.email === normalizeEmail(email)) : -1;
  return { count: entries.length, unlockAt: PILOT_UNLOCK_AT, position: index >= 0 ? index + 1 : null };
}

// ---------- People ----------

export function studentById(state: AppState, id: ID | null | undefined): Student | undefined {
  return id ? state.students.find(s => s.id === id) : undefined;
}

export function me(state: AppState) {
  return studentById(state, state.meId);
}

export function followingIds(state: AppState, studentId: ID): ID[] {
  return state.follows.filter(f => f.followerId === studentId).map(f => f.followeeId);
}

export function followerIds(state: AppState, studentId: ID): ID[] {
  return state.follows.filter(f => f.followeeId === studentId).map(f => f.followerId);
}

export function isFollowing(state: AppState, followerId: ID, followeeId: ID) {
  return state.follows.some(f => f.followerId === followerId && f.followeeId === followeeId);
}

/** Same-campus students the viewer doesn't follow yet, ranked by shared interests. */
export function suggestedStudents(state: AppState, viewerId: ID, limit = 10) {
  const viewer = studentById(state, viewerId);
  if (!viewer) return [];
  const following = new Set(followingIds(state, viewerId));
  return rankByInterests(state.students.filter(s => s.id !== viewerId && s.schoolId === viewer.schoolId && !following.has(s.id)), viewer.interests, limit);
}

/** Same-campus students ranked by shared interests, for sign-up before the account exists. */
export function suggestedStudentsFor(state: AppState, schoolId: ID, interests: ID[], limit = 6) {
  return rankByInterests(state.students.filter(s => s.schoolId === schoolId), interests, limit);
}

function rankByInterests(students: Student[], interests: ID[], limit: number) {
  return students
    .map(s => ({ student: s, shared: s.interests.filter(i => interests.includes(i)) }))
    .sort((a, b) => b.shared.length - a.shared.length || a.student.firstName.localeCompare(b.student.firstName))
    .slice(0, limit);
}

// ---------- Visibility and feed ----------

export function canSee(state: AppState, viewerId: ID, workout: Workout) {
  if (workout.studentId === viewerId) return true;
  if (workout.visibility === 'private') return false;
  const follows = isFollowing(state, viewerId, workout.studentId);
  if (workout.visibility === 'friends') return follows;
  const viewer = studentById(state, viewerId);
  const author = studentById(state, workout.studentId);
  return follows || (!!viewer && !!author && viewer.schoolId === author.schoolId);
}

function byNewest(a: Workout, b: Workout) {
  return b.startedAt.localeCompare(a.startedAt) || b.id.localeCompare(a.id);
}

/** Strips the private note from other students' workouts. */
function forViewer(workout: Workout, viewerId: ID): Workout {
  if (workout.studentId === viewerId || workout.note === undefined) return workout;
  const { note: _note, ...rest } = workout;
  return rest as Workout;
}

export function toFeedItem(state: AppState, workout: Workout, viewerId: ID): FeedItem | null {
  const author = studentById(state, workout.studentId);
  if (!author) return null;
  const kudos = state.kudos.filter(k => k.workoutId === workout.id);
  return {
    workout: forViewer(workout, viewerId),
    author,
    kudosCount: kudos.length,
    kudoedByMe: kudos.some(k => k.studentId === viewerId),
    comments: state.comments.filter(c => c.workoutId === workout.id).sort((a, b) => a.at.localeCompare(b.at)),
    isMine: workout.studentId === viewerId,
  };
}

/** 'following' = you + people you follow. 'campus' = everything visible at your school. */
export function feed(state: AppState, viewerId: ID, scope: 'following' | 'campus' = 'following'): FeedItem[] {
  const following = new Set(followingIds(state, viewerId));
  const viewer = studentById(state, viewerId);
  return state.workouts
    .filter(w => canSee(state, viewerId, w))
    .filter(w => scope === 'campus'
      ? w.studentId === viewerId || studentById(state, w.studentId)?.schoolId === viewer?.schoolId || following.has(w.studentId)
      : w.studentId === viewerId || following.has(w.studentId))
    .sort(byNewest)
    .map(w => toFeedItem(state, w, viewerId))
    .filter((x): x is FeedItem => !!x);
}

export function workoutsFor(state: AppState, studentId: ID, viewerId: ID): Workout[] {
  return state.workouts.filter(w => w.studentId === studentId && canSee(state, viewerId, w)).sort(byNewest).map(w => forViewer(w, viewerId));
}

export function workoutById(state: AppState, id: ID, viewerId: ID): FeedItem | null {
  const w = state.workouts.find(x => x.id === id);
  return w && canSee(state, viewerId, w) ? toFeedItem(state, w, viewerId) : null;
}

// ---------- Workout math ----------

/** Students who gave kudos to a workout, newest first. */
export function kudosGivers(state: AppState, workoutId: ID): Student[] {
  return state.kudos
    .filter(k => k.workoutId === workoutId)
    .sort((a, b) => b.at.localeCompare(a.at))
    .map(k => studentById(state, k.studentId))
    .filter((s): s is Student => !!s);
}

export function liftVolume(w: Workout) {
  return w.kind === 'lift' ? w.exercises.reduce((sum, e) => sum + e.sets.reduce((s, set) => s + set.reps * set.weight, 0), 0) : 0;
}

export function paceSecPerKm(w: Workout) {
  return (w.kind === 'run' || w.kind === 'ride') && w.distanceKm > 0 ? Math.round(w.durationSec / w.distanceKm) : null;
}

/** Local calendar day key, e.g. 2026-10-09. */
export function dayKey(iso: string | Date) {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Consecutive days with a workout, ending today (or yesterday, so the streak survives until tonight). */
export function streakDays(workouts: Workout[], now: Date = new Date()) {
  const days = new Set(workouts.map(w => dayKey(w.startedAt)));
  const cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (!days.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (days.has(dayKey(cursor))) { streak++; cursor.setDate(cursor.getDate() - 1); }
  return streak;
}

/** Monday 00:00 local of the week containing `now`. */
export function weekStart(now: Date = new Date()) {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}

export function weeklyTotals(workouts: Workout[], now: Date = new Date()): WeeklyTotals {
  const start = weekStart(now);
  const week = workouts.filter(w => new Date(w.startedAt) >= start && new Date(w.startedAt) <= now);
  return {
    sessions: week.length,
    activeSec: week.reduce((s, w) => s + w.durationSec, 0),
    distanceKm: Math.round(week.reduce((s, w) => s + (w.kind === 'run' || w.kind === 'ride' ? w.distanceKm : 0), 0) * 10) / 10,
    liftVolume: week.reduce((s, w) => s + liftVolume(w), 0),
    weekStart: start.toISOString(),
  };
}

/** Heaviest set per exercise (ties go to more reps, then the earlier date). */
export function personalRecords(workouts: Workout[]): PersonalRecord[] {
  const best = new Map<string, PersonalRecord>();
  for (const w of [...workouts].sort((a, b) => a.startedAt.localeCompare(b.startedAt))) {
    if (w.kind !== 'lift') continue;
    for (const e of w.exercises) for (const set of e.sets) {
      if (set.weight <= 0) continue;
      const key = e.name.trim().toLowerCase();
      const cur = best.get(key);
      if (!cur || set.weight > cur.weight || (set.weight === cur.weight && set.reps > cur.reps)) {
        best.set(key, { exercise: e.name.trim(), weight: set.weight, reps: set.reps, at: w.startedAt, workoutId: w.id });
      }
    }
  }
  return [...best.values()].sort((a, b) => b.weight - a.weight);
}

export function profileStats(state: AppState, studentId: ID, now: Date = new Date()): ProfileStats {
  const mine = state.workouts.filter(w => w.studentId === studentId);
  return { streakDays: streakDays(mine, now), totalSessions: mine.length, week: weeklyTotals(mine, now), prs: personalRecords(mine) };
}

// ---------- Meetups and groups ----------

/** Meetups at a school that haven't ended (2h grace after start), soonest first. */
export function upcomingMeetups(state: AppState, schoolId: ID, now: Date = new Date()): Meetup[] {
  const cutoff = now.getTime() - 2 * 60 * 60 * 1000;
  return state.meetups.filter(m => m.schoolId === schoolId && new Date(m.startsAt).getTime() >= cutoff)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}

/** A group's upcoming meetups, soonest first. */
export function meetupsForGroup(state: AppState, groupId: ID, now: Date = new Date()): Meetup[] {
  const group = groupById(state, groupId);
  return group ? upcomingMeetups(state, group.schoolId, now).filter(m => m.groupId === groupId) : [];
}

export function spotsLeft(m: Meetup) {
  return Math.max(0, m.capacity - m.attendeeIds.length);
}

export function meetupById(state: AppState, id: ID) {
  return state.meetups.find(m => m.id === id);
}

export function groupsForSchool(state: AppState, schoolId: ID): Group[] {
  return state.groups.filter(g => g.schoolId === schoolId).sort((a, b) => b.memberIds.length - a.memberIds.length);
}

export function myGroups(state: AppState, studentId: ID): Group[] {
  return state.groups.filter(g => g.memberIds.includes(studentId));
}

export function groupById(state: AppState, id: ID) {
  return state.groups.find(g => g.id === id);
}

export function groupMessages(state: AppState, groupId: ID): GroupMessage[] {
  return state.messages.filter(m => m.groupId === groupId).sort((a, b) => a.at.localeCompare(b.at));
}

// ---------- Formatting helpers shared by screens ----------

export function formatDuration(sec: number) {
  const h = Math.floor(sec / 3600), m = Math.round((sec % 3600) / 60);
  return h ? `${h}h ${m}m` : `${m}m`;
}

// Data is stored metric; US students read miles.
export const KM_PER_MILE = 1.609344;

export function formatDistance(km: number) {
  return `${(km / KM_PER_MILE).toFixed(km / KM_PER_MILE >= 10 ? 1 : 2)} mi`;
}

/** Seconds per km as a per-mile clock ("8:42"), or null when there's no pace. */
function mileClock(secPerKm: number | null) {
  if (!secPerKm || !isFinite(secPerKm)) return null;
  const perMile = Math.round(secPerKm * KM_PER_MILE);
  return `${Math.floor(perMile / 60)}:${String(perMile % 60).padStart(2, '0')}`;
}

export function formatPace(secPerKm: number | null) {
  const clock = mileClock(secPerKm);
  return clock ? `${clock}/mi` : '-';
}

// Scoreboard cells show a value and a unit separately.

/** Miles as a bare number string ("3.12", "24.8"). */
export function miles(km: number) {
  const mi = km / KM_PER_MILE;
  return mi === 0 ? '0' : mi.toFixed(mi >= 10 ? 1 : 2);
}

/** Pace split into value + unit ("8:42", "/mi"). */
export function paceParts(durationSec: number, km: number) {
  const clock = km > 0 && durationSec > 0 ? mileClock(durationSec / km) : null;
  return clock ? { value: clock, unit: '/mi' } : { value: '-', unit: '' };
}

export function mph(durationSec: number, km: number) {
  if (!(km > 0) || !(durationSec > 0)) return '-';
  return (km / KM_PER_MILE / (durationSec / 3600)).toFixed(1);
}

/** Duration split: "1:05" + "h" or "48" + "min". */
export function durationParts(sec: number) {
  const totalMin = Math.round(sec / 60);
  const h = Math.floor(totalMin / 60), m = totalMin % 60;
  return h ? { value: `${h}:${String(m).padStart(2, '0')}`, unit: 'h' } : { value: String(m), unit: 'min' };
}

/** 12,450 -> "12.5k"; small numbers stay exact. */
export function compactNumber(n: number) {
  if (n >= 100000) return `${Math.round(n / 1000)}k`;
  if (n >= 10000) return `${Math.round(n / 100) / 10}k`;
  return n.toLocaleString('en-US');
}

export function relativeTime(iso: string, now: Date = new Date()) {
  const diff = Math.round((now.getTime() - new Date(iso).getTime()) / 60000);
  if (diff < 1) return 'now';
  if (diff < 60) return `${diff}m`;
  if (diff < 24 * 60) return `${Math.round(diff / 60)}h`;
  if (diff < 7 * 24 * 60) return `${Math.round(diff / 1440)}d`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function initials(s: Pick<Student, 'firstName' | 'lastName'>) {
  return `${s.firstName[0] ?? ''}${s.lastName[0] ?? ''}`.toUpperCase();
}
