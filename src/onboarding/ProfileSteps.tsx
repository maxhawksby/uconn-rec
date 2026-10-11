import React, { useMemo, useRef } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { colors, radius, space } from '../theme';
import { Avatar, Button, Card, Chip, EmptyState, Input, SchoolBadge, Text } from '../ui';
import { CLASS_YEARS, ClassYear, Group, School, Student } from '../data/types';
import { ACTIVITIES, CATEGORIES, CATEGORY_LABEL, activityName } from '../data/activities';
import { SectionLabel, StepFrame } from './parts';

type Progress = { index: number; total: number };

// ---------- Name and class year ----------

type ProfileProps = {
  school: School;
  first: string;
  last: string;
  year: ClassYear | null;
  onChange: (patch: { first?: string; last?: string; year?: ClassYear }) => void;
  progress: Progress;
  onBack: () => void;
  onNext: () => void;
};

export function ProfileStep({ school, first, last, year, onChange, progress, onBack, onNext }: ProfileProps) {
  const lastRef = useRef<TextInput>(null);
  const ready = !!first.trim() && !!last.trim() && !!year;
  const preview = { id: `${first}${last}` || 'you', firstName: first.trim() || '?', lastName: last.trim() };
  const missing = !first.trim() ? 'Add your first name' : !last.trim() ? 'Add your last name' : !year ? 'Pick your class year' : 'Next';

  return (
    <StepFrame
      progress={progress}
      onBack={onBack}
      eyebrow="Verified student"
      title="Put your name on the board"
      lede="Friends find you by name. Your email stays private."
      footer={<Button label={missing} onPress={onNext} disabled={!ready} block />}>
      <Card key="preview" style={styles.preview}>
        <Avatar student={preview} size={52} />
        <View style={styles.previewText}>
          <Text variant="h2" numberOfLines={1} color={first || last ? 'ink' : 'faint'}>
            {first || last ? `${first.trim()} ${last.trim()}`.trim() : 'Your name'}
          </Text>
          <View style={styles.previewMeta}>
            <SchoolBadge schoolId={school.id} />
            {year ? <Text variant="small" color="muted">{year}</Text> : null}
          </View>
        </View>
      </Card>
      <View key="names" style={styles.fields}>
        <Input
          label="First name"
          value={first}
          onChangeText={t => onChange({ first: t })}
          autoFocus
          autoCapitalize="words"
          autoComplete="name-given"
          textContentType="givenName"
          returnKeyType="next"
          maxLength={40}
          submitBehavior="submit"
          onSubmitEditing={() => lastRef.current?.focus()}
        />
        <Input
          ref={lastRef}
          label="Last name"
          value={last}
          onChangeText={t => onChange({ last: t })}
          autoCapitalize="words"
          autoComplete="name-family"
          textContentType="familyName"
          returnKeyType="done"
          maxLength={40}
        />
      </View>
      <View key="year" style={styles.fields}>
        <SectionLabel>Class year</SectionLabel>
        <View style={styles.wrap} accessibilityRole="radiogroup">
          {CLASS_YEARS.map(y => <Chip key={y} label={y} selected={year === y} onPress={() => onChange({ year: y })} />)}
        </View>
      </View>
    </StepFrame>
  );
}

// ---------- Interests ----------

type InterestProps = { picked: string[]; onToggle: (id: string) => void; progress: Progress; onBack: () => void; onNext: () => void };

export function InterestsStep({ picked, onToggle, progress, onBack, onNext }: InterestProps) {
  const groups = useMemo(() => CATEGORIES.map(c => ({ c, items: ACTIVITIES.filter(a => a.category === c) })), []);
  return (
    <StepFrame
      progress={progress}
      onBack={onBack}
      eyebrow={picked.length ? `${picked.length} picked` : 'Pick at least one'}
      title="What do you do?"
      lede="Pick everything you'd log. We use it to suggest people, crews and meetups."
      footer={<Button label={picked.length ? `Next · ${picked.length} picked` : 'Pick at least one'} onPress={onNext} disabled={!picked.length} block />}>
      {groups.map(({ c, items }) => {
        const n = items.filter(a => picked.includes(a.id)).length;
        return (
          <View key={c} style={styles.fields}>
            <SectionLabel right={n ? `${n} picked` : undefined}>{CATEGORY_LABEL[c]}</SectionLabel>
            <View style={styles.wrap}>
              {items.map(a => <Chip key={a.id} label={a.name} icon={a.icon} selected={picked.includes(a.id)} onPress={() => onToggle(a.id)} />)}
            </View>
          </View>
        );
      })}
    </StepFrame>
  );
}

