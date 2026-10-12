import React, { useEffect, useState } from 'react';
import { Keyboard, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Student } from '../data/types';
import { colors, minTouch, radius, space, type } from '../theme';
import { Avatar, Button, Icon, Text } from '../ui';
import { clockTime, type ChatRow } from './model';
import { NameMark } from '../profile/awards';

const AVATAR = 28;
const MESSAGE_MAX = 1000;
const INPUT_MAX_HEIGHT = 120; // about five lines, then the composer scrolls

/** True while the software keyboard is up. iOS gets the "will" events so layout moves with it. */
export function useKeyboardShown() {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const ios = Platform.OS === 'ios';
    const show = Keyboard.addListener(ios ? 'keyboardWillShow' : 'keyboardDidShow', () => setShown(true));
    const hide = Keyboard.addListener(ios ? 'keyboardWillHide' : 'keyboardDidHide', () => setShown(false));
    return () => { show.remove(); hide.remove(); };
  }, []);
  return shown;
}

export function DaySeparator({ label }: { label: string }) {
  return (
    <View style={styles.day} accessibilityRole="header">
      <View style={styles.rule} />
      <Text variant="eyebrow" color="faint">{label}</Text>
      <View style={styles.rule} />
    </View>
  );
}

type BubbleProps = { row: Extract<ChatRow, { type: 'message' }>; author?: Student; onPressAuthor?: () => void };

export function MessageBubble({ row, author, onPressAuthor }: BubbleProps) {
  const { message, mine, firstInRun, lastInRun } = row;
  const name = author ? `${author.firstName} ${author.lastName}` : 'Former member';
  return (
    <View style={[styles.msgRow, mine && styles.msgRowMine, !lastInRun && styles.tight]}
      accessible accessibilityLabel={`${mine ? 'You' : name}: ${message.body}. ${clockTime(message.at)}`}>
      {!mine ? (
        <View style={styles.avatarSlot}>
          {lastInRun && author ? (
            <Pressable onPress={onPressAuthor} accessibilityRole="button" accessibilityLabel={`Open ${name}'s profile`}>
              <Avatar student={author} size={AVATAR} />
            </Pressable>
          ) : null}
        </View>
      ) : null}
      <View style={[styles.msgCol, mine && styles.msgColMine]}>
        {!mine && firstInRun ? (
          <View style={styles.name}>
            {author ? <NameMark student={author} label={author.firstName} variant="tiny" color="muted" /> : <Text variant="tiny" color="muted">{name}</Text>}
          </View>
        ) : null}
        <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs,
          mine ? (lastInRun ? styles.tailMine : null) : (lastInRun ? styles.tailTheirs : null)]}>
          <Text variant="body" color={mine ? 'onBoard' : 'ink'}>{message.body}</Text>
        </View>
        {lastInRun ? <Text variant="tiny" color="faint" style={styles.time}>{clockTime(message.at)}</Text> : null}
      </View>
    </View>
  );
}

/** Fixed composer: grows to a few lines, sends on the button, respects the home indicator. */
export function Composer({ onSend, placeholder }: { onSend: (body: string) => boolean; placeholder: string }) {
  const [body, setBody] = useState('');
  const keyboard = useKeyboardShown();
  const insets = useSafeAreaInsets();
  const canSend = body.trim().length > 0;
  const send = () => { if (canSend && onSend(body)) setBody(''); };
  return (
    <View style={[styles.composer, { paddingBottom: (keyboard ? 0 : insets.bottom) + space.sm }]}>
      <TextInput value={body} onChangeText={setBody} placeholder={placeholder} placeholderTextColor={colors.faint}
        multiline maxLength={MESSAGE_MAX} style={styles.input} accessibilityLabel="Message" />
      <Pressable accessibilityRole="button" accessibilityLabel="Send message" accessibilityState={{ disabled: !canSend }}
        disabled={!canSend} onPress={send}
        style={({ pressed }) => [styles.send, !canSend && styles.sendOff, pressed && styles.sendPressed]}>
        <Icon name="arrow-up" size={20} color={canSend ? 'onAccent' : 'faint'} />
      </Pressable>
    </View>
  );
}

/** Shown to non-members in place of the composer. */
export function JoinBar({ memberCount, onJoin }: { memberCount: number; onJoin: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.joinBar, { paddingBottom: insets.bottom + space.md }]}>
      <View style={styles.joinText}>
        <Text variant="bodyStrong">Join to chat</Text>
        <Text variant="small" color="muted">
          {memberCount ? `Post, plan meetups and share workouts with ${memberCount} ${memberCount === 1 ? 'member' : 'members'}.` : 'Be the first member.'}
        </Text>
      </View>
      <Button label="Join group" onPress={onJoin} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  day: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginVertical: space.lg },
  rule: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: colors.line },
  msgRow: { flexDirection: 'row', alignItems: 'flex-end', gap: space.sm, marginBottom: space.md },
  msgRowMine: { justifyContent: 'flex-end' },
  tight: { marginBottom: space.xxs },
  avatarSlot: { width: AVATAR },
  msgCol: { maxWidth: '78%', alignItems: 'flex-start' },
  msgColMine: { alignItems: 'flex-end' },
  name: { marginBottom: space.xxs, marginLeft: space.sm },
  bubble: { paddingHorizontal: space.md, paddingVertical: space.sm, borderRadius: radius.lg },
  bubbleMine: { backgroundColor: colors.board },
  bubbleTheirs: { backgroundColor: colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line },
  tailMine: { borderBottomRightRadius: radius.sm },
  tailTheirs: { borderBottomLeftRadius: radius.sm },
  time: { marginTop: space.xxs, marginHorizontal: space.sm },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: space.sm, paddingHorizontal: space.md, paddingTop: space.sm, backgroundColor: colors.surface, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
  input: { ...type.body, flex: 1, color: colors.ink, minHeight: minTouch, maxHeight: INPUT_MAX_HEIGHT, backgroundColor: colors.bg, borderRadius: radius.lg, paddingHorizontal: space.md, paddingTop: space.md - space.xxs, paddingBottom: space.md - space.xxs },
  send: { width: minTouch, height: minTouch, borderRadius: radius.lg, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  sendOff: { backgroundColor: colors.sunken },
  sendPressed: { backgroundColor: colors.accentPressed },
  joinBar: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.xl, paddingTop: space.md, backgroundColor: colors.surface, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
  joinText: { flex: 1, gap: space.xxs },
});
