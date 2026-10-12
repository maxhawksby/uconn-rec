import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import type { RootScreenProps } from '../navigation/types';
import { useMe, useStore } from '../data/store';
import { awardsFor, followerIds, followingIds, isAdmin, isFollowing, studentById, workoutsFor } from '../data/selectors';
import { Button, EmptyState, Screen, Text, attempt } from '../ui';
import { space } from '../theme';
import { GroupCard, SectionHeader } from '../groups/parts';
import { groupsInCommon, sharedInterests, statsFor } from '../profile/model';
import { InterestChips, ListCard, RecordsList, StatBoard, WorkoutRow } from '../profile/parts';
import { ProfileHeader } from '../profile/ProfileHeader';
import { AwardList, AwardSheet } from '../profile/awards';

const PREVIEW_HISTORY = 8;

export function StudentProfileScreen({ route, navigation }: RootScreenProps<'StudentProfile'>) {
  const { state, actions } = useStore();
  const me = useMe();
  const [allHistory, setAllHistory] = useState(false);
  const [awarding, setAwarding] = useState(false);
  const student = studentById(state, route.params.studentId);

  if (!student) {
    return (
      <Screen edges={['bottom']}>
        <EmptyState icon="person-outline" title="Student not found" body="This account may have been removed." actionLabel="Go back" onAction={() => navigation.goBack()} />
      </Screen>
    );
  }

  const isMe = student.id === me.id;
  const following = isFollowing(state, me.id, student.id);
  const followsMe = isFollowing(state, student.id, me.id);
  const stats = statsFor(state, student.id, me.id);
  const visible = workoutsFor(state, student.id, me.id);
  const shown = allHistory ? visible : visible.slice(0, PREVIEW_HISTORY);
  const shared = sharedInterests(student, me);
  const common = groupsInCommon(state, me.id, student.id);
  const first = student.firstName;
  const admin = isAdmin(state, me.id);
  const awards = awardsFor(state, student.id);

  const toggleFollow = () => attempt(() => (following ? actions.unfollow(student.id) : actions.follow(student.id)), following ? "Couldn't unfollow" : "Couldn't follow");

  return (
    <Screen edges={['bottom']}>
      <View style={styles.top}>
        <ProfileHeader student={student} tag={followsMe && !isMe ? 'Follows you' : undefined}
          counts={[
            { label: 'Workouts', value: stats.totalSessions },
            { label: 'Followers', value: followerIds(state, student.id).length },
            { label: 'Following', value: followingIds(state, student.id).length },
          ]}
          action={isMe ? undefined : (
            <Button label={following ? 'Following' : followsMe ? 'Follow back' : 'Follow'} icon={following ? 'checkmark' : 'person-add-outline'}
              variant={following ? 'secondary' : 'primary'} onPress={toggleFollow}
              accessibilityHint={following ? `Unfollow ${first}` : `See ${first}'s friends-only workouts in your feed`} />
          )} />
      </View>

      <StatBoard stats={stats} />
      {!isMe ? <Text variant="tiny" color="muted" style={styles.caption}>Based on workouts {first} shares with you.</Text> : null}

      {awards.length || (admin && student.schoolId === me.schoolId) ? (
        <>
          <SectionHeader title="Awards" count={awards.length} actionLabel={admin ? 'Give award' : undefined} onAction={() => setAwarding(true)} />
          {awards.length ? (
            <AwardList state={state} studentId={student.id} canRevoke={admin}
              onRevoke={awardId => attempt(() => actions.revokeAward({ studentId: student.id, awardId }), "Couldn't take it back")} />
          ) : (
            <Text variant="small" color="muted">No awards yet.</Text>
          )}
        </>
      ) : null}

      {!isMe ? (
        <>
          <SectionHeader title="In common" />
          {shared.length || common.length ? (
            <View style={styles.common}>
              {shared.length ? (
                <View style={styles.block}>
                  <Text variant="small" color="muted">You both do</Text>
                  <InterestChips ids={shared} highlight={shared} />
                </View>
              ) : null}
              {common.length ? (
                <View style={styles.block}>
                  <Text variant="small" color="muted">{common.length === 1 ? 'Group you share' : `${common.length} groups you share`}</Text>
                  {common.map(g => (
                    <GroupCard key={g.id} group={g} members={[]} onPress={() => navigation.navigate('GroupDetail', { groupId: g.id })} />
                  ))}
                </View>
              ) : null}
            </View>
          ) : (
            <Text variant="small" color="muted">No shared interests or groups yet. A meetup is a good start.</Text>
          )}
        </>
      ) : null}

      {student.interests.length > shared.length || isMe ? (
        <>
          <SectionHeader title="Interests" count={student.interests.length} />
          <InterestChips ids={student.interests} highlight={isMe ? undefined : shared} />
        </>
      ) : null}

      {stats.prs.length ? (
        <>
          <SectionHeader title="Personal records" count={stats.prs.length} />
          <RecordsList prs={stats.prs.slice(0, 5)} onPress={pr => navigation.navigate('WorkoutDetail', { workoutId: pr.workoutId })} />
        </>
      ) : null}

      <SectionHeader title="Workouts" count={visible.length}
        actionLabel={visible.length > PREVIEW_HISTORY ? (allHistory ? 'Show fewer' : 'Show all') : undefined} onAction={() => setAllHistory(v => !v)} />
      {shown.length ? (
        <ListCard>
          {shown.map((w, i) => (
            <WorkoutRow key={w.id} workout={w} last={i === shown.length - 1} onPress={() => navigation.navigate('WorkoutDetail', { workoutId: w.id })} />
          ))}
        </ListCard>
      ) : (
        <EmptyState icon="eye-off-outline" title="Nothing to show"
          body={following || isMe ? `${first} hasn't shared a workout with you yet.` : `Follow ${first} to see workouts they share with friends.`} />
      )}
      {admin ? <AwardSheet visible={awarding} student={student} onClose={() => setAwarding(false)} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { paddingTop: space.sm },
  caption: { marginTop: space.sm },
  common: { gap: space.xl },
  block: { gap: space.sm },
});
