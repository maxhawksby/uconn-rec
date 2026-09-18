import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, G, Line, Path, Polygon, Rect } from 'react-native-svg';
import { useReducedMotion } from './motion';
import { RecSpace } from './recSpaces';

export type RecSymbol = RecSpace | 'building' | 'community' | 'adventure';
const decorative = Platform.OS === 'web'
  ? { 'aria-hidden': true as const, focusable: false }
  : { accessible: false, accessibilityElementsHidden: true, importantForAccessibility: 'no-hide-descendants' as const };

/** Original app symbols, not reproductions of the university seal or mascot. */
export function RecEmblem({ kind = 'building', size = 28, color = '#000E2F' }: { kind?: RecSymbol; size?: number; color?: string }) {
  return <Svg width={size} height={size} viewBox="0 0 32 32" {...decorative}>
    <G fill="none" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      {kind === 'building' && <><Path d="M3 27V12H23V6H29V27ZM3 12V7H21M7 27V16H20V27M23 6V27M26 9V24M3 12H23M7 20H20M11 16V27M16 16V27"/><Path d="M2 28H30"/></>}
      {kind === 'strength' && <><Path d="M3 13V19M7 9V23M11 11V21M21 11V21M25 9V23M29 13V19M11 16H21"/></>}
      {kind === 'track' && <><Rect x={3} y={7} width={26} height={18} rx={9}/><Rect x={6.5} y={10.5} width={19} height={11} rx={5.5}/><Line x1={16} y1={7} x2={16} y2={10.5}/><Circle cx={24} cy={22} r={2.3} fill={color} stroke="none"/></>}
      {kind === 'courts' && <><Rect x={3} y={6} width={26} height={20} rx={2}/><Line x1={16} y1={6} x2={16} y2={26}/><Circle cx={16} cy={16} r={4}/><Path d="M3 11H8V21H3M29 11H24V21H29"/></>}
      {kind === 'aquatics' && <><Path d="M6 4V19M12 4V19M6 8H12M6 13H12M3 22Q6 18 10 22T18 22T26 22L29 20M3 28Q6 24 10 28T18 28T26 28L29 26M17 8H28M17 13H28"/></>}
      {kind === 'studio' && <><Rect x={5} y={4} width={22} height={24} rx={3}/><Circle cx={16} cy={11} r={2}/><Path d="M16 13V21M10 16L16 18L22 16M10 25L16 21L22 25"/></>}
      {(kind === 'climbing' || kind === 'adventure') && <><Path d="M3 28L12 5L20 13L25 8L29 28ZM12 5L15 19L8 28"/>{kind === 'climbing' && <><Path d="M20 19L23 17M19 25L22 23M10 15L12 13"/></>}</>}
      {kind === 'community' && <><Circle cx={16} cy={9} r={3.5}/><Circle cx={6} cy={14} r={2.5}/><Circle cx={26} cy={14} r={2.5}/><Path d="M9 27V24Q9 17 16 17Q23 17 23 24V27ZM2 26V23Q2 19 6 19M30 26V23Q30 19 26 19"/></>}
    </G>
  </Svg>;
}

export function RecBrand({ dark = false }: { dark?: boolean }) {
  const color = dark ? '#F3F6FA' : '#000E2F';
  return <View style={v.brand}><RecEmblem size={30} color={color}/><Text style={[v.wordmark, { color }]}>UCONN <Text style={{ fontWeight: '400' }}>REC</Text></Text></View>;
}

