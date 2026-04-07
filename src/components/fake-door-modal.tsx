"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { joinWaitlist } from "@/lib/waitlist";
import { trackEvent } from "@/lib/analytics";
import { createClient } from "@/utils/supabase/client";

interface FakeDoorModalProps {
  open: boolean;
  onClose: () => void;
  source: string; // e.g. "sticky_bar" or "photo_modal"
}

type Step = "pitch" | "email" | "thanks";

export function FakeDoorModal({ open, onClose, source }: FakeDoorModalProps) {
  const [step, setStep] = useState<Step>("pitch");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [position, setPosition] = useState<number | null>(null);

  // Reset state and prefill email each time the modal opens
  useEffect(() => {
    if (!open) return;
    setStep("pitch");
    setError("");
    setPosition(null);
    trackEvent("fake_door_open", { source });

    // Prefill from logged-in user if available
    const sb = createClient();
    sb.auth.getUser().then(({ data }) => {
      if (data.user?.email) setEmail(data.user.email);
    });
  }, [open, source]);

  // Lock body scroll while open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  if (!open) return null;

  const handleStartEmail = () => {
    trackEvent("fake_door_pitch_continue", { source });
    setStep("email");
  };

  const handleSubmit = async () => {
    setError("");
    setSubmitting(true);
    const result = await joinWaitlist(email, "top10_book", source);
    setSubmitting(false);

    if (!result.success) {
      setError(result.error || "신청에 실패했습니다");
      return;
    }
    setPosition(result.position ?? null);
    trackEvent("fake_door_email_submit", { source, already_joined: result.alreadyJoined ? "1" : "0" });
    setStep("thanks");
  };

  const handleDismiss = () => {
    trackEvent("fake_door_dismiss", { source, step });
    onClose();
  };

  const handleShare = () => {
    trackEvent("fake_door_share", { source });
    const text = "제1회 캠퍼스 사진 고연전 결과가 발표됐어요! TOP 10 명예의 전당 보러가기 → https://pinpic.vercel.app";
    if (typeof navigator !== "undefined" && navigator.share) {
      navigator.share({ text }).catch(() => {});
    } else if (typeof navigator !== "undefined") {
      navigator.clipboard.writeText(text);
      alert("링크가 복사되었습니다");
    }
  };

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-modal-overlay-in"
      onClick={handleDismiss}
    >
      <div
        className="relative bg-card rounded-[28px] px-7 pt-8 pb-6 max-w-[360px] w-full border border-white/8 animate-modal-in overflow-hidden"
        style={{ boxShadow: "0 30px 80px rgba(0,0,0,0.6), 0 2px 0 rgba(255,255,255,0.05) inset" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Subtle corner glow */}
        <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full opacity-40 blur-3xl pointer-events-none" style={{ background: "radial-gradient(circle, rgba(255,200,100,0.25) 0%, transparent 70%)" }} />

        {/* Close button */}
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center cursor-pointer transition-colors z-10"
          aria-label="닫기"
        >
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
            <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>

        {step === "pitch" && (
          <>
            <div className="relative flex justify-center mb-5 mt-1">
              <span className="text-[10px] font-semibold tracking-[0.15em] text-yellow-300/90 uppercase px-2.5 py-1 rounded-full border border-yellow-300/20 bg-yellow-300/[0.04]">
                Coming soon
              </span>
            </div>

            <div className="relative flex justify-center mb-5">
              <svg width="44" height="44" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" className="text-foreground/85">
                <rect x="6" y="9" width="36" height="30" rx="3" />
                <path d="M6 18h36" />
                <circle cx="13" cy="13.5" r="0.8" fill="currentColor" />
                <circle cx="17" cy="13.5" r="0.8" fill="currentColor" />
                <path d="M14 26h20" />
                <path d="M14 30h14" />
                <path d="M14 34h10" />
              </svg>
            </div>

            <h3 className="relative text-[18px] font-bold text-center tracking-tight mb-2">
              TOP 10 비하인드 북, 곧 출시돼요
            </h3>
            <p className="relative text-[12.5px] text-muted text-center leading-relaxed mb-1">
              상위 10작의 촬영지, 카메라, 렌즈, 세팅값,<br />
              보정 레시피와 작가 코멘트까지.
            </p>
            <p className="relative text-[12px] text-muted/80 text-center leading-relaxed mb-6">
              작가님들 동의 받아 정성스럽게 정리 중이에요.
            </p>

            <button
              onClick={handleStartEmail}
              className="relative w-full py-3.5 rounded-2xl text-[14px] font-bold text-black cursor-pointer active:scale-[0.97] transition-all"
              style={{
                background: "linear-gradient(135deg, #ffd700 0%, #ffb700 50%, #ff8a00 100%)",
                boxShadow: "0 6px 20px rgba(255,170,0,0.35)",
              }}
            >
              990원에 사전신청 하기
            </button>
            <button
              onClick={handleDismiss}
              className="relative w-full mt-2 py-2.5 text-[12px] font-medium text-muted hover:text-foreground transition-colors cursor-pointer"
            >
              지금은 괜찮아요
            </button>
          </>
        )}

        {step === "email" && (
          <>
            <div className="relative flex justify-center mb-5 mt-1">
              <svg width="40" height="40" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" className="text-foreground/85">
                <rect x="6" y="11" width="36" height="26" rx="3" />
                <path d="M6 14l18 13L42 14" />
              </svg>
            </div>
            <h3 className="relative text-[17px] font-bold text-center tracking-tight mb-1.5">
              이메일을 알려주세요
            </h3>
            <p className="relative text-[12px] text-muted text-center mb-5">
              완성되는 대로 가장 먼저 보내드릴게요
            </p>

            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(""); }}
              onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
              placeholder="your@email.com"
              autoFocus
              className="relative w-full bg-black/30 text-sm text-foreground px-4 py-3 rounded-2xl border border-white/10 outline-none placeholder:text-muted/40 focus:border-white/25 transition-colors mb-2"
            />
            {error && (
              <p className="relative text-[11px] text-red-400 mb-2 px-1">{error}</p>
            )}

            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="relative w-full mt-3 py-3.5 rounded-2xl text-[14px] font-bold text-black cursor-pointer active:scale-[0.97] transition-all disabled:opacity-60"
              style={{
                background: "linear-gradient(135deg, #ffd700 0%, #ffb700 50%, #ff8a00 100%)",
                boxShadow: "0 6px 20px rgba(255,170,0,0.35)",
              }}
            >
              {submitting ? "신청 중..." : "사전 신청 완료"}
            </button>
            <button
              onClick={handleDismiss}
              className="relative w-full mt-2 py-2.5 text-[12px] font-medium text-muted hover:text-foreground transition-colors cursor-pointer"
            >
              취소
            </button>
          </>
        )}

        {step === "thanks" && (
          <>
            <div className="relative flex justify-center mb-3 mt-1">
              <div className="text-3xl">✨</div>
            </div>
            <h3 className="relative text-[18px] font-bold text-center tracking-tight mb-2">
              신청 완료
            </h3>
            {position !== null && (
              <p className="relative text-[13px] text-muted text-center mb-1">
                당신은 <span className="text-yellow-300 font-bold">#{position}</span>번째 얼리버드예요
              </p>
            )}
            <p className="relative text-[12px] text-muted/80 text-center mb-6 leading-relaxed">
              완성되면 <span className="text-foreground/90">{email}</span> 으로<br />
              가장 먼저 보내드릴게요.
            </p>

            <button
              onClick={handleShare}
              className="relative w-full py-3 rounded-2xl text-[13px] font-semibold text-foreground bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 cursor-pointer active:scale-[0.97] transition-all flex items-center justify-center gap-2"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" />
                <polyline points="16 6 12 2 8 6" />
                <line x1="12" y1="2" x2="12" y2="15" />
              </svg>
              결과 친구에게 공유하기
            </button>
            <button
              onClick={handleDismiss}
              className="relative w-full mt-2 py-2.5 text-[12px] font-medium text-muted hover:text-foreground transition-colors cursor-pointer"
            >
              닫기
            </button>
          </>
        )}
      </div>
    </div>,
    document.body
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-[12px] text-muted">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#ffd700" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
        <polyline points="20 6 9 17 4 12" />
      </svg>
      <span>{children}</span>
    </div>
  );
}
