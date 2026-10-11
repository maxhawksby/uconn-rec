import React from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, gutter, space } from '../theme';
import { Button, Text } from '../ui';
import { SCHOOLS } from '../data/schools';
import { Stagger } from './parts';

// Brand moment. A track-lane lineup of the workout kinds students log, under a
// jersey-lettered wordmark. No school imagery: the app belongs to students, not a campus.

const LANES = ['Lift', 'Run', 'Ride', 'Pickup', 'Class'];

export function Welcome({ onStart }: { onStart: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <Stagger style={styles.body} step={60}>
        <Text key="eyebrow" variant="eyebrow" color="muted" style={styles.eyebrow}>For college students · {SCHOOLS.length} campuses</Text>
        <View key="mark" style={styles.markWrap} accessible accessibilityRole="header" accessibilityLabel="Valence">
          <Text variant="hero" style={styles.mark}>Valence</Text>
        </View>
        {LANES.map((lane, i) => (
          <View key={lane} style={[styles.lane, i === LANES.length - 1 && styles.laneLast]}>
            <Text variant="statLabel" color="faint" style={styles.laneNo}>{String(i + 1).padStart(2, '0')}</Text>
            <Text variant="h2" color="inkSoft" style={styles.laneName}>{lane}</Text>
          </View>
        ))}
        <Text key="pitch" variant="body" color="inkSoft" style={styles.pitch}>
          Log every workout. See what your friends, crews and campus are doing. Verify with your school email to get in.
        </Text>
      </Stagger>
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, space.lg) }]}>
        <Button label="Find your campus" icon="search" onPress={onStart} block />
        <Text variant="tiny" color="faint" center>Independent. Not affiliated with any university.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  body: { flex: 1, justifyContent: 'center', paddingHorizontal: gutter },
  // The wordmark is the one place type goes past the hero size: it's the logo.
  mark: { fontSize: 88, lineHeight: 80, letterSpacing: -2, marginBottom: -space.xs },
  lane: { flexDirection: 'row', alignItems: 'baseline', gap: space.lg, paddingVertical: space.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
  laneLast: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  laneNo: { width: space.xl },
  laneName: { fontFamily: fonts.displayLight },
  eyebrow: { marginBottom: space.md },
  markWrap: { marginBottom: space.xxl },
  pitch: { marginTop: space.xl, maxWidth: 340 },
  footer: { paddingHorizontal: gutter, paddingTop: space.md, gap: space.md },
});
