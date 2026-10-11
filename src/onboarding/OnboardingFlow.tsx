import React, { useEffect, useMemo, useState } from 'react';
import { BackHandler, Keyboard, StyleSheet } from 'react-native';
import { ActionError, useStore } from '../data/store';
import { groupsForSchool, suggestedStudentsFor } from '../data/selectors';
import { SCHOOL_BY_ID } from '../data/schools';
import type { WaitlistStatus } from '../data/store';
import type { ClassYear, School } from '../data/types';
import { KeyboardFrame, attempt } from '../ui';
import { attemptAsync } from '../ui/attempt';
import { colors } from '../theme';
import { Welcome } from './Welcome';
import { SchoolStep } from './SchoolStep';
import { CodeStep, EmailStep } from './VerifySteps';
import { InterestsStep, PeopleStep, ProfileStep } from './ProfileSteps';
import { Waitlist } from './Waitlist';

// School-first sign-up. Pilot path: school -> email -> code -> profile -> interests -> people,
// then completeProfile signs the student in and the root navigator swaps to the Feed.
// Any other school: school -> email -> waitlist, which is where the flow ends.
// A student who verified but closed the app before finishing resumes at the profile step.

type Step = 'welcome' | 'school' | 'email' | 'code' | 'profile' | 'interests' | 'people' | 'waitlist';

const PILOT_STEPS: Step[] = ['school', 'email', 'code', 'profile', 'interests', 'people'];
const WAITLIST_STEPS: Step[] = ['school', 'email'];

const BACK: Partial<Record<Step, Step>> = {
  school: 'welcome', email: 'school', code: 'email', profile: 'code', interests: 'profile', people: 'interests', waitlist: 'school',
};

// Local development: where the Supabase test inbox catches sign-up emails (set by npm start).
const DEV_INBOX = __DEV__ ? process.env.EXPO_PUBLIC_DEV_INBOX_URL : undefined;

export function OnboardingFlow() {
  const { state, actions, verifiedSignup } = useStore();
  const resume = verifiedSignup ? SCHOOL_BY_ID[verifiedSignup.schoolId] ?? null : null;
  const [step, setStep] = useState<Step>(resume ? 'profile' : 'welcome');
  const [query, setQuery] = useState('');
  const [school, setSchool] = useState<School | null>(resume);
  const [email, setEmail] = useState(resume ? verifiedSignup!.email : '');
  const [demoCode, setDemoCode] = useState('');
  const [sendCount, setSendCount] = useState(0);
  const [verifiedCode, setVerifiedCode] = useState(resume ? '------' : '');
  const [busy, setBusy] = useState(false);
  const [waitlist, setWaitlist] = useState<WaitlistStatus | null>(null);
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
    if (s.id !== school?.id) { setVerifiedCode(''); setDemoCode(''); }
    setSchool(s);
    go('email');
  }

  async function sendCode() {
    if (!school) return;
    const r = await attemptAsync(() => actions.startSignup({ email, schoolId: school.id }), "Couldn't send a code");
    if (r.ok) { setDemoCode(r.value.demoCode ?? ''); setVerifiedCode(''); setSendCount(n => n + 1); go('code'); }
  }

  async function submitEmail() {
    if (!school || busy) return;
    setBusy(true);
    if (school.isPilot) await sendCode();
    else {
      const r = await attemptAsync(() => actions.joinWaitlist({ email, schoolId: school.id }), "Couldn't join the waitlist");
      if (r.ok) { setWaitlist(r.value); go('waitlist'); }
    }
    setBusy(false);
  }

  /** Returns an inline error for the code boxes, or null once verified. */
  async function verify(code: string) {
    try {
      await actions.verifyCode(code);
    } catch (e) {
      if (e instanceof ActionError) return demoCode ? "That code doesn't match. Check the demo code above." : e.message;
      throw e;
    }
    setVerifiedCode(code);
    go('profile');
    return null;
  }

  async function finish() {
    if (!year || busy) return;
    setBusy(true);
    const r = await attemptAsync(() => actions.completeProfile({ firstName: first, lastName: last, classYear: year, interests }), "Couldn't create your account");
    setBusy(false);
    if (!r.ok) return;
    // The account exists now, so these run as the new student. The navigator then swaps
    // onboarding for the tabs, landing on the Feed.
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
            busy={busy} onSwitchSchool={s => { setSchool(s); setVerifiedCode(''); }} />
        ) : null;
      case 'code':
        return <CodeStep email={email.trim().toLowerCase()} demoCode={demoCode} inboxUrl={DEV_INBOX} verifiedCode={verifiedCode} sendCount={sendCount}
          progress={progress} onBack={back} onResend={sendCode} onVerify={verify} onNext={() => go('profile')} />;
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
            progress={progress} onBack={back} onFinish={finish} busy={busy} />
        ) : null;
      case 'waitlist':
        return school && waitlist ? (
          <Waitlist school={school} email={email.trim().toLowerCase()} status={waitlist}
            onStartOver={() => { setSchool(null); setEmail(''); setQuery(''); go('school'); }} />
        ) : null;
    }
  })();

  return (
    <KeyboardFrame style={styles.flex}>
      <React.Fragment key={step}>{screen}</React.Fragment>
    </KeyboardFrame>
  );
}

const styles = StyleSheet.create({ flex: { flex: 1, backgroundColor: colors.bg } });
