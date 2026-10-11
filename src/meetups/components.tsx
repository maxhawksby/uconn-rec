import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { Meetup, Student } from '../data/types';
import { ACTIVITY_BY_ID, activityName } from '../data/activities';
import { Avatar, Card, Icon, Text } from '../ui';
import { colors, fonts, hitSlop, radius, space } from '../theme';
import { cardDayLabel, formatTime, meetupStatus, spotsInfo, startsInLabel, timeParts } from './logic';
import type { MeetupRole, MeetupStatus } from './logic';

// Building blocks shared by the Meetups list and detail screens.

/** Scoreboard-style time slot: condensed numerals on an ink tile, like a sign-up sheet. */
export function TimeBlock({ iso, status, day }: { iso: string; status: MeetupStatus; day?: string }) {
  const { time, meridiem } = timeParts(iso);
  return (
    <View style={styles.timeBlock}>
      {status === 'live' ? <Text variant="statLabel" color="accent">Live</Text> : day ? <Text variant="statLabel" color="onBoard">{day}</Text> : null}
      {status === 'ended' ? <Text variant="statLabel" color="onBoardMuted">Ended</Text> : null}
      <Text variant="stat" color="onBoard" style={styles.timeValue}>{time}</Text>
      <Text variant="statLabel" color="onBoardMuted">{meridiem}</Text>
    </View>
  );
}

const ROSTER_MAX = 3;
const OPEN_MAX = 2;

/** Who's in, as overlapping discs, followed by dashed discs for the open spots. */
export function Roster({ attendees, openSpots, size = 24 }: { attendees: Student[]; openSpots: number; size?: number }) {
  // Card width is tight: at most 3 faces, a +N disc and 2 open spots.
  const shown = attendees.slice(0, ROSTER_MAX);
  const extra = attendees.length - shown.length;
  const open = Math.min(openSpots, OPEN_MAX);
  const disc = { width: size + 4, height: size + 4, borderRadius: (size + 4) / 2 };
  return (
    <View style={styles.roster} accessible accessibilityLabel={`${attendees.length} going, ${openSpots} open`}>
      {shown.map((s, i) => (
        <View key={s.id} style={[styles.rosterRing, disc, i > 0 && styles.overlap]}>
          <Avatar student={s} size={size} />
        </View>
      ))}
      {extra > 0 ? (
        <View style={[styles.rosterRing, disc, styles.overlap]}>
          <View style={[styles.more, { width: size, height: size, borderRadius: size / 2 }]}>
            <Text variant="tiny" color="inkSoft" style={styles.moreText}>+{extra}</Text>
          </View>
        </View>
      ) : null}
      {Array.from({ length: open }, (_, i) => (
        <View key={`open-${i}`} style={[styles.rosterRing, disc, styles.overlap]}>
          <View style={[styles.openSpot, { width: size, height: size, borderRadius: size / 2 }]} />
        </View>
      ))}
    </View>
  );
}

const JOIN_LOOK: Record<'open' | 'going' | 'full', { label: string; icon?: string; bg: keyof typeof colors; fg: keyof typeof colors }> = {
  open: { label: 'Join', icon: 'add', bg: 'ink', fg: 'onBoard' },
  going: { label: 'Going', icon: 'checkmark', bg: 'turfSoft', fg: 'turf' },
  full: { label: 'Full', bg: 'sunken', fg: 'faint' },
};

/** One-tap join/leave. Ink (not the accent) so the screen's one accent action stays "Post". */
export function JoinToggle({ role, onPress, title }: { role: MeetupRole; onPress: () => void; title: string }) {
  if (role === 'ended') return null;
  if (role === 'host') {
    return (
      <View style={[styles.toggle, styles.hostTag]}>
        <Icon name="star" size={13} color="inkSoft" />
        <Text variant="smallStrong" color="inkSoft">Hosting</Text>
      </View>
    );
  }
  const look = JOIN_LOOK[role];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={role === 'open' ? `Join ${title}` : role === 'going' ? `Leave ${title}` : `${title} is full`}
      accessibilityState={{ disabled: role === 'full', selected: role === 'going' }}
      accessibilityHint={role === 'going' ? "You're going. Tap to leave." : undefined}
      disabled={role === 'full'}
      onPress={onPress}
      hitSlop={hitSlop}
      style={({ pressed }) => [styles.toggle, { backgroundColor: colors[look.bg] }, pressed && styles.pressed]}>
      {look.icon ? <Icon name={look.icon} size={15} color={look.fg} /> : null}
      <Text variant="smallStrong" color={look.fg} style={styles.toggleText}>{look.label}</Text>
    </Pressable>
  );
}

