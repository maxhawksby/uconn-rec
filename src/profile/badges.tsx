import React, { useEffect, useState } from 'react';
import { FlatList, Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import type { Org, OrgKind, Student } from '../data/types';
import { MAX_BADGES, MAX_MAJORS, badgesFor, searchOrgs } from '../data/selectors';
import { SCHOOL_BY_ID } from '../data/schools';
import { useStore } from '../data/store';
import { colors, gutter, hitSlop, minTouch, radius, space } from '../theme';
import { Icon, Input, KeyboardFrame, Text, attempt } from '../ui';

// Identity badges: a student's major and the Greek chapter, clubs and teams they're in.
// Picked from the campus list; anything missing can be added by the student.

export const KINDS: { kind: OrgKind; label: string; plural: string; icon: string }[] = [
  { kind: 'major', label: 'Major', plural: 'majors', icon: 'school-outline' },
  { kind: 'greek', label: 'Greek life', plural: 'chapters', icon: 'home-outline' },
  { kind: 'club', label: 'Club', plural: 'clubs', icon: 'flag-outline' },
  { kind: 'team', label: 'Team', plural: 'teams', icon: 'shirt-outline' },
];
const KIND = Object.fromEntries(KINDS.map(k => [k.kind, k])) as Record<OrgKind, (typeof KINDS)[number]>;

/** Quiet chips on the profile, each with its kind's icon. */
export function BadgeChips({ orgs }: { orgs: Org[] }) {
  return (
    <View style={styles.chips}>
      {orgs.map(o => (
        <View key={o.id} style={styles.chip} accessible accessibilityLabel={`${KIND[o.kind].label}: ${o.name}`}>
          <Icon name={KIND[o.kind].icon} size={14} color="muted" />
          <Text variant="smallStrong" color="inkSoft">{o.name}</Text>
        </View>
      ))}
    </View>
  );
}

type Props = { visible: boolean; me: Student; onClose: () => void };

/** Page sheet for picking your badges. Each tap saves at once, so there's only Done. */
export function BadgeSheet({ visible, me, onClose }: Props) {
  const { state, actions } = useStore();
  const [kind, setKind] = useState<OrgKind>('major');
  const [query, setQuery] = useState('');
  useEffect(() => { if (visible) { setKind('major'); setQuery(''); } }, [visible]);

  const worn = badgesFor(state, me.id);
  const wornIds = new Set(worn.map(o => o.id));
  const results = searchOrgs(state, me.schoolId, kind, query);
  const name = query.trim().replace(/\s+/g, ' ');
  const exact = results.some(o => o.name.toLowerCase() === name.toLowerCase());
  const campus = SCHOOL_BY_ID[me.schoolId]?.shortName ?? 'your campus';
  const majors = worn.filter(o => o.kind === 'major').length;
  const k = KIND[kind];

  const toggle = (o: Org) => attempt(() => (wornIds.has(o.id) ? actions.removeBadge(o.id) : actions.addBadge(o.id)), "Couldn't change your badges");
  const addNew = () => { if (attempt(() => actions.addNewBadge({ kind, name }), "Couldn't add it").ok) setQuery(''); };

  const hint = kind === 'major'
    ? `Up to ${MAX_MAJORS} majors · ${majors} picked`
    : `${worn.length} of ${MAX_BADGES} badges in all`;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaProvider>
        <SafeAreaView style={styles.root} edges={Platform.OS === 'ios' ? ['bottom'] : ['top', 'bottom']}>
          <View style={styles.bar}>
            <View style={styles.barSide} />
            <Text variant="h2" accessibilityRole="header">Badges</Text>
            <Pressable onPress={onClose} hitSlop={hitSlop} accessibilityRole="button" style={[styles.barSide, styles.barRight]}>
              <Text variant="bodyStrong" color="accentText">Done</Text>
            </Pressable>
          </View>
          <KeyboardFrame>
            <View style={styles.head}>
              {worn.length ? (
                <View style={styles.chips}>
                  {worn.map(o => (
                    <Pressable key={o.id} onPress={() => toggle(o)} accessibilityRole="button" accessibilityLabel={`Remove ${o.name}`}
                      style={({ pressed }) => [styles.chip, styles.chipOn, pressed && styles.pressedOn]}>
                      <Icon name={KIND[o.kind].icon} size={14} color="onBoardMuted" />
                      <Text variant="smallStrong" color="onBoard">{o.name}</Text>
                      <Icon name="close" size={14} color="onBoardMuted" />
                    </Pressable>
                  ))}
                </View>
              ) : (
                <Text variant="small" color="muted">Show your major and what you're part of. Classmates see these on your profile.</Text>
              )}

              <View style={styles.tabs} accessibilityRole="tablist">
                {KINDS.map(t => {
                  const on = t.kind === kind;
                  return (
                    <Pressable key={t.kind} onPress={() => { setKind(t.kind); setQuery(''); }} accessibilityRole="tab" accessibilityState={{ selected: on }}
                      style={({ pressed }) => [styles.tab, on && styles.tabOn, pressed && !on && styles.pressed]}>
                      <Text variant="smallStrong" color={on ? 'onBoard' : 'inkSoft'} numberOfLines={1}>{t.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
              <Input value={query} onChangeText={setQuery} placeholder={`Search ${k.plural} at ${campus}`} autoCorrect={false} returnKeyType="search"
                accessibilityLabel={`Search ${k.plural}`} />
              <Text variant="tiny" color="muted">{hint}</Text>
            </View>

            <FlatList
              data={results}
              keyExtractor={o => o.id}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              contentContainerStyle={styles.list}
              renderItem={({ item: o, index }) => {
                const on = wornIds.has(o.id);
                return (
                  <Pressable onPress={() => toggle(o)} accessibilityRole="checkbox" accessibilityState={{ checked: on }} accessibilityLabel={o.name}
                    style={({ pressed }) => [styles.row, index > 0 && styles.rowRule, pressed && styles.pressed]}>
                    <Text variant="body" numberOfLines={1} style={styles.flex}>{o.name}</Text>
                    <View style={[styles.check, on && styles.checkOn]}>{on ? <Icon name="checkmark" size={16} color="onBoard" /> : null}</View>
                  </Pressable>
                );
              }}
              ListFooterComponent={name.length >= 2 && !exact ? (
                <Pressable onPress={addNew} accessibilityRole="button" accessibilityLabel={`Add ${name} as a new ${k.label.toLowerCase()}`}
                  style={({ pressed }) => [styles.row, results.length > 0 && styles.rowRule, pressed && styles.pressed]}>
                  <Icon name="add-circle-outline" size={20} color="accentText" />
                  <Text variant="bodyStrong" color="accentText" numberOfLines={2} style={styles.flex}>Add “{name}”</Text>
                  <Text variant="tiny" color="muted">New {k.label.toLowerCase()} at {campus}</Text>
                </Pressable>
              ) : null}
              ListEmptyComponent={name.length < 2 ? (
                <Text variant="small" color="muted" style={styles.empty}>No {k.plural} at {campus} yet. Type a name to add yours.</Text>
              ) : null}
            />
          </KeyboardFrame>
        </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: gutter, minHeight: minTouch + space.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  barSide: { minWidth: space.x5 + space.lg },
  barRight: { alignItems: 'flex-end' },
  head: { paddingHorizontal: gutter, paddingTop: space.lg, gap: space.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  chip: { flexDirection: 'row', alignItems: 'center', gap: space.xs, paddingHorizontal: space.md, paddingVertical: space.xs + space.xxs, borderRadius: radius.pill, backgroundColor: colors.sunken },
  chipOn: { backgroundColor: colors.ink, minHeight: 36 },
  pressedOn: { opacity: 0.8 },
  tabs: { flexDirection: 'row', backgroundColor: colors.sunken, borderRadius: radius.md, padding: space.xxs },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: minTouch - space.xs, borderRadius: radius.sm + space.xxs },
  tabOn: { backgroundColor: colors.ink },
  pressed: { backgroundColor: colors.line },
  list: { marginHorizontal: gutter, marginTop: space.md, marginBottom: space.x4, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, minHeight: minTouch + space.xs },
  rowRule: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
  check: { width: 24, height: 24, borderRadius: radius.sm, borderWidth: 1.5, borderColor: colors.faint, alignItems: 'center', justifyContent: 'center' },
  checkOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  empty: { padding: space.lg },
});
