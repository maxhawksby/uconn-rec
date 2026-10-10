import React, { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Polyline } from 'react-native-maps';
import { colors, radius } from '../theme';
import type { RouteMapProps } from './routeMapTypes';

// Live route on a native map (react-native-maps is included in Expo Go SDK 57; no API key
// needed there). Follows the newest fix and draws each segment between pauses.

export type { RouteMapProps };

const DELTA = 0.006; // roughly a few campus blocks

export function RouteMap({ segments, current, style }: RouteMapProps) {
  const map = useRef<MapView>(null);
  const last = segments.flat().slice(-1)[0] ?? current ?? null;

  useEffect(() => {
    if (last) map.current?.animateCamera({ center: { latitude: last.lat, longitude: last.lng } }, { duration: 400 });
  }, [last?.lat, last?.lng]);

  if (!last) return <View style={[styles.box, style]} />;
  return (
    <View style={[styles.box, style]}>
      <MapView
        ref={map}
        style={StyleSheet.absoluteFill}
        initialRegion={{ latitude: last.lat, longitude: last.lng, latitudeDelta: DELTA, longitudeDelta: DELTA }}
        showsUserLocation
        showsMyLocationButton={false}
        toolbarEnabled={false}
        pitchEnabled={false}
        accessibilityLabel="Route map">
        {segments.filter(s => s.length > 1).map((seg, i) => (
          <Polyline key={i} coordinates={seg.map(p => ({ latitude: p.lat, longitude: p.lng }))}
            strokeColor={colors.accent} strokeWidth={5} lineCap="round" lineJoin="round" />
        ))}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { backgroundColor: colors.sunken, borderRadius: radius.md, overflow: 'hidden' },
});
