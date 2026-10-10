import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { RootScreenProps } from '../navigation/types';
import type { Comment, Student, Workout } from '../data/types';
import { useMe, useStore } from '../data/store';
import { relativeTime, studentById, workoutById } from '../data/selectors';
import { Avatar, Button, EmptyState, Icon, Scoreboard, Text, attempt } from '../ui';
import { colors, gutter, hitSlop, minTouch, radius, space, type } from '../theme';
import { AuthorRow, WorkoutBody, activityIcon, activityLabel } from '../feed/WorkoutCard';
import { ExerciseTable } from '../feed/ExerciseTable';
import { RouteSketch } from '../feed/RouteSketch';
import { KudosButton } from '../feed/KudosButton';
import { useKeyboardVisible } from '../feed/useKeyboardVisible';
import { workoutStats } from '../feed/stats';
import { VISIBILITY_LABEL, fullDate, fullName, kindLabel, kudosGivers, plural } from '../feed/model';

const COMMENT_MAX = 500;

export function WorkoutDetailScreen({ route, navigation }: RootScreenProps<'WorkoutDetail'>) {
  const { state, actions } = useStore();
  const me = useMe();
  const insets = useSafeAreaInsets();
  const keyboardUp = useKeyboardVisible();
  const [removed, setRemoved] = useState(false);
  const [draft, setDraft] = useState('');
  const [offset, setOffset] = useState(0);
  const root = useRef<View>(null);
  const scroll = useRef<ScrollView>(null);
  const scrollToEndNext = useRef(false);
  const now = useMemo(() => new Date(), [state]);

  const item = workoutById(state, route.params.workoutId, me.id);
  const givers = useMemo(() => (item ? kudosGivers(state, item.workout.id) : []), [state, item?.workout.id]);

  useLayoutEffect(() => {
    if (item) navigation.setOptions({ title: kindLabel(item.workout).toUpperCase() });
  }, [navigation, item?.workout.kind]);

  // While the delete is going through, render nothing rather than flashing "not found".
  if (removed) return <View style={styles.root} />;

  if (!item) {
    return (
      <View style={[styles.root, styles.center]}>
        <EmptyState icon="eye-off-outline" title="Workout not found" body="It was deleted, or its owner changed who can see it."
          actionLabel="Back" onAction={() => navigation.goBack()} />
      </View>
    );
  }

  const { workout: w, author, comments, kudosCount, kudoedByMe, isMine } = item;
  const vis = VISIBILITY_LABEL[w.visibility];
  const trimmed = draft.trim();

  function send() {
    if (!trimmed) return;
    const res = attempt(() => actions.addComment({ workoutId: w.id, body: trimmed }), "Couldn't post comment");
    if (res.ok) { setDraft(''); scrollToEndNext.current = true; }
  }

  function confirmDeleteComment(c: Comment) {
    Alert.alert('Delete comment?', 'This removes it for everyone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => attempt(() => actions.deleteComment(c.id), "Couldn't delete comment") },
    ]);
  }

  function confirmDeleteWorkout() {
    Alert.alert('Delete this workout?', "Its kudos and comments go with it. You can't undo this.", [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: () => {
          setRemoved(true);
          const res = attempt(() => actions.deleteWorkout(w.id), "Couldn't delete workout");
          if (res.ok) navigation.goBack(); else setRemoved(false);
        },
      },
    ]);
  }

  const openProfile = (s: Student) => navigation.navigate('StudentProfile', { studentId: s.id });

  return (
    // The offset is this screen's distance from the top of the window (the stack header),
    // measured so the composer clears the keyboard on every device without guessing.
    <View ref={root} style={styles.root} onLayout={() => root.current?.measureInWindow((_x, y) => setOffset(y))}>
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={offset}>
      <ScrollView
        ref={scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        onContentSizeChange={() => {
          if (scrollToEndNext.current) { scrollToEndNext.current = false; scroll.current?.scrollToEnd({ animated: true }); }
        }}>
        <View style={styles.authorWrap}>
          <AuthorRow author={author} workout={w} now={now} size={44} />
        </View>
        <View style={styles.dateRow}>
          <Text variant="tiny" color="muted">{fullDate(w.startedAt)}</Text>
          <View style={styles.dot} />
          <Icon name={vis.icon} size={12} color="muted" />
          <Text variant="tiny" color="muted">{vis.label}</Text>
        </View>

        <Text variant="title" style={styles.title}>{w.title}</Text>

        <Stats workout={w} />

        {isMine && w.note ? (
          <View style={styles.note}>
            <View style={styles.noteHead}>
              <Icon name="lock-closed" size={12} color="muted" />
              <Text variant="eyebrow" color="muted">Private note · only you see this</Text>
            </View>
            <Text variant="body" color="inkSoft">{w.note}</Text>
          </View>
        ) : null}

        <Section title="Kudos" count={kudosCount} right={isMine ? undefined : <KudosButton workoutId={w.id} given={kudoedByMe} count={kudosCount} isMine={false} label />}>
          {givers.length ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.givers} style={styles.giversScroll}>
              {givers.map(s => (
                <Pressable key={s.id} onPress={() => openProfile(s)} accessibilityRole="link" accessibilityLabel={`${fullName(s)}, open profile`}
                  style={({ pressed }) => [styles.giver, pressed && styles.pressed]}>
                  <Avatar student={s} size={40} />
                  <Text variant="tiny" color="inkSoft" numberOfLines={1}>{s.id === me.id ? 'You' : s.firstName}</Text>
                </Pressable>
              ))}
            </ScrollView>
          ) : (
            <Text variant="small" color="muted">{isMine ? 'No kudos yet. They usually roll in within the hour.' : 'Be the first to give kudos.'}</Text>
          )}
        </Section>

        <Section title="Comments" count={comments.length}>
          {comments.length ? (
            <View style={styles.comments}>
              {comments.map(c => {
                const who = studentById(state, c.studentId);
                if (!who) return null;
                const mine = c.studentId === me.id;
                return (
                  <View key={c.id} style={styles.comment}>
                    <Pressable onPress={() => openProfile(who)} hitSlop={hitSlop} accessibilityRole="link" accessibilityLabel={`${fullName(who)}, open profile`}>
                      <Avatar student={who} size={32} />
                    </Pressable>
                    <View style={styles.commentBody}>
                      <View style={styles.commentHead}>
                        <Text variant="smallStrong" numberOfLines={1} style={styles.shrink}>{mine ? 'You' : fullName(who)}</Text>
                        <Text variant="tiny" color="faint">{relativeTime(c.at, now)}</Text>
                        {mine ? (
                          <Pressable onPress={() => confirmDeleteComment(c)} hitSlop={hitSlop} accessibilityRole="button" accessibilityLabel="Delete your comment" style={styles.commentDelete}>
                            <Text variant="tiny" color="muted">Delete</Text>
                          </Pressable>
                        ) : null}
                      </View>
                      <Text variant="body" color="inkSoft">{c.body}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          ) : (
            <Text variant="small" color="muted">{isMine ? 'No comments yet.' : `No comments yet. Say something to ${author.firstName}.`}</Text>
          )}
        </Section>

        {isMine ? (
          <View style={styles.danger}>
            <Button label="Delete workout" icon="trash-outline" variant="danger" size="sm" onPress={confirmDeleteWorkout} />
          </View>
        ) : null}
      </ScrollView>

      {draft.length > COMMENT_MAX - 80 ? (
        <View style={styles.counter}>
          <Text variant="tiny" color={draft.length >= COMMENT_MAX ? 'danger' : 'muted'}>{draft.length}/{COMMENT_MAX}</Text>
        </View>
      ) : null}
      <View style={[styles.composer, { paddingBottom: keyboardUp ? space.sm : Math.max(insets.bottom, space.sm) }]}>
        <Avatar student={me} size={32} />
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder={isMine ? 'Reply to your crew…' : `Add a comment for ${author.firstName}…`}
          placeholderTextColor={colors.faint}
          multiline
          maxLength={COMMENT_MAX}
          style={styles.input}
          accessibilityLabel="Write a comment"
          submitBehavior="newline"
        />
        <Pressable onPress={send} disabled={!trimmed} hitSlop={hitSlop} accessibilityRole="button" accessibilityLabel="Post comment"
          accessibilityState={{ disabled: !trimmed }}
          style={({ pressed }) => [styles.send, trimmed ? styles.sendOn : styles.sendOff, pressed && styles.pressed]}>
          <Icon name="arrow-up" size={20} color={trimmed ? 'onAccent' : 'faint'} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
    </View>
  );
}

/** Scoreboard plus the full per-kind breakdown. */
function Stats({ workout: w }: { workout: Workout }) {
  const { state } = useStore();
  if (w.kind === 'lift') {
    return (
      <View style={styles.statsGap}>
        <Scoreboard stats={workoutStats(w)} />
        <Text variant="eyebrow" color="muted" style={styles.subhead}>{plural(w.exercises.length, 'exercise')} · {plural(w.exercises.reduce((n, e) => n + e.sets.length, 0), 'set')}</Text>
        <ExerciseTable exercises={w.exercises} />
      </View>
    );
  }
  if (w.kind === 'run' || w.kind === 'ride') {
    return (
      <View style={styles.statsGap}>
        {(w.route?.length ?? 0) >= 2 ? <RouteSketch route={w.route!} height={200} stroke={4} /> : null}
        <Scoreboard stats={workoutStats(w)} />
      </View>
    );
  }
  if (w.kind === 'sport') {
    const mates = w.withIds.map(id => studentById(state, id)).filter((s): s is Student => !!s);
    return (
      <View style={styles.statsGap}>
        <View style={styles.activity}>
          <Icon name={activityIcon(w)} size={18} color="inkSoft" />
          <Text variant="eyebrow" color="inkSoft">{activityLabel(w)}</Text>
        </View>
        <Scoreboard stats={workoutStats(w)} />
        {mates.length ? <PlayedWith students={mates} /> : null}
      </View>
    );
  }
  return (
    <View style={[styles.statsGap, styles.sessionCard]}>
      <WorkoutBody workout={w} state={state} />
    </View>
  );
}

function PlayedWith({ students }: { students: Student[] }) {
  return (
    <View style={styles.mates}>
      <Text variant="eyebrow" color="muted" style={styles.subhead}>Played with</Text>
      {students.map(s => <MateRow key={s.id} student={s} />)}
    </View>
  );
}

function MateRow({ student }: { student: Student }) {
  const nav = useNavigation();
  return (
    <Pressable onPress={() => nav.navigate('StudentProfile', { studentId: student.id })} accessibilityRole="link" accessibilityLabel={`${fullName(student)}, open profile`}
      style={({ pressed }) => [styles.mate, pressed && styles.pressed]}>
      <Avatar student={student} size={36} />
      <View style={styles.shrink}>
        <Text variant="bodyStrong">{fullName(student)}</Text>
        <Text variant="tiny" color="muted">{student.classYear}</Text>
      </View>
      <Icon name="chevron-forward" size={16} color="faint" />
    </Pressable>
  );
}

function Section({ title, count, right, children }: { title: string; count: number; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <View style={styles.sectionTitle}>
          <Text variant="h2">{title}</Text>
          <Text variant="h2" color="faint">{count}</Text>
        </View>
        {right}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  center: { justifyContent: 'center' },
  content: { paddingHorizontal: gutter, paddingTop: space.sm, paddingBottom: space.x4 },
  authorWrap: { marginHorizontal: -space.lg },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs, marginTop: space.md },
  dot: { width: 3, height: 3, borderRadius: 2, backgroundColor: colors.faint, marginHorizontal: space.xxs },
  title: { marginTop: space.sm, marginBottom: space.lg },
  statsGap: { gap: space.md },
  subhead: { marginTop: space.sm },
  activity: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  sessionCard: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line, paddingVertical: space.lg, marginHorizontal: 0 },
  mates: { gap: space.xs },
  mate: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: minTouch + 8, paddingVertical: space.xs },
  note: { marginTop: space.xl, padding: space.lg, gap: space.sm, borderRadius: radius.md, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.line, backgroundColor: colors.surface },
  noteHead: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  section: { marginTop: space.x3, gap: space.md },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md, minHeight: minTouch },
  sectionTitle: { flexDirection: 'row', alignItems: 'baseline', gap: space.sm },
  giversScroll: { marginHorizontal: -gutter },
  givers: { gap: space.lg, paddingHorizontal: gutter },
  giver: { alignItems: 'center', gap: space.xs, width: 48 },
  comments: { gap: space.lg },
  comment: { flexDirection: 'row', gap: space.md },
  commentBody: { flex: 1, gap: space.xxs },
  commentHead: { flexDirection: 'row', alignItems: 'baseline', gap: space.sm },
  commentDelete: { marginLeft: 'auto' },
  shrink: { flexShrink: 1, flex: 1 },
  danger: { marginTop: space.x4, alignItems: 'flex-start' },
  pressed: { opacity: 0.6 },
  composer: {
    flexDirection: 'row', alignItems: 'flex-end', gap: space.sm, paddingHorizontal: gutter, paddingTop: space.sm,
    backgroundColor: colors.surface, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line,
  },
  input: {
    ...type.body, flex: 1, color: colors.ink, minHeight: minTouch - 4, maxHeight: 120, backgroundColor: colors.sunken,
    borderRadius: radius.lg, paddingHorizontal: space.md, paddingTop: space.sm, paddingBottom: space.sm, textAlignVertical: 'center',
  },
  send: { width: minTouch - 4, height: minTouch - 4, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  sendOn: { backgroundColor: colors.accent },
  sendOff: { backgroundColor: colors.sunken },
  counter: { alignItems: 'flex-end', paddingHorizontal: gutter, paddingVertical: space.xxs, backgroundColor: colors.surface, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
});
