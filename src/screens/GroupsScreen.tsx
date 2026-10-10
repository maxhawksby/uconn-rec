import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import type { TabScreenProps } from '../navigation/types';
import type { GroupKind } from '../data/types';
import { useMe, useStore } from '../data/store';
import { studentById } from '../data/selectors';
import { SCHOOL_BY_ID } from '../data/schools';
import { Button, Card, Chip, EmptyState, Screen, Text, attempt } from '../ui';
import { gutter, space } from '../theme';
import { GROUP_KINDS, filterGroups, lastMessage, splitCampusGroups } from '../groups/model';
import { GroupCard, SearchField, SectionHeader } from '../groups/parts';

export function GroupsScreen({ navigation }: TabScreenProps<'Groups'>) {
  const { state, actions } = useStore();
  const me = useMe();
  const [kind, setKind] = useState<GroupKind | 'all'>('all');
  const [query, setQuery] = useState('');

  const { mine: allMine, discover: allDiscover } = splitCampusGroups(state, me.schoolId, me.id);
  const filtering = kind !== 'all' || !!query.trim();
  const mine = filterGroups(allMine, kind, query);
  const discover = filterGroups(allDiscover, kind, query);
  const membersOf = (ids: string[]) => ids.map(id => studentById(state, id)).filter(s => !!s);
  const open = (groupId: string) => navigation.navigate('GroupDetail', { groupId });
  const clear = () => { setKind('all'); setQuery(''); };

  function preview(groupId: string) {
    const m = lastMessage(state, groupId);
    if (!m) return 'No messages yet. Say hi.';
    const who = m.studentId === me.id ? 'You' : studentById(state, m.studentId)?.firstName ?? 'Someone';
    return `${who}: ${m.body}`;
  }

  const noGroupsAtAll = allMine.length + allDiscover.length === 0;

  return (
    <Screen eyebrow={SCHOOL_BY_ID[me.schoolId]?.shortName} title="Groups"
      action={<Button label="New group" icon="add" size="sm" onPress={() => navigation.navigate('CreateGroup')} />}>
      {noGroupsAtAll ? (
        <EmptyState icon="people-outline" title="No groups yet" body="Be the first on campus. Start a crew for your dorm, club, team or major."
          actionLabel="Start a group" onAction={() => navigation.navigate('CreateGroup')} />
      ) : (
        <>
          <SearchField value={query} onChangeText={setQuery} placeholder="Search groups" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled"
            style={styles.chipScroller} contentContainerStyle={styles.chips}>
            <Chip label="All" selected={kind === 'all'} onPress={() => setKind('all')} />
            {GROUP_KINDS.map(k => (
              <Chip key={k.kind} label={k.label} icon={k.icon} selected={kind === k.kind} onPress={() => setKind(kind === k.kind ? 'all' : k.kind)} />
            ))}
          </ScrollView>

          {filtering && mine.length + discover.length === 0 ? (
            <EmptyState icon="search-outline" title="No matches" body="Try another name or kind, or start the group you're looking for."
              actionLabel="Clear filters" onAction={clear} />
          ) : (
            <>
              {!filtering || mine.length ? <SectionHeader title="Your groups" count={mine.length} /> : null}
              {mine.length ? (
                <View style={styles.list}>
                  {mine.map(g => <GroupCard key={g.id} group={g} members={membersOf(g.memberIds)} preview={preview(g.id)} onPress={() => open(g.id)} />)}
                </View>
              ) : !filtering ? (
                <Card style={styles.nudge}>
                  <Text variant="bodyStrong">You're not in a group yet</Text>
                  <Text variant="small" color="muted">Join one below, or start your own for your dorm, team or lifting crew.</Text>
                </Card>
              ) : null}

              {!filtering || discover.length ? <SectionHeader title="Discover on campus" count={discover.length} /> : null}
              {discover.length ? (
                <View style={styles.list}>
                  {discover.map(g => (
                    <GroupCard key={g.id} group={g} members={membersOf(g.memberIds)} onPress={() => open(g.id)}
                      onJoin={() => { if (attempt(() => actions.joinGroup(g.id), "Couldn't join").ok) open(g.id); }} />
                  ))}
                </View>
              ) : !filtering ? (
                <Card style={styles.nudge}>
                  <Text variant="bodyStrong">You're in every group on campus</Text>
                  <Text variant="small" color="muted">Know a crew that's missing? Start it.</Text>
                </Card>
              ) : null}
            </>
          )}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  chipScroller: { marginHorizontal: -gutter, marginTop: space.md },
  chips: { gap: space.sm, paddingHorizontal: gutter },
  list: { gap: space.md },
  nudge: { gap: space.xs },
});
