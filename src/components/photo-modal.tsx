"use client";

import { useEffect, useCallback, useState, useRef } from "react";
import { PhotoEntry, VotingPeriod } from "@/lib/types";
import { SchoolBadge } from "./school-badge";
import { trackEvent } from "@/lib/analytics";

interface PhotoModalProps {
  entry: PhotoEntry | null;
  voted: boolean;
  onVote: (id: string) => void;
  onUnvote: (id: string) => void;
  onClose: () => void;
  canVote?: boolean;
  votingStatus?: "before" | "during" | "after";
  votingPeriod?: VotingPeriod | null;
}

export function PhotoModal({ entry, voted, onVote, onUnvote, onClose, canVote = true, votingStatus = "during" }: PhotoModalProps) {
  const [votePulse, setVotePulse] = useState(false);
  const [closing, setClosing] = useState(false);
  const [visible, setVisible] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
    if (entry) {
      setVotePulse(false);
      setClosing(false);
      setImageLoaded(false);
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
    }, 200);
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
    if (voted) {
      onUnvote(entry.id);
      trackEvent("vote_cancel", { photo_id: entry.id, school: entry.school });
    } else {
      onVote(entry.id);
      setVotePulse(true);
      setTimeout(() => setVotePulse(false), 500);
      trackEvent("vote_complete", { photo_id: entry.id, school: entry.school });
    }
  };

  const handleShare = () => {
    const url = typeof window !== "undefined" ? `${window.location.origin}/photo/${entry.id}` : "";
    const text = `${entry.nickname}님의 사진에 투표해주세요! 제1회 캠퍼스 사진 고연전 - ${entry.school === "yonsei" ? "연세대" : "고려대"} 지원 사격! ${url}`;
    if (navigator.share) {
      navigator.share({ text }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text);
      alert("링크가 복사되었습니다!");
    }
    trackEvent("share_photo", { photo_id: entry.id, school: entry.school });
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

        {/* Photo */}
        <div className="relative overflow-hidden p-3 pb-0">
          {!imageLoaded && (
            <div className="w-full rounded-2xl skeleton-shimmer" style={{ paddingBottom: "125%" }} />
          )}
          <img
            src={entry.image_url}
            alt={entry.nickname}
            className={`w-full rounded-2xl transition-opacity duration-300 ${imageLoaded ? "opacity-100" : "opacity-0 absolute inset-3"}`}
            draggable={false}
            onLoad={() => setImageLoaded(true)}
          />
        </div>

        {/* Info */}
        <div className="px-5 py-5">
          <div className="flex items-center gap-2.5 mb-5">
            <SchoolBadge school={entry.school} size="md" />
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold leading-tight">{entry.nickname}</h2>
              {entry.club && (
                <p className="text-sm text-muted mt-0.5">{entry.club}</p>
              )}
            </div>
            {voted && (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="#ff2d55">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            )}
          </div>

          {/* Vote button */}
          <button
            onClick={canVote ? triggerVote : undefined}
            className={`relative w-full py-3.5 rounded-2xl font-semibold text-base transition-all duration-300
              ${!canVote ? "opacity-50 cursor-not-allowed" : "cursor-pointer active:scale-[0.97]"}
              ${votePulse ? "animate-vote-pulse" : ""}
              ${voted
                ? "bg-heart text-white shadow-lg shadow-heart/30 border border-transparent"
                : "bg-surface text-foreground border border-border hover:bg-white/10"
              }`}
          >
            <span className="flex items-center justify-center gap-2">
              <svg width="18" height="18" viewBox="0 0 24 24" fill={voted ? "white" : "none"} stroke={voted ? "white" : "currentColor"} strokeWidth="2">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
              {!canVote
                ? (votingStatus === "before" ? "투표 기간 전" : "투표 종료")
                : voted ? "투표 취소" : "투표하기"}
            </span>
          </button>

          {/* Share button */}
          <button
            onClick={handleShare}
            className="w-full mt-2.5 py-3 rounded-2xl text-sm font-semibold text-black bg-white hover:bg-white/90 active:scale-[0.97] transition-all duration-200 cursor-pointer flex items-center justify-center gap-2"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" />
              <polyline points="16 6 12 2 8 6" />
              <line x1="12" y1="2" x2="12" y2="15" />
            </svg>
            친구에게 이 사진 영업하기
          </button>
        </div>
      </div>
    </div>
  );
}
