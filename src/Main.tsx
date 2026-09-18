import Conversation, { WorkoutShare } from './Conversation';
import HomeFeed from './HomeFeed';
import { WorkoutFeedProvider, useWorkoutFeed } from './workoutFeed';
import { Workout } from './socialModel';
import { useLocalData } from './useLocalData';
import { SocialProvider, SocialChoices, useSocial, PEOPLE } from './social';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { createStaticNavigation, useNavigation } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Ionicons from '@expo/vector-icons/Ionicons';
import { s, C } from './styles';
import { RecBrand, RecEmblem } from './RecVisual';
import RecDiscovery from './RecDiscovery';
import Onboarding, { WelcomeLoading } from './onboarding/Onboarding';
import { ProfileProvider, useProfile } from './onboarding/ProfileContext';
import { INTERESTS, fullName, initials, suggestedCategories } from './onboarding/model';

const photos = { campus: require('../assets/photos/rec-center.jpg'), gym: require('../assets/photos/gym.jpg'), yoga: require('../assets/photos/yoga.jpg'), strength: require('../assets/photos/strength.jpg') };
type Post = { id: number; name: string; initials: string; text: string; likes: number; photo?: keyof typeof photos };
type Data = { reservations: string[]; workouts: Workout[]; posts: Post[]; liked: number[]; sharing: boolean };
const initial: Data = { reservations: [], workouts: [], liked: [], sharing: false, posts: [
  { id: 1, name: 'Maya Chen', initials: 'MC', text: 'Finally made it to the weight room before my 9am. A little stronger, a lot more awake. Who’s joining tomorrow?', likes: 24, photo: 'strength' },
  { id: 2, name: 'Ethan Park', initials: 'EP', text: 'Easy campus run at 5? Meeting outside the Rec. All paces welcome — we’ll finish together.', likes: 12 },
] };
function isAppData(value: unknown): value is Data {
  if (!value || typeof value !== 'object') return false;
  const d = value as Data;
  return Array.isArray(d.workouts) && d.workouts.every(w => w && Number.isFinite(w.id) && typeof w.exercise === 'string' && Number.isInteger(w.sets) && w.sets >= 0 && Number.isFinite(w.volume) && w.volume >= 0 && typeof w.notes === 'string' && (w.entries === undefined || (Array.isArray(w.entries) && w.entries.every(e => e && Number.isInteger(e.reps) && e.reps > 0 && Number.isFinite(e.weight) && e.weight >= 0))))
    && Array.isArray(d.reservations) && d.reservations.every(id => ['yoga', 'strength', 'spin', 'hiit'].includes(id))
    && Array.isArray(d.posts) && d.posts.every(p => p && Number.isFinite(p.id) && typeof p.name === 'string' && typeof p.initials === 'string' && typeof p.text === 'string' && Number.isFinite(p.likes) && (!p.photo || Object.hasOwn(photos, p.photo)))
    && Array.isArray(d.liked) && d.liked.every(Number.isFinite) && typeof d.sharing === 'boolean';
}
const Store = createContext<{ data: Data; setData: React.Dispatch<React.SetStateAction<Data>>; notify: (text: string) => void }>({ data: initial, setData: () => {}, notify: () => {} });
const classes = [
  { id: 'yoga', name: 'Yoga flow', category: 'Mind & body', time: '12:00 PM', day: 'Today', duration: '45 min', place: 'Studio A', instructor: 'Alex Morgan', spots: '8 spots left', image: 'yoga' as const, description: 'A little room to breathe. Move through an approachable sequence of stretches and standing poses. All experience levels welcome.' },
  { id: 'strength', name: 'Stronger together', category: 'Strength', time: '4:30 PM', day: 'Today', duration: '50 min', place: 'Studio B', instructor: 'Jamie Lee', spots: '4 spots left', image: 'strength' as const, description: 'Build confidence with a full-body strength circuit. Find a weight and pace that feel right for you.' },
  { id: 'spin', name: 'Evening spin', category: 'Cardio', time: '5:30 PM', day: 'Today', duration: '45 min', place: 'Cycle studio', instructor: 'Sam Rivera', spots: '2 spots left', image: 'gym' as const, description: 'Good music and a ride at your own pace. Bring water; we’ll help you set up your bike.' },
  { id: 'hiit', name: 'Morning HIIT', category: 'Cardio', time: '7:00 AM', day: 'Tomorrow', duration: '30 min', place: 'Studio B', instructor: 'Jamie Lee', spots: 'Waitlist', image: 'strength' as const, description: 'Short intervals, plenty of options. A welcoming workout with modifications for every movement.' },
];
type ClassItem = typeof classes[number];
type IconName = React.ComponentProps<typeof Ionicons>['name'];
function Icon({ name, color = C.ink, size = 22 }: { name: IconName; color?: string; size?: number }) { return <Ionicons name={name} color={color} size={size}/>; }
function Button({ title, onPress, secondary = false, disabled = false }: { title: string; onPress: () => void; secondary?: boolean; disabled?: boolean }) { return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={({ pressed }) => [s.button, secondary && s.secondary, { opacity: disabled ? .45 : pressed ? .75 : 1 }]}><Text style={[s.buttonText, secondary && { color: C.blue }]}>{title}</Text></Pressable>; }
function Heading({ title, subtitle, action }: { title: string; subtitle: string; action?: React.ReactNode }) { return <View style={s.heading}><View style={{ flex: 1 }}><Text style={s.title}>{title}</Text><Text style={s.subtitle}>{subtitle}</Text></View>{action}</View>; }
function Section({ title, action, onPress }: { title: string; action?: string; onPress?: () => void }) { return <View style={s.section}><Text style={s.h2}>{title}</Text>{action && <Pressable accessibilityRole="button" onPress={onPress} hitSlop={8}><Text style={s.link}>{action}</Text></Pressable>}</View>; }
function Chip({ text, active, onPress }: { text: string; active?: boolean; onPress: () => void }) { return <Pressable accessibilityRole="button" accessibilityState={{ selected: !!active }} onPress={onPress} style={[s.chip, active && s.chipActive]}><Text style={[s.chipText, active && { color: 'white' }]}>{text}</Text></Pressable>; }
function Screen({ children }: { children: React.ReactNode }) { return <SafeAreaView edges={['top']} style={s.screen}><ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>{children}</ScrollView></SafeAreaView>; }
function Avatar({ initials, size = 44, blue = false }: { initials: string; size?: number; blue?: boolean }) { return <View style={[s.avatar, { width: size, height: size, borderRadius: size / 2, backgroundColor: blue ? C.blue : '#DFE7F1' }]}><Text style={{ color: blue ? 'white' : C.navy, fontWeight: '700', fontSize: size / 3 }}>{initials}</Text></View>; }
function Sheet({ title, visible, close, children }: { title: string; visible: boolean; close: () => void; children: React.ReactNode }) { return <Modal visible={visible} transparent animationType="fade" onRequestClose={close}><KeyboardAvoidingView style={s.scrim} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><View style={s.sheet}><View style={[s.row, { justifyContent: 'space-between' }]}><Text style={[s.h2, { flex: 1 }]}>{title}</Text><Pressable accessibilityRole="button" accessibilityLabel="Close dialog" onPress={close} style={s.iconButton}><Icon name="close"/></Pressable></View><ScrollView contentContainerStyle={{ gap: 16 }} keyboardShouldPersistTaps="handled">{children}</ScrollView></View></KeyboardAvoidingView></Modal>; }

