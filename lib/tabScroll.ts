import { useEffect, useRef } from 'react';

/**
 * Pressing a tab takes you to the top of that tab's page. The tab bar tells the page (by tab name) and the page scrolls
 * itself: it knows its own scroll view. A page that is not open yet simply is at the top already.
 */
type Listener = () => void;
const listeners = new Map<string, Set<Listener>>();

export function emitTabPress(name: string): void {
  listeners.get(name)?.forEach((fn) => fn());
}

/** Call `scrollToTop` whenever the tab called `name` is pressed (also when you come from another tab). */
export function useScrollToTopOnTab(name: string, scrollToTop: () => void): void {
  const latest = useRef(scrollToTop);
  latest.current = scrollToTop;
  useEffect(() => {
    const fn = () => latest.current();
    const set = listeners.get(name) ?? new Set<Listener>();
    set.add(fn);
    listeners.set(name, set);
    return () => {
      set.delete(fn);
    };
  }, [name]);
}
