import type { WorkoutKind } from './types';

// Generic activity taxonomy shared by every campus. Students pick these as interests,
// log workouts against them, and tag meetups with them. Icons are Ionicons names.
export type ActivityCategory = 'strength' | 'endurance' | 'pickup' | 'club' | 'classes' | 'outdoors';

export type Activity = { id: string; name: string; category: ActivityCategory; kind: WorkoutKind; icon: string };

export const CATEGORY_LABEL: Record<ActivityCategory, string> = {
  strength: 'Strength',
  endurance: 'Runs & endurance',
  pickup: 'Pickup & intramurals',
  club: 'Club sports',
  classes: 'Classes',
  outdoors: 'Outdoors & other',
};

type Row = [id: string, name: string, category: ActivityCategory, kind: WorkoutKind, icon: string];

const ROWS: Row[] = [
  ['lifting', 'Weightlifting', 'strength', 'lift', 'barbell-outline'],
  ['powerlifting', 'Powerlifting', 'strength', 'lift', 'barbell-outline'],
  ['olympic-lifting', 'Olympic lifting', 'strength', 'lift', 'barbell-outline'],
  ['bodybuilding', 'Bodybuilding', 'strength', 'lift', 'body-outline'],
  ['calisthenics', 'Calisthenics', 'strength', 'lift', 'body-outline'],
  ['functional', 'Functional / CrossFit-style', 'strength', 'lift', 'fitness-outline'],
  ['running', 'Running', 'endurance', 'run', 'walk-outline'],
  ['trail-running', 'Trail running', 'endurance', 'run', 'trail-sign-outline'],
  ['walking', 'Walking', 'endurance', 'run', 'footsteps-outline'],
  ['cycling', 'Cycling', 'endurance', 'ride', 'bicycle-outline'],
  ['swimming', 'Swimming', 'endurance', 'other', 'water-outline'],
  ['rowing', 'Rowing / erg', 'endurance', 'other', 'boat-outline'],
  ['stairs', 'Stair climber', 'endurance', 'other', 'trending-up-outline'],
  ['basketball', 'Basketball', 'pickup', 'sport', 'basketball-outline'],
  ['soccer', 'Soccer', 'pickup', 'sport', 'football-outline'],
  ['volleyball', 'Volleyball', 'pickup', 'sport', 'tennisball-outline'],
  ['flag-football', 'Flag football', 'pickup', 'sport', 'american-football-outline'],
  ['spikeball', 'Spikeball', 'pickup', 'sport', 'ellipse-outline'],
  ['pickleball', 'Pickleball', 'pickup', 'sport', 'tennisball-outline'],
  ['tennis', 'Tennis', 'pickup', 'sport', 'tennisball-outline'],
  ['badminton', 'Badminton', 'pickup', 'sport', 'tennisball-outline'],
  ['softball', 'Softball', 'pickup', 'sport', 'baseball-outline'],
  ['ultimate', 'Ultimate frisbee', 'pickup', 'sport', 'disc-outline'],
  ['intramurals', 'Intramurals (any sport)', 'pickup', 'sport', 'trophy-outline'],
  ['club-rugby', 'Rugby', 'club', 'sport', 'american-football-outline'],
  ['club-lacrosse', 'Lacrosse', 'club', 'sport', 'flag-outline'],
  ['club-hockey', 'Ice hockey', 'club', 'sport', 'snow-outline'],
  ['club-crew', 'Crew', 'club', 'sport', 'boat-outline'],
  ['club-triathlon', 'Triathlon', 'club', 'other', 'medal-outline'],
  ['club-martial-arts', 'Martial arts', 'club', 'class', 'hand-left-outline'],
  ['club-practice', 'Club practice (other)', 'club', 'sport', 'people-outline'],
  ['yoga', 'Yoga', 'classes', 'class', 'leaf-outline'],
  ['pilates', 'Pilates', 'classes', 'class', 'body-outline'],
  ['spin', 'Spin / indoor cycling', 'classes', 'class', 'bicycle-outline'],
  ['hiit', 'HIIT / bootcamp', 'classes', 'class', 'flash-outline'],
  ['dance', 'Dance', 'classes', 'class', 'musical-notes-outline'],
  ['boxing', 'Boxing / kickboxing', 'classes', 'class', 'hand-right-outline'],
  ['mobility', 'Mobility & stretching', 'classes', 'class', 'accessibility-outline'],
  ['climbing', 'Climbing / bouldering', 'outdoors', 'other', 'trending-up-outline'],
  ['hiking', 'Hiking', 'outdoors', 'other', 'trail-sign-outline'],
  ['skiing', 'Skiing / snowboarding', 'outdoors', 'other', 'snow-outline'],
  ['skating', 'Skating', 'outdoors', 'other', 'ellipse-outline'],
  ['other', 'Something else', 'outdoors', 'other', 'add-circle-outline'],
];

export const ACTIVITIES: Activity[] = ROWS.map(([id, name, category, kind, icon]) => ({ id, name, category, kind, icon }));
export const ACTIVITY_BY_ID: Record<string, Activity> = Object.fromEntries(ACTIVITIES.map(a => [a.id, a]));
export const CATEGORIES = Object.keys(CATEGORY_LABEL) as ActivityCategory[];

export function activityName(id: string) {
  return ACTIVITY_BY_ID[id]?.name ?? 'Workout';
}
