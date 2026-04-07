"use client";

import { useEffect, useState } from "react";

interface Particle {
  id: number;
  x: number;
  y: number;
  angle: number;
  velocity: number;
  color: string;
  size: number;
  rotation: number;
  spin: number;
  shape: "rect" | "circle";
}

const COLORS = ["#1a6dff", "#e8193e", "#ffd700", "#ffffff", "#ff8a00", "#9b59b6"];

interface ConfettiBurstProps {
  // Bumping this prop replays the burst (e.g., when user revisits a tab).
  trigger?: number;
}

export function ConfettiBurst({ trigger = 0 }: ConfettiBurstProps) {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    const count = 80;
    const next: Particle[] = [];
    for (let i = 0; i < count; i++) {
      const angle = (Math.random() * Math.PI) - Math.PI; // upper hemisphere
      const velocity = 200 + Math.random() * 250;
      next.push({
        id: i,
        x: 50 + (Math.random() - 0.5) * 20,
        y: 60,
        angle,
        velocity,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        size: 6 + Math.random() * 8,
        rotation: Math.random() * 360,
        spin: (Math.random() - 0.5) * 720,
        shape: Math.random() > 0.4 ? "rect" : "circle",
      });
    }
    setParticles(next);
    const t = setTimeout(() => setParticles([]), 2600);
    return () => clearTimeout(t);
  }, [trigger]);

  if (particles.length === 0) return null;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden z-20">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.shape === "rect" ? p.size * 0.5 : p.size,
            backgroundColor: p.color,
            borderRadius: p.shape === "circle" ? "50%" : "2px",
            transform: `translate(0px, 0px) rotate(${p.rotation}deg)`,
            animation: `confetti-fly-${p.id} 2.5s cubic-bezier(0.2, 0.6, 0.4, 1) forwards`,
          }}
        />
      ))}
      <style jsx>{`
        ${particles
          .map((p) => {
            const dx = Math.cos(p.angle) * p.velocity;
            const dy = Math.sin(p.angle) * p.velocity;
            const finalY = dy + 600; // gravity drop
            return `@keyframes confetti-fly-${p.id} {
              0% { transform: translate(0px, 0px) rotate(${p.rotation}deg); opacity: 1; }
              60% { opacity: 1; }
              100% { transform: translate(${dx}px, ${finalY}px) rotate(${p.rotation + p.spin}deg); opacity: 0; }
            }`;
          })
          .join("\n")}
      `}</style>
    </div>
  );
}
