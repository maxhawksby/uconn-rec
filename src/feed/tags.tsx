import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import type { ID, Student, Workout } from '../data/types';
import { relativeTime } from '../data/selectors';
import { Avatar, Button, Icon, Input, Text } from '../ui';
import { colors, gutter, hitSlop, minTouch, radius, space } from '../theme';
import { fullName, kindLabel } from './model';

// Training partners: who you worked out with, shown as one shared post.

/** "Caleb Mensah & Hannah Weiss", or "Kayla Brooks & 2 friends". */
export function crewTitle(author: Student, tagged: Student[]) {
  if (!tagged.length) return fullName(author);
  if (tagged.length === 1) return `${fullName(author)} & ${fullName(tagged[0])}`;
  return `${fullName(author)} & ${tagged.length} friends`;
}

/** The author's avatar with the first training partner tucked in front, like a jersey pair. */
export function CrewAvatar({ author, tagged, size = 40 }: { author: Student; tagged: Student[]; size?: number }) {
  if (!tagged.length) return <Avatar student={author} size={size} />;
  const small = Math.round(size * 0.62);
  return (
    <View style={{ width: size + small * 0.45, height: size + small * 0.3 }}>
      <Avatar student={author} size={size} />
      <View style={[styles.partner, { borderRadius: small }]}>
        <Avatar student={tagged[0]} size={small} />
      </View>
    </View>
  );
}

// ---------- Tag request (Feed and workout detail) ----------

type RequestProps = { author: Student; workout: Workout; now: Date; onOpen?: () => void; onAnswer: (accept: boolean) => void };

/** An ink scoreboard panel: someone says you trained together. Accept or decline. */
export function TagRequestCard({ author, workout, now, onOpen, onAnswer }: RequestProps) {
  return (
    <Pressable onPress={onOpen} disabled={!onOpen} accessibilityRole={onOpen ? 'button' : undefined}
      accessibilityLabel={`${fullName(author)} tagged you in ${workout.title}. Open workout`}
      style={({ pressed }) => [styles.request, pressed && styles.requestPressed]}>
      <View style={styles.requestHead}>
        <Avatar student={author} size={40} />
        <View style={styles.flex}>
          <Text variant="statLabel" color="onBoardMuted">Tagged you · {relativeTime(workout.startedAt, now)}</Text>
          <Text variant="small" color="onBoard" numberOfLines={1}>{author.firstName} says you trained together</Text>
        </View>
      </View>
      <View style={styles.requestBody}>
        <Text variant="h2" color="onBoard" numberOfLines={1} style={styles.flex}>{workout.title}</Text>
        <Text variant="statLabel" color="onBoardMuted">{kindLabel(workout)}</Text>
      </View>
      <View style={styles.requestActions}>
        <Button label="Accept" icon="checkmark" variant="secondary" size="sm" onPress={() => onAnswer(true)} />
        <Pressable onPress={() => onAnswer(false)} hitSlop={hitSlop} accessibilityRole="button" accessibilityLabel="Not me, decline the tag"
          style={({ pressed }) => [styles.decline, pressed && styles.declinePressed]}>
          <Text variant="smallStrong" color="onBoardMuted">Not me</Text>
        </Pressable>
        <Text variant="tiny" color="onBoardMuted" style={styles.requestHint}>Adds it to your profile</Text>
      </View>
    </Pressable>
  );
}

// ---------- Picker ----------

type PickerProps = {
  candidates: Student[]; // people you follow first, then the rest of campus
  followingCount: number; // how many candidates are people you follow
  selected: ID[];
  locked?: ID[]; // already tagged: shown checked, can't be toggled here
  onToggle: (id: ID) => void;
};

