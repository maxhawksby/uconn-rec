import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { colors, fonts, minTouch, radius, space, type } from '../theme';
import { Button, Card, Input, Text } from '../ui';
import type { School } from '../data/types';
import { checkSchoolEmail, cleanCode, formatCode } from './logic';
import { StatusLine, StepFrame } from './parts';

type Progress = { index: number; total: number };

// ---------- .edu email ----------

type EmailProps = {
  school: School;
  email: string;
  onEmail: (email: string) => void;
  progress: Progress;
  onBack: () => void;
  onSwitchSchool: (school: School) => void;
  onSubmit: () => void;
  busy?: boolean;
};

export function EmailStep({ school, email, onEmail, progress, onBack, onSwitchSchool, onSubmit, busy }: EmailProps) {
  const check = checkSchoolEmail(email, school.id);
  const [touched, setTouched] = useState(false);
  const domain = `@${school.emailDomains[0]}`;
  const ready = check.status === 'ok';
  const showError = touched || email.includes('@');

  const status = (() => {
    switch (check.status) {
      case 'ok':
        return <StatusLine tone="turf" icon="checkmark-circle">That's a {school.shortName} address.</StatusLine>;
      case 'other-school':
        return (
          <View style={styles.switchBox}>
            <StatusLine tone="danger" icon="swap-horizontal">That's a {check.school.shortName} address, not {school.shortName}.</StatusLine>
            <Button label={`Switch to ${check.school.shortName}`} size="sm" variant="secondary" onPress={() => onSwitchSchool(check.school)} style={styles.switchButton} />
          </View>
        );
      case 'not-edu':
        return showError ? <StatusLine tone="danger" icon="alert-circle">Use your school email, not a personal one. {school.shortName} emails end in {domain}.</StatusLine> : null;
      case 'unknown-edu':
        return showError ? <StatusLine tone="danger" icon="alert-circle">That isn't a {school.shortName} domain. {school.shortName} emails end in {domain}.</StatusLine> : null;
      case 'invalid':
        return <StatusLine tone="danger" icon="alert-circle">That doesn't look like an email address.</StatusLine>;
      default:
        return <StatusLine tone="muted" icon="information-circle-outline">{school.shortName} emails end in {school.emailDomains.map(d => '@' + d).join(' or ')}.</StatusLine>;
    }
  })();

  return (
    <StepFrame
      progress={progress}
      onBack={onBack}
      eyebrow={school.name}
      title="Prove you're a student"
      lede={school.isPilot ? "We'll send a 6-digit code to your school email." : `${school.shortName} isn't open yet. Your school email saves your spot on the waitlist.`}
      footer={<Button label={school.isPilot ? 'Send code' : 'Join the waitlist'} onPress={onSubmit} loading={busy} disabled={!ready} block />}>
      <View key="field" style={styles.field}>
        <Input
          label="School email"
          value={email}
          onChangeText={onEmail}
          onBlur={() => setTouched(true)}
          placeholder={`you${domain}`}
          autoFocus
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          textContentType="emailAddress"
          keyboardType="email-address"
          returnKeyType={ready ? 'send' : 'done'}
          onSubmitEditing={() => { setTouched(true); if (ready) onSubmit(); }}
          style={check.status === 'ok' ? styles.inputOk : showError && check.status !== 'typing' && check.status !== 'empty' ? styles.inputBad : undefined}
        />
        {status}
      </View>
      <Text key="privacy" variant="small" color="muted">We only use your email to confirm you're a student. It's never shown to other students.</Text>
    </StepFrame>
  );
}

// ---------- 6-digit code ----------

type CodeProps = {
  email: string;
  demoCode?: string; // demo build only: shown on screen because no email is sent
  inboxUrl?: string; // local development: where the test inbox lives
  verifiedCode: string; // the code that verified, or '' if not verified yet
  sendCount: number; // bumps when a new code is sent, which clears the boxes
  progress: Progress;
  onBack: () => void;
  onResend: () => Promise<void>;
  onVerify: (code: string) => Promise<string | null>; // error message, or null when verified
  onNext: () => void;
};

