import React from 'react';
import { StyleSheet, View } from 'react-native';
import type { TabScreenProps } from '../navigation/types';
import { useMe, useStore } from '../data/store';
import { spotsLeft, upcomingMeetups } from '../data/selectors';
import { activityName } from '../data/activities';
import { Button, Card, EmptyState, Icon, Screen, Text } from '../ui';
import { space } from '../theme';

// PLACEHOLDER - owned by the Meetups feature agent.
export function MeetupsScreen({ navigation }: TabScreenProps<'Meetups'>) {
  const { state } = useStore();
  const me = useMe();
  const meetups = upcomingMeetups(state, me.schoolId);
  return (
    <Screen title="Meetups" action={<Button label="Post" icon="add" size="sm" onPress={() => navigation.navigate('CreateMeetup')} />}>
      {meetups.length === 0 ? <EmptyState icon="calendar-clear-outline" title="Nothing scheduled" body="Post a pickup game or a group run." /> : null}
      <View style={styles.list}>
        {meetups.map(m => (
          <Card key={m.id} onPress={() => navigation.navigate('MeetupDetail', { meetupId: m.id })}>
            <Text variant="eyebrow" color="accent">{activityName(m.activityId)}</Text>
            <Text variant="h2">{m.title}</Text>
            <View style={styles.row}>
              <Icon name="location-outline" size={14} color="muted" />
              <Text variant="small" color="muted">{m.location} · {new Date(m.startsAt).toLocaleString(undefined, { weekday: 'short', hour: 'numeric', minute: '2-digit' })}</Text>
            </View>
            <Text variant="smallStrong">{spotsLeft(m)} spots left</Text>
          </Card>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({ list: { gap: space.md }, row: { flexDirection: 'row', alignItems: 'center', gap: space.xs, marginVertical: space.xs } });
