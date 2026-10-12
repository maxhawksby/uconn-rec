import React, { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { AppState, FeedItem, Student, Workout } from '../data/types';
import { durationParts, relativeTime, studentById } from '../data/selectors';
import { ACTIVITY_BY_ID, activityName } from '../data/activities';
import { Avatar, Card, Icon, SchoolBadge, Scoreboard, Text } from '../ui';
import { colors, hitSlop, minTouch, radius, space } from '../theme';
import { KudosButton } from './KudosButton';
import { RouteSketch } from './RouteSketch';
import { CrewAvatar, crewTitle } from './tags';
import { CardPhoto } from './photos';
import { NameMark } from '../profile/awards';
import { workoutStats } from './stats';
import { VISIBILITY_LABEL, bestSet, formatSet, fullName, plural } from './model';

export function activityIcon(w: Workout) {
  switch (w.kind) {
    case 'lift': return 'barbell-outline';
    case 'run': return 'walk-outline';
    case 'ride': return 'bicycle-outline';
    default: return ACTIVITY_BY_ID[w.activityId]?.icon ?? 'fitness-outline';
  }
}

export function activityLabel(w: Workout) {
  switch (w.kind) {
    case 'lift': return 'Lifting';
    case 'run': return 'Run';
    case 'ride': return 'Ride';
    default: return activityName(w.activityId);
  }
}

/**
 * Author line used by the card and the detail screen. A shared workout names the whole crew
 * ("Caleb Mensah & Hannah Weiss"). Tapping it opens the author's profile.
 */
export function AuthorRow({ author, tagged = [], workout, now, size = 40 }: { author: Student; tagged?: Student[]; workout: Workout; now: Date; size?: number }) {
  const navigation = useNavigation();
  const vis = VISIBILITY_LABEL[workout.visibility];
  const name = crewTitle(author, tagged);
  return (
    <View style={styles.authorRow}>
      <Pressable
        onPress={() => navigation.navigate('StudentProfile', { studentId: author.id })}
        hitSlop={hitSlop}
        accessibilityRole="link"
        accessibilityLabel={`${name}, open ${author.firstName}'s profile`}
        style={({ pressed }) => [styles.author, pressed && styles.pressed]}>
        <CrewAvatar author={author} tagged={tagged} size={size} />
        <View style={styles.authorText}>
          <NameMark student={author} label={name} />
          <View style={styles.meta}>
            <SchoolBadge schoolId={author.schoolId} />
            <Text variant="tiny" color="muted" numberOfLines={1} style={styles.flexShrink}>
              {relativeTime(workout.startedAt, now)} · {activityLabel(workout)}
            </Text>
          </View>
        </View>
      </Pressable>
      {workout.visibility !== 'campus' ? (
        <View accessible accessibilityLabel={`Visible to: ${vis.label}`} style={styles.vis}>
          <Icon name={vis.icon} size={14} color="faint" />
        </View>
      ) : null}
    </View>
  );
}

function LiftBody({ workout }: { workout: Extract<Workout, { kind: 'lift' }> }) {
  const top = workout.exercises.slice(0, 3);
  const more = workout.exercises.length - top.length;
  return (
    <View style={styles.bodyGap}>
      <Scoreboard compact stats={workoutStats(workout)} />
      <View style={styles.exercises}>
        {top.map((e, i) => {
          const best = bestSet(e.sets);
          return (
            <View key={`${e.name}-${i}`} style={styles.exerciseRow}>
              <Text variant="small" color="inkSoft" numberOfLines={1} style={styles.flexShrink}>{e.name}</Text>
              <Text variant="smallStrong" style={styles.tabular}>
                {plural(e.sets.length, 'set')}{best ? `  ·  ${formatSet(best)}` : ''}
              </Text>
            </View>
          );
        })}
        {more > 0 ? <Text variant="tiny" color="muted">+{plural(more, 'more exercise')}</Text> : null}
      </View>
    </View>
  );
}

function DistanceBody({ workout }: { workout: Extract<Workout, { kind: 'run' | 'ride' }> }) {
  const hasRoute = (workout.route?.length ?? 0) >= 2;
  return (
    <View style={styles.bodyGap}>
      {hasRoute ? <RouteSketch route={workout.route!} height={128} /> : null}
      <Scoreboard compact stats={workoutStats(workout)} />
    </View>
  );
}

function SportBody({ workout }: { workout: Extract<Workout, { kind: 'sport' }> }) {
  return (
    <View style={styles.bodyGap}>
      <Scoreboard compact stats={workoutStats(workout)} />
    </View>
  );
}

function SessionBody({ workout }: { workout: Workout }) {
  const d = durationParts(workout.durationSec);
  return (
    <View style={styles.session}>
      <View style={styles.sessionIcon}><Icon name={activityIcon(workout)} size={22} color="ink" /></View>
      <View style={styles.flexShrink}>
        <Text variant="eyebrow" color="muted" numberOfLines={1}>{activityLabel(workout)}</Text>
        <View style={styles.sessionStat}>
          <Text variant="stat" style={styles.sessionValue}>{d.value}</Text>
          <Text variant="statLabel" color="muted">{d.unit}</Text>
        </View>
      </View>
    </View>
  );
}

export function WorkoutBody({ workout }: { workout: Workout }) {
  switch (workout.kind) {
    case 'lift': return <LiftBody workout={workout} />;
    case 'run':
    case 'ride': return <DistanceBody workout={workout} />;
    case 'sport': return <SportBody workout={workout} />;
    default: return <SessionBody workout={workout} />;
  }
}

type Props = { item: FeedItem; state: AppState; now: Date };

/** A feed card: author, the workout by kind, then kudos and the latest comment. */
export const WorkoutCard = memo(function WorkoutCard({ item, state, now }: Props) {
  const navigation = useNavigation();
  const { workout: w, author, tagged, photos, comments, kudosCount, kudoedByMe, isMine } = item;
  const open = () => navigation.navigate('WorkoutDetail', { workoutId: w.id });
  const last = comments[comments.length - 1];
  const lastAuthor = last ? studentById(state, last.studentId) : undefined;

  return (
    <Card onPress={open} accessibilityLabel={`${w.title} by ${crewTitle(author, tagged)}. Open workout`} style={styles.card}>
      <AuthorRow author={author} tagged={tagged} workout={w} now={now} />
      <Text variant="h2" numberOfLines={2} style={styles.title}>{w.title}</Text>
      <CardPhoto photos={photos} />
      <WorkoutBody workout={w} />

      <View style={styles.footer}>
        <KudosButton workoutId={w.id} given={kudoedByMe} count={kudosCount} isMine={isMine} />
        <Pressable onPress={open} hitSlop={hitSlop} accessibilityRole="button" accessibilityLabel={`${plural(comments.length, 'comment')}. Open to comment`}
          style={({ pressed }) => [styles.commentBtn, pressed && styles.pressed]}>
          <Icon name="chatbubble-outline" size={19} color="inkSoft" />
          <Text variant="smallStrong" color="inkSoft">{comments.length}</Text>
        </Pressable>
      </View>

      {last && lastAuthor ? (
        <View style={styles.preview}>
          <Text variant="small" numberOfLines={2}>
            <Text variant="smallStrong">{lastAuthor.firstName} </Text>
            <Text variant="small" color="inkSoft">{last.body}</Text>
          </Text>
          {comments.length > 1 ? <Text variant="tiny" color="muted">View all {comments.length} comments</Text> : null}
        </View>
      ) : null}
    </Card>
  );
});

const styles = StyleSheet.create({
  card: { padding: 0, paddingTop: space.lg, overflow: 'hidden' },
  authorRow: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm, paddingHorizontal: space.lg },
  author: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.md },
  authorText: { flex: 1, gap: space.xxs },
  meta: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  vis: { paddingTop: space.xs },
  pressed: { opacity: 0.6 },
  flexShrink: { flexShrink: 1 },
  title: { marginTop: space.md, marginBottom: space.md, paddingHorizontal: space.lg },
  bodyGap: { gap: space.md, paddingHorizontal: space.lg },
  exercises: { gap: space.xs },
  exerciseRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: space.md },
  tabular: { fontVariant: ['tabular-nums'] },
  session: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg },
  sessionIcon: { width: minTouch, height: minTouch, borderRadius: radius.md, backgroundColor: colors.sunken, alignItems: 'center', justifyContent: 'center' },
  sessionStat: { flexDirection: 'row', alignItems: 'baseline', gap: space.xs },
  sessionValue: { fontSize: 28, lineHeight: 30 },
  footer: {
    flexDirection: 'row', alignItems: 'center', gap: space.xs, marginTop: space.md,
    paddingHorizontal: space.sm, paddingVertical: space.xs, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line,
  },
  commentBtn: { flexDirection: 'row', alignItems: 'center', gap: space.xs, minHeight: minTouch - 8, paddingHorizontal: space.sm },
  preview: { gap: space.xxs, paddingHorizontal: space.lg, paddingBottom: space.md, marginTop: -space.xs },
});
