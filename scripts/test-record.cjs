// Pure checks for the Record feature: GPS distance and pace math, lift drafts and PR detection.
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
const M = load('src/record/math.ts'); const L = load('src/record/lift.ts'); const X = load('src/record/exercises.ts');
let count = 0; function check(name, fn) { fn(); count++; console.log('PASS', name); }
const plain = x => JSON.parse(JSON.stringify(x)); // values from the vm sandbox have foreign prototypes
const near = (a, b, tol, msg) => assert(Math.abs(a - b) <= tol, `${msg ?? ''} expected ${b} +/- ${tol}, got ${a}`);

// ---------- Distance and pace ----------

check('Haversine: one degree of latitude is about 111.2 km; same point is 0', () => {
  near(M.haversineMeters({ lat: 41, lng: -72 }, { lat: 42, lng: -72 }), 111195, 50);
  assert.equal(M.haversineMeters({ lat: 41.8, lng: -72.25 }, { lat: 41.8, lng: -72.25 }), 0);
});
check('Route distance sums segments and ignores the gap across a pause', () => {
  const p = (lat, t) => ({ lat, lng: -72.25, t });
  const step = 0.001; // ~111 m of latitude
  const a = [p(41.8, 0), p(41.8 + step, 30000), p(41.8 + 2 * step, 60000)];
  const b = [p(41.9, 120000), p(41.9 + step, 150000)]; // resumed ~11 km away: gap must not count
  near(M.routeDistanceKm([a]), 0.2224, 0.001);
  near(M.routeDistanceKm([a, b]), 0.3336, 0.001);
  assert.equal(M.routeDistanceKm([]), 0);
});
check('GPS filter drops imprecise fixes, jitter, duplicates and teleports', () => {
  const prev = { lat: 41.8, lng: -72.25, t: 0 };
  assert.equal(M.acceptFix(undefined, { ...prev, accuracy: 10 }, 'run'), true);
  assert.equal(M.acceptFix(undefined, { ...prev, accuracy: 80 }, 'run'), false);
  assert.equal(M.acceptFix(prev, { lat: 41.80001, lng: -72.25, t: 5000 }, 'run'), false, 'jitter ~1 m');
  assert.equal(M.acceptFix(prev, { lat: 41.8001, lng: -72.25, t: 0 }, 'run'), false, 'no time passed');
  assert.equal(M.acceptFix(prev, { lat: 41.8001, lng: -72.25, t: 5000 }, 'run'), true, '~11 m in 5 s');
  assert.equal(M.acceptFix(prev, { lat: 41.801, lng: -72.25, t: 5000 }, 'run'), false, '~111 m in 5 s is not a run');
  assert.equal(M.acceptFix(prev, { lat: 41.801, lng: -72.25, t: 5000 }, 'ride'), true, '~22 m/s is a fast ride');
});
check('Pace: 5 km in 25:00 is 5:00/km and 8:03/mi; no distance gives --', () => {
  assert.equal(M.paceSecPerKm(1500, 5), 300);
  assert.equal(M.paceClockPerMile(300), '8:03');
  assert.equal(M.paceSecPerKm(1500, 0), null);
  assert.equal(M.paceClockPerMile(null), '--');
  assert.equal(M.paceClockPerMile(4000), '--', 'slower than 100 min/mi reads as no pace');
});
check('Miles conversions and text', () => {
  near(M.milesToKm(1), 1.609344, 1e-9);
  assert.equal(M.milesText(5), '3.11');
  near(M.kmToMiles(M.milesToKm(3.1)), 3.1, 1e-9);
});
check('Clock formatting and decimal parsing', () => {
  assert.equal(M.formatClock(0), '0:00');
  assert.equal(M.formatClock(65), '1:05');
  assert.equal(M.formatClock(3725), '1:02:05');
  assert.equal(M.parseDecimal('3.1'), 3.1);
  assert.equal(M.parseDecimal('3,5'), 3.5);
  assert.equal(M.parseDecimal('.5'), 0.5);
  assert(Number.isNaN(M.parseDecimal('abc')));
  assert(Number.isNaN(M.parseDecimal('')));
});
check('Titles follow the time of day and the activity', () => {
  assert.equal(M.suggestTitle('lift', new Date(2026, 9, 9, 7)), 'Morning Lift');
  assert.equal(M.suggestTitle('run', new Date(2026, 9, 9, 13)), 'Afternoon Run');
  assert.equal(M.suggestTitle('sport', new Date(2026, 9, 9, 19), 'Basketball'), 'Evening Basketball');
  assert.equal(M.suggestTitle('other', new Date(2026, 9, 9, 19), 'Something else'), 'Evening Workout');
  assert.equal(M.suggestTitle('class', new Date(2026, 9, 9, 23), 'Yoga'), 'Night Yoga');
});

// ---------- Lifts ----------

