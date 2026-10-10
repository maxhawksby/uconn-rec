import React from 'react';
import type { RootScreenProps } from '../navigation/types';
import { useMe, useStore } from '../data/store';
import { isFollowing, studentById } from '../data/selectors';
import { Button, EmptyState, SchoolBadge, Screen, attempt } from '../ui';

// PLACEHOLDER - owned by the Groups/Profile feature agent.
export function StudentProfileScreen({ route }: RootScreenProps<'StudentProfile'>) {
  const { state, actions } = useStore();
  const me = useMe();
  const student = studentById(state, route.params.studentId);
  if (!student) return <Screen edges={[]}><EmptyState title="Student not found" /></Screen>;
  const following = isFollowing(state, me.id, student.id);
  return (
    <Screen edges={[]} title={`${student.firstName} ${student.lastName}`} eyebrow={student.classYear}>
      <SchoolBadge schoolId={student.schoolId} />
      {student.id !== me.id ? (
        <Button label={following ? 'Following' : 'Follow'} variant={following ? 'secondary' : 'primary'}
          onPress={() => attempt(() => (following ? actions.unfollow(student.id) : actions.follow(student.id)))} />
      ) : null}
    </Screen>
  );
}