function HomeScreen() {
  const nav = useNavigation<any>();
  const { data, notify } = useContext(Store);
  return <HomeFeed workouts={data.workouts} navigate={route => nav.navigate(route)} notify={notify}/>;
}
function ActivityScreen() {
  const [shareWorkout, setShareWorkout] = useState<Workout | null>(null);
  const { data, setData, notify } = useContext(Store); const [mode, setMode] = useState('Strength'); const [exercise, setExercise] = useState('Bench press'); const [sets, setSets] = useState([{ reps: '10', weight: '135' }, { reps: '8', weight: '155' }, { reps: '6', weight: '155' }]); const [notes, setNotes] = useState(''); const [picker, setPicker] = useState(false); const [minutes, setMinutes] = useState('30');
  const valid = mode === 'Strength' ? sets.length > 0 && sets.every(x => Number(x.reps) > 0 && Number(x.reps) <= 1000 && Number(x.weight) <= 5000 && Number.isInteger(Number(x.reps)) && x.weight.trim() !== '' && Number(x.weight) >= 0 && Number.isFinite(Number(x.weight))) : Number(minutes) > 0 && Number(minutes) <= 1440 && Number.isFinite(Number(minutes));
  function save() { if (!valid) return; const volume = mode === 'Strength' ? sets.reduce((n, x) => n + Number(x.reps) * Number(x.weight), 0) : 0; setData(d => ({ ...d, workouts: [{ id: Date.now(), exercise: mode === 'Strength' ? exercise : `${minutes} min ${mode.toLowerCase()}`, sets: mode === 'Strength' ? sets.length : 0, volume, notes, entries: mode === 'Strength' ? sets.map(x => ({ reps: Number(x.reps), weight: Number(x.weight) })) : undefined }, ...d.workouts] })); setNotes(''); notify('Workout saved privately. Share it from your recent effort.'); }
  return <Screen><Heading title="Make it count." subtitle="Your effort. Your pace. Your progress."/><View style={s.segment}>{['Strength', 'Cardio', 'Other'].map(t => <Chip key={t} text={t} active={mode === t} onPress={() => setMode(t)}/>)}</View><View style={s.workoutCard}><View style={[s.row, { marginBottom: 22 }]}><View style={s.smallIcon}><Icon name={mode === 'Strength' ? 'barbell-outline' : 'walk-outline'} color={C.blue}/></View><View style={{ flex: 1 }}><Text style={s.small}>Today’s workout</Text><Text style={s.h2}>{mode === 'Strength' ? exercise : 'Move your way'}</Text></View>{mode === 'Strength' && <Pressable accessibilityRole="button" accessibilityLabel="Change exercise" onPress={() => setPicker(true)} style={s.iconButton}><Icon name="swap-horizontal" color={C.blue}/></Pressable>}</View>
    {mode === 'Strength' ? <><View style={s.setRow}><Text style={[s.tableLabel, { width: 32 }]}>Set</Text><Text style={[s.tableLabel, { flex: 1 }]}>Reps</Text><Text style={[s.tableLabel, { flex: 1 }]}>Weight (lb)</Text><View style={{ width: 36 }}/></View>{sets.map((x, i) => <View style={s.setRow} key={i}><Text style={[s.bold, { width: 32, textAlign: 'center' }]}>{i + 1}</Text><TextInput accessibilityLabel={`Set ${i + 1} reps`} keyboardType="number-pad" value={x.reps} onChangeText={v => setSets(a => a.map((z, n) => n === i ? { ...z, reps: v } : z))} style={s.numberInput}/><TextInput accessibilityLabel={`Set ${i + 1} weight`} keyboardType="decimal-pad" value={x.weight} onChangeText={v => setSets(a => a.map((z, n) => n === i ? { ...z, weight: v } : z))} style={s.numberInput}/><Pressable accessibilityRole="button" accessibilityLabel={`Remove set ${i + 1}`} onPress={() => setSets(a => a.filter((_, n) => n !== i))} style={s.removeButton}><Icon name="close" size={18} color={C.muted}/></Pressable></View>)}<Button title="+ Add set" secondary onPress={() => setSets(a => [...a, { reps: '8', weight: a.at(-1)?.weight || '0' }])}/></> : <><Text style={s.bold}>Duration (minutes)</Text><TextInput accessibilityLabel="Duration in minutes" value={minutes} onChangeText={setMinutes} keyboardType="decimal-pad" style={s.input}/></>}
    <Text style={[s.bold, { marginTop: 24, marginBottom: 10 }]}>How did it feel? <Text style={s.small}>(optional)</Text></Text><TextInput accessibilityLabel="Workout notes" placeholder="A small win worth remembering…" placeholderTextColor={C.muted} multiline value={notes} onChangeText={setNotes} style={[s.input, { minHeight: 90, textAlignVertical: 'top' }]}/><View style={{ marginTop: 20 }}><Button title="Save workout" disabled={!valid} onPress={save}/></View>{!valid && <Text style={s.small}>Use 1–1,000 whole-number reps, 0–5,000 lb, or a duration up to 1,440 minutes.</Text>}</View>
    <Section title="Your recent effort"/><Text style={[s.small, { marginBottom: 14 }]}>Saved privately on this device.</Text>{data.workouts.length ? data.workouts.slice(0, 5).map(w => <View key={w.id} style={s.history}><View style={s.smallIcon}><Icon name="checkmark" color={C.green}/></View><View style={{ flex: 1 }}><Text style={s.bold}>{w.exercise}</Text><Text style={s.small}>{new Date(w.id).toLocaleDateString()}{w.sets ? ` · ${w.sets} sets · ${w.volume.toLocaleString()} lb volume` : ''}</Text>{!!w.entries?.length && <Text style={s.small}>{w.entries.map(e => e.reps + ' × ' + e.weight + ' lb').join(' · ')}</Text>}{!!w.notes && <Text style={s.small}>{w.notes}</Text>}</View><Pressable accessibilityRole="button" accessibilityLabel={"Share " + w.exercise} onPress={() => setShareWorkout(w)} style={s.iconButton}><Icon name="share-outline" color={C.blue}/></Pressable></View>) : <View style={s.empty}><Icon name="barbell-outline" size={30} color={C.muted}/><Text style={s.bold}>Your first workout starts here.</Text><Text style={s.small}>Log a little. Build a habit.</Text></View>}
    {!!shareWorkout && <WorkoutShare workout={shareWorkout} close={() => setShareWorkout(null)} onShared={destination => notify(destination === 'feed' ? 'Workout shared to the public demo feed.' : 'Workout added to your local conversation.')}/>}
    <Sheet title="Choose an exercise" visible={picker} close={() => setPicker(false)}>{['Bench press', 'Squat', 'Deadlift', 'Shoulder press', 'Lat pulldown'].map(x => <Button key={x} title={x} secondary onPress={() => { setExercise(x); setPicker(false); }}/>)}</Sheet></Screen>;
}
function ClassesScreen() {
  const { profile } = useProfile(); const recommended = suggestedCategories(profile);
  const { data, setData, notify } = useContext(Store); const [filter, setFilter] = useState('All'); const [query, setQuery] = useState(''); const [selected, setSelected] = useState<ClassItem | null>(null);
  const found = [...classes].sort((a, b) => Number(recommended.has(b.category)) - Number(recommended.has(a.category))).filter(c => (filter === 'All' || c.category === filter || (filter === 'My classes' && data.reservations.includes(c.id))) && `${c.name} ${c.category}`.toLowerCase().includes(query.toLowerCase()));
  function reserve(c: ClassItem) { const exists = data.reservations.includes(c.id); setData(d => ({ ...d, reservations: exists ? d.reservations.filter(x => x !== c.id) : [...d.reservations, c.id] })); setSelected(null); notify(exists ? 'Reservation canceled.' : c.spots === 'Waitlist' ? 'You joined the demo waitlist.' : 'Your demo spot is reserved.'); }
  return <Screen><Heading title="Find your thing." subtitle="Good energy. Great company. All levels."/><View style={s.search}><Icon name="search-outline" color={C.muted} size={20}/><TextInput accessibilityLabel="Search classes" placeholder="Search yoga, strength, spin…" placeholderTextColor={C.muted} value={query} onChangeText={setQuery} style={{ flex: 1, color: C.ink, fontSize: 14, paddingVertical: 12 }}/></View><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 18 }}>{['All', 'My classes', 'Strength', 'Cardio', 'Mind & body'].map(t => <Chip key={t} text={t} active={filter === t} onPress={() => setFilter(t)}/>)}</ScrollView><View style={s.scheduleLabel}><Text style={s.h2}>{filter === 'My classes' ? 'Your lineup' : recommended.size ? 'Picked for your interests' : 'On the schedule'}</Text><Text style={s.small}>Sample classes</Text></View>
    {found.map(c => <Pressable accessibilityRole="button" accessibilityLabel={`View ${c.name}`} key={c.id} onPress={() => setSelected(c)} style={s.classCard}><Image source={photos[c.image]} style={s.classImage}/><View style={s.classCardBody}><View style={[s.row, { justifyContent: 'space-between' }]}><Text style={s.classCategory}>{c.category}</Text><Text style={[s.availability, c.spots === 'Waitlist' && { color: '#946100', backgroundColor: '#FFF1D6' }]}>{data.reservations.includes(c.id) ? c.spots === 'Waitlist' ? 'Waitlisted' : 'Reserved' : c.spots}</Text></View><Text style={s.classTitle}>{c.name}</Text><View style={s.row}><Icon name="time-outline" size={16} color={C.muted}/><Text style={s.small}>{c.day}, {c.time} · {c.duration}</Text></View><View style={[s.row, { marginTop: 7 }]}><Icon name="location-outline" size={16} color={C.muted}/><Text style={s.small}>{c.place} · Student Rec Center</Text></View></View></Pressable>)}
    {!found.length && <View style={s.empty}><Text style={s.h2}>{filter === 'My classes' ? 'Make room for something good.' : 'No classes found.'}</Text><Text style={s.small}>{filter === 'My classes' ? 'Choose a class to start your lineup.' : 'Try another search or category.'}</Text><Button title="Browse all classes" secondary onPress={() => { setQuery(''); setFilter('All'); }}/></View>}
    <Sheet title={selected?.name || 'Class details'} visible={!!selected} close={() => setSelected(null)}>{selected && <><Image source={photos[selected.image]} style={{ height: 180, width: '100%', borderRadius: 16 }}/><Text style={s.body}>{selected.description}</Text><Text style={s.bold}>{selected.day}, {selected.time} · {selected.duration}</Text><Text style={s.small}>{selected.place} · With {selected.instructor}</Text><Text style={s.small}>Bring water and comfortable clothes. Reservations here are for the prototype only.</Text><Button title={data.reservations.includes(selected.id) ? selected.spots === 'Waitlist' ? 'Leave waitlist' : 'Cancel reservation' : selected.spots === 'Waitlist' ? 'Join waitlist' : 'Reserve my spot'} onPress={() => reserve(selected)}/></>}</Sheet></Screen>;
}
function CommunityScreen() {
  const social = useSocial(); const [chat, setChat] = useState<string | null>(null); const [friendQuery, setFriendQuery] = useState('');

  const { profile } = useProfile();
  const { data, setData, notify } = useContext(Store); const [tab, setTab] = useState('Feed'); const [compose, setCompose] = useState(false); const [draft, setDraft] = useState('');
  function post() { if (!draft.trim()) return; setData(d => ({ ...d, posts: [{ id: Date.now(), name: 'You', initials: initials(profile), text: draft.trim(), likes: 0 }, ...d.posts] })); setDraft(''); setCompose(false); setTab('Feed'); notify('Added to your local demo feed.'); }
  return <Screen><Heading title="Find your pack." subtitle="Same campus. A little more connected." action={<Pressable accessibilityRole="button" accessibilityLabel="Write a post" onPress={() => setCompose(true)} style={s.composeButton}><Icon name="create-outline" color={C.blue}/></Pressable>}/><View style={s.segment}>{['Feed', 'Friends', 'Chats'].map(t => <Chip key={t} text={t} active={tab === t} onPress={() => setTab(t)}/>)}</View>
    {tab === 'Feed' ? <><Pressable accessibilityRole="button" onPress={() => setCompose(true)} style={s.composer}><Avatar initials={initials(profile)} size={38} blue/><Text style={[s.small, { flex: 1 }]}>A win, a workout, an open invite…</Text><Icon name="add" color={C.blue}/></Pressable>{data.posts.map(p => <View key={p.id} style={s.post}><View style={s.row}><Avatar initials={p.initials}/><View style={{ flex: 1 }}><Text style={s.bold}>{p.name}</Text><Text style={s.tiny}>{p.name === 'You' ? 'Local post · ' + new Date(p.id).toLocaleDateString() : 'Sample member · Today'}</Text></View><Icon name="people-outline" size={18} color={C.muted}/></View><Text style={s.postText}>{p.text}</Text>{p.photo && <Image source={photos[p.photo]} style={s.postImage}/>}<Pressable accessibilityRole="button" accessibilityLabel={`${data.liked.includes(p.id) ? 'Unlike' : 'Like'} post by ${p.name}`} onPress={() => setData(d => ({ ...d, liked: d.liked.includes(p.id) ? d.liked.filter(id => id !== p.id) : [...d.liked, p.id] }))} style={s.like}><Icon name={data.liked.includes(p.id) ? 'heart' : 'heart-outline'} color={data.liked.includes(p.id) ? '#CC3652' : C.muted} size={23}/><Text style={s.small}>{p.likes + (data.liked.includes(p.id) ? 1 : 0)}</Text></Pressable></View>)}</> : tab === 'Friends' ? <>
      <Section title="Your connections"/><TextInput accessibilityLabel="Search your friends" placeholder="Search your connections…" placeholderTextColor={C.muted} value={friendQuery} onChangeText={setFriendQuery} style={[s.input, { marginBottom: 12 }]}/><Text style={s.small}>{social.data.connections.length} connected in this demo</Text>
      {PEOPLE.filter(p => social.data.connections.includes(p.id) && p.name.toLowerCase().includes(friendQuery.toLowerCase().trim())).map(p => <View key={p.id} style={s.history}><Avatar initials={p.name.split(' ').map(n => n[0]).join('')}/><View style={{ flex: 1 }}><Text style={s.bold}>{p.name}</Text><Text style={s.small}>{p.year} · Demo connection</Text></View><Pressable accessibilityRole="button" accessibilityLabel={"Message " + p.name} onPress={() => setChat("dm:" + p.id)} style={s.iconButton}><Icon name="chatbubble-outline" color={C.blue}/></Pressable></View>)}
      {!!friendQuery && !PEOPLE.some(p => social.data.connections.includes(p.id) && p.name.toLowerCase().includes(friendQuery.trim().toLowerCase())) && <Text style={s.small}>No connections match that name.</Text>}<Section title="People you might know"/><SocialChoices mode="friends" interests={profile?.interests || []} year={profile?.year || ''}/>
    </> : <>
      <Section title="Your conversations"/><Text style={s.small}>Plan a session. Share the small wins.</Text>
      {!social.data.groups.length && !social.data.connections.length && <View style={s.empty}><Icon name="chatbubbles-outline" size={32} color={C.blue}/><Text style={s.h2}>Start with a shared interest.</Text><Text style={s.small}>Join a group below to open its chat.</Text></View>}
      {social.data.groups.map(g => <Pressable accessibilityRole="button" key={g.id} onPress={() => { setChat(g.id); }} style={s.history}><View style={s.smallIcon}><Icon name="chatbubbles-outline" color={C.blue}/></View><View style={{ flex: 1 }}><Text style={s.bold}>{g.name}</Text><Text numberOfLines={1} style={s.small}>{social.data.messages[g.id]?.at(-1)?.text || 'You joined. Say hello to your future crew.'}</Text></View><Icon name="chevron-forward" size={18}/></Pressable>)}
      {PEOPLE.filter(p => social.data.connections.includes(p.id)).map(p => <Pressable key={p.id} accessibilityRole="button" accessibilityLabel={"Chat with " + p.name} onPress={() => setChat('dm:' + p.id)} style={s.history}><Avatar initials={p.name.split(' ').map(n => n[0]).join('')}/><View style={{ flex: 1 }}><Text style={s.bold}>{p.name}</Text><Text numberOfLines={1} style={s.small}>{social.data.messages['dm:' + p.id]?.at(-1)?.text || 'Send your first message'}</Text></View><Icon name="chevron-forward" size={18}/></Pressable>)}
      <Section title="Find your next crew"/><SocialChoices mode="groups" interests={profile?.interests || []} year={profile?.year || ''}/>
    </>}
    {!!chat && <Conversation thread={chat} close={() => setChat(null)} workouts={data.workouts}/>}
    <Sheet title="Share a little good energy" visible={compose} close={() => setCompose(false)}><Text style={s.small}>Posts stay in this prototype on your device.</Text><TextInput accessibilityLabel="Post text" autoFocus multiline maxLength={500} value={draft} onChangeText={setDraft} placeholder="What’s your small win today?" placeholderTextColor={C.muted} style={[s.input, { minHeight: 140, textAlignVertical: 'top' }]}/><Text style={s.small}>{draft.length}/500</Text><Button title="Add to demo feed" disabled={!draft.trim()} onPress={post}/></Sheet></Screen>;
}
function ProfileScreen() {
  const { data } = useContext(Store);
  const nav = useNavigation<any>();
  const { profile, edit } = useProfile();
  return <Screen>
    <Heading title="A stronger you." subtitle="More than the numbers."/>
    <View style={s.profileHero}><Avatar initials={initials(profile)} size={82} blue/><Text style={s.classTitle}>{fullName(profile)}</Text><Text style={s.small}>{profile?.year} · Demo identity</Text></View>
    <Section title="What moves you" action="Edit interests" onPress={() => edit(4)}/>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{INTERESTS.filter(x => profile?.interests.includes(x.id)).map(x => <View key={x.id} style={s.chip}><Text style={s.chipText}>{x.name}</Text></View>)}</View>
    <View style={[s.workoutCard, { marginTop: 20 }]}><Text style={s.bold}>Student record</Text><Text style={s.body}>{profile?.identity.firstName} {profile?.identity.lastName}</Text><Text style={s.small}>Sample identity. University verification is not connected.</Text><Text style={[s.small, { marginTop: 8 }]}>Preferred first name: {profile?.preferredFirstName || 'Same as student record'}</Text></View>
    <View style={s.stats}><View style={s.stat}><Text style={s.statValue}>{data.workouts.length}</Text><Text style={s.small}>Workouts logged</Text></View><View style={s.stat}><Text style={s.statValue}>{data.reservations.length}</Text><Text style={s.small}>Classes on your list</Text></View></View>
    <Section title="Your comfort comes first"/>
    <View style={s.workoutCard}><Icon name="shield-checkmark-outline" color={C.blue} size={28}/><Text style={[s.h2, { marginTop: 12 }]}>You choose when you’re visible.</Text><Text style={[s.body, { marginVertical: 12 }]}>Every workout starts private. Share a summary from Activity when you’re ready, or use Unshare on your Home card to make it private again. Your workout notes stay with you.</Text><Text style={s.small}>Sharing and conversations stay on this device in the demo.</Text><Button title="View my saved workouts" secondary onPress={() => nav.navigate('Activity')}/></View>
    <RecDiscovery interests={profile?.interests || []} onAction={route => nav.navigate(route)}/>
    <View style={s.principles}><Text style={s.h2}>Progress at your pace.</Text><Text style={s.body}>Show up, find something you enjoy, and make a connection. No leaderboards. No pressure to keep a streak alive.</Text></View>
    <Button title="Replay welcome & preferences" secondary onPress={() => edit(-1)}/>
    <Text style={s.footerNote}>{'Independent UConn Rec concept · Demo data\nUniversity integration is not connected.'}</Text>
  </Screen>;
}
const icons: Record<string, IconName> = { Home: 'home-outline', Activity: 'barbell-outline', Classes: 'calendar-outline', Community: 'people-outline', Profile: 'person-outline' };
const Tabs = createBottomTabNavigator({ initialRouteName: 'Home', screenOptions: ({ route }) => ({ headerShown: false, tabBarActiveTintColor: C.blue, tabBarInactiveTintColor: C.muted, tabBarStyle: { backgroundColor: 'white', borderTopColor: C.line, height: Platform.OS === 'web' ? 80 : undefined, paddingTop: 8, paddingBottom: Platform.OS === 'web' ? 8 : undefined }, tabBarItemStyle: { paddingVertical: 0 }, tabBarLabelStyle: { fontSize: 10, lineHeight: 14, flexShrink: 0, fontWeight: '600', marginTop: 3 }, tabBarIcon: ({ color, size, focused }) => route.name === 'Home' ? <View style={{ width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: focused ? C.navy : C.pale }}><RecEmblem kind="building" size={24} color={focused ? 'white' : C.muted}/></View> : <Icon name={icons[route.name]} color={color} size={size}/> }), screens: { Activity: ActivityScreen, Classes: ClassesScreen, Home: HomeScreen, Community: CommunityScreen, Profile: ProfileScreen } });
const Navigation = createStaticNavigation(Tabs);
export default function App() { return <ProfileProvider><SocialProvider><WorkoutFeedProvider><RecApp/></WorkoutFeedProvider></SocialProvider></ProfileProvider>; }
function RecApp() {
  const { data, update: setData, ready, error: storageError } = useLocalData('uconn-rec-v1', initial, isAppData); const [toast, setToast] = useState('');
  const { profile, loaded, editing } = useProfile();
  const { ready: socialReady } = useSocial();
  const { ready: feedReady } = useWorkoutFeed();
  const { width, height } = useWindowDimensions(); const desktop = Platform.OS === 'web' && width >= 900;
  const welcome = !profile || editing; const dark = !loaded || welcome;
  useEffect(() => { if (toast) { const timer = setTimeout(() => setToast(''), 4000); return () => clearTimeout(timer); } }, [toast]);
  return <Store.Provider value={{ data, setData, notify: setToast }}><SafeAreaProvider><StatusBar style={dark ? 'light' : 'dark'}/>
    <View style={[s.app, desktop && s.desktop, dark && { backgroundColor: '#191E24' }]}>
      {desktop && <View style={s.desktopIntro}>
        <View style={{ marginBottom: 42 }}><RecBrand dark={dark}/></View>
        <Text style={[s.desktopTitle, dark && { color: '#E1E6EB', fontSize: 43, lineHeight: 48, letterSpacing: -1.5 }]}>{dark ? 'Your campus.\nYour people.\nYour beginning.' : 'Work out.\nMeet up.\nBelong here.'}</Text>
        <Text style={[s.desktopCopy, dark && { color: '#AEB8C3' }]}>{dark ? 'A calmer first step into your Rec community. A few questions to make this space feel like yours.' : 'A community-first campus fitness concept. Explore the screens, try a workout, and find your next class.'}</Text>
        <View style={[s.desktopRule, dark && { backgroundColor: '#9AAABC' }]}/>
        <Text style={[s.desktopLabel, dark && { color: '#D8E0E8' }]}>Interactive mobile preview</Text>
        <Text style={[s.desktopSmall, dark && { color: '#AEB8C3' }]}>The same React Native screens, ready for Expo Go on your phone.</Text>
        <Text style={[s.desktopSmall, { marginTop: 32 }, dark && { color: '#AEB8C3' }]}>Prototype 05 · Make the Rec yours</Text>
      </View>}
      <View style={[s.phone, Platform.OS !== 'web' && { flex: 1 },
        Platform.OS === 'web' && { width: '100%', maxWidth: 430, height, flex: undefined, alignSelf: 'center' },
        desktop && { width: 410, height: Math.min(884, height - 52), borderRadius: 32, borderWidth: 7, borderColor: '#343E48', boxShadow: '0px 24px 70px rgba(0,0,0,0.25)', flex: undefined },
        dark && { backgroundColor: '#101419' },
      ]}>
        {desktop && !dark && <View style={s.phoneStatus}><Text style={s.statusTime}>9:41</Text><View style={s.row}><Icon name="cellular" size={14}/><Icon name="wifi" size={14}/><Icon name="battery-full" size={19}/></View></View>}
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          {!ready || !loaded || !socialReady || !feedReady ? <WelcomeLoading/> : welcome ? <Onboarding/> : <Navigation/>}
        </KeyboardAvoidingView>
        {!!storageError && <View accessibilityRole="alert" style={{ padding: 12, backgroundColor: '#FFF1D6' }}><Text style={s.small}>{storageError}</Text></View>}
        {!!toast && <View accessibilityRole="alert" style={s.toast}><Icon name="checkmark-circle" color="white" size={20}/><Text style={s.toastText}>{toast}</Text></View>}
      </View>
    </View>
  </SafeAreaProvider></Store.Provider>;
}
