import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Keyboard, Platform, Pressable, ScrollView, StyleSheet, TextInput, Vibration, View } from 'react-native';
import { colors, fonts, gutter, minTouch, radius, space, type } from '../theme';
import { Button, Chip, EmptyState, Icon, Scoreboard, Text } from '../ui';
import type { LiftExercise, Workout } from '../data/types';
import { findExercise } from './exercises';
import { ExercisePicker } from './ExercisePicker';
import { detectPRs, formatVolume, ghostSet, parseRow, previousSets, rowIsValid, setCount, setLabel, toExercises, volume, type ExerciseDraft, type SetRow } from './lift';
import { formatClock, parseDecimal, suggestTitle } from './math';
import { IconButton, LoggerHeader, useNow } from './parts';
import { clearLiftDraft, confirmDiscard, saveLiftDraft, useBackGuard, type Finished, type LiftDraft } from './session';
import { formatDuration } from '../data/selectors';

type Props = {
  history: Workout[]; // the student's own workouts, for pre-fill and PRs
  initial: LiftDraft;
  onFinish: (f: Finished) => void;
  onDiscard: () => void;
};

let seq = 0;
const uid = () => `${Date.now().toString(36)}${(seq++).toString(36)}`;
const emptyRow = (): SetRow => ({ id: uid(), weight: '', reps: '', done: false });

/** Builds a draft for an exercise, with one empty row per set from last time (at least one). */
export function newExerciseDraft(name: string, history: Workout[]): ExerciseDraft {
  const previous = previousSets(history, name);
  return { id: uid(), name, previous, rows: Array.from({ length: Math.max(1, previous.length) }, emptyRow) };
}

/** Starts a lift, optionally repeating a past session's exercises. */
export function newLiftDraft(history: Workout[], repeat?: LiftExercise[]): LiftDraft {
  return { startedAt: Date.now(), exercises: (repeat ?? []).map(e => newExerciseDraft(e.name, history)) };
}

const REST_OPTIONS = [0, 60, 90, 120, 180];
const restLabel = (s: number) => (s ? `Rest ${formatClock(s)}` : 'Rest off');

