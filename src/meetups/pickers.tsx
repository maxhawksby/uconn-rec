import React, { useEffect, useRef, useState } from 'react';
import { LayoutChangeEvent, NativeScrollEvent, NativeSyntheticEvent, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { ACTIVITIES, ACTIVITY_BY_ID, CATEGORIES } from '../data/activities';
import type { ActivityCategory } from '../data/activities';
import { Chip, Icon, Text } from '../ui';
import { colors, fonts, gutter, hitSlop, minTouch, radius, space } from '../theme';
import { CAPACITY_MAX, CAPACITY_MIN, FILTER_LABEL, formatTime } from './logic';
import type { DayOption } from './logic';

// Form pickers for Create Meetup, built from primitives (no extra packages).

/** Category chips, then that category's activities. */
export function ActivityPicker({ value, onChange }: { value: string | null; onChange: (id: string) => void }) {
  const [category, setCategory] = useState<ActivityCategory>((value && ACTIVITY_BY_ID[value]?.category) || 'pickup');
  return (
    <View style={styles.stack}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bleed} contentContainerStyle={styles.hRow}>
        {CATEGORIES.map(c => <Chip key={c} label={FILTER_LABEL[c]} selected={c === category} onPress={() => setCategory(c)} />)}
      </ScrollView>
      <View style={styles.wrap}>
        {ACTIVITIES.filter(a => a.category === category).map(a => {
          const on = a.id === value;
          return (
            <Pressable key={a.id} accessibilityRole="radio" accessibilityState={{ selected: on }} accessibilityLabel={a.name}
              onPress={() => onChange(a.id)}
              style={({ pressed }) => [styles.activity, on ? styles.activityOn : styles.activityOff, pressed && styles.pressed]}>
              <Icon name={a.icon} size={16} color={on ? 'onBoard' : 'inkSoft'} />
              <Text variant="smallStrong" color={on ? 'onBoard' : 'ink'}>{a.name}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/** Horizontal strip that scrolls the selected item into view only when it is off screen. */
function useScrollToSelected(selectedKey: string | number | null) {
  const ref = useRef<ScrollView>(null);
  const items = useRef<Record<string, { x: number; w: number }>>({});
  const view = useRef({ offset: 0, width: 0 });
  const reveal = (key: string | number | null, animated: boolean) => {
    const item = key === null ? undefined : items.current[String(key)];
    const { offset, width } = view.current;
    if (!item || !width) return;
    if (item.x < offset + gutter || item.x + item.w > offset + width - gutter) {
      ref.current?.scrollTo({ x: Math.max(0, item.x - gutter), animated });
    }
  };
  useEffect(() => { reveal(selectedKey, true); }, [selectedKey]);
  const onItemLayout = (key: string | number) => (e: LayoutChangeEvent) => {
    const first = !items.current[String(key)];
    items.current[String(key)] = { x: e.nativeEvent.layout.x, w: e.nativeEvent.layout.width };
    if (first && key === selectedKey) reveal(key, false);
  };
  const scrollProps = {
    ref,
    scrollEventThrottle: 32,
    onScroll: (e: NativeSyntheticEvent<NativeScrollEvent>) => { view.current.offset = e.nativeEvent.contentOffset.x; },
    onLayout: (e: LayoutChangeEvent) => { view.current.width = e.nativeEvent.layout.width; reveal(selectedKey, false); },
  };
  return { scrollProps, onItemLayout };
}

type DayTimeProps = {
  days: DayOption[];
  dayOffset: number;
  onDay: (offset: number) => void;
  disabledDays: number[];
  slots: number[];
  minutes: number | null;
  onTime: (minutes: number) => void;
};

/** Day tiles for the next week, then 30-minute time slots for the chosen day. */
export function DayTimePicker({ days, dayOffset, onDay, disabledDays, slots, minutes, onTime }: DayTimeProps) {
  const dayStrip = useScrollToSelected(dayOffset);
  const timeStrip = useScrollToSelected(minutes);
  return (
    <View style={styles.stack}>
      <ScrollView {...dayStrip.scrollProps} horizontal showsHorizontalScrollIndicator={false} style={styles.bleed} contentContainerStyle={styles.hRow}>
        {days.map(d => {
          const on = d.offset === dayOffset;
          const disabled = disabledDays.includes(d.offset);
          return (
            <Pressable key={d.offset} onLayout={dayStrip.onItemLayout(d.offset)} disabled={disabled} onPress={() => onDay(d.offset)}
              accessibilityRole="radio" accessibilityState={{ selected: on, disabled }} accessibilityLabel={`${d.label}, ${d.sub}${disabled ? ', no times left' : ''}`}
              style={({ pressed }) => [styles.day, on ? styles.dayOn : styles.dayOff, disabled && styles.disabled, pressed && styles.pressed]}>
              <Text variant="statLabel" color={on ? 'onBoardMuted' : 'muted'}>{d.label}</Text>
              <Text variant="stat" color={on ? 'onBoard' : 'ink'} style={styles.dayNum}>{d.date.getDate()}</Text>
              <Text variant="tiny" color={on ? 'onBoardMuted' : 'muted'}>{d.sub.split(' ')[0]}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
      {slots.length ? (
        <ScrollView {...timeStrip.scrollProps} horizontal showsHorizontalScrollIndicator={false} style={styles.bleed} contentContainerStyle={styles.hRow}>
          {slots.map(min => {
            const on = min === minutes;
            const label = formatTime(new Date(2000, 0, 1, Math.floor(min / 60), min % 60));
            return (
              <Pressable key={min} onLayout={timeStrip.onItemLayout(min)} onPress={() => onTime(min)}
                accessibilityRole="radio" accessibilityState={{ selected: on }} accessibilityLabel={label}
                style={({ pressed }) => [styles.slot, on ? styles.activityOn : styles.activityOff, pressed && styles.pressed]}>
                <Text variant="smallStrong" color={on ? 'onBoard' : 'ink'} style={styles.slotText}>{label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : (
        <Text variant="small" color="muted">No times left today. Pick another day.</Text>
      )}
    </View>
  );
}

/** Minus / big number / plus. Capacity includes the host. */
export function CapacityStepper({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const step = (d: number) => onChange(Math.min(CAPACITY_MAX, Math.max(CAPACITY_MIN, value + d)));
  return (
    <View style={styles.stepper} accessible accessibilityRole="adjustable" accessibilityLabel="Spots" accessibilityValue={{ min: CAPACITY_MIN, max: CAPACITY_MAX, now: value }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={e => step(e.nativeEvent.actionName === 'increment' ? 1 : -1)}>
      <StepButton icon="remove" label="Fewer spots" disabled={value <= CAPACITY_MIN} onPress={() => step(-1)} />
      <View style={styles.stepValue}>
        <Text variant="stat">{value}</Text>
        <Text variant="small" color="muted">You + {value - 1} more</Text>
      </View>
      <StepButton icon="add" label="More spots" disabled={value >= CAPACITY_MAX} onPress={() => step(1)} />
    </View>
  );
}

function StepButton({ icon, label, disabled, onPress }: { icon: string; label: string; disabled: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={onPress} hitSlop={hitSlop}
      style={({ pressed }) => [styles.stepButton, disabled && styles.disabled, pressed && styles.stepPressed]}>
      <Icon name={icon} size={22} color="ink" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  stack: { gap: space.md },
  bleed: { marginHorizontal: -gutter },
  hRow: { gap: space.sm, paddingHorizontal: gutter },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  activity: { flexDirection: 'row', alignItems: 'center', gap: space.xs, paddingHorizontal: space.md, minHeight: minTouch - 4, borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth },
  activityOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  activityOff: { backgroundColor: colors.surface, borderColor: colors.line },
  pressed: { opacity: 0.8 },
  disabled: { opacity: 0.4 },

  day: { width: 80, alignItems: 'center', paddingVertical: space.sm, borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, gap: space.xxs },
  dayOn: { backgroundColor: colors.board, borderColor: colors.board },
  dayOff: { backgroundColor: colors.surface, borderColor: colors.line },
  dayNum: { fontSize: 26, lineHeight: 28 },
  slot: { justifyContent: 'center', paddingHorizontal: space.md, minHeight: minTouch - 4, borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth },
  slotText: { fontFamily: fonts.bodyBold },

  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line, padding: space.sm },
  stepButton: { width: minTouch + 4, height: minTouch + 4, borderRadius: radius.md, backgroundColor: colors.sunken, alignItems: 'center', justifyContent: 'center' },
  stepPressed: { backgroundColor: colors.line },
  stepValue: { alignItems: 'center', gap: space.xxs },
});
