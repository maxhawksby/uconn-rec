import React from 'react';
import { StyleSheet, View } from 'react-native';
import type { Student } from '../data/types';
import { colors, radius, space } from '../theme';
import { Avatar, SchoolBadge, Text } from '../ui';
import { CountsRow } from './parts';

type Props = {
  student: Student;
  counts: { label: string; value: number }[];
  tag?: string; // e.g. "Follows you"
  action?: React.ReactNode; // follow or edit button
};

/** Avatar, name in jersey caps, school badge, bio and counts. Shared by both profile screens. */
export function ProfileHeader({ student, counts, tag, action }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.top}>
        <Avatar student={student} size={72} />
        <View style={styles.names}>
          <Text variant="title" numberOfLines={2}>{student.firstName} {student.lastName}</Text>
          <View style={styles.meta}>
            <SchoolBadge schoolId={student.schoolId} />
            <Text variant="small" color="muted">{student.classYear}</Text>
            {tag ? <View style={styles.tag}><Text variant="eyebrow" color="inkSoft">{tag}</Text></View> : null}
          </View>
        </View>
      </View>
      {student.bio ? <Text variant="body" color="inkSoft">{student.bio}</Text> : null}
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
  tag: { backgroundColor: colors.sunken, borderRadius: radius.sm, paddingHorizontal: space.sm, paddingVertical: space.xxs },
});
