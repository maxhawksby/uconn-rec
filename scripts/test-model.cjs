// Pure model checks for selectors and actions. Run with `npm test`.
const fs = require('fs'); const path = require('path'); const ts = require('typescript'); const vm = require('vm'); const assert = require('node:assert/strict');
const cache = {};
function load(file) {
  file = path.resolve(file); if (cache[file]) return cache[file];
  const sandbox = { exports: {} };
  cache[file] = sandbox.exports;
  sandbox.require = id => load(path.resolve(path.dirname(file), id + '.ts'));
  const js = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(js, sandbox); return cache[file] = sandbox.exports;
}
const S = load('src/data/selectors.ts'); const A = load('src/data/actions.ts'); const D = load('src/data/demo.ts');
const schools = load('src/data/schools.ts'); const acts = load('src/data/activities.ts');
let count = 0; function check(name, fn) { fn(); count++; console.log('PASS', name); }

const NOW = new Date(2026, 9, 9, 18, 0); // Fri Oct 9 2026, 6pm local
let n = 0; const ctx = { now: NOW.toISOString(), id: () => `id${n++}` };
const day = (daysAgo, hour = 9) => new Date(2026, 9, 9 - daysAgo, hour).toISOString();
const w = (id, daysAgo, extra = {}) => ({ id, studentId: 'me', title: 'x', kind: 'class', activityId: 'yoga', durationSec: 1800, visibility: 'campus', startedAt: day(daysAgo), ...extra });
function signedIn(schoolId = 'uconn') {
  let s = D.makeDemoState(NOW);
  s = A.startSignup(s, { email: 'Test.Student@UConn.edu', schoolId }, ctx).state;
  s = A.verifyCode(s, s.pending.code).state;
  return A.completeProfile(s, { firstName: 'Test', lastName: 'Student', classYear: 'Junior', interests: ['lifting', 'lifting', 'running'] }, ctx).state;
}

