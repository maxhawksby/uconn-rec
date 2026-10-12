import type { AppState, Award, Comment, Follow, Group, GroupMessage, Kudos, LiftExercise, Meetup, Org, RoutePoint, Student, StudentAward, StudentBadge, Workout, WorkoutPhoto, WorkoutTag } from './types';
import { PILOT_SCHOOL_ID } from './schools';
import { MAJORS, majorId } from './majors';

// Fictional seed data for the pilot campus. Every person here is made up. Times are
// generated relative to `now` so the feed always looks fresh on first launch.

export const STATE_VERSION = 3 as const;

// The awards every install starts with. Matches the seed in supabase/migrations/*_badges.sql.
export const DEFAULT_AWARDS: Award[] = [
  { id: 'founder', name: 'Founder', description: 'Started Valence.', icon: 'crown', tone: 'gold', rank: 0 },
  { id: 'pilot-crew', name: 'Pilot Crew', description: 'One of the first students on Valence.', icon: 'rocket-launch', tone: 'accent', rank: 10 },
  { id: 'meetup-host', name: 'Meetup Host', description: 'Brings people together for pickup games and group workouts.', icon: 'bullhorn', tone: 'ink', rank: 50 },
];

/** The shared majors list plus nothing campus-specific. */
export const baseOrgs = (): Org[] => MAJORS.map(m => ({ id: m.id, schoolId: null, kind: 'major' as const, name: m.name }));

export function emptyState(): AppState {
  return {
    version: STATE_VERSION, meId: null, pending: null, students: [], workouts: [], kudos: [], comments: [], follows: [], meetups: [], groups: [], messages: [],
    waitlist: [], tags: [], photos: [], orgs: baseOrgs(), badges: [], awards: DEFAULT_AWARDS, studentAwards: [], adminIds: [],
  };
}

// Small seeded PRNG so demo data (and tests) are stable.
function rng(seed: number) {
  return () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
}

// A wobbly closed loop of about `km` around a generic college town, timed evenly over
// `durationSec`. Good enough to make route sketches and maps look real.
const ROUTE_CENTER = { lat: 41.8077, lng: -72.254 };
function loopRoute(r: () => number, km: number, durationSec: number): RoutePoint[] {
  const count = Math.min(160, Math.max(40, Math.round(km * 14)));
  const phase = [r() * 6.28, r() * 6.28, r() * 6.28];
  const shape = Array.from({ length: count + 1 }, (_, i) => {
    const a = (i / count) * Math.PI * 2;
    const rad = 1 + 0.28 * Math.sin(2 * a + phase[0]) + 0.16 * Math.sin(3 * a + phase[1]) + 0.08 * Math.sin(5 * a + phase[2]);
    return { x: Math.cos(a) * rad, y: Math.sin(a) * rad };
  });
  let perimeter = 0;
  for (let i = 1; i < shape.length; i++) perimeter += Math.hypot(shape[i].x - shape[i - 1].x, shape[i].y - shape[i - 1].y);
  const kmPerUnit = km / perimeter;
  const start = { lat: ROUTE_CENTER.lat + (r() - 0.5) * 0.02, lng: ROUTE_CENTER.lng + (r() - 0.5) * 0.03 };
  const kmPerLat = 111.32, kmPerLng = 111.32 * Math.cos((start.lat * Math.PI) / 180);
  return shape.map((p, i) => ({
    lat: start.lat + ((p.y - shape[0].y) * kmPerUnit) / kmPerLat,
    lng: start.lng + ((p.x - shape[0].x) * kmPerUnit) / kmPerLng,
    t: Math.round((i / count) * durationSec * 1000),
  }));
}

