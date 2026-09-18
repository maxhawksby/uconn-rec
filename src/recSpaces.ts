import { INTEREST_GROUPS } from './onboarding/model';

export const REC_SPACES = [
  { id: 'strength', name: 'Fitness floors', short: 'Strength', description: 'Find your own rhythm across the Rec’s weight and fitness areas. A little effort is a good place to begin.' },
  { id: 'track', name: 'Elevated track', short: 'Track', description: 'Walk or run above the courts, with views across campus. The three-lane track welcomes a pace that feels right for you.' },
  { id: 'courts', name: 'Gym courts', short: 'Courts', description: 'A space for basketball, volleyball, and racquet sports. Bring a friend or discover something you haven’t tried yet.' },
  { id: 'aquatics', name: 'Aquatics center', short: 'Pools', description: 'Two pools make room for different ways to move, from swimming laps to a gentler session in the water.' },
  { id: 'studio', name: 'Group fitness studios', short: 'Studios', description: 'Room to stretch, cycle, and move together. Explore the app’s sample classes to find your next session.' },
  { id: 'climbing', name: 'Climbing center', short: 'Climbing', description: 'The Rec’s tall climbing wall is a familiar landmark inside the building. Climbers of all skill levels are welcome.' },
] as const;
export type RecSpace = typeof REC_SPACES[number]['id'];

const aquatics = new Set(['swimming', 'learn-to-swim', 'swim-conditioning', 'gentle-wave', 'nautical-flow', 'surfer-s-sculpt', 'water-polo', 'canoe-battleship']);
const courts = new Set(['basketball', 'volleyball', 'badminton', 'pickleball', 'racquetball']);
const climbing = new Set(['climbing', 'bouldering', 'top-rope-climbing', 'lead-climbing', 'rappelling']);
const studios = new Set(INTEREST_GROUPS.find(group => group.name === 'Group classes')?.ids || []);

export function spaceForInterest(id: string): RecSpace | undefined {
  if (id === 'strength') return 'strength';
  if (['running', 'walking', 'cardio-machines'].includes(id)) return 'track';
  if (aquatics.has(id)) return 'aquatics';
  if (courts.has(id)) return 'courts';
  if (climbing.has(id)) return 'climbing';
  if (studios.has(id)) return 'studio';
  // Off-site sports and trips are not represented as rooms in the Rec.
  return undefined;
}

export function spacesForInterests(ids: string[]): RecSpace[] {
  return [...new Set(ids.map(spaceForInterest).filter((id): id is RecSpace => !!id))];
}