check('School ids are unique, one pilot, every school has a .edu domain', () => {
  assert.equal(new Set(schools.SCHOOLS.map(s => s.id)).size, schools.SCHOOLS.length);
  assert.deepEqual([...schools.SCHOOLS.filter(s => s.isPilot).map(s => s.id)], ['uconn']);
  assert(schools.SCHOOLS.length >= 60 && schools.SCHOOLS.every(s => s.emailDomains.every(d => d.endsWith('.edu'))));
});
check('Activity ids are unique', () => assert.equal(new Set(acts.ACTIVITIES.map(a => a.id)).size, acts.ACTIVITIES.length));
check('Email maps to school, including subdomains, case-insensitive', () => {
  assert.equal(S.schoolForEmail('A@UCONN.EDU').id, 'uconn');
  assert.equal(S.schoolForEmail('a@grad.uconn.edu').id, 'uconn');
  assert.equal(S.schoolForEmail('a@notuconn.edu'), undefined);
  assert.equal(S.schoolForEmail('a@gmail.com'), undefined);
});
check('Sign-up gate: pilot opens, others waitlist, wrong domain rejected', () => {
  assert.equal(S.signupGate('a@uconn.edu', 'uconn').ok, true);
  assert.equal(S.signupGate('a@umass.edu', 'umass-amherst').reason, 'waitlist');
  assert.equal(S.signupGate('a@gmail.com', 'uconn').reason, 'domain-mismatch');
  assert.equal(S.signupGate('nope', 'uconn').reason, 'invalid-email');
  assert.throws(() => A.startSignup(D.emptyState(), { email: 'a@umass.edu', schoolId: 'umass-amherst' }, ctx), /waitlist/);
});
check('School search puts the pilot first and matches short names', () => {
  assert.equal(S.searchSchools('')[0].id, 'uconn');
  assert(S.searchSchools('umass').every(s => s.shortName.includes('UMass')));
});
check('Waitlist dedupes and reports position', () => {
  let s = D.emptyState();
  s = A.joinWaitlist(s, { email: 'a@uri.edu', schoolId: 'uri' }, ctx).state;
  s = A.joinWaitlist(s, { email: 'B@uri.edu', schoolId: 'uri' }, ctx).state;
  s = A.joinWaitlist(s, { email: 'a@uri.edu', schoolId: 'uri' }, ctx).state;
  assert.deepEqual({ ...S.waitlistStatus(s, 'uri', 'b@uri.edu') }, { count: 2, unlockAt: 50, position: 2 });
});
check('Wrong code is rejected; sign-up creates a normalized student', () => {
  let s = A.startSignup(D.emptyState(), { email: 'x@uconn.edu', schoolId: 'uconn' }, ctx).state;
  assert.throws(() => A.verifyCode(s, '000000x'), /match/);
  const me = S.me(signedIn());
  assert.equal(me.email, 'test.student@uconn.edu'); assert.deepEqual([...me.interests], ['lifting', 'running']);
});
check('Streak counts back from today, or from yesterday before tonight', () => {
  assert.equal(S.streakDays([w('a', 0), w('b', 1), w('c', 2), w('d', 4)], NOW), 3);
  assert.equal(S.streakDays([w('b', 1), w('c', 2)], NOW), 2);
  assert.equal(S.streakDays([w('c', 2)], NOW), 0);
  assert.equal(S.streakDays([w('a', 0), w('a2', 0)], NOW), 1);
});
check('Weekly totals start Monday and sum time, distance and lift volume', () => {
  const t = S.weeklyTotals([
    w('a', 0), w('b', 4), w('old', 5),
    w('r', 1, { kind: 'run', distanceKm: 5.25, durationSec: 1500 }),
    w('l', 2, { kind: 'lift', exercises: [{ name: 'Bench', sets: [{ reps: 5, weight: 100 }, { reps: 5, weight: 100 }] }], durationSec: 3600 }),
  ], NOW);
  assert.equal(t.sessions, 4); assert.equal(t.activeSec, 1800 * 2 + 1500 + 3600); assert.equal(t.distanceKm, 5.3); assert.equal(t.liftVolume, 1000);
  assert.equal(new Date(t.weekStart).getDay(), 1);
});
check('PRs keep the heaviest set per exercise, case-insensitive', () => {
  const prs = S.personalRecords([
    w('l1', 3, { kind: 'lift', exercises: [{ name: 'Bench press', sets: [{ reps: 5, weight: 185 }] }] }),
    w('l2', 1, { kind: 'lift', exercises: [{ name: 'bench press', sets: [{ reps: 3, weight: 195 }, { reps: 8, weight: 0 }] }] }),
  ]);
  assert.equal(prs.length, 1); assert.equal(prs[0].weight, 195); assert.equal(prs[0].workoutId, 'l2');
});
check('Feed is newest first, respects following vs campus and visibility', () => {
  let s = signedIn();
  const me = S.me(s);
  assert.equal(S.feed(s, me.id, 'following').length, 0);
  const campus = S.feed(s, me.id, 'campus');
  assert(campus.length > 10 && campus.every(i => i.workout.visibility === 'campus'));
  assert(campus.every((it, i) => i === 0 || campus[i - 1].workout.startedAt >= it.workout.startedAt));
  const target = s.workouts.find(x => x.visibility === 'friends');
  assert(!campus.some(i => i.workout.id === target.id));
  s = A.follow(s, target.studentId, ctx).state;
  assert(S.feed(s, me.id, 'following').some(i => i.workout.id === target.id));
});
check('Private notes never reach other students', () => {
  let s = signedIn();
  const { workoutId } = A.logWorkout(s, { kind: 'class', activityId: 'yoga', title: 'Yoga', durationSec: 600, startedAt: NOW.toISOString(), visibility: 'campus', note: 'secret' }, ctx).result;
  s = A.logWorkout(s, { kind: 'class', activityId: 'yoga', title: 'Yoga', durationSec: 600, startedAt: NOW.toISOString(), visibility: 'campus', note: 'secret' }, ctx).state;
  const mine = s.workouts[0];
  assert.equal(S.workoutById(s, mine.id, s.meId).workout.note, 'secret');
  assert.equal(S.workoutById(s, mine.id, 'jordan').workout.note, undefined);
  assert(workoutId);
});
check('Kudos toggle, no self-kudos; comments validate', () => {
  let s = signedIn();
  const other = s.workouts.find(x => x.studentId === 'jordan');
  const before = S.workoutById(s, other.id, s.meId).kudosCount;
  s = A.toggleKudos(s, other.id, ctx).state;
  assert.equal(S.workoutById(s, other.id, s.meId).kudosCount, before + 1);
  s = A.toggleKudos(s, other.id, ctx).state;
  assert.equal(S.workoutById(s, other.id, s.meId).kudosCount, before);
  assert.throws(() => A.addComment(s, { workoutId: other.id, body: '   ' }, ctx), /empty/);
  s = A.logWorkout(s, { kind: 'run', title: 'Run', distanceKm: 5, durationSec: 1500, startedAt: NOW.toISOString(), visibility: 'campus' }, ctx).state;
  assert.throws(() => A.toggleKudos(s, s.workouts[0].id, ctx), /yourself/);
});
check('Meetups: host attends, capacity enforced, hosts cannot leave', () => {
  let s = signedIn();
  const r = A.createMeetup(s, { activityId: 'basketball', title: 'Hoops', location: 'Court 1', startsAt: new Date(NOW.getTime() + 3600e3).toISOString(), capacity: 2 }, ctx);
  s = r.state; const m = S.meetupById(s, r.result.meetupId);
  assert.deepEqual([...m.attendeeIds], [s.meId]);
  assert.throws(() => A.leaveMeetup(s, m.id), /Hosts/);
  const asJordan = { ...s, meId: 'jordan' }; const joined = A.joinMeetup(asJordan, m.id).state;
  assert.throws(() => A.joinMeetup({ ...joined, meId: 'priya' }, m.id), /full/);
  assert.throws(() => A.createMeetup(s, { activityId: 'basketball', title: 'Past', location: 'x', startsAt: day(1), capacity: 4 }, ctx), /future/);
  assert(S.upcomingMeetups(s, 'uconn', NOW).length >= 6);
});
check('Group chat requires membership', () => {
  let s = signedIn();
  assert.throws(() => A.sendGroupMessage(s, { groupId: 'g-hoops', body: 'hi' }, ctx), /Join/);
  s = A.joinGroup(s, 'g-hoops').state;
  s = A.sendGroupMessage(s, { groupId: 'g-hoops', body: 'hi' }, ctx).state;
  assert.equal(S.groupMessages(s, 'g-hoops').at(-1).body, 'hi');
});
check('Demo data is fictional, at the pilot school, and has every workout kind', () => {
  const s = D.makeDemoState(NOW);
  assert(s.students.every(x => x.isDemo && x.schoolId === 'uconn'));
  for (const k of ['lift', 'run', 'ride', 'sport', 'class']) assert(s.workouts.some(x => x.kind === k), k);
  assert(s.workouts.every(x => new Date(x.startedAt) <= NOW));
});
// ---------- Onboarding logic (src/onboarding/logic.ts) ----------
const O = load('src/onboarding/logic.ts');
const top = (q, n = 1) => [...O.fuzzySearchSchools(q).slice(0, n).map(s => s.id)]; // copy out of the vm realm for deepEqual
check('School search: short name, full name, city, domain and email', () => {
  assert.deepEqual(top('UConn'), ['uconn']);
  assert.deepEqual(top('university of connecticut'), ['uconn']);
  assert.deepEqual(top('storrs'), ['uconn']);
  assert.deepEqual(top('uconn.edu'), ['uconn']);
  assert.deepEqual(top('jane@grad.uconn.edu'), ['uconn']);
  assert.deepEqual(top('tamu'), ['texas-am']);
  assert.deepEqual(top('texas a&m'), ['texas-am']);
  assert.deepEqual(top('umass amherst'), ['umass-amherst']);
});
check('School search: tolerates typos, ranks pilot first when empty, no junk matches', () => {
  assert.deepEqual(top('conecticut'), ['uconn']);
  assert(top('massachusets', 5).includes('umass-amherst'));
  assert.equal(O.fuzzySearchSchools('')[0].id, 'uconn');
  assert.equal(O.fuzzySearchSchools('xyzzy').length, 0);
  assert(O.fuzzySearchSchools('umass').every(s => s.shortName.startsWith('UMass')));
});
check('Email check: matches chosen school, detects another school, rejects personal email', () => {
  assert.equal(O.checkSchoolEmail('a@UConn.edu', 'uconn').status, 'ok');
  assert.equal(O.checkSchoolEmail('a@grad.uconn.edu', 'uconn').status, 'ok');
  const other = O.checkSchoolEmail('a@yale.edu', 'uconn');
  assert.equal(other.status, 'other-school'); assert.equal(other.school.id, 'yale');
  assert.equal(O.checkSchoolEmail('a@gmail.com', 'uconn').status, 'not-edu');
  assert.equal(O.checkSchoolEmail('a@nowhere.edu', 'uconn').status, 'unknown-edu');
  assert.equal(O.checkSchoolEmail('a@uconn', 'uconn').status, 'typing');
  assert.equal(O.checkSchoolEmail('', 'uconn').status, 'empty');
  assert.equal(O.checkSchoolEmail('a@umass.edu', 'umass-amherst').status, 'ok'); // waitlist school still verifies the domain
});
check('Code helpers and pre-account suggestions', () => {
  assert.equal(O.cleanCode('48 29-13x9'), '482913');
  assert.equal(O.formatCode('482913'), '482 913');
  const s = D.makeDemoState(NOW);
  const sug = O.suggestionsForNewStudent(s, 'uconn', ['basketball'], 4);
  assert.equal(sug.length, 4);
  assert(sug[0].shared.includes('basketball'));
  assert.equal(O.suggestionsForNewStudent(s, 'yale', ['basketball']).length, 0);
});
console.log(`${count} model checks passed.`);
