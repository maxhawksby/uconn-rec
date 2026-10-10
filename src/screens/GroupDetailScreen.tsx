import React, { useLayoutEffect, useState } from 'react';
import { Alert, FlatList, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { RootScreenProps } from '../navigation/types';
import type { ID } from '../data/types';
import { useMe, useStore } from '../data/store';
import { groupById, groupMessages, studentById } from '../data/selectors';
import { Avatar, EmptyState, Icon, Screen, KeyboardFrame, Text, attempt } from '../ui';
import { colors, gutter, hitSlop, radius, space } from '../theme';
import { KIND_INFO, chatRows, groupActivity, memberLabel } from '../groups/model';
import { KindTile, SectionHeader, Segmented } from '../groups/parts';
import { Composer, DaySeparator, JoinBar, MessageBubble, useKeyboardShown } from '../groups/chat';
import { ListCard, MeetupRow, WorkoutRow } from '../profile/parts';

type Tab = 'chat' | 'members' | 'activity';

export function GroupDetailScreen({ route, navigation }: RootScreenProps<'GroupDetail'>) {
  const { state, actions } = useStore();
  const me = useMe();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>('chat');
  const group = groupById(state, route.params.groupId);
  const member = !!group?.memberIds.includes(me.id);

  const messages = group ? groupMessages(state, group.id) : [];
  // Inverted list: newest row first so the chat stays pinned to the composer.
  const rows = chatRows(messages, me.id).reverse();
  const activity = group ? groupActivity(state, group, me.id) : { workouts: [], meetups: [] };

  function leave() {
    if (!group) return;
    Alert.alert(`Leave ${group.name}?`, "You'll stop seeing the chat. You can rejoin anytime.", [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Leave', style: 'destructive', onPress: () => attempt(() => actions.leaveGroup(group.id), "Couldn't leave") },
    ]);
  }

  const keyboard = useKeyboardShown();
  const compact = keyboard && tab === 'chat';

  useLayoutEffect(() => {
    navigation.setOptions({
      title: compact && group ? group.name.toUpperCase() : '',
      headerRight: member ? () => (
        <Pressable onPress={leave} hitSlop={hitSlop} accessibilityRole="button" accessibilityLabel="Group options">
          <Icon name="ellipsis-horizontal" size={22} color="ink" />
        </Pressable>
      ) : undefined,
    });
  });

  if (!group) {
    return (
      <Screen edges={['bottom']}>
        <EmptyState icon="people-outline" title="Group not found" body="It may have been removed." actionLabel="Back to groups" onAction={() => navigation.goBack()} />
      </Screen>
    );
  }

  const openStudent = (id: ID) => (id === me.id ? navigation.navigate('Tabs', { screen: 'Profile' }) : navigation.navigate('StudentProfile', { studentId: id }));
  const join = () => attempt(() => actions.joinGroup(group.id), "Couldn't join");
  const members = group.memberIds.map(id => studentById(state, id)).filter(s => !!s)
    .sort((a, b) => Number(b.id === group.createdBy) - Number(a.id === group.createdBy) || a.firstName.localeCompare(b.firstName));
  const info = KIND_INFO[group.kind];
  // Members have no footer on these tabs, so the list clears the home indicator itself.
  const bottomPad = { paddingBottom: (member ? insets.bottom : 0) + space.x3 };

  return (
    <Screen scroll={false} edges={[]}>
      <KeyboardFrame>
        <View style={styles.header}>
          {/* While typing, the native header carries the name and the chat gets the room. */}
          {!compact ? (
            <>
              <View style={styles.titleRow}>
                <KindTile kind={group.kind} size={52} />
                <View style={styles.titleText}>
                  <View style={styles.eyebrowRow}>
                    <Text variant="eyebrow" color="muted">{info.label} · {memberLabel(group.memberIds.length)}</Text>
                    {member ? (
                      <View style={styles.joined} accessibilityLabel="You're a member">
                        <Icon name="checkmark-circle" size={12} color="turf" />
                        <Text variant="eyebrow" color="turf">Member</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text variant="title" numberOfLines={2}>{group.name}</Text>
                </View>
              </View>
              {group.description ? <Text variant="small" color="inkSoft" numberOfLines={3}>{group.description}</Text> : null}
            </>
          ) : null}
          <Segmented<Tab> value={tab} onChange={setTab} segments={[
            { key: 'chat', label: 'Chat' },
            { key: 'members', label: 'Members', count: group.memberIds.length },
            { key: 'activity', label: 'Activity', count: activity.meetups.length + activity.workouts.length },
          ]} />
        </View>

        {tab === 'chat' ? (
          rows.length ? (
            <FlatList inverted data={rows} keyExtractor={r => r.key} style={styles.flex} contentContainerStyle={styles.chatList}
              keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive"
              renderItem={({ item }) => item.type === 'day' ? <DaySeparator label={item.label} /> : (
                <MessageBubble row={item} author={studentById(state, item.message.studentId)} onPressAuthor={() => openStudent(item.message.studentId)} />
              )} />
          ) : (
            <View style={[styles.flex, styles.center]}>
              <EmptyState icon="chatbubbles-outline" title="No messages yet"
                body={member ? 'Kick it off: post a time, a plan, or a hello.' : 'Join the group to start the conversation.'} />
            </View>
          )
        ) : null}

        {tab === 'members' ? (
          <ScrollView style={styles.flex} contentContainerStyle={[styles.pane, bottomPad]}>
            {members.length ? (
              <ListCard>
                {members.map((s, i) => (
                  <Pressable key={s.id} onPress={() => openStudent(s.id)} accessibilityRole="button" accessibilityLabel={`${s.firstName} ${s.lastName}`}
                    style={({ pressed }) => [styles.memberRow, i < members.length - 1 && styles.rowLine, pressed && styles.pressed]}>
                    <Avatar student={s} size={40} />
                    <View style={styles.flex}>
                      <Text variant="bodyStrong">{s.firstName} {s.lastName}{s.id === me.id ? ' (you)' : ''}</Text>
                      <Text variant="small" color="muted">{s.classYear}</Text>
                    </View>
                    {s.id === group.createdBy ? <Text variant="eyebrow" color="muted">Founder</Text> : null}
                  </Pressable>
                ))}
              </ListCard>
            ) : <EmptyState icon="person-add-outline" title="No members" body="Join to be the first." />}
          </ScrollView>
        ) : null}

        {tab === 'activity' ? (
          <ScrollView style={styles.flex} contentContainerStyle={[styles.pane, bottomPad]}>
            <SectionHeader title="Upcoming meetups" count={activity.meetups.length}
              actionLabel={member ? 'Plan one' : undefined} onAction={() => navigation.navigate('CreateMeetup', { groupId: group.id })} />
            {activity.meetups.length ? (
              <ListCard>
                {activity.meetups.map((m, i) => (
                  <MeetupRow key={m.id} meetup={m} last={i === activity.meetups.length - 1} onPress={() => navigation.navigate('MeetupDetail', { meetupId: m.id })} />
                ))}
              </ListCard>
            ) : (
              <Text variant="small" color="muted">{member ? 'Nothing planned. Tap "Plan one" to set a time and place.' : 'Nothing planned yet.'}</Text>
            )}
            <SectionHeader title="Recent workouts" count={activity.workouts.length} />
            {activity.workouts.length ? (
              <ListCard>
                {activity.workouts.map((item, i) => (
                  <WorkoutRow key={item.workout.id} workout={item.workout} author={item.author} last={i === activity.workouts.length - 1}
                    onPress={() => navigation.navigate('WorkoutDetail', { workoutId: item.workout.id })} />
                ))}
              </ListCard>
            ) : (
              <Text variant="small" color="muted">No workouts shared here yet. Members can share a workout to this group when they record it.</Text>
            )}
          </ScrollView>
        ) : null}

        {member ? (tab === 'chat' ? (
          <Composer placeholder={`Message ${group.name}`}
            onSend={body => attempt(() => actions.sendGroupMessage({ groupId: group.id, body }), "Couldn't send").ok} />
        ) : null) : <JoinBar memberCount={group.memberIds.length} onJoin={join} />}
      </KeyboardFrame>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { justifyContent: 'center' },
  header: { paddingHorizontal: gutter, paddingTop: space.sm, paddingBottom: space.md, gap: space.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  titleText: { flex: 1, gap: space.xxs },
  eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, flexWrap: 'wrap' },
  joined: { flexDirection: 'row', alignItems: 'center', gap: space.xxs, backgroundColor: colors.turfSoft, borderRadius: radius.sm, paddingHorizontal: space.sm, paddingVertical: space.xxs },
  chatList: { paddingHorizontal: space.md, paddingVertical: space.md },
  pane: { paddingHorizontal: gutter },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md },
  rowLine: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  pressed: { opacity: 0.6 },
});
