import type { ID, Meetup } from '../data/types';
import { ACTIVITY_BY_ID } from '../data/activities';
import type { ActivityCategory } from '../data/activities';

// Pure meetup helpers for the Meetups screens: day grouping, spots, status, filters,
// title suggestions and the day + time picker. No React, so `npm test` can cover them.

const HOUR = 60 * 60 * 1000;
/** Matches upcomingMeetups(): a meetup counts as running for 2h after it starts. */
export const MEETUP_GRACE_MS = 2 * HOUR;

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Whole calendar days from `now`'s day to `date`'s day (DST-safe). */
export function daysFromToday(date: Date, now: Date) {
  return Math.round((startOfDay(date).getTime() - startOfDay(now).getTime()) / (24 * HOUR));
}

// ---------- Day grouping ----------

export type DayBucket = 'today' | 'tomorrow' | 'week' | 'later';
export const BUCKET_LABEL: Record<DayBucket, string> = { today: 'Today', tomorrow: 'Tomorrow', week: 'This week', later: 'Later' };
const BUCKET_ORDER: DayBucket[] = ['today', 'tomorrow', 'week', 'later'];

/** Today, tomorrow, the rest of the next 7 days, or later. Anything earlier counts as today. */
export function dayBucket(startsAt: string, now: Date): DayBucket {
  const days = daysFromToday(new Date(startsAt), now);
  if (days <= 0) return 'today';
  if (days === 1) return 'tomorrow';
  if (days < 7) return 'week';
  return 'later';
}

export type MeetupSection = { key: DayBucket; title: string; data: Meetup[] };

/** Non-empty sections in day order, each sorted soonest first. */
export function groupMeetupsByDay(meetups: Meetup[], now: Date): MeetupSection[] {
  const sorted = [...meetups].sort((a, b) => a.startsAt.localeCompare(b.startsAt) || a.id.localeCompare(b.id));
  return BUCKET_ORDER
    .map(key => ({ key, title: BUCKET_LABEL[key], data: sorted.filter(m => dayBucket(m.startsAt, now) === key) }))
    .filter(s => s.data.length > 0);
}

// ---------- Spots and status ----------

export type Spots = { going: number; capacity: number; left: number; full: boolean; label: string };

/** "Need 4 more", "Need 1 more" or "Full". Never negative, even with bad data. */
export function spotsInfo(m: Pick<Meetup, 'capacity' | 'attendeeIds'>): Spots {
  const going = m.attendeeIds.length;
  const left = Math.max(0, m.capacity - going);
  return { going, capacity: m.capacity, left, full: left === 0, label: left === 0 ? 'Full' : `Need ${left} more` };
}

export type MeetupStatus = 'upcoming' | 'live' | 'ended';

export function meetupStatus(m: Pick<Meetup, 'startsAt'>, now: Date): MeetupStatus {
  const start = new Date(m.startsAt).getTime();
  if (now.getTime() < start) return 'upcoming';
  return now.getTime() < start + MEETUP_GRACE_MS ? 'live' : 'ended';
}

export type MeetupRole = 'host' | 'going' | 'open' | 'full' | 'ended';

/** What the viewer can do with a meetup, which drives the join button. */
export function meetupRole(m: Meetup, meId: ID, now: Date): MeetupRole {
  if (meetupStatus(m, now) === 'ended') return 'ended';
  if (m.hostId === meId) return 'host';
  if (m.attendeeIds.includes(meId)) return 'going';
  return spotsInfo(m).full ? 'full' : 'open';
}

// ---------- Filters ----------

export type MeetupFilter = 'all' | 'going' | ActivityCategory;

export const FILTER_LABEL: Record<MeetupFilter, string> = {
  all: 'All', going: 'Going', pickup: 'Pickup', strength: 'Lifting', endurance: 'Runs & rides',
  classes: 'Classes', club: 'Club', outdoors: 'Outdoors',
};
export const FILTERS: MeetupFilter[] = ['all', 'going', 'pickup', 'strength', 'endurance', 'classes', 'club', 'outdoors'];

export function filterMeetups(meetups: Meetup[], filter: MeetupFilter, meId: ID): Meetup[] {
  if (filter === 'all') return meetups;
  if (filter === 'going') return meetups.filter(m => m.attendeeIds.includes(meId));
  return meetups.filter(m => ACTIVITY_BY_ID[m.activityId]?.category === filter);
}

// ---------- Formatting ----------

/** "7:00 PM", split so the numerals and the meridiem can be styled apart. */
export function timeParts(iso: string | Date): { time: string; meridiem: 'AM' | 'PM' } {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  const h = d.getHours();
  return { time: `${h % 12 || 12}:${String(d.getMinutes()).padStart(2, '0')}`, meridiem: h < 12 ? 'AM' : 'PM' };
}

export function formatTime(iso: string | Date) {
  const { time, meridiem } = timeParts(iso);
  return `${time} ${meridiem}`;
}

