import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// The big greeting on Home. The admin can set the text (Food Catalog > Banners > App home text); empty means the usual
// "<first name>, what shall we cook?". `{name}` in the admin's text is the customer's first name.
export const USUAL_QUESTION = 'what shall we cook?';

const KEY = 'homeIntro';
// without a saved text (first launch) Home waits this long for the answer before showing the usual greeting
const WAIT_MS = 1500;

let cached: string | null = null;
let started = false;
const listeners = new Set<(v: string) => void>();

function publish(v: string) {
  cached = v;
  listeners.forEach((fn) => fn(v));
}

/** Show the text saved last time at once, then ask the server and keep the answer for next time. */
function start() {
  if (started) return;
  started = true;
  AsyncStorage.getItem(KEY)
    .then((v) => {
      if (v !== null && cached === null) publish(v);
    })
    .catch(() => undefined);
  fetch('/api/app-settings')
    .then((r) => r.json())
    .then((j) => {
      const v = typeof j?.data?.homeIntro === 'string' ? j.data.homeIntro : '';
      publish(v);
      AsyncStorage.setItem(KEY, v).catch(() => undefined);
    })
    .catch(() => {
      started = false;
    });
}
start();

/** The admin's text; `null` while it is not known yet (Home draws nothing in the greeting box rather than the usual words that would then switch). */
export function useHomeIntro(): string | null {
  const [intro, setIntro] = useState<string | null>(cached);
  useEffect(() => {
    start();
    listeners.add(setIntro);
    if (cached !== null) setIntro(cached);
    // never leave the box empty for long (offline, slow server)
    const t = setTimeout(() => setIntro((v) => v ?? ''), WAIT_MS);
    return () => {
      clearTimeout(t);
      listeners.delete(setIntro);
    };
  }, []);
  return intro;
}

export interface GreetingPart {
  text: string;
  /** the customer's first name: always drawn in ink; everything else is gold */
  isName: boolean;
}

/** What Home draws, in order: the admin's text split around the first name (name in ink, the rest gold), or the usual two lines. */
export function greeting(intro: string, firstName: string): { custom: GreetingPart[] } | { name: string; question: string } {
  const name = firstName.trim();
  // without a name the placeholder goes, and the comma that led up to it
  const text = name ? intro : intro.replace(/,?\s*\{name\}/gi, '').replace(/^[\s,]+/, '');
  const parts: GreetingPart[] = [];
  text.split(/(\{name\})/i).forEach((chunk) => {
    if (/^\{name\}$/i.test(chunk)) parts.push({ text: name, isName: true });
    else if (chunk) parts.push({ text: chunk, isName: false });
  });
  const joined = parts.map((p) => p.text).join('').replace(/\s+/g, ' ').trim();
  if (!joined) return { name: name ? `${name},` : 'Welcome,', question: USUAL_QUESTION };
  return { custom: parts };
}
