import React from 'react';
import { StyleSheet, View } from 'react-native';
import type { RootScreenProps } from '../navigation/types';
import { useMe, useStore } from '../data/store';
import { studentById, workoutById } from '../data/selectors';
import { EmptyState, Screen, Text } from '../ui';
import { space } from '../theme';

// PLACEHOLDER - owned by the Feed feature agent (full stats, kudos list, comment thread).
export function WorkoutDetailScreen({ route }: RootScreenProps<'WorkoutDetail'>) {
  const { state } = useStore();
  const me = useMe();
  const item = workoutById(state, route.params.workoutId, me.id);
  if (!item) return <Screen edges={[]}><EmptyState title="Workout not found" body="It may have been deleted or made private." /></Screen>;
  return (
    <Screen edges={[]} title={item.workout.title} eyebrow={`${item.author.firstName} ${item.author.lastName}`}>
      <View style={styles.list}>
        {item.comments.map(c => <Text key={c.id} variant="small"><Text variant="smallStrong">{studentById(state, c.studentId)?.firstName}: </Text>{c.body}</Text>)}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({ list: { gap: space.sm } });
