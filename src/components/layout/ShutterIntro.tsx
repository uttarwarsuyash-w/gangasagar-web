'use client';

import { useEffect, useState } from 'react';

export const INTRO_KEY = 'gks-intro-seen';

/** Runs before the page paints: skips the intro for the rest of the visit, or when less motion is asked for. */
export const INTRO_SCRIPT = `try{if(sessionStorage.getItem('${INTRO_KEY}')||matchMedia('(prefers-reduced-motion: reduce)').matches)document.documentElement.classList.add('intro-seen')}catch(e){}`;

/**
 * The shop opening: the red signboard drops in, its words pop up, and the metal shutter rolls up.
 * Plays once per visit; a tap skips it. Decorative only (hidden from screen readers).
 */
export function ShutterIntro({ words, sub }: { words: string[]; sub: string }) {
  const [gone, setGone] = useState(false);

  useEffect(() => {
    try {
      sessionStorage.setItem(INTRO_KEY, '1');
    } catch {
      // private mode: the intro may play again next time
    }
    const timer = window.setTimeout(() => setGone(true), 3000);
    return () => window.clearTimeout(timer);
  }, []);

  if (gone) return null;
  return (
    <div className="shutter is-leaving" aria-hidden="true" onClick={() => setGone(true)}>
      <div className="shutter-board">
        <p className="font-display text-5xl leading-none font-semibold tracking-wide sm:text-7xl" lang="hi">
          {words.map((w, i) => (
            <span key={i} className="shutter-word" style={{ '--i': i } as React.CSSProperties}>
              {w}&nbsp;
            </span>
          ))}
        </p>
        <p className="shutter-word mt-1 text-sm text-white/85 sm:text-base" style={{ '--i': words.length } as React.CSSProperties}>
          {sub}
        </p>
      </div>
      <div className="shutter-door" />
    </div>
  );
}
