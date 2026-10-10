import React from 'react';
import { StyleSheet, View } from 'react-native';
import { colors, fonts } from '../theme';
import { Text } from './Text';
import { initials } from '../data/selectors';
import type { Student } from '../data/types';

// Neutral tints picked by id so the same student always gets the same disc.
const TINTS = [colors.ink, colors.inkSoft, colors.accent, colors.turf, colors.muted];

export function Avatar({ student, size = 40 }: { student: Pick<Student, 'id' | 'firstName' | 'lastName'>; size?: number }) {
  const tint = TINTS[[...student.id].reduce((n, c) => n + c.charCodeAt(0), 0) % TINTS.length];
  return (
    <View accessibilityLabel={`${student.firstName} ${student.lastName}`} style={[styles.disc, { width: size, height: size, borderRadius: size / 2, backgroundColor: tint }]}>
      <Text style={{ fontFamily: fonts.numeral, fontSize: size * 0.42, lineHeight: size * 0.5, color: colors.onBoard }}>{initials(student)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({ disc: { alignItems: 'center', justifyContent: 'center' } });
