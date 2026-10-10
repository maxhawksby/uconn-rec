import { useCallback } from 'react';
import { Alert, BackHandler } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { NewWorkout } from '../data/types';
import type { Stat } from '../ui';
import type { ExerciseDraft, PRHit } from './lift';

// Shared types and hooks for an in-progress recording.

type DistributiveOmit<T, K extends keyof any> = T extends unknown ? Omit<T, K> : never;

/** Everything a logger knows. The finish sheet adds title, note and visibility. */
export type FinishDraft = DistributiveOmit<NewWorkout, 'title' | 'visibility' | 'note'>;

export type Finished = { draft: FinishDraft; stats: Stat[]; prs?: PRHit[]; activityName?: string };

/** Asks before throwing away a workout in progress. */
export function confirmDiscard(onDiscard: () => void, what = 'workout') {
  Alert.alert(`Discard this ${what}?`, "It won't be saved.", [
    { text: 'Keep going', style: 'cancel' },
    { text: 'Discard', style: 'destructive', onPress: onDiscard },
  ]);
}

/** Android back button asks before leaving an in-progress workout (while this tab is focused). */
export function useBackGuard(enabled: boolean, onBack: () => void) {
  useFocusEffect(useCallback(() => {
    if (!enabled) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { onBack(); return true; });
    return () => sub.remove();
  }, [enabled, onBack]));
}

// The lift draft survives app restarts: losing a half-logged session is the worst outcome.
const DRAFT_KEY = 'deans-lift-record-lift-draft-v1';

export type LiftDraft = { startedAt: number; exercises: ExerciseDraft[] };

function isLiftDraft(x: unknown): x is LiftDraft {
  const d = x as LiftDraft;
  return !!d && typeof d.startedAt === 'number' && Array.isArray(d.exercises) &&
    d.exercises.every(e => typeof e.name === 'string' && Array.isArray(e.rows) && Array.isArray(e.previous));
}

export async function loadLiftDraft(): Promise<LiftDraft | null> {
  try {
    const raw = await AsyncStorage.getItem(DRAFT_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    // Drafts older than a day are stale; drop them rather than resume a 30-hour lift.
    return isLiftDraft(parsed) && Date.now() - parsed.startedAt < 24 * 3600 * 1000 ? parsed : null;
  } catch {
    return null;
  }
}

export function saveLiftDraft(draft: LiftDraft) {
  AsyncStorage.setItem(DRAFT_KEY, JSON.stringify(draft)).catch(() => {});
}

export function clearLiftDraft() {
  AsyncStorage.removeItem(DRAFT_KEY).catch(() => {});
}
