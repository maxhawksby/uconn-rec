import React, { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors, radius, space } from '../theme';
import { Button, EmptyState, Icon, Input, Text } from '../ui';
import type { School } from '../data/types';
import { SCHOOLS } from '../data/schools';
import { fuzzySearchSchools } from './logic';
import { SectionLabel, StepFrame } from './parts';

const LIMIT = 30;

type Props = {
  selected: School | null;
  query: string;
  onQuery: (q: string) => void;
  progress: { index: number; total: number };
  onBack: () => void;
  onPick: (school: School) => void;
  onNext: () => void;
};

export function SchoolStep({ selected, query, onQuery, progress, onBack, onPick, onNext }: Props) {
  const results = useMemo(() => fuzzySearchSchools(query, SCHOOLS, LIMIT), [query]);
  const searching = query.trim().length > 0;
  const pilot = searching ? [] : results.filter(s => s.isPilot);
  const rest = searching ? results : results.filter(s => !s.isPilot);

  return (
    <StepFrame
      progress={progress}
      onBack={onBack}
      eyebrow="Your school"
      title="Find your campus"
      lede="Search by name, city or email domain."
      footer={<Button label={selected ? `Continue with ${selected.shortName}` : 'Pick your school'} onPress={onNext} disabled={!selected} block />}>
      <Input
        key="search"
        value={query}
        onChangeText={onQuery}
        placeholder="UConn, Storrs, or uconn.edu"
        autoCorrect={false}
        autoCapitalize="none"
        returnKeyType="search"
        clearButtonMode="while-editing"
        accessibilityLabel="Search schools"
        onSubmitEditing={() => { if (results.length === 1) onPick(results[0]); }}
      />
      {results.length === 0 ? (
        <EmptyState
          key="empty"
          icon="search-outline"
          title="No school found"
          body={`Nothing matches "${query.trim()}". Try the short name (UMass), the city, or the part after the @ in your school email.`}
        />
      ) : (
        <View key="lists" style={styles.lists}>
          {pilot.length ? (
            <View style={styles.group}>
              <SectionLabel>Open now</SectionLabel>
              <View style={styles.list}>{pilot.map((s, i) => <SchoolRow key={s.id} last={i === pilot.length - 1} school={s} selected={selected?.id === s.id} onPress={() => onPick(s)} />)}</View>
            </View>
          ) : null}
          <View style={styles.group}>
            <SectionLabel right={searching ? `${results.length}${results.length === LIMIT ? '+' : ''} found` : `${SCHOOLS.length - 1} schools`}>
              {searching ? 'Results' : 'Joining the waitlist'}
            </SectionLabel>
            <View style={styles.list}>
              {rest.map((s, i) => <SchoolRow key={s.id} last={i === rest.length - 1} school={s} selected={selected?.id === s.id} onPress={() => onPick(s)} />)}
            </View>
            {!searching ? <Text variant="small" color="muted">Don't see yours? Keep typing to search all {SCHOOLS.length}.</Text> : null}
          </View>
        </View>
      )}
    </StepFrame>
  );
}

function SchoolRow({ school, selected, last, onPress }: { school: School; selected: boolean; last: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`${school.name}, ${school.city}, ${school.state}. ${school.isPilot ? 'Open now' : 'Waitlist'}`}
      style={({ pressed }) => [styles.row, last && styles.rowLast, pressed && styles.rowPressed, selected && styles.rowSelected]}>
      <View style={styles.rowText}>
        <Text variant="bodyStrong" numberOfLines={1}>{school.name}</Text>
        <Text variant="small" color="muted" numberOfLines={1}>{school.city}, {school.state} · {school.emailDomains[0]}</Text>
      </View>
      {selected ? <Icon name="checkmark-circle" size={22} color="ink" /> : (
        <View style={[styles.tag, school.isPilot ? styles.tagOpen : styles.tagWait]}>
          {school.isPilot ? <View style={styles.dot} /> : null}
          <Text variant="statLabel" color={school.isPilot ? 'turf' : 'muted'}>{school.isPilot ? 'Open' : 'Waitlist'}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  lists: { gap: space.xxl },
  group: { gap: space.sm },
  list: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingVertical: space.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line, minHeight: 60 },
  rowLast: { borderBottomWidth: 0 },
  rowPressed: { backgroundColor: colors.sunken },
  rowSelected: { backgroundColor: colors.sunken },
  rowText: { flex: 1, gap: space.xxs },
  tag: { flexDirection: 'row', alignItems: 'center', gap: space.xs, paddingHorizontal: space.sm, paddingVertical: space.xs, borderRadius: radius.sm },
  tagOpen: { backgroundColor: colors.turfSoft },
  tagWait: { backgroundColor: colors.sunken },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.turf },
});
