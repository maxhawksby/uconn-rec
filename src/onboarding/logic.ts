import type { AppState, ID, School, Student } from '../data/types';
import { SCHOOLS } from '../data/schools';
import { emailDomain, schoolForEmail, signupGate } from '../data/selectors';

// Pure onboarding logic: fuzzy school search and .edu email checks. No React, so
// scripts/test-model.cjs can exercise it directly.

// ---------- Fuzzy school search ----------

const norm = (s: string) => s.toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9.@ ]+/g, ' ').replace(/\s+/g, ' ').trim();
const STOP = new Set(['of', 'the', 'at', 'and', 'university', 'college', 'institute']);

/** "University of Massachusetts Amherst" -> "uma"; "Texas A&M" -> "tam". */
function acronym(name: string) {
  return norm(name).split(' ').filter(w => w && !['of', 'the', 'at', 'and'].includes(w)).map(w => w[0]).join('');
}

/** Damerau-style edit distance, capped: returns max+1 as soon as it can't be <= max. */
function editDistance(a: string, b: string, max: number) {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev2: number[] = [];
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, prev2[j - 2] + 1);
      cur.push(v);
      rowMin = Math.min(rowMin, v);
    }
    if (rowMin > max) return max + 1;
    prev2 = prev; prev = cur;
  }
  return prev[b.length];
}

/** Score one query token against one school. 0 = no match. */
function tokenScore(token: string, s: School): number {
  const short = norm(s.shortName);
  const shortCompact = short.replace(/ /g, '');
  const words = [...norm(s.name).split(' '), ...short.split(' ')].filter(Boolean);
  const place = [...norm(s.city).split(' '), norm(s.state)];
  let best = 0;
  const take = (n: number) => { if (n > best) best = n; };

  if (token === short || token === shortCompact) take(100);
  if (s.emailDomains.some(d => token === d || token.endsWith('.' + d) || token.endsWith('@' + d))) take(100);
  if (shortCompact.startsWith(token)) take(85);
  if (s.emailDomains.some(d => d.startsWith(token) || d.split('.')[0] === token)) take(75);
  if (token.length >= 2 && acronym(s.name) === token) take(70);
  if (words.some(w => w.startsWith(token))) take(STOP.has(token) ? 20 : 65);
  if (token.length >= 2 && place.some(w => w.startsWith(token))) take(45);
  if (token.length >= 3 && norm(s.name).includes(token)) take(35);
  // Typo tolerance: one slip for 4-6 letters, two for longer words.
  if (!best && token.length >= 4) {
    const max = token.length >= 7 ? 2 : 1;
    const targets = [...words, ...place, shortCompact].filter(w => w.length >= 3);
    // Compare with the whole word and with its same-length prefix, so half-typed words count.
    if (targets.some(w => editDistance(token, w, max) <= max || editDistance(token, w.slice(0, token.length), max) <= max)) take(25);
  }
  return best;
}

/**
 * Fuzzy search by name, short name, city, state or email domain (a full email works too).
 * Every word of the query must match something; better matches rank first, then the pilot.
 */
export function fuzzySearchSchools(query: string, schools: School[] = SCHOOLS, limit = 25): School[] {
  const q = norm(query);
  if (!q) return [...schools].sort((a, b) => Number(b.isPilot) - Number(a.isPilot) || a.name.localeCompare(b.name)).slice(0, limit);
  const fromEmail = q.includes('@') ? schoolForEmail(q, schools) : undefined;
  const tokens = q.includes('@') ? [q.slice(q.indexOf('@') + 1)] : q.split(' ').filter(t => !(STOP.has(t) && q.split(' ').length > 1));
  const scored: { s: School; score: number }[] = [];
  for (const s of schools) {
    if (fromEmail && s.id === fromEmail.id) { scored.push({ s, score: 1000 }); continue; }
    let total = 0;
    for (const t of tokens) {
      const sc = tokenScore(t, s);
      if (!sc) { total = 0; break; }
      total += sc;
    }
    if (total) scored.push({ s, score: total });
  }
  return scored
    .sort((a, b) => b.score - a.score || Number(b.s.isPilot) - Number(a.s.isPilot) || a.s.name.localeCompare(b.s.name))
    .slice(0, limit)
    .map(x => x.s);
}

// ---------- .edu email check ----------

export type EmailCheck =
  | { status: 'empty' | 'typing' | 'invalid' | 'not-edu' | 'unknown-edu' }
  | { status: 'ok'; school: School }
  | { status: 'other-school'; school: School }; // the domain belongs to a different listed school

/** Live feedback for the email field, given the school the student picked. */
export function checkSchoolEmail(email: string, schoolId: ID, schools: School[] = SCHOOLS): EmailCheck {
  const e = email.trim();
  if (!e) return { status: 'empty' };
  if (!e.includes('@')) return { status: 'typing' };
  const domain = emailDomain(e);
  if (!domain || !domain.includes('.') || domain.endsWith('.')) return { status: 'typing' };
  const gate = signupGate(e, schoolId);
  if (gate.ok) return { status: 'ok', school: gate.school };
  if (gate.reason === 'waitlist') return { status: 'ok', school: gate.school };
  if (gate.reason === 'invalid-email') return { status: 'invalid' };
  const other = schoolForEmail(e, schools);
  if (other) return { status: 'other-school', school: other };
  return domain.endsWith('.edu') ? { status: 'unknown-edu' } : { status: 'not-edu' };
}

/** Keeps only digits, at most six: what the code boxes accept. */
export function cleanCode(text: string) {
  return text.replace(/\D/g, '').slice(0, 6);
}

/** "482913" -> "482 913" for the on-screen demo code. */
export function formatCode(code: string) {
  return code.length === 6 ? `${code.slice(0, 3)} ${code.slice(3)}` : code;
}

// ---------- Suggestions before the account exists ----------

/**
 * Same-campus students ranked by shared interests, for the pre-account "people to follow" step.
 * suggestedStudents() in selectors needs a signed-in viewer, which doesn't exist yet here.
 */
export function suggestionsForNewStudent(state: AppState, schoolId: ID, interests: ID[], limit = 6): { student: Student; shared: ID[] }[] {
  return state.students
    .filter(s => s.schoolId === schoolId)
    .map(s => ({ student: s, shared: s.interests.filter(i => interests.includes(i)) }))
    .sort((a, b) => b.shared.length - a.shared.length || a.student.firstName.localeCompare(b.student.firstName))
    .slice(0, limit);
}
