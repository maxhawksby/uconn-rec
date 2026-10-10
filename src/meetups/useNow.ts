import { useEffect, useState } from 'react';

/** Current time, refreshed every `everyMs` so "Today" and "Live" labels stay true. */
export function useNow(everyMs = 60_000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), everyMs);
    return () => clearInterval(t);
  }, [everyMs]);
  return now;
}
