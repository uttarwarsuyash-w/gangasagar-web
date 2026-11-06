'use client';

import { useEffect, useRef, useState } from 'react';
import { reducedMotion } from './motion';

/** Counts smoothly from the previous value to the new one and gives it a little bounce. */
export function AnimatedNumber({ value, format, className }: { value: number; format: (n: number) => string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const last = useRef(value);
  const [shown, setShown] = useState(value);

  useEffect(() => {
    const start = last.current;
    last.current = value;
    if (start === value || reducedMotion() || typeof requestAnimationFrame !== 'function') return;
    ref.current?.animate?.(
      [{ transform: 'scale(1)' }, { transform: 'scale(1.3)', color: '#C0182B' }, { transform: 'scale(1)' }],
      { duration: 480, easing: 'cubic-bezier(.3,1.6,.5,1)' },
    );
    let raf = 0;
    let t0 = 0;
    const step = (t: number) => {
      t0 ||= t;
      const p = Math.min(1, (t - t0) / 550);
      setShown(p >= 1 ? value : start + (value - start) * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  const display = reducedMotion() || shown === value ? value : Math.round(shown);
  return (
    <span ref={ref} className={`inline-block tabular-nums ${className ?? ''}`}>
      {format(display)}
    </span>
  );
}
