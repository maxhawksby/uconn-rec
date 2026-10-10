import React, { useEffect, useMemo, useState } from 'react';
import { BackHandler, Keyboard, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { useStore } from '../data/store';
import { groupsForSchool, suggestedStudentsFor, waitlistStatus } from '../data/selectors';
import type { ClassYear, School } from '../data/types';
import { attempt } from '../ui';
import { colors } from '../theme';
import { Welcome } from './Welcome';
import { SchoolStep } from './SchoolStep';
import { CodeStep, EmailStep } from './VerifySteps';
import { InterestsStep, PeopleStep, ProfileStep } from './ProfileSteps';
import { Waitlist } from './Waitlist';

// School-first sign-up. Pilot path: school -> email -> code -> profile -> interests -> people,
// then completeProfile signs the student in and the root navigator swaps to the Feed.
// Any other school: school -> email -> waitlist, which is where the flow ends.

type Step = 'welcome' | 'school' | 'email' | 'code' | 'profile' | 'interests' | 'people' | 'waitlist';

const PILOT_STEPS: Step[] = ['school', 'email', 'code', 'profile', 'interests', 'people'];
const WAITLIST_STEPS: Step[] = ['school', 'email'];

const BACK: Partial<Record<Step, Step>> = {
  school: 'welcome', email: 'school', code: 'email', profile: 'code', interests: 'profile', people: 'interests', waitlist: 'school',
};

export function OnboardingFlow() {
  const { state, actions } = useStore();
  const [step, setStep] = useState<Step>('welcome');
  const [query, setQuery] = useState('');
  const [school, setSchool] = useState<School | null>(null);
  const [email, setEmail] = useState('');
  const [demoCode, setDemoCode] = useState('');
  const [verified, setVerified] = useState(false);
  const [first, setFirst] = useState('');
  const [last, setLast] = useState('');
  const [year, setYear] = useState<ClassYear | null>(null);
  const [interests, setInterests] = useState<string[]>([]);
  const [following, setFollowing] = useState<string[]>([]);
  const [joined, setJoined] = useState<string[]>([]);

  const path = school && !school.isPilot ? WAITLIST_STEPS : PILOT_STEPS;
  const progress = { index: Math.max(1, path.indexOf(step) + 1), total: path.length };

  const go = (next: Step) => { Keyboard.dismiss(); setStep(next); };
  const back = () => { const prev = BACK[step]; if (prev) go(prev); };

  // Android hardware back walks the flow instead of closing the app.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      const prev = BACK[step];
      if (!prev) return false;
      go(prev);
      return true;
    });
    return () => sub.remove();
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  function pickSchool(s: School) {
    if (s.id !== school?.id) { setVerified(false); setDemoCode(''); }
    setSchool(s);
    go('email');
  }

  function sendCode() {
    if (!school) return;
    const r = attempt(() => actions.startSignup({ email, schoolId: school.id }), "Couldn't send a code");
    if (r.ok) { setDemoCode(r.value.code); setVerified(false); go('code'); }
  }

  function submitEmail() {
    if (!school) return;
    if (school.isPilot) return sendCode();
    if (attempt(() => actions.joinWaitlist({ email, schoolId: school.id }), "Couldn't join the waitlist").ok) go('waitlist');
  }

  function verify(code: string) {
    // The demo code is on screen, so a mismatch is shown inline instead of as an alert.
    if (code !== demoCode) return false;
    if (attempt(() => actions.verifyCode(code), "Couldn't verify").ok) { setVerified(true); go('profile'); }
    return true;
  }

  function finish() {
    if (!year) return;
    const r = attempt(() => actions.completeProfile({ firstName: first, lastName: last, classYear: year, interests }), "Couldn't create your account");
    if (!r.ok) return;
    // completeProfile signs in synchronously, so these run as the new student. The navigator
    // then swaps onboarding for the tabs, landing on the Feed.
    following.forEach(id => attempt(() => actions.follow(id)));
    joined.forEach(id => attempt(() => actions.joinGroup(id)));
  }

  const toggle = (list: string[], id: string) => (list.includes(id) ? list.filter(x => x !== id) : [...list, id]);

  const people = useMemo(
    () => (school && step === 'people' ? suggestedStudentsFor(state, school.id, interests, 6) : []),
    [state, school, interests, step],
  );
  const groups = useMemo(() => (school && step === 'people' ? groupsForSchool(state, school.id).slice(0, 4) : []), [state, school, step]);

  const screen = (() => {
    switch (step) {
      case 'welcome':
        return <Welcome onStart={() => go('school')} />;
      case 'school':
        return <SchoolStep query={query} onQuery={setQuery} selected={school} progress={progress} onBack={back} onPick={pickSchool} onNext={() => school && go('email')} />;
      case 'email':
        return school ? (
          <EmailStep school={school} email={email} onEmail={setEmail} progress={progress} onBack={back} onSubmit={submitEmail}
            onSwitchSchool={s => { setSchool(s); setVerified(false); }} />
        ) : null;
      case 'code':
        return <CodeStep email={email.trim().toLowerCase()} demoCode={demoCode} verified={verified} progress={progress}
          onBack={back} onResend={sendCode} onVerify={verify} onNext={() => go('profile')} />;
      case 'profile':
        return school ? (
          <ProfileStep school={school} first={first} last={last} year={year} progress={progress} onBack={back} onNext={() => go('interests')}
            onChange={p => { if (p.first !== undefined) setFirst(p.first); if (p.last !== undefined) setLast(p.last); if (p.year) setYear(p.year); }} />
        ) : null;
      case 'interests':
        return <InterestsStep picked={interests} onToggle={id => setInterests(cur => toggle(cur, id))} progress={progress} onBack={back} onNext={() => go('people')} />;
      case 'people':
        return school ? (
          <PeopleStep school={school} people={people} groups={groups} following={following} joined={joined}
            onToggleFollow={id => setFollowing(cur => toggle(cur, id))} onToggleJoin={id => setJoined(cur => toggle(cur, id))}
            progress={progress} onBack={back} onFinish={finish} />
        ) : null;
      case 'waitlist':
        return school ? (
          <Waitlist school={school} email={email.trim().toLowerCase()} status={waitlistStatus(state, school.id, email)}
            onStartOver={() => { setSchool(null); setEmail(''); setQuery(''); go('school'); }} />
        ) : null;
    }
  })();

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <React.Fragment key={step}>{screen}</React.Fragment>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({ flex: { flex: 1, backgroundColor: colors.bg } });