type Seed = [id: string, first: string, last: string, year: Student['classYear'], interests: string[], bio: string];
const PEOPLE: Seed[] = [
  ['jordan', 'Jordan', 'Reyes', 'Junior', ['lifting', 'powerlifting', 'basketball'], 'Chasing a 405 deadlift.'],
  ['priya', 'Priya', 'Natarajan', 'Sophomore', ['running', 'trail-running', 'yoga'], 'Half marathon in April.'],
  ['marcus', 'Marcus', 'Bell', 'Senior', ['lifting', 'bodybuilding', 'flag-football'], 'Push / pull / legs, forever.'],
  ['ava', 'Ava', 'Lindqvist', 'First year', ['climbing', 'yoga', 'hiking'], 'Bouldering V4s.'],
  ['tomas', 'Tomás', 'Ortega', 'Junior', ['soccer', 'running', 'intramurals'], 'IM soccer captain.'],
  ['kayla', 'Kayla', 'Brooks', 'Sophomore', ['lifting', 'hiit', 'spin'], 'Morning lifts before class.'],
  ['ethan', 'Ethan', 'Park', 'Grad student', ['cycling', 'club-triathlon', 'swimming'], 'Tri club. Will talk about bikes.'],
  ['nia', 'Nia', 'Okafor', 'Senior', ['volleyball', 'lifting', 'pilates'], 'Club volleyball setter.'],
  ['liam', 'Liam', 'Gallagher', 'First year', ['basketball', 'lifting', 'spikeball'], 'Pickup hoops most nights.'],
  ['sofia', 'Sofia', 'Marino', 'Junior', ['running', 'lifting', 'dance'], 'Run club + lifting.'],
  ['devin', 'Devin', 'Chau', 'Sophomore', ['club-rugby', 'lifting', 'olympic-lifting'], 'Rugby season, eating everything.'],
  ['hannah', 'Hannah', 'Weiss', 'Senior', ['yoga', 'walking', 'mobility'], 'Yoga + long walks.'],
  ['caleb', 'Caleb', 'Mensah', 'Junior', ['calisthenics', 'running', 'boxing'], 'Muscle-up club.'],
  ['riley', 'Riley', 'Sutton', 'First year', ['ultimate', 'running', 'pickleball'], 'Frisbee team rookie.'],
];

// The pilot campus's own organizations, which students added themselves.
const CAMPUS_ORGS: [Org['kind'], string][] = [
  ['greek', 'Alpha Phi'], ['greek', 'Sigma Chi'], ['greek', 'Delta Gamma'], ['greek', 'Phi Delta Theta'],
  ['club', 'Run Club'], ['club', 'Club Rugby'], ['club', 'Climbing Club'], ['club', 'Club Triathlon'], ['club', 'Ultimate Frisbee'],
  ['team', 'Club Volleyball'], ['team', 'IM Soccer'],
];
const orgId = (name: string) => `org-${PILOT_SCHOOL_ID}-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`;

// What each demo student wears: majors (by name) and campus orgs (by name).
const WEARS: Record<string, string[]> = {
  jordan: ['Kinesiology', 'Sigma Chi'], priya: ['Biology', 'Pre-Med', 'Run Club'], marcus: ['Finance', 'Phi Delta Theta'],
  ava: ['Environmental Science', 'Climbing Club'], tomas: ['Mechanical Engineering', 'IM Soccer'], kayla: ['Exercise Science', 'Alpha Phi'],
  ethan: ['Civil Engineering', 'Club Triathlon'], nia: ['Nursing', 'Club Volleyball', 'Delta Gamma'], liam: ['Undeclared'],
  sofia: ['Marketing', 'Run Club', 'Alpha Phi'], devin: ['Sport Management', 'Club Rugby'],
  hannah: ['Psychology', 'Public Health'], caleb: ['Computer Science'], riley: ['Communication', 'Ultimate Frisbee'],
};
// Demo awards (the Founder crown is Max's alone, so it never goes to a made-up student).
const DEMO_AWARDS: [student: string, award: string][] = [['priya', 'meetup-host'], ['liam', 'meetup-host'], ['kayla', 'pilot-crew'], ['jordan', 'pilot-crew']];

const LIFT_DAYS: { title: string; exercises: [string, number, number][] }[] = [
  { title: 'Push day', exercises: [['Bench press', 185, 5], ['Overhead press', 105, 8], ['Incline dumbbell press', 60, 10]] },
  { title: 'Pull day', exercises: [['Deadlift', 315, 3], ['Barbell row', 155, 8], ['Pull-up', 0, 10]] },
  { title: 'Leg day', exercises: [['Back squat', 245, 5], ['Romanian deadlift', 185, 8], ['Leg press', 360, 12]] },
  { title: 'Full body', exercises: [['Front squat', 165, 5], ['Bench press', 175, 6], ['Pull-up', 0, 8]] },
];

const SPORT_TITLES: Record<string, string> = {
  basketball: 'Pickup hoops', soccer: 'IM soccer', 'flag-football': 'Flag football', volleyball: 'Volleyball practice',
  spikeball: 'Spikeball on the green', ultimate: 'Ultimate scrimmage', pickleball: 'Pickleball doubles', intramurals: 'Intramural game',
  'club-rugby': 'Rugby practice',
};
const CLASS_TITLES: Record<string, string> = {
  yoga: 'Vinyasa yoga', pilates: 'Mat pilates', spin: 'Spin class', hiit: 'HIIT bootcamp', dance: 'Dance cardio',
  boxing: 'Boxing conditioning', mobility: 'Mobility session', climbing: 'Bouldering session', hiking: 'Weekend hike',
  swimming: 'Lap swim', 'club-triathlon': 'Brick workout', 'olympic-lifting': 'Snatch technique', calisthenics: 'Skills + bar work',
};

