import React, { useState } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { colors, radius } from '../theme';
import type { RouteMapProps } from './routeMapTypes';

// Fallback route drawing for platforms without native maps (web). iOS and Android use
// RouteMap.native.tsx with react-native-maps. Draws the route as a scaled polyline sketch.

export type { RouteMapProps };

const PAD = 16;

export function RouteMap({ segments, style }: RouteMapProps) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  const all = segments.flat();
  const lines: { x: number; y: number; len: number; angle: number }[] = [];
  let head: { x: number; y: number } | null = null;

  if (all.length && size.w) {
    const lats = all.map(p => p.lat), lngs = all.map(p => p.lng);
    const minLat = Math.min(...lats), maxLat = Math.max(...lats), minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
    // Longitude degrees shrink with latitude; correct so the shape isn't stretched.
    const k = Math.cos(((minLat + maxLat) / 2) * Math.PI / 180);
    const spanX = Math.max((maxLng - minLng) * k, 1e-6), spanY = Math.max(maxLat - minLat, 1e-6);
    const scale = Math.min((size.w - PAD * 2) / spanX, (size.h - PAD * 2) / spanY);
    const offX = (size.w - spanX * scale) / 2, offY = (size.h - spanY * scale) / 2;
    const project = (p: { lat: number; lng: number }) => ({ x: offX + (p.lng - minLng) * k * scale, y: offY + (maxLat - p.lat) * scale });
    for (const seg of segments) {
      for (let i = 1; i < seg.length; i++) {
        const a = project(seg[i - 1]), b = project(seg[i]);
        const dx = b.x - a.x, dy = b.y - a.y;
        lines.push({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, len: Math.hypot(dx, dy), angle: Math.atan2(dy, dx) });
      }
    }
    head = project(all[all.length - 1]);
  }

  return (
    <View style={[styles.box, style]} onLayout={e => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
      accessibilityLabel={all.length > 1 ? 'Route sketch' : 'Route will appear here'}>
      {lines.map((l, i) => (
        <View key={i} style={[styles.line, { width: l.len + 2, left: l.x - (l.len + 2) / 2, top: l.y - 2, transform: [{ rotate: `${l.angle}rad` }] } as ViewStyle]} />
      ))}
      {head ? <View style={[styles.head, { left: head.x - 7, top: head.y - 7 }]} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { backgroundColor: colors.sunken, borderRadius: radius.md, overflow: 'hidden' },
  line: { position: 'absolute', height: 4, borderRadius: 2, backgroundColor: colors.accent },
  head: { position: 'absolute', width: 14, height: 14, borderRadius: 7, backgroundColor: colors.accent, borderWidth: 3, borderColor: colors.surface },
});
