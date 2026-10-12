// Loads the fictional demo campus (src/data/demo.ts) into the LOCAL Supabase so the real
// backend has a feed, groups and meetups to show. Every person is made up; each gets a
// login (firstname.lastname@uconn.edu) whose code arrives in the local test inbox.
// Run after `npm run db:reset`:  npm run db:seed
const fs = require('fs'); const path = require('path'); const ts = require('typescript'); const vm = require('vm');
const { spawnSync } = require('child_process');
const { createClient } = require('@supabase/supabase-js');
const { makeAdmin } = require('./make-admin.cjs');

// Max's real account gets admin and the Founder crown whenever it exists (it doesn't right
// after a reset: sign up in the app, then run `npm run make-admin -- <email> --founder`).
const FOUNDER_EMAIL = 'maxwell.hawksby@uconn.edu';

function load(file, cache = {}) {
  file = path.resolve(file); if (cache[file]) return cache[file];
  const sandbox = { exports: {}, Math, Date };
  cache[file] = sandbox.exports;
  sandbox.require = id => load(path.resolve(path.dirname(file), id + '.ts'), cache);
  const js = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(js, sandbox); return cache[file] = sandbox.exports;
}

async function main() {
  const status = spawnSync(path.join('node_modules', '.bin', 'supabase'), ['status', '-o', 'json'], { encoding: 'utf8' });
  let local; try { local = JSON.parse(status.stdout); } catch { throw new Error('Local Supabase is not running. Run `npm run db:start` first.'); }
  if (!/^http:\/\/127\.0\.0\.1:/.test(local.API_URL)) throw new Error(`Refusing to seed a non-local server: ${local.API_URL}`);
  const db = createClient(local.API_URL, local.SECRET_KEY, { auth: { persistSession: false } });
  const must = async (label, q) => { const { data, error } = await q; if (error) throw new Error(`${label}: ${error.message}`); return data; };

  const { count } = await db.from('students').select('*', { count: 'exact', head: true });
  if (count) { console.log(`Already seeded (${count} students). Run \`npm run db:reset\` to start over.`); return; }

  const demo = load('src/data/demo.ts').makeDemoState(new Date());
  const ids = new Map(); // demo id -> uuid
  const uuid = id => { if (!ids.has(id)) ids.set(id, crypto.randomUUID()); return ids.get(id); };

  for (const s of demo.students) {
    const { data, error } = await db.auth.admin.createUser({ email: s.email, email_confirm: true });
    if (error) throw new Error(`user ${s.email}: ${error.message}`);
    ids.set(s.id, data.user.id);
  }
  await must('students', db.from('students').insert(demo.students.map(s => ({
    id: uuid(s.id), school_id: s.schoolId, first_name: s.firstName, last_name: s.lastName, class_year: s.classYear,
    interests: s.interests, bio: s.bio ?? null, created_at: s.createdAt,
  }))));
  await must('follows', db.from('follows').insert(demo.follows.map(f => ({ follower_id: uuid(f.followerId), followee_id: uuid(f.followeeId), created_at: f.at }))));
  await must('groups', db.from('groups').insert(demo.groups.map(g => ({
    id: uuid(g.id), school_id: g.schoolId, name: g.name, kind: g.kind, description: g.description, created_by: uuid(g.createdBy), created_at: g.createdAt,
  }))));
  await must('group members', db.from('group_members').upsert(demo.groups.flatMap(g => g.memberIds.map(m => ({ group_id: uuid(g.id), student_id: uuid(m) }))), { ignoreDuplicates: true }));
  await must('messages', db.from('group_messages').insert(demo.messages.map(m => ({ id: uuid(m.id), group_id: uuid(m.groupId), student_id: uuid(m.studentId), body: m.body, created_at: m.at }))));
  await must('workouts', db.from('workouts').insert(demo.workouts.map(w => ({
    id: uuid(w.id), student_id: uuid(w.studentId), kind: w.kind, title: w.title, started_at: w.startedAt, duration_sec: w.durationSec,
    visibility: w.visibility, group_id: w.groupId ? uuid(w.groupId) : null, created_at: w.startedAt,
    exercises: w.kind === 'lift' ? w.exercises : null, distance_km: w.distanceKm ?? null, route: w.route ?? null,
    activity_id: w.activityId ?? null, result: w.result ?? null,
  }))));
  await must('tags', db.from('workout_tags').insert(demo.tags.map(t => ({ workout_id: uuid(t.workoutId), student_id: uuid(t.studentId), status: t.status, created_at: t.at }))));
  // Demo photos are bundled with the app (demo:<name>); upload each into private storage.
  for (const p of demo.photos) {
    const name = p.uri.replace(/^demo:/, '');
    const path = `${uuid(p.workoutId)}/${uuid(p.id)}.jpg`;
    const { error } = await db.storage.from('workout-photos').upload(path, fs.readFileSync(`assets/demo-photos/${name}.jpg`), { contentType: 'image/jpeg' });
    if (error) throw new Error(`photo ${name}: ${error.message}`);
    await must('photos', db.from('workout_photos').insert({ id: uuid(p.id), workout_id: uuid(p.workoutId), student_id: uuid(p.studentId), path, created_at: p.at }));
  }
  await must('kudos', db.from('kudos').insert(demo.kudos.map(k => ({ workout_id: uuid(k.workoutId), student_id: uuid(k.studentId), created_at: k.at }))));
  await must('comments', db.from('comments').insert(demo.comments.map(c => ({ id: uuid(c.id), workout_id: uuid(c.workoutId), student_id: uuid(c.studentId), body: c.body, created_at: c.at }))));
  await must('meetups', db.from('meetups').insert(demo.meetups.map(m => ({
    id: uuid(m.id), school_id: m.schoolId, host_id: uuid(m.hostId), activity_id: m.activityId, title: m.title, location: m.location,
    starts_at: m.startsAt, capacity: m.capacity, group_id: m.groupId ? uuid(m.groupId) : null, note: m.note ?? null, created_at: m.createdAt,
  }))));
  await must('attendees', db.from('meetup_attendees').upsert(demo.meetups.flatMap(m => m.attendeeIds.map(a => ({ meetup_id: uuid(m.id), student_id: uuid(a) }))), { ignoreDuplicates: true }));
  // Campus orgs and badges. Majors are already in the database (the majors migration).
  await must('orgs', db.from('orgs').insert(demo.orgs.filter(o => o.schoolId).map(o => ({ id: o.id, school_id: o.schoolId, kind: o.kind, name: o.name, created_at: demo.students[0].createdAt }))));
  await must('badges', db.from('student_badges').insert(demo.badges.map(b => ({ student_id: uuid(b.studentId), org_id: b.orgId, created_at: b.at }))));
  await must('awards', db.from('student_awards').insert(demo.studentAwards.map(g => ({ student_id: uuid(g.studentId), award_id: g.awardId, awarded_by: null, note: g.note ?? null, created_at: g.at }))));
  await must('waitlist', db.from('waitlist').insert(demo.waitlist.map(w => ({ email: w.email, school_id: w.schoolId, created_at: w.at }))));

  console.log(`Seeded ${demo.students.length} demo students, ${demo.workouts.length} workouts (${demo.tags.length} tags, ${demo.photos.length} photos), ${demo.groups.length} groups, ${demo.meetups.length} meetups.`);
  if (await makeAdmin(db, FOUNDER_EMAIL, { founder: true })) console.log(`${FOUNDER_EMAIL} is an admin with the Founder crown.`);
  console.log(`Sign in as any of them, e.g. ${demo.students[0].email}. Codes arrive at ${local.MAILPIT_URL}`);
}
main().catch(e => { console.error(e.message); process.exitCode = 1; });
