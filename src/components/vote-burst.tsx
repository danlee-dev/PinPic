"use client";

import { useEffect, useState } from "react";

interface VoteBurstProps {
  active: boolean;
}

export function VoteBurst({ active }: VoteBurstProps) {
  const [particles, setParticles] = useState<
    { id: number; angle: number; dist: number; size: number; delay: number; color: string }[]
  >([]);

  useEffect(() => {
    if (!active) {
      setParticles([]);
      return;
    }
    const colors = ["#ff2d55", "#ff6b81", "#ff9eb5", "#ff4068", "#e8193e", "#ffb3c1"];
    setParticles(
      Array.from({ length: 10 }, (_, i) => ({
        id: i,
        angle: (i / 10) * Math.PI * 2 + (Math.random() - 0.5) * 0.5,
        dist: 30 + Math.random() * 30,
        size: 4 + Math.random() * 6,
        delay: Math.random() * 0.12,
        color: colors[i % colors.length],
      }))
    );
  }, [active]);

  if (!active) return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-30 flex items-center justify-center">
      {/* Big heart - Instagram style center pop */}
      <div className="animate-insta-heart">
        <svg width="80" height="80" viewBox="0 0 24 24" fill="#ff2d55" style={{ filter: "drop-shadow(0 4px 12px rgba(255, 45, 85, 0.5))" }}>
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
      </div>

      {/* Ring burst */}
      <div className="absolute w-24 h-24 rounded-full animate-heart-ring" style={{ borderColor: "#ff2d55" }} />

      {/* Scattered particles */}
      {particles.map((p) => {
        const px = Math.cos(p.angle) * p.dist;
        const py = Math.sin(p.angle) * p.dist;
        return (
          <span
            key={p.id}
            className="vote-particle absolute rounded-full"
            style={
              {
                width: p.size,
                height: p.size,
                backgroundColor: p.color,
                "--px": `${px}px`,
                "--py": `${py}px`,
                animationDelay: `${p.delay}s`,
              } as React.CSSProperties
            }
          />
        );
      })}
    </div>
  );
}
