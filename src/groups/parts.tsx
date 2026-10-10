import React from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import type { Group, GroupKind, Student } from '../data/types';
import { colors, hitSlop, minTouch, radius, space, type } from '../theme';
import { Avatar, Button, Card, Icon, Text } from '../ui';
import { KIND_INFO, memberLabel } from './model';

const TILE = 44;

/** Section label: condensed caps with an optional true count and a right-side link. */
export function SectionHeader({ title, count, actionLabel, onAction }: { title: string; count?: number; actionLabel?: string; onAction?: () => void }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionTitle}>
        <Text variant="h2">{title}</Text>
        {count !== undefined ? <Text variant="h2" color="faint">{count}</Text> : null}
      </View>
      {actionLabel && onAction ? (
        <Pressable accessibilityRole="button" onPress={onAction} hitSlop={hitSlop}>
          <Text variant="smallStrong" color="inkSoft">{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/** Ink square with the group kind's icon. The group's "crest" without any school mark. */
export function KindTile({ kind, size = TILE }: { kind: GroupKind; size?: number }) {
  return (
    <View style={[styles.tile, { width: size, height: size }]} accessibilityElementsHidden importantForAccessibility="no">
      <Icon name={KIND_INFO[kind].icon} size={Math.round(size * 0.48)} color="onBoard" />
    </View>
  );
}

/** Up to `max` overlapping avatars plus a "+n" disc. */
export function AvatarStack({ students, total, max = 4, size = 24 }: { students: Student[]; total: number; max?: number; size?: number }) {
  const shown = students.slice(0, max);
  const extra = total - shown.length;
  return (
    <View style={styles.stack} accessibilityLabel={memberLabel(total)}>
      {shown.map((s, i) => (
        <View key={s.id} style={[styles.stackItem, { marginLeft: i ? -size / 3 : 0, borderRadius: size }]}>
          <Avatar student={s} size={size} />
        </View>
      ))}
      {extra > 0 ? (
        <View style={[styles.stackItem, styles.more, { marginLeft: -size / 3, width: size + 2, height: size + 2, borderRadius: size }]}>
          <Text variant="tiny" color="inkSoft">+{extra}</Text>
        </View>
      ) : null}
    </View>
  );
}

export type Segment<K extends string> = { key: K; label: string; count?: number };

/** Three-way switch for the group detail. Rectangular on purpose: only chips are round. */
export function Segmented<K extends string>({ segments, value, onChange }: { segments: Segment<K>[]; value: K; onChange: (k: K) => void }) {
  return (
    <View style={styles.segTrack} accessibilityRole="tablist">
      {segments.map(s => {
        const on = s.key === value;
        return (
          <Pressable key={s.key} accessibilityRole="tab" accessibilityState={{ selected: on }} onPress={() => onChange(s.key)}
            style={[styles.seg, on && styles.segOn]}>
            <Text variant="eyebrow" color={on ? 'ink' : 'muted'}>{s.label}</Text>
            {s.count !== undefined ? <Text variant="eyebrow" color={on ? 'accent' : 'faint'}>{s.count}</Text> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

type GroupCardProps = {
  group: Group;
  members: Student[];
  preview?: string; // last message line, for your groups
  onPress: () => void;
  onJoin?: () => void; // discover cards join in one tap
};

export function GroupCard({ group, members, preview, onPress, onJoin }: GroupCardProps) {
  const info = KIND_INFO[group.kind];
  return (
    <Card onPress={onPress} accessibilityLabel={`${group.name}, ${info.label}, ${memberLabel(group.memberIds.length)}`}>
      <View style={styles.cardRow}>
        <KindTile kind={group.kind} />
        <View style={styles.cardBody}>
          <Text variant="eyebrow" color="muted">{info.label} · {memberLabel(group.memberIds.length)}</Text>
          <Text variant="bodyStrong" numberOfLines={1}>{group.name}</Text>
          {preview ? <Text variant="small" color="inkSoft" numberOfLines={1}>{preview}</Text>
            : group.description ? <Text variant="small" color="muted" numberOfLines={2}>{group.description}</Text> : null}
        </View>
        {onJoin ? <Button label="Join" size="sm" variant="secondary" onPress={onJoin} /> : <Icon name="chevron-forward" size={18} color="faint" />}
      </View>
      {onJoin && members.length ? (
        <View style={styles.cardFoot}><AvatarStack students={members} total={group.memberIds.length} /></View>
      ) : null}
    </Card>
  );
}

/** Search box with a leading icon and a clear button. */
export function SearchField({ value, onChangeText, placeholder }: { value: string; onChangeText: (t: string) => void; placeholder: string }) {
  return (
    <View style={styles.search}>
      <Icon name="search" size={18} color="faint" />
      <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={colors.faint}
        style={styles.searchInput} returnKeyType="search" autoCorrect={false} autoCapitalize="none" clearButtonMode="never"
        accessibilityLabel={placeholder} />
      {value ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Clear search" onPress={() => onChangeText('')} hitSlop={hitSlop}>
          <Icon name="close-circle" size={18} color="faint" />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  search: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: minTouch, paddingHorizontal: space.md, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line },
  searchInput: { ...type.body, flex: 1, color: colors.ink, paddingVertical: space.sm },
  section: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: space.xxl, marginBottom: space.md },
  sectionTitle: { flexDirection: 'row', alignItems: 'baseline', gap: space.sm },
  tile: { backgroundColor: colors.board, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  stack: { flexDirection: 'row', alignItems: 'center' },
  stackItem: { borderWidth: 1, borderColor: colors.surface },
  more: { backgroundColor: colors.sunken, alignItems: 'center', justifyContent: 'center' },
  segTrack: { flexDirection: 'row', backgroundColor: colors.sunken, borderRadius: radius.md, padding: space.xs },
  seg: { flex: 1, minHeight: minTouch - 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.xs, borderRadius: radius.sm },
  segOn: { backgroundColor: colors.surface },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  cardBody: { flex: 1, gap: space.xxs },
  cardFoot: { marginTop: space.md, paddingLeft: TILE + space.md },
});
