import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useStore } from '../data/store';
import { searchSchools, signupGate, waitlistStatus } from '../data/selectors';
import { SCHOOL_BY_ID } from '../data/schools';
import { ACTIVITIES } from '../data/activities';
import { CLASS_YEARS, ClassYear, School } from '../data/types';
import { Button, Chip, Input, Screen, Text, attempt } from '../ui';
import { colors, space } from '../theme';

// PLACEHOLDER - functional but plain. Owned by the Onboarding feature agent, which will
// replace this with the designed flow (welcome, school search, .edu code, profile, interests, friends).

type Step = 'school' | 'email' | 'code' | 'profile' | 'waitlist';

export function OnboardingFlow() {
  const { state, actions } = useStore();
  const [step, setStep] = useState<Step>('school');
  const [query, setQuery] = useState('');
  const [school, setSchool] = useState<School | null>(null);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [demoCode, setDemoCode] = useState('');
  const [first, setFirst] = useState('');
  const [last, setLast] = useState('');
  const [year, setYear] = useState<ClassYear>('First year');
  const [interests, setInterests] = useState<string[]>([]);

  function submitEmail() {
    if (!school) return;
    const gate = signupGate(email, school.id);
    if (!gate.ok && gate.reason === 'waitlist') {
      if (attempt(() => actions.joinWaitlist({ email, schoolId: school.id })).ok) setStep('waitlist');
      return;
    }
    const r = attempt(() => actions.startSignup({ email, schoolId: school.id }));
    if (r.ok) { setDemoCode(r.value.code); setStep('code'); }
  }

  const body = (() => {
    switch (step) {
      case 'school':
        return (
          <>
            <Text variant="hero">Find your campus</Text>
            <Input placeholder="Search schools" value={query} onChangeText={setQuery} autoCorrect={false} />
            {searchSchools(query, undefined, 8).map(s => (
              <Pressable key={s.id} style={styles.row} onPress={() => { setSchool(s); setStep('email'); }} accessibilityRole="button">
                <Text variant="bodyStrong">{s.name}</Text>
                <Text variant="tiny" color={s.isPilot ? 'turf' : 'muted'}>{s.isPilot ? 'Open now' : 'Waitlist'} · {s.city}, {s.state}</Text>
              </Pressable>
            ))}
          </>
        );
      case 'email':
        return (
          <>
            <Text variant="hero">{school?.shortName} email</Text>
            <Input placeholder={`you@${school?.emailDomains[0]}`} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
            <Button label="Continue" onPress={submitEmail} />
            <Button label="Pick a different school" variant="ghost" onPress={() => setStep('school')} />
          </>
        );
      case 'code':
        return (
          <>
            <Text variant="hero">Check your email</Text>
            <Text variant="small" color="muted">Demo build: your code is {demoCode}</Text>
            <Input placeholder="6-digit code" value={code} onChangeText={setCode} keyboardType="number-pad" maxLength={6} />
            <Button label="Verify" onPress={() => { if (attempt(() => actions.verifyCode(code)).ok) setStep('profile'); }} />
          </>
        );
      case 'profile':
        return (
          <>
            <Text variant="hero">About you</Text>
            <Input label="First name" value={first} onChangeText={setFirst} />
            <Input label="Last name" value={last} onChangeText={setLast} />
            <View style={styles.wrap}>{CLASS_YEARS.map(y => <Chip key={y} label={y} selected={year === y} onPress={() => setYear(y)} />)}</View>
            <Text variant="eyebrow" color="muted">What do you do?</Text>
            <View style={styles.wrap}>
              {ACTIVITIES.slice(0, 20).map(a => (
                <Chip key={a.id} label={a.name} selected={interests.includes(a.id)}
                  onPress={() => setInterests(cur => (cur.includes(a.id) ? cur.filter(x => x !== a.id) : [...cur, a.id]))} />
              ))}
            </View>
            <Button label="Enter Dean's Lift" onPress={() => attempt(() => actions.completeProfile({ firstName: first, lastName: last, classYear: year, interests }))} />
          </>
        );
      case 'waitlist': {
        const w = school ? waitlistStatus(state, school.id, email) : null;
        return (
          <>
            <Text variant="hero">You're on the list</Text>
            <Text variant="body" color="muted">{school ? SCHOOL_BY_ID[school.id]?.shortName : ''} unlocks at {w?.unlockAt} students. {w?.count} have joined. You're #{w?.position}.</Text>
            <Button label="Back" variant="ghost" onPress={() => setStep('school')} />
          </>
        );
      }
    }
  })();

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen edges={['top', 'bottom']} contentStyle={styles.content}>{body}</Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  content: { gap: space.lg, paddingTop: space.x4 },
  row: { paddingVertical: space.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line, gap: space.xxs },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
});
