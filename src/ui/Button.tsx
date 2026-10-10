import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View, ViewStyle } from 'react-native';
import { colors, fonts, minTouch, radius, space, Palette } from '../theme';
import { Text } from './Text';
import { Icon } from './Icon';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Props = {
  label: string;
  onPress: () => void;
  variant?: Variant;
  size?: 'md' | 'sm';
  icon?: string;
  disabled?: boolean;
  loading?: boolean;
  block?: boolean;
  style?: ViewStyle;
  accessibilityHint?: string;
};

const look: Record<Variant, { bg: keyof Palette; pressed: keyof Palette; fg: keyof Palette; border?: keyof Palette }> = {
  primary: { bg: 'accent', pressed: 'accentPressed', fg: 'onAccent' },
  secondary: { bg: 'surface', pressed: 'sunken', fg: 'ink', border: 'line' },
  ghost: { bg: 'bg', pressed: 'sunken', fg: 'ink' },
  danger: { bg: 'dangerSoft', pressed: 'dangerSoft', fg: 'danger' },
};

export function Button({ label, onPress, variant = 'primary', size = 'md', icon, disabled, loading, block, style, accessibilityHint }: Props) {
  const v = look[variant];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!disabled || !!loading, busy: !!loading }}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base, size === 'sm' && styles.sm, block && styles.block,
        { backgroundColor: colors[pressed ? v.pressed : v.bg] },
        v.border && { borderWidth: StyleSheet.hairlineWidth, borderColor: colors[v.border] },
        (disabled || loading) && styles.disabled, style,
      ]}>
      {loading ? <ActivityIndicator color={colors[v.fg]} /> : (
        <View style={styles.row}>
          {icon ? <Icon name={icon} size={size === 'sm' ? 16 : 18} color={v.fg} /> : null}
          <Text variant={size === 'sm' ? 'smallStrong' : 'bodyStrong'} color={v.fg} style={styles.label}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { minHeight: minTouch + 6, paddingHorizontal: space.xl, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  sm: { minHeight: minTouch - 8, paddingHorizontal: space.md },
  block: { alignSelf: 'stretch' },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  label: { fontFamily: fonts.bodyBold },
  disabled: { opacity: 0.45 },
});
