import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { RootScreenProps } from '../navigation/types';
import type { Comment, ID, Student, Workout, WorkoutPhoto } from '../data/types';
import { useMe, useStore } from '../data/store';
import { MAX_PHOTOS, canAddPhotos, followingIds, kudosGivers, relativeTime, studentById, tagCandidates, tagOf, tagsFor, workoutById } from '../data/selectors';
import { Avatar, Button, EmptyState, Icon, KeyboardFrame, Scoreboard, Text, attempt } from '../ui';
import { colors, gutter, hitSlop, minTouch, radius, space, type } from '../theme';
import { AuthorRow, WorkoutBody, activityIcon, activityLabel } from '../feed/WorkoutCard';
import { ExerciseTable } from '../feed/ExerciseTable';
import { RouteSketch } from '../feed/RouteSketch';
import { KudosButton } from '../feed/KudosButton';
import { useKeyboardVisible } from '../feed/useKeyboardVisible';
import { workoutStats } from '../feed/stats';
import { VISIBILITY_LABEL, fullDate, fullName, kindLabel, plural } from '../feed/model';
import { TagRequestCard, TagSheet } from '../feed/tags';
import { PhotoGallery, pickPhotos } from '../feed/photos';

const COMMENT_MAX = 500;

export function WorkoutDetailScreen({ route, navigation }: RootScreenProps<'WorkoutDetail'>) {
  const { state, actions } = useStore();
  const me = useMe();
  const insets = useSafeAreaInsets();
  const keyboardUp = useKeyboardVisible();
  const [removed, setRemoved] = useState(false);
  const [draft, setDraft] = useState('');
  const [tagging, setTagging] = useState(false);
  const scroll = useRef<ScrollView>(null);
  const scrollToEndNext = useRef(false);
  const now = useMemo(() => new Date(), [state]);

  const item = workoutById(state, route.params.workoutId, me.id);
  const givers = useMemo(() => (item ? kudosGivers(state, item.workout.id) : []), [state, item?.workout.id]);
  const candidates = useMemo(() => tagCandidates(state, me.id), [state, me.id]);
  const followingCount = useMemo(() => {
    const following = new Set(followingIds(state, me.id));
    return candidates.filter(c => following.has(c.id)).length;
  }, [state, me.id, candidates]);

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

  const { workout: w, author, tagged, photos, comments, kudosCount, kudoedByMe, isMine } = item;
  const vis = VISIBILITY_LABEL[w.visibility];
  const trimmed = draft.trim();
  const myTag = tagOf(state, w.id, me.id);
  const tags = tagsFor(state, w.id);
  const canAdd = canAddPhotos(state, me.id, w);

  async function addPhotos() {
    const picked = await pickPhotos(MAX_PHOTOS - photos.length);
    for (const p of picked) {
      if (!attempt(() => actions.addPhoto({ workoutId: w.id, uri: p.uri, mimeType: p.mimeType }), "Couldn't add the photo").ok) break;
    }
  }

  function confirmRemovePhoto(id: ID) {
    Alert.alert('Remove this photo?', 'It comes off the workout for everyone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => attempt(() => actions.removePhoto(id), "Couldn't remove the photo") },
    ]);
  }

  function confirmRemoveTag(s: Student) {
    const self = s.id === me.id;
    Alert.alert(self ? 'Remove yourself?' : `Remove ${s.firstName}?`,
      self ? "It comes off your profile. The workout stays on the owner's." : `${s.firstName} won't be shown as training with you.`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => attempt(() => actions.removeTag({ workoutId: w.id, studentId: s.id }), "Couldn't remove the tag") },
      ]);
  }

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
    <KeyboardFrame style={styles.root}>
      <ScrollView
        ref={scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        onContentSizeChange={() => {
          if (scrollToEndNext.current) { scrollToEndNext.current = false; scroll.current?.scrollToEnd({ animated: true }); }
        }}>
        {myTag?.status === 'pending' ? (
          <View style={styles.request}>
            <TagRequestCard author={author} workout={w} now={now}
              onAnswer={accept => {
                const res = attempt(() => actions.respondToTag({ workoutId: w.id, accept }), "Couldn't answer the tag");
                if (res.ok && !accept) navigation.goBack();
              }} />
          </View>
        ) : null}
        <View style={styles.authorWrap}>
          <AuthorRow author={author} tagged={tagged} workout={w} now={now} size={44} />
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

        {photos.length || canAdd ? (
          <Section title="Photos" count={photos.length}>
            <PhotoGallery state={state} photos={photos} canAdd={canAdd} onAdd={addPhotos} onRemove={confirmRemovePhoto}
              canRemove={(p: WorkoutPhoto) => p.studentId === me.id || isMine} />
            {canAdd && !photos.length ? (
              <Text variant="small" color="muted">{isMine ? 'Add a photo from the session. Friends you tag can add theirs too.' : 'You trained together, so you can add photos too.'}</Text>
            ) : null}
          </Section>
        ) : null}

        {tags.length || isMine ? (
          <Section title={w.kind === 'sport' ? 'Played with' : 'Trained with'} count={tagged.length}
            right={isMine ? <Button label="Tag friends" icon="person-add-outline" variant="secondary" size="sm" onPress={() => setTagging(true)} /> : undefined}>
            {tags.length ? (
              <View style={styles.mates}>
                {tags.map(t => {
                  const s = studentById(state, t.studentId);
                  if (!s) return null;
                  const removable = isMine || (s.id === me.id && t.status === 'accepted');
                  return (
                    <MateRow key={s.id} student={s} status={t.status === 'pending' ? 'Waiting for them to accept' : s.id === me.id ? 'You' : s.classYear}
                      onRemove={removable ? () => confirmRemoveTag(s) : undefined} removeLabel={s.id === me.id ? 'Remove me' : 'Remove'} />
                  );
                })}
              </View>
            ) : (
              <Text variant="small" color="muted">Trained with someone? Tag them so it lands on their profile too.</Text>
            )}
          </Section>
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

      <TagSheet visible={tagging} candidates={candidates} followingCount={followingCount} alreadyTagged={tags.map(t => t.studentId)}
        onClose={() => setTagging(false)}
        onTag={ids => { if (attempt(() => actions.tagFriends({ workoutId: w.id, studentIds: ids }), "Couldn't tag").ok) setTagging(false); }} />

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
    </KeyboardFrame>
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
    return (
      <View style={styles.statsGap}>
        <View style={styles.activity}>
          <Icon name={activityIcon(w)} size={18} color="inkSoft" />
          <Text variant="eyebrow" color="inkSoft">{activityLabel(w)}</Text>
        </View>
        <Scoreboard stats={workoutStats(w)} />
      </View>
    );
  }
  return (
    <View style={[styles.statsGap, styles.sessionCard]}>
      <WorkoutBody workout={w} />
    </View>
  );
}

function MateRow({ student, status, onRemove, removeLabel }: { student: Student; status: string; onRemove?: () => void; removeLabel: string }) {
  const nav = useNavigation();
  return (
    <View style={styles.mate}>
      <Pressable onPress={() => nav.navigate('StudentProfile', { studentId: student.id })} accessibilityRole="link" accessibilityLabel={`${fullName(student)}, ${status}. Open profile`}
        style={({ pressed }) => [styles.mateMain, pressed && styles.pressed]}>
        <Avatar student={student} size={36} />
        <View style={styles.shrink}>
          <Text variant="bodyStrong" numberOfLines={1}>{fullName(student)}</Text>
          <Text variant="tiny" color="muted">{status}</Text>
        </View>
      </Pressable>
      {onRemove ? (
        <Pressable onPress={onRemove} hitSlop={hitSlop} accessibilityRole="button" accessibilityLabel={`${removeLabel}: ${fullName(student)}`} style={styles.mateRemove}>
          <Text variant="tiny" color="muted">{removeLabel}</Text>
        </Pressable>
      ) : null}
    </View>
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
  mate: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: minTouch + 8 },
  mateMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.xs },
  mateRemove: { minHeight: minTouch, justifyContent: 'center', paddingHorizontal: space.sm },
  request: { marginBottom: space.lg },
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
