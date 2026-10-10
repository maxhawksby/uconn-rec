import React from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import type { TabScreenProps } from '../navigation/types';
import { useMe, useStore } from '../data/store';
import { formatDuration, profileStats } from '../data/selectors';
import { Avatar, Button, SchoolBadge, Screen, Scoreboard, Text } from '../ui';
import { space } from '../theme';

// PLACEHOLDER - owned by the Groups/Profile feature agent (PRs, history, edit profile).
export function ProfileScreen(_: TabScreenProps<'Profile'>) {
  const { state, actions } = useStore();
  const me = useMe();
  const stats = profileStats(state, me.id);
  return (
    <Screen>
      <View style={styles.head}>
        <Avatar student={me} size={64} />
        <Text variant="title">{me.firstName} {me.lastName}</Text>
        <SchoolBadge schoolId={me.schoolId} />
      </View>
      <Scoreboard stats={[
        { label: 'Streak', value: String(stats.streakDays), unit: 'days' },
        { label: 'This week', value: String(stats.week.sessions), unit: 'sessions' },
        { label: 'Active', value: formatDuration(stats.week.activeSec) },
      ]} />
      <View style={styles.actions}>
        <Button label="Sign out" variant="secondary" onPress={() => actions.signOut()} />
        <Button label="Reset demo data" variant="danger" onPress={() => Alert.alert('Reset demo?', 'This erases everything on this device.', [
          { text: 'Cancel', style: 'cancel' }, { text: 'Reset', style: 'destructive', onPress: () => actions.resetDemo() },
        ])} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { gap: space.sm, paddingTop: space.xxl, paddingBottom: space.xl },
  actions: { gap: space.md, marginTop: space.x3 },
});
