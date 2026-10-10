import type { AppState, FeedItem, Group, GroupKind, GroupMessage, ID, Meetup } from '../data/types';
import { dayKey, feed, groupMessages, groupsForSchool, upcomingMeetups } from '../data/selectors';

// Pure helpers for the Groups feature. They compose the shared selectors and never touch
// AppState fields directly, so they keep working when the store moves to Supabase.

export type KindInfo = { kind: GroupKind; label: string; icon: string; hint: string };

export const GROUP_KINDS: KindInfo[] = [
  { kind: 'crew', label: 'Crew', icon: 'flame-outline', hint: 'Friends who train together' },
  { kind: 'dorm', label: 'Dorm', icon: 'home-outline', hint: 'Your hall or building' },
  { kind: 'club', label: 'Club', icon: 'ribbon-outline', hint: 'A student organization' },
  { kind: 'team', label: 'Team', icon: 'shield-outline', hint: 'A club or intramural team' },
  { kind: 'major', label: 'Major', icon: 'school-outline', hint: 'Classmates in your program' },
];

export const KIND_INFO = Object.fromEntries(GROUP_KINDS.map(k => [k.kind, k])) as Record<GroupKind, KindInfo>;

export const NAME_MAX = 50;
export const DESCRIPTION_MAX = 200;

export function memberLabel(count: number) {
  return `${count} ${count === 1 ? 'member' : 'members'}`;
}

/** Kind filter plus a case-insensitive search over name and description. */
export function filterGroups(groups: Group[], kind: GroupKind | 'all', query: string): Group[] {
  const q = query.trim().toLowerCase();
  return groups.filter(g => (kind === 'all' || g.kind === kind) &&
    (!q || g.name.toLowerCase().includes(q) || g.description.toLowerCase().includes(q)));
}

/** Campus groups split into the viewer's groups (most recent chat first) and the rest. */
export function splitCampusGroups(state: AppState, schoolId: ID, viewerId: ID) {
  const all = groupsForSchool(state, schoolId);
  const latest = (g: Group) => lastMessage(state, g.id)?.at ?? g.createdAt;
  const mine = all.filter(g => g.memberIds.includes(viewerId)).sort((a, b) => latest(b).localeCompare(latest(a)));
  const discover = all.filter(g => !g.memberIds.includes(viewerId));
  return { mine, discover };
}

export function lastMessage(state: AppState, groupId: ID): GroupMessage | undefined {
  const all = groupMessages(state, groupId);
  return all[all.length - 1];
}

/** Recent workouts shared into the group that the viewer may see, plus its upcoming meetups. */
export function groupActivity(state: AppState, group: Group, viewerId: ID, now: Date = new Date()): { workouts: FeedItem[]; meetups: Meetup[] } {
  return {
    workouts: feed(state, viewerId, 'campus').filter(i => i.workout.groupId === group.id).slice(0, 20),
    meetups: upcomingMeetups(state, group.schoolId, now).filter(m => m.groupId === group.id),
  };
}

export type GroupFormErrors = Partial<Record<'name' | 'description', string>>;

/** Client-side checks that mirror actions.createGroup, so errors show inline before submit. */
export function validateGroup(input: { name: string; description: string }, existingNames: string[]): GroupFormErrors {
  const errors: GroupFormErrors = {};
  const name = input.name.trim();
  if (!name) errors.name = 'Give your group a name.';
  else if (name.length < 3) errors.name = 'Use at least 3 characters.';
  else if (name.length > NAME_MAX) errors.name = `Keep it to ${NAME_MAX} characters.`;
  else if (existingNames.some(n => n.toLowerCase() === name.toLowerCase())) errors.name = 'A group with that name already exists on your campus.';
  if (input.description.trim().length > DESCRIPTION_MAX) errors.description = `Keep it to ${DESCRIPTION_MAX} characters.`;
  return errors;
}

// ---------- Chat ----------

export type ChatRow =
  | { type: 'day'; key: string; label: string }
  | { type: 'message'; key: string; message: GroupMessage; mine: boolean; firstInRun: boolean; lastInRun: boolean };

const RUN_GAP_MS = 5 * 60 * 1000;

/** "Today", "Yesterday", weekday within a week, else "Oct 3". */
export function dayLabel(iso: string, now: Date = new Date()) {
  const key = dayKey(iso);
  if (key === dayKey(now)) return 'Today';
  const y = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  if (key === dayKey(y)) return 'Yesterday';
  const d = new Date(iso);
  const days = (now.getTime() - d.getTime()) / 86400000;
  return d.toLocaleDateString(undefined, days < 7 ? { weekday: 'long' } : { month: 'short', day: 'numeric' });
}

/**
 * Flattens messages into rows with day separators. Consecutive messages from one person
 * within five minutes form a run: the name shows on the first, avatar and time on the last.
 */
export function chatRows(messages: GroupMessage[], meId: ID, now: Date = new Date()): ChatRow[] {
  const rows: ChatRow[] = [];
  messages.forEach((m, i) => {
    const prev = messages[i - 1];
    const next = messages[i + 1];
    const newDay = !prev || dayKey(prev.at) !== dayKey(m.at);
    if (newDay) rows.push({ type: 'day', key: `day-${dayKey(m.at)}`, label: dayLabel(m.at, now) });
    const joins = (a?: GroupMessage, b?: GroupMessage) => !!a && !!b && a.studentId === b.studentId &&
      dayKey(a.at) === dayKey(b.at) && Math.abs(new Date(b.at).getTime() - new Date(a.at).getTime()) <= RUN_GAP_MS;
    rows.push({ type: 'message', key: m.id, message: m, mine: m.studentId === meId, firstInRun: !joins(prev, m), lastInRun: !joins(m, next) });
  });
  return rows;
}

export function clockTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}
