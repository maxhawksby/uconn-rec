import InterestPicker from './InterestPicker';
import { SocialChoices, useSocial } from '../social';
import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, ActivityIndicator, Animated, Easing, Image, Keyboard, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { DEMO_IDENTITY, YEARS, isNamePreference, isUConnEmail, normalizeEmail } from './model';
import { useProfile } from './ProfileContext';
import { RecBrand, RecScene } from '../RecVisual';
import { useReducedMotion } from '../motion';
import { RecJourney, ReadySummary } from './RecJourney';

const labels = ['Your campus', 'Your email', 'Your name', 'Your year', 'Your interests', 'Your friends', 'Your groups', 'Your Rec'];
const titles = ['Are you a\nUConn student?', 'A familiar\nconnection.', 'What should\nwe call you?', 'Where are you\nin your journey?', 'What moves\nyou?', 'Find your\nfamiliar faces.', 'There’s a crew\nfor that.', 'You’re right\nwhere you belong.'];
const descriptions = ['Your campus. Your community. Your place to begin.', 'Start with your UConn email address.', 'Real people. A community you can feel at home in.', 'Find your people, wherever you’re starting from.', 'Pick the things you love. Or something you’d like to try.', 'Start with what you have in common.', 'A shared interest. A good place to start.', 'A few small choices. A space that feels like you.'];
function Glyph({ name, size = 21, color = '#C5CAD0' }: { name: React.ComponentProps<typeof Ionicons>['name']; size?: number; color?: string }) { return <Ionicons name={name} size={size} color={color}/>; }

export function WelcomeLoading() { return <View style={[o.root, o.intro]}><Text style={o.brand}>UCONN REC</Text><ActivityIndicator color="#CBD3DA" style={{ marginTop: 24 }}/><Text style={o.caption}>Opening your Rec space…</Text></View>; }