export function LiftLogger({ history, initial, onFinish, onDiscard }: Props) {
  const [startedAt] = useState(initial.startedAt);
  const [exercises, setExercises] = useState<ExerciseDraft[]>(initial.exercises);
  const [picking, setPicking] = useState(false);
  const [restSec, setRestSec] = useState(90);
  const [restUntil, setRestUntil] = useState<number | null>(null);
  const [flagged, setFlagged] = useState<Set<string>>(new Set());
  const scroll = useRef<ScrollView>(null);

  useEffect(() => { saveLiftDraft({ startedAt, exercises }); }, [startedAt, exercises]);

  const discard = useCallback(() => {
    const hasWork = exercises.some(e => e.rows.some(r => r.reps || r.weight));
    const go = () => { clearLiftDraft(); onDiscard(); };
    if (!hasWork) return go();
    confirmDiscard(go, 'lift');
  }, [exercises, onDiscard]);
  useBackGuard(true, discard);

  const logged = useMemo(() => toExercises(exercises), [exercises]);
  const recent = useMemo(() => {
    const seen = new Set<string>(); const out: string[] = [];
    for (const w of [...history].sort((a, b) => b.startedAt.localeCompare(a.startedAt))) {
      if (w.kind !== 'lift') continue;
      for (const e of w.exercises) { const k = e.name.trim().toLowerCase(); if (!seen.has(k)) { seen.add(k); out.push(e.name.trim()); } }
    }
    return out;
  }, [history]);

  const updateExercise = (id: string, fn: (e: ExerciseDraft) => ExerciseDraft) => setExercises(list => list.map(e => (e.id === id ? fn(e) : e)));
  const updateRow = (exId: string, rowId: string, patch: Partial<SetRow>) => {
    updateExercise(exId, e => ({ ...e, rows: e.rows.map(r => (r.id === rowId ? { ...r, ...patch } : r)) }));
    if (flagged.has(rowId)) setFlagged(f => { const n = new Set(f); n.delete(rowId); return n; });
  };

  function addExercise(name: string) {
    setPicking(false);
    setExercises(list => [...list, newExerciseDraft(name, history)]);
    setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 250);
  }

  function removeExercise(ex: ExerciseDraft) {
    const drop = () => setExercises(list => list.filter(e => e.id !== ex.id));
    if (!ex.rows.some(r => r.reps || r.weight)) return drop();
    Alert.alert(`Remove ${ex.name}?`, 'Its sets will be removed from this workout.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: drop },
    ]);
  }

  function toggleDone(ex: ExerciseDraft, index: number) {
    const row = ex.rows[index];
    if (row.done) return updateRow(ex.id, row.id, { done: false });
    // An untouched row adopts the suggested numbers, so repeating last week is one tap.
    let next = row;
    if (!row.reps.trim()) {
      const g = ghostSet(ex, index);
      if (g) next = { ...row, reps: String(g.reps), weight: row.weight.trim() || (g.weight ? String(g.weight) : '') };
    }
    if (!parseRow(next) || !rowIsValid(next)) { setFlagged(f => new Set(f).add(row.id)); return; }
    Keyboard.dismiss();
    updateRow(ex.id, row.id, { ...next, done: true });
    if (restSec) setRestUntil(Date.now() + restSec * 1000);
  }

  function copyLast(ex: ExerciseDraft) {
    const last = [...ex.rows].reverse().find(r => parseRow(r));
    updateExercise(ex.id, e => ({ ...e, rows: [...e.rows, last ? { ...emptyRow(), weight: last.weight, reps: last.reps } : emptyRow()] }));
  }

  function finish() {
    Keyboard.dismiss();
    const bad = exercises.flatMap(e => e.rows.filter(r => !rowIsValid(r)).map(r => r.id));
    if (bad.length) {
      setFlagged(new Set(bad));
      Alert.alert('Check your sets', 'Some sets need reps as a whole number and a weight under 2,000 lb.');
      return;
    }
    if (!logged.length) {
      Alert.alert('No sets yet', 'Enter reps for at least one set, or discard this workout.');
      return;
    }
    const durationSec = Math.max(60, Math.round((Date.now() - startedAt) / 1000));
    const vol = volume(logged);
    onFinish({
      draft: { kind: 'lift', exercises: logged, startedAt: new Date(startedAt).toISOString(), durationSec },
      stats: [
        { label: 'Time', value: formatDuration(durationSec) },
        { label: 'Volume', value: formatVolume(vol), unit: 'lb' },
        { label: 'Sets', value: String(setCount(logged)) },
      ],
      prs: detectPRs(history, logged),
    });
  }

  const title = suggestTitle('lift', new Date(startedAt));
  return (
    <View style={styles.root}>
      <LoggerHeader eyebrow="Lifting · live" title={title} onClose={discard}
        right={exercises.length ? <Button label="Finish" size="sm" onPress={finish} /> : null} />
      <ScrollView ref={scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive"
        automaticallyAdjustKeyboardInsets>
        <LiveBoard startedAt={startedAt} volume={volume(logged)} sets={setCount(logged)} />
        <View style={styles.restRow}>
          <Chip icon="timer-outline" label={restLabel(restSec)} selected={restSec > 0}
            onPress={() => { const next = REST_OPTIONS[(REST_OPTIONS.indexOf(restSec) + 1) % REST_OPTIONS.length]; setRestSec(next); if (!next) setRestUntil(null); }} />
          <Text variant="tiny" color="muted" style={styles.flex}>{restSec ? 'Starts when you check off a set.' : 'Tap to turn on a rest timer.'}</Text>
        </View>

        {exercises.length === 0 ? (
          <Card>
            <EmptyState icon="barbell-outline" title="Add your first exercise"
              body="Search the list or type your own. If you've done it before, last session's numbers show up as a guide."
              actionLabel="Add exercise" onAction={() => setPicking(true)} />
          </Card>
        ) : (
          <View style={styles.list}>
            {exercises.map(ex => (
              <ExerciseCard key={ex.id} ex={ex} flagged={flagged}
                onChange={(rowId, patch) => updateRow(ex.id, rowId, patch)}
                onToggle={i => toggleDone(ex, i)}
                onRemoveRow={rowId => updateExercise(ex.id, e => ({ ...e, rows: e.rows.length > 1 ? e.rows.filter(r => r.id !== rowId) : [emptyRow()] }))}
                onAddRow={() => updateExercise(ex.id, e => ({ ...e, rows: [...e.rows, emptyRow()] }))}
                onCopyLast={() => copyLast(ex)}
                onRemove={() => removeExercise(ex)} />
            ))}
            <Button label="Add exercise" icon="add" variant="secondary" block onPress={() => setPicking(true)} />
          </View>
        )}
      </ScrollView>
      {restUntil ? <RestBar until={restUntil} onChange={setRestUntil} /> : null}
      <ExercisePicker visible={picking} onClose={() => setPicking(false)} onPick={addExercise} taken={exercises.map(e => e.name)} recent={recent} />
    </View>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

/** Ticks on its own so typing in a set row never waits on the clock. */
function LiveBoard({ startedAt, volume: vol, sets }: { startedAt: number; volume: number; sets: number }) {
  const now = useNow();
  return (
    <Scoreboard stats={[
      { label: 'Time', value: formatClock((now - startedAt) / 1000) },
      { label: 'Volume', value: formatVolume(vol), unit: 'lb' },
      { label: 'Sets', value: String(sets) },
    ]} />
  );
}

type CardProps = {
  ex: ExerciseDraft;
  flagged: Set<string>;
  onChange: (rowId: string, patch: Partial<SetRow>) => void;
  onToggle: (index: number) => void;
  onRemoveRow: (rowId: string) => void;
  onAddRow: () => void;
  onCopyLast: () => void;
  onRemove: () => void;
};

function ExerciseCard({ ex, flagged, onChange, onToggle, onRemoveRow, onAddRow, onCopyLast, onRemove }: CardProps) {
  const group = findExercise(ex.name)?.group ?? 'Custom';
  return (
    <View style={styles.card}>
      <View style={styles.exHeader}>
        <View style={styles.flex}>
          <Text variant="eyebrow" color="muted">{group}</Text>
          <Text variant="h2">{ex.name}</Text>
          <Text variant="small" color="muted" numberOfLines={2}>
            {ex.previous.length ? `Last time: ${ex.previous.map(setLabel).join(' · ')}` : 'First time logging this one.'}
          </Text>
        </View>
        <IconButton icon="trash-outline" label={`Remove ${ex.name}`} color="muted" onPress={onRemove} />
      </View>

      <View style={[styles.setRow, styles.colHeader]}>
        <Text variant="statLabel" color="muted" style={styles.colSet}>Set</Text>
        <Text variant="statLabel" color="muted" style={styles.colField}>lb</Text>
        <Text variant="statLabel" color="muted" style={styles.colField}>Reps</Text>
        <View style={styles.colCheck} />
        <View style={styles.colRemove} />
      </View>
      {ex.rows.map((row, i) => {
        const ghost = ghostSet(ex, i);
        // Live red only for impossible values; missing reps turn red after a check or Finish.
        const weightBad = row.weight !== '' && !(parseDecimal(row.weight) <= 2000);
        const repsBad = Number(row.reps) > 500 || (flagged.has(row.id) && !parseRow(row));
        return (
          <View key={row.id} style={[styles.setRow, row.done && styles.doneRow]}>
            <View style={[styles.colSet, styles.setBadge, row.done && styles.setBadgeDone]}>
              <Text style={styles.setNumber} color={row.done ? 'onAccent' : 'inkSoft'}>{i + 1}</Text>
            </View>
            <TextInput
              value={row.weight} onChangeText={t => onChange(row.id, { weight: t.replace(/[^\d.,]/g, '') })}
              placeholder={ghost ? (ghost.weight ? String(ghost.weight) : 'BW') : 'lb'} placeholderTextColor={colors.faint}
              keyboardType="decimal-pad" returnKeyType="done" selectTextOnFocus maxLength={6}
              accessibilityLabel={`Set ${i + 1} weight in pounds`}
              style={[styles.field, styles.colField, (weightBad || (flagged.has(row.id) && !rowIsValid(row) && !repsBad)) && styles.fieldBad]} />
            <TextInput
              value={row.reps} onChangeText={t => onChange(row.id, { reps: t.replace(/\D/g, '') })}
              placeholder={ghost ? String(ghost.reps) : 'reps'} placeholderTextColor={colors.faint}
              keyboardType="number-pad" returnKeyType="done" selectTextOnFocus maxLength={3}
              accessibilityLabel={`Set ${i + 1} reps`}
              style={[styles.field, styles.colField, repsBad && styles.fieldBad]} />
            <Pressable accessibilityRole="checkbox" accessibilityLabel={`Mark set ${i + 1} done`} accessibilityState={{ checked: row.done }}
              onPress={() => onToggle(i)} style={({ pressed }) => [styles.colCheck, styles.check, row.done && styles.checkOn, pressed && styles.pressed]}>
              <Icon name="checkmark" size={20} color={row.done ? 'onAccent' : 'faint'} />
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel={`Remove set ${i + 1}`} onPress={() => onRemoveRow(row.id)}
              style={({ pressed }) => [styles.colRemove, styles.remove, pressed && styles.pressed]}>
              <Icon name="remove-circle-outline" size={18} color="faint" />
            </Pressable>
          </View>
        );
      })}
      <View style={styles.exFooter}>
        <Button label="Add set" icon="add" variant="ghost" size="sm" onPress={onAddRow} />
        <Button label="Copy last set" icon="copy-outline" variant="ghost" size="sm" onPress={onCopyLast} />
      </View>
    </View>
  );
}

/** Rest countdown pinned above the tab bar. Buzzes once at zero, then clears itself. */
function RestBar({ until, onChange }: { until: number; onChange: (until: number | null) => void }) {
  const now = useNow(true, 250);
  const left = Math.ceil((until - now) / 1000);
  useEffect(() => {
    if (left <= 0) { Vibration.vibrate(Platform.OS === 'android' ? 500 : undefined); onChange(null); }
  }, [left, onChange]);
  if (left <= 0) return null;
  return (
    <View style={styles.restBar} accessibilityLiveRegion="polite">
      <View style={styles.flex}>
        <Text variant="statLabel" color="onBoardMuted">Rest</Text>
        <Text style={styles.restClock} color="onBoard">{formatClock(left)}</Text>
      </View>
      <RestButton label="-15" onPress={() => onChange(until - 15000)} />
      <RestButton label="+15" onPress={() => onChange(until + 15000)} />
      <RestButton label="Skip" onPress={() => onChange(null)} />
    </View>
  );
}

function RestButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label === 'Skip' ? 'Skip rest' : `${label} seconds`} onPress={onPress}
      style={({ pressed }) => [styles.restButton, pressed && styles.restButtonPressed]}>
      <Text variant="smallStrong" color="onBoard">{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  content: { paddingHorizontal: gutter, paddingBottom: space.x5 * 2 },
  restRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginTop: space.md, marginBottom: space.lg },
  list: { gap: space.md },
  card: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line, padding: space.lg },
  exHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm, marginBottom: space.md },
  colHeader: { minHeight: 0, paddingVertical: space.xs },
  setRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: minTouch + 4, marginHorizontal: -space.sm, paddingHorizontal: space.sm, borderRadius: radius.sm },
  doneRow: { backgroundColor: colors.turfSoft },
  colSet: { width: 32, textAlign: 'center' },
  colField: { flex: 1, minWidth: 0, textAlign: 'center' },
  colCheck: { width: minTouch },
  colRemove: { width: 28 },
  setBadge: { height: 28, borderRadius: radius.sm, backgroundColor: colors.sunken, alignItems: 'center', justifyContent: 'center' },
  setBadgeDone: { backgroundColor: colors.turf },
  setNumber: { fontFamily: fonts.numeral, fontSize: 16, lineHeight: 18 },
  field: { fontFamily: fonts.numeral, fontSize: 20, color: colors.ink, height: 38, paddingVertical: 0, backgroundColor: colors.sunken, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.sunken },
  fieldBad: { borderColor: colors.danger, backgroundColor: colors.dangerSoft },
  check: { height: 38, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface },
  checkOn: { backgroundColor: colors.turf, borderColor: colors.turf },
  remove: { height: 38, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.6 },
  exFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: space.sm, marginHorizontal: -space.md },
  restBar: { position: 'absolute', left: gutter, right: gutter, bottom: space.md, flexDirection: 'row', alignItems: 'center', gap: space.sm, backgroundColor: colors.board, borderRadius: radius.md, paddingVertical: space.md, paddingHorizontal: space.lg },
  restClock: { ...type.stat, fontSize: 28, lineHeight: 30 },
  restButton: { minWidth: minTouch, height: minTouch - 4, paddingHorizontal: space.md, borderRadius: radius.sm, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.onBoardMuted, alignItems: 'center', justifyContent: 'center' },
  restButtonPressed: { backgroundColor: colors.inkSoft },
});
