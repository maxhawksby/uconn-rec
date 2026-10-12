import React, { useEffect, useState } from 'react';
import { Alert, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { AppState, Award, AwardTone, ID, Student } from '../data/types';
import { awardsFor, featuredAward, studentById, type HeldAward } from '../data/selectors';
import { useStore } from '../data/store';
import { colors, gutter, hitSlop, minTouch, radius, space, type Palette, type TypeVariant } from '../theme';
import { Button, Input, KeyboardFrame, Text, attempt } from '../ui';

// Awards are accomplishment badges that only admins give. The top one sits right after the
// student's name everywhere (NameMark); the profile lists them all (AwardList).

/** Icons an admin can pick for a new award (MaterialCommunityIcons names). */
export const AWARD_ICONS = [
  'crown', 'trophy', 'medal', 'star', 'fire', 'lightning-bolt', 'rocket-launch', 'bullhorn',
  'shield-check', 'dumbbell', 'weight-lifter', 'run-fast', 'flag-checkered', 'account-group', 'handshake', 'heart',
] as const;

const TONES: Record<AwardTone, { fg: keyof Palette; bg: keyof Palette; label: string }> = {
  gold: { fg: 'gold', bg: 'goldSoft', label: 'Gold' },
  accent: { fg: 'accentText', bg: 'accentSoft', label: 'Pink' },
  ink: { fg: 'ink', bg: 'sunken', label: 'Ink' },
  turf: { fg: 'turf', bg: 'turfSoft', label: 'Green' },
};

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

export function AwardIcon({ award, size = 16 }: { award: Pick<Award, 'icon' | 'tone'>; size?: number }) {
  return <MaterialCommunityIcons name={award.icon as IconName} size={size} color={colors[TONES[award.tone].fg]} />;
}

/** The award icon in its tinted disc, for lists and tiles. */
export function AwardDisc({ award, size = 40 }: { award: Pick<Award, 'icon' | 'tone'>; size?: number }) {
  return (
    <View style={[styles.disc, { width: size, height: size, borderRadius: size / 2, backgroundColor: colors[TONES[award.tone].bg] }]}>
      <AwardIcon award={award} size={Math.round(size * 0.55)} />
    </View>
  );
}

const MARK_SIZE: Partial<Record<TypeVariant, number>> = { title: 24, h2: 18, bodyStrong: 16, body: 16, smallStrong: 14, small: 14, tiny: 12 };

type NameMarkProps = {
  student: Student;
  /** Text to show; defaults to the full name. "You" and first names keep the mark too. */
  label?: string;
  variant?: TypeVariant;
  color?: keyof Palette;
  numberOfLines?: number;
};

/** A student's name with their top award right after it. The name truncates; the mark never does. */
export function NameMark({ student, label, variant = 'bodyStrong', color = 'ink', numberOfLines = 1 }: NameMarkProps) {
  const { state } = useStore();
  const award = featuredAward(state, student.id);
  const text = label ?? `${student.firstName} ${student.lastName}`;
  if (!award) return <Text variant={variant} color={color} numberOfLines={numberOfLines}>{text}</Text>;
  return (
    <View style={styles.mark}>
      <Text variant={variant} color={color} numberOfLines={numberOfLines} style={styles.shrink}>{text}</Text>
      <View accessible accessibilityLabel={award.name}>
        <AwardIcon award={award} size={MARK_SIZE[variant] ?? 16} />
      </View>
    </View>
  );
}

function awardedLine(state: AppState, held: HeldAward) {
  const by = studentById(state, held.grant.awardedBy);
  const when = new Date(held.grant.at).toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
  return by ? `From ${by.firstName} · ${when}` : when;
}

/** Every award a student holds. Admins tap one to take it back. */
export function AwardList({ state, studentId, canRevoke, onRevoke }: { state: AppState; studentId: ID; canRevoke: boolean; onRevoke: (awardId: ID) => void }) {
  const held = awardsFor(state, studentId);
  return (
    <View style={styles.list}>
      {held.map((h, i) => {
        const confirm = () => Alert.alert(`Take back ${h.award.name}?`, 'It comes off their profile right away.', [
          { text: 'Keep it', style: 'cancel' },
          { text: 'Take back', style: 'destructive', onPress: () => onRevoke(h.award.id) },
        ]);
        return (
          <Pressable key={h.award.id} disabled={!canRevoke} onPress={confirm} accessibilityRole={canRevoke ? 'button' : 'text'}
            accessibilityLabel={`${h.award.name} award. ${h.award.description}${canRevoke ? '. Take back' : ''}`}
            style={({ pressed }) => [styles.tile, i > 0 && styles.tileRule, pressed && styles.pressed]}>
            <AwardDisc award={h.award} size={i === 0 ? 48 : 40} />
            <View style={styles.flex}>
              <Text variant={i === 0 ? 'h2' : 'bodyStrong'}>{h.award.name}</Text>
              {h.grant.note || h.award.description ? <Text variant="small" color="inkSoft">{h.grant.note || h.award.description}</Text> : null}
              <Text variant="tiny" color="muted">{awardedLine(state, h)}</Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

type SheetProps = { visible: boolean; student: Student; onClose: () => void };

/** Admin sheet: pick an existing award (or design a new one), add a note, give it. */
export function AwardSheet({ visible, student, onClose }: SheetProps) {
  const { state, actions } = useStore();
  const [picked, setPicked] = useState<ID | 'new' | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState<string>('trophy');
  const [tone, setTone] = useState<AwardTone>('gold');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!visible) return;
    setPicked(null); setName(''); setDescription(''); setIcon('trophy'); setTone('gold'); setNote('');
  }, [visible]);

  const held = new Set(awardsFor(state, student.id).map(h => h.award.id));
  // Rank 0 is the Founder's crown: it was given once and isn't offered again.
  const options = [...state.awards].filter(a => a.rank > 0).sort((a, b) => a.rank - b.rank || a.name.localeCompare(b.name));
  const ready = picked === 'new' ? name.trim().length >= 2 : !!picked;

  function give() {
    if (!picked) return;
    const award = picked === 'new' ? { name, description, icon, tone } : picked;
    const res = attempt(() => actions.giveAward({ studentId: student.id, award, note }), "Couldn't give the award");
    if (res.ok) onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaProvider>
        <SafeAreaView style={styles.root} edges={Platform.OS === 'ios' ? ['bottom'] : ['top', 'bottom']}>
          <View style={styles.bar}>
            <Pressable onPress={onClose} hitSlop={hitSlop} accessibilityRole="button" style={styles.barSide}>
              <Text variant="bodyStrong" color="inkSoft">Cancel</Text>
            </Pressable>
            <Text variant="h2" accessibilityRole="header" numberOfLines={1} style={styles.shrink}>Award {student.firstName}</Text>
            <View style={styles.barSide} />
          </View>
          <KeyboardFrame>
            <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive">
              <View style={styles.field} accessibilityRole="radiogroup">
                <Text variant="eyebrow" color="muted">Award</Text>
                {options.map(a => {
                  const has = held.has(a.id);
                  const on = picked === a.id;
                  return (
                    <Pressable key={a.id} disabled={has} onPress={() => setPicked(a.id)} accessibilityRole="radio"
                      accessibilityState={{ checked: on, disabled: has }} accessibilityLabel={`${a.name}${has ? `, ${student.firstName} has it` : ''}`}
                      style={({ pressed }) => [styles.option, on && styles.optionOn, pressed && !on && styles.pressed, has && styles.dim]}>
                      <AwardDisc award={a} size={36} />
                      <View style={styles.flex}>
                        <Text variant="bodyStrong">{a.name}</Text>
                        <Text variant="tiny" color="muted" numberOfLines={2}>{has ? `${student.firstName} already has this.` : a.description}</Text>
                      </View>
                    </Pressable>
                  );
                })}
                <Pressable onPress={() => setPicked('new')} accessibilityRole="radio" accessibilityState={{ checked: picked === 'new' }} accessibilityLabel="Make a new award"
                  style={({ pressed }) => [styles.option, picked === 'new' && styles.optionOn, pressed && picked !== 'new' && styles.pressed]}>
                  <AwardDisc award={{ icon: 'plus', tone: 'ink' }} size={36} />
                  <Text variant="bodyStrong">New award</Text>
                </Pressable>
              </View>

              {picked === 'new' ? (
                <View style={styles.field}>
                  <View style={styles.preview}>
                    <AwardDisc award={{ icon, tone }} size={56} />
                    <View style={styles.flex}>
                      <Text variant="h2" numberOfLines={1}>{name.trim() || 'Award name'}</Text>
                      <Text variant="small" color="muted" numberOfLines={2}>{description.trim() || 'What it’s for'}</Text>
                    </View>
                  </View>
                  <Input label="Name" value={name} onChangeText={setName} maxLength={40} autoCapitalize="words" placeholder="Iron Streak" />
                  <Input label="What it's for" value={description} onChangeText={setDescription} maxLength={140} placeholder="Thirty days in a row at the rec." />
                  <Text variant="eyebrow" color="muted">Icon</Text>
                  <View style={styles.grid}>
                    {AWARD_ICONS.map(n => (
                      <Pressable key={n} onPress={() => setIcon(n)} accessibilityRole="radio" accessibilityState={{ checked: icon === n }} accessibilityLabel={n.replace(/-/g, ' ')}
                        style={[styles.iconCell, icon === n && styles.iconCellOn]}>
                        <MaterialCommunityIcons name={n} size={24} color={colors[icon === n ? 'onBoard' : 'inkSoft']} />
                      </Pressable>
                    ))}
                  </View>
                  <Text variant="eyebrow" color="muted">Color</Text>
                  <View style={styles.tones}>
                    {(Object.keys(TONES) as AwardTone[]).map(t => (
                      <Pressable key={t} onPress={() => setTone(t)} accessibilityRole="radio" accessibilityState={{ checked: tone === t }} accessibilityLabel={TONES[t].label}
                        style={[styles.tone, { backgroundColor: colors[TONES[t].bg] }, tone === t && styles.toneOn]}>
                        <MaterialCommunityIcons name={icon as IconName} size={18} color={colors[TONES[t].fg]} />
                        <Text variant="smallStrong" color={TONES[t].fg}>{TONES[t].label}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              ) : null}

              {picked ? (
                <Input label="Note (optional)" value={note} onChangeText={setNote} maxLength={140} placeholder={`Why ${student.firstName} earned it`} />
              ) : null}
            </ScrollView>
          </KeyboardFrame>
          <View style={styles.footer}>
            <Button label={`Give to ${student.firstName}`} icon="ribbon-outline" block disabled={!ready} onPress={give} />
          </View>
        </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1, gap: space.xxs },
  shrink: { flexShrink: 1 },
  disc: { alignItems: 'center', justifyContent: 'center' },
  mark: { flexDirection: 'row', alignItems: 'center', gap: space.xs, flexShrink: 1 },
  list: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line },
  tile: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg },
  tileRule: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
  pressed: { backgroundColor: colors.sunken },
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md, paddingHorizontal: gutter, minHeight: minTouch + space.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  barSide: { minWidth: space.x5 + space.lg },
  form: { paddingHorizontal: gutter, paddingTop: space.xl, paddingBottom: space.x4, gap: space.xxl },
  field: { gap: space.sm },
  option: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, minHeight: minTouch + space.lg, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
  optionOn: { borderColor: colors.ink, borderWidth: 2, padding: space.md - 1 },
  dim: { opacity: 0.5 },
  preview: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  iconCell: { width: minTouch, height: minTouch, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.sunken },
  iconCellOn: { backgroundColor: colors.ink },
  tones: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  tone: { flexDirection: 'row', alignItems: 'center', gap: space.xs, paddingHorizontal: space.md, minHeight: minTouch, borderRadius: radius.md, borderWidth: 2, borderColor: 'transparent' },
  toneOn: { borderColor: colors.ink },
  footer: { paddingHorizontal: gutter, paddingTop: space.md, paddingBottom: space.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line, backgroundColor: colors.bg },
});
