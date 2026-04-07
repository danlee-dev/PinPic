"use client";

import { useEffect } from "react";
import confetti from "canvas-confetti";

interface ConfettiBurstProps {
  // Bumping this prop replays the burst (e.g., when user revisits a tab).
  trigger?: number;
}

export function ConfettiBurst({ trigger = 0 }: ConfettiBurstProps) {
  useEffect(() => {
    const colors = ["#1a6dff", "#e8193e", "#ffd700", "#ffffff", "#ff8a00", "#9b59b6"];
    const defaults = {
      spread: 90,
      ticks: 180,
      gravity: 1,
      decay: 0.93,
      startVelocity: 45,
      colors,
      zIndex: 9999,
      disableForReducedMotion: true,
    };

    // Main center burst
    confetti({
      ...defaults,
      particleCount: 120,
      origin: { x: 0.5, y: 0.55 },
      scalar: 1.1,
    });

    // Left and right side cannons for a fuller scene
    setTimeout(() => {
      confetti({
        ...defaults,
        particleCount: 60,
        angle: 60,
        spread: 70,
        origin: { x: 0, y: 0.7 },
      });
      confetti({
        ...defaults,
        particleCount: 60,
        angle: 120,
        spread: 70,
        origin: { x: 1, y: 0.7 },
      });
    }, 250);

    // Delayed top sprinkle
    setTimeout(() => {
      confetti({
        ...defaults,
        particleCount: 50,
        spread: 120,
        startVelocity: 30,
        origin: { x: 0.5, y: 0.25 },
        scalar: 0.9,
      });
    }, 500);
  }, [trigger]);

  return null;
}
