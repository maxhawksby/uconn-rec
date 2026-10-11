import React from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import type { RootScreenProps } from '../navigation/types';
import { useMe, useStore } from '../data/store';
import { groupById, meetupById, studentById } from '../data/selectors';
import { ACTIVITY_BY_ID, activityName } from '../data/activities';
import type { Student } from '../data/types';
import { Avatar, Button, Card, EmptyState, Icon, Scoreboard, Screen, Text, attempt } from '../ui';
import type { Stat } from '../ui';
import { colors, gutter, minTouch, radius, space } from '../theme';
import { formatDay, formatDate, formatTime, meetupRole, meetupStatus, spotsInfo, startsInLabel, timeParts } from '../meetups/logic';
import { useNow } from '../meetups/useNow';

const OPEN_ROWS_MAX = 3;

export function MeetupDetailScreen({ route, navigation }: RootScreenProps<'MeetupDetail'>) {
  const { state, actions } = useStore();
  const me = useMe();
  const now = useNow();
  const m = meetupById(state, route.params.meetupId);

  if (!m) {
    return (
      <Screen edges={['bottom']}>
        <EmptyState icon="close-circle-outline" title="This meetup is off" body="The host cancelled it. Find another one on the Meetups tab."
          actionLabel="Back to meetups" onAction={() => navigation.goBack()} />
      </Screen>
    );
  }

  const activity = ACTIVITY_BY_ID[m.activityId];
  const status = meetupStatus(m, now);
  const role = meetupRole(m, me.id, now);
  const spots = spotsInfo(m);
  const host = studentById(state, m.hostId);
  const group = m.groupId ? groupById(state, m.groupId) : undefined;
  const attendees = m.attendeeIds.map(id => studentById(state, id)).filter((s): s is Student => !!s)
    // Host first, then you, then everyone else in join order.
    .sort((a, b) => Number(b.id === m.hostId) - Number(a.id === m.hostId) || Number(b.id === me.id) - Number(a.id === me.id));
  const { time, meridiem } = timeParts(m.startsAt);
  const soon = startsInLabel(m, now);
  // Show every open spot when only one would hide behind a "+1 more" line.
  const openRows = spots.left <= OPEN_ROWS_MAX + 1 ? spots.left : OPEN_ROWS_MAX;
  const openPerson = (studentId: string) => navigation.navigate('StudentProfile', { studentId });

  const stats: Stat[] = status === 'ended'
    ? [{ label: 'Started', value: time, unit: meridiem }, { label: 'Went', value: String(spots.going), unit: `/ ${spots.capacity}` }]
    : [
      { label: 'Starts', value: time, unit: meridiem },
      { label: 'Going', value: String(spots.going), unit: `/ ${spots.capacity}` },
      { label: spots.full ? 'Spots' : 'Need', value: spots.full ? 'Full' : String(spots.left) },
    ];

  const confirmCancel = () => {
    const others = spots.going - 1;
    Alert.alert(
      'Cancel this meetup?',
      others > 0 ? `${others} ${others === 1 ? 'person loses their spot' : 'people lose their spots'}. This can't be undone.` : "This can't be undone.",
      [
        { text: 'Keep it', style: 'cancel' },
        { text: 'Cancel meetup', style: 'destructive', onPress: () => { if (attempt(() => actions.cancelMeetup(m.id), "Couldn't cancel").ok) navigation.goBack(); } },
      ],
    );
  };

  const footer = (
    <View style={styles.footer}>
      {role === 'ended' ? (
        <View style={styles.footerNote}>
          <Icon name="flag-outline" size={18} color="muted" />
          <Text variant="smallStrong" color="muted">This meetup has ended.</Text>
        </View>
      ) : role === 'host' ? (
        <Button label="Cancel meetup" variant="danger" icon="close-circle-outline" block onPress={confirmCancel} />
      ) : role === 'going' ? (
        <View style={styles.goingRow}>
          <View style={styles.goingNote}>
            <Icon name="checkmark-circle" size={20} color="turf" />
            <Text variant="bodyStrong" color="turf">You're going</Text>
          </View>
          <Button label="Leave" variant="secondary" onPress={() => attempt(() => actions.leaveMeetup(m.id), "Couldn't leave")} />
        </View>
      ) : role === 'full' ? (
        <Button label="It's full" disabled block onPress={() => undefined} />
      ) : (
        <Button label={`Join · ${spots.label.toLowerCase()}`} icon="add" block onPress={() => attempt(() => actions.joinMeetup(m.id), "Couldn't join")} />
      )}
    </View>
  );

  return (
    <Screen edges={['bottom']} footer={footer} contentStyle={styles.content}>
      <View style={styles.hero}>
        <View style={styles.eyebrowRow}>
          <Icon name={activity?.icon ?? 'calendar-outline'} size={16} color="muted" />
          <Text variant="eyebrow" color="muted">{activityName(m.activityId)}</Text>
          {status === 'live' ? <View style={[styles.pill, styles.livePill]}><Text variant="eyebrow" color="accentText">Happening now</Text></View> : null}
          {status === 'ended' ? <View style={[styles.pill, styles.endedPill]}><Text variant="eyebrow" color="muted">Ended</Text></View> : null}
        </View>
        <Text variant="title">{m.title}</Text>
      </View>

      <Scoreboard stats={stats} />

      <Card style={styles.details}>
        <DetailRow icon="calendar-outline" title={`${formatDay(m.startsAt, now)}${formatDay(m.startsAt, now) === formatDate(m.startsAt) ? '' : ` · ${formatDate(m.startsAt)}`}`}
          sub={`${formatTime(m.startsAt)}${soon && status !== 'ended' ? ` · ${soon}` : ''}`} />
        <View style={styles.rule} />
        <DetailRow icon="location-outline" title={m.location} sub="Meeting spot" />
        {host ? (
          <>
            <View style={styles.rule} />
            <DetailRow icon="person-outline" title={host.id === me.id ? 'You' : `${host.firstName} ${host.lastName}`} sub="Host" onPress={() => openPerson(host.id)} />
          </>
        ) : null}
        {group ? (
          <>
            <View style={styles.rule} />
            <DetailRow icon="people-outline" title={group.name} sub={`Posted in this group · ${group.memberIds.length} members`}
              onPress={() => navigation.navigate('GroupDetail', { groupId: group.id })} />
          </>
        ) : null}
      </Card>

      {m.note ? (
        <View style={styles.section}>
          <Text variant="eyebrow" color="muted">From the host</Text>
          <Text variant="body" color="inkSoft">{m.note}</Text>
        </View>
      ) : null}

      <View style={styles.section}>
        <View style={styles.sectionHead} accessibilityRole="header">
          <Text variant="h2">{status === 'ended' ? 'Who went' : "Who's going"}</Text>
          <Text variant="eyebrow" color="muted">{spots.going} of {spots.capacity}</Text>
        </View>
        <Card style={styles.roster}>
          {attendees.map((s, i) => (
            <Pressable key={s.id} accessibilityRole="button" accessibilityLabel={`${s.firstName} ${s.lastName}, open profile`}
              onPress={() => openPerson(s.id)} style={({ pressed }) => [styles.person, i > 0 && styles.personRule, pressed && styles.pressed]}>
              <Avatar student={s} size={40} />
              <View style={styles.flex}>
                <Text variant="bodyStrong" numberOfLines={1}>{s.firstName} {s.lastName}{s.id === me.id ? ' (you)' : ''}</Text>
                <Text variant="small" color="muted">{s.classYear}</Text>
              </View>
              {s.id === m.hostId ? <View style={[styles.pill, styles.endedPill]}><Text variant="eyebrow" color="inkSoft">Host</Text></View> : null}
              <Icon name="chevron-forward" size={16} color="faint" />
            </Pressable>
          ))}
          {status !== 'ended' ? Array.from({ length: openRows }, (_, i) => (
            <View key={`open-${i}`} style={[styles.person, styles.personRule]}>
              <View style={styles.openDisc} />
              <Text variant="body" color="faint" style={styles.flex}>Open spot</Text>
            </View>
          )) : null}
          {status !== 'ended' && spots.left > openRows ? (
            <View style={[styles.person, styles.personRule, styles.moreOpen]}>
              <Text variant="small" color="muted">+ {spots.left - openRows} more open spots</Text>
            </View>
          ) : null}
        </Card>
      </View>
    </Screen>
  );
}

