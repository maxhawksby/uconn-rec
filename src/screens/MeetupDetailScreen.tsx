import React from 'react';
import type { RootScreenProps } from '../navigation/types';
import { useMe, useStore } from '../data/store';
import { meetupById } from '../data/selectors';
import { Button, EmptyState, Screen, Text, attempt } from '../ui';

// PLACEHOLDER - owned by the Meetups feature agent.
export function MeetupDetailScreen({ route }: RootScreenProps<'MeetupDetail'>) {
  const { state, actions } = useStore();
  const me = useMe();
  const m = meetupById(state, route.params.meetupId);
  if (!m) return <Screen edges={[]}><EmptyState title="Meetup cancelled" /></Screen>;
  const going = m.attendeeIds.includes(me.id);
  return (
    <Screen edges={[]} title={m.title} eyebrow={m.location}>
      <Text variant="body">{m.attendeeIds.length} of {m.capacity} going</Text>
      {m.hostId !== me.id ? (
        <Button label={going ? 'Leave' : 'Join'} variant={going ? 'secondary' : 'primary'}
          onPress={() => attempt(() => (going ? actions.leaveMeetup(m.id) : actions.joinMeetup(m.id)))} />
      ) : null}
    </Screen>
  );
}
