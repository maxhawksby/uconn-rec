import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { useStore } from '../data/store';
import { Icon, Text, attempt } from '../ui';
import { colors, hitSlop, minTouch, radius, space } from '../theme';
import { useReducedMotion } from './useReducedMotion';

/** `label` = the detail-screen variant: an outlined "Give kudos" button; the count lives in the section title. */
type Props = { workoutId: string; given: boolean; count: number; isMine: boolean; label?: boolean };

/**
 * Kudos toggle. Flips instantly (optimistic) and rolls back if the store refuses.
 * Your own workout shows the count without a button: you can't give yourself kudos.
 */
export function KudosButton({ workoutId, given, count, isMine, label }: Props) {
  const { actions } = useStore();
  const reduced = useReducedMotion();
  const [optimistic, setOptimistic] = useState<{ given: boolean; count: number } | null>(null);
  const scale = useRef(new Animated.Value(1)).current;

  // Drop the optimistic copy once the store catches up (or changes underneath us).
  useEffect(() => { setOptimistic(null); }, [given, count]);

  const shown = optimistic ?? { given, count };
  const text = label ? (shown.given ? 'Kudos given' : 'Give kudos') : String(shown.count);

  if (isMine) {
    return (
      <View style={styles.button} accessible accessibilityLabel={`${shown.count} kudos`}>
        <Icon name="flame-outline" size={20} color="muted" />
        <Text variant="smallStrong" color="muted">{text}</Text>
      </View>
    );
  }

  function toggle() {
    const next = { given: !shown.given, count: shown.count + (shown.given ? -1 : 1) };
    setOptimistic(next);
    if (next.given && !reduced) {
      scale.setValue(0.7);
      Animated.spring(scale, { toValue: 1, friction: 3, tension: 220, useNativeDriver: true }).start();
    }
    const res = attempt(() => actions.toggleKudos(workoutId), "Couldn't give kudos");
    if (!res.ok) setOptimistic(null);
  }

  return (
    <Pressable
      onPress={toggle}
      hitSlop={hitSlop}
      accessibilityRole="button"
      accessibilityLabel={shown.given ? 'Remove kudos' : 'Give kudos'}
      accessibilityState={{ selected: shown.given }}
      accessibilityValue={{ text: `${shown.count} kudos` }}
      style={({ pressed }) => [styles.button, label && styles.labelled, label && !shown.given && styles.outlined, shown.given && styles.given, pressed && styles.pressed]}>
      <Animated.View style={{ transform: [{ scale }] }}>
        <Icon name={shown.given ? 'flame' : 'flame-outline'} size={20} color={shown.given ? 'accent' : 'inkSoft'} />
      </Animated.View>
      <Text variant="smallStrong" color={shown.given ? 'accent' : 'inkSoft'}>{text}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { flexDirection: 'row', alignItems: 'center', gap: space.xs, minHeight: minTouch - 8, paddingHorizontal: space.sm, borderRadius: radius.md },
  labelled: { paddingHorizontal: space.md },
  outlined: { borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface },
  given: { backgroundColor: colors.accentSoft },
  pressed: { opacity: 0.6 },
});
