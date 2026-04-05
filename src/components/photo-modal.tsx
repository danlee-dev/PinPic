"use client";

import { useEffect, useCallback, useState, useRef } from "react";
import { PhotoEntry } from "@/lib/types";
import { SchoolBadge } from "./school-badge";
import { VoteBurst } from "./vote-burst";

interface PhotoModalProps {
  entry: PhotoEntry | null;
  voted: boolean;
  onVote: (id: string) => void;
  onClose: () => void;
}

export function PhotoModal({ entry, voted, onVote, onClose }: PhotoModalProps) {
  const [showParticles, setShowParticles] = useState(false);
  const [votePulse, setVotePulse] = useState(false);
  const [closing, setClosing] = useState(false);
  const [visible, setVisible] = useState(false);
  const [showBurst, setShowBurst] = useState(false);
  const lastTapRef = useRef(0);

  useEffect(() => {
    if (entry) {
      setShowParticles(false);
      setVotePulse(false);
      setClosing(false);
      setShowBurst(false);
      requestAnimationFrame(() => setVisible(true));
    } else {
      setVisible(false);
    }
  }, [entry]);

  const handleClose = useCallback(() => {
    setClosing(true);
    setTimeout(() => {
      setVisible(false);
      onClose();
    }, 300);
  }, [onClose]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    },
    [handleClose]
  );

  useEffect(() => {
    if (!entry) return;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [entry, handleKeyDown]);

  if (!entry) return null;

  const triggerVote = () => {
    if (!voted) {
      onVote(entry.id);
      setVotePulse(true);
      setShowParticles(true);
      setTimeout(() => setVotePulse(false), 500);
      setTimeout(() => setShowParticles(false), 800);
    }
    setShowBurst(true);
    setTimeout(() => setShowBurst(false), 1000);
  };

  const handleImageDoubleTap = (e: React.MouseEvent) => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      e.preventDefault();
      triggerVote();
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
    }
  };

  const votes = entry.votes;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70
        ${closing ? "animate-modal-overlay-out" : visible ? "animate-modal-overlay-in" : "opacity-0"}`}
      onClick={handleClose}
    >
      <div
        className={`relative w-full max-w-lg bg-card rounded-3xl max-h-[90vh] overflow-y-auto hide-scrollbar border border-white/10 shadow-2xl shadow-black/50
          ${closing ? "animate-modal-out" : visible ? "animate-modal-in" : "opacity-0 scale-95"}`}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-black/40 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/60 hover:scale-110 active:scale-95 transition-all duration-200 cursor-pointer"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>

        <div
          className="relative overflow-hidden select-none cursor-pointer p-3 pb-0"
          onMouseDown={handleImageDoubleTap}
        >
          <img
            src={entry.image_url}
            alt={entry.nickname}
            className="w-full rounded-2xl"
            draggable={false}
          />
          <VoteBurst active={showBurst} />
        </div>

        <div className="px-5 py-5">
          <div className="flex items-center gap-2.5 mb-5">
            <SchoolBadge school={entry.school} size="md" />
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold leading-tight">{entry.nickname}</h2>
              {entry.club && (
                <p className="text-sm text-muted mt-0.5">{entry.club}</p>
              )}
            </div>
            <div className="text-right">
              <p className="text-xl font-bold">{votes}</p>
              <p className="text-[10px] text-muted uppercase tracking-wider">votes</p>
            </div>
          </div>

          <div className="relative">
            {showParticles && (
              <div className="absolute inset-0 pointer-events-none overflow-visible z-10">
                {Array.from({ length: 10 }, (_, i) => {
                  const angle = (i / 10) * Math.PI * 2;
                  const dist = 20 + Math.random() * 15;
                  return (
                    <span
                      key={i}
                      className="vote-particle absolute rounded-full"
                      style={{
                        width: 5,
                        height: 5,
                        backgroundColor: "#ff2d55",
                        left: "50%",
                        top: "50%",
                        "--px": `${Math.cos(angle) * dist}px`,
                        "--py": `${Math.sin(angle) * dist}px`,
                        animationDelay: `${Math.random() * 0.15}s`,
                      } as React.CSSProperties}
                    />
                  );
                })}
              </div>
            )}

            <button
              onClick={triggerVote}
              className={`relative w-full py-3.5 rounded-2xl font-semibold text-base transition-all duration-300 cursor-pointer
                ${votePulse ? "animate-vote-pulse" : ""}
                ${voted
                  ? "bg-heart text-white shadow-lg shadow-heart/30"
                  : "bg-surface text-foreground border border-border hover:bg-white/10 active:scale-[0.97]"
                }`}
            >
              <span className="flex items-center justify-center gap-2">
                <svg width="18" height="18" viewBox="0 0 24 24" fill={voted ? "white" : "none"} stroke={voted ? "white" : "currentColor"} strokeWidth="2">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
                {voted ? "투표 완료" : "투표하기"}
              </span>
            </button>

            {!voted && (
              <p className="text-center text-[11px] text-muted mt-2">사진을 더블탭해서 투표하세요</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
