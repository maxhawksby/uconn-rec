// Makes a student a Valence admin (they can give awards in the app), and with --founder also
// gives them the Founder crown. Admins are only ever set here, never from the app.
//   npm run make-admin -- someone@uconn.edu [--founder]
// Uses the local Supabase unless SUPABASE_URL and SUPABASE_SECRET_KEY are set.
const path = require('path');
const { spawnSync } = require('child_process');
const { createClient } = require('@supabase/supabase-js');

function client() {
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SECRET_KEY) return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
  const status = spawnSync(path.join('node_modules', '.bin', 'supabase'), ['status', '-o', 'json'], { encoding: 'utf8' });
  let local; try { local = JSON.parse(status.stdout); } catch { throw new Error('Local Supabase is not running. Run `npm run db:start` first.'); }
  return createClient(local.API_URL, local.SECRET_KEY, { auth: { persistSession: false } });
}

/** Returns false when the email has no finished profile yet. */
async function makeAdmin(db, email, { founder = false } = {}) {
  email = email.trim().toLowerCase();
  let user;
  for (let page = 1; !user; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(`users: ${error.message}`);
    user = data.users.find(u => u.email?.toLowerCase() === email);
    if (data.users.length < 1000) break;
  }
  if (!user) return false;
  const { data: student } = await db.from('students').select('id').eq('id', user.id).maybeSingle();
  if (!student) return false;
  const must = async (label, q) => { const { error } = await q; if (error) throw new Error(`${label}: ${error.message}`); };
  await must('admin', db.from('admins').upsert({ student_id: user.id }, { ignoreDuplicates: true }));
  if (founder) await must('founder award', db.from('student_awards').upsert({ student_id: user.id, award_id: 'founder' }, { ignoreDuplicates: true }));
  return true;
}

module.exports = { makeAdmin };

if (require.main === module) {
  const [email] = process.argv.slice(2).filter(a => !a.startsWith('--'));
  const founder = process.argv.includes('--founder');
  if (!email) { console.error('Usage: npm run make-admin -- someone@school.edu [--founder]'); process.exit(1); }
  makeAdmin(client(), email, { founder }).then(ok => {
    if (!ok) { console.error(`${email} has no Valence profile yet. Sign up in the app first, then run this again.`); process.exitCode = 1; return; }
    console.log(`${email} is now an admin${founder ? ' with the Founder crown' : ''}.`);
  }).catch(e => { console.error(e.message); process.exitCode = 1; });
}
