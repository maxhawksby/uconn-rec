import React, { createContext, useContext, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { INTERESTS } from './onboarding/model';

export { PEOPLE, suggestions, groupSuggestions } from './socialModel';
import { PEOPLE, suggestions, groupSuggestions, emptySocial, isSocial, Social } from './socialModel';
import { useLocalData } from './useLocalData';
const Context = createContext<{ data: Social; update: (fn: (s: Social) => Social) => void; error: string; ready: boolean }>({ data: emptySocial, update: () => {}, error: '', ready: false });
export function SocialProvider({ children }: { children: React.ReactNode }) {
  const store = useLocalData('uconn-rec-social-v1', emptySocial, isSocial);
  return <Context.Provider value={store}>{children}</Context.Provider>;
}
export const useSocial = () => useContext(Context);
const ink = '#E8EEF4';
export function SocialChoices({ mode, interests, year, dark = false }: { mode: 'friends' | 'groups'; interests: string[]; year: string; dark?: boolean }) {
  const { data, update, ready, error } = useSocial(); const color = dark ? ink : '#12213B'; const muted = dark ? '#B4C0CC' : '#63728A';
  const button = (label: string, action: () => void, selected = false) => <Pressable disabled={!ready} accessibilityRole="button" accessibilityState={{ selected }} onPress={action} style={{ paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12, backgroundColor: selected ? '#DCE5EB' : dark ? '#3B4855' : '#E8EFFF' }}><Text style={{ color: selected ? '#233246' : dark ? ink : '#124AC5', fontSize: 12, fontWeight: '700' }}>{label}</Text></Pressable>;
  const [showAll, setShowAll] = useState(false);
  const people = suggestions(interests, year, data.contacts);
  const groups = groupSuggestions(interests, year);
  return <View style={{ gap: 14, marginTop: 18 }}>
    <Text style={{ color: muted, fontSize: 12, lineHeight: 18 }}>Demo students and groups. Connections and messages stay on this device.</Text>
    {mode === 'friends' && <View style={{ backgroundColor: dark ? '#252E38' : '#F0F4F9', borderRadius: 16, padding: 17, gap: 10 }}><Text style={{ color, fontWeight: '700', fontSize: 17 }}>Find a familiar face.</Text><Text style={{ color: muted, lineHeight: 19, fontSize: 12 }}>Contact matching will be optional. Preview it with sample contacts; your phone’s contacts are never accessed or uploaded.</Text>{button(data.contacts ? 'Remove sample contacts' : 'Preview contact matching', () => update(d => ({ ...d, contacts: !d.contacts })), data.contacts)}</View>}
    {mode === 'friends' ? <>{people.length === 0 && <Text style={{ color: muted }}>No demo students share these activities yet. Try a suggested group instead.</Text>}{people.map(p => <View key={p.id} style={{ borderBottomColor: dark ? '#45515D' : '#E2E8F0', borderBottomWidth: 1, paddingVertical: 13, gap: 10 }}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}><View style={{ width: 43, height: 43, borderRadius: 22, backgroundColor: dark ? '#445362' : '#DFE7F3', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color, fontWeight: '700' }}>{p.name.split(' ').map(n => n[0]).join('')}</Text></View><View style={{ flex: 1 }}><Text style={{ color, fontWeight: '700', fontSize: 15 }}>{p.name}</Text><Text style={{ color: muted, fontSize: 12, marginTop: 4 }}>{p.year}{year === p.year ? ' · Your year' : ''}</Text></View>{button(data.connections.includes(p.id) ? 'Connected' : 'Connect', () => update(d => ({ ...d, connections: d.connections.includes(p.id) ? d.connections.filter(id => id !== p.id) : [...d.connections, p.id] })), data.connections.includes(p.id))}</View><Text style={{ color: muted, fontSize: 12, lineHeight: 18 }}>{data.contacts && p.contact ? 'Sample contact · ' : ''}{p.shared.map(id => INTERESTS.find(x => x.id === id)?.name).join(' + ') || 'Found through sample contacts'}</Text></View>)}</> : (showAll ? groups : groups.slice(0, 4)).map(g => <View key={g.id} style={{ backgroundColor: dark ? '#27323C' : '#F0F4FA', padding: 18, borderRadius: 16, gap: 10 }}><Text style={{ color: muted, fontSize: 11 }}>{g.cohort} · Suggested for your interests</Text><Text style={{ color, fontSize: 19, lineHeight: 25, fontWeight: '700' }}>{g.name}</Text><Text style={{ color: muted, fontSize: 12, lineHeight: 18 }}>Find a workout buddy, share a lift, or plan your first session.</Text>{button(data.groups.some(x => x.id === g.id) ? 'Joined · Tap to leave' : 'Join group', () => update(d => ({ ...d, groups: d.groups.some(x => x.id === g.id) ? d.groups.filter(x => x.id !== g.id) : [...d.groups, g] })), data.groups.some(x => x.id === g.id))}</View>)}
    {mode === 'groups' && groups.length > 4 && button(showAll ? 'Show fewer groups' : 'See all suggested groups', () => setShowAll(!showAll))}
    {!!error && <Text accessibilityRole="alert" style={{ color: muted }}>{error}</Text>}
  </View>;
}
