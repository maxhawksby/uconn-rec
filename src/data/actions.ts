import type { AppState, ClassYear, ID, NewGroup, NewMeetup, NewWorkout, Student, Workout } from './types';
import { CLASS_YEARS } from './types';
import { normalizeEmail, signupGate, studentById } from './selectors';

// Pure state transitions. Each takes the current state and returns the next state plus an
// optional result. The React store (store.tsx) wraps these; a Supabase repository will
// replace them one-for-one. Invalid requests throw ActionError with a user-facing message.

export class ActionError extends Error {}

export type Ctx = { now: string; id: () => string };
export type Result<R = void> = { state: AppState; result: R };

const fail = (message: string): never => { throw new ActionError(message); };

function requireMe(state: AppState): Student {
  return studentById(state, state.meId) ?? fail('Sign in to do that.');
}

function cleanText(text: string, max: number, label: string) {
  const t = text.trim();
  if (!t) fail(`${label} can't be empty.`);
  if (t.length > max) fail(`${label} must be ${max} characters or fewer.`);
  return t;
}

// ---------- Sign-up ----------

export function startSignup(state: AppState, input: { email: string; schoolId: ID }, ctx: Ctx): Result<{ code: string }> {
  const gate = signupGate(input.email, input.schoolId);
  if (!gate.ok) {
    if (gate.reason === 'waitlist') fail(`${gate.school.shortName} isn't open yet. Join the waitlist instead.`);
    if (gate.reason === 'domain-mismatch') fail('Use your school email address.');
    fail('Enter a valid school email.');
  }
  const email = normalizeEmail(input.email);
  if (state.students.some(s => s.email === email && !s.isDemo)) fail('That email already has an account on this device.');
  const code = String(100000 + Math.floor(Math.random() * 900000));
  return { state: { ...state, pending: { email, schoolId: input.schoolId, code, verified: false, sentAt: ctx.now } }, result: { code } };
}

export function verifyCode(state: AppState, code: string): Result {
  if (!state.pending) fail('Start again with your school email.');
  if (code.trim() !== state.pending!.code) fail("That code doesn't match. Check it and try again.");
  return { state: { ...state, pending: { ...state.pending!, verified: true } }, result: undefined };
}

export type ProfileInput = { firstName: string; lastName: string; classYear: ClassYear; interests: ID[]; bio?: string };

function checkProfile(p: ProfileInput) {
  cleanText(p.firstName, 40, 'First name');
  cleanText(p.lastName, 40, 'Last name');
  if (!CLASS_YEARS.includes(p.classYear)) fail('Pick your class year.');
  if (p.bio && p.bio.length > 160) fail('Bio must be 160 characters or fewer.');
}

export function completeProfile(state: AppState, input: ProfileInput, ctx: Ctx): Result<{ studentId: ID }> {
  const pending = state.pending;
  if (!pending?.verified) fail('Verify your school email first.');
  checkProfile(input);
  const student: Student = {
    id: ctx.id(), email: pending!.email, schoolId: pending!.schoolId, createdAt: ctx.now,
    firstName: input.firstName.trim(), lastName: input.lastName.trim(), classYear: input.classYear,
    interests: [...new Set(input.interests)], bio: input.bio?.trim() || undefined,
  };
  return { state: { ...state, students: [...state.students, student], meId: student.id, pending: null }, result: { studentId: student.id } };
}

export function updateProfile(state: AppState, patch: Partial<ProfileInput>): Result {
  const me = requireMe(state);
  const next = { ...me, ...patch, interests: patch.interests ? [...new Set(patch.interests)] : me.interests };
  checkProfile(next);
  return { state: { ...state, students: state.students.map(s => (s.id === me.id ? next : s)) }, result: undefined };
}

export function joinWaitlist(state: AppState, input: { email: string; schoolId: ID }, ctx: Ctx): Result {
  const gate = signupGate(input.email, input.schoolId);
  if (!gate.ok && gate.reason !== 'waitlist') fail(gate.reason === 'domain-mismatch' ? 'Use your school email address.' : 'Enter a valid school email.');
  const email = normalizeEmail(input.email);
  if (state.waitlist.some(w => w.email === email)) return { state, result: undefined };
  return { state: { ...state, waitlist: [...state.waitlist, { email, schoolId: input.schoolId, at: ctx.now }] }, result: undefined };
}

