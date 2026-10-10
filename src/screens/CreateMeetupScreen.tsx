import React, { useMemo, useRef, useState } from 'react';
import { KeyboardAvoidingView, LayoutChangeEvent, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { RootScreenProps } from '../navigation/types';
import { useMe, useStore } from '../data/store';
import { groupById, myGroups } from '../data/selectors';
import { ACTIVITY_BY_ID } from '../data/activities';
import { Button, Chip, Input, Text, attempt } from '../ui';
import { colors, gutter, space } from '../theme';
import { ActivityPicker, CapacityStepper, DayTimePicker } from '../meetups/pickers';
import {
  LOCATION_MAX, TITLE_MAX, atMinutes, dayOptions, defaultStart, formatDay, formatTime, suggestTitle, timeSlots, validateMeetupForm,
} from '../meetups/logic';
import type { MeetupFormErrors } from '../meetups/logic';
import { useNow } from '../meetups/useNow';

const PLACE_EXAMPLES = ['Rec center courts', 'Main quad', 'Campus track', 'Weight room', 'Library steps'];
type Field = keyof MeetupFormErrors;
const FIELD_ORDER: Field[] = ['activity', 'title', 'when', 'location', 'capacity'];

export function CreateMeetupScreen({ route, navigation }: RootScreenProps<'CreateMeetup'>) {
  const { state, actions } = useStore();
  const me = useMe();
  const now = useNow();
  const groups = myGroups(state, me.id);
  const requestedGroup = route.params?.groupId ? groupById(state, route.params.groupId) : undefined;
  const requestedIsMine = !!requestedGroup && requestedGroup.memberIds.includes(me.id);

  const [initialStart] = useState(() => defaultStart(new Date()));
  const [activityId, setActivityId] = useState<string | null>(() => me.interests.find(id => ACTIVITY_BY_ID[id]?.category === 'pickup') ?? 'basketball');
  const [title, setTitle] = useState('');
  const [titleEdited, setTitleEdited] = useState(false);
  const [dayOffset, setDayOffset] = useState(initialStart.offset);
  const [minutes, setMinutes] = useState<number | null>(initialStart.minutes);
  const [location, setLocation] = useState('');
  const [capacity, setCapacity] = useState(10);
  const [groupId, setGroupId] = useState<string | undefined>(requestedIsMine ? requestedGroup!.id : undefined);
  const [note, setNote] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const days = useMemo(() => dayOptions(now), [now]);
  const day = days[dayOffset]?.date ?? days[0].date;
  const slots = useMemo(() => timeSlots(day, now), [day, now]);
  const disabledDays = useMemo(() => days.filter(d => timeSlots(d.date, now).length === 0).map(d => d.offset), [days, now]);
  const validMinutes = minutes !== null && slots.includes(minutes) ? minutes : null;
  const startsAt = validMinutes !== null ? atMinutes(day, validMinutes) : null;

  const suggestion = activityId ? suggestTitle(activityId, startsAt ?? atMinutes(day, initialStart.minutes)) : '';
  const shownTitle = titleEdited ? title : suggestion;
  const form = { activityId, title: shownTitle, location, startsAt, capacity };
  const errors = submitted ? validateMeetupForm(form, now) : {};

  // Keyboard: offset the avoiding view by where it sits on screen (under the modal header).
  const frame = useRef<View>(null);
  const [kbOffset, setKbOffset] = useState(0);
  const scroll = useRef<ScrollView>(null);
  const fieldY = useRef<Partial<Record<Field, number>>>({});
  const track = (f: Field) => (e: LayoutChangeEvent) => { fieldY.current[f] = e.nativeEvent.layout.y; };

  const pickDay = (offset: number) => {
    setDayOffset(offset);
    const next = timeSlots(days[offset].date, now);
    if (minutes === null || !next.includes(minutes)) setMinutes(next.find(m => m >= 18 * 60) ?? next[0] ?? null);
  };

  const submit = () => {
    setSubmitted(true);
    const problems = validateMeetupForm(form, new Date());
    const first = FIELD_ORDER.find(f => problems[f]);
    if (first) {
      const y = fieldY.current[first];
      if (y !== undefined) scroll.current?.scrollTo({ y: Math.max(0, y - space.lg), animated: true });
      return;
    }
    const r = attempt(() => actions.createMeetup({
      activityId: activityId!, title: shownTitle.trim(), location: location.trim(), startsAt: startsAt!.toISOString(),
      capacity, groupId, note: note.trim() || undefined,
    }), "Couldn't post it");
    if (r.ok) navigation.replace('MeetupDetail', { meetupId: r.value.meetupId });
  };

  const summary = startsAt ? `${formatDay(startsAt, now)} · ${formatTime(startsAt)} · ${capacity} spots` : 'Pick a time';

  return (
    <SafeAreaView style={styles.root} edges={['bottom']}>
      <View ref={frame} style={styles.flex} onLayout={() => frame.current?.measureInWindow((_x, y) => setKbOffset(y))}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={kbOffset}>
          <ScrollView ref={scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
            <Text variant="small" color="muted" style={styles.lede}>Post a pickup game or group workout. Anyone at your school can join in one tap.</Text>

            <Section label="Activity" error={errors.activity} onLayout={track('activity')}>
              <ActivityPicker value={activityId} onChange={setActivityId} />
            </Section>

            <Section label="Title" error={errors.title} onLayout={track('title')}
              hint={titleEdited && suggestion && title !== suggestion ? (
                <Pressable accessibilityRole="button" onPress={() => { setTitleEdited(false); setTitle(''); }} hitSlop={space.sm}>
                  <Text variant="small" color="muted">Suggested: <Text variant="smallStrong" color="ink">{suggestion}</Text> · Use it</Text>
                </Pressable>
              ) : <Text variant="small" color="muted">We suggest one from the activity and time. Make it yours.</Text>}>
              <Input value={shownTitle} placeholder={suggestion || 'Pickup basketball, need 4'} maxLength={TITLE_MAX} returnKeyType="done"
                onChangeText={t => { setTitle(t); setTitleEdited(true); }} accessibilityLabel="Title" style={errors.title ? styles.inputError : undefined} />
            </Section>

            <Section label="When" error={errors.when} onLayout={track('when')}>
              <DayTimePicker days={days} dayOffset={dayOffset} onDay={pickDay} disabledDays={disabledDays}
                slots={slots} minutes={validMinutes} onTime={setMinutes} />
            </Section>

            <Section label="Where" error={errors.location} onLayout={track('location')}>
              <Input value={location} onChangeText={setLocation} maxLength={LOCATION_MAX} returnKeyType="done" autoCapitalize="sentences"
                placeholder="e.g. Rec center, court 2" accessibilityLabel="Where to meet" style={errors.location ? styles.inputError : undefined} />
              <View style={styles.chips}>
                {PLACE_EXAMPLES.map(p => <Chip key={p} label={p} selected={location === p} onPress={() => setLocation(p)} />)}
              </View>
            </Section>

            <Section label="Spots, including you" error={errors.capacity} onLayout={track('capacity')}>
              <CapacityStepper value={capacity} onChange={setCapacity} />
            </Section>

            {groups.length || requestedGroup ? (
              <Section label="Post in a group (optional)">
                <View style={styles.chips}>
                  <Chip label="No group" selected={!groupId} onPress={() => setGroupId(undefined)} />
                  {groups.map(g => <Chip key={g.id} label={g.name} icon="people-outline" selected={groupId === g.id} onPress={() => setGroupId(g.id)} />)}
                </View>
                {requestedGroup && !requestedIsMine ? (
                  <Text variant="small" color="muted">Join {requestedGroup.name} to post there.</Text>
                ) : null}
              </Section>
            ) : null}

            <Section label="Note (optional)">
              <Input value={note} onChangeText={setNote} maxLength={280} multiline placeholder="All levels welcome. Bring a ball if you have one."
                accessibilityLabel="Note" style={styles.note} textAlignVertical="top" />
            </Section>
          </ScrollView>

          <View style={styles.footer}>
            <Text variant="eyebrow" color="muted" center numberOfLines={1}>{summary}</Text>
            <Button label="Post meetup" icon="megaphone-outline" block onPress={submit} />
          </View>
        </KeyboardAvoidingView>
      </View>
    </SafeAreaView>
  );
}

function Section({ label, hint, error, children, onLayout }: {
  label: string; hint?: React.ReactNode; error?: string; children: React.ReactNode; onLayout?: (e: LayoutChangeEvent) => void;
}) {
  return (
    <View style={styles.section} onLayout={onLayout}>
      <Text variant="eyebrow" color={error ? 'danger' : 'muted'} accessibilityRole="header">{label}</Text>
      {children}
      {error ? <Text variant="small" color="danger" accessibilityLiveRegion="polite">{error}</Text> : hint ?? null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  content: { paddingHorizontal: gutter, paddingTop: space.lg, paddingBottom: space.x4, gap: space.xxl },
  lede: { marginBottom: -space.sm },
  section: { gap: space.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  inputError: { borderColor: colors.danger },
  note: { minHeight: 88, paddingTop: space.md },
  footer: { gap: space.sm, paddingHorizontal: gutter, paddingTop: space.md, paddingBottom: space.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line, backgroundColor: colors.bg },
});