export function CodeStep({ email, demoCode, inboxUrl, verifiedCode, sendCount, progress, onBack, onResend, onVerify, onNext }: CodeProps) {
  const verified = !!verifiedCode;
  const [code, setCode] = useState(verifiedCode);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<'verify' | 'resend' | null>(null);
  const [focused, setFocused] = useState(false);
  const input = useRef<TextInput>(null);

  // A new code clears the boxes.
  useEffect(() => { if (!verified) { setCode(''); setError(''); } }, [sendCount]); // eslint-disable-line react-hooks/exhaustive-deps

  function change(text: string) {
    const next = cleanCode(text);
    setCode(next);
    setError('');
    if (next.length === 6) submit(next);
  }

  async function submit(value = code) {
    if (verified) return onNext();
    if (busy) return;
    if (value.length < 6) { setError('Enter all 6 digits.'); return; }
    setBusy('verify');
    const problem = await onVerify(value);
    setBusy(null);
    if (problem) setError(problem);
  }

  async function resend() {
    setBusy('resend');
    await onResend();
    setBusy(null);
  }

  return (
    <StepFrame
      progress={progress}
      onBack={onBack}
      eyebrow="Check your email"
      title="Enter your code"
      lede={`We sent a 6-digit code to ${email}.${demoCode ? '' : ' It can take a minute to arrive.'}`}
      footer={<Button label={verified ? 'Continue' : 'Verify'} onPress={() => submit()} loading={busy === 'verify'} disabled={!verified && code.length < 6} block />}>
      {demoCode ? (
        <View key="demo" style={styles.demo} accessible accessibilityLabel={`Demo build. No email is sent. Your code is ${demoCode.split('').join(' ')}`}>
          <View style={styles.demoHead}>
            <View style={styles.demoTag}><Text variant="statLabel" color="ink">Demo</Text></View>
            <Text variant="statLabel" color="onBoardMuted">No email is sent in this build</Text>
          </View>
          <Text variant="stat" color="onBoard" style={styles.demoCode} selectable>{formatCode(demoCode)}</Text>
        </View>
      ) : inboxUrl ? (
        <View key="inbox" style={styles.demo}>
          <View style={styles.demoHead}>
            <View style={styles.demoTag}><Text variant="statLabel" color="ink">Dev</Text></View>
            <Text variant="statLabel" color="onBoardMuted">Local server: codes land in the test inbox</Text>
          </View>
          <Text variant="smallStrong" color="onBoard" selectable>{inboxUrl}</Text>
        </View>
      ) : null}

      <View key="boxes" style={styles.field}>
        <Pressable onPress={() => input.current?.focus()} accessibilityLabel="Verification code" accessibilityHint="Enter the 6-digit code" style={styles.boxes}>
          {Array.from({ length: 6 }, (_, i) => {
            const active = focused && !verified && (i === code.length || (i === 5 && code.length === 6));
            return (
              <View key={i} style={[styles.box, active && styles.boxActive, !!error && styles.boxError, verified && styles.boxOk]}>
                <Text style={styles.digit}>{code[i] ?? ''}</Text>
              </View>
            );
          })}
          <TextInput
            ref={input}
            value={code}
            onChangeText={change}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            editable={!verified && !busy}
            autoFocus={!verified}
            keyboardType="number-pad"
            textContentType="oneTimeCode"
            autoComplete="one-time-code"
            maxLength={6}
            caretHidden
            style={styles.hiddenInput}
            accessibilityLabel="Verification code"
          />
        </Pressable>
        {verified ? <StatusLine tone="turf" icon="checkmark-circle">Verified. You're a confirmed student.</StatusLine>
          : error ? <StatusLine tone="danger" icon="alert-circle">{error}</StatusLine> : null}
      </View>

      {!verified ? (
        <Card key="resend" style={styles.resend}>
          <Text variant="small" color="muted">Didn't get it, or typed the wrong email?</Text>
          <View style={styles.resendActions}>
            <Button label="New code" size="sm" variant="secondary" onPress={resend} loading={busy === 'resend'} disabled={busy === 'verify'} />
            <Button label="Edit email" size="sm" variant="ghost" onPress={onBack} />
          </View>
        </Card>
      ) : null}
    </StepFrame>
  );
}

const BOX = 52;

const styles = StyleSheet.create({
  field: { gap: space.sm },
  inputOk: { borderColor: colors.turf },
  inputBad: { borderColor: colors.danger },
  switchBox: { gap: space.sm },
  switchButton: { alignSelf: 'flex-start' },
  demo: { backgroundColor: colors.board, borderRadius: radius.md, padding: space.lg, gap: space.sm },
  demoHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  demoTag: { backgroundColor: colors.onBoard, borderRadius: radius.sm, paddingHorizontal: space.sm, paddingVertical: space.xxs },
  demoCode: { letterSpacing: space.xs },
  boxes: { flexDirection: 'row', justifyContent: 'space-between', gap: space.sm },
  box: { flex: 1, maxWidth: BOX, height: BOX + space.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  boxActive: { borderColor: colors.ink, borderWidth: 2 },
  boxError: { borderColor: colors.danger },
  boxOk: { borderColor: colors.turf, backgroundColor: colors.turfSoft },
  digit: { ...type.stat, fontFamily: fonts.numeral, color: colors.ink },
  hiddenInput: { ...StyleSheet.absoluteFill, opacity: 0, color: colors.bg, minHeight: minTouch },
  resend: { gap: space.md },
  resendActions: { flexDirection: 'row', gap: space.sm },
});
