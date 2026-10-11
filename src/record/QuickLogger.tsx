import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { colors, gutter, minTouch, radius, space } from '../theme';
import { Avatar, Button, Icon, Input, Text } from '../ui';
import type { Student } from '../data/types';
import { ACTIVITIES, ACTIVITY_BY_ID } from '../data/activities';
import { formatDuration } from '../data/selectors';
import { suggestTitle } from './math';
import { ActivityPicker, DurationPicker, LoggerHeader, SectionLabel } from './parts';
import { confirmDiscard, useBackGuard, type Finished } from './session';

export type QuickMode = 'sport' | 'session';

type Props = {
  mode: QuickMode;
  preset?: { activityId?: string; withIds?: string[] };
  interests: string[];
  /** Students the user follows, for "played with". */
  friends: Student[];
  onFinish: (f: Finished) => void;
  onDiscard: () => void;
};

/** Pickup games, intramurals, classes and everything else: activity + duration (+ who). */
export function QuickLogger({ mode, preset, interests, friends, onFinish, onDiscard }: Props) {
  const isSport = mode === 'sport';
  const options = useMemo(() => {
    const list = ACTIVITIES.filter(a => (isSport ? a.kind === 'sport' : a.kind === 'class' || a.kind === 'other'));
    // The student's interests first, then catalog order.
    return [...list.filter(a => interests.includes(a.id)), ...list.filter(a => !interests.includes(a.id))];
  }, [isSport, interests]);

  const [activityId, setActivityId] = useState<string | null>(preset?.activityId && ACTIVITY_BY_ID[preset.activityId] ? preset.activityId : null);
  const [minutes, setMinutes] = useState(isSport ? 60 : 45);
  const [withIds, setWithIds] = useState<string[]>(() => (preset?.withIds ?? []).filter(id => friends.some(f => f.id === id)));
  const [result, setResult] = useState('');
  const [error, setError] = useState('');

  const dirty = !!activityId || withIds.length > 0 || !!result.trim();
  const discard = useCallback(() => (dirty ? confirmDiscard(onDiscard) : onDiscard()), [dirty, onDiscard]);
  useBackGuard(true, discard);

  const activity = activityId ? ACTIVITY_BY_ID[activityId] : null;

  function next() {
    if (!activity) { setError(isSport ? 'Pick what you played.' : 'Pick an activity.'); return; }
    const durationSec = minutes * 60;
    const startedAt = new Date(Date.now() - durationSec * 1000).toISOString();
    const stats = [{ label: 'Time', value: formatDuration(durationSec) }];
    if (isSport) {
      stats.push({ label: 'Played with', value: String(withIds.length) });
      onFinish({ draft: { kind: 'sport', activityId: activity.id, withIds, result: result.trim() || undefined, durationSec, startedAt }, stats, activityName: activity.name });
    } else {
      onFinish({ draft: { kind: activity.kind === 'class' ? 'class' : 'other', activityId: activity.id, durationSec, startedAt }, stats, activityName: activity.name });
    }
  }

  const toggle = (id: string) => setWithIds(ids => (ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id]));
  const title = suggestTitle(isSport ? 'sport' : 'class', new Date(), activity?.name);

  return (
    <View style={styles.root}>
      <LoggerHeader eyebrow={isSport ? 'Sport · log a game' : 'Class or other'} title={activity ? title : isSport ? 'What did you play?' : 'What did you do?'} onClose={discard} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
        <SectionLabel>{isSport ? 'Sport' : 'Activity'}</SectionLabel>
        <ActivityPicker activities={options} selected={activityId} onSelect={id => { setActivityId(id); setError(''); }} />
        {error ? <Text variant="small" color="danger" style={styles.error}>{error}</Text> : null}

        <SectionLabel>How long</SectionLabel>
        <DurationPicker minutes={minutes} onChange={setMinutes} />

        {isSport ? (
          <>
            <SectionLabel right={withIds.length ? <Text variant="smallStrong" color="accentText">{withIds.length} tagged</Text> : undefined}>Played with</SectionLabel>
            {friends.length === 0 ? (
              <View style={styles.noFriends}>
                <Icon name="people-outline" size={20} color="faint" />
                <Text variant="small" color="muted" style={styles.flex}>Follow classmates to tag them in your games.</Text>
              </View>
            ) : (
              <View style={styles.people}>
                {friends.map(f => {
                  const on = withIds.includes(f.id);
                  return (
                    <Pressable key={f.id} accessibilityRole="checkbox" accessibilityState={{ checked: on }} accessibilityLabel={`${f.firstName} ${f.lastName}`}
                      onPress={() => toggle(f.id)} style={({ pressed }) => [styles.person, pressed && styles.pressed]}>
                      <Avatar student={f} size={36} />
                      <View style={styles.flex}>
                        <Text variant="bodyStrong">{f.firstName} {f.lastName}</Text>
                        <Text variant="tiny" color="muted">{f.classYear}</Text>
                      </View>
                      <View style={[styles.box, on && styles.boxOn]}>{on ? <Icon name="checkmark" size={16} color="onBoard" /> : null}</View>
                    </Pressable>
                  );
                })}
              </View>
            )}
            <SectionLabel>Result (optional)</SectionLabel>
            <Input value={result} onChangeText={setResult} placeholder="W 21-17, or 'ran 5 games'" maxLength={40} returnKeyType="done" />
          </>
        ) : null}

        <Button label="Continue" block onPress={next} style={styles.cta} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  content: { paddingHorizontal: gutter, paddingBottom: space.x4 },
  error: { marginTop: space.sm },
  noFriends: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg, borderRadius: radius.md, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.line },
  people: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line, overflow: 'hidden' },
  person: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, minHeight: minTouch + 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  pressed: { backgroundColor: colors.sunken },
  box: { width: 24, height: 24, borderRadius: radius.sm, borderWidth: 1.5, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  boxOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  cta: { marginTop: space.x3 },
});
