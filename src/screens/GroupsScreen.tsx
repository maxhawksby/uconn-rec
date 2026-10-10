import React from 'react';
import { StyleSheet, View } from 'react-native';
import type { TabScreenProps } from '../navigation/types';
import { useMe, useStore } from '../data/store';
import { groupsForSchool } from '../data/selectors';
import { Button, Card, Screen, Text } from '../ui';
import { space } from '../theme';

// PLACEHOLDER - owned by the Groups/Profile feature agent.
export function GroupsScreen({ navigation }: TabScreenProps<'Groups'>) {
  const { state } = useStore();
  const me = useMe();
  const groups = groupsForSchool(state, me.schoolId);
  return (
    <Screen title="Groups" action={<Button label="New" icon="add" size="sm" onPress={() => navigation.navigate('CreateGroup')} />}>
      <View style={styles.list}>
        {groups.map(g => (
          <Card key={g.id} onPress={() => navigation.navigate('GroupDetail', { groupId: g.id })}>
            <Text variant="eyebrow" color="muted">{g.kind} · {g.memberIds.length} members{g.memberIds.includes(me.id) ? ' · joined' : ''}</Text>
            <Text variant="h2">{g.name}</Text>
            <Text variant="small" color="muted">{g.description}</Text>
          </Card>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({ list: { gap: space.md } });
