import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, AppState } from 'react-native';

/**
 * Calls `onAdvance` once `everyMs` after the last change of `resetKey` (the current page), so a row or strip moves on by
 * itself. It waits while `enabled` is false (finger down, screen not showing, zoom view open), while the app is in the
 * background, and never runs for someone who turned on Reduce Motion in iOS settings. Any change of `resetKey` (a swipe,
 * or the move it just made) starts the wait again.
 */
export function useAutoAdvance(enabled: boolean, everyMs: number, resetKey: number | string, onAdvance: () => void): void {
  const [reduced, setReduced] = useState(false);
  const [active, setActive] = useState(AppState.currentState === 'active');
  const latest = useRef(onAdvance);
  latest.current = onAdvance;

  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled().then((v) => alive && setReduced(v)).catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => setActive(state === 'active'));
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!enabled || reduced || !active) return;
    const timer = setTimeout(() => latest.current(), everyMs);
    return () => clearTimeout(timer);
  }, [enabled, reduced, active, everyMs, resetKey]);
}
