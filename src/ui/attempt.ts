import { Alert } from 'react-native';
import { ActionError } from '../data/actions';

export type Attempt<R> = { ok: true; value: R } | { ok: false; value?: undefined };

/**
 * Runs a store action. ActionError messages are shown to the student and reported as
 * { ok: false }; anything unexpected is rethrown. Check `.ok` (void actions return undefined).
 */
export function attempt<R>(fn: () => R, title = "Couldn't do that"): Attempt<R> {
  try {
    return { ok: true, value: fn() };
  } catch (e) {
    if (e instanceof ActionError) { Alert.alert(title, e.message); return { ok: false }; }
    throw e;
  }
}
