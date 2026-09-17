import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { isStudentProfile, StudentProfile } from './model';

const KEY = 'uconn-rec-profile-v1';
type ProfileState = { profile: StudentProfile | null; loaded: boolean; editing: boolean; error: string; startStep: number; edit: (step?: number) => void; cancel: () => void; save: (profile: StudentProfile) => Promise<void> };
const Context = createContext<ProfileState | null>(null);
export function useProfile() { const context = useContext(Context); if (!context) throw new Error('ProfileProvider missing'); return context; }
export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [startStep, setStartStep] = useState(0);
  const [loaded, setLoaded] = useState(false); const [editing, setEditing] = useState(false); const [error, setError] = useState('');
  const writing = useRef(false);
  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(KEY).then(raw => {
      if (!active || !raw) return;
      const parsed: unknown = JSON.parse(raw);
      if (isStudentProfile(parsed)) setProfile(parsed);
      else setError('Your saved welcome details need to be entered again.');
    }).catch(() => { if (active) setError('We couldn’t load your welcome details. Please try again.'); })
      .finally(() => { if (active) setLoaded(true); });
    return () => { active = false; };
  }, []);
  async function save(next: StudentProfile) {
    if (writing.current) return;
    if (!isStudentProfile(next)) throw new Error('Please check your welcome details.');
    writing.current = true;
    try {
      await AsyncStorage.setItem(KEY, JSON.stringify(next));
      setProfile(next); setEditing(false); setError('');
    } finally { writing.current = false; }
  }
  return <Context.Provider value={{ profile, loaded, editing, error, startStep, edit: (step = 0) => { setStartStep(step); setEditing(true); }, cancel: () => setEditing(false), save }}>{children}</Context.Provider>;
}
