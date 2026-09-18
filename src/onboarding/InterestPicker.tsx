import React, { useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { INTERESTS, INTEREST_GROUPS } from './model';
import { RecEmblem, RecSymbol } from '../RecVisual';
import { spaceForInterest } from '../recSpaces';

const groupSymbols: Record<string, RecSymbol> = { 'Gym & track': 'strength', 'Courts & aquatics': 'courts', 'Group classes': 'studio', 'Outdoors & climbing': 'adventure', 'Club sports': 'community', 'Intramurals': 'courts' };

export default function InterestPicker({ selected, toggle }: { selected: string[]; toggle: (id: string) => void }) {
  const [linkError, setLinkError] = useState(''); const [query, setQuery] = useState(''); const [expanded, setExpanded] = useState('Gym & track');
  return <View style={{ gap: 12, marginTop: 24 }}>
    <TextInput accessibilityLabel="Search all Rec activities" value={query} onChangeText={setQuery} placeholder="Search lifting, Pilates, pickleball…" placeholderTextColor="#AAB9CD" style={p.search}/>
    <Text style={{ color: '#C7D0D9', fontSize: 12 }}>{selected.length} selected · Choose as many as you like</Text>
    {INTEREST_GROUPS.map(group => {
      const options = INTERESTS.filter(x => group.ids.includes(x.id) && x.name.toLowerCase().includes(query.trim().toLowerCase()));
      if (!options.length) return null;
      const open = !!query || expanded === group.name;
      return <View key={group.name} style={{ borderBottomWidth: 1, borderColor: '#424B55', paddingBottom: 12 }}>
        <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} aria-expanded={open} onPress={() => setExpanded(open ? '' : group.name)} style={p.group}><RecEmblem kind={groupSymbols[group.name]} size={26} color="#B9CDEF"/><View style={{ flex: 1 }}><Text style={p.groupName}>{group.name}</Text><Text style={p.groupCount}>{group.ids.filter(id => selected.includes(id)).length ? group.ids.filter(id => selected.includes(id)).length + ' selected' : options.length + (options.length === 1 ? ' option' : ' options')}</Text></View><Text style={{ color: '#C7D0D9', fontSize: 21 }}>{open ? '−' : '+'}</Text></Pressable>
        {open && <><View style={p.options}>{options.map(x => {
          const checked = selected.includes(x.id);
          return <Pressable key={x.id} accessibilityRole="checkbox" accessibilityState={{ checked }} aria-checked={checked} accessibilityLabel={x.name} onPress={() => toggle(x.id)} style={({ pressed }) => [p.option, checked && p.checked, pressed && { opacity: .75 }]}><RecEmblem kind={spaceForInterest(x.id) || groupSymbols[group.name]} size={24} color={checked ? '#000E2F' : '#B9CDEF'}/><Text style={[p.optionText, checked && { color: '#000E2F' }]}>{x.name}</Text><Text style={{ color: checked ? '#013ECD' : '#AAB9CD', fontSize: 17 }}>{checked ? '✓' : '+'}</Text></Pressable>;
        })}</View><Pressable accessibilityRole="link" onPress={() => { Linking.openURL(group.source).catch(() => setLinkError('Unable to open UConn Rec. Please try again.')); }} style={{ paddingTop: 15, paddingBottom: 5 }}><Text style={{ color: '#BDCCDA', fontSize: 12 }}>Explore on UConn Rec ↗</Text></Pressable></>}
      </View>;
    })}
    {!!query && !INTERESTS.some(x => x.name.toLowerCase().includes(query.trim().toLowerCase())) && <Text style={{ color: '#D4DFE8' }}>No activities found. Try a broader search.</Text>}
    {!!linkError && <Text accessibilityRole="alert" style={{ color: '#FFBBB3' }}>{linkError}</Text>}
    <Text style={{ color: '#AEB9C4', fontSize: 11, lineHeight: 18 }}>From UConn Rec’s published programs, reviewed September 17, 2026. Offerings vary by season. Interest selection does not register you for a class or team.</Text>
  </View>;
}

const p = StyleSheet.create({
  search: { backgroundColor: '#1D2C42', borderWidth: 1, borderColor: '#41546F', color: '#F3F5F7', padding: 15, borderRadius: 12, fontSize: 14 },
  group: { paddingVertical: 13, flexDirection: 'row', gap: 13, alignItems: 'center', minHeight: 64 }, groupName: { color: '#F3F5F7', fontSize: 15, fontWeight: '600' }, groupCount: { color: '#B5C4D7', fontSize: 11, marginTop: 5 },
  options: { gap: 8 }, option: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 54, padding: 13, borderWidth: 1, borderColor: '#42546C', backgroundColor: '#1C2C42', borderRadius: 12 }, checked: { borderColor: '#CADCF8', backgroundColor: '#DDE8F8' }, optionText: { color: '#E5ECF6', fontSize: 14, flex: 1 },
});
