import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AppState, ID, NewGroup, NewMeetup, NewWorkout } from './types';
import * as A from './actions';
import { makeDemoState, STATE_VERSION } from './demo';
import { me as selectMe } from './selectors';

// The single local data store. Screens read `state` (with selectors from ./selectors) and
// call `actions`. Every action is synchronous, persists in the background, and throws
// ActionError with a message safe to show the student. This API is the contract a
// Supabase repository will implement in milestone 2.

const KEY = 'deans-lift-state-v1';

function isAppState(x: unknown): x is AppState {
  const s = x as AppState;
  return !!s && typeof s === 'object' && s.version === STATE_VERSION &&
    (['students', 'workouts', 'kudos', 'comments', 'follows', 'meetups', 'groups', 'messages', 'waitlist'] as const).every(k => Array.isArray(s[k]));
}

const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export type Actions = {
  // sign-up and account
  startSignup(input: { email: string; schoolId: ID }): { code: string }; // demo: show the code on screen
  verifyCode(code: string): void;
  completeProfile(input: A.ProfileInput): { studentId: ID };
  updateProfile(patch: Partial<A.ProfileInput>): void;
  joinWaitlist(input: { email: string; schoolId: ID }): void;
  signOut(): void;
  resetDemo(): void; // wipes local data and reseeds the demo campus
  // workouts
  logWorkout(input: NewWorkout): { workoutId: ID };
  deleteWorkout(workoutId: ID): void;
  toggleKudos(workoutId: ID): { kudoed: boolean };
  addComment(input: { workoutId: ID; body: string }): { commentId: ID };
  deleteComment(commentId: ID): void;
  // people
  follow(studentId: ID): void;
  unfollow(studentId: ID): void;
  // meetups
  createMeetup(input: NewMeetup): { meetupId: ID };
  joinMeetup(meetupId: ID): void;
  leaveMeetup(meetupId: ID): void;
  cancelMeetup(meetupId: ID): void;
  // groups
  createGroup(input: NewGroup): { groupId: ID };
  joinGroup(groupId: ID): void;
  leaveGroup(groupId: ID): void;
  sendGroupMessage(input: { groupId: ID; body: string }): { messageId: ID };
};

type Store = { state: AppState; ready: boolean; storageError: string; actions: Actions };

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(() => makeDemoState());
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState('');
  const current = useRef(state);
  const queue = useRef(Promise.resolve());

  // Hydration never writes; a failed read keeps the stored copy untouched.
  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(KEY).then(raw => {
      if (!active || !raw) return;
      const parsed: unknown = JSON.parse(raw);
      if (!isAppState(parsed)) throw new Error('Invalid stored data');
      current.current = parsed; setState(parsed);
    }).catch(() => { if (active) setStorageError('Saved data could not be loaded. New changes will replace it.'); })
      .finally(() => { if (active) setReady(true); });
    return () => { active = false; };
  }, []);

  // Writes are serialized so a slow write can never overwrite newer data.
  const commit = useCallback((next: AppState) => {
    current.current = next; setState(next);
    queue.current = queue.current.then(() => AsyncStorage.setItem(KEY, JSON.stringify(next)))
      .then(() => setStorageError(''))
      .catch(() => setStorageError('Storage is unavailable. Changes last for this session only.'));
  }, []);

  const actions = useMemo<Actions>(() => {
    const ctx = (): A.Ctx => ({ now: new Date().toISOString(), id: newId });
    function run<R>(fn: (s: AppState) => A.Result<R>): R {
      const { state: next, result } = fn(current.current);
      if (next !== current.current) commit(next);
      return result;
    }
    return {
      startSignup: input => run(s => A.startSignup(s, input, ctx())),
      verifyCode: code => run(s => A.verifyCode(s, code)),
      completeProfile: input => run(s => A.completeProfile(s, input, ctx())),
      updateProfile: patch => run(s => A.updateProfile(s, patch)),
      joinWaitlist: input => run(s => A.joinWaitlist(s, input, ctx())),
      signOut: () => run(s => A.signOut(s)),
      resetDemo: () => commit(makeDemoState()),
      logWorkout: input => run(s => A.logWorkout(s, input, ctx())),
      deleteWorkout: id => run(s => A.deleteWorkout(s, id)),
      toggleKudos: id => run(s => A.toggleKudos(s, id, ctx())),
      addComment: input => run(s => A.addComment(s, input, ctx())),
      deleteComment: id => run(s => A.deleteComment(s, id)),
      follow: id => run(s => A.follow(s, id, ctx())),
      unfollow: id => run(s => A.unfollow(s, id)),
      createMeetup: input => run(s => A.createMeetup(s, input, ctx())),
      joinMeetup: id => run(s => A.joinMeetup(s, id)),
      leaveMeetup: id => run(s => A.leaveMeetup(s, id)),
      cancelMeetup: id => run(s => A.cancelMeetup(s, id)),
      createGroup: input => run(s => A.createGroup(s, input, ctx())),
      joinGroup: id => run(s => A.joinGroup(s, id)),
      leaveGroup: id => run(s => A.leaveGroup(s, id)),
      sendGroupMessage: input => run(s => A.sendGroupMessage(s, input, ctx())),
    };
  }, [commit]);

  const value = useMemo(() => ({ state, ready, storageError, actions }), [state, ready, storageError, actions]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const store = useContext(Ctx);
  if (!store) throw new Error('StoreProvider missing');
  return store;
}

/** The signed-in student. Only call inside the signed-in app (tabs and detail screens). */
export function useMe() {
  const { state } = useStore();
  const me = selectMe(state);
  if (!me) throw new Error('useMe called while signed out');
  return me;
}

export { ActionError } from './actions';
