import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { Meetup, PersonalRecord, Student, Workout } from '../data/types';
import { activityName } from '../data/activities';
import { formatDuration, relativeTime, spotsLeft } from '../data/selectors';
import { colors, minTouch, radius, space } from '../theme';
import { Avatar, Card, Chip, Icon, Text } from '../ui';
import { shortDate, workoutFact, workoutIcon } from './model';

const ROW_ICON = 40;

/** One workout in a list. With `author`, shows who did it (group activity); without, the date. */
export function WorkoutRow({ workout: w, author, onPress, last }: { workout: Workout; author?: Student; onPress: () => void; last?: boolean }) {
  const meta = [author ? relativeTime(w.startedAt) : shortDate(w.startedAt), formatDuration(w.durationSec), workoutFact(w)].join(' · ');
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${author ? `${author.firstName} ${author.lastName}, ` : ''}${w.title}, ${meta}`}
      style={({ pressed }) => [styles.row, !last && styles.rowLine, pressed && styles.pressed]}>
      {author ? <Avatar student={author} size={ROW_ICON} /> : (
        <View style={styles.rowIcon}><Icon name={workoutIcon(w)} size={20} color="ink" /></View>
      )}
      <View style={styles.rowBody}>
        {author ? <Text variant="tiny" color="muted">{author.firstName} {author.lastName}</Text> : null}
        <Text variant="bodyStrong" numberOfLines={1}>{w.title}</Text>
        <Text variant="small" color="muted" numberOfLines={1}>{meta}</Text>
      </View>
      {w.visibility === 'private' ? <Icon name="lock-closed-outline" size={14} color="faint" /> : null}
      <Icon name="chevron-forward" size={18} color="faint" />
    </Pressable>
  );
}

/** A white card holding a list of rows separated by hairlines. */
export function ListCard({ children }: { children: React.ReactNode }) {
  return <Card style={styles.listCard}>{children}</Card>;
}

/** Personal records as a jersey-number table: lift on the left, big condensed weight on the right. */
export function RecordsList({ prs, onPress }: { prs: PersonalRecord[]; onPress: (pr: PersonalRecord) => void }) {
  return (
    <ListCard>
      {prs.map((pr, i) => (
        <Pressable key={pr.exercise} onPress={() => onPress(pr)} accessibilityRole="button"
          accessibilityLabel={`${pr.exercise} record, ${pr.weight} pounds for ${pr.reps} reps, ${shortDate(pr.at)}`}
          style={({ pressed }) => [styles.row, i < prs.length - 1 && styles.rowLine, pressed && styles.pressed]}>
          <Text variant="stat" color={i === 0 ? 'accent' : 'faint'} style={styles.rank}>{i + 1}</Text>
          <View style={styles.rowBody}>
            <Text variant="bodyStrong" numberOfLines={1}>{pr.exercise}</Text>
            <Text variant="small" color="muted">{shortDate(pr.at)}</Text>
          </View>
          <View style={styles.prValue}>
            <Text variant="stat">{pr.weight}</Text>
            <Text variant="statLabel" color="muted">lb × {pr.reps}</Text>
          </View>
        </Pressable>
      ))}
    </ListCard>
  );
}

/** Interests as static chips; shared ones are highlighted when `highlight` is given. */
export function InterestChips({ ids, highlight }: { ids: string[]; highlight?: string[] }) {
  return (
    <View style={styles.chips}>
      {ids.map(id => <Chip key={id} label={activityName(id)} selected={highlight?.includes(id)} />)}
    </View>
  );
}

/** Meetup card with a small scoreboard date block. */
export function MeetupRow({ meetup: m, onPress, last }: { meetup: Meetup; onPress: () => void; last?: boolean }) {
  const d = new Date(m.startsAt);
  const left = spotsLeft(m);
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [styles.row, !last && styles.rowLine, pressed && styles.pressed]}
      accessibilityLabel={`${m.title}, ${d.toLocaleString()}, ${m.location}, ${left ? `${left} spots left` : 'full'}`}>
      <View style={styles.dateBlock}>
        <Text variant="statLabel" color="onBoardMuted">{d.toLocaleDateString(undefined, { weekday: 'short' })}</Text>
        <Text variant="h2" color="onBoard">{d.getDate()}</Text>
      </View>
      <View style={styles.rowBody}>
        <Text variant="bodyStrong" numberOfLines={1}>{m.title}</Text>
        <Text variant="small" color="muted" numberOfLines={1}>
          {d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })} · {m.location}
        </Text>
        <Text variant="tiny" color={left ? 'turf' : 'muted'}>{left ? `${left} ${left === 1 ? 'spot' : 'spots'} left` : 'Full'}</Text>
      </View>
      <Icon name="chevron-forward" size={18} color="faint" />
    </Pressable>
  );
}

/** Settings row: icon, label, optional detail. */
export function SettingsRow({ icon, label, detail, danger, onPress, last }: { icon: string; label: string; detail?: string; danger?: boolean; onPress: () => void; last?: boolean }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} accessibilityHint={detail}
      style={({ pressed }) => [styles.row, !last && styles.rowLine, pressed && styles.pressed]}>
      <Icon name={icon} size={20} color={danger ? 'danger' : 'inkSoft'} />
      <View style={styles.rowBody}>
        <Text variant="bodyStrong" color={danger ? 'danger' : 'ink'}>{label}</Text>
        {detail ? <Text variant="small" color="muted">{detail}</Text> : null}
      </View>
    </Pressable>
  );
}

/** Followers / following / sessions counts under a profile name. */
export function CountsRow({ counts }: { counts: { label: string; value: number }[] }) {
  return (
    <View style={styles.counts}>
      {counts.map(c => (
        <View key={c.label} style={styles.count} accessible accessibilityLabel={`${c.value} ${c.label}`}>
          <Text variant="h2">{c.value}</Text>
          <Text variant="statLabel" color="muted">{c.label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  listCard: { padding: 0, paddingHorizontal: space.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: minTouch + space.lg, paddingVertical: space.md },
  rowLine: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  pressed: { opacity: 0.6 },
  rowIcon: { width: ROW_ICON, height: ROW_ICON, borderRadius: radius.md, backgroundColor: colors.sunken, alignItems: 'center', justifyContent: 'center' },
  rowBody: { flex: 1, gap: space.xxs },
  rank: { width: space.xl, textAlign: 'center' },
  prValue: { alignItems: 'flex-end' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  dateBlock: { width: ROW_ICON + space.sm, paddingVertical: space.xs, borderRadius: radius.md, backgroundColor: colors.board, alignItems: 'center' },
  counts: { flexDirection: 'row', gap: space.xxl },
  count: { gap: space.xxs },
});