const lift = (id, day, exercises) => ({ id, studentId: 'me', title: 'x', kind: 'lift', durationSec: 3600, visibility: 'friends', startedAt: new Date(2026, 9, day, 9).toISOString(), exercises });
const history = [
  lift('w1', 1, [{ name: 'Bench press', sets: [{ reps: 5, weight: 185 }, { reps: 5, weight: 185 }] }, { name: 'Pull-up', sets: [{ reps: 10, weight: 0 }] }]),
  lift('w2', 5, [{ name: 'bench press', sets: [{ reps: 3, weight: 195 }] }, { name: 'Back squat', sets: [{ reps: 5, weight: 245 }] }]),
];

check('Previous sets come from the latest session of that exercise, case-insensitive', () => {
  assert.deepEqual(L.previousSets(history, 'Bench Press').map(s => ({ ...s })), [{ reps: 3, weight: 195 }]);
  assert.deepEqual(L.previousSets(history, 'Pull-up').map(s => ({ ...s })), [{ reps: 10, weight: 0 }]);
  assert.deepEqual([...L.previousSets(history, 'Deadlift')], []);
});
check('Rows parse: blank weight is bodyweight, bad reps are skipped, empty exercises dropped', () => {
  const row = (weight, reps) => ({ id: 'r', weight, reps, done: false });
  assert.deepEqual({ ...L.parseRow(row('182.5', '5')) }, { reps: 5, weight: 182.5 });
  assert.deepEqual({ ...L.parseRow(row('', '12')) }, { reps: 12, weight: 0 });
  assert.equal(L.parseRow(row('135', '')), null);
  assert.equal(L.parseRow(row('135', '2.5')), null);
  assert.equal(L.rowIsValid(row('', '')), true);
  assert.equal(L.rowIsValid(row('abc', '5')), false);
  assert.equal(L.rowIsValid(row('2500', '5')), false);
  const ex = L.toExercises([
    { id: 'a', name: ' Bench press ', previous: [], rows: [row('135', '10'), row('', ''), row('155', '8')] },
    { id: 'b', name: 'Curl', previous: [], rows: [row('', '')] },
  ]);
  assert.equal(ex.length, 1);
  assert.equal(ex[0].name, 'Bench press');
  assert.equal(L.volume(ex), 135 * 10 + 155 * 8);
  assert.equal(L.setCount(ex), 2);
});
check('PRs: heavier, or same weight for more reps; first-ever and bodyweight are not PRs', () => {
  const today = [
    { name: 'Bench press', sets: [{ reps: 5, weight: 185 }, { reps: 2, weight: 200 }] }, // beats 195x3
    { name: 'Back squat', sets: [{ reps: 6, weight: 245 }] }, // same weight, more reps
    { name: 'Pull-up', sets: [{ reps: 15, weight: 0 }] }, // bodyweight
    { name: 'Deadlift', sets: [{ reps: 3, weight: 315 }] }, // first time
  ];
  const hits = plain(L.detectPRs(history, today));
  assert.deepEqual(hits, [
    { exercise: 'Bench press', weight: 200, reps: 2, previous: { weight: 195, reps: 3 } },
    { exercise: 'Back squat', weight: 245, reps: 6, previous: { weight: 245, reps: 5 } },
  ]);
  assert.equal(L.detectPRs(history, [{ name: 'Bench press', sets: [{ reps: 3, weight: 195 }] }]).length, 0, 'matching a PR is not a PR');
});
check('Ghost values come from last session, then the filled row above', () => {
  const d = { id: 'a', name: 'Bench press', previous: [{ reps: 5, weight: 185 }], rows: [{ id: '1', weight: '', reps: '', done: false }, { id: '2', weight: '', reps: '', done: false }] };
  assert.deepEqual({ ...L.ghostSet(d, 1) }, { reps: 5, weight: 185 });
  const fresh = { ...d, previous: [], rows: [{ id: '1', weight: '95', reps: '12', done: true }, { id: '2', weight: '', reps: '', done: false }] };
  assert.deepEqual({ ...L.ghostSet(fresh, 1) }, { reps: 12, weight: 95 });
  assert.equal(L.ghostSet({ ...fresh, rows: [fresh.rows[1]] }, 0), null);
});
check('Exercise catalog: unique names, word-start search, custom names included', () => {
  assert.equal(new Set(X.EXERCISES.map(e => X.exerciseKey(e.name))).size, X.EXERCISES.length);
  assert(X.searchExercises('inc dumb').some(e => e.name === 'Incline dumbbell press'));
  assert(X.searchExercises('legs').every(e => e.group === 'Legs'));
  assert(X.searchExercises('zercher', ['Zercher squat']).some(e => e.name === 'Zercher squat'));
  assert.equal(X.searchExercises('', ['Bench press']).length, X.EXERCISES.length, 'catalog names are not duplicated');
});

console.log(`${count} record checks passed.`);
