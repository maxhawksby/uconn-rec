import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View, ViewStyle } from 'react-native';
import { colors, hitSlop, minTouch, radius, space, Palette } from '../theme';
import { Chip, Icon, Text } from '../ui';
import type { Activity } from '../data/activities';

// Small building blocks shared by the Record loggers.

/** Current time, re-read every `ms` while `active`. Drives live clocks without global state. */
export function useNow(active = true, ms = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [active, ms]);
  return now;
}

export function IconButton({ icon, label, onPress, color = 'ink', style, disabled }: { icon: string; label: string; onPress: () => void; color?: keyof Palette; style?: ViewStyle; disabled?: boolean }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} disabled={disabled} hitSlop={hitSlop}
      style={({ pressed }) => [styles.iconButton, pressed && styles.iconPressed, disabled && styles.disabled, style]}>
      <Icon name={icon} size={22} color={color} />
    </Pressable>
  );
}

/** Top bar for an in-progress workout: discard on the left, the main action on the right. */
export function LoggerHeader({ eyebrow, title, onClose, closeLabel = 'Discard workout', right }: { eyebrow: string; title: string; onClose: () => void; closeLabel?: string; right?: React.ReactNode }) {
  return (
    <View style={styles.header}>
      <IconButton icon="close" label={closeLabel} onPress={onClose} />
      <View style={styles.headerText}>
        <Text variant="eyebrow" color="accentText">{eyebrow}</Text>
        <Text variant="h2" numberOfLines={1}>{title}</Text>
      </View>
      {right}
    </View>
  );
}

export function SectionLabel({ children, right }: { children: string; right?: React.ReactNode }) {
  return (
    <View style={styles.sectionRow}>
      <Text variant="eyebrow" color="muted">{children}</Text>
      {right}
    </View>
  );
}

const PRESETS = [30, 45, 60, 90];

/** Minutes picker: presets plus a fine stepper with a big condensed readout. */
export function DurationPicker({ minutes, onChange }: { minutes: number; onChange: (m: number) => void }) {
  const set = (m: number) => onChange(Math.min(600, Math.max(5, m)));
  return (
    <View style={styles.duration}>
      <View style={styles.stepper}>
        <StepButton icon="remove" label="5 minutes less" onPress={() => set(minutes - 5)} disabled={minutes <= 5} />
        <View style={styles.readout} accessible accessibilityLabel={`${minutes} minutes`}>
          <Text variant="hero">{minutes}</Text>
          <Text variant="eyebrow" color="muted">minutes</Text>
        </View>
        <StepButton icon="add" label="5 minutes more" onPress={() => set(minutes + 5)} disabled={minutes >= 600} />
      </View>
      <View style={styles.chips}>
        {PRESETS.map(m => <Chip key={m} label={m < 60 ? `${m} min` : m === 60 ? '1 hr' : `${m / 60} hr`} selected={minutes === m} onPress={() => set(m)} />)}
      </View>
    </View>
  );
}

function StepButton({ icon, label, onPress, disabled }: { icon: string; label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} disabled={disabled}
      style={({ pressed }) => [styles.step, pressed && styles.iconPressed, disabled && styles.disabled]}>
      <Icon name={icon} size={24} />
    </Pressable>
  );
}

/** Wrapping chip grid of activities. */
export function ActivityPicker({ activities, selected, onSelect }: { activities: Activity[]; selected: string | null; onSelect: (id: string) => void }) {
  return (
    <View style={styles.chips}>
      {activities.map(a => <Chip key={a.id} label={a.name} icon={a.icon} selected={selected === a.id} onPress={() => onSelect(a.id)} />)}
    </View>
  );
}

const styles = StyleSheet.create({
  iconButton: { width: minTouch, height: minTouch, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  iconPressed: { backgroundColor: colors.sunken },
  disabled: { opacity: 0.35 },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.md, paddingTop: space.sm, paddingBottom: space.md },
  headerText: { flex: 1, gap: space.xxs },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: space.xxl, marginBottom: space.md },
  duration: { gap: space.lg },
  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line, padding: space.md },
  readout: { alignItems: 'center' },
  step: { width: minTouch + 8, height: minTouch + 8, borderRadius: radius.md, backgroundColor: colors.sunken, alignItems: 'center', justifyContent: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
});
