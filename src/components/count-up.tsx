"use client";

import { useEffect, useState } from "react";

interface CountUpProps {
  to: number;
  duration?: number; // ms
  delay?: number; // ms
  className?: string;
  format?: (n: number) => string;
}

export function CountUp({ to, duration = 1400, delay = 0, className, format }: CountUpProps) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    // Skip animation entirely if there is nothing to count
    if (to <= 0) {
      setValue(0);
      return;
    }

    let raf = 0;
    const startFrom = 0;
    const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

    const timer = setTimeout(() => {
      const start = performance.now();
      const tick = (now: number) => {
        const elapsed = now - start;
        const t = Math.min(elapsed / duration, 1);
        const eased = easeOut(t);
        setValue(Math.round(startFrom + (to - startFrom) * eased));
        if (t < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }, delay);

    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(raf);
    };
  }, [to, duration, delay]);

  return <span className={className}>{format ? format(value) : value.toLocaleString()}</span>;
}
