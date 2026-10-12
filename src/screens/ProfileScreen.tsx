import React, { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import type { TabScreenProps } from '../navigation/types';
import { useMe, useStore } from '../data/store';
import { awardsFor, followerIds, followingIds, myGroups, workoutsFor } from '../data/selectors';
import { Button, EmptyState, Screen, Text, attempt } from '../ui';
import { space } from '../theme';
import { SectionHeader } from '../groups/parts';
import { statsFor } from '../profile/model';
import { InterestChips, ListCard, RecordsList, StatBoard, SettingsRow, WorkoutRow } from '../profile/parts';
import { ProfileHeader } from '../profile/ProfileHeader';
import { EditProfileSheet } from '../profile/EditProfileSheet';
import { BadgeSheet } from '../profile/badges';
import { AwardList } from '../profile/awards';

const PREVIEW_PRS = 5;
const PREVIEW_HISTORY = 8;

export function ProfileScreen({ navigation }: TabScreenProps<'Profile'>) {
  const { state, actions, backend } = useStore();
  const me = useMe();
  const [editing, setEditing] = useState(false);
  const [editingBadges, setEditingBadges] = useState(false);
  const [allPrs, setAllPrs] = useState(false);
  const [allHistory, setAllHistory] = useState(false);

  const stats = statsFor(state, me.id, me.id);
  const history = workoutsFor(state, me.id, me.id);
  const prs = allPrs ? stats.prs : stats.prs.slice(0, PREVIEW_PRS);
  const shown = allHistory ? history : history.slice(0, PREVIEW_HISTORY);
  const openWorkout = (workoutId: string) => navigation.navigate('WorkoutDetail', { workoutId });

  function confirmReset() {
    Alert.alert('Reset demo data?', 'This erases your account, workouts and messages on this device and reloads the demo campus.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reset', style: 'destructive', onPress: () => attempt(() => actions.resetDemo(), "Couldn't reset") },
    ]);
  }
  function confirmSignOut() {
    Alert.alert('Sign out?', 'Your data stays on this device.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => attempt(() => actions.signOut(), "Couldn't sign out") },
    ]);
  }

  return (
    <Screen>
      <View style={styles.top}>
        <ProfileHeader student={me}
          counts={[
            { label: 'Workouts', value: stats.totalSessions },
            { label: 'Followers', value: followerIds(state, me.id).length },
            { label: 'Following', value: followingIds(state, me.id).length },
          ]}
          onEditBadges={() => setEditingBadges(true)}
          action={<Button label="Edit profile" icon="create-outline" variant="secondary" size="sm" onPress={() => setEditing(true)} />} />
      </View>

      <StatBoard stats={stats} />
      <Text variant="tiny" color="muted" style={styles.caption}>Week totals reset Monday. Streak counts days in a row with a workout.</Text>

      {awardsFor(state, me.id).length ? (
        <>
          <SectionHeader title="Awards" count={awardsFor(state, me.id).length} />
          <AwardList state={state} studentId={me.id} canRevoke={false} onRevoke={() => undefined} />
        </>
      ) : null}

      <SectionHeader title="Personal records" count={stats.prs.length}
        actionLabel={stats.prs.length > PREVIEW_PRS ? (allPrs ? 'Show fewer' : 'Show all') : undefined} onAction={() => setAllPrs(v => !v)} />
      {prs.length ? <RecordsList prs={prs} onPress={pr => openWorkout(pr.workoutId)} /> : (
        <Text variant="small" color="muted">No lifts logged yet. Your heaviest set for each exercise shows up here.</Text>
      )}

      <SectionHeader title="Workouts" count={history.length}
        actionLabel={history.length > PREVIEW_HISTORY ? (allHistory ? 'Show fewer' : 'Show all') : undefined} onAction={() => setAllHistory(v => !v)} />
      {shown.length ? (
        <ListCard>
          {shown.map((w, i) => <WorkoutRow key={w.id} workout={w} last={i === shown.length - 1} onPress={() => openWorkout(w.id)} />)}
        </ListCard>
      ) : (
        <EmptyState icon="barbell-outline" title="No workouts yet" body="Log your first session. Lifts, runs, pickup games and classes all count."
          actionLabel="Record a workout" onAction={() => navigation.navigate('Record')} />
      )}

      <SectionHeader title="Interests" count={me.interests.length} actionLabel="Edit" onAction={() => setEditing(true)} />
      {me.interests.length ? <InterestChips ids={me.interests} /> : (
        <Text variant="small" color="muted">Add a few so we can suggest people, groups and meetups.</Text>
      )}

      <SectionHeader title="Settings" />
      <ListCard>
        <SettingsRow icon="people-outline" label="Your groups" detail={`${myGroups(state, me.id).length} joined`} onPress={() => navigation.navigate('Groups')} />
        {backend === 'demo' ? (
          <SettingsRow icon="refresh-outline" label="Reset demo data" detail="Erase this device and reload the demo campus" danger onPress={confirmReset} />
        ) : null}
        <SettingsRow icon="log-out-outline" label="Sign out" onPress={confirmSignOut} last />
      </ListCard>
      <Text variant="tiny" color="faint" center style={styles.footnote}>Valence is independent and not affiliated with any school.</Text>

      <EditProfileSheet visible={editing} me={me} onClose={() => setEditing(false)} />
      <BadgeSheet visible={editingBadges} me={me} onClose={() => setEditingBadges(false)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { paddingTop: space.xxl },
  caption: { marginTop: space.sm },
  footnote: { marginTop: space.xxl },
});
