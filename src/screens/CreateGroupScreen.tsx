import React from 'react';
import type { RootScreenProps } from '../navigation/types';
import { EmptyState, Screen } from '../ui';

// PLACEHOLDER - owned by the Groups/Profile feature agent. Use actions.createGroup().
export function CreateGroupScreen(_: RootScreenProps<'CreateGroup'>) {
  return <Screen edges={[]}><EmptyState icon="people-outline" title="Group form coming next" /></Screen>;
}
