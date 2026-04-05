"use client";

import { useEffect, useRef, useState } from "react";
import { PhotoEntry } from "@/lib/types";
import { SchoolBadge } from "./school-badge";
import { getThumbUrl } from "@/lib/image";

interface PhotoCardProps {
  entry: PhotoEntry;
  index: number;
  voted: boolean;
  onClick: (entry: PhotoEntry) => void;
}

export function PhotoCard({ entry, index, voted, onClick }: PhotoCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "50px", threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const stagger = Math.min(index % 10, 6) * 0.07;

  return (
    <div
      ref={ref}
      className={`w-full mb-3 break-inside-avoid group cursor-pointer select-none
        ${visible ? "animate-card-rise" : "opacity-0"}`}
      style={{ animationDelay: visible ? `${stagger}s` : undefined }}
      onClick={() => onClick(entry)}
    >
      <div className="relative rounded-2xl overflow-hidden bg-surface transition-all duration-300 group-hover:shadow-xl group-hover:shadow-black/30">
        {!imageLoaded && (
          <div className="w-full skeleton-shimmer rounded-2xl" style={{ paddingBottom: "125%" }} />
        )}
        <img
          src={getThumbUrl(entry.image_url, 400)}
          alt={entry.nickname}
          className={`w-full block transition-transform duration-500 ease-out group-hover:scale-[1.05]
            ${imageLoaded ? "animate-image-reveal" : "opacity-0"}`}
          loading="lazy"
          draggable={false}
          onLoad={() => setImageLoaded(true)}
        />

        <div className="absolute top-2.5 left-2.5">
          <SchoolBadge school={entry.school} />
        </div>

        {voted && (
          <div className="absolute top-2.5 right-2.5 animate-card-rise">
            <div className="w-7 h-7 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="#ff2d55">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </div>
          </div>
        )}

        {/* Bottom gradient for text */}
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-linear-to-t from-black/70 via-black/30 to-transparent pointer-events-none" />
        <div className="absolute inset-0 bg-linear-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-400 pointer-events-none" />

        {/* Text overlay */}
        <div className="absolute inset-x-0 bottom-0 px-2.5 pb-2.5 pointer-events-none">
          <p className="text-sm font-semibold text-white leading-tight truncate drop-shadow-md">
            {entry.nickname}
          </p>
          <div className="flex items-center justify-between mt-0.5">
            {entry.club ? (
              <p className="text-[11px] text-white/70">{entry.club}</p>
            ) : (
              <span />
            )}
            <div className="flex items-center gap-1">
              {voted && (
                <svg width="10" height="10" viewBox="0 0 24 24" fill="#ff2d55">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
              )}
              <p className="text-[11px] font-medium text-white/80">
                {entry.votes}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