const COMMENTS = ['Let’s go!', 'Strong week.', 'Save me a spot next time', 'That pace though', 'PR szn', 'Who’s in tomorrow?', 'Huge.', 'Legs are done for'];

const MESSAGES: Record<string, string[]> = {
  'g-6am': ['Anyone lifting at 6 tomorrow?', 'In. Bench day.', 'I’ll be there 6:15'],
  'g-runners': ['Easy 5k Thursday, meet at the library steps', 'Pace?', '9:30s, no one gets dropped'],
  'g-hoops': ['Running full court at 8 tonight', 'Need two more', 'On my way'],
  'g-rugby': ['Film session moved to 7', 'Bring cleats for the turf'],
  'g-kines': ['Anyone have notes from exercise phys?', 'Study + lift combo Sunday?'],
};

function lift(r: () => number, i: number): { title: string; exercises: LiftExercise[] } {
  const day = LIFT_DAYS[i % LIFT_DAYS.length];
  const bump = Math.round(r() * 4) * 5 - 10;
  return {
    title: day.title,
    exercises: day.exercises.map(([name, weight, reps]) => ({
      name,
      sets: [0, 1, 2].map(k => ({ reps: reps + (k === 2 ? -1 : 0), weight: weight === 0 ? 0 : Math.max(45, weight + bump - (k === 0 ? 20 : 0)) })),
    })),
  };
}

