import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AppState } from './types';
import { StoreContext, type Actions, type Store } from './storeContext';
import * as A from './actions';
import { makeDemoState, STATE_VERSION } from './demo';
import { migrate } from './migrate';
import { me as selectMe, waitlistStatus } from './selectors';
import { supabase } from './supabase';
import { RemoteStoreProvider } from './remoteStore';

// The app's data store. Screens read `state` (with selectors from ./selectors) and call
// `actions`. Two backends implement the same contract:
// - server (remoteStore.tsx): Supabase, when EXPO_PUBLIC_SUPABASE_URL is set
// - demo (below): fictional campus data kept on this device, the milestone 1 build
// Everyday actions are synchronous: the screen updates at once and the server write follows.
// Sign-up steps are async because they wait on email codes. Both throw ActionError with a
// message that is safe to show the student.

export type { Actions, Store, WaitlistStatus } from './storeContext';

export function StoreProvider({ children }: { children: React.ReactNode }) {
  return supabase ? <RemoteStoreProvider db={supabase}>{children}</RemoteStoreProvider> : <DemoStoreProvider>{children}</DemoStoreProvider>;
}

// ---------- Demo backend ----------

const KEY = 'valence-state-v1';

function isAppState(x: unknown): x is AppState {
  const s = x as AppState;
  return !!s && typeof s === 'object' && s.version === STATE_VERSION &&
    (['students', 'workouts', 'kudos', 'comments', 'follows', 'meetups', 'groups', 'messages', 'waitlist', 'tags', 'photos'] as const).every(k => Array.isArray(s[k]));
}


const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

function DemoStoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(() => makeDemoState());
  const [ready, setReady] = useState(false);
  const [syncError, setSyncError] = useState('');
  const current = useRef(state);
  const queue = useRef(Promise.resolve());

  // Hydration never writes; a failed read keeps the stored copy untouched.
  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(KEY).then(raw => {
      if (!active || !raw) return;
      const parsed = migrate(JSON.parse(raw));
      if (!isAppState(parsed)) throw new Error('Invalid stored data');
      current.current = parsed; setState(parsed);
    }).catch(() => { if (active) setSyncError('Saved data could not be loaded. New changes will replace it.'); })
      .finally(() => { if (active) setReady(true); });
    return () => { active = false; };
  }, []);

  // Writes are serialized so a slow write can never overwrite newer data.
  const commit = useCallback((next: AppState) => {
    current.current = next; setState(next);
    queue.current = queue.current.then(() => AsyncStorage.setItem(KEY, JSON.stringify(next)))
      .then(() => setSyncError(''))
      .catch(() => setSyncError('Storage is unavailable. Changes last for this session only.'));
  }, []);

  const actions = useMemo<Actions>(() => {
    const ctx = (): A.Ctx => ({ now: new Date().toISOString(), id: newId });
    function run<R>(fn: (s: AppState) => A.Result<R>): R {
      const { state: next, result } = fn(current.current);
      if (next !== current.current) commit(next);
      return result;
    }
    const later = <R,>(fn: () => R) => new Promise<R>((resolve, reject) => { try { resolve(fn()); } catch (e) { reject(e); } });
    return {
      startSignup: input => later(() => ({ demoCode: run(s => A.startSignup(s, input, ctx())).code })),
      verifyCode: code => later(() => run(s => A.verifyCode(s, code))),
      completeProfile: input => later(() => run(s => A.completeProfile(s, input, ctx()))),
      updateProfile: patch => run(s => A.updateProfile(s, patch)),
      joinWaitlist: input => later(() => {
        run(s => A.joinWaitlist(s, input, ctx()));
        return waitlistStatus(current.current, input.schoolId, input.email);
      }),
      signOut: () => run(s => A.signOut(s)),
      resetDemo: () => commit(makeDemoState()),
      logWorkout: input => run(s => A.logWorkout(s, input, ctx())),
      deleteWorkout: id => run(s => A.deleteWorkout(s, id)),
      toggleKudos: id => run(s => A.toggleKudos(s, id, ctx())),
      addComment: input => run(s => A.addComment(s, input, ctx())),
      deleteComment: id => run(s => A.deleteComment(s, id)),
      tagFriends: input => run(s => A.tagFriends(s, input, ctx())),
      respondToTag: input => run(s => A.respondToTag(s, input)),
      removeTag: input => run(s => A.removeTag(s, input)),
      addPhoto: input => run(s => A.addPhoto(s, input, ctx())),
      removePhoto: id => run(s => A.removePhoto(s, id)),
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

  const value = useMemo<Store>(() => ({ backend: 'demo', state, ready, syncError, verifiedSignup: null, actions }), [state, ready, syncError, actions]);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const store = useContext(StoreContext);
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
