import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { RecEmblem, RecScene } from './RecVisual';
import { REC_SPACES, RecSpace, spacesForInterests } from './recSpaces';
import { C } from './styles';

export default function RecDiscovery({ interests, onAction }: { interests: string[]; onAction: (route: 'Activity' | 'Classes') => void }) {
  const [selected, setSelected] = useState<RecSpace>(spacesForInterests(interests)[0] || 'track');
  const space = REC_SPACES.find(item => item.id === selected)!;
  return <View style={d.card}>
    <Text style={d.title}>A little closer to the Rec.</Text>
    <Text style={d.subtitle}>Find a corner that feels like you.</Text>
    <RecScene active={[selected]} height={183} arrival/>
    <View style={d.choices}>{REC_SPACES.map(item => <Pressable key={item.id} accessibilityRole="button" accessibilityState={{ selected: selected === item.id }} aria-pressed={selected === item.id} accessibilityLabel={`Explore ${item.name}`} onPress={() => setSelected(item.id)} style={({ pressed }) => [d.choice, selected === item.id && d.selected, pressed && { opacity: .7 }]}><RecEmblem kind={item.id} size={22} color={selected === item.id ? '#FFFFFF' : C.navy}/><Text style={[d.label, selected === item.id && { color: '#FFFFFF' }]}>{item.short}</Text></Pressable>)}</View>
    <View accessibilityLiveRegion="polite" style={d.detail}><Text style={d.spaceName}>{space.name}</Text><Text style={d.description}>{space.description}</Text></View>
    <Pressable accessibilityRole="button" onPress={() => onAction(selected === 'studio' ? 'Classes' : 'Activity')} style={({ pressed }) => [d.action, pressed && { opacity: .7 }]}><Text style={d.actionText}>{selected === 'studio' ? 'Explore sample classes' : 'Log a workout'}</Text></Pressable>
    <Text style={d.note}>Illustrated spaces, not a floor plan.</Text>
  </View>;
}

const d = StyleSheet.create({
  card: { marginTop: 27, backgroundColor: '#F4F7FC', borderRadius: 22, padding: 18, borderWidth: 1, borderColor: '#E2EAF5' }, title: { color: C.navy, fontSize: 21, lineHeight: 26, fontWeight: '700', letterSpacing: -.6 }, subtitle: { color: C.muted, fontSize: 12, lineHeight: 19, marginTop: 6 },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 }, choice: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, width: '30%', flexGrow: 1, borderRadius: 10, borderWidth: 1, borderColor: '#D7E1F0', backgroundColor: '#FFFFFF', paddingHorizontal: 8, paddingVertical: 11, minHeight: 46 }, selected: { backgroundColor: C.navy, borderColor: C.navy }, label: { color: C.navy, fontSize: 11, fontWeight: '600' },
  detail: { minHeight: 116, paddingTop: 20 }, spaceName: { color: C.navy, fontSize: 16, fontWeight: '700' }, description: { color: '#576780', fontSize: 12, lineHeight: 20, marginTop: 7 }, action: { paddingVertical: 14, alignItems: 'center', borderRadius: 10, backgroundColor: '#E3EBF9', marginTop: 8 }, actionText: { color: C.blue, fontSize: 13, fontWeight: '700' }, note: { color: C.muted, fontSize: 10, textAlign: 'center', marginTop: 12 },
});
