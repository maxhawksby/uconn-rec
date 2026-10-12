import type { Workout } from '../data/types';
import type { Stat } from '../ui';
import { compactNumber, durationParts, liftVolume, miles, mph, paceParts } from '../data/selectors';
import { bestLift } from './model';

/** The scoreboard cells for a workout, by kind. Class and other sessions use a duration row instead. */
export function workoutStats(w: Workout): Stat[] {
  const time = { label: 'Time', ...durationParts(w.durationSec) };
  switch (w.kind) {
    case 'lift': {
      const best = bestLift(w.exercises);
      return [
        { label: 'Volume', value: compactNumber(liftVolume(w)), unit: 'lb' },
        best ? { label: 'Best set', value: best.set.weight > 0 ? `${best.set.weight}×${best.set.reps}` : `BW×${best.set.reps}` } : { label: 'Exercises', value: String(w.exercises.length) },
        time,
      ];
    }
    case 'run':
      return [{ label: 'Distance', value: miles(w.distanceKm), unit: 'mi' }, { label: 'Pace', ...paceParts(w.durationSec, w.distanceKm) }, time];
    case 'ride':
      return [{ label: 'Distance', value: miles(w.distanceKm), unit: 'mi' }, { label: 'Speed', value: mph(w.durationSec, w.distanceKm), unit: 'mph' }, time];
    case 'sport':
      return [time, ...(w.result ? [{ label: 'Result', value: w.result }] : [])];
    default:
      return [time];
  }
}