type CardProps = {
  meetup: Meetup;
  host?: Student;
  attendees: Student[];
  role: MeetupRole;
  now: Date;
  onPress: () => void;
  onToggle: () => void;
};

export function MeetupCard({ meetup: m, host, attendees, role, now, onPress, onToggle }: CardProps) {
  const activity = ACTIVITY_BY_ID[m.activityId];
  const spots = spotsInfo(m);
  const status = meetupStatus(m, now);
  const soon = startsInLabel(m, now);
  const hostName = host ? `${host.firstName} ${host.lastName[0] ?? ''}.` : 'a student';
  return (
    <Card onPress={onPress} style={styles.card}
      accessibilityLabel={`${m.title}. ${activityName(m.activityId)} at ${formatTime(m.startsAt)}, ${m.location}. Hosted by ${hostName}. ${spots.full ? 'Full' : spots.label}.`}>
      <View style={styles.top}>
        <TimeBlock iso={m.startsAt} status={status} day={cardDayLabel(m.startsAt, now)} />
        <View style={styles.body}>
          <View style={styles.eyebrowRow}>
            <Icon name={activity?.icon ?? 'calendar-outline'} size={14} color="muted" />
            <Text variant="eyebrow" color="muted" numberOfLines={1} style={styles.flex}>
              {activityName(m.activityId)}{soon ? ` · ${soon}` : ''}
            </Text>
          </View>
          <Text variant="h2" numberOfLines={2}>{m.title}</Text>
          <View style={styles.metaRow}>
            <Icon name="location-outline" size={14} color="muted" />
            <Text variant="small" color="inkSoft" numberOfLines={1} style={styles.flex}>{m.location}</Text>
          </View>
          <Text variant="small" color="muted" numberOfLines={1}>Hosted by {role === 'host' ? 'you' : hostName}</Text>
        </View>
      </View>
      <View style={styles.bottom}>
        <Roster attendees={attendees} openSpots={spots.left} />
        <Text variant="smallStrong" color={spots.full ? 'muted' : 'ink'} style={styles.spots} numberOfLines={1}>
          {spots.full ? `${spots.going} of ${spots.capacity} going` : spots.label}
        </Text>
        <JoinToggle role={role} onPress={onToggle} title={m.title} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  card: { padding: space.md, gap: space.md },
  top: { flexDirection: 'row', gap: space.md },
  body: { flex: 1, gap: space.xs },
  eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  bottom: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingTop: space.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
  spots: { flex: 1 },

  timeBlock: { width: 64, alignSelf: 'flex-start', alignItems: 'center', justifyContent: 'center', gap: space.xxs, paddingVertical: space.md, borderRadius: radius.md, backgroundColor: colors.board },
  timeValue: { fontSize: 24, lineHeight: 26 },

  roster: { flexDirection: 'row', alignItems: 'center' },
  rosterRing: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  overlap: { marginLeft: -space.sm },
  more: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.sunken },
  moreText: { fontFamily: fonts.bodyBold },
  openSpot: { borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.faint, backgroundColor: colors.surface },

  toggle: { flexDirection: 'row', alignItems: 'center', gap: space.xs, minHeight: 36, paddingHorizontal: space.md, borderRadius: radius.md },
  toggleText: { fontFamily: fonts.bodyBold },
  hostTag: { backgroundColor: colors.sunken },
  pressed: { opacity: 0.8 },
});
