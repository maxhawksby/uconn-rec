import type { ViewStyle } from 'react-native';

export type LatLng = { lat: number; lng: number };

export type RouteMapProps = {
  /** Route split by pauses. */
  segments: LatLng[][];
  /** Latest fix, used to center the map before any route exists. */
  current?: LatLng | null;
  style?: ViewStyle;
};
