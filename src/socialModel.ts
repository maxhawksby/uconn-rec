import { INTERESTS } from './onboarding/model';

export const PEOPLE = [
  { id: 'maya', name: 'Maya Chen', year: 'First year', interests: ['strength', 'pilates', 'yoga'], contact: true },
  { id: 'eli', name: 'Eli Brooks', year: 'First year', interests: ['strength', 'basketball', 'running'], contact: false },
  { id: 'noor', name: 'Noor Patel', year: 'Junior', interests: ['yoga', 'hiking', 'pilates'], contact: true },
  { id: 'sam', name: 'Sam Rivera', year: 'Sophomore', interests: ['swimming', 'cycling', 'pickleball'], contact: false },
  { id: 'avery', name: 'Avery Kim', year: 'Senior', interests: ['climbing', 'bouldering', 'hiking'], contact: false },
  { id: 'jules', name: 'Jules Carter', year: 'Graduate student', interests: ['dance', 'running', 'volleyball'], contact: false },
];
const families: Record<string, string[]> = {
  yoga: ['flow-yoga', 'gentle-yoga', 'power-yoga', 'yoga-sculpt', 'yogalates'],
  pilates: ['barre-pilates', 'power-pilates', 'human-reformer-pilates', 'yogalates'],
  strength: ['total-body-strength', 'upper-body-sculpt', 'row-strength', 'run-strength', 'spin-strength', 'core-conditioning', 'abc', '50-50'],
  hiit: ['deka-hyrox-training', 'hybrid-fitness-training', 'trx-foundations', 'trx-circuit', 'trx-small-group-training', 'turf-training', 'hiit-the-step'],
  cycling: ['spin', 'spin-core', 'spin-strength', 'learn-to-spin', 'pedal-pulse', 'mountain-biking', 'bikepacking'],
  dance: ['low-impact-dance-fit', 'dance-sculpt', 'dance-fit'],
  climbing: ['bouldering', 'top-rope-climbing', 'lead-climbing', 'rappelling'],
  swimming: ['learn-to-swim', 'swim-conditioning'],
  hiking: ['backpacking', 'mountaineering'],
  running: ['run-strength'],
};
export function affinityIds(interests: string[]) {
  const ids = new Set<string>();
  for (const id of new Set(interests)) {
    if (!INTERESTS.some(x => x.id === id)) continue;
    const related = Object.entries(families).filter(([, children]) => children.includes(id)).map(([parent]) => parent);
    if (related.length) related.forEach(parent => ids.add(parent)); else ids.add(id);
  }
  return [...ids];
}
export function suggestions(interests: string[], year: string, contacts = false) {
  const affinities = affinityIds(interests);
  return PEOPLE.map(person => {
    const shared = affinityIds(person.interests).filter(id => affinities.includes(id));
    return { ...person, shared, score: shared.length * 3 + (person.year === year ? 2 : 0) + (contacts && person.contact ? 4 : 0) };
  }).filter(p => p.shared.length || (contacts && p.contact)).sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
}
export type Group = { id: string; name: string; interest: string; cohort: string };
export function groupSuggestions(interests: string[], year: string): Group[] {
  return affinityIds(interests).flatMap(id => {
    const name = INTERESTS.find(x => x.id === id)!.name;
    const all = { id: `all:${id}`, name: `${name} crew`, interest: id, cohort: 'All years' };
    return year === 'First year' ? [{ id: `first:${id}`, name: `New students - ${name}`, interest: id, cohort: 'First year' }, all] : [all];
  });
}
export type Workout = { id: number; exercise: string; sets: number; volume: number; notes: string; entries?: { reps: number; weight: number }[] };
export function workoutSummary(workout: Workout) {
  return workout.sets ? `${workout.exercise} · ${workout.sets} sets · ${workout.volume.toLocaleString()} lb volume` : workout.exercise;
}
export type Message = { id: string; text: string; time: string; workout?: boolean };
export type Social = { connections: string[]; groups: Group[]; contacts: boolean; messages: Record<string, Message[]> };
export const emptySocial: Social = { connections: [], groups: [], contacts: false, messages: {} };
export function isSocial(value: unknown): value is Social {
  if (!value || typeof value !== 'object') return false;
  const d = value as Social;
  return Array.isArray(d.connections) && new Set(d.connections).size === d.connections.length && d.connections.every(id => PEOPLE.some(p => p.id === id))
    && Array.isArray(d.groups) && new Set(d.groups.map(g => g?.id)).size === d.groups.length && d.groups.every(g => g && typeof g.name === 'string' && g.name.length < 200 && ['First year', 'All years'].includes(g.cohort) && INTERESTS.some(x => x.id === g.interest) && g.id === `${g.cohort === 'First year' ? 'first' : 'all'}:${g.interest}`)
    && typeof d.contacts === 'boolean' && !!d.messages && typeof d.messages === 'object' && !Array.isArray(d.messages)
    && Object.entries(d.messages).every(([key, messages]) => /^(all|first|dm):[a-z0-9-]+$/.test(key) && Array.isArray(messages) && messages.every(m => m && typeof m.id === 'string' && typeof m.text === 'string' && m.text.length <= 500 && typeof m.time === 'string' && Number.isFinite(Date.parse(m.time)) && (m.workout === undefined || typeof m.workout === 'boolean')));
}
export function canMessage(data: Social, thread: string) {
  return thread.startsWith('dm:') ? data.connections.includes(thread.slice(3)) : data.groups.some(g => g.id === thread);
}
export function appendMessage(data: Social, thread: string, text: string, workout = false): Social {
  const trimmed = text.trim();
  if (!canMessage(data, thread) || !trimmed || trimmed.length > 500) return data;
  const message: Message = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, text: trimmed, time: new Date().toISOString(), workout };
  return { ...data, messages: { ...data.messages, [thread]: [...(data.messages[thread] || []), message] } };
}
