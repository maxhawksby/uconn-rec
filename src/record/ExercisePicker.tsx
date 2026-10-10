import React, { useMemo, useState } from 'react';
import { Modal, Pressable, SectionList, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { colors, gutter, minTouch, radius, space, type } from '../theme';
import { Icon, Text } from '../ui';
import { EXERCISES, MUSCLE_GROUPS, exerciseKey, findExercise, searchExercises } from './exercises';
import { IconButton } from './parts';

type Row = { name: string; group: string; isNew?: boolean };
type Section = { title: string; data: Row[] };

type Props = {
  visible: boolean;
  onClose: () => void;
  onPick: (name: string) => void;
  /** Exercises already in this session. */
  taken: string[];
  /** The student's own exercise names, most recent first. */
  recent: string[];
};

/** Searchable exercise list. Recent lifts first; any typed name can be added as custom. */
export function ExercisePicker({ visible, onClose, onPick, taken, recent }: Props) {
  const [query, setQuery] = useState('');
  const takenKeys = useMemo(() => new Set(taken.map(exerciseKey)), [taken]);

  const sections = useMemo<Section[]>(() => {
    const q = query.trim();
    const toRow = (name: string): Row => ({ name, group: findExercise(name)?.group ?? 'Custom' });
    if (!q) {
      const out: Section[] = [];
      if (recent.length) out.push({ title: 'Your recent lifts', data: recent.slice(0, 8).map(toRow) });
      for (const g of MUSCLE_GROUPS) out.push({ title: g, data: EXERCISES.filter(e => e.group === g).map(e => ({ name: e.name, group: e.group })) });
      return out;
    }
    const hits = searchExercises(q, recent).map(e => toRow(e.name));
    const exact = hits.some(h => exerciseKey(h.name) === exerciseKey(q));
    const custom: Row[] = exact || q.length > 60 ? [] : [{ name: q.replace(/\s+/g, ' '), group: 'Custom exercise', isNew: true }];
    return [{ title: hits.length ? `${hits.length} match${hits.length === 1 ? '' : 'es'}` : 'No matches', data: [...hits, ...custom] }];
  }, [query, recent]);

  function pick(name: string) {
    onPick(name);
    setQuery('');
  }

  function close() {
    setQuery('');
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={close}>
      <SafeAreaProvider>
        <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
          <View style={styles.header}>
            <Text variant="title" style={styles.flex}>Add exercise</Text>
            <IconButton icon="close" label="Close" onPress={close} />
          </View>
          <View style={styles.search}>
            <Icon name="search" size={18} color="muted" />
            <TextInput
              value={query} onChangeText={setQuery} autoFocus placeholder="Search or type a new one" placeholderTextColor={colors.faint}
              style={styles.searchInput} autoCorrect={false} returnKeyType="done" clearButtonMode="while-editing"
              accessibilityLabel="Search exercises"
              onSubmitEditing={() => { const first = sections[0]?.data[0]; if (query.trim() && first && !takenKeys.has(exerciseKey(first.name))) pick(first.name); }}
            />
          </View>
          <SectionList
            sections={sections}
            keyExtractor={(r, i) => `${r.name}-${i}`}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            stickySectionHeadersEnabled={false}
            contentContainerStyle={styles.list}
            renderSectionHeader={({ section }) => <Text variant="eyebrow" color="muted" style={styles.sectionTitle}>{section.title}</Text>}
            renderItem={({ item }) => {
              const added = !item.isNew && takenKeys.has(exerciseKey(item.name));
              return (
                <Pressable
                  accessibilityRole="button" accessibilityLabel={item.isNew ? `Add custom exercise ${item.name}` : `${item.name}${added ? ', already added' : ''}`}
                  disabled={added} onPress={() => pick(item.name)}
                  style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
                  <View style={styles.flex}>
                    <Text variant="bodyStrong" color={added ? 'faint' : 'ink'}>{item.isNew ? `Add "${item.name}"` : item.name}</Text>
                    <Text variant="tiny" color="muted">{added ? 'In this workout' : item.group}</Text>
                  </View>
                  <Icon name={added ? 'checkmark' : item.isNew ? 'create-outline' : 'add'} size={20} color={added ? 'turf' : 'inkSoft'} />
                </Pressable>
              );
            }}
            ListEmptyComponent={null}
          />
        </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingLeft: gutter, paddingRight: space.md, paddingTop: space.lg, paddingBottom: space.md },
  search: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginHorizontal: gutter, paddingHorizontal: space.md, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, minHeight: minTouch + 4 },
  searchInput: { ...type.body, flex: 1, color: colors.ink, minHeight: minTouch + 4 },
  list: { paddingHorizontal: gutter, paddingBottom: space.x4 },
  sectionTitle: { marginTop: space.xl, marginBottom: space.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: minTouch + 12, paddingVertical: space.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  pressed: { backgroundColor: colors.sunken },
});
