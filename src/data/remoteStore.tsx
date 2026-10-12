import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { randomUUID } from 'expo-crypto';
import type { RealtimeChannel, SupabaseClient, User } from '@supabase/supabase-js';
import type { AppState, ID } from './types';
import * as A from './actions';
import { emptyState } from './demo';
import { normalizeEmail, schoolForEmail, signupGate } from './selectors';
import { PILOT_UNLOCK_AT } from './schools';
import { ALL_SLICES, PHOTO_BUCKET, TABLE_SLICES, load, workoutRow, type Slice, type Table } from './remote';
import { StoreContext, type Actions, type Store } from './storeContext';

// The Supabase backend for the store contract in storeContext.ts.
//
// Everyday actions run the same pure function the demo uses (actions.ts) on the local copy,
// so the screen updates instantly and gets the same friendly validation. The server write
// follows in the background. Afterwards the touched lists are refetched from the server,
// which is the source of truth: if the server refused (privacy rule, meetup just filled up),
// that refetch rolls the screen back and the student sees why.
//
// Live updates: Supabase Realtime tells us when a table changes, and we refetch only the
// lists that table feeds. Refetches wait until no write is in flight, so a refetch can never
// erase a tap that hasn't reached the server yet.

const VISIBILITY = TABLE_SLICES.follows;
const OFFLINE = "Can't reach Valence right now. Showing what's on your phone.";

type DbError = { code?: string; message?: string };

function friendly(e: unknown) {
  const err = e as DbError;
  if (e instanceof A.ActionError) return e.message;
  if (err?.code === 'P0001' && err.message) return err.message; // our own raise exception messages
  if (err?.code === '23505') return 'That already exists.';
  if (err?.code === '42501') return "You don't have permission to do that.";
  if (err?.code === '23503') return 'Your sign-in has expired. Start again with your school email.';
  return "Couldn't reach Valence. Check your connection and try again.";
}

async function must<T>(q: PromiseLike<{ data: T; error: DbError | null }>): Promise<T> {
  const { data, error } = await q;
  if (error) throw error;
  return data;
}

