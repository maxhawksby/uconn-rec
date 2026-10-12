import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { Student } from '../data/types';
import { badgesFor } from '../data/selectors';
import { useStore } from '../data/store';
import { colors, radius, space } from '../theme';
import { Avatar, Icon, SchoolBadge, Text } from '../ui';
import { CountsRow } from './parts';
import { NameMark } from './awards';
import { BadgeChips } from './badges';

type Props = {
  student: Student;
  counts: { label: string; value: number }[];
  tag?: string; // e.g. "Follows you"
  action?: React.ReactNode; // follow or edit button
  onEditBadges?: () => void; // your own profile only
};

/** Avatar, name (with top award) in jersey caps, school, bio, badges and counts. Shared by both profile screens. */
export function ProfileHeader({ student, counts, tag, action, onEditBadges }: Props) {
  const { state } = useStore();
  const badges = badgesFor(state, student.id);
  return (
    <View style={styles.wrap}>
      <View style={styles.top}>
        <Avatar student={student} size={72} />
        <View style={styles.names}>
          <NameMark student={student} variant="title" numberOfLines={2} />
          <View style={styles.meta}>
            <SchoolBadge schoolId={student.schoolId} />
            <Text variant="small" color="muted">{student.classYear}</Text>
            {tag ? <View style={styles.tag}><Text variant="eyebrow" color="inkSoft">{tag}</Text></View> : null}
          </View>
        </View>
      </View>
      {student.bio ? <Text variant="body" color="inkSoft">{student.bio}</Text> : null}
      {badges.length || onEditBadges ? (
        <View style={styles.badges}>
          {badges.length ? <BadgeChips orgs={badges} /> : null}
          {onEditBadges ? (
            <Pressable onPress={onEditBadges} accessibilityRole="button" accessibilityLabel={badges.length ? 'Edit badges' : 'Add badges'}
              style={({ pressed }) => [styles.addBadge, pressed && styles.pressed]}>
              <Icon name={badges.length ? 'create-outline' : 'add'} size={14} color="inkSoft" />
              <Text variant="smallStrong" color="inkSoft">{badges.length ? 'Edit badges' : 'Add your major, teams and clubs'}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
      <CountsRow counts={counts} />
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.lg, paddingBottom: space.xl },
  top: { flexDirection: 'row', alignItems: 'center', gap: space.lg },
  names: { flex: 1, gap: space.sm },
  meta: { flexDirection: 'row', alignItems: 'center', gap: space.sm, flexWrap: 'wrap' },
  badges: { gap: space.sm, alignItems: 'flex-start' },
  addBadge: { flexDirection: 'row', alignItems: 'center', gap: space.xs, paddingHorizontal: space.md, minHeight: 32, borderRadius: radius.pill, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.faint },
  pressed: { backgroundColor: colors.sunken },
  tag: { backgroundColor: colors.sunken, borderRadius: radius.sm, paddingHorizontal: space.sm, paddingVertical: space.xxs },
});
