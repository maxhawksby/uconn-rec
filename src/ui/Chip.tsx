import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { colors, radius, space } from '../theme';
import { Text } from './Text';
import { Icon } from './Icon';

type Props = { label: string; selected?: boolean; onPress?: () => void; icon?: string };

/** Pill toggle for filters and interest picking. Chips are the only fully-round element. */
export function Chip({ label, selected, onPress, icon }: Props) {
  return (
    <Pressable
      accessibilityRole={onPress ? 'checkbox' : 'text'}
      accessibilityState={{ checked: !!selected }}
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [styles.chip, selected ? styles.on : styles.off, pressed && styles.pressed]}>
      {icon ? <Icon name={icon} size={14} color={selected ? 'onBoard' : 'inkSoft'} /> : null}
      <Text variant="smallStrong" color={selected ? 'onBoard' : 'inkSoft'}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: { flexDirection: 'row', alignItems: 'center', gap: space.xs, paddingHorizontal: space.md, paddingVertical: space.sm, borderRadius: radius.pill, minHeight: 36 },
  on: { backgroundColor: colors.ink },
  off: { backgroundColor: colors.sunken },
  pressed: { opacity: 0.8 },
});