export function RemoteStoreProvider({ db, children }: { db: SupabaseClient; children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(emptyState);
  const [ready, setReady] = useState(false);
  const [syncError, setSyncError] = useState('');
  const [verifiedSignup, setVerifiedSignup] = useState<Store['verifiedSignup']>(null);
  const current = useRef(state);
  const user = useRef<User | null>(null);
  const pendingEmail = useRef('');
  const inflight = useRef(0);
  const dirty = useRef(new Set<Slice>());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const channel = useRef<RealtimeChannel | null>(null);

  const commit = useCallback((next: AppState) => { current.current = next; setState(next); }, []);

  // ---------- Sync ----------

  const flush = useCallback(async () => {
    timer.current = null;
    if (inflight.current || !dirty.current.size || !user.current) return;
    const slices = [...dirty.current];
    dirty.current.clear();
    try {
      const part = await load(db, slices);
      if (inflight.current) { slices.forEach(s => dirty.current.add(s)); return; } // a newer tap is on its way; refetch after it
      commit({ ...current.current, ...part });
      setSyncError('');
    } catch {
      slices.forEach(s => dirty.current.add(s));
      setSyncError(OFFLINE);
      timer.current = setTimeout(flush, 5000);
    }
  }, [db, commit]);

  const refetch = useCallback((slices: Slice[]) => {
    slices.forEach(s => dirty.current.add(s));
    if (inflight.current) return; // the last write to finish will flush
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(flush, 150);
  }, [flush]);

  /** Sends one write to the server, then refetches what it touched (success or not). */
  const write = useCallback((slices: Slice[], title: string, op: () => Promise<unknown>) => {
    inflight.current++;
    op().catch(e => Alert.alert(title, friendly(e))).finally(() => { inflight.current--; refetch(slices); });
  }, [refetch]);

  const startSession = useCallback(async (u: User) => {
    user.current = u;
    // A saved login can outlive its account (deleted on another phone, or a reset dev
    // database). Ask the server first; if the account is gone, sign out on this phone
    // rather than resume sign-up with a login that can't save anything. Offline: carry on.
    const { error: lost } = await db.auth.getUser();
    if (lost && (lost.status === 401 || lost.status === 403 || lost.status === 404)) {
      user.current = null;
      await db.auth.signOut({ scope: 'local' }).catch(() => undefined); // fires SIGNED_OUT, which ends the session
      return;
    }
    try {
      const all = await load(db, ALL_SLICES);
      const hasProfile = !!all.students?.some(s => s.id === u.id);
      const students = (all.students ?? []).map(s => (s.id === u.id ? { ...s, email: u.email ?? '' } : s));
      commit({ ...emptyState(), ...all, students, meId: hasProfile ? u.id : null });
      const school = u.email ? schoolForEmail(u.email) : undefined;
      setVerifiedSignup(!hasProfile && u.email && school ? { email: u.email, schoolId: school.id } : null);
      setSyncError('');
    } catch {
      setSyncError(OFFLINE);
    }
    channel.current?.unsubscribe();
    const ch = db.channel(`campus-${u.id}`);
    (Object.keys(TABLE_SLICES) as Table[]).forEach(table =>
      ch.on('postgres_changes', { event: '*', schema: 'public', table }, () => refetch(TABLE_SLICES[table])));
    channel.current = ch.subscribe();
  }, [db, commit, refetch]);

  const endSession = useCallback(() => {
    user.current = null;
    channel.current?.unsubscribe(); channel.current = null;
    dirty.current.clear();
    commit(emptyState()); setVerifiedSignup(null); setSyncError('');
  }, [commit]);

  useEffect(() => {
    // Supabase warns against awaiting its own calls inside this callback, so work is deferred.
    const { data } = db.auth.onAuthStateChange((event, session) => {
      setTimeout(async () => {
        const u = session?.user ?? null;
        if (!u) endSession();
        else if (u.id !== user.current?.id || event === 'USER_UPDATED') await startSession(u);
        if (event === 'INITIAL_SESSION') setReady(true);
      }, 0);
    });
    return () => { data.subscription.unsubscribe(); channel.current?.unsubscribe(); };
  }, [db, startSession, endSession]);

  // ---------- Actions ----------

  const actions = useMemo<Actions>(() => {
    const ctx = (): A.Ctx => ({ now: new Date().toISOString(), id: randomUUID });
    /** Runs the pure action on the local copy so the screen updates now. */
    function local<R>(fn: (s: AppState) => A.Result<R>): R {
      const { state: next, result } = fn(current.current);
      if (next !== current.current) commit(next);
      return result;
    }
    const meId = () => current.current.meId as ID;

    return {
      async startSignup(input) {
        const gate = signupGate(input.email, input.schoolId);
        if (!gate.ok) {
          if (gate.reason === 'waitlist') throw new A.ActionError(`${gate.school.shortName} isn't open yet. Join the waitlist instead.`);
          throw new A.ActionError(gate.reason === 'domain-mismatch' ? 'Use your school email address.' : 'Enter a valid school email.');
        }
        const email = normalizeEmail(input.email);
        const { error } = await db.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
        if (error) throw new A.ActionError(error.status === 429 ? 'Too many codes. Wait a minute, then try again.' : error.message || friendly(error));
        pendingEmail.current = email;
        return {};
      },

      async verifyCode(code) {
        if (!pendingEmail.current) throw new A.ActionError('Start again with your school email.');
        const { data, error } = await db.auth.verifyOtp({ email: pendingEmail.current, token: code.trim(), type: 'email' });
        if (error || !data.user) throw new A.ActionError("That code doesn't match or has expired. Check it or send a new one.");
        await startSession(data.user);
      },

      async completeProfile(input) {
        const u = user.current;
        const school = u?.email ? schoolForEmail(u.email) : undefined;
        if (!u || !school) throw new A.ActionError('Verify your school email first.');
        A.checkProfile(input);
        try {
          await must(db.from('students').insert({
            id: u.id, school_id: school.id, first_name: input.firstName.trim(), last_name: input.lastName.trim(),
            class_year: input.classYear, interests: [...new Set(input.interests)], bio: input.bio?.trim() || null,
          }));
        } catch (e) { throw new A.ActionError(friendly(e)); }
        await startSession(u);
        if (current.current.meId !== u.id) throw new A.ActionError(friendly(null));
        return { studentId: u.id };
      },

      updateProfile(patch) {
        local(s => A.updateProfile(s, patch));
        const me = current.current.students.find(s => s.id === meId())!;
        write(['students'], "Couldn't save your profile", () => must(db.from('students').update({
          first_name: me.firstName, last_name: me.lastName, class_year: me.classYear, interests: me.interests, bio: me.bio ?? null,
        }).eq('id', me.id)));
      },

      async joinWaitlist(input) {
        const gate = signupGate(input.email, input.schoolId);
        if (!gate.ok && gate.reason !== 'waitlist') throw new A.ActionError(gate.reason === 'domain-mismatch' ? 'Use your school email address.' : 'Enter a valid school email.');
        try {
          const rows = await must(db.rpc('join_waitlist', { student_email: normalizeEmail(input.email), school: input.schoolId }));
          const row = (rows as { place: number; total: number }[])[0];
          return { count: Number(row.total), unlockAt: PILOT_UNLOCK_AT, position: Number(row.place) };
        } catch (e) { throw new A.ActionError(friendly(e)); }
      },

      signOut() {
        endSession();
        db.auth.signOut().catch(() => undefined); // the local session is cleared either way
      },

      resetDemo() { throw new A.ActionError('Reset only exists in the demo build.'); },

      logWorkout(input) {
        const r = local(s => A.logWorkout(s, input, ctx()));
        const w = current.current.workouts.find(x => x.id === r.workoutId)!;
        const tagged = current.current.tags.filter(t => t.workoutId === w.id).map(t => t.studentId);
        write(['workouts', 'tags'], "Couldn't save your workout", async () => {
          await must(db.from('workouts').insert(workoutRow(w)));
          if (w.note) await must(db.from('workout_notes').insert({ workout_id: w.id, body: w.note }));
          if (tagged.length) await must(db.from('workout_tags').insert(tagged.map(id => ({ workout_id: w.id, student_id: id }))));
        });
        return r;
      },

      deleteWorkout(id) {
        local(s => A.deleteWorkout(s, id));
        write(['workouts', 'kudos', 'comments', 'tags', 'photos'], "Couldn't delete the workout", () => must(db.from('workouts').delete().eq('id', id)));
      },

      toggleKudos(id) {
        const r = local(s => A.toggleKudos(s, id, ctx()));
        write(['kudos'], "Couldn't give kudos", () => must(r.kudoed
          ? db.from('kudos').insert({ workout_id: id })
          : db.from('kudos').delete().eq('workout_id', id).eq('student_id', meId())));
        return r;
      },

      addComment(input) {
        const r = local(s => A.addComment(s, input, ctx()));
        const c = current.current.comments.find(x => x.id === r.commentId)!;
        write(['comments'], "Couldn't post your comment", () => must(db.from('comments').insert({ id: c.id, workout_id: c.workoutId, body: c.body })));
        return r;
      },

      deleteComment(id) {
        local(s => A.deleteComment(s, id));
        write(['comments'], "Couldn't delete the comment", () => must(db.from('comments').delete().eq('id', id)));
      },

      tagFriends(input) {
        const before = new Set(current.current.tags.filter(t => t.workoutId === input.workoutId).map(t => t.studentId));
        local(s => A.tagFriends(s, input, ctx()));
        const added = current.current.tags.filter(t => t.workoutId === input.workoutId && !before.has(t.studentId));
        if (!added.length) return;
        write(['tags'], "Couldn't tag", () => must(db.from('workout_tags').insert(added.map(t => ({ workout_id: t.workoutId, student_id: t.studentId })))));
      },

      respondToTag(input) {
        local(s => A.respondToTag(s, input));
        write(['tags', 'workouts', 'photos'], "Couldn't answer the tag", () => must(db.rpc('respond_to_tag', { workout: input.workoutId, accept: input.accept })));
      },

      removeTag(input) {
        local(s => A.removeTag(s, input));
        write(['tags', 'workouts'], "Couldn't remove the tag", () => must(db.from('workout_tags').delete().eq('workout_id', input.workoutId).eq('student_id', input.studentId)));
      },

      addPhoto(input) {
        // Shows the picked file at once; the upload and its row follow. The refetch swaps in
        // the signed link to the stored copy.
        const r = local(s => A.addPhoto(s, input, ctx()));
        const type = input.mimeType ?? 'image/jpeg';
        const path = `${input.workoutId}/${r.photoId}.${type.split('/')[1] === 'png' ? 'png' : 'jpg'}`;
        write(['photos'], "Couldn't add the photo", async () => {
          const body = await (await fetch(input.uri)).arrayBuffer();
          await must(db.storage.from(PHOTO_BUCKET).upload(path, body, { contentType: type }));
          try {
            await must(db.from('workout_photos').insert({ id: r.photoId, workout_id: input.workoutId, path }));
          } catch (e) {
            await db.storage.from(PHOTO_BUCKET).remove([path]); // don't leave an orphaned file
            throw e;
          }
        });
        return r;
      },

      removePhoto(id) {
        local(s => A.removePhoto(s, id));
        write(['photos'], "Couldn't remove the photo", async () => {
          const rows = await must(db.from('workout_photos').delete().eq('id', id).select('path'));
          const path = (rows as { path: string }[])[0]?.path;
          // Storage only lets the uploader delete the file; an owner removing a friend's photo
          // still removes it from the workout.
          if (path) await db.storage.from(PHOTO_BUCKET).remove([path]);
        });
      },

      addBadge(id) {
        local(s => A.addBadge(s, id, ctx()));
        write(['badges'], "Couldn't add the badge", () => must(db.from('student_badges').upsert({ student_id: meId(), org_id: id }, { ignoreDuplicates: true })));
      },

      removeBadge(id) {
        local(s => A.removeBadge(s, id));
        write(['badges'], "Couldn't remove the badge", () => must(db.from('student_badges').delete().eq('student_id', meId()).eq('org_id', id)));
      },

      addNewBadge(input) {
        const r = local(s => A.addNewBadge(s, input, ctx()));
        const org = current.current.orgs.find(o => o.id === r.orgId)!;
        write(['orgs', 'badges'], "Couldn't add the badge", async () => {
          if (r.created) await must(db.from('orgs').insert({ id: org.id, kind: org.kind, name: org.name }));
          await must(db.from('student_badges').upsert({ student_id: meId(), org_id: org.id }, { ignoreDuplicates: true }));
        });
        return r;
      },

      giveAward(input) {
        const known = new Set(current.current.awards.map(a => a.id));
        const r = local(s => A.giveAward(s, input, ctx()));
        const award = current.current.awards.find(a => a.id === r.awardId)!;
        const grant = current.current.studentAwards.find(g => g.studentId === input.studentId && g.awardId === r.awardId)!;
        write(['awards'], "Couldn't give the award", async () => {
          if (!known.has(award.id)) {
            await must(db.from('awards').insert({ id: award.id, name: award.name, description: award.description, icon: award.icon, tone: award.tone }));
          }
          await must(db.from('student_awards').insert({ student_id: grant.studentId, award_id: grant.awardId, note: grant.note ?? null }));
        });
        return r;
      },

      revokeAward(input) {
        local(s => A.revokeAward(s, input));
        write(['awards'], "Couldn't take the award back", () => must(db.from('student_awards').delete().eq('student_id', input.studentId).eq('award_id', input.awardId)));
      },

      // Following changes which workouts you can see, and so their kudos and comments too.
      follow(id) {
        local(s => A.follow(s, id, ctx()));
        write(VISIBILITY, "Couldn't follow", () => must(db.from('follows').upsert({ follower_id: meId(), followee_id: id }, { ignoreDuplicates: true })));
      },

      unfollow(id) {
        local(s => A.unfollow(s, id));
        write(VISIBILITY, "Couldn't unfollow", () => must(db.from('follows').delete().eq('follower_id', meId()).eq('followee_id', id)));
      },

      createMeetup(input) {
        const r = local(s => A.createMeetup(s, input, ctx()));
        const m = current.current.meetups.find(x => x.id === r.meetupId)!;
        write(['meetups'], "Couldn't post the meetup", () => must(db.from('meetups').insert({
          id: m.id, activity_id: m.activityId, title: m.title, location: m.location, starts_at: m.startsAt,
          capacity: m.capacity, group_id: m.groupId ?? null, note: m.note ?? null,
        })));
        return r;
      },

      joinMeetup(id) {
        local(s => A.joinMeetup(s, id));
        write(['meetups'], "Couldn't join", () => must(db.rpc('join_meetup', { meetup: id })));
      },

      leaveMeetup(id) {
        local(s => A.leaveMeetup(s, id));
        write(['meetups'], "Couldn't leave", () => must(db.from('meetup_attendees').delete().eq('meetup_id', id).eq('student_id', meId())));
      },

      cancelMeetup(id) {
        local(s => A.cancelMeetup(s, id));
        write(['meetups'], "Couldn't cancel", () => must(db.from('meetups').delete().eq('id', id)));
      },

      createGroup(input) {
        const r = local(s => A.createGroup(s, input, ctx()));
        const g = current.current.groups.find(x => x.id === r.groupId)!;
        write(['groups'], "Couldn't create the group", () => must(db.from('groups').insert({ id: g.id, name: g.name, kind: g.kind, description: g.description })));
        return r;
      },

      joinGroup(id) {
        local(s => A.joinGroup(s, id));
        write(['groups', 'messages'], "Couldn't join", () => must(db.from('group_members').upsert({ group_id: id, student_id: meId() }, { ignoreDuplicates: true })));
      },

      leaveGroup(id) {
        local(s => A.leaveGroup(s, id));
        write(['groups', 'messages'], "Couldn't leave", () => must(db.from('group_members').delete().eq('group_id', id).eq('student_id', meId())));
      },

      sendGroupMessage(input) {
        const r = local(s => A.sendGroupMessage(s, input, ctx()));
        const m = current.current.messages.find(x => x.id === r.messageId)!;
        write(['messages'], "Couldn't send", () => must(db.from('group_messages').insert({ id: m.id, group_id: m.groupId, body: m.body })));
        return r;
      },
    };
  }, [db, commit, write, startSession, endSession]);

  const value = useMemo<Store>(() => ({ backend: 'server', state, ready, syncError, verifiedSignup, actions }),
    [state, ready, syncError, verifiedSignup, actions]);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}
