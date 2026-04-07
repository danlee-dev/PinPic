"use client";

import { useEffect, useRef, useState } from "react";

interface CountUpProps {
  to: number;
  duration?: number; // ms
  delay?: number; // ms
  className?: string;
  format?: (n: number) => string;
}

export function CountUp({ to, duration = 1400, delay = 0, className, format }: CountUpProps) {
  const [value, setValue] = useState(0);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const timer = setTimeout(() => {
      const start = performance.now();
      // easeOutCubic for a satisfying landing
      const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
      let raf = 0;
      const tick = (now: number) => {
        const elapsed = now - start;
        const t = Math.min(elapsed / duration, 1);
        const eased = easeOut(t);
        setValue(Math.round(to * eased));
        if (t < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(raf);
    }, delay);

    return () => clearTimeout(timer);
  }, [to, duration, delay]);

  return <span className={className}>{format ? format(value) : value.toLocaleString()}</span>;
}
