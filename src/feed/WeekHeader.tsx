import React from 'react';
import { StyleSheet, View } from 'react-native';
import type { ProfileStats } from '../data/types';
import { Button, Card, Scoreboard, Text } from '../ui';
import { space } from '../theme';
import { formatDistance } from '../data/selectors';
import { compactNumber, durationParts } from './model';

type Props = { stats: ProfileStats; onRecord: () => void };

/** This week's numbers on the scoreboard, plus a nudge to Record when the week is empty. */
export function WeekHeader({ stats, onRecord }: Props) {
  const { week, streakDays } = stats;
  const active = durationParts(week.activeSec);
  const empty = week.sessions === 0;
  return (
    <View style={styles.wrap}>
      <View style={styles.label}>
        <Text variant="eyebrow" color="muted">Your week</Text>
        {week.distanceKm > 0 || week.liftVolume > 0 ? (
          <Text variant="tiny" color="muted">
            {[week.distanceKm > 0 ? formatDistance(week.distanceKm) : '', week.liftVolume > 0 ? `${compactNumber(week.liftVolume)} lb lifted` : ''].filter(Boolean).join(' · ')}
          </Text>
        ) : null}
      </View>
      <Scoreboard stats={[
        { label: 'Sessions', value: String(week.sessions) },
        { label: 'Active', value: active.value, unit: active.unit },
        { label: 'Streak', value: String(streakDays), unit: streakDays === 1 ? 'day' : 'days' },
      ]} />
      {empty ? (
        <Card style={styles.nudge}>
          <View style={styles.nudgeText}>
            <Text variant="bodyStrong">Nothing logged this week</Text>
            <Text variant="small" color="muted">A lift, a run, a pickup game - it all counts. Log one to get on the board.</Text>
          </View>
          <Button label="Record" icon="add" size="sm" onPress={onRecord} />
        </Card>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.sm, marginBottom: space.xxl },
  label: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: space.md },
  nudge: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginTop: space.xs },
  nudgeText: { flex: 1, gap: space.xxs },
});
