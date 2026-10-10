import React, { useMemo, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, View, ViewStyle } from 'react-native';
import type { RoutePoint } from '../data/types';
import { colors, radius } from '../theme';
import { projectRoute, segment } from './model';

type Props = { route: RoutePoint[]; height: number; style?: ViewStyle; stroke?: number };

/**
 * A small north-up drawing of a GPS track, built from rotated Views (no SVG dependency).
 * Hollow dot = start, filled dot = finish. Decorative for screen readers: the stats carry
 * the meaning.
 */
export function RouteSketch({ route, height, style, stroke = 3 }: Props) {
  const [width, setWidth] = useState(0);
  const pts = useMemo(() => projectRoute(route, width, height, stroke * 3), [route, width, height, stroke]);
  const onLayout = (e: LayoutChangeEvent) => setWidth(Math.round(e.nativeEvent.layout.width));
  const dot = stroke * 3;

  return (
    <View onLayout={onLayout} style={[styles.box, { height }, style]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {pts.slice(1).map((p, i) => {
        const s = segment(pts[i], p);
        return (
          <View key={i} style={[styles.line, {
            width: s.length + stroke, height: stroke, borderRadius: stroke / 2,
            left: s.cx - (s.length + stroke) / 2, top: s.cy - stroke / 2, transform: [{ rotate: `${s.angle}rad` }],
          }]} />
        );
      })}
      {pts.length ? (
        <>
          <View style={[styles.start, { width: dot, height: dot, borderRadius: dot / 2, borderWidth: stroke / 1.5, left: pts[0].x - dot / 2, top: pts[0].y - dot / 2 }]} />
          <View style={[styles.end, { width: dot, height: dot, borderRadius: dot / 2, left: pts[pts.length - 1].x - dot / 2, top: pts[pts.length - 1].y - dot / 2 }]} />
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { backgroundColor: colors.sunken, borderRadius: radius.md, overflow: 'hidden' },
  line: { position: 'absolute', backgroundColor: colors.ink },
  start: { position: 'absolute', backgroundColor: colors.surface, borderColor: colors.ink },
  end: { position: 'absolute', backgroundColor: colors.ink },
});
