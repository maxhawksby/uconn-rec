import React from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, Palette } from '../theme';

export type IconName = React.ComponentProps<typeof Ionicons>['name'];

export function Icon({ name, size = 20, color = 'ink' }: { name: IconName | string; size?: number; color?: keyof Palette }) {
  return <Ionicons name={name as IconName} size={size} color={colors[color]} />;
}
