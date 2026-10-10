import React from 'react';
import { ScrollView, StyleSheet, View, ViewStyle, RefreshControlProps } from 'react-native';
import { SafeAreaView, Edge } from 'react-native-safe-area-context';
import { colors, gutter, space } from '../theme';
import { Text } from './Text';

type Props = {
  children: React.ReactNode;
  /** Large condensed title, e.g. "Feed". */
  title?: string;
  /** Small caps line above the title; must say something true (e.g. the school name). */
  eyebrow?: string;
  /** Element on the right of the title row (icon button etc.). */
  action?: React.ReactNode;
  scroll?: boolean;
  refreshControl?: React.ReactElement<RefreshControlProps>;
  edges?: Edge[];
  contentStyle?: ViewStyle;
  /** Pinned below the content, above the home indicator (composers, primary buttons). */
  footer?: React.ReactNode;
};

/** Standard screen frame: safe area, court-gray ground, optional scroll and header. */
export function Screen({ children, title, eyebrow, action, scroll = true, refreshControl, edges = ['top'], contentStyle, footer }: Props) {
  const header = title || eyebrow ? (
    <View style={styles.header}>
      <View style={styles.headerText}>
        {eyebrow ? <Text variant="eyebrow" color="muted">{eyebrow}</Text> : null}
        {title ? <Text variant="title">{title}</Text> : null}
      </View>
      {action}
    </View>
  ) : null;
  return (
    <SafeAreaView style={styles.root} edges={edges}>
      {scroll ? (
        <ScrollView contentContainerStyle={[styles.content, contentStyle]} refreshControl={refreshControl} keyboardShouldPersistTaps="handled">
          {header}
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.flex, contentStyle]}>
          {header ? <View style={styles.pad}>{header}</View> : null}
          {children}
        </View>
      )}
      {footer}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  content: { paddingHorizontal: gutter, paddingBottom: space.x4 },
  pad: { paddingHorizontal: gutter },
  header: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingTop: space.lg, paddingBottom: space.xl, gap: space.md },
  headerText: { flex: 1, gap: space.xs },
});
