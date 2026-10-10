import React from 'react';
import { StyleSheet, TextInput, TextInputProps, View } from 'react-native';
import { colors, minTouch, radius, space, type } from '../theme';
import { Text } from './Text';

type Props = TextInputProps & { label?: string; error?: string };

export function Input({ label, error, style, ...rest }: Props) {
  return (
    <View style={styles.wrap}>
      {label ? <Text variant="eyebrow" color="muted">{label}</Text> : null}
      <TextInput placeholderTextColor={colors.faint} {...rest} style={[styles.input, !!error && styles.errorBorder, style]} />
      {error ? <Text variant="small" color="danger">{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.xs },
  input: { ...type.body, color: colors.ink, minHeight: minTouch + 4, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, paddingHorizontal: space.md },
  errorBorder: { borderColor: colors.danger },
});
