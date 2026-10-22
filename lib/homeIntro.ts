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

/** The admin's text with the first name put in; without a name the placeholder (and a comma or space left next to it) goes away. */
export function fillIntro(intro: string, firstName: string): string {
  const name = firstName.trim();
  const text = name ? intro.replace(/\{name\}/gi, name) : intro.replace(/\s*\{name\}\s*,?\s*/gi, ' ');
  return text.replace(/\s+/g, ' ').trim();
}

/** What Home draws: the admin's text as one block, or the usual two lines (name in ink, question in gold). */
export function greeting(intro: string, firstName: string): { custom: string } | { name: string; question: string } {
  const custom = fillIntro(intro, firstName);
  if (custom) return { custom };
  return { name: firstName.trim() ? `${firstName.trim()},` : 'Welcome,', question: USUAL_QUESTION };
}
