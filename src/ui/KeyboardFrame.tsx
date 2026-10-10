import React, { useRef, useState } from 'react';
import { KeyboardAvoidingView, StyleSheet, View, ViewStyle } from 'react-native';

/**
 * The app's one keyboard-avoiding wrapper. It measures its own distance from the top of the
 * window (a stack header or modal header) and uses that as the offset, so composers and
 * footers sit exactly on the keyboard without guessing header heights.
 *
 * 'padding' on both platforms: Expo's guide suggests no behavior on Android because the
 * window usually resizes, but under edge-to-edge (always on since SDK 54) it may not. With
 * 'padding' the overlap is measured, so a resized window computes zero and nothing doubles.
 */
export function KeyboardFrame({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  const ref = useRef<View>(null);
  const [offset, setOffset] = useState(0);
  return (
    <View ref={ref} style={[styles.flex, style]} onLayout={() => ref.current?.measureInWindow((_x, y) => setOffset(Math.max(0, y)))}>
      <KeyboardAvoidingView style={styles.flex} behavior="padding" keyboardVerticalOffset={offset}>
        {children}
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({ flex: { flex: 1 } });
