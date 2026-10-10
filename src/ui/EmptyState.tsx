import React from 'react';
import { StyleSheet, View } from 'react-native';
import { space } from '../theme';
import { Text } from './Text';
import { Icon } from './Icon';
import { Button } from './Button';

type Props = { icon?: string; title: string; body?: string; actionLabel?: string; onAction?: () => void };

/** Empty, error and "nothing here yet" states. Always say what to do next. */
export function EmptyState({ icon = 'sparkles-outline', title, body, actionLabel, onAction }: Props) {
  return (
    <View style={styles.wrap}>
      <Icon name={icon} size={28} color="faint" />
      <Text variant="h2" center>{title}</Text>
      {body ? <Text variant="small" color="muted" center>{body}</Text> : null}
      {actionLabel && onAction ? <Button label={actionLabel} onPress={onAction} size="sm" style={styles.button} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: space.sm, paddingVertical: space.x4, paddingHorizontal: space.xxl },
  button: { marginTop: space.sm },
});
