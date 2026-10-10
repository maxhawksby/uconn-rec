import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Keyboard, Platform, Pressable, ScrollView, StyleSheet, View, ViewStyle } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, gutter, hitSlop, minTouch, radius, space } from '../theme';
import { Icon, Text } from '../ui';

// Shared frame and small pieces for the onboarding steps.

/** Tracks the OS "reduce motion" setting and updates when it changes. */
export function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled().then(v => { if (active) setReduced(v); }).catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => { active = false; sub.remove(); };
  }, []);
  return reduced;
}

/** True while the software keyboard is up, so the footer can drop the home-indicator inset. */
export function useKeyboardVisible() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const show = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () => setVisible(true));
    const hide = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setVisible(false));
    return () => { show.remove(); hide.remove(); };
  }, []);
  return visible;
}

/**
 * The one entrance per screen: children rise in one after another. With reduce motion on,
 * everything simply appears.
 */
export function Stagger({ children, step = 70, style }: { children: React.ReactNode; step?: number; style?: ViewStyle }) {
  const reduced = useReducedMotion();
  const items = React.Children.toArray(children) as React.ReactElement[];
  const anims = useRef(new Map<React.Key, Animated.Value>()).current;
  const entered = useRef(false);
  // Children that appear after the entrance (status lines, errors) show without animating.
  const anim = (key: React.Key) => {
    let a = anims.get(key);
    if (!a) { a = new Animated.Value(entered.current ? 1 : 0); anims.set(key, a); }
    return a;
  };
  items.forEach((c, i) => anim(c.key ?? i));
  useEffect(() => {
    const first = [...anims.values()];
    entered.current = true;
    if (reduced) { first.forEach(a => a.setValue(1)); return; }
    const run = Animated.stagger(step, first.map(a => Animated.timing(a, { toValue: 1, duration: 320, easing: Easing.out(Easing.cubic), useNativeDriver: true })));
    run.start();
    return () => run.stop();
  }, [reduced]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <View style={style}>
      {items.map((child, i) => {
        const a = anim(child.key ?? i);
        return (
          <Animated.View key={child.key ?? i} style={{ opacity: a, transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [space.md, 0] }) }] }}>
            {child}
          </Animated.View>
        );
      })}
    </View>
  );
}

type FrameProps = {
  /** Current step (1-based) and total; omit to hide the progress bar. */
  progress?: { index: number; total: number };
  onBack?: () => void;
  eyebrow?: string;
  title?: string;
  lede?: string;
  children: React.ReactNode;
  footer: React.ReactNode;
};

/** Fixed top bar (back + progress), scrolling body, fixed footer that rides above the keyboard. */
export function StepFrame({ progress, onBack, eyebrow, title, lede, children, footer }: FrameProps) {
  const insets = useSafeAreaInsets();
  const keyboard = useKeyboardVisible();
  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.topBar}>
        {onBack ? (
          <Pressable onPress={onBack} hitSlop={hitSlop} accessibilityRole="button" accessibilityLabel="Back" style={({ pressed }) => [styles.back, pressed && styles.backPressed]}>
            <Icon name="chevron-back" size={24} />
          </Pressable>
        ) : <View style={styles.back} />}
        {progress ? <ProgressBar {...progress} /> : <View style={styles.flex} />}
      </View>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}>
        <Stagger style={styles.body}>
          {eyebrow || title || lede ? (
            <View style={styles.head}>
              {eyebrow ? <Text variant="eyebrow" color="muted">{eyebrow}</Text> : null}
              {title ? <Text variant="title" accessibilityRole="header">{title}</Text> : null}
              {lede ? <Text variant="body" color="inkSoft">{lede}</Text> : null}
            </View>
          ) : null}
          {children}
        </Stagger>
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: keyboard ? space.md : Math.max(insets.bottom, space.lg) }]}>{footer}</View>
    </SafeAreaView>
  );
}

/** Segmented "lane" progress: one segment per step, numerals on the right. */
function ProgressBar({ index, total }: { index: number; total: number }) {
  return (
    <View style={styles.progress} accessible accessibilityRole="progressbar" accessibilityLabel={`Step ${index} of ${total}`}
      accessibilityValue={{ min: 1, max: total, now: index }}>
      <View style={styles.segments}>
        {Array.from({ length: total }, (_, i) => (
          <View key={i} style={[styles.segment, i < index && styles.segmentOn]} />
        ))}
      </View>
      <Text variant="statLabel" color="muted">{index}/{total}</Text>
    </View>
  );
}

/** Small status line under a field: icon + message in a semantic color. */
export function StatusLine({ tone, icon, children }: { tone: 'turf' | 'danger' | 'muted'; icon: string; children: React.ReactNode }) {
  return (
    <View style={styles.status} accessibilityLiveRegion="polite">
      <Icon name={icon} size={16} color={tone} />
      <Text variant="small" color={tone === 'muted' ? 'muted' : tone} style={styles.flex}>{children}</Text>
    </View>
  );
}

/** Section label used inside steps (eyebrow + optional right-hand count). */
export function SectionLabel({ children, right }: { children: string; right?: string }) {
  return (
    <View style={styles.section}>
      <Text variant="eyebrow" color="muted">{children}</Text>
      {right ? <Text variant="eyebrow" color="faint">{right}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.sm, paddingRight: gutter, minHeight: minTouch + space.sm },
  back: { width: minTouch, height: minTouch, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md },
  backPressed: { backgroundColor: colors.sunken },
  progress: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.md },
  segments: { flex: 1, flexDirection: 'row', gap: space.xs },
  segment: { flex: 1, height: space.xs, borderRadius: radius.sm, backgroundColor: colors.line },
  segmentOn: { backgroundColor: colors.ink },
  content: { flexGrow: 1, paddingHorizontal: gutter, paddingTop: space.lg, paddingBottom: space.x3 },
  body: { gap: space.xxl },
  head: { gap: space.sm },
  footer: { paddingHorizontal: gutter, paddingTop: space.md, gap: space.sm, backgroundColor: colors.bg, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
  status: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm },
  section: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
});
