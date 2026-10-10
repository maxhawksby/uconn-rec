import React from 'react';
import type { RootScreenProps } from '../navigation/types';
import { EmptyState, Screen } from '../ui';

// PLACEHOLDER - owned by the Meetups feature agent. Use actions.createMeetup().
export function CreateMeetupScreen(_: RootScreenProps<'CreateMeetup'>) {
  return <Screen edges={[]}><EmptyState icon="calendar-outline" title="Meetup form coming next" /></Screen>;
}