/** "Fri, Oct 9". */
export function formatDate(iso: string | Date) {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  return `${WEEKDAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

/** "Today", "Tomorrow" or "Fri, Oct 9". */
export function formatDay(iso: string | Date, now: Date) {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  const days = daysFromToday(d, now);
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days === -1) return 'Yesterday';
  return formatDate(d);
}

/** Day tag for a card's time tile: none for today/tomorrow (the section says it), "Sun" this week, "Oct 17" later. */
export function cardDayLabel(iso: string, now: Date) {
  const bucket = dayBucket(iso, now);
  if (bucket === 'today' || bucket === 'tomorrow') return '';
  const d = new Date(iso);
  return bucket === 'week' ? WEEKDAYS[d.getDay()] : `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

/** Short relative line for cards: "in 45 min", "in 3 hr", "Started 20 min ago", "Ended". */
export function startsInLabel(m: Pick<Meetup, 'startsAt'>, now: Date) {
  const diffMin = Math.round((new Date(m.startsAt).getTime() - now.getTime()) / 60000);
  const status = meetupStatus(m, now);
  if (status === 'ended') return 'Ended';
  if (status === 'live') return diffMin === 0 ? 'Starting now' : `Started ${-diffMin} min ago`;
  if (diffMin < 60) return `in ${Math.max(1, diffMin)} min`;
  if (diffMin < 24 * 60) return `in ${Math.round(diffMin / 60)} hr`;
  return '';
}

// ---------- Title suggestion ----------

function timeOfDay(d: Date) {
  const h = d.getHours();
  if (h < 5) return 'Late-night';
  if (h < 12) return 'Morning';
  if (h < 17) return 'Afternoon';
  if (h < 21) return 'Evening';
  return 'Late-night';
}

const NOUN_BY_ACTIVITY: Record<string, string> = {
  running: 'run', 'trail-running': 'trail run', walking: 'walk', cycling: 'ride', swimming: 'swim',
  rowing: 'erg session', stairs: 'stair session', hiking: 'hike', climbing: 'climb', other: 'meetup',
};

/** e.g. "Evening pickup basketball", "Morning run", "Afternoon yoga session". */
export function suggestTitle(activityId: ID, startsAt: Date) {
  const a = ACTIVITY_BY_ID[activityId];
  const base = (a?.name ?? 'Meetup').split(/ \/ | \(/)[0].trim().toLowerCase();
  let noun = NOUN_BY_ACTIVITY[activityId];
  if (!noun && a) {
    if (a.category === 'pickup') noun = activityId === 'intramurals' ? 'intramurals practice' : `pickup ${base}`;
    else if (a.category === 'club') noun = `${base} practice`;
    else if (a.category === 'strength' || a.category === 'classes') noun = `${base} session`;
    else noun = base;
  }
  return `${timeOfDay(startsAt)} ${noun ?? 'meetup'}`;
}

// ---------- Day + time picker ----------

export const SLOT_MINUTES = 30;
export const FIRST_SLOT = 6 * 60; // 6:00 AM
export const LAST_SLOT = 23 * 60 + 30; // 11:30 PM
/** A slot today must start at least this far ahead so people can see it in time. */
export const MIN_LEAD_MIN = 15;

export type DayOption = { offset: number; date: Date; label: string; sub: string };

/** The next `count` days starting today: "Today", "Tomorrow", then weekday names. */
export function dayOptions(now: Date, count = 7): DayOption[] {
  return Array.from({ length: count }, (_, offset) => {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
    const label = offset === 0 ? 'Today' : offset === 1 ? 'Tomorrow' : WEEKDAYS[date.getDay()];
    return { offset, date, label, sub: `${MONTHS[date.getMonth()]} ${date.getDate()}` };
  });
}

/** Minutes after midnight for every pickable slot on that day. */
export function timeSlots(day: Date, now: Date): number[] {
  const slots: number[] = [];
  const earliest = now.getTime() + MIN_LEAD_MIN * 60000;
  for (let min = FIRST_SLOT; min <= LAST_SLOT; min += SLOT_MINUTES) {
    if (atMinutes(day, min).getTime() >= earliest) slots.push(min);
  }
  return slots;
}

export function atMinutes(day: Date, minutes: number) {
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), Math.floor(minutes / 60), minutes % 60);
}

/** First slot at least an hour out; if today is done, tomorrow at 6 PM. */
export function defaultStart(now: Date): { offset: number; minutes: number } {
  const target = now.getTime() + HOUR;
  const today = startOfDay(now);
  const slot = timeSlots(today, now).find(min => atMinutes(today, min).getTime() >= target);
  return slot !== undefined ? { offset: 0, minutes: slot } : { offset: 1, minutes: 18 * 60 };
}

// ---------- Form validation ----------

export const CAPACITY_MIN = 2;
export const CAPACITY_MAX = 100;
export const TITLE_MAX = 80;
export const LOCATION_MAX = 80;

export type MeetupForm = { activityId: ID | null; title: string; location: string; startsAt: Date | null; capacity: number };
export type MeetupFormErrors = Partial<Record<'activity' | 'title' | 'location' | 'when' | 'capacity', string>>;

/** Mirrors createMeetup()'s rules so students see problems inline before submitting. */
export function validateMeetupForm(f: MeetupForm, now: Date): MeetupFormErrors {
  const e: MeetupFormErrors = {};
  if (!f.activityId || !ACTIVITY_BY_ID[f.activityId]) e.activity = 'Pick an activity.';
  const title = f.title.trim();
  if (!title) e.title = 'Give it a title.';
  else if (title.length > TITLE_MAX) e.title = `Keep it under ${TITLE_MAX} characters.`;
  const location = f.location.trim();
  if (!location) e.location = 'Say where to meet.';
  else if (location.length > LOCATION_MAX) e.location = `Keep it under ${LOCATION_MAX} characters.`;
  if (!f.startsAt) e.when = 'Pick a time.';
  else if (f.startsAt.getTime() < now.getTime()) e.when = 'That time has passed. Pick a later one.';
  if (!(Number.isInteger(f.capacity) && f.capacity >= CAPACITY_MIN && f.capacity <= CAPACITY_MAX)) e.capacity = `Pick ${CAPACITY_MIN} to ${CAPACITY_MAX} spots.`;
  return e;
}
