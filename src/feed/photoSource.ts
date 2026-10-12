import type { ImageSourcePropType } from 'react-native';

// Demo photos ship inside the app so the demo campus works offline. A photo whose uri is
// `demo:<name>` uses one of these; anything else is a URL or a file the student picked.
export const DEMO_PHOTOS = {
  'lift-row': require('../../assets/demo-photos/lift-row.jpg'),
  'lift-plates': require('../../assets/demo-photos/lift-plates.jpg'),
  'lift-turf': require('../../assets/demo-photos/lift-turf.jpg'),
  'run-club': require('../../assets/demo-photos/run-club.jpg'),
  'hoops-courts': require('../../assets/demo-photos/hoops-courts.jpg'),
  'hoops-sunset': require('../../assets/demo-photos/hoops-sunset.jpg'),
} as const;

export type DemoPhoto = keyof typeof DEMO_PHOTOS;

export function photoSource(uri: string): ImageSourcePropType {
  if (uri.startsWith('demo:')) return DEMO_PHOTOS[uri.slice(5) as DemoPhoto] ?? { uri: '' };
  return { uri };
}
