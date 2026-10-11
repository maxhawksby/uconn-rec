import { createContext } from 'react';
import type { AppState, ID, NewGroup, NewMeetup, NewWorkout } from './types';
import type { ProfileInput } from './actions';

// The store contract both backends implement (see store.tsx).

export type WaitlistStatus = { count: number; unlockAt: number; position: number | null };

export type Actions = {
  // sign-up and account
  startSignup(input: { email: string; schoolId: ID }): Promise<{ demoCode?: string }>; // demo shows the code on screen
  verifyCode(code: string): Promise<void>;
  completeProfile(input: ProfileInput): Promise<{ studentId: ID }>;
  updateProfile(patch: Partial<ProfileInput>): void;
  joinWaitlist(input: { email: string; schoolId: ID }): Promise<WaitlistStatus>;
  signOut(): void;
  resetDemo(): void; // demo only: wipes local data and reseeds the demo campus
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

export type Store = {
  backend: 'demo' | 'server';
  state: AppState;
  ready: boolean;
  syncError: string; // shown as a banner: storage or connection trouble
  /** Verified email that hasn't finished a profile yet (server only, e.g. after an app restart). */
  verifiedSignup: { email: string; schoolId: ID } | null;
  actions: Actions;
};

export const StoreContext = createContext<Store | null>(null);
