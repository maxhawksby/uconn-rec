// Dean's Lift design tokens. Screens import from here - no inline hex values or magic numbers.
// Direction: a scoreboard and a running track. Cool court-gray ground, ink panels,
// track-orange for the one action that matters. See DESIGN.md.

const light = {
  bg: '#F2F3F5', // court gray: app background
  surface: '#FFFFFF', // cards and sheets
  sunken: '#E8EAEE', // inputs, inactive chips
  line: '#DCDFE5',
  ink: '#14161B', // primary text, scoreboard panels
  inkSoft: '#3A3F48',
  muted: '#6B717C',
  faint: '#9AA0AA',
  accent: '#FF5A1F', // track orange: primary action, kudos, live states
  accentPressed: '#E04812',
  accentSoft: '#FFE7DD',
  onAccent: '#FFFFFF',
  board: '#14161B', // scoreboard panel
  onBoard: '#F2F3F5',
  onBoardMuted: '#8D939D',
  turf: '#1E7A4E', // success, joined, verified
  turfSoft: '#DDF1E6',
  danger: '#C4362B',
  dangerSoft: '#FBE3E0',
  scrim: 'rgba(20,22,27,0.48)',
};

export type Palette = typeof light;

// Dark is defined now so screens never hard-code light-only assumptions. M1 ships light only.
const dark: Palette = {
  bg: '#0F1114', surface: '#181B20', sunken: '#22262D', line: '#2C3139', ink: '#F2F3F5', inkSoft: '#C9CDD4',
  muted: '#8D939D', faint: '#5E646E', accent: '#FF6A33', accentPressed: '#FF5A1F', accentSoft: '#3A2117', onAccent: '#FFFFFF',
  board: '#000000', onBoard: '#F2F3F5', onBoardMuted: '#8D939D', turf: '#3DBA7A', turfSoft: '#163024', danger: '#FF6B5E',
  dangerSoft: '#3A1C19', scrim: 'rgba(0,0,0,0.6)',
};

export const palettes = { light, dark };
export const colors = light;

// Loaded in src/App.tsx. Display = condensed jersey lettering; body = Barlow for readable copy.
export const fonts = {
  display: 'BarlowCondensed_800ExtraBold',
  displayLight: 'BarlowCondensed_300Light',
  numeral: 'BarlowCondensed_700Bold',
  body: 'Barlow_400Regular',
  bodyMedium: 'Barlow_500Medium',
  bodyBold: 'Barlow_700Bold',
};

export const space = { xxs: 2, xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, x3: 32, x4: 40, x5: 56 } as const;
export const radius = { sm: 4, md: 8, lg: 14, pill: 999 } as const;
export const gutter = space.xl; // screen side padding

// Type scale: 3x jumps between display and body; condensed caps carry the personality.
export const type = {
  hero: { fontFamily: fonts.display, fontSize: 48, lineHeight: 46, letterSpacing: -0.5, textTransform: 'uppercase' as const },
  title: { fontFamily: fonts.display, fontSize: 32, lineHeight: 32, letterSpacing: -0.3, textTransform: 'uppercase' as const },
  h2: { fontFamily: fonts.display, fontSize: 22, lineHeight: 24, letterSpacing: 0, textTransform: 'uppercase' as const },
  stat: { fontFamily: fonts.numeral, fontSize: 34, lineHeight: 34, letterSpacing: -0.5 },
  statLabel: { fontFamily: fonts.bodyBold, fontSize: 10, lineHeight: 12, letterSpacing: 1.2, textTransform: 'uppercase' as const },
  eyebrow: { fontFamily: fonts.bodyBold, fontSize: 11, lineHeight: 14, letterSpacing: 1.4, textTransform: 'uppercase' as const },
  body: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22 },
  bodyStrong: { fontFamily: fonts.bodyBold, fontSize: 15, lineHeight: 22 },
  small: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18 },
  smallStrong: { fontFamily: fonts.bodyMedium, fontSize: 13, lineHeight: 18 },
  tiny: { fontFamily: fonts.body, fontSize: 11, lineHeight: 15 },
};

export type TypeVariant = keyof typeof type;

export const hitSlop = { top: 10, bottom: 10, left: 10, right: 10 };
export const minTouch = 44;
