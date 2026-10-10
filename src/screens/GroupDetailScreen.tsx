import React from 'react';
import { StyleSheet, View } from 'react-native';
import type { RootScreenProps } from '../navigation/types';
import { useMe, useStore } from '../data/store';
import { groupById, groupMessages, studentById } from '../data/selectors';
import { Button, EmptyState, Screen, Text, attempt } from '../ui';
import { space } from '../theme';

// PLACEHOLDER - owned by the Groups/Profile feature agent (group chat composer, members).
export function GroupDetailScreen({ route }: RootScreenProps<'GroupDetail'>) {
  const { state, actions } = useStore();
  const me = useMe();
  const g = groupById(state, route.params.groupId);
  if (!g) return <Screen edges={[]}><EmptyState title="Group not found" /></Screen>;
  const member = g.memberIds.includes(me.id);
  return (
    <Screen edges={[]} title={g.name} eyebrow={`${g.kind} · ${g.memberIds.length} members`}>
      <Button label={member ? 'Leave group' : 'Join group'} variant={member ? 'secondary' : 'primary'}
        onPress={() => attempt(() => (member ? actions.leaveGroup(g.id) : actions.joinGroup(g.id)))} />
      <View style={styles.list}>
        {groupMessages(state, g.id).map(m => <Text key={m.id} variant="small"><Text variant="smallStrong">{studentById(state, m.studentId)?.firstName}: </Text>{m.body}</Text>)}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({ list: { gap: space.sm, marginTop: space.xl } });
