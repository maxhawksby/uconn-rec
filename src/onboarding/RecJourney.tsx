import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, StyleSheet, Text, View } from 'react-native';
import { RecEmblem, RecScene } from '../RecVisual';
import { spacesForInterests } from '../recSpaces';
import { INTERESTS } from './model';

export function RecJourney({ step, interests, name, reduced }: { step: number; interests: string[]; name: string; reduced: boolean }) {
  const progress = useRef(new Animated.Value(step / 7)).current;
  useEffect(() => {
    const animation = Animated.timing(progress, { toValue: step / 7, duration: reduced ? 0 : 380, easing: Easing.out(Easing.cubic), useNativeDriver: Platform.OS !== 'web' });
    animation.start();
    return () => animation.stop();
  }, [step, reduced, progress]);
  const message = step >= 7 ? 'Ready when you are.' : step >= 5 ? 'Room for your people.' : step === 4 && interests.length ? 'A little more you.' : step >= 3 ? `Your place, ${name}.` : 'Make yourself at home.';
  return <View style={j.wrapper}>
    <View accessibilityRole="progressbar" accessibilityLabel="Onboarding progress" aria-valuemin={0} aria-valuemax={7} aria-valuenow={step} aria-valuetext={`${step} of 7 steps completed`} accessibilityValue={{ min: 0, max: 7, now: step, text: `${step} of 7 steps completed` }} style={j.track}>
      <Animated.View style={[j.fill, { transform: [{ scaleX: progress }] }]}/>
    </View>
    <View style={j.row}>
      <View style={{ width: 138 }}><RecScene dark height={91} active={step >= 4 ? spacesForInterests(interests) : []} arrival={step >= 7}/></View>
      <View style={{ flex: 1 }}><Text style={j.message}>{message}</Text><Text style={j.caption}>{step >= 7 ? 'Your Rec starts here.' : step === 4 ? 'Your interests bring it to life.' : 'Student Recreation Center'}</Text></View>
    </View>
  </View>;
}

export function ReadySummary({ name, year, interests, connections, groups }: { name: string; year: string; interests: string[]; connections: number; groups: number }) {
  return <View style={j.summary}>
    <View style={j.profile}><View style={j.emblem}><RecEmblem color="#C6D9FA" size={36}/></View><View style={{ flex: 1 }}><Text style={j.name}>{name}’s Rec</Text><Text style={j.caption}>{year}</Text></View></View>
    <Text style={j.summaryLabel}>What moves you</Text>
    <View style={j.tags}>{INTERESTS.filter(item => interests.includes(item.id)).map(item => <View key={item.id} style={j.tag}><Text style={j.tagText}>{item.name}</Text></View>)}</View>
    <Text style={j.summaryText}>{connections || groups ? `${connections} demo connection${connections === 1 ? '' : 's'} · ${groups} group${groups === 1 ? '' : 's'} joined` : 'Your community is here whenever you’re ready.'}</Text>
    <Text style={j.caption}>You can change your preferences in Profile.</Text>
  </View>;
}

const j = StyleSheet.create({
  wrapper: { paddingHorizontal: 26 }, track: { height: 3, borderRadius: 3, backgroundColor: '#344358', overflow: 'hidden' }, fill: { height: 3, backgroundColor: '#C6D9FA', transformOrigin: 'left' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4, borderBottomWidth: 1, borderColor: 'rgba(157,182,216,.16)' }, message: { fontSize: 12, fontWeight: '600', color: '#E1EBFA', lineHeight: 18 }, caption: { fontSize: 11, lineHeight: 17, color: '#AEBDD0', marginTop: 4 },
  summary: { marginTop: 26, padding: 20, borderRadius: 18, borderWidth: 1, borderColor: '#455A74', backgroundColor: 'rgba(25,44,68,.94)' }, profile: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 23 }, emblem: { padding: 10, borderRadius: 14, backgroundColor: '#293E5C' }, name: { color: '#F3F6FA', fontSize: 24, fontWeight: '700', letterSpacing: -.6 }, summaryLabel: { color: '#C2CDDC', fontSize: 12, marginBottom: 12 }, tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 }, tag: { paddingHorizontal: 11, paddingVertical: 8, backgroundColor: '#334B6B', borderRadius: 8 }, tagText: { fontSize: 12, color: '#EEF4FF' }, summaryText: { color: '#D7E1F0', fontSize: 13, lineHeight: 20, marginTop: 24, marginBottom: 6 },
});
