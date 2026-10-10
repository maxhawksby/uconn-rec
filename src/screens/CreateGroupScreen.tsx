import React, { useLayoutEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { RootScreenProps } from '../navigation/types';
import type { GroupKind } from '../data/types';
import { useMe, useStore } from '../data/store';
import { groupsForSchool } from '../data/selectors';
import { Button, Icon, Input, Screen, Text, attempt } from '../ui';
import { colors, gutter, hitSlop, radius, space } from '../theme';
import { DESCRIPTION_MAX, GROUP_KINDS, NAME_MAX, validateGroup } from '../groups/model';
import { KeyboardFrame } from '../groups/chat';

export function CreateGroupScreen({ navigation }: RootScreenProps<'CreateGroup'>) {
  const { state, actions } = useStore();
  const me = useMe();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [kind, setKind] = useState<GroupKind | null>(null);
  const [description, setDescription] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <Pressable onPress={() => navigation.goBack()} hitSlop={hitSlop} accessibilityRole="button">
          <Text variant="bodyStrong" color="inkSoft">Cancel</Text>
        </Pressable>
      ),
    });
  }, [navigation]);

  const errors = validateGroup({ name, description }, groupsForSchool(state, me.schoolId).map(g => g.name));
  const kindError = !kind ? 'Pick what kind of group this is.' : undefined;
  const show = (e?: string) => (submitted ? e : undefined);

  function create() {
    setSubmitted(true);
    if (errors.name || errors.description || !kind) return;
    const res = attempt(() => actions.createGroup({ name: name.trim(), kind, description: description.trim() }), "Couldn't create the group");
    if (!res.ok) return;
    navigation.goBack();
    navigation.navigate('GroupDetail', { groupId: res.value.groupId });
  }

  return (
    <Screen scroll={false} edges={[]}>
      <KeyboardFrame>
        <ScrollView style={styles.flex} contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive">
          <Text variant="small" color="muted">Groups are open to everyone at your school. You'll be the founder and first member.</Text>

          <View style={styles.field}>
            <Input label="Name" value={name} onChangeText={setName} placeholder="e.g. 6AM Lift Club" maxLength={NAME_MAX}
              autoCapitalize="words" returnKeyType="done"
              error={show(errors.name)} />
            <Text variant="tiny" color="faint" style={styles.counter}>{name.trim().length}/{NAME_MAX}</Text>
          </View>

          <View style={styles.field}>
            <Text variant="eyebrow" color="muted">Kind</Text>
            <View style={styles.kinds} accessibilityRole="radiogroup">
              {GROUP_KINDS.map(k => {
                const on = kind === k.kind;
                return (
                  <Pressable key={k.kind} onPress={() => setKind(k.kind)} accessibilityRole="radio" accessibilityState={{ checked: on }}
                    accessibilityLabel={`${k.label}: ${k.hint}`}
                    style={({ pressed }) => [styles.kind, on && styles.kindOn, pressed && !on && styles.kindPressed]}>
                    <Icon name={k.icon} size={22} color={on ? 'onBoard' : 'ink'} />
                    <Text variant="bodyStrong" color={on ? 'onBoard' : 'ink'}>{k.label}</Text>
                    <Text variant="tiny" color={on ? 'onBoardMuted' : 'muted'}>{k.hint}</Text>
                  </Pressable>
                );
              })}
            </View>
            {show(kindError) ? <Text variant="small" color="danger">{kindError}</Text> : null}
          </View>

          <View style={styles.field}>
            <Input label="Description (optional)" value={description} onChangeText={setDescription}
              placeholder="When you meet, who it's for, what to bring" multiline maxLength={DESCRIPTION_MAX}
              style={styles.multiline} textAlignVertical="top" error={show(errors.description)} />
            <Text variant="tiny" color="faint" style={styles.counter}>{description.length}/{DESCRIPTION_MAX}</Text>
          </View>
        </ScrollView>
        <View style={[styles.footer, { paddingBottom: insets.bottom + space.md }]}>
          <Button label="Create group" block onPress={create} />
        </View>
      </KeyboardFrame>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  form: { paddingHorizontal: gutter, paddingTop: space.lg, paddingBottom: space.x4, gap: space.xxl },
  field: { gap: space.sm },
  counter: { alignSelf: 'flex-end' },
  kinds: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  kind: { flexBasis: '48%', flexGrow: 1, gap: space.xxs, padding: space.md, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line },
  kindOn: { backgroundColor: colors.board, borderColor: colors.board },
  kindPressed: { backgroundColor: colors.sunken },
  multiline: { minHeight: space.x5 + space.x4, paddingTop: space.md },
  footer: { paddingHorizontal: gutter, paddingTop: space.md, backgroundColor: colors.bg, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
});
