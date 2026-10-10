import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { TabScreenProps } from '../navigation/types';
import { useMe, useStore } from '../data/store';
import { followingIds, studentById, workoutsFor } from '../data/selectors';
import type { Student, Workout } from '../data/types';
import { colors } from '../theme';
import { attempt } from '../ui';
import { StartView, type StartKind } from '../record/StartView';
import { LiftLogger, newLiftDraft } from '../record/LiftLogger';
import { DistanceLogger } from '../record/DistanceLogger';
import { QuickLogger } from '../record/QuickLogger';
import { FinishSheet } from '../record/FinishSheet';
import { clearLiftDraft, loadLiftDraft, type Finished, type LiftDraft } from '../record/session';

type Active =
  | { type: 'lift'; draft: LiftDraft }
  | { type: 'distance'; kind: 'run' | 'ride' }
  | { type: 'sport'; preset?: { activityId?: string; withIds?: string[] } }
  | { type: 'session'; preset?: { activityId?: string } };

/** Record tab: pick a kind, log it, then save it from the finish sheet. */
export function RecordScreen({ navigation }: TabScreenProps<'Record'>) {
  const { state, actions } = useStore();
  const me = useMe();
  const [active, setActive] = useState<Active | null>(null);
  const [run, setRun] = useState(0); // remounts the logger for each new workout
  const [finished, setFinished] = useState<Finished | null>(null);
  const [restoring, setRestoring] = useState(true);

  const history = useMemo(() => workoutsFor(state, me.id, me.id), [state, me.id]);
  const friends = useMemo(() => followingIds(state, me.id).map(id => studentById(state, id)).filter((s): s is Student => !!s)
    .sort((a, b) => a.firstName.localeCompare(b.firstName)), [state, me.id]);

  // Resume a lift that was in progress when the app closed.
  useEffect(() => {
    let live = true;
    loadLiftDraft().then(draft => {
      if (live && draft) setActive(a => a ?? { type: 'lift', draft });
    }).finally(() => { if (live) setRestoring(false); });
    return () => { live = false; };
  }, []);

  function begin(a: Active) { setRun(n => n + 1); setActive(a); }

  function start(kind: StartKind) {
    if (kind === 'lift') begin({ type: 'lift', draft: newLiftDraft(history) });
    else if (kind === 'run' || kind === 'ride') begin({ type: 'distance', kind });
    else begin({ type: kind });
  }

  function repeat(w: Workout) {
    if (w.kind === 'lift') begin({ type: 'lift', draft: newLiftDraft(history, w.exercises) });
    else if (w.kind === 'sport') begin({ type: 'sport', preset: { activityId: w.activityId, withIds: w.withIds } });
    else if (w.kind === 'class' || w.kind === 'other') begin({ type: 'session', preset: { activityId: w.activityId } });
    else begin({ type: 'distance', kind: w.kind });
  }

  function post(input: { title: string; note: string; visibility: Workout['visibility'] }) {
    if (!finished) return;
    const r = attempt(() => actions.logWorkout({ ...finished.draft, title: input.title, note: input.note.trim() || undefined, visibility: input.visibility }), "Couldn't save workout");
    if (!r.ok) return;
    if (finished.draft.kind === 'lift') clearLiftDraft();
    setFinished(null);
    setActive(null);
    navigation.navigate('Feed');
  }

  const close = () => setActive(null);
  if (restoring) return <View style={styles.center}><ActivityIndicator color={colors.accent} /></View>;
  if (!active) return <StartView history={history} onStart={start} onRepeat={repeat} />;

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      {active.type === 'lift' ? <LiftLogger key={run} history={history} initial={active.draft} onFinish={setFinished} onDiscard={close} />
        : active.type === 'distance' ? <DistanceLogger key={run} kind={active.kind} onFinish={setFinished} onDiscard={close} />
          : <QuickLogger key={run} mode={active.type} preset={active.preset} interests={me.interests} friends={friends} onFinish={setFinished} onDiscard={close} />}
      <FinishSheet finished={finished} onCancel={() => setFinished(null)} onPost={post} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
});