function DetailRow({ icon, title, sub, onPress }: { icon: string; title: string; sub: string; onPress?: () => void }) {
  const body = (
    <>
      <View style={styles.rowIcon}><Icon name={icon} size={18} color="inkSoft" /></View>
      <View style={styles.flex}>
        <Text variant="bodyStrong">{title}</Text>
        <Text variant="small" color="muted">{sub}</Text>
      </View>
      {onPress ? <Icon name="chevron-forward" size={16} color="faint" /> : null}
    </>
  );
  if (!onPress) return <View style={styles.row}>{body}</View>;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${sub}: ${title}`} onPress={onPress} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { gap: space.xl, paddingTop: space.lg },
  hero: { gap: space.sm },
  eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs, flexWrap: 'wrap' },
  pill: { borderRadius: radius.sm, paddingHorizontal: space.sm, paddingVertical: space.xxs, marginLeft: space.xs },
  livePill: { backgroundColor: colors.accentSoft },
  endedPill: { backgroundColor: colors.sunken },

  details: { padding: 0, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingVertical: space.md, minHeight: minTouch + space.md },
  rowIcon: { width: 32, height: 32, borderRadius: radius.md, backgroundColor: colors.sunken, alignItems: 'center', justifyContent: 'center' },
  rule: { height: StyleSheet.hairlineWidth, backgroundColor: colors.line, marginLeft: space.lg + 32 + space.md },
  pressed: { backgroundColor: colors.sunken },

  section: { gap: space.sm },
  sectionHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  roster: { padding: 0, overflow: 'hidden' },
  person: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingVertical: space.md, minHeight: minTouch + space.md },
  personRule: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
  openDisc: { width: 40, height: 40, borderRadius: 20, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.faint },
  moreOpen: { minHeight: minTouch },

  footer: { paddingHorizontal: gutter, paddingTop: space.md, paddingBottom: space.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line, backgroundColor: colors.bg },
  footerNote: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm, minHeight: minTouch + 6 },
  goingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md },
  goingNote: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
});
