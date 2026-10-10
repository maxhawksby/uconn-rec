import React, { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { colors, gutter, minTouch, radius, space } from '../theme';
import { Button, Icon, Input, KeyboardFrame, Scoreboard, Text } from '../ui';
import type { Visibility, WorkoutKind } from '../data/types';
import { suggestTitle } from './math';
import { setLabel } from './lift';
import { IconButton, SectionLabel } from './parts';
import type { Finished } from './session';

const KIND_LABEL: Record<WorkoutKind, string> = { lift: 'Lifting', run: 'Run', ride: 'Ride', sport: 'Sport', class: 'Class', other: 'Workout' };

const VISIBILITY: { value: Visibility; label: string; body: string; icon: string }[] = [
  { value: 'friends', label: 'Friends', body: 'People you follow', icon: 'people-outline' },
  { value: 'campus', label: 'Campus', body: 'Students at your school', icon: 'school-outline' },
  { value: 'private', label: 'Only me', body: 'Kept in your log', icon: 'lock-closed-outline' },
];

type Props = {
  finished: Finished | null;
  posting?: boolean;
  /** Back to the workout (it keeps its state). */
  onCancel: () => void;
  onPost: (input: { title: string; note: string; visibility: Visibility }) => void;
};

/** Last step for every kind: summary, title, private note, visibility, post. */
export function FinishSheet({ finished, posting, onCancel, onPost }: Props) {
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [visibility, setVisibility] = useState<Visibility>('friends');

  // Fresh suggestion each time the sheet opens for a new workout.
  useEffect(() => {
    if (!finished) return;
    setTitle(suggestTitle(finished.draft.kind, new Date(finished.draft.startedAt), finished.activityName));
    setNote('');
    setVisibility('friends');
  }, [finished]);

  const prs = finished?.prs ?? [];
  const titleError = title.trim() ? '' : 'Give it a title.';

  return (
    <Modal visible={!!finished} animationType="slide" presentationStyle="pageSheet" onRequestClose={onCancel}>
      <SafeAreaProvider>
        <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
          <KeyboardFrame>
            <View style={styles.header}>
              <View style={styles.flex}>
                <Text variant="eyebrow" color="accent">{finished ? (finished.activityName ?? KIND_LABEL[finished.draft.kind]) : ''}</Text>
                <Text variant="title">Save workout</Text>
              </View>
              <IconButton icon="close" label="Back to workout" onPress={onCancel} />
            </View>
            <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
              {finished ? <Scoreboard stats={finished.stats} /> : null}

              {prs.length ? (
                <View style={styles.prs}>
                  <View style={styles.prHead}>
                    <Icon name="trophy" size={18} color="accent" />
                    <Text variant="h2">{prs.length === 1 ? 'New PR' : `${prs.length} new PRs`}</Text>
                  </View>
                  {prs.map(pr => (
                    <View key={pr.exercise} style={styles.prRow}>
                      <Text variant="bodyStrong" style={styles.flex}>{pr.exercise}</Text>
                      <Text variant="bodyStrong" color="accent">{setLabel(pr)}</Text>
                      <Text variant="tiny" color="muted">was {setLabel(pr.previous)}</Text>
                    </View>
                  ))}
                </View>
              ) : null}

              <SectionLabel>Title</SectionLabel>
              <Input value={title} onChangeText={setTitle} maxLength={80} selectTextOnFocus returnKeyType="next" error={titleError || undefined}
                accessibilityLabel="Workout title" />

              <SectionLabel right={<View style={styles.lock}><Icon name="lock-closed" size={12} color="muted" /><Text variant="tiny" color="muted">Only you see this</Text></View>}>Private note</SectionLabel>
              <Input value={note} onChangeText={setNote} placeholder="How it felt, what to change next time" multiline maxLength={500}
                style={styles.note} textAlignVertical="top" accessibilityLabel="Private note" />

              <SectionLabel>Who can see it</SectionLabel>
              <View style={styles.options} accessibilityRole="radiogroup">
                {VISIBILITY.map(v => {
                  const on = visibility === v.value;
                  return (
                    <Pressable key={v.value} accessibilityRole="radio" accessibilityState={{ checked: on }} accessibilityLabel={`${v.label}, ${v.body}`}
                      onPress={() => setVisibility(v.value)} style={({ pressed }) => [styles.option, on && styles.optionOn, pressed && !on && styles.pressed]}>
                      <Icon name={v.icon} size={20} color={on ? 'onBoard' : 'inkSoft'} />
                      <Text variant="smallStrong" color={on ? 'onBoard' : 'ink'}>{v.label}</Text>
                      <Text variant="tiny" color={on ? 'onBoardMuted' : 'muted'} center>{v.body}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>
            <View style={styles.footer}>
              <Button label="Post workout" block loading={posting} disabled={!!titleError} onPress={() => onPost({ title, note, visibility })} />
            </View>
          </KeyboardFrame>
        </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'flex-end', paddingLeft: gutter, paddingRight: space.md, paddingTop: space.lg, paddingBottom: space.lg },
  content: { paddingHorizontal: gutter, paddingBottom: space.xxl },
  prs: { marginTop: space.lg, backgroundColor: colors.accentSoft, borderRadius: radius.md, padding: space.lg, gap: space.sm },
  prHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginBottom: space.xs },
  prRow: { flexDirection: 'row', alignItems: 'baseline', gap: space.sm },
  lock: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  note: { minHeight: 96, paddingTop: space.md },
  options: { flexDirection: 'row', gap: space.sm },
  option: { flex: 1, alignItems: 'center', gap: space.xs, paddingVertical: space.md, paddingHorizontal: space.sm, minHeight: minTouch * 2, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
  optionOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  pressed: { backgroundColor: colors.sunken },
  footer: { paddingHorizontal: gutter, paddingTop: space.md, paddingBottom: space.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line, backgroundColor: colors.bg },
});
