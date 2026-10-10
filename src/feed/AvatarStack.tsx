import React from 'react';
import { StyleSheet, View } from 'react-native';
import type { Student } from '../data/types';
import { Avatar, Text } from '../ui';
import { colors, fonts } from '../theme';

/** Overlapping avatars with a "+3" overflow disc. */
export function AvatarStack({ students, size = 28, max = 4 }: { students: Student[]; size?: number; max?: number }) {
  const shown = students.slice(0, max);
  const extra = students.length - shown.length;
  const overlap = -Math.round(size / 3.5);
  return (
    <View style={styles.row}>
      {shown.map((s, i) => (
        <View key={s.id} style={[styles.ring, { borderRadius: size, marginLeft: i ? overlap : 0 }]}>
          <Avatar student={s} size={size} />
        </View>
      ))}
      {extra > 0 ? (
        <View style={[styles.ring, styles.more, { width: size + 4, height: size + 4, borderRadius: size, marginLeft: overlap }]}>
          <Text variant="tiny" color="inkSoft" style={styles.moreText}>+{extra}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  ring: { borderWidth: 2, borderColor: colors.surface },
  more: { backgroundColor: colors.sunken, alignItems: 'center', justifyContent: 'center' },
  moreText: { fontFamily: fonts.bodyBold },
});
