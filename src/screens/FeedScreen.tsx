import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import type { TabScreenProps } from '../navigation/types';
import { useMe, useStore } from '../data/store';
import { feed, formatDistance, formatDuration, relativeTime } from '../data/selectors';
import { SCHOOL_BY_ID } from '../data/schools';
import { Avatar, Card, Chip, EmptyState, Screen, Scoreboard, Text } from '../ui';
import { space } from '../theme';

// PLACEHOLDER - owned by the Feed feature agent (kudos, comments, rich workout cards).
export function FeedScreen({ navigation }: TabScreenProps<'Feed'>) {
  const { state } = useStore();
  const me = useMe();
  const [scope, setScope] = useState<'following' | 'campus'>('following');
  const items = feed(state, me.id, scope);
  return (
    <Screen eyebrow={SCHOOL_BY_ID[me.schoolId]?.shortName} title="Feed">
      <View style={styles.filters}>
        <Chip label="Following" selected={scope === 'following'} onPress={() => setScope('following')} />
        <Chip label="Campus" selected={scope === 'campus'} onPress={() => setScope('campus')} />
      </View>
      {items.length === 0 ? <EmptyState icon="people-outline" title="Quiet so far" body="Follow classmates or switch to Campus to see workouts." /> : null}
      <View style={styles.list}>
        {items.map(({ workout: w, author, kudosCount }) => (
          <Card key={w.id} onPress={() => navigation.navigate('WorkoutDetail', { workoutId: w.id })}>
            <View style={styles.row}>
              <Avatar student={author} size={36} />
              <View style={styles.flex}>
                <Text variant="bodyStrong">{author.firstName} {author.lastName}</Text>
                <Text variant="tiny" color="muted">{relativeTime(w.startedAt)} · {kudosCount} kudos</Text>
              </View>
            </View>
            <Text variant="h2" style={styles.title}>{w.title}</Text>
            <Scoreboard compact stats={[
              { label: 'Time', value: formatDuration(w.durationSec) },
              ...(w.kind === 'run' || w.kind === 'ride' ? [{ label: 'Distance', value: formatDistance(w.distanceKm) }] : []),
            ]} />
          </Card>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  filters: { flexDirection: 'row', gap: space.sm, marginBottom: space.lg },
  list: { gap: space.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  flex: { flex: 1 },
  title: { marginVertical: space.md },
});
