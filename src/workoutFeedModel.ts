import { PEOPLE, Workout } from './socialModel';

export type FeedWorkout = {
  id: string; authorId: string; title: string; caption: string; time: string;
  visibility: 'public' | 'private'; kind: 'strength' | 'track' | 'studio' | 'aquatics';
  metrics: { label: string; value: string }[]; likes: number;
};
export type FeedComment = { id: string; workoutId: string; authorId: string; text: string; time: string };
export type FeedData = { shares: FeedWorkout[]; liked: string[]; comments: FeedComment[]; read: string[] };
export const emptyFeed: FeedData = { shares: [], liked: [], comments: [], read: [] };

// Fictional public activities, deliberately labeled as sample data in the UI.
export const SAMPLE_WORKOUTS: FeedWorkout[] = [
  { id: 'sample-maya-lift', authorId: 'maya', title: 'A little stronger before class', caption: 'Upper body done. Showing up is starting to feel like a habit.', time: '2026-09-17T11:40:00Z', visibility: 'public', kind: 'strength', metrics: [{ label: 'Sets', value: '12' }, { label: 'Volume · lb', value: '8,640' }, { label: 'Time · min', value: '45' }], likes: 12 },
  { id: 'sample-eli-lift', authorId: 'eli', title: 'Found my squat rhythm', caption: 'Kept it steady today. Anyone lifting after class tomorrow?', time: '2026-09-16T20:30:00Z', visibility: 'public', kind: 'strength', metrics: [{ label: 'Sets', value: '5' }, { label: 'Volume · lb', value: '4,625' }, { label: 'Time · min', value: '38' }], likes: 8 },
  { id: 'sample-noor-flow', authorId: 'noor', title: 'A breath between lectures', caption: 'A yoga break was exactly what this week needed.', time: '2026-09-16T16:50:00Z', visibility: 'public', kind: 'studio', metrics: [{ label: 'Time · min', value: '45' }, { label: 'Activity', value: 'Yoga' }], likes: 6 },
  { id: 'sample-sam-swim', authorId: 'sam', title: 'Just me and the next lap', caption: 'An easy swim and a clear head. Glad I made time for this.', time: '2026-09-15T22:15:00Z', visibility: 'public', kind: 'aquatics', metrics: [{ label: 'Distance · yd', value: '1,000' }, { label: 'Time · min', value: '30' }], likes: 9 },
];
const SAMPLE_COMMENTS: FeedComment[] = [
  { id: 'sample-cheer', workoutId: 'sample-maya-lift', authorId: 'eli', text: 'Morning crew! Nice work getting it in.', time: '2026-09-17T12:15:00Z' },
];
export function allWorkouts(data: FeedData) { return [...data.shares, ...SAMPLE_WORKOUTS].sort((a, b) => Date.parse(b.time) - Date.parse(a.time)); }
export function visibleWorkouts(data: FeedData, connections: string[], scope: 'Friends' | 'Campus') {
  return allWorkouts(data).filter(w => w.visibility === 'public' && (scope === 'Campus' || w.authorId === 'you' || connections.includes(w.authorId)));
}
export function publicWorkout(data: FeedData, id: string) { return allWorkouts(data).find(w => w.id === id && w.visibility === 'public'); }
export function commentsFor(data: FeedData, id: string) {
  return publicWorkout(data, id) ? [...SAMPLE_COMMENTS, ...data.comments].filter(c => c.workoutId === id) : [];
}
export function toggleLike(data: FeedData, id: string): FeedData {
  if (!publicWorkout(data, id)) return data;
  return { ...data, liked: data.liked.includes(id) ? data.liked.filter(x => x !== id) : [...data.liked, id] };
}
export function addComment(data: FeedData, id: string, text: string): FeedData {
  const trimmed = text.trim();
  if (!publicWorkout(data, id) || !trimmed || trimmed.length > 500) return data;
  return { ...data, comments: [...data.comments, { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, workoutId: id, authorId: 'you', text: trimmed, time: new Date().toISOString() }] };
}
export function removeComment(data: FeedData, id: string): FeedData {
  return { ...data, comments: data.comments.filter(c => c.id !== id || c.authorId !== 'you') };
}
export function publishWorkout(data: FeedData, workout: Workout, caption = ''): FeedData {
  if (caption.trim().length > 500) return data;
  const id = `own-${workout.id}`;
  const metrics = workout.sets ? [{ label: 'Sets', value: String(workout.sets) }, { label: 'Volume · lb', value: workout.volume.toLocaleString() }] : [{ label: 'Activity', value: 'Movement' }];
  if (workout.sets && workout.entries?.length) metrics.push({ label: 'Reps', value: String(workout.entries.reduce((sum, entry) => sum + entry.reps, 0)) });
  // Explicit projection: never spread a private Workout into a public record.
  const shared: FeedWorkout = { id, authorId: 'you', title: workout.exercise, caption: caption.trim(), time: new Date().toISOString(), visibility: 'public', kind: workout.sets ? 'strength' : 'track', metrics, likes: 0 };
  return { ...data, shares: [shared, ...data.shares.filter(w => w.id !== id)] };
}
export function makePrivate(data: FeedData, id: string): FeedData {
  return { ...data, shares: data.shares.map(w => w.id === id && w.authorId === 'you' ? { ...w, visibility: 'private' } : w) };
}
export function friendUpdates(data: FeedData, connections: string[]) {
  return visibleWorkouts(data, connections, 'Friends').filter(w => w.authorId !== 'you');
}
const text = (v: unknown, limit: number): v is string => typeof v === 'string' && v.trim().length > 0 && v.length <= limit;
const timestamp = (v: unknown) => typeof v === 'string' && Number.isFinite(Date.parse(v));
function isWorkout(v: unknown): v is FeedWorkout {
  if (!v || typeof v !== 'object') return false;
  const w = v as FeedWorkout;
  return text(w.id, 100) && /^own-\d+$/.test(w.id) && w.authorId === 'you' && text(w.title, 200) && typeof w.caption === 'string' && w.caption.length <= 500 && timestamp(w.time)
    && ['public', 'private'].includes(w.visibility) && ['strength', 'track', 'studio', 'aquatics'].includes(w.kind)
    && w.likes === 0 && !Object.hasOwn(w, 'notes') && Array.isArray(w.metrics) && w.metrics.length > 0 && w.metrics.length <= 3 && w.metrics.every(m => m && text(m.label, 40) && text(m.value, 40));
}
export function isFeedData(v: unknown): v is FeedData {
  if (!v || typeof v !== 'object') return false;
  const d = v as FeedData;
  if (!Array.isArray(d.shares) || !d.shares.every(isWorkout) || new Set(d.shares.map(w => w.id)).size !== d.shares.length) return false;
  const ids = new Set([...d.shares, ...SAMPLE_WORKOUTS].map(w => w.id));
  const idList = (a: unknown): a is string[] => Array.isArray(a) && new Set(a).size === a.length && a.every(id => typeof id === 'string' && ids.has(id));
  return idList(d.liked) && idList(d.read) && Array.isArray(d.comments) && new Set(d.comments.map(c => c?.id)).size === d.comments.length
    && d.comments.every(c => c && text(c.id, 100) && ids.has(c.workoutId) && c.authorId === 'you' && text(c.text, 500) && timestamp(c.time));
}
export function authorName(id: string) { return id === 'you' ? 'You' : PEOPLE.find(p => p.id === id)?.name || 'Rec member'; }
