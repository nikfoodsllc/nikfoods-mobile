import { useEffect, useState } from 'react';

// The big greeting on Home. The admin can set the text (Food Catalog > Banners > App home text); empty means the usual
// "<first name>, what shall we cook?". `{name}` in the admin's text is the customer's first name.
export const USUAL_QUESTION = 'what shall we cook?';

let cached: string | null = null;

export function useHomeIntro(): string {
  const [intro, setIntro] = useState(cached ?? '');
  useEffect(() => {
    let live = true;
    fetch('/api/app-settings')
      .then((r) => r.json())
      .then((j) => {
        const v = typeof j?.data?.homeIntro === 'string' ? j.data.homeIntro : '';
        cached = v;
        if (live) setIntro(v);
      })
      .catch(() => undefined);
    return () => {
      live = false;
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