/** Checkbox rows of classmates. Search appears once the list is long. */
export function TagPicker({ candidates, followingCount, selected, locked = [], onToggle }: PickerProps) {
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  // Without a search, show who you follow; searching reaches the whole campus.
  const shown = q
    ? candidates.filter(s => fullName(s).toLowerCase().includes(q))
    : candidates.slice(0, Math.max(followingCount, Math.min(6, candidates.length)));

  if (!candidates.length) {
    return (
      <View style={styles.none}>
        <Icon name="people-outline" size={20} color="faint" />
        <Text variant="small" color="muted" style={styles.flex}>Nobody else from your campus is here yet. Invite your gym crew.</Text>
      </View>
    );
  }
  return (
    <View style={styles.picker}>
      {candidates.length > 6 ? (
        <Input value={query} onChangeText={setQuery} placeholder="Search classmates" autoCorrect={false} returnKeyType="search"
          accessibilityLabel="Search classmates to tag" />
      ) : null}
      <View style={styles.people}>
        {shown.map((s, i) => {
          const isLocked = locked.includes(s.id);
          const on = isLocked || selected.includes(s.id);
          return (
            <Pressable key={s.id} disabled={isLocked} accessibilityRole="checkbox" accessibilityState={{ checked: on, disabled: isLocked }}
              accessibilityLabel={`${fullName(s)}${isLocked ? ', already tagged' : ''}`} onPress={() => onToggle(s.id)}
              style={({ pressed }) => [styles.person, i === shown.length - 1 && styles.personLast, pressed && styles.pressed]}>
              <Avatar student={s} size={36} />
              <View style={styles.flex}>
                <Text variant="bodyStrong" numberOfLines={1}>{fullName(s)}</Text>
                <Text variant="tiny" color="muted">{isLocked ? 'Already tagged' : !q && i < followingCount ? `Following · ${s.classYear}` : s.classYear}</Text>
              </View>
              <View style={[styles.box, on && styles.boxOn, isLocked && styles.boxLocked]}>{on ? <Icon name="checkmark" size={16} color="onBoard" /> : null}</View>
            </Pressable>
          );
        })}
        {q && !shown.length ? <Text variant="small" color="muted" style={styles.noMatch}>Nobody at your campus matches "{query.trim()}".</Text> : null}
      </View>
      {!q && candidates.length > shown.length ? (
        <Text variant="tiny" color="muted">Search to tag anyone else at your campus.</Text>
      ) : null}
    </View>
  );
}

// ---------- Sheet (tag after posting) ----------

type SheetProps = {
  visible: boolean;
  candidates: Student[];
  followingCount: number;
  alreadyTagged: ID[];
  onClose: () => void;
  onTag: (ids: ID[]) => void;
};

export function TagSheet({ visible, candidates, followingCount, alreadyTagged, onClose, onTag }: SheetProps) {
  const [picked, setPicked] = useState<ID[]>([]);
  useEffect(() => { if (visible) setPicked([]); }, [visible]);
  const toggle = (id: ID) => setPicked(p => (p.includes(id) ? p.filter(x => x !== id) : [...p, id]));
  const label = useMemo(() => (picked.length ? `Tag ${picked.length === 1 ? '1 friend' : `${picked.length} friends`}` : 'Pick who trained with you'), [picked.length]);
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaProvider>
        <SafeAreaView style={styles.sheet} edges={['top', 'bottom']}>
          <View style={styles.sheetHead}>
            <View style={styles.flex}>
              <Text variant="eyebrow" color="accentText">Trained together</Text>
              <Text variant="title">Tag friends</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={hitSlop} accessibilityRole="button" accessibilityLabel="Close" style={styles.close}>
              <Icon name="close" size={24} color="ink" />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.sheetBody} keyboardShouldPersistTaps="handled">
            <Text variant="small" color="muted">They get a request. Once they accept, it shows on their profile and they can add photos.</Text>
            <TagPicker candidates={candidates} followingCount={followingCount} selected={picked} locked={alreadyTagged} onToggle={toggle} />
          </ScrollView>
          <View style={styles.sheetFoot}>
            <Button label={label} block disabled={!picked.length} onPress={() => onTag(picked)} />
          </View>
        </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  partner: { position: 'absolute', right: 0, bottom: 0, borderWidth: 2, borderColor: colors.surface },
  request: { backgroundColor: colors.board, borderRadius: radius.md, padding: space.lg, gap: space.md },
  requestPressed: { opacity: 0.9 },
  requestHead: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  requestBody: { flexDirection: 'row', alignItems: 'baseline', gap: space.sm, paddingTop: space.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.onBoardMuted },
  requestActions: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  decline: { minHeight: minTouch - 8, paddingHorizontal: space.md, justifyContent: 'center', borderRadius: radius.md },
  declinePressed: { opacity: 0.6 },
  requestHint: { flex: 1, textAlign: 'right' },
  picker: { gap: space.sm },
  people: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line, overflow: 'hidden' },
  person: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, minHeight: minTouch + 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  personLast: { borderBottomWidth: 0 },
  pressed: { backgroundColor: colors.sunken },
  box: { width: 24, height: 24, borderRadius: radius.sm, borderWidth: 1.5, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  boxOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  boxLocked: { opacity: 0.4 },
  noMatch: { padding: space.lg },
  none: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg, borderRadius: radius.md, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.line },
  sheet: { flex: 1, backgroundColor: colors.bg },
  sheetHead: { flexDirection: 'row', alignItems: 'flex-end', paddingLeft: gutter, paddingRight: space.md, paddingTop: space.lg, paddingBottom: space.lg },
  close: { width: minTouch, height: minTouch, alignItems: 'center', justifyContent: 'center' },
  sheetBody: { paddingHorizontal: gutter, paddingBottom: space.xxl, gap: space.lg },
  sheetFoot: { paddingHorizontal: gutter, paddingVertical: space.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line, backgroundColor: colors.bg },
});