export default function Onboarding() {
  const compact = useWindowDimensions().height < 700;
  const { profile, save, cancel, startStep, error: loadError } = useProfile();
  const [step, setStep] = useState(Math.max(0, startStep)); const [intro, setIntro] = useState(!profile || startStep === -1);
  const reduced = useReducedMotion();
  const { data: social } = useSocial();
  const [transitioning, setTransitioning] = useState(false);
  const transitionLock = useRef(false);
  const direction = useRef(1);
  const [email, setEmail] = useState(profile?.email || '');
  const [preferred, setPreferred] = useState(profile?.preferredFirstName || '');
  const [year, setYear] = useState(profile?.year || '');
  const [interests, setInterests] = useState<string[]>(profile?.interests || []);
  const [nonStudent, setNonStudent] = useState(false); const [attempted, setAttempted] = useState(false);
  const [saving, setSaving] = useState(false); const [saveError, setSaveError] = useState('');
  const appear = useRef(new Animated.Value(0)).current;
  const shift = useRef(new Animated.Value(0)).current;
  const scroll = useRef<ScrollView>(null);
  useEffect(() => {
    scroll.current?.scrollTo({ y: 0, animated: false });
    appear.setValue(reduced ? 1 : 0);
    shift.setValue(reduced ? 0 : direction.current * 12);
    const timing = { duration: reduced ? 0 : 260, easing: Easing.out(Easing.cubic), useNativeDriver: Platform.OS !== 'web' };
    const animation = Animated.parallel([Animated.timing(appear, { ...timing, toValue: 1 }), Animated.timing(shift, { ...timing, toValue: 0 })]);
    animation.start(({ finished }) => { if (finished) { transitionLock.current = false; setTransitioning(false); } });
    if (!intro) AccessibilityInfo.announceForAccessibility(`${step === 7 ? 'Ready to enter your Rec.' : `Step ${step + 1} of 7.`} ${titles[step].replace('\n', ' ')}`);
    return () => animation.stop();
  }, [step, intro, reduced, appear, shift]);
  useEffect(() => () => { appear.stopAnimation(); shift.stopAnimation(); }, [appear, shift]);
  const emailError = attempted && step === 1 && !isUConnEmail(email) ? 'Enter a complete @uconn.edu email address.' : '';
  const nameError = attempted && step === 2 && !isNamePreference(preferred) ? 'Use a first name, up to 40 characters. Letters, spaces, apostrophes and hyphens are welcome; no numbers or handles.' : '';
  const choiceError = attempted && step === 3 && !year ? 'Select your current year to continue.' : attempted && step === 4 && !interests.length ? 'Choose at least one interest. You can change it later.' : '';
  function go(next: number) {
    if (transitionLock.current || saving) return;
    Keyboard.dismiss(); setAttempted(false); setSaveError(''); setNonStudent(false);
    direction.current = next > step ? 1 : -1;
    if (reduced) { setStep(next); return; }
    transitionLock.current = true; setTransitioning(true);
    const timing = { duration: 120, easing: Easing.in(Easing.quad), useNativeDriver: Platform.OS !== 'web' };
    Animated.parallel([Animated.timing(appear, { ...timing, toValue: 0 }), Animated.timing(shift, { ...timing, toValue: -direction.current * 8 })]).start(({ finished }) => {
      if (finished) setStep(next);
      else { transitionLock.current = false; setTransitioning(false); }
    });
  }
  async function next() {
    if (transitionLock.current || saving) return;
    setAttempted(true);
    if ((step === 1 && !isUConnEmail(email)) || (step === 2 && !isNamePreference(preferred)) || (step === 3 && !year) || (step === 4 && !interests.length)) return;
    if (step < 7) { go(step + 1); return; }
    transitionLock.current = true; setSaving(true); setSaveError('');
    try { await save({ version: 1, email: normalizeEmail(email), identity: DEMO_IDENTITY, preferredFirstName: preferred.trim(), year: year as typeof YEARS[number], interests, completedAt: profile?.completedAt || new Date().toISOString() }); }
    catch { transitionLock.current = false; setSaveError('Your details couldn’t be saved on this device. Please try again.'); setSaving(false); }
  }
  function toggle(id: string) { setInterests(old => old.includes(id) ? old.filter(x => x !== id) : [...old, id]); }
  return <View style={o.root}>
    <Image accessible={false} source={require('../../assets/photos/rec-center.jpg')} resizeMode="cover" style={o.backdrop}/>
    <View pointerEvents="none" style={o.shade}/>
    {intro ? <SafeAreaView style={o.intro}>
      <RecBrand dark/><View style={{ width: '90%', marginTop: 22 }}><RecScene dark height={200} arrival/></View>
      <Text style={o.introTitle}>A place to belong.</Text><Text style={o.caption}>A little movement. A stronger connection.</Text>
      <Pressable accessibilityRole="button" onPress={() => setIntro(false)} style={[o.primary, { marginTop: 34, width: '80%' }]}><Text style={o.primaryText}>Make it yours</Text><Glyph name="arrow-forward" color="#171C22" size={19}/></Pressable><Text style={o.caption}>A few questions. Your own pace.</Text>
    </SafeAreaView> : <SafeAreaView style={{ flex: 1 }}>
      <View style={[o.top, compact && { paddingTop: 10, paddingBottom: 12 }]}><RecBrand dark/><View style={o.preview}>{profile ? <Pressable accessibilityRole="button" accessibilityLabel="Close welcome editor" disabled={saving} onPress={cancel} style={{ padding: 10 }}><Text style={o.subtle}>Close</Text></Pressable> : <><View style={o.dot}/><Text style={o.previewText}>Design preview</Text></>}</View></View>
      <RecJourney step={step} interests={interests} name={preferred.trim() || 'Alex'} reduced={reduced}/>
      <View style={[o.stepRow, compact && { paddingTop: 6 }]}><Pressable accessibilityRole="button" disabled={transitioning || saving} accessibilityLabel={step ? 'Previous question' : profile ? 'Cancel editing' : 'Replay welcome animation'} onPress={() => step ? go(step - 1) : profile ? cancel() : setIntro(true)} style={o.back}><Glyph name="arrow-back" size={19}/></Pressable><Text style={o.stepLabel}>{labels[step]} <Text style={{ color: '#8B949E' }}>{step < 7 ? ` / ${step + 1} of 7` : ' / Ready when you are'}</Text></Text></View>
      <ScrollView ref={scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} indicatorStyle="white" contentContainerStyle={[o.scroll, compact && { paddingTop: 8 }]}>
        <Animated.View style={{ opacity: appear, transform: [{ translateX: shift }] }}>
          <Text accessibilityRole="header" style={[o.title, compact && { fontSize: 33, lineHeight: 37 }]}>{titles[step]}</Text><Text style={o.description}>{descriptions[step]}</Text>
          {step === 0 && <View style={o.studentBody}><View style={o.location}><Glyph name="location-outline" size={17}/><Text style={o.subtle}>Student Recreation Center · Storrs</Text></View><View style={o.line}/><Text style={o.welcomeNote}>{'Built around you.\nMade better together.'}</Text>{nonStudent && <View accessibilityRole="alert" style={o.notice}><Text style={o.noticeText}>This student community is designed for current UConn students. A guest experience isn’t available yet.</Text></View>}{!!loadError && <Text style={o.error}>{loadError}</Text>}</View>}
          {step === 1 && <View style={o.fields}><Text style={o.label}>UConn email</Text><TextInput accessibilityLabel="UConn email" value={email} onChangeText={setEmail} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" textContentType="emailAddress" autoComplete="email" placeholder="netid@uconn.edu" placeholderTextColor="#89919A" maxLength={254} onSubmitEditing={next} returnKeyType="next" style={[o.input, !!emailError && o.invalid]}/><Text style={o.hint}>Your NetID email or existing UConn email alias.</Text><View style={o.notice}><Glyph name="information-circle-outline" size={20}/><Text style={o.noticeText}>University sign-in is not connected yet. Continue with a sample student identity to explore the flow. Your email will not be verified or sent.</Text></View><Text style={o.hint}>You can use preview.student@uconn.edu for this demo.</Text></View>}
          {step === 2 && <View style={o.fields}><View style={o.identity}><View style={o.identityAvatar}><Text style={o.identityInitials}>AM</Text></View><View style={{ flex: 1 }}><Text style={o.identityName}>{DEMO_IDENTITY.firstName} {DEMO_IDENTITY.lastName}</Text><Text style={o.hint}>Sample student record · Not verified</Text></View><Glyph name="lock-closed-outline" size={18}/></View><Text style={o.label}>Do you have a first name preference?</Text><TextInput accessibilityLabel="Preferred first name" placeholder="Alex (optional)" placeholderTextColor="#89919A" value={preferred} onChangeText={setPreferred} autoCorrect={false} autoCapitalize="words" maxLength={40} returnKeyType="next" onSubmitEditing={next} style={[o.input, !!nameError && o.invalid]}/><Text style={o.hint}>Your profile will show {preferred.trim() || 'Alex'} Morgan. Your last name stays linked to your student record.</Text><View style={o.notice}><Glyph name="shield-checkmark-outline" size={20}/><Text style={o.noticeText}>Planned university account policy: authorized administrators can still see your university-record first and last name when you use a preferred first name. In this preview, the identity is sample data and there is no administrator access.</Text></View></View>}
          {step === 3 && <View style={o.options}>{YEARS.map(x => <Pressable key={x} accessibilityRole="radio" accessibilityState={{ checked: x === year }} aria-checked={x === year} onPress={() => setYear(x)} style={[o.option, x === year && o.selected]}><Text style={o.optionText}>{x}</Text><Glyph name={x === year ? 'radio-button-on' : 'radio-button-off'} size={20} color={x === year ? '#F4F6F8' : '#727A83'}/></Pressable>)}</View>}
          {step === 4 && <InterestPicker selected={interests} toggle={toggle}/>}
          {step === 5 && <SocialChoices mode="friends" interests={interests} year={year} dark/>}
          {step === 6 && <SocialChoices mode="groups" interests={interests} year={year} dark/>}
          {step === 7 && <ReadySummary name={preferred.trim() || 'Alex'} year={year} interests={interests} connections={social.connections.length} groups={social.groups.length}/>}

        </Animated.View>
      </ScrollView>
      <View style={o.bottom}>{!!(emailError || nameError || choiceError || saveError) && <Text accessibilityRole="alert" style={[o.error, { marginTop: 0, marginBottom: 12 }]}>{emailError || nameError || choiceError || saveError}</Text>}
        <Pressable accessibilityRole="button" accessibilityState={{ disabled: saving || transitioning, busy: saving }} disabled={saving || transitioning} onPress={() => step === 0 ? go(1) : next()} style={({ pressed }) => [o.primary, { opacity: pressed || saving ? .7 : 1 }]}>{saving ? <ActivityIndicator color="#151A20"/> : <><Text style={o.primaryText}>{step === 0 ? 'Yes, I’m a UConn student' : step === 1 ? 'Continue with demo identity' : step === 7 ? profile ? 'Save my preferences' : 'Enter my Rec' : step === 6 ? 'Bring it all together' : step === 5 ? 'Continue to groups' : step === 4 ? 'Find my people' : step === 3 ? 'Choose my interests' : 'Continue'}</Text><Glyph name={step === 7 ? 'checkmark' : 'arrow-forward'} color="#171C22" size={19}/></>}</Pressable>
        {(step === 5 || step === 6) && <Text style={[o.hint, { textAlign: 'center', marginTop: 10 }]}>Optional. Continue whenever you’re ready.</Text>}{step === 0 ? <Pressable accessibilityRole="button" onPress={() => setNonStudent(true)} style={o.notStudent}><Text style={o.subtle}>I’m not a UConn student</Text></Pressable> : <Text style={o.bottomNote}>{step === 4 ? `${interests.length} interest${interests.length === 1 ? '' : 's'} selected. You can change these later.` : step === 5 || step === 6 ? 'Connections and groups save as you select.' : 'Your details stay on this device in the preview.'}</Text>}
      </View>
    </SafeAreaView>}
  </View>;
}

const o = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#101B2C' }, backdrop: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, width: '100%', height: '100%', opacity: .28 }, shade: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(5,16,36,.65)' },
  intro: { flex: 1, justifyContent: 'center', alignItems: 'center' }, halo: { position: 'absolute', width: 220, height: 220, borderRadius: 110, borderWidth: 1, borderColor: '#8192A3', top: '25%', backgroundColor: 'rgba(150,170,190,.05)' }, monogram: { width: 90, height: 90, borderRadius: 28, borderWidth: 1, borderColor: '#84909D', backgroundColor: '#252D35', justifyContent: 'center', alignItems: 'center' }, monogramText: { color: '#F0F3F6', fontWeight: '900', fontSize: 56, letterSpacing: -3 }, brand: { color: '#F1F3F5', fontSize: 17, fontWeight: '900', letterSpacing: -.5 }, introTitle: { color: '#ECF0F3', fontSize: 25, fontWeight: '600', letterSpacing: -.8, marginTop: 28 }, caption: { color: '#B6C0C9', fontSize: 12, marginTop: 12 }, skip: { flexDirection: 'row', gap: 10, alignItems: 'center', padding: 18, marginTop: 42 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 26, paddingTop: 20, paddingBottom: 25 }, preview: { flexDirection: 'row', gap: 6, alignItems: 'center' }, dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#AFBAC6' }, previewText: { fontSize: 10, color: '#B4BDC6' }, progress: { flexDirection: 'row', gap: 6, paddingHorizontal: 26 }, progressPart: { flex: 1, height: 2, borderRadius: 2, backgroundColor: '#424A53' }, stepRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingTop: 15, gap: 5 }, back: { width: 40, height: 44, justifyContent: 'center', alignItems: 'center' }, stepLabel: { fontSize: 12, color: '#C4CCD3' }, scroll: { paddingHorizontal: 26, paddingTop: 18, paddingBottom: 24, flexGrow: 1 }, title: { fontSize: 39, lineHeight: 43, letterSpacing: -1.7, color: '#F3F4F6', fontWeight: '700' }, description: { color: '#BCC4CD', fontSize: 14, lineHeight: 22, marginTop: 16, maxWidth: 290 },
  studentBody: { paddingTop: 42 }, location: { flexDirection: 'row', gap: 7, alignItems: 'center' }, subtle: { color: '#BDC6CE', fontSize: 12, lineHeight: 19 }, line: { backgroundColor: '#4A525A', width: 38, height: 1, marginVertical: 25 }, welcomeNote: { color: '#C3CBD3', fontSize: 20, lineHeight: 29, fontWeight: '400' }, fields: { marginTop: 28, gap: 12 }, label: { fontSize: 13, fontWeight: '600', color: '#E2E7ED' }, input: { backgroundColor: 'rgba(33,40,48,.92)', borderWidth: 1, borderColor: '#58616C', borderRadius: 13, paddingHorizontal: 16, paddingVertical: 16, minHeight: 54, color: '#F0F3F6', fontSize: 16 }, invalid: { borderColor: '#E8A9A5' }, hint: { color: '#B3BDC7', fontSize: 11, lineHeight: 18 }, notice: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: 'rgba(39,47,56,.88)', borderRadius: 13, padding: 15, marginTop: 10 }, noticeText: { color: '#C0CAD3', flex: 1, fontSize: 11, lineHeight: 18 }, identity: { flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1, borderColor: '#464E57', paddingBottom: 21, marginBottom: 9 }, identityAvatar: { backgroundColor: '#3A4653', borderRadius: 24, width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }, identityInitials: { color: '#EAF0F5', fontSize: 16, fontWeight: '600' }, identityName: { color: '#F0F2F5', fontSize: 18, fontWeight: '600', marginBottom: 3 },
  options: { marginTop: 25, gap: 9 }, option: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: 15, minHeight: 53, borderWidth: 1, borderColor: '#434C56', borderRadius: 12, backgroundColor: 'rgba(30,37,44,.92)' }, selected: { borderColor: '#B6C6D5', backgroundColor: '#354351' }, optionText: { color: '#E0E6EC', fontSize: 13, flex: 1 }, selectionCount: { color: '#C5CFD8', fontSize: 11, marginTop: 24, marginBottom: 14 }, interests: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 17 }, interest: { width: '48%', flexGrow: 1, padding: 13, borderWidth: 1, borderColor: '#444E58', borderRadius: 13, backgroundColor: 'rgba(30,37,44,.95)', minHeight: 87 }, interestTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }, interestText: { color: '#E2E8ED', fontSize: 12, fontWeight: '500' }, error: { color: '#FFBBB3', fontSize: 12, lineHeight: 19, marginTop: 14 },
  bottom: { paddingHorizontal: 26, paddingTop: 14, paddingBottom: Platform.OS === 'web' ? 18 : 10, backgroundColor: 'rgba(12,24,43,.97)' }, primary: { backgroundColor: '#E1E8EE', borderRadius: 13, paddingHorizontal: 17, paddingVertical: 17, minHeight: 54, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }, primaryText: { flex: 1, color: '#171C22', fontSize: 13, fontWeight: '700' }, notStudent: { alignItems: 'center', justifyContent: 'center', minHeight: 43, paddingTop: 8 }, bottomNote: { color: '#AEB8C2', fontSize: 10, lineHeight: 16, textAlign: 'center', marginTop: 13 },
});