export function signOut(state: AppState): Result {
  return { state: { ...state, meId: null, pending: null }, result: undefined };
}

// ---------- Workouts, kudos, comments ----------

function checkWorkout(w: NewWorkout) {
  cleanText(w.title, 80, 'Title');
  if (!(w.durationSec >= 0 && w.durationSec <= 24 * 3600)) fail('Duration looks off.');
  if (w.kind === 'lift') {
    if (!w.exercises.length) fail('Add at least one exercise.');
    for (const e of w.exercises) {
      cleanText(e.name, 60, 'Exercise name');
      if (!e.sets.length) fail(`Add a set for ${e.name}.`);
      if (e.sets.some(s => !(s.reps > 0 && s.reps <= 500 && s.weight >= 0 && s.weight <= 2000))) fail(`Check the sets for ${e.name}.`);
    }
  }
  if ((w.kind === 'run' || w.kind === 'ride') && !(w.distanceKm > 0 && w.distanceKm < 1000)) fail('Distance looks off.');
}

export function logWorkout(state: AppState, input: NewWorkout, ctx: Ctx): Result<{ workoutId: ID }> {
  const me = requireMe(state);
  checkWorkout(input);
  const workout = { ...input, title: input.title.trim(), id: ctx.id(), studentId: me.id } as Workout;
  return { state: { ...state, workouts: [workout, ...state.workouts] }, result: { workoutId: workout.id } };
}

export function deleteWorkout(state: AppState, workoutId: ID): Result {
  const me = requireMe(state);
  if (!state.workouts.some(w => w.id === workoutId && w.studentId === me.id)) fail('You can only delete your own workouts.');
  return {
    state: {
      ...state,
      workouts: state.workouts.filter(w => w.id !== workoutId),
      kudos: state.kudos.filter(k => k.workoutId !== workoutId),
      comments: state.comments.filter(c => c.workoutId !== workoutId),
    },
    result: undefined,
  };
}

export function toggleKudos(state: AppState, workoutId: ID, ctx: Ctx): Result<{ kudoed: boolean }> {
  const me = requireMe(state);
  const w = state.workouts.find(x => x.id === workoutId) ?? fail('That workout is gone.');
  if (w.studentId === me.id) fail("You can't give kudos to yourself.");
  const has = state.kudos.some(k => k.workoutId === workoutId && k.studentId === me.id);
  const kudos = has ? state.kudos.filter(k => !(k.workoutId === workoutId && k.studentId === me.id)) : [...state.kudos, { workoutId, studentId: me.id, at: ctx.now }];
  return { state: { ...state, kudos }, result: { kudoed: !has } };
}

export function addComment(state: AppState, input: { workoutId: ID; body: string }, ctx: Ctx): Result<{ commentId: ID }> {
  const me = requireMe(state);
  if (!state.workouts.some(w => w.id === input.workoutId)) fail('That workout is gone.');
  const comment = { id: ctx.id(), workoutId: input.workoutId, studentId: me.id, body: cleanText(input.body, 500, 'Comment'), at: ctx.now };
  return { state: { ...state, comments: [...state.comments, comment] }, result: { commentId: comment.id } };
}

export function deleteComment(state: AppState, commentId: ID): Result {
  const me = requireMe(state);
  if (!state.comments.some(c => c.id === commentId && c.studentId === me.id)) fail('You can only delete your own comments.');
  return { state: { ...state, comments: state.comments.filter(c => c.id !== commentId) }, result: undefined };
}

// ---------- Follows ----------

export function follow(state: AppState, studentId: ID, ctx: Ctx): Result {
  const me = requireMe(state);
  if (studentId === me.id) fail("You can't follow yourself.");
  if (!studentById(state, studentId)) fail('That student is gone.');
  if (state.follows.some(f => f.followerId === me.id && f.followeeId === studentId)) return { state, result: undefined };
  return { state: { ...state, follows: [...state.follows, { followerId: me.id, followeeId: studentId, at: ctx.now }] }, result: undefined };
}

export function unfollow(state: AppState, studentId: ID): Result {
  const me = requireMe(state);
  return { state: { ...state, follows: state.follows.filter(f => !(f.followerId === me.id && f.followeeId === studentId)) }, result: undefined };
}

// ---------- Meetups ----------

