import React from 'react';
import { StyleSheet, View } from 'react-native';
import type { LiftExercise } from '../data/types';
import { Text } from '../ui';
import { colors, radius, space } from '../theme';
import { bestSet, compactNumber, exerciseVolume } from './model';

/** Every exercise with its full set table. The heaviest set of each exercise is marked. */
export function ExerciseTable({ exercises }: { exercises: LiftExercise[] }) {
  return (
    <View style={styles.list}>
      {exercises.map((e, ei) => {
        const best = bestSet(e.sets);
        const bestIndex = best ? e.sets.indexOf(best) : -1;
        const vol = exerciseVolume(e);
        return (
          <View key={`${e.name}-${ei}`} style={styles.block}>
            <View style={styles.blockHead}>
              <Text variant="bodyStrong" style={styles.flex} numberOfLines={2}>{e.name}</Text>
              <Text variant="tiny" color="muted">{vol > 0 ? `${compactNumber(vol)} lb` : 'Bodyweight'}</Text>
            </View>
            <View style={[styles.row, styles.headRow]}>
              <Text variant="statLabel" color="muted" style={styles.colSet}>Set</Text>
              <Text variant="statLabel" color="muted" style={styles.colNum}>Weight</Text>
              <Text variant="statLabel" color="muted" style={styles.colNum}>Reps</Text>
              <View style={styles.colTag} />
            </View>
            {e.sets.map((s, si) => {
              const isBest = si === bestIndex && e.sets.length > 1;
              return (
                <View key={si} style={[styles.row, isBest && styles.bestRow]}
                  accessible accessibilityLabel={`Set ${si + 1}: ${s.weight > 0 ? `${s.weight} pounds` : 'bodyweight'}, ${s.reps} reps${isBest ? ', best set' : ''}`}>
                  <Text variant="smallStrong" color="muted" style={styles.colSet}>{si + 1}</Text>
                  <Text variant="smallStrong" style={[styles.colNum, styles.num]}>{s.weight > 0 ? `${s.weight} lb` : 'BW'}</Text>
                  <Text variant="smallStrong" style={[styles.colNum, styles.num]}>{s.reps}</Text>
                  <View style={styles.colTag}>
                    {isBest ? <Text variant="statLabel" color="inkSoft">Best</Text> : null}
                  </View>
                </View>
              );
            })}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: space.md },
  block: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line, paddingVertical: space.md },
  blockHead: { flexDirection: 'row', alignItems: 'baseline', gap: space.md, paddingHorizontal: space.lg, marginBottom: space.sm },
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 32, paddingHorizontal: space.lg },
  headRow: { minHeight: 24, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line, marginBottom: space.xxs },
  bestRow: { backgroundColor: colors.sunken },
  colSet: { width: 40 },
  colNum: { flex: 1 },
  colTag: { width: 40, alignItems: 'flex-end' },
  num: { fontVariant: ['tabular-nums'] },
});
