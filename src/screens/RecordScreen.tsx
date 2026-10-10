import React from 'react';
import type { TabScreenProps } from '../navigation/types';
import { useStore } from '../data/store';
import { Button, EmptyState, Screen, attempt } from '../ui';

// PLACEHOLDER - owned by the Record feature agent (lifting logger, GPS runs, sports, classes).
export function RecordScreen({ navigation }: TabScreenProps<'Record'>) {
  const { actions } = useStore();
  function quickLog() {
    const r = attempt(() => actions.logWorkout({ kind: 'class', activityId: 'hiit', title: 'Quick HIIT', durationSec: 1800, startedAt: new Date().toISOString(), visibility: 'campus' }));
    if (r.ok) navigation.navigate('Feed');
  }
  return (
    <Screen title="Record">
      <EmptyState icon="barbell-outline" title="Recorder coming next" body="Lifting, runs, pickup games and classes all log from here." />
      <Button label="Log a quick 30-min HIIT (test)" variant="secondary" onPress={quickLog} />
    </Screen>
  );
}
