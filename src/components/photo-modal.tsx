"use client";

import { useEffect, useCallback, useState, useRef } from "react";
import { PhotoEntry, VotingPeriod, RevealMode } from "@/lib/types";
import { SchoolBadge } from "./school-badge";
import { useAuth } from "./auth-provider";
import { trackEvent } from "@/lib/analytics";
import { recordPhotoClick, recordPhotoView, recordFakeDoorClick } from "@/lib/api";
import { FakeDoorModal } from "./fake-door-modal";

interface PhotoModalProps {
  entry: PhotoEntry | null;
  voted: boolean;
  onVote: (id: string) => void;
  onUnvote: (id: string) => void;
  onClose: () => void;
  canVote?: boolean;
  votingStatus?: "before" | "during" | "after";
  votingPeriod?: VotingPeriod | null;
  revealMode?: RevealMode;
  isTopRank?: boolean;
}

export function PhotoModal({ entry, voted, onVote, onUnvote, onClose, canVote = true, votingStatus = "during", votingPeriod, revealMode = "hidden", isTopRank = false }: PhotoModalProps) {
  const { isAdmin } = useAuth();
  const [votePulse, setVotePulse] = useState(false);
  const [closing, setClosing] = useState(false);
  const [showInfoTeaser, setShowInfoTeaser] = useState(false);
  const [showAdGate, setShowAdGate] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [visible, setVisible] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const revealed = revealMode !== "hidden";

  // Record view (non-admin only)
  useEffect(() => {
    if (entry && !isAdmin) {
      recordPhotoView(entry.id);
    }
  }, [entry, isAdmin]);

  useEffect(() => {
    if (entry) {
      setVotePulse(false);
      setClosing(false);
      setImageLoaded(false);
      setShowInfoTeaser(false);
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

  const addWatermark = (imgBlob: Blob): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0);

        const fontSize = Math.max(11, img.width * 0.022);
        ctx.font = `600 ${fontSize}px -apple-system, BlinkMacSystemFont, sans-serif`;
        const label = "pinpic.vercel.app";
        const tw = ctx.measureText(label).width;
        const px = fontSize * 0.7;
        const py = fontSize * 0.45;
        const bw = tw + px * 2;
        const bh = fontSize + py * 2;
        const m = fontSize * 0.7;
        const bx = img.width - bw - m;
        const by = img.height - bh - m;
        const r = bh / 2;

        ctx.beginPath();
        ctx.moveTo(bx + r, by);
        ctx.lineTo(bx + bw - r, by);
        ctx.arcTo(bx + bw, by, bx + bw, by + r, r);
        ctx.arcTo(bx + bw, by + bh, bx + bw - r, by + bh, r);
        ctx.lineTo(bx + r, by + bh);
        ctx.arcTo(bx, by + bh, bx, by + bh - r, r);
        ctx.arcTo(bx, by, bx + r, by, r);
        ctx.closePath();
        ctx.fillStyle = "rgba(0,0,0,0.55)";
        ctx.fill();

        ctx.fillStyle = "rgba(255,255,255,0.9)";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(label, bx + bw / 2, by + bh / 2 + 0.5);

        canvas.toBlob((b) => b ? resolve(b) : reject(), "image/jpeg", 0.92);
      };
      img.onerror = reject;
      img.src = URL.createObjectURL(imgBlob);
    });
  };

  const handleShare = async () => {
    const url = typeof window !== "undefined" ? `${window.location.origin}/photo/${entry.id}` : "";
    const text = `${entry.nickname}님의 사진에 투표해주세요! 제1회 캠퍼스 사진 고연전 - ${entry.school === "yonsei" ? "연세대" : "고려대"} 지원 사격!\n${url}`;

    if (navigator.share) {
      try {
        const imgUrl = entry.thumb_url || entry.image_url;
        const res = await fetch(imgUrl);
        const blob = await res.blob();
        const watermarked = await addWatermark(blob);
        const file = new File([watermarked], `pinpic-${entry.nickname}.jpg`, { type: "image/jpeg" });

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({ text, files: [file] });
        } else {
          await navigator.share({ text });
        }
      } catch {
        try { await navigator.share({ text }); } catch {}
      }
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
        <div className="sticky top-0 z-10 flex justify-end p-4 pb-0 -mb-13">
          <button
            onClick={handleClose}
            className="w-9 h-9 rounded-full bg-black/40 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/60 hover:scale-110 active:scale-95 transition-all duration-200 cursor-pointer"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

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
          {/* Photo action icons */}
          <div className="absolute bottom-3 right-6 flex gap-2">
            <button
              onClick={() => {
                const url = `${window.location.origin}/photo/${entry.id}`;
                navigator.clipboard.writeText(url);
                setLinkCopied(true);
                setTimeout(() => setLinkCopied(false), 2000);
              }}
              className="w-9 h-9 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center hover:bg-black/70 active:scale-90 transition-all cursor-pointer"
            >
              {linkCopied ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
                  <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
                </svg>
              )}
            </button>
            <button
              onClick={handleShare}
              className="w-9 h-9 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center hover:bg-black/70 active:scale-90 transition-all cursor-pointer"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" />
                <polyline points="16 6 12 2 8 6" />
                <line x1="12" y1="2" x2="12" y2="15" />
              </svg>
            </button>
          </div>
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
              {isAdmin && !revealed && entry.location && (
                <p className="text-xs text-muted/70 mt-0.5">{entry.location}</p>
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
                ? (votingStatus === "before" ? `${formatKST(votingPeriod?.start)}부터 투표 시작` : "투표 종료")
                : voted ? "투표 취소" : "투표하기"}
            </span>
          </button>

          {/* Info section: behavior depends on reveal mode and rank */}
          {!revealed ? (
            <button
              onClick={() => { setShowInfoTeaser(true); if (!isAdmin) recordPhotoClick(entry.id); }}
              className="w-full mt-2.5 py-3 rounded-2xl text-sm font-semibold text-black bg-white hover:bg-white/90 active:scale-[0.97] transition-all duration-200 cursor-pointer flex items-center justify-center gap-2"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
              촬영 스팟 및 설정값 보기
            </button>
          ) : (
            <div className="mt-3 space-y-2">
              {/* Location is intentionally hidden so the fake-door unlock keeps its purpose */}

              {/* Fake door — shown for ALL photos in reveal mode (intentional, hides which photos are top10) */}
              <button
                onClick={() => { setShowAdGate(true); trackEvent("fake_door_click", { source: "photo_modal", photo_id: entry.id }); recordFakeDoorClick({ source: "photo_modal", photoId: entry.id }); }}
                className="relative w-full h-12 px-5 rounded-2xl text-sm font-bold text-white overflow-hidden cursor-pointer active:scale-[0.97] transition-all duration-200"
                style={{
                  background: "linear-gradient(135deg, #1a6dff 0%, #1a6dff 25%, #6b1f8a 50%, #e8193e 75%, #e8193e 100%)",
                  boxShadow:
                    "inset 0 2px 4px rgba(255,255,255,0.25), " +
                    "inset 0 -2px 4px rgba(0,0,0,0.45), " +
                    "inset 0 0 0 1px rgba(255,255,255,0.12), " +
                    "0 10px 28px rgba(0,0,0,0.5)",
                }}
              >
                <div
                  className="absolute inset-x-0 top-0 h-1/2 pointer-events-none"
                  style={{
                    background: "linear-gradient(180deg, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0.04) 60%, transparent 100%)",
                    borderRadius: "16px 16px 0 0",
                  }}
                />
                <div
                  className="absolute inset-x-0 bottom-0 h-1/3 pointer-events-none"
                  style={{
                    background: "linear-gradient(0deg, rgba(0,0,0,0.3) 0%, transparent 100%)",
                    borderRadius: "0 0 16px 16px",
                  }}
                />
                <span className="relative flex items-center justify-between gap-2 drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]">
                  <span className="flex items-center gap-2">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0110 0v4" />
                    </svg>
                    TOP 10 비밀 전부 열기
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="text-[14px] font-black">₩990</span>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </span>
                </span>
              </button>
            </div>
          )}
        </div>
      </div>

      <FakeDoorModal open={showAdGate} onClose={() => setShowAdGate(false)} source="photo_modal" />

      {showInfoTeaser && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 animate-modal-overlay-in" onClick={() => setShowInfoTeaser(false)}>
          <div className="bg-card rounded-3xl p-6 max-w-xs w-full text-center border border-white/10 animate-modal-in"
            style={{ boxShadow: "0 25px 60px rgba(0,0,0,0.5)" }}
            onClick={(e) => e.stopPropagation()}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-3 text-muted">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4" />
              <path d="M12 8h.01" />
            </svg>
            <h3 className="text-base font-bold mb-1">촬영 장소 및 상세 정보</h3>
            <p className="text-xs text-muted mb-1">결과 발표 시 공개됩니다</p>
            <p className="text-lg font-bold mb-3">4월 8일</p>
            <p className="text-xs text-muted mb-4">보고싶은 사진에 투표해주세요!</p>
            <button
              onClick={() => setShowInfoTeaser(false)}
              className="w-full py-2.5 bg-white text-black text-sm font-semibold rounded-xl cursor-pointer active:scale-[0.97] transition-all"
            >
              확인
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function formatKST(utcStr?: string): string {
  if (!utcStr) return "";
  const d = new Date(utcStr);
  return d.toLocaleString("ko-KR", { timeZone: "Asia/Seoul", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });
}
