import React, { useEffect, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSocial } from './social';
import { appendMessage, canMessage, PEOPLE, Workout, workoutSummary } from './socialModel';
import { C, s } from './styles';
import { useWorkoutFeed } from './workoutFeed';
import { publishWorkout } from './workoutFeedModel';

export function ModalFrame({ title, subtitle, close, children, closeLabel = 'Close conversation' }: { title: string; subtitle?: string; close: () => void; children: React.ReactNode; closeLabel?: string }) {
  return <Modal visible animationType="slide" onRequestClose={close} transparent={Platform.OS === 'web'}>
    <KeyboardAvoidingView style={cs.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <SafeAreaView style={cs.frame}>
        <View style={cs.header}><Pressable accessibilityRole="button" accessibilityLabel={closeLabel} onPress={close} style={s.iconButton}><Ionicons name="arrow-back" size={24} color={C.ink}/></Pressable><View style={{ flex: 1 }}><Text style={cs.title}>{title}</Text>{!!subtitle && <Text style={s.small}>{subtitle}</Text>}</View></View>
        {children}
      </SafeAreaView>
    </KeyboardAvoidingView>
  </Modal>;
}
export function WorkoutShare({ workout, close, onShared }: { workout: Workout; close: () => void; onShared: (destination: 'feed' | 'conversation') => void }) {
  const { data, update, ready, error } = useSocial(); const [target, setTarget] = useState('');
  const feed = useWorkoutFeed();
  const [caption, setCaption] = useState(feed.data.shares.find(w => w.id === `own-${workout.id}`)?.caption || '');
  const allowed = !!target && ready && feed.ready && (target === 'public-feed' || canMessage(data, target));
  const targets = [...data.groups.map(g => ({ id: g.id, name: g.name })), ...PEOPLE.filter(p => data.connections.includes(p.id)).map(p => ({ id: `dm:${p.id}`, name: p.name }))];
  return <ModalFrame title="Share your effort" subtitle="Choose who gets to see this win" closeLabel="Close workout sharing" close={close}>
    <ScrollView contentContainerStyle={{ padding: 22, gap: 18 }}>
      <View style={cs.workout}><Ionicons name="barbell-outline" size={28} color={C.blue}/><Text style={cs.title}>{workout.exercise}</Text><Text style={s.body}>{workoutSummary(workout)}</Text></View>
      <Text style={s.small}>Your private notes stay with you. Shares and messages remain on this device in the demo.</Text>
      <Pressable accessibilityRole="radio" accessibilityLabel="Public workout feed" accessibilityState={{ checked: target === 'public-feed' }} aria-checked={target === 'public-feed'} onPress={() => setTarget('public-feed')} style={[cs.target, target === 'public-feed' && { borderColor: C.blue, backgroundColor: C.pale }]}><Ionicons name="globe-outline" color={C.blue} size={23}/><View style={{ flex: 1 }}><Text style={s.bold}>Public workout feed</Text><Text style={s.small}>Your summary and caption on Home</Text></View><Ionicons name={target === 'public-feed' ? 'radio-button-on' : 'radio-button-off'} color={C.blue} size={21}/></Pressable>
      {target === 'public-feed' && <View style={{ gap: 10 }}><Text style={s.bold}>Add a public caption (optional)</Text><TextInput accessibilityLabel="Public workout caption" multiline maxLength={500} value={caption} onChangeText={setCaption} placeholder="A win worth sharing…" placeholderTextColor={C.muted} style={[s.input, { minHeight: 88, textAlignVertical: 'top' }]}/><Text style={s.small}>{caption.length}/500 · You can unshare from Home anytime.</Text></View>}
      <Text style={s.bold}>Or send to one conversation</Text>
      {targets.length ? targets.map(t => <Pressable key={t.id} accessibilityRole="radio" accessibilityState={{ checked: target === t.id }} aria-checked={target === t.id} onPress={() => setTarget(t.id)} style={[cs.target, target === t.id && { borderColor: C.blue, backgroundColor: C.pale }]}><Text style={[s.bold, { flex: 1 }]}>{t.name}</Text><Ionicons name={target === t.id ? 'radio-button-on' : 'radio-button-off'} color={C.blue} size={21}/></Pressable>) : <Text style={s.body}>Connect with a friend or join a group in Community to share privately in a conversation.</Text>}
      {!!error && <Text accessibilityRole="alert" style={s.small}>{error}</Text>}
      {!!feed.error && <Text accessibilityRole="alert" style={s.small}>{feed.error}</Text>}
    </ScrollView>
    <View style={cs.footer}><Pressable disabled={!allowed} accessibilityRole="button" onPress={() => { if (!allowed) return; if (target === 'public-feed') { feed.update(d => publishWorkout(d, workout, caption)); onShared('feed'); } else { update(d => appendMessage(d, target, workoutSummary(workout), true)); onShared('conversation'); } close(); }} style={[s.button, !allowed && { opacity: .4 }]}><Text style={s.buttonText}>{target === 'public-feed' ? 'Share to public feed' : 'Share to selected conversation'}</Text></Pressable></View>
  </ModalFrame>;
}
export default function Conversation({ thread, close, workouts, initialDraft = '', activityContext }: { thread: string; close: () => void; workouts: Workout[]; initialDraft?: string; activityContext?: string }) {
  const { data, update, ready, error } = useSocial(); const [draft, setDraft] = useState(initialDraft); const [chooseWorkout, setChooseWorkout] = useState(false); const [selectedWorkout, setSelectedWorkout] = useState<Workout | null>(null);
  const [details, setDetails] = useState(false); const [sent, setSent] = useState('');
  const list = useRef<FlatList>(null); const person = PEOPLE.find(p => `dm:${p.id}` === thread); const group = data.groups.find(g => g.id === thread);
  const allowed = canMessage(data, thread); const messages = data.messages[thread] || [];
  useEffect(() => { list.current?.scrollToEnd({ animated: false }); }, [messages.length]);
  function send() { if (!draft.trim() || !allowed) return; update(d => appendMessage(d, thread, draft)); setDraft(''); setSent('Message added to this local conversation.'); }
  return <ModalFrame title={person?.name || group?.name || 'Conversation'} subtitle={person ? `${person.year} · Demo friend` : `${group?.cohort || 'Group'} · Demo chat`} close={close}>
    <View style={cs.disclosure}><Text style={[s.small, { flex: 1 }]}>Only you can see this demo conversation.</Text><Pressable accessibilityRole="button" accessibilityState={{ expanded: details }} onPress={() => setDetails(!details)} style={{ padding: 10 }}><Text style={s.link}>Details</Text></Pressable></View>
    {!!activityContext && <View style={[cs.detail, { backgroundColor: C.pale, gap: 4 }]}><Text style={s.small}>Replying to a public workout</Text><Text style={s.bold}>{activityContext}</Text><Text style={s.small}>Edit your encouragement below, then send when you’re ready.</Text></View>}
    {details && <View style={cs.detail}><Text style={s.bold}>A little encouragement goes a long way.</Text><Text style={s.small}>Plan a session, share a workout, and keep it welcoming. Sample people do not receive messages or send replies.</Text><Pressable accessibilityRole="button" onPress={() => { update(d => group ? { ...d, groups: d.groups.filter(g => g.id !== thread) } : { ...d, connections: d.connections.filter(id => id !== person?.id) }); close(); }} style={s.secondary}><Text style={[s.link, { padding: 14 }]}>{group ? 'Leave this group' : 'Remove demo connection'}</Text></Pressable></View>}
    <FlatList ref={list} data={messages} keyExtractor={m => m.id} keyboardDismissMode="interactive" keyboardShouldPersistTaps="handled" contentContainerStyle={cs.messages} onContentSizeChange={() => list.current?.scrollToEnd({ animated: false })}
      ListEmptyComponent={<View style={cs.empty}><Ionicons name="chatbubbles-outline" size={38} color={C.blue}/><Text style={cs.emptyTitle}>{'Every crew starts\nwith a hello.'}</Text><Text style={[s.body, { textAlign: 'center' }]}>Try “Anyone up for a session after class?”</Text></View>}
      renderItem={({ item }) => <View style={[cs.bubble, item.workout && cs.workout]}><Text style={s.tiny}>You · {new Date(item.time).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</Text>{item.workout && <View style={cs.row}><Ionicons name="barbell-outline" color={C.blue} size={22}/><Text style={s.bold}>Workout shared</Text></View>}<Text selectable style={{ color: C.ink, fontSize: 15, lineHeight: 23 }}>{item.text}</Text></View>}/>
    {!!error && <Text accessibilityRole="alert" style={[s.small, { padding: 12 }]}>{error}</Text>}
    {chooseWorkout && <View style={cs.workoutPicker}><View style={cs.row}><Text style={[s.bold, { flex: 1 }]}>Choose a saved workout</Text><Pressable accessibilityRole="button" accessibilityLabel="Close workout picker" onPress={() => { setChooseWorkout(false); setSelectedWorkout(null); }} style={s.iconButton}><Ionicons name="close" size={22}/></Pressable></View>
      <ScrollView style={{ maxHeight: 140 }}>{workouts.map(w => <Pressable key={w.id} accessibilityRole="radio" accessibilityState={{ checked: selectedWorkout?.id === w.id }} onPress={() => setSelectedWorkout(w)} style={[cs.target, selectedWorkout?.id === w.id && { backgroundColor: C.pale }]}><Text style={s.bold}>{workoutSummary(w)}</Text></Pressable>)}{!workouts.length && <Text style={s.small}>Save a workout in Activity, then share it here.</Text>}</ScrollView>
      {!!selectedWorkout && <><Text style={s.small}>Private notes are excluded. Share to {person?.name || group?.name}?</Text><Pressable accessibilityRole="button" style={s.button} onPress={() => { update(d => appendMessage(d, thread, workoutSummary(selectedWorkout), true)); setChooseWorkout(false); setSelectedWorkout(null); setSent('Workout shared in this local conversation.'); }}><Text style={s.buttonText}>Share workout here</Text></Pressable></>}
    </View>}
    <View style={cs.composer}>
      <Pressable accessibilityRole="button" accessibilityLabel="Choose a workout to share" onPress={() => setChooseWorkout(!chooseWorkout)} style={s.iconButton}><Ionicons name="add-circle-outline" color={C.blue} size={28}/></Pressable>
      <TextInput accessibilityLabel="Message" placeholder="Message your crew…" placeholderTextColor={C.muted} multiline maxLength={500} value={draft} onChangeText={setDraft} style={cs.input}/>
      <Pressable accessibilityRole="button" accessibilityLabel="Send message" disabled={!draft.trim() || !ready || !allowed} onPress={send} style={[cs.send, (!draft.trim() || !ready || !allowed) && { opacity: .35 }]}><Ionicons name="arrow-up" size={24} color="white"/></Pressable>
    </View><Text accessibilityLiveRegion="polite" style={cs.status}>{draft.length ? `${draft.length}/500` : sent || 'Messages stay on this device.'}</Text>
  </ModalFrame>;
}
const cs = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: Platform.OS === 'web' ? 'rgba(7,28,62,.48)' : 'white', alignItems: 'center', justifyContent: 'center', padding: Platform.OS === 'web' ? 18 : 0 },
  frame: { width: '100%', maxWidth: Platform.OS === 'web' ? 430 : undefined, height: '100%', maxHeight: Platform.OS === 'web' ? 820 : undefined, borderRadius: Platform.OS === 'web' ? 24 : 0, overflow: 'hidden', backgroundColor: 'white' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 13, gap: 8, borderBottomWidth: 1, borderColor: C.line }, title: { fontSize: 18, lineHeight: 24, color: C.navy, fontWeight: '700' },
  disclosure: { flexDirection: 'row', alignItems: 'center', paddingLeft: 20, paddingRight: 8, backgroundColor: C.bg }, detail: { padding: 20, gap: 10, borderBottomWidth: 1, borderColor: C.line },
  messages: { flexGrow: 1, padding: 20, gap: 14 }, bubble: { padding: 16, gap: 8, backgroundColor: '#F0F3F8', borderRadius: 18, borderBottomRightRadius: 4, alignSelf: 'flex-end', width: '92%' }, workout: { backgroundColor: C.pale, borderRadius: 18, padding: 18, gap: 10 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 17, paddingVertical: 30 }, emptyTitle: { fontSize: 27, lineHeight: 32, fontWeight: '700', color: C.navy, textAlign: 'center', letterSpacing: -.8 },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 5, paddingHorizontal: 12, paddingTop: 12, borderTopWidth: 1, borderColor: C.line }, input: { flex: 1, color: C.ink, backgroundColor: C.bg, borderRadius: 20, minHeight: 44, maxHeight: 110, padding: 12, fontSize: 15, lineHeight: 21 }, send: { backgroundColor: C.blue, height: 44, width: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' }, status: { color: C.muted, fontSize: 10, textAlign: 'center', padding: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 }, workoutPicker: { padding: 15, gap: 10, borderTopWidth: 1, borderColor: C.line, backgroundColor: C.bg }, target: { padding: 15, borderWidth: 1, borderColor: C.line, borderRadius: 12, marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 10 }, footer: { padding: 20, borderTopWidth: 1, borderColor: C.line },
});
