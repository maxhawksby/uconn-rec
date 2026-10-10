import React, { useEffect, useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { CLASS_YEARS, type ClassYear, type Student } from '../data/types';
import { ACTIVITIES, CATEGORIES, CATEGORY_LABEL } from '../data/activities';
import { colors, gutter, hitSlop, minTouch, space } from '../theme';
import { Chip, Input, KeyboardFrame, Text, attempt } from '../ui';
import { useStore } from '../data/store';

const BIO_MAX = 160;
const NAME_MAX = 40;

type Props = { visible: boolean; me: Student; onClose: () => void };

/** Page sheet for editing your own profile. Saves through actions.updateProfile. */
export function EditProfileSheet({ visible, me, onClose }: Props) {
  const { actions } = useStore();
  const [first, setFirst] = useState(me.firstName);
  const [last, setLast] = useState(me.lastName);
  const [year, setYear] = useState<ClassYear>(me.classYear);
  const [bio, setBio] = useState(me.bio ?? '');
  const [interests, setInterests] = useState<string[]>(me.interests);
  const [submitted, setSubmitted] = useState(false);

  // Each opening starts from the saved profile, so a cancelled edit never lingers.
  useEffect(() => {
    if (!visible) return;
    setFirst(me.firstName); setLast(me.lastName); setYear(me.classYear); setBio(me.bio ?? ''); setInterests(me.interests); setSubmitted(false);
  }, [visible, me]);

  const firstError = !first.trim() ? 'Add your first name.' : undefined;
  const lastError = !last.trim() ? 'Add your last name.' : undefined;
  const toggle = (id: string) => setInterests(cur => (cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id]));

  function save() {
    setSubmitted(true);
    if (firstError || lastError) return;
    const res = attempt(() => actions.updateProfile({ firstName: first.trim(), lastName: last.trim(), classYear: year, bio: bio.trim(), interests }), "Couldn't save");
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
            <Text variant="h2" accessibilityRole="header">Edit profile</Text>
            <Pressable onPress={save} hitSlop={hitSlop} accessibilityRole="button" style={[styles.barSide, styles.barRight]}>
              <Text variant="bodyStrong" color="accent">Save</Text>
            </Pressable>
          </View>
          <KeyboardFrame>
            <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive">
              <View style={styles.row}>
                <View style={styles.flex}>
                  <Input label="First name" value={first} onChangeText={setFirst} maxLength={NAME_MAX} autoCapitalize="words" textContentType="givenName" error={submitted ? firstError : undefined} />
                </View>
                <View style={styles.flex}>
                  <Input label="Last name" value={last} onChangeText={setLast} maxLength={NAME_MAX} autoCapitalize="words" textContentType="familyName" error={submitted ? lastError : undefined} />
                </View>
              </View>

              <View style={styles.field}>
                <Text variant="eyebrow" color="muted">Class year</Text>
                <View style={styles.chips}>
                  {CLASS_YEARS.map(y => <Chip key={y} label={y} selected={year === y} onPress={() => setYear(y)} />)}
                </View>
              </View>

              <View style={styles.field}>
                <Input label="Bio" value={bio} onChangeText={setBio} maxLength={BIO_MAX} multiline placeholder="What are you training for?"
                  style={styles.multiline} textAlignVertical="top" />
                <Text variant="tiny" color="faint" style={styles.counter}>{bio.length}/{BIO_MAX}</Text>
              </View>

              <View style={styles.field}>
                <Text variant="eyebrow" color="muted">Interests · {interests.length} picked</Text>
                <Text variant="small" color="muted">We use these to suggest people, groups and meetups.</Text>
                {CATEGORIES.map(c => (
                  <View key={c} style={styles.category}>
                    <Text variant="smallStrong" color="inkSoft">{CATEGORY_LABEL[c]}</Text>
                    <View style={styles.chips}>
                      {ACTIVITIES.filter(a => a.category === c).map(a => (
                        <Chip key={a.id} label={a.name} selected={interests.includes(a.id)} onPress={() => toggle(a.id)} />
                      ))}
                    </View>
                  </View>
                ))}
              </View>
            </ScrollView>
          </KeyboardFrame>
        </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: gutter, minHeight: minTouch + space.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  barSide: { minWidth: space.x5 + space.lg },
  barRight: { alignItems: 'flex-end' },
  form: { paddingHorizontal: gutter, paddingTop: space.xl, paddingBottom: space.x4, gap: space.xxl },
  row: { flexDirection: 'row', gap: space.md },
  field: { gap: space.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  category: { gap: space.sm, marginTop: space.sm },
  counter: { alignSelf: 'flex-end' },
  multiline: { minHeight: space.x5 + space.x3, paddingTop: space.md },
});
