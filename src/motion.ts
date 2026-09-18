import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

// Default to still until the platform preference is known.
export function useReducedMotion() {
  const [reduced, setReduced] = useState(true);
  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled().then(value => {
      if (active) setReduced(value);
    }).catch(() => {});
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => { active = false; subscription.remove(); };
  }, []);
  return reduced;
}
