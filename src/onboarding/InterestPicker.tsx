import React, { useState } from 'react';
import { Linking, Pressable, Text, TextInput, View } from 'react-native';
import { INTERESTS, INTEREST_GROUPS } from './model';

export default function InterestPicker({ selected, toggle }: { selected: string[]; toggle: (id: string) => void }) {
  const [linkError, setLinkError] = useState(''); const [query, setQuery] = useState(''); const [expanded, setExpanded] = useState('Gym & track');
  return <View style={{ gap: 12, marginTop: 24 }}>
    <TextInput accessibilityLabel="Search all Rec activities" value={query} onChangeText={setQuery} placeholder="Search lifting, Pilates, pickleball…" placeholderTextColor="#9BA6B0" style={{ backgroundColor: '#252C33', color: '#F3F5F7', padding: 15, borderRadius: 12, fontSize: 14 }}/>
    <Text style={{ color: '#C7D0D9', fontSize: 12 }}>{selected.length} selected · Choose as many as you like</Text>
    {INTEREST_GROUPS.map(group => {
      const options = INTERESTS.filter(x => group.ids.includes(x.id) && x.name.toLowerCase().includes(query.trim().toLowerCase()));
      if (!options.length) return null;
      const open = !!query || expanded === group.name;
      return <View key={group.name} style={{ borderBottomWidth: 1, borderColor: '#424B55', paddingBottom: 12 }}>
        <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={() => setExpanded(open ? '' : group.name)} style={{ paddingVertical: 13, flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: '#F3F5F7', fontSize: 16, fontWeight: '600' }}>{group.name}</Text><Text style={{ color: '#C7D0D9' }}>{group.ids.filter(id => selected.includes(id)).length ? group.ids.filter(id => selected.includes(id)).length + ' selected' : options.length + (options.length === 1 ? ' option' : ' options')} {open ? '−' : '+'}</Text></Pressable>
        {open && <><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{options.map(x => <Pressable key={x.id} accessibilityRole="checkbox" accessibilityState={{ checked: selected.includes(x.id) }} accessibilityLabel={x.name} onPress={() => toggle(x.id)} style={{ borderWidth: 1, borderColor: selected.includes(x.id) ? '#D4DFE8' : '#57626D', backgroundColor: selected.includes(x.id) ? '#D4DFE8' : '#252C33', borderRadius: 11, padding: 12 }}><Text style={{ color: selected.includes(x.id) ? '#182028' : '#DFE5EB', fontSize: 13 }}>{selected.includes(x.id) ? '✓ ' : '+ '}{x.name}</Text></Pressable>)}</View><Pressable accessibilityRole="link" onPress={() => { Linking.openURL(group.source).catch(() => setLinkError('Unable to open UConn Rec. Please try again.')); }} style={{ paddingTop: 15, paddingBottom: 5 }}><Text style={{ color: '#BDCCDA', fontSize: 12 }}>Explore on UConn Rec ↗</Text></Pressable></>}
      </View>;
    })}
    {!!query && !INTERESTS.some(x => x.name.toLowerCase().includes(query.trim().toLowerCase())) && <Text style={{ color: '#D4DFE8' }}>No activities found. Try a broader search.</Text>}
    {!!linkError && <Text accessibilityRole="alert" style={{ color: '#FFBBB3' }}>{linkError}</Text>}
    <Text style={{ color: '#AEB9C4', fontSize: 11, lineHeight: 18 }}>From UConn Rec’s published programs, reviewed September 17, 2026. Offerings vary by season. Interest selection does not register you for a class or team.</Text>
  </View>;
}