export function makeDemoState(now: Date = new Date()): AppState {
  const r = rng(42);
  const iso = (d: Date) => d.toISOString();
  const at = (daysAgo: number, hour: number, minute = 0) => {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysAgo, hour, minute);
    return d.getTime() > now.getTime() ? new Date(now.getTime() - (1 + daysAgo) * 45 * 60000) : d;
  };
  const createdAt = iso(new Date(now.getTime() - 40 * 86400000));

  const students: Student[] = PEOPLE.map(([id, firstName, lastName, classYear, interests, bio]) => ({
    id, firstName, lastName, classYear, interests, bio, isDemo: true, createdAt,
    email: `${firstName.normalize('NFD').replace(/[^a-zA-Z]/g, '').toLowerCase()}.${lastName.toLowerCase()}@uconn.edu`,
    schoolId: PILOT_SCHOOL_ID,
  }));

  // Everyone follows a handful of others so the network feels real.
  const follows: Follow[] = [];
  students.forEach((s, i) => {
    for (let k = 1; k <= 5; k++) follows.push({ followerId: s.id, followeeId: students[(i + k * 3) % students.length].id, at: createdAt });
  });

  const groupSeed: [string, string, Group['kind'], string, string[]][] = [
    ['g-6am', '6AM Lift Club', 'crew', 'Early lifts, no excuses. All levels.', ['jordan', 'kayla', 'marcus', 'devin', 'sofia']],
    ['g-runners', 'North Campus Runners', 'dorm', 'Easy group runs from the north dorms.', ['priya', 'tomas', 'sofia', 'caleb', 'riley']],
    ['g-hoops', 'Pickup Hoops', 'crew', 'Nightly full court. Text the chat before you come.', ['liam', 'jordan', 'marcus']],
    ['g-rugby', 'Club Rugby', 'club', 'Practices, lifts and match days.', ['devin', 'marcus']],
    ['g-kines', 'Kinesiology Majors', 'major', 'Study, lift, repeat.', ['nia', 'hannah', 'kayla', 'ethan']],
  ];
  const groups: Group[] = groupSeed.map(([id, name, kind, description, memberIds]) => ({ id, name, kind, description, memberIds, schoolId: PILOT_SCHOOL_ID, createdBy: memberIds[0], createdAt }));

  // Some workouts are shared into a group the author belongs to, so group Activity tabs have content.
  const groupFor = (studentId: string, interest: string, n: number) => {
    const theme: Record<string, string> = { lifting: 'g-6am', powerlifting: 'g-6am', running: 'g-runners', 'trail-running': 'g-runners', basketball: 'g-hoops', rugby: 'g-rugby' };
    const id = theme[interest] ?? (n % 3 === 0 ? 'g-kines' : undefined);
    return id && n % 2 === 0 && groups.find(g => g.id === id)?.memberIds.includes(studentId) ? id : undefined;
  };
  const routeRng = rng(7);

  const workouts: Workout[] = [];
  const tags: WorkoutTag[] = [];
  const photos: WorkoutPhoto[] = [];
  const tag = (workoutId: string, studentId: string, at: string, status: WorkoutTag['status'] = 'accepted') => tags.push({ workoutId, studentId, status, at });
  const photo = (workoutId: string, studentId: string, name: string, at: string) => photos.push({ id: `p-${photos.length}`, workoutId, studentId, uri: `demo:${name}`, at });
  let n = 0;
  students.forEach((s, si) => {
    for (let daysAgo = 0; daysAgo < 14; daysAgo++) {
      if (r() > 0.42) continue;
      const interest = s.interests[Math.floor(r() * s.interests.length)];
      const startedAt = iso(at(daysAgo, 6 + Math.floor(r() * 15), Math.floor(r() * 4) * 15));
      const visibility = r() > 0.85 ? 'friends' : 'campus';
      const id = `w-${s.id}-${n++}`;
      const groupId = visibility === 'campus' ? groupFor(s.id, interest, n) : undefined;
      const base = { id, studentId: s.id, startedAt, visibility, ...(groupId ? { groupId } : {}) } as const;
      if (['lifting', 'powerlifting', 'bodybuilding'].includes(interest)) {
        workouts.push({ ...base, kind: 'lift', durationSec: (50 + Math.floor(r() * 40)) * 60, ...lift(r, si + daysAgo) });
      } else if (['running', 'trail-running', 'walking'].includes(interest)) {
        const km = Math.round((3 + r() * 9) * 10) / 10;
        const pace = interest === 'walking' ? 600 : 300 + Math.floor(r() * 90);
        const durationSec = Math.round(km * pace);
        workouts.push({ ...base, kind: 'run', title: interest === 'walking' ? 'Campus walk' : km > 9 ? 'Long run' : 'Easy run', distanceKm: km, durationSec, route: loopRoute(routeRng, km, durationSec) });
      } else if (interest === 'cycling') {
        const km = Math.round((20 + r() * 40) * 10) / 10;
        const durationSec = Math.round(km * 130);
        workouts.push({ ...base, kind: 'ride', title: 'Back roads ride', distanceKm: km, durationSec, route: loopRoute(routeRng, km, durationSec) });
      } else if (SPORT_TITLES[interest]) {
        students.filter(o => o.id !== s.id && o.interests.includes(interest)).slice(0, 3).forEach(o => tag(id, o.id, startedAt));
        workouts.push({ ...base, kind: 'sport', title: SPORT_TITLES[interest], activityId: interest, durationSec: (45 + Math.floor(r() * 60)) * 60, result: r() > 0.5 ? 'W 21-17' : undefined });
      } else {
        workouts.push({ ...base, kind: 'class', title: CLASS_TITLES[interest] ?? 'Workout', activityId: interest, durationSec: (40 + Math.floor(r() * 30)) * 60 });
      }
    }
  });

  // Workouts done together: tagged friends accepted, and both sides added photos. Kayla's
  // bench session still waits on Jordan's answer, so signing in as Jordan shows a request.
  const lastHour = (hoursAgo: number) => iso(new Date(now.getTime() - hoursAgo * 3600000));
  workouts.push(
    { ...lift(r, 2), id: 'w-shared-legs', studentId: 'marcus', kind: 'lift', title: 'Heavy leg day', startedAt: lastHour(3), durationSec: 72 * 60, visibility: 'campus', groupId: 'g-6am' },
    { ...lift(r, 0), id: 'w-shared-bench', studentId: 'kayla', kind: 'lift', title: '6AM bench crew', startedAt: iso(at(1, 6, 15)), durationSec: 58 * 60, visibility: 'campus' },
  );
  const sunriseKm = 6.4, sunriseSec = Math.round(sunriseKm * 330);
  workouts.push({ id: 'w-shared-run', studentId: 'caleb', kind: 'run', title: 'Sunrise loop', startedAt: iso(at(1, 7)), durationSec: sunriseSec, visibility: 'campus', distanceKm: sunriseKm, route: loopRoute(routeRng, sunriseKm, sunriseSec) });
  tag('w-shared-legs', 'jordan', lastHour(2));
  tag('w-shared-bench', 'sofia', iso(at(1, 7, 30)));
  tag('w-shared-bench', 'jordan', iso(at(1, 7, 30)), 'pending');
  tag('w-shared-run', 'hannah', iso(at(1, 8)));
  photo('w-shared-legs', 'marcus', 'lift-row', lastHour(2));
  photo('w-shared-legs', 'jordan', 'lift-plates', lastHour(1.5));
  photo('w-shared-bench', 'kayla', 'lift-turf', iso(at(1, 7, 20)));
  photo('w-shared-run', 'hannah', 'run-club', iso(at(1, 8, 10)));
  const hoops = workouts.find(w => w.kind === 'sport' && w.activityId === 'basketball');
  if (hoops) { photo(hoops.id, hoops.studentId, 'hoops-courts', hoops.startedAt); photo(hoops.id, hoops.studentId, 'hoops-sunset', hoops.startedAt); }

  const kudos: Kudos[] = [];
  const comments: Comment[] = [];
  workouts.forEach((w, i) => {
    const fans = follows.filter(f => f.followeeId === w.studentId).map(f => f.followerId);
    fans.forEach(f => { if (r() > 0.4) kudos.push({ workoutId: w.id, studentId: f, at: w.startedAt }); });
    if (fans.length && r() > 0.7) comments.push({ id: `c-${i}`, workoutId: w.id, studentId: fans[Math.floor(r() * fans.length)], body: COMMENTS[i % COMMENTS.length], at: w.startedAt });
  });

  const messages: GroupMessage[] = [];
  groups.forEach(g => (MESSAGES[g.id] ?? []).forEach((body, i) => messages.push({
    id: `m-${g.id}-${i}`, groupId: g.id, studentId: g.memberIds[i % g.memberIds.length], body, at: iso(new Date(now.getTime() - (3 - i) * 50 * 60000)),
  })));

  // Meetups land at believable local times (day offset + clock time), never 2am.
  const meetAt = (days: number, hour: number, minute = 0) => {
    const d = new Date(now); d.setDate(d.getDate() + days); d.setHours(hour, minute, 0, 0);
    if (d.getTime() <= now.getTime() + 3600000) d.setDate(d.getDate() + 1);
    return iso(d);
  };
  const meetupSeed: [string, string, string, string, [number, number, number?], number, string[], string?][] = [
    ['basketball', 'Full court run, need 4', 'Rec center, court 2', 'liam', [0, 20], 9, ['liam', 'jordan', 'marcus', 'devin', 'caleb'], 'g-hoops'],
    ['running', 'Easy 5k, 9:30 pace', 'Library steps', 'priya', [1, 7, 30], 12, ['priya', 'sofia', 'riley'], 'g-runners'],
    ['lifting', 'Bench + spot partners', 'Rec center weight room', 'kayla', [1, 18], 4, ['kayla', 'jordan'], 'g-6am'],
    ['spikeball', 'Spikeball on the great lawn', 'Great lawn by the pond', 'riley', [2, 16], 8, ['riley', 'liam', 'tomas']],
    ['yoga', 'Sunset yoga, bring a mat', 'Hillside overlook', 'hannah', [3, 18, 30], 15, ['hannah', 'ava', 'nia']],
    ['soccer', '7v7 pickup', 'Turf field B', 'tomas', [4, 17], 16, ['tomas', 'caleb']],
  ];
  const meetups: Meetup[] = meetupSeed.map(([activityId, title, location, hostId, [days, hour, minute], capacity, attendeeIds, groupId], i) => ({
    id: `mt-${i}`, schoolId: PILOT_SCHOOL_ID, activityId, title, location, hostId, startsAt: meetAt(days, hour, minute), capacity, attendeeIds, groupId, createdAt: iso(new Date(now.getTime() - 86400000)),
  }));

  const waitlist = [
    ['umass-amherst', 9], ['uri', 4], ['quinnipiac', 6], ['bu', 3],
  ].flatMap(([schoolId, count]) => Array.from({ length: count as number }, (_, i) => ({ email: `student${i + 1}@${schoolId === 'umass-amherst' ? 'umass.edu' : schoolId === 'quinnipiac' ? 'quinnipiac.edu' : `${schoolId}.edu`}`, schoolId: schoolId as string, at: createdAt })));

  const orgs: Org[] = [...baseOrgs(), ...CAMPUS_ORGS.map(([kind, name]) => ({ id: orgId(name), schoolId: PILOT_SCHOOL_ID, kind, name }))];
  const known = new Set(orgs.map(o => o.id));
  const badges: StudentBadge[] = Object.entries(WEARS).flatMap(([studentId, names]) => names
    .map(name => (known.has(majorId(name)) ? majorId(name) : orgId(name)))
    .filter(id => known.has(id))
    .map(id => ({ studentId, orgId: id, at: createdAt })));
  const studentAwards: StudentAward[] = DEMO_AWARDS.map(([studentId, awardId]) => ({ studentId, awardId, awardedBy: null, at: createdAt }));

  return { ...emptyState(), students, follows, workouts, kudos, comments, groups, messages, meetups, waitlist, tags, photos, orgs, badges, studentAwards };
}