export function createMeetup(state: AppState, input: NewMeetup, ctx: Ctx): Result<{ meetupId: ID }> {
  const me = requireMe(state);
  const title = cleanText(input.title, 80, 'Title');
  const location = cleanText(input.location, 80, 'Location');
  if (!(input.capacity >= 2 && input.capacity <= 100)) fail('Capacity must be between 2 and 100.');
  if (new Date(input.startsAt).getTime() < new Date(ctx.now).getTime() - 5 * 60 * 1000) fail('Pick a time in the future.');
  if (input.groupId && !state.groups.some(g => g.id === input.groupId && g.memberIds.includes(me.id))) fail('Join that group first.');
  const meetup = { ...input, title, location, note: input.note?.trim() || undefined, id: ctx.id(), schoolId: me.schoolId, hostId: me.id, attendeeIds: [me.id], createdAt: ctx.now };
  return { state: { ...state, meetups: [...state.meetups, meetup] }, result: { meetupId: meetup.id } };
}

export function joinMeetup(state: AppState, meetupId: ID): Result {
  const me = requireMe(state);
  const m = state.meetups.find(x => x.id === meetupId) ?? fail('That meetup was cancelled.');
  if (m.attendeeIds.includes(me.id)) return { state, result: undefined };
  if (m.schoolId !== me.schoolId) fail('That meetup is at another campus.');
  if (m.attendeeIds.length >= m.capacity) fail("It's full. Ask the host to add spots.");
  return { state: { ...state, meetups: state.meetups.map(x => (x.id === meetupId ? { ...x, attendeeIds: [...x.attendeeIds, me.id] } : x)) }, result: undefined };
}

export function leaveMeetup(state: AppState, meetupId: ID): Result {
  const me = requireMe(state);
  const m = state.meetups.find(x => x.id === meetupId) ?? fail('That meetup was cancelled.');
  if (m.hostId === me.id) fail('Hosts cancel the meetup instead of leaving.');
  return { state: { ...state, meetups: state.meetups.map(x => (x.id === meetupId ? { ...x, attendeeIds: x.attendeeIds.filter(id => id !== me.id) } : x)) }, result: undefined };
}

export function cancelMeetup(state: AppState, meetupId: ID): Result {
  const me = requireMe(state);
  if (!state.meetups.some(x => x.id === meetupId && x.hostId === me.id)) fail('Only the host can cancel.');
  return { state: { ...state, meetups: state.meetups.filter(x => x.id !== meetupId) }, result: undefined };
}

// ---------- Groups ----------

export function createGroup(state: AppState, input: NewGroup, ctx: Ctx): Result<{ groupId: ID }> {
  const me = requireMe(state);
  const name = cleanText(input.name, 50, 'Group name');
  if (state.groups.some(g => g.schoolId === me.schoolId && g.name.toLowerCase() === name.toLowerCase())) fail('A group with that name already exists.');
  const group = { id: ctx.id(), schoolId: me.schoolId, name, kind: input.kind, description: input.description.trim().slice(0, 200), memberIds: [me.id], createdBy: me.id, createdAt: ctx.now };
  return { state: { ...state, groups: [...state.groups, group] }, result: { groupId: group.id } };
}

export function joinGroup(state: AppState, groupId: ID): Result {
  const me = requireMe(state);
  const g = state.groups.find(x => x.id === groupId) ?? fail('That group is gone.');
  if (g.schoolId !== me.schoolId) fail('That group is at another campus.');
  if (g.memberIds.includes(me.id)) return { state, result: undefined };
  return { state: { ...state, groups: state.groups.map(x => (x.id === groupId ? { ...x, memberIds: [...x.memberIds, me.id] } : x)) }, result: undefined };
}

export function leaveGroup(state: AppState, groupId: ID): Result {
  const me = requireMe(state);
  return { state: { ...state, groups: state.groups.map(x => (x.id === groupId ? { ...x, memberIds: x.memberIds.filter(id => id !== me.id) } : x)) }, result: undefined };
}

export function sendGroupMessage(state: AppState, input: { groupId: ID; body: string }, ctx: Ctx): Result<{ messageId: ID }> {
  const me = requireMe(state);
  if (!state.groups.some(g => g.id === input.groupId && g.memberIds.includes(me.id))) fail('Join the group to chat.');
  const message = { id: ctx.id(), groupId: input.groupId, studentId: me.id, body: cleanText(input.body, 1000, 'Message'), at: ctx.now };
  return { state: { ...state, messages: [...state.messages, message] }, result: { messageId: message.id } };
}
