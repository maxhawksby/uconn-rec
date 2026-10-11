import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { TabScreenProps } from '../navigation/types';
import type { FeedItem } from '../data/types';
import { useMe, useStore } from '../data/store';
import { feed, profileStats } from '../data/selectors';
import { SCHOOL_BY_ID } from '../data/schools';
import { Chip, EmptyState, Icon, Screen, Text } from '../ui';
import { colors, gutter, radius, space } from '../theme';
import { WorkoutCard } from '../feed/WorkoutCard';
import { WeekHeader } from '../feed/WeekHeader';

type Scope = 'following' | 'campus';

export function FeedScreen({ navigation }: TabScreenProps<'Feed'>) {
  const { state, syncError } = useStore();
  const me = useMe();
  const school = SCHOOL_BY_ID[me.schoolId];
  const [scope, setScope] = useState<Scope>('following');
  const [now, setNow] = useState(() => new Date());
  const [refreshing, setRefreshing] = useState(false);
  const list = useRef<FlatList<FeedItem>>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const items = useMemo(() => feed(state, me.id, scope), [state, me.id, scope]);
  const stats = useMemo(() => profileStats(state, me.id, now), [state, me.id, now]);

  // Relative times ("2h") stay honest whenever the tab comes back into view.
  useFocusEffect(useCallback(() => { setNow(new Date()); }, []));
  useEffect(() => () => clearTimeout(timer.current), []);

  // M1 data is local, so a refresh just re-reads the store and the clock. The short beat
  // keeps the gesture feeling acknowledged instead of snapping shut.
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setNow(new Date());
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setRefreshing(false), 450);
  }, []);

  const pick = (next: Scope) => {
    if (next === scope) return;
    setScope(next);
    list.current?.scrollToOffset({ offset: 0, animated: false });
  };

  const record = () => navigation.navigate('Record');

  const header = (
    <View>
      {syncError ? (
        <View style={styles.banner} accessibilityRole="alert">
          <Icon name="cloud-offline-outline" size={16} color="danger" />
          <Text variant="small" color="danger" style={styles.flex}>{syncError}</Text>
        </View>
      ) : null}
      <WeekHeader stats={stats} onRecord={record} />
      <Text variant="eyebrow" color="muted" style={styles.section}>
        {scope === 'following' ? 'You and people you follow' : `Everyone at ${school?.shortName ?? 'your campus'}`}
      </Text>
    </View>
  );

  const empty = scope === 'following' ? (
    <EmptyState icon="people-outline" title="Your feed is quiet"
      body={`Follow classmates to see their workouts here, or see what everyone at ${school?.shortName ?? 'your campus'} is doing.`}
      actionLabel="Browse campus" onAction={() => pick('campus')} />
  ) : (
    <EmptyState icon="trophy-outline" title="No workouts yet"
      body={`Nobody at ${school?.shortName ?? 'your campus'} has posted. Log one and be first on the board.`}
      actionLabel="Record a workout" onAction={record} />
  );

  return (
    <Screen
      scroll={false}
      eyebrow={school?.shortName}
      title="Feed"
      action={
        <View style={styles.filters} accessibilityLabel="Feed filter">
          <Chip label="Following" selected={scope === 'following'} onPress={() => pick('following')} />
          <Chip label="Campus" selected={scope === 'campus'} onPress={() => pick('campus')} />
        </View>
      }>
      <FlatList
        ref={list}
        data={items}
        keyExtractor={i => i.workout.id}
        renderItem={({ item }) => <WorkoutCard item={item} state={state} now={now} />}
        ItemSeparatorComponent={Separator}
        ListHeaderComponent={header}
        ListEmptyComponent={empty}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.muted} colors={[colors.accent]} />}
        initialNumToRender={6}
        windowSize={9}
      />
    </Screen>
  );
}

function Separator() {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  filters: { flexDirection: 'row', gap: space.xs, paddingBottom: space.xxs },
  content: { paddingHorizontal: gutter, paddingBottom: space.x4, flexGrow: 1 },
  section: { marginBottom: space.sm },
  separator: { height: space.md },
  banner: {
    flexDirection: 'row', alignItems: 'center', gap: space.sm, padding: space.md, marginBottom: space.lg,
    backgroundColor: colors.dangerSoft, borderRadius: radius.md,
  },
});
