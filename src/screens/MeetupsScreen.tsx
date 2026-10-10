import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, SectionList, StyleSheet, View } from 'react-native';
import type { TabScreenProps } from '../navigation/types';
import { useMe, useStore } from '../data/store';
import { studentById, upcomingMeetups } from '../data/selectors';
import { SCHOOL_BY_ID } from '../data/schools';
import type { Meetup, Student } from '../data/types';
import { Button, Chip, EmptyState, Icon, Screen, Text, attempt } from '../ui';
import { colors, gutter, radius, space } from '../theme';
import { MeetupCard } from '../meetups/components';
import { FILTERS, FILTER_LABEL, filterMeetups, formatDate, groupMeetupsByDay, meetupRole } from '../meetups/logic';
import type { MeetupFilter, MeetupSection } from '../meetups/logic';
import { useNow } from '../meetups/useNow';

export function MeetupsScreen({ navigation }: TabScreenProps<'Meetups'>) {
  const { state, actions, ready, storageError } = useStore();
  const me = useMe();
  const now = useNow();
  const [filter, setFilter] = useState<MeetupFilter>('all');

  const all = useMemo(() => upcomingMeetups(state, me.schoolId, now), [state, me.schoolId, now]);
  const goingCount = useMemo(() => all.filter(m => m.attendeeIds.includes(me.id)).length, [all, me.id]);
  const sections = useMemo(() => groupMeetupsByDay(filterMeetups(all, filter, me.id), now), [all, filter, me.id, now]);
  const school = SCHOOL_BY_ID[me.schoolId];

  const people = useCallback((m: Meetup) => m.attendeeIds.map(id => studentById(state, id)).filter((s): s is Student => !!s), [state]);
  const post = () => navigation.navigate('CreateMeetup');

  const toggle = (m: Meetup) => {
    const role = meetupRole(m, me.id, now);
    if (role === 'going') attempt(() => actions.leaveMeetup(m.id), "Couldn't leave");
    else if (role === 'open') attempt(() => actions.joinMeetup(m.id), "Couldn't join");
  };

  const header = (
    <View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters} style={styles.filterBar}>
        {FILTERS.map(f => (
          <Chip key={f} selected={filter === f} onPress={() => setFilter(f)}
            icon={f === 'going' ? 'checkmark-circle-outline' : undefined}
            label={f === 'going' && goingCount ? `${FILTER_LABEL[f]} ${goingCount}` : FILTER_LABEL[f]} />
        ))}
      </ScrollView>
      {storageError ? (
        <View style={styles.notice}>
          <Icon name="alert-circle-outline" size={16} color="danger" />
          <Text variant="small" color="danger" style={styles.flex}>{storageError}</Text>
        </View>
      ) : null}
    </View>
  );

  const empty = all.length === 0
    ? <EmptyState icon="calendar-clear-outline" title="Nothing on the board" body="Nobody has posted yet. Post a pickup game or a group run and your campus can join in one tap." />
    : filter === 'going'
      ? <EmptyState icon="checkmark-circle-outline" title="You're not in any yet" body="Tap Join on a meetup and it shows up here." />
      : <EmptyState icon="search-outline" title={`No ${FILTER_LABEL[filter].toLowerCase()} meetups`} body="Be the first. Post one and see who shows up." />;

  return (
    <Screen
      scroll={false}
      title="Meetups"
      eyebrow={school ? `${school.shortName} · ${all.length} upcoming` : `${all.length} upcoming`}
      action={<Button label="Post a meetup" icon="add" size="sm" onPress={post} accessibilityHint="Start a pickup game or group workout" />}>
      {!ready ? (
        <View style={styles.loading}><ActivityIndicator color={colors.muted} /></View>
      ) : (
        <SectionList<Meetup, MeetupSection>
          sections={sections}
          keyExtractor={m => m.id}
          ListHeaderComponent={header}
          ListEmptyComponent={empty}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={styles.content}
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHeader} accessibilityRole="header">
              <Text variant="h2">{section.title}</Text>
              <Text variant="eyebrow" color="muted">
                {section.key === 'today' || section.key === 'tomorrow' ? `${formatDate(section.data[0].startsAt)} · ` : ''}
                {section.data.length} {section.data.length === 1 ? 'meetup' : 'meetups'}
              </Text>
            </View>
          )}
          renderItem={({ item }) => (
            <MeetupCard
              meetup={item}
              host={studentById(state, item.hostId)}
              attendees={people(item)}
              role={meetupRole(item, me.id, now)}
              now={now}
              onPress={() => navigation.navigate('MeetupDetail', { meetupId: item.id })}
              onToggle={() => toggle(item)}
            />
          )}
          ItemSeparatorComponent={Separator}
        />
      )}
    </Screen>
  );
}

function Separator() {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: gutter, paddingBottom: space.x4 },
  filterBar: { marginHorizontal: -gutter },
  filters: { gap: space.sm, paddingHorizontal: gutter, paddingBottom: space.xs },
  notice: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.md, padding: space.md, borderRadius: radius.md, backgroundColor: colors.dangerSoft },
  sectionHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: space.md, paddingTop: space.xxl, paddingBottom: space.md },
  separator: { height: space.md },
});
