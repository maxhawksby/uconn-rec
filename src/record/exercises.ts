// Seed exercise catalog for the lift logger. Names match the demo data so history and PRs
// line up. Students can also add any custom name from the picker.

export type MuscleGroup = 'Chest' | 'Back' | 'Legs' | 'Shoulders' | 'Arms' | 'Core' | 'Full body';

export type Exercise = { name: string; group: MuscleGroup; bodyweight?: boolean };

export const MUSCLE_GROUPS: MuscleGroup[] = ['Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core', 'Full body'];

const BY_GROUP: Record<MuscleGroup, (string | [string, 'bw'])[]> = {
  Chest: ['Bench press', 'Incline bench press', 'Incline dumbbell press', 'Dumbbell bench press', 'Decline bench press', 'Machine chest press', 'Cable fly', 'Dumbbell fly', 'Pec deck', ['Push-up', 'bw'], ['Dip', 'bw']],
  Back: ['Deadlift', 'Barbell row', 'Dumbbell row', 'Pendlay row', 'Lat pulldown', 'Seated cable row', 'T-bar row', 'Chest-supported row', 'Face pull', 'Shrug', ['Pull-up', 'bw'], ['Chin-up', 'bw']],
  Legs: ['Back squat', 'Front squat', 'Romanian deadlift', 'Leg press', 'Bulgarian split squat', 'Walking lunge', 'Hack squat', 'Leg extension', 'Leg curl', 'Hip thrust', 'Calf raise', 'Goblet squat', 'Sumo deadlift'],
  Shoulders: ['Overhead press', 'Dumbbell shoulder press', 'Arnold press', 'Lateral raise', 'Cable lateral raise', 'Rear delt fly', 'Upright row'],
  Arms: ['Barbell curl', 'Dumbbell curl', 'Hammer curl', 'Preacher curl', 'Cable curl', 'Tricep pushdown', 'Skull crusher', 'Overhead tricep extension', 'Close-grip bench press'],
  Core: [['Plank', 'bw'], ['Hanging leg raise', 'bw'], 'Cable crunch', 'Ab wheel rollout', 'Russian twist', ['Sit-up', 'bw']],
  'Full body': ['Power clean', 'Clean and jerk', 'Snatch', 'Kettlebell swing', 'Thruster', 'Farmer carry', ['Burpee', 'bw']],
};

export const EXERCISES: Exercise[] = MUSCLE_GROUPS.flatMap(group =>
  BY_GROUP[group].map(e => (Array.isArray(e) ? { name: e[0], group, bodyweight: true } : { name: e, group })));

export const exerciseKey = (name: string) => name.trim().toLowerCase();

const BY_KEY = new Map(EXERCISES.map(e => [exerciseKey(e.name), e]));

export function findExercise(name: string): Exercise | undefined {
  return BY_KEY.get(exerciseKey(name));
}

/** Case-insensitive match on any word start, e.g. "inc dumb" finds "Incline dumbbell press". */
export function searchExercises(query: string, extra: string[] = []): Exercise[] {
  const custom = extra.filter(n => !BY_KEY.has(exerciseKey(n))).map(name => ({ name, group: 'Full body' as MuscleGroup }));
  const all = [...EXERCISES, ...custom];
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return all;
  return all.filter(e => {
    const words = `${e.name} ${e.group}`.toLowerCase().split(/[\s-]+/);
    return terms.every(t => words.some(w => w.startsWith(t)) || e.name.toLowerCase().includes(t));
  });
}
