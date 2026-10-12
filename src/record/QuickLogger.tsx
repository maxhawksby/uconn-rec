import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { gutter, space } from '../theme';
import { Button, Input, Text } from '../ui';
import { ACTIVITIES, ACTIVITY_BY_ID } from '../data/activities';
import { formatDuration } from '../data/selectors';
import { suggestTitle } from './math';
import { ActivityPicker, DurationPicker, LoggerHeader, SectionLabel } from './parts';
import { confirmDiscard, useBackGuard, type Finished } from './session';

export type QuickMode = 'sport' | 'session';

type Props = {
  mode: QuickMode;
  preset?: { activityId?: string; tagIds?: string[] }; // tagIds: last time's teammates, preselected at Save
  interests: string[];
  onFinish: (f: Finished) => void;
  onDiscard: () => void;
};

/** Pickup games, intramurals, classes and everything else: activity + duration. Who you played with is tagged at Save. */
export function QuickLogger({ mode, preset, interests, onFinish, onDiscard }: Props) {
  const isSport = mode === 'sport';
  const options = useMemo(() => {
    const list = ACTIVITIES.filter(a => (isSport ? a.kind === 'sport' : a.kind === 'class' || a.kind === 'other'));
    // The student's interests first, then catalog order.
    return [...list.filter(a => interests.includes(a.id)), ...list.filter(a => !interests.includes(a.id))];
  }, [isSport, interests]);

  const [activityId, setActivityId] = useState<string | null>(preset?.activityId && ACTIVITY_BY_ID[preset.activityId] ? preset.activityId : null);
  const [minutes, setMinutes] = useState(isSport ? 60 : 45);
  const [result, setResult] = useState('');
  const [error, setError] = useState('');

  const dirty = !!activityId || !!result.trim();
  const discard = useCallback(() => (dirty ? confirmDiscard(onDiscard) : onDiscard()), [dirty, onDiscard]);
  useBackGuard(true, discard);

  const activity = activityId ? ACTIVITY_BY_ID[activityId] : null;

  function next() {
    if (!activity) { setError(isSport ? 'Pick what you played.' : 'Pick an activity.'); return; }
    const durationSec = minutes * 60;
    const startedAt = new Date(Date.now() - durationSec * 1000).toISOString();
    const stats = [{ label: 'Time', value: formatDuration(durationSec) }];
    const tagIds = preset?.tagIds;
    if (isSport) {
      onFinish({ draft: { kind: 'sport', activityId: activity.id, result: result.trim() || undefined, durationSec, startedAt }, stats, activityName: activity.name, tagIds });
    } else {
      onFinish({ draft: { kind: activity.kind === 'class' ? 'class' : 'other', activityId: activity.id, durationSec, startedAt }, stats, activityName: activity.name, tagIds });
    }
  }

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
  content: { paddingHorizontal: gutter, paddingBottom: space.x4 },
  error: { marginTop: space.sm },
  cta: { marginTop: space.x3 },
});
