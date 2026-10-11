import type { SupabaseClient } from '@supabase/supabase-js';
import type { AppState, Comment, Follow, Group, GroupMessage, ID, Kudos, Meetup, Student, Workout } from './types';

// Reads and writes between Supabase rows and the app's AppState shapes. The server's
// row-level security decides what comes back, so loading "everything" means everything this
// student is allowed to see: their campus, never another school's.

export type Table =
  | 'students' | 'follows' | 'workouts' | 'workout_notes' | 'workout_tags' | 'kudos' | 'comments'
  | 'meetups' | 'meetup_attendees' | 'groups' | 'group_members' | 'group_messages';

/** Which AppState lists a table change can affect, so a live change refetches only those. */
export const TABLE_SLICES: Record<Table, Slice[]> = {
  students: ['students'], kudos: ['kudos'], comments: ['comments'],
  follows: ['follows', 'workouts', 'kudos', 'comments'], // following changes what you can see
  workouts: ['workouts'], workout_notes: ['workouts'], workout_tags: ['workouts', 'kudos', 'comments'],
  meetups: ['meetups'], meetup_attendees: ['meetups'],
  groups: ['groups'], group_members: ['groups', 'messages'], group_messages: ['messages'],
};
export type Slice = 'students' | 'follows' | 'workouts' | 'kudos' | 'comments' | 'meetups' | 'groups' | 'messages';
export const ALL_SLICES: Slice[] = ['students', 'follows', 'workouts', 'kudos', 'comments', 'meetups', 'groups', 'messages'];

type Row = Record<string, any>;

async function rows(q: PromiseLike<{ data: Row[] | null; error: { message: string } | null }>): Promise<Row[]> {
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data ?? [];
}

function groupBy(list: Row[], key: string) {
  const out = new Map<string, Row[]>();
  for (const r of list) { const k = r[key]; out.set(k, [...(out.get(k) ?? []), r]); }
  return out;
}

const toStudent = (r: Row): Student => ({
  id: r.id, schoolId: r.school_id, firstName: r.first_name, lastName: r.last_name, classYear: r.class_year,
  interests: r.interests ?? [], bio: r.bio ?? undefined, createdAt: r.created_at,
});

function toWorkout(r: Row, note: string | undefined, tagged: ID[]): Workout {
  const base = {
    id: r.id, studentId: r.student_id, title: r.title, startedAt: r.started_at, durationSec: r.duration_sec,
    visibility: r.visibility, ...(note ? { note } : {}), ...(r.group_id ? { groupId: r.group_id } : {}),
  };
  switch (r.kind) {
    case 'lift': return { ...base, kind: 'lift', exercises: r.exercises };
    case 'run': case 'ride': return { ...base, kind: r.kind, distanceKm: Number(r.distance_km), ...(r.route ? { route: r.route } : {}) };
    case 'sport': return { ...base, kind: 'sport', activityId: r.activity_id, withIds: tagged, ...(r.result ? { result: r.result } : {}) };
    default: return { ...base, kind: r.kind, activityId: r.activity_id };
  }
}

export function workoutRow(w: Workout): Row {
  return {
    id: w.id, student_id: w.studentId, kind: w.kind, title: w.title, started_at: w.startedAt, duration_sec: Math.round(w.durationSec),
    visibility: w.visibility, group_id: w.groupId ?? null,
    exercises: w.kind === 'lift' ? w.exercises : null,
    distance_km: w.kind === 'run' || w.kind === 'ride' ? w.distanceKm : null,
    route: (w.kind === 'run' || w.kind === 'ride') && w.route?.length ? w.route : null,
    activity_id: 'activityId' in w ? w.activityId : null,
    result: w.kind === 'sport' ? w.result ?? null : null,
  };
}

/** Loads the given slices of AppState from the server. */
export async function load(db: SupabaseClient, slices: Slice[]): Promise<Partial<AppState>> {
  const want = new Set(slices);
  const out: Partial<AppState> = {};
  const jobs: Promise<void>[] = [];

  if (want.has('students')) jobs.push(rows(db.from('students').select('*')).then(r => { out.students = r.map(toStudent); }));
  if (want.has('follows')) jobs.push(rows(db.from('follows').select('*')).then(r => {
    out.follows = r.map((f): Follow => ({ followerId: f.follower_id, followeeId: f.followee_id, at: f.created_at }));
  }));
  if (want.has('kudos')) jobs.push(rows(db.from('kudos').select('*')).then(r => {
    out.kudos = r.map((k): Kudos => ({ workoutId: k.workout_id, studentId: k.student_id, at: k.created_at }));
  }));
  if (want.has('comments')) jobs.push(rows(db.from('comments').select('*').order('created_at')).then(r => {
    out.comments = r.map((c): Comment => ({ id: c.id, workoutId: c.workout_id, studentId: c.student_id, body: c.body, at: c.created_at }));
  }));
  if (want.has('messages')) jobs.push(rows(db.from('group_messages').select('*').order('created_at')).then(r => {
    out.messages = r.map((m): GroupMessage => ({ id: m.id, groupId: m.group_id, studentId: m.student_id, body: m.body, at: m.created_at }));
  }));
  if (want.has('workouts')) jobs.push(Promise.all([
    rows(db.from('workouts').select('*').order('started_at', { ascending: false })),
    rows(db.from('workout_notes').select('*')),
    rows(db.from('workout_tags').select('*').neq('status', 'declined').order('created_at')),
  ]).then(([ws, notes, tags]) => {
    const noteBy = new Map(notes.map(n => [n.workout_id, n.body as string]));
    const tagsBy = groupBy(tags, 'workout_id');
    out.workouts = ws.map(w => toWorkout(w, noteBy.get(w.id), (tagsBy.get(w.id) ?? []).map(t => t.student_id)));
  }));
  if (want.has('meetups')) jobs.push(Promise.all([
    rows(db.from('meetups').select('*')),
    rows(db.from('meetup_attendees').select('*').order('joined_at')),
  ]).then(([ms, att]) => {
    const by = groupBy(att, 'meetup_id');
    out.meetups = ms.map((m): Meetup => ({
      id: m.id, schoolId: m.school_id, hostId: m.host_id, activityId: m.activity_id, title: m.title, location: m.location,
      startsAt: m.starts_at, capacity: m.capacity, attendeeIds: (by.get(m.id) ?? []).map(a => a.student_id),
      createdAt: m.created_at, ...(m.group_id ? { groupId: m.group_id } : {}), ...(m.note ? { note: m.note } : {}),
    }));
  }));
  if (want.has('groups')) jobs.push(Promise.all([
    rows(db.from('groups').select('*')),
    rows(db.from('group_members').select('*').order('joined_at')),
  ]).then(([gs, mem]) => {
    const by = groupBy(mem, 'group_id');
    out.groups = gs.map((g): Group => ({
      id: g.id, schoolId: g.school_id, name: g.name, kind: g.kind, description: g.description, createdBy: g.created_by,
      createdAt: g.created_at, memberIds: (by.get(g.id) ?? []).map(m => m.student_id),
    }));
  }));

  await Promise.all(jobs);
  return out;
}
