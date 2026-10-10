import React, { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors, minTouch, radius, space } from '../theme';
import { Button, EmptyState, Icon, Screen, Text } from '../ui';
import type { Workout } from '../data/types';
import { ACTIVITY_BY_ID, activityName } from '../data/activities';
import { formatDistance, formatDuration, relativeTime } from '../data/selectors';

export type StartKind = 'lift' | 'run' | 'ride' | 'sport' | 'session';

type Props = { history: Workout[]; onStart: (kind: StartKind) => void; onRepeat: (w: Workout) => void };

const TILES: { kind: StartKind; label: string; body: string; icon: string }[] = [
  { kind: 'run', label: 'Run', body: 'GPS route and pace', icon: 'walk-outline' },
  { kind: 'ride', label: 'Ride', body: 'GPS route and speed', icon: 'bicycle-outline' },
  { kind: 'sport', label: 'Sport', body: 'Pickup and intramurals', icon: 'basketball-outline' },
  { kind: 'session', label: 'Class / other', body: 'Yoga, spin, climbing...', icon: 'leaf-outline' },
];

/** One row per distinct thing the student does, newest first. */
function recentStarts(history: Workout[], limit = 5) {
  const seen = new Set<string>();
  const out: Workout[] = [];
  for (const w of history) {
    const key = w.kind === 'lift' ? `lift:${w.exercises.map(e => e.name.toLowerCase()).sort().join('|')}`
      : 'activityId' in w ? `${w.kind}:${w.activityId}` : w.kind;
    if (seen.has(key)) continue;
    seen.add(key); out.push(w);
    if (out.length === limit) break;
  }
  return out;
}

function iconFor(w: Workout) {
  if (w.kind === 'lift') return 'barbell-outline';
  if (w.kind === 'run') return 'walk-outline';
  if (w.kind === 'ride') return 'bicycle-outline';
  if (!('activityId' in w)) return 'fitness-outline';
  return ACTIVITY_BY_ID[w.activityId]?.icon ?? 'fitness-outline';
}

function metaFor(w: Workout) {
  if (w.kind === 'lift') return `${w.exercises.length} exercise${w.exercises.length === 1 ? '' : 's'} · ${w.exercises.slice(0, 2).map(e => e.name).join(', ')}`;
  if (!('activityId' in w)) return `${formatDistance(w.distanceKm)} · ${formatDuration(w.durationSec)}`;
  return `${activityName(w.activityId)} · ${formatDuration(w.durationSec)}`;
}

export function StartView({ history, onStart, onRepeat }: Props) {
  const recent = useMemo(() => recentStarts(history), [history]);
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  return (
    <Screen eyebrow={today} title="Record">
      <View style={styles.hero}>
        <View style={styles.heroText}>
          <Text variant="statLabel" color="onBoardMuted">Lifting</Text>
          <Text variant="title" color="onBoard">Start a lift</Text>
          <Text variant="small" color="onBoardMuted">Live timer, sets and reps, rest timer. Last session's numbers fill in as a guide.</Text>
        </View>
        <Button label="Start lift" icon="barbell-outline" block onPress={() => onStart('lift')} />
      </View>

      <View style={styles.grid}>
        {TILES.map(t => (
          <Pressable key={t.kind} accessibilityRole="button" accessibilityLabel={`${t.label}. ${t.body}`} onPress={() => onStart(t.kind)}
            style={({ pressed }) => [styles.tile, pressed && styles.pressed]}>
            <Icon name={t.icon} size={24} color="ink" />
            <View>
              <Text variant="h2">{t.label}</Text>
              <Text variant="tiny" color="muted">{t.body}</Text>
            </View>
          </Pressable>
        ))}
      </View>

      <Text variant="eyebrow" color="muted" style={styles.section}>Start again</Text>
      {recent.length === 0 ? (
        <View style={styles.emptyBox}>
          <EmptyState icon="refresh-outline" title="Nothing to repeat yet" body="Your last few workouts will show up here so you can start them again in one tap." />
        </View>
      ) : (
        <View style={styles.list}>
          {recent.map((w, i) => (
            <Pressable key={w.id} accessibilityRole="button" accessibilityLabel={`Start again: ${w.title}`} onPress={() => onRepeat(w)}
              style={({ pressed }) => [styles.row, i > 0 && styles.rowDivider, pressed && styles.pressed]}>
              <View style={styles.rowIcon}><Icon name={iconFor(w)} size={20} color="inkSoft" /></View>
              <View style={styles.flex}>
                <Text variant="bodyStrong" numberOfLines={1}>{w.title}</Text>
                <Text variant="tiny" color="muted" numberOfLines={1}>{metaFor(w)}</Text>
              </View>
              <Text variant="tiny" color="faint">{relativeTime(w.startedAt)}</Text>
              <Icon name="play-circle-outline" size={24} color="inkSoft" />
            </Pressable>
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  hero: { backgroundColor: colors.board, borderRadius: radius.md, padding: space.xl, gap: space.xl },
  heroText: { gap: space.xs },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md, marginTop: space.md },
  tile: { flexBasis: '47%', flexGrow: 1, gap: space.lg, padding: space.lg, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line },
  pressed: { backgroundColor: colors.sunken },
  section: { marginTop: space.x3, marginBottom: space.md },
  emptyBox: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line },
  list: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, minHeight: minTouch + 20 },
  rowDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
  rowIcon: { width: 36, height: 36, borderRadius: radius.sm, backgroundColor: colors.sunken, alignItems: 'center', justifyContent: 'center' },
});
