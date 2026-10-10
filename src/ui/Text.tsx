import React from 'react';
import { Text as RNText, TextProps, StyleSheet } from 'react-native';
import { colors, type, TypeVariant, Palette } from '../theme';

type Props = TextProps & { variant?: TypeVariant; color?: keyof Palette; center?: boolean };

/** All app text goes through here so fonts and the type scale stay consistent. */
export function Text({ variant = 'body', color = 'ink', center, style, ...rest }: Props) {
  return <RNText {...rest} style={[type[variant], { color: colors[color] }, center && styles.center, style]} />;
}

const styles = StyleSheet.create({ center: { textAlign: 'center' } });
