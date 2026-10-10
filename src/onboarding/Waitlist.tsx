import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { colors, radius, space } from '../theme';
import { Button, Scoreboard, Text } from '../ui';
import type { School } from '../data/types';
import { StatusLine, StepFrame } from './parts';

// End of the line for non-pilot schools: the student is saved to the waitlist and sees how
// close their campus is to opening. Inviting is visual only in the pitch build.

type Props = {
  school: School;
  email: string;
  status: { count: number; unlockAt: number; position: number | null };
  onStartOver: () => void;
};

const TICKS = 10;

export function Waitlist({ school, email, status, onStartOver }: Props) {
  const [invited, setInvited] = useState(false);
  const { count, unlockAt, position } = status;
  const left = Math.max(0, unlockAt - count);
  const pct = Math.min(1, count / unlockAt);

  return (
    <StepFrame
      onBack={onStartOver}
      eyebrow={`${school.name} · Waitlist`}
      title="You're on the list"
      lede={`Your campus unlocks at ${unlockAt} students, ${count} joined. We'll email ${email} the day ${school.shortName} opens.`}
      footer={
        <>
          <Button label="Invite classmates" icon="share-social-outline" onPress={() => setInvited(true)} block />
          <Button label="Use a different school" variant="ghost" onPress={onStartOver} block />
        </>
      }>
      <Scoreboard key="board" stats={[
        { label: 'Joined', value: String(count) },
        { label: 'Unlock at', value: String(unlockAt) },
        { label: 'Your spot', value: position ? `#${position}` : '-' },
      ]} />

      <View key="meter" style={styles.meter}>
        <View style={styles.meterHead}>
          <Text variant="eyebrow" color="ink">{school.shortName} progress</Text>
          <Text variant="eyebrow" color="muted">{left ? `${left} to go` : 'Unlocking soon'}</Text>
        </View>
        <View style={styles.track} accessible accessibilityRole="progressbar" accessibilityLabel={`${count} of ${unlockAt} students joined`}
          accessibilityValue={{ min: 0, max: unlockAt, now: count }}>
          <View style={[styles.fill, { width: `${pct * 100}%` }]} />
          {Array.from({ length: TICKS - 1 }, (_, i) => (
            <View key={i} style={[styles.tick, { left: `${((i + 1) / TICKS) * 100}%` }]} />
          ))}
        </View>
        <View style={styles.scale}>
          <Text variant="statLabel" color="faint">0</Text>
          <Text variant="statLabel" color="faint">{unlockAt}</Text>
        </View>
      </View>

      <View key="why" style={styles.why}>
        <Text variant="h2">Why wait?</Text>
        <Text variant="body" color="inkSoft">
          Dean's Lift works when your friends are on it. We open a campus once enough students join, so the feed, meetups and crews are busy from day one.
        </Text>
      </View>

      {invited ? (
        <View key="invited" style={styles.note}>
          <StatusLine tone="turf" icon="checkmark-circle">
            Thanks. Invite links arrive when we open more campuses. Until then, tell friends to search {school.shortName} in the app.
          </StatusLine>
        </View>
      ) : null}
    </StepFrame>
  );
}

const styles = StyleSheet.create({
  meter: { gap: space.sm },
  meterHead: { flexDirection: 'row', justifyContent: 'space-between' },
  track: { height: space.md, borderRadius: radius.sm, backgroundColor: colors.sunken, overflow: 'hidden' },
  fill: { position: 'absolute', top: 0, bottom: 0, left: 0, backgroundColor: colors.ink },
  tick: { position: 'absolute', top: 0, bottom: 0, width: StyleSheet.hairlineWidth * 2, backgroundColor: colors.bg },
  scale: { flexDirection: 'row', justifyContent: 'space-between' },
  why: { gap: space.sm },
  note: { backgroundColor: colors.turfSoft, borderRadius: radius.md, padding: space.md },
});