// ---------- Suggested people and groups ----------

type PeopleProps = {
  school: School;
  people: { student: Student; shared: string[] }[];
  groups: Group[];
  following: string[];
  joined: string[];
  onToggleFollow: (id: string) => void;
  onToggleJoin: (id: string) => void;
  progress: Progress;
  onBack: () => void;
  onFinish: () => void;
  busy?: boolean;
};

const GROUP_KIND: Record<Group['kind'], string> = { dorm: 'Dorm', club: 'Club', team: 'Team', major: 'Major', crew: 'Crew' };

export function PeopleStep({ school, people, groups, following, joined, onToggleFollow, onToggleJoin, progress, onBack, onFinish, busy }: PeopleProps) {
  const picks = following.length + joined.length;
  return (
    <StepFrame
      progress={progress}
      onBack={onBack}
      eyebrow="Optional"
      title="Find your crew"
      lede="Follow a few people so your feed isn't empty. You can always do this later."
      footer={<Button label={picks ? "Enter Valence" : "Skip and enter Valence"} icon={picks ? 'arrow-forward' : undefined} onPress={onFinish} loading={busy} block />}>
      {people.length === 0 && groups.length === 0 ? (
        <EmptyState key="empty" icon="people-outline" title="You're one of the first" body={`Nobody else from ${school.shortName} is here yet. Post a workout and invite your friends.`} />
      ) : null}
      {people.length ? (
        <View key="people" style={styles.fields}>
          <SectionLabel right={`${people.length} suggested`}>{`People at ${school.shortName}`}</SectionLabel>
          <View style={styles.list}>
            {people.map(({ student, shared }, i) => {
              const on = following.includes(student.id);
              return (
                <View key={student.id} style={[styles.row, i === people.length - 1 && styles.rowLast]}>
                  <Avatar student={student} size={40} />
                  <View style={styles.rowText}>
                    <Text variant="bodyStrong" numberOfLines={1}>{student.firstName} {student.lastName}</Text>
                    <Text variant="small" color="muted" numberOfLines={1}>
                      {shared.length ? `${student.classYear} · ${shared.slice(0, 2).map(activityName).join(', ')}` : student.classYear}
                    </Text>
                  </View>
                  <Button label={on ? 'Following' : 'Follow'} icon={on ? 'checkmark' : undefined} size="sm" variant={on ? 'ghost' : 'secondary'}
                    onPress={() => onToggleFollow(student.id)} accessibilityHint={`${on ? 'Unfollow' : 'Follow'} ${student.firstName}`} />
                </View>
              );
            })}
          </View>
        </View>
      ) : null}
      {groups.length ? (
        <View key="groups" style={styles.fields}>
          <SectionLabel>Groups</SectionLabel>
          <View style={styles.list}>
            {groups.map((g, i) => {
              const on = joined.includes(g.id);
              return (
                <View key={g.id} style={[styles.row, i === groups.length - 1 && styles.rowLast]}>
                  <View style={styles.rowText}>
                    <Text variant="bodyStrong" numberOfLines={1}>{g.name}</Text>
                    <Text variant="small" color="muted" numberOfLines={1}>{GROUP_KIND[g.kind]} · {g.memberIds.length} members</Text>
                  </View>
                  <Button label={on ? 'Joined' : 'Join'} icon={on ? 'checkmark' : undefined} size="sm" variant={on ? 'ghost' : 'secondary'}
                    onPress={() => onToggleJoin(g.id)} accessibilityHint={`${on ? 'Leave' : 'Join'} ${g.name}`} />
                </View>
              );
            })}
          </View>
        </View>
      ) : null}
    </StepFrame>
  );
}

const styles = StyleSheet.create({
  preview: { flexDirection: 'row', alignItems: 'center', gap: space.lg },
  previewText: { flex: 1, gap: space.xs },
  previewMeta: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  fields: { gap: space.md },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  list: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingVertical: space.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  rowLast: { borderBottomWidth: 0 },
  rowText: { flex: 1, gap: space.xxs },
});
