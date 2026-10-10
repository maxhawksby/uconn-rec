import React from 'react';
import { StyleSheet, View } from 'react-native';
import { colors, radius, space } from '../theme';
import { Text } from './Text';
import { SCHOOL_BY_ID } from '../data/schools';

/** Text-only school tag. Never a logo or school color: Dean's Lift is independent. */
export function SchoolBadge({ schoolId, verified = true }: { schoolId: string; verified?: boolean }) {
  const school = SCHOOL_BY_ID[schoolId];
  if (!school) return null;
  return (
    <View style={styles.badge} accessibilityLabel={`${school.name}${verified ? ', verified student' : ''}`}>
      <Text variant="eyebrow" color="inkSoft">{school.shortName}</Text>
      {verified ? <View style={styles.dot} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { flexDirection: 'row', alignItems: 'center', gap: space.xs, alignSelf: 'flex-start', borderWidth: 1, borderColor: colors.line, borderRadius: radius.sm, paddingHorizontal: space.sm, paddingVertical: space.xxs },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.turf },
});
