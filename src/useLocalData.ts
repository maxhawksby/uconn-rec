import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Hydration never writes. Explicit edits are serialized so slower writes cannot
// replace newer data. A failed read leaves the existing stored value untouched.
export function useLocalData<T>(key: string, initial: T, validate: (value: unknown) => value is T) {
  const [data, setData] = useState<T>(initial); const [ready, setReady] = useState(false); const [error, setError] = useState('');
  const current = useRef(initial); const hydrated = useRef(false); const active = useRef(true); const queue = useRef(Promise.resolve());
  useEffect(() => {
    active.current = true;
    AsyncStorage.getItem(key).then(raw => {
      if (!active.current || !raw) return;
      const parsed: unknown = JSON.parse(raw);
      if (!validate(parsed)) throw Error('Invalid stored data');
      current.current = parsed; setData(parsed);
    }).catch(() => { if (active.current) setError('Saved data could not be loaded. Your stored copy has been kept. New changes will replace it.'); })
      .finally(() => { if (active.current) { hydrated.current = true; setReady(true); } });
    return () => { active.current = false; };
  }, [key, validate]);
  const update = useCallback((change: React.SetStateAction<T>) => {
    if (!hydrated.current) return;
    const next = typeof change === 'function' ? (change as (prev: T) => T)(current.current) : change;
    if (!validate(next)) { setError('That change could not be saved. Please try again.'); return; }
    current.current = next; setData(next);
    queue.current = queue.current.then(() => AsyncStorage.setItem(key, JSON.stringify(next))).then(() => { if (active.current) setError(''); }).catch(() => { if (active.current) setError('Storage is unavailable. Your changes will last for this session.'); });
  }, [key, validate]);
  return { data, update, ready, error };
}