/** Conceptual architecture: space IDs are shared with a future GLB's named meshes. */
export function RecScene({ active = [], dark = false, height = 142, arrival = false }: { active?: RecSpace[]; dark?: boolean; height?: number; arrival?: boolean }) {
  const reduced = useReducedMotion();
  const settle = useRef(new Animated.Value(1)).current;
  const signature = active.join(',');
  useEffect(() => {
    settle.setValue(reduced ? 1 : 0);
    const animation = Animated.timing(settle, { toValue: 1, duration: reduced ? 0 : 420, easing: Easing.out(Easing.cubic), useNativeDriver: Platform.OS !== 'web' });
    animation.start();
    return () => animation.stop();
  }, [signature, reduced, arrival, settle]);
  const edge = dark ? '#728DAE' : '#91A5C2';
  const face = dark ? '#1D3350' : '#D8E3F1';
  const roof = dark ? '#324A67' : '#F4F8FD';
  const glass = dark ? '#132940' : '#B7CCDF';
  const lit = dark ? '#AFCBFF' : '#013ECD';
  const fill = (id: RecSpace, base: string) => active.includes(id) ? lit : base;
  return <Animated.View style={{ pointerEvents: 'none', height, width: '100%', opacity: settle.interpolate({ inputRange: [0, 1], outputRange: [.72, 1] }), transform: [{ translateY: settle.interpolate({ inputRange: [0, 1], outputRange: [3, 0] }) }] }}>
    <Svg width="100%" height="100%" viewBox="0 0 360 190" {...decorative}>
      <Polygon points="21,132 179,182 344,115 185,69" fill={dark ? '#122138' : '#E8EFF8'}/>
      <Path d="M38 149L181 191M203 174L345 123" stroke={edge} strokeWidth={.6} opacity={.4}/>
      <G fill="none" stroke={edge} strokeWidth={1} strokeLinejoin="round">
        <Polygon points="44,90 200,139 200,169 44,120" fill={face}/>
        <Polygon points="200,139 323,88 323,118 200,169" fill={glass}/>
        <Polygon points="44,90 166,40 323,88 200,139" fill={roof}/>
        <Polygon points="55,95 125,117 125,146 55,124" fill={fill('strength', glass)} opacity={.9}/>
        {[69, 83, 97, 111].map((x, i) => <Line key={x} x1={x} y1={100 + i * 4.3} x2={x} y2={128 + i * 4.3}/>) }
        <Polygon points="134,120 187,137 187,165 134,148" fill={fill('studio', glass)}/>
        <Path d="M147 124V152M161 129V157M174 133V161M134 134L187 151"/>
        <Polygon points="90,92 142,71 199,89 148,110" fill={fill('courts', dark ? '#516377' : '#E4CEAC')}/>
        <Path d="M96 92L143 74L191 89L147 107ZM120 83L169 99M110 90L119 93L113 96M175 86L166 89L172 92" stroke={active.includes('courts') ? '#FFFFFF' : edge}/>
        <Polygon points="210,98 259,78 298,90 250,111" fill={fill('aquatics', dark ? '#42637A' : '#9FBFD9')}/>
        {[0, 1, 2, 3].map(i => <Path key={i} d={`M${217 + i * 8} ${99 + i * 2.5}L${261 + i * 8} ${81 + i * 2.5}`} stroke={active.includes('aquatics') ? '#FFFFFF' : roof}/>) }
        <Path d="M83 81L147 55Q156 51 167 55L289 93Q304 98 291 104L226 131Q216 135 205 131L83 93Q70 87 83 81Z" fill="none" stroke={fill('track', edge)} strokeWidth={active.includes('track') ? 3.5 : 2}/>
        <Polygon points="269,65 288,58 288,126 269,134" fill={fill('climbing', '#315780')}/>
        <Polygon points="288,58 305,63 305,131 288,126" fill={dark ? '#25415F' : '#466889'}/>
        <Polygon points="269,65 288,58 305,63 286,71" fill={roof}/>
        <Path d="M275 78L281 76M277 92L283 90M274 108L280 106M289 72V119M297 75V121" stroke={active.includes('climbing') ? '#FFFFFF' : '#9BB4CF'}/>
        <Path d="M44 113L125 139M202 149L263 124" stroke={roof}/>
        <Polygon points="201,142 222,133 222,160 201,169" fill={arrival ? lit : roof}/>
        <Path d="M209 140V165M201 154L222 145" stroke={edge}/>
      </G>
      <Path d="M210 167L218 174L263 155" stroke={lit} opacity={arrival ? 1 : .35} strokeWidth={2} fill="none" strokeLinecap="round"/>
      {arrival && <Circle cx={263} cy={155} r={3} fill={lit}/>}
    </Svg>
  </Animated.View>;
}

const v = StyleSheet.create({
  brand: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  wordmark: { fontSize: 17, fontWeight: '900', letterSpacing: -.6 },
});
