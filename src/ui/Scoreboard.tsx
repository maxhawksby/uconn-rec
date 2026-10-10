import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { colors, radius, space } from '../theme';
import { Text } from './Text';

export type Stat = { label: string; value: string; unit?: string };

/**
 * Signature element: an ink scoreboard panel with condensed numerals.
 * Use for the numbers that matter (workout stats, weekly totals, streak) - not decoration.
 */
export function Scoreboard({ stats, compact, style }: { stats: Stat[]; compact?: boolean; style?: ViewStyle }) {
  return (
    <View style={[styles.board, compact && styles.compact, style]}>
      {stats.map((s, i) => (
        <View key={s.label} style={[styles.cell, i > 0 && styles.divider]} accessible accessibilityLabel={`${s.label} ${s.value} ${s.unit ?? ''}`}>
          <Text variant="statLabel" color="onBoardMuted">{s.label}</Text>
          <View style={styles.valueRow}>
            <Text variant="stat" color="onBoard" style={compact ? styles.compactValue : undefined}>{s.value}</Text>
            {s.unit ? <Text variant="statLabel" color="onBoardMuted" style={styles.unit}>{s.unit}</Text> : null}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  board: { flexDirection: 'row', backgroundColor: colors.board, borderRadius: radius.md, paddingVertical: space.lg, paddingHorizontal: space.sm },
  compact: { paddingVertical: space.md },
  cell: { flex: 1, paddingHorizontal: space.md, gap: space.xs },
  divider: { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: colors.onBoardMuted },
  valueRow: { flexDirection: 'row', alignItems: 'baseline', gap: space.xs },
  unit: { marginBottom: space.xxs },
  compactValue: { fontSize: 24, lineHeight: 26 },
});
