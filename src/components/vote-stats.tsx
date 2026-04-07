"use client";

import { useEffect, useRef, useState } from "react";
import { PhotoEntry, RevealMode } from "@/lib/types";
import { ConfettiBurst } from "./confetti-burst";
import { FakeDoorModal } from "./fake-door-modal";
import { SchoolBadge } from "./school-badge";
import { trackEvent } from "@/lib/analytics";
import { fetchVoteOverrides, recordFakeDoorClick } from "@/lib/api";

interface VoteStatsProps {
  entries: PhotoEntry[];
  votedIds: Set<string>;
  onPhotoClick: (entry: PhotoEntry) => void;
  revealMode?: RevealMode;
}

export function VoteStats({ entries, votedIds, onPhotoClick, revealMode = "hidden" }: VoteStatsProps) {
  const [animated, setAnimated] = useState(false);
  const [confettiKey, setConfettiKey] = useState(0);
  const [fakeDoorOpen, setFakeDoorOpen] = useState(false);
  const [fakeDoorSource, setFakeDoorSource] = useState("sticky_bar");
  const [voteOverrides, setVoteOverrides] = useState<Map<string, number>>(new Map());

  // Load vote overrides once on mount (only used to skew the displayed TOP 10)
  useEffect(() => {
    fetchVoteOverrides().then(setVoteOverrides);
  }, []);
  const revealed = revealMode !== "hidden";

  const openFakeDoor = (src: string, photoId?: string) => {
    setFakeDoorSource(src);
    setFakeDoorOpen(true);
    trackEvent("fake_door_click", { source: src });
    recordFakeDoorClick({ source: src, photoId });
  };

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 100);
    return () => clearTimeout(t);
  }, []);

  // Replay confetti every time the user opens this tab in reveal mode
  useEffect(() => {
    if (revealed) setConfettiKey((k) => k + 1);
  }, [revealed]);

  const yonseiEntries = entries.filter((e) => e.school === "yonsei");
  const koreaEntries = entries.filter((e) => e.school === "korea");

  const yonseiVotes = yonseiEntries.reduce((sum, e) => sum + e.votes, 0);
  const koreaVotes = koreaEntries.reduce((sum, e) => sum + e.votes, 0);
  const totalVotes = yonseiVotes + koreaVotes;

  const yonseiPct = totalVotes === 0 ? 0 : Math.round((yonseiVotes / totalVotes) * 100);
  const koreaPct = totalVotes === 0 ? 0 : 100 - yonseiPct;

  const yonseiVotedCount = yonseiEntries.filter((e) => votedIds.has(e.id)).length;
  const koreaVotedCount = koreaEntries.filter((e) => votedIds.has(e.id)).length;

  // Apply vote_overrides for the Hall of Fame display only.
  // Real vote totals (mini bar, school totals) stay untouched above.
  const displayVotes = (e: PhotoEntry) => Math.max(0, e.votes + (voteOverrides.get(e.id) ?? 0));
  const sortedByVotes = [...entries]
    .map((e) => ({ ...e, votes: displayVotes(e) }))
    .sort((a, b) => b.votes - a.votes);
  const winnerSchool: "yonsei" | "korea" | "tie" =
    yonseiVotes === koreaVotes ? "tie" : (yonseiVotes > koreaVotes ? "yonsei" : "korea");

  return (
    <div className="max-w-3xl mx-auto px-4 pt-2 pb-28">
      {/* === REVEAL MODE: Hall of Fame Hero === */}
      {revealed && (
        <div className="relative rounded-3xl pt-7 pb-5 px-5 mb-5 overflow-hidden animate-card-rise"
          style={{
            background: "linear-gradient(135deg, rgba(26,109,255,0.10) 0%, rgba(10,10,10,0.92) 40%, rgba(10,10,10,0.92) 60%, rgba(232,25,62,0.10) 100%)",
          }}
        >
          <ConfettiBurst trigger={confettiKey} />
          <div className="absolute inset-0 rounded-3xl pointer-events-none" style={{ border: "1px solid rgba(255,255,255,0.08)" }} />

          <div className="relative text-center">
            <p className="text-[11px] font-bold tracking-[0.2em] text-foreground/60 uppercase mb-1">Hall of Fame</p>
            <h2 className="text-3xl font-black tracking-tight mb-1">명예의 전당</h2>
            <p className="text-xs text-muted mb-4">제1회 캠퍼스 사진 고연전 결과 발표</p>

            {/* Slim, finalized vote bar */}
            <div className="max-w-xs mx-auto">
              <div className="flex items-center justify-between mb-1.5 text-[11px]">
                <div className="flex items-center gap-1.5">
                  <img src="/yonsei-logo.png" alt="연세대" className="w-4 h-4 rounded-full object-cover" />
                  <span className={`font-bold ${yonseiPct === 0 ? "text-muted" : "text-yonsei"}`}>{yonseiPct}%</span>
                </div>
                <span className="text-muted text-[10px]">최종 {totalVotes.toLocaleString()}표</span>
                <div className="flex items-center gap-1.5">
                  <span className={`font-bold ${koreaPct === 0 ? "text-muted" : "text-korea"}`}>{koreaPct}%</span>
                  <img src="/korea-logo.png" alt="고려대" className="w-4 h-4 object-contain" />
                </div>
              </div>
              <div
                className="relative h-7 rounded-full overflow-hidden bg-[#2a2a2a]"
                style={{
                  boxShadow:
                    "inset 0 2px 4px rgba(0,0,0,0.5), " +
                    "inset 0 -1px 2px rgba(255,255,255,0.08), " +
                    "0 4px 14px rgba(0,0,0,0.4)",
                }}
              >
                <div className="absolute inset-y-0 left-0 transition-transform duration-1000 ease-out"
                  style={{
                    width: totalVotes === 0 ? "0%" : `${yonseiPct}%`,
                    background: "linear-gradient(to right, #1a6dff 0%, #1a6dff 60%, #3a2a6a 100%)",
                    transformOrigin: "left",
                    transform: animated ? "scaleX(1)" : "scaleX(0)",
                  }} />
                <div className="absolute inset-y-0 right-0 transition-transform duration-1000 ease-out"
                  style={{
                    width: totalVotes === 0 ? "0%" : `${koreaPct}%`,
                    background: "linear-gradient(to left, #e8193e 0%, #e8193e 60%, #6a1a3a 100%)",
                    transformOrigin: "right",
                    transform: animated ? "scaleX(1)" : "scaleX(0)",
                  }} />
                {/* Top convex highlight */}
                <div
                  className="absolute inset-x-0 top-0 h-1/2 pointer-events-none"
                  style={{
                    background: "linear-gradient(180deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.04) 60%, transparent 100%)",
                    borderRadius: "9999px 9999px 0 0",
                  }}
                />
                {/* Bottom shadow for depth */}
                <div
                  className="absolute inset-x-0 bottom-0 h-1/3 pointer-events-none"
                  style={{
                    background: "linear-gradient(0deg, rgba(0,0,0,0.3) 0%, transparent 100%)",
                    borderRadius: "0 0 9999px 9999px",
                  }}
                />
                {/* Edge highlight */}
                <div
                  className="absolute inset-0 rounded-full pointer-events-none"
                  style={{ border: "1px solid rgba(255,255,255,0.1)" }}
                />
              </div>
              {winnerSchool !== "tie" && (
                <p className="mt-3 text-[11px] font-semibold">
                  <span className={winnerSchool === "yonsei" ? "text-yonsei" : "text-korea"}>
                    {winnerSchool === "yonsei" ? "연세대" : "고려대"}
                  </span>
                  <span className="text-muted"> 승리</span>
                </p>
              )}

              {/* Compact stats row — replaces the two large detail cards in reveal mode */}
              <div className="mt-4 pt-3 border-t border-white/10 grid grid-cols-2 gap-3 text-left">
                <div className="flex items-center gap-2">
                  <img src="/yonsei-logo.png" alt="연세대" className="w-6 h-6 rounded-full object-cover shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] text-muted leading-none">출품 <span className="text-yonsei font-bold">{yonseiEntries.length}</span></p>
                    <p className="text-[10px] text-muted leading-none mt-1">내 투표 <span className="text-foreground font-bold">{yonseiVotedCount}</span></p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <img src="/korea-logo.png" alt="고려대" className="w-6 h-6 object-contain shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] text-muted leading-none">출품 <span className="text-korea font-bold">{koreaEntries.length}</span></p>
                    <p className="text-[10px] text-muted leading-none mt-1">내 투표 <span className="text-foreground font-bold">{koreaVotedCount}</span></p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* === BEFORE REVEAL: Original live battle hero === */}
      {!revealed && (
      <div
        className="relative text-center rounded-3xl pt-8 pb-6 px-5 mb-6 animate-card-rise overflow-hidden"
        style={{
          background: "linear-gradient(135deg, rgba(26,109,255,0.12) 0%, rgba(10,10,10,0.9) 40%, rgba(10,10,10,0.9) 60%, rgba(232,25,62,0.12) 100%)",
        }}
      >
        <div className="absolute top-0 left-0 w-32 h-32 rounded-full opacity-30 blur-3xl pointer-events-none" style={{ background: "radial-gradient(circle, #1a6dff 0%, transparent 70%)" }} />
        <div className="absolute bottom-0 right-0 w-32 h-32 rounded-full opacity-30 blur-3xl pointer-events-none" style={{ background: "radial-gradient(circle, #e8193e 0%, transparent 70%)" }} />
        <div className="absolute inset-0 rounded-3xl pointer-events-none" style={{ border: "1px solid rgba(255,255,255,0.06)" }} />

        <h2 className="relative text-2xl font-bold tracking-tight mb-1">실시간 투표 현황</h2>
        <p className="relative text-sm text-muted mb-6">연세대 vs 고려대</p>

        {/* Battle stats */}
        <div className="relative">
          <div className="relative flex items-end justify-between mb-3">
            <div className="text-left flex items-center gap-2">
              <img src="/yonsei-logo.png" alt="연세대" className="w-8 h-8 rounded-full object-cover" />
              <div>
                <p className={`text-xs font-semibold uppercase tracking-wider ${yonseiPct === 0 ? "text-muted" : "text-yonsei"}`}>연세대</p>
                <p className={`text-3xl font-black leading-none ${yonseiPct === 0 ? "text-muted" : "text-yonsei"}`}>{yonseiPct}%</p>
              </div>
            </div>
            <div className="absolute left-1/2 -translate-x-1/2 bottom-1 text-xs text-muted font-medium px-3 py-1 rounded-full" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
              총 {totalVotes.toLocaleString()}표
            </div>
            <div className="text-right flex items-center gap-2">
              <div>
                <p className={`text-xs font-semibold uppercase tracking-wider ${koreaPct === 0 ? "text-muted" : "text-korea"}`}>고려대</p>
                <p className={`text-3xl font-black leading-none ${koreaPct === 0 ? "text-muted" : "text-korea"}`}>{koreaPct}%</p>
              </div>
              <img src="/korea-logo.png" alt="고려대" className="w-8 h-8 object-contain" />
            </div>
          </div>

        {/* Progress bar */}
        <div
          className="relative h-14 rounded-[20px] overflow-hidden mb-2 bg-[#1a1a1a]"
          style={{
            boxShadow: "0 8px 32px rgba(0,0,0,0.4), inset 0 2px 4px rgba(255,255,255,0.1), inset 0 -2px 4px rgba(0,0,0,0.3)",
          }}
        >
          {/* Yonsei fills from left, Korea fills from right */}
          <div className="absolute inset-y-0 left-0 transition-transform duration-1000 ease-out"
            style={{
              width: totalVotes === 0 ? "0%" : `${yonseiPct}%`,
              background: "linear-gradient(to right, #1a6dff 0%, #1a6dff 60%, #3a2a6a 100%)",
              transformOrigin: "left",
              transform: animated ? "scaleX(1)" : "scaleX(0)",
            }} />
          <div className="absolute inset-y-0 right-0 transition-transform duration-1000 ease-out"
            style={{
              width: totalVotes === 0 ? "0%" : `${koreaPct}%`,
              background: "linear-gradient(to left, #e8193e 0%, #e8193e 60%, #6a1a3a 100%)",
              transformOrigin: "right",
              transform: animated ? "scaleX(1)" : "scaleX(0)",
            }} />
          {/* Top convex highlight */}
          <div
            className="absolute inset-x-0 top-0 h-1/2 pointer-events-none"
            style={{
              background: "linear-gradient(180deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.03) 40%, transparent 100%)",
              borderRadius: "20px 20px 0 0",
            }}
          />
          {/* Bottom shadow for depth */}
          <div
            className="absolute inset-x-0 bottom-0 h-1/3 pointer-events-none"
            style={{
              background: "linear-gradient(0deg, rgba(0,0,0,0.2) 0%, transparent 100%)",
            }}
          />
          {/* Edge highlight */}
          <div className="absolute inset-0 rounded-[20px] pointer-events-none" style={{ border: "1px solid rgba(255,255,255,0.08)" }} />

          {/* Vote counts */}
          <div className="absolute inset-0 flex items-center justify-between px-5">
            <span className="text-white text-sm font-bold drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
              {yonseiVotes.toLocaleString()}
            </span>
            <span className="text-white text-sm font-bold drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
              {koreaVotes.toLocaleString()}
            </span>
          </div>
        </div>
        </div>
      </div>
      )}

      {/* SVG filter for liquid glass refraction */}
      <svg className="absolute w-0 h-0">
        <defs>
          <filter id="liquid-glass">
            <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur" />
            <feSpecularLighting in="blur" surfaceScale="4" specularConstant="0.8" specularExponent="30" result="specular">
              <fePointLight x="100" y="50" z="200" />
            </feSpecularLighting>
            <feComposite in="specular" in2="SourceGraphic" operator="in" result="specClip" />
            <feComposite in="SourceGraphic" in2="specClip" operator="arithmetic" k1="0" k2="1" k3="0.3" k4="0" />
          </filter>
        </defs>
      </svg>

      {/* Detail cards - Liquid Glass — hidden in reveal mode (data is folded into the hero above) */}
      {!revealed && (
      <div className="grid grid-cols-2 gap-3 mt-6">
        <div
          className="liquid-glass-card relative rounded-3xl p-4 animate-card-rise overflow-hidden"
          style={{
            animationDelay: "0.2s",
            background: "linear-gradient(135deg, rgba(26,109,255,0.08) 0%, rgba(255,255,255,0.03) 50%, rgba(26,109,255,0.05) 100%)",
            backdropFilter: "blur(20px) saturate(1.4)",
            WebkitBackdropFilter: "blur(20px) saturate(1.4)",
          }}
        >
          {/* Glass highlight - top edge */}
          <div className="absolute inset-x-0 top-0 h-[1px] bg-linear-to-r from-transparent via-white/30 to-transparent" />
          {/* Glass highlight - left edge */}
          <div className="absolute inset-y-0 left-0 w-[1px] bg-linear-to-b from-white/20 via-transparent to-transparent" />
          {/* Inner glow border */}
          <div
            className="absolute inset-0 rounded-3xl pointer-events-none"
            style={{
              border: "1px solid rgba(26,109,255,0.2)",
              boxShadow: "inset 0 1px 1px rgba(255,255,255,0.1), inset 0 -1px 1px rgba(26,109,255,0.1), 0 0 20px rgba(26,109,255,0.08)",
            }}
          />
          {/* Convex refraction highlight */}
          <div
            className="absolute top-2 left-2 right-2 h-12 rounded-2xl pointer-events-none"
            style={{
              background: "linear-gradient(180deg, rgba(255,255,255,0.07) 0%, transparent 100%)",
            }}
          />

          <img src="/yonsei-logo.png" alt="연세대" className="relative w-10 h-10 object-contain mb-3 drop-shadow-sm" />
          <p className="relative text-2xl font-black text-yonsei">{yonseiEntries.length}</p>
          <p className="relative text-xs text-muted mt-0.5">출품작</p>
          <div className="relative mt-3 pt-3 border-t border-white/10">
            <p className="text-lg font-bold">{yonseiVotedCount}</p>
            <p className="text-[10px] text-muted">내가 투표한 수</p>
          </div>
        </div>

        <div
          className="liquid-glass-card relative rounded-3xl p-4 animate-card-rise overflow-hidden"
          style={{
            animationDelay: "0.3s",
            background: "linear-gradient(135deg, rgba(232,25,62,0.08) 0%, rgba(255,255,255,0.03) 50%, rgba(232,25,62,0.05) 100%)",
            backdropFilter: "blur(20px) saturate(1.4)",
            WebkitBackdropFilter: "blur(20px) saturate(1.4)",
          }}
        >
          {/* Glass highlight - top edge */}
          <div className="absolute inset-x-0 top-0 h-[1px] bg-linear-to-r from-transparent via-white/30 to-transparent" />
          {/* Glass highlight - left edge */}
          <div className="absolute inset-y-0 left-0 w-[1px] bg-linear-to-b from-white/20 via-transparent to-transparent" />
          {/* Inner glow border */}
          <div
            className="absolute inset-0 rounded-3xl pointer-events-none"
            style={{
              border: "1px solid rgba(232,25,62,0.2)",
              boxShadow: "inset 0 1px 1px rgba(255,255,255,0.1), inset 0 -1px 1px rgba(232,25,62,0.1), 0 0 20px rgba(232,25,62,0.08)",
            }}
          />
          {/* Convex refraction highlight */}
          <div
            className="absolute top-2 left-2 right-2 h-12 rounded-2xl pointer-events-none"
            style={{
              background: "linear-gradient(180deg, rgba(255,255,255,0.07) 0%, transparent 100%)",
            }}
          />

          <img src="/korea-logo.png" alt="고려대" className="relative w-10 h-10 object-contain mb-3 drop-shadow-sm" />
          <p className="relative text-2xl font-black text-korea">{koreaEntries.length}</p>
          <p className="relative text-xs text-muted mt-0.5">출품작</p>
          <div className="relative mt-3 pt-3 border-t border-white/10">
            <p className="text-lg font-bold">{koreaVotedCount}</p>
            <p className="text-[10px] text-muted">내가 투표한 수</p>
          </div>
        </div>
      </div>
      )}

      {/* Inline fake-door CTA bar between hero and ranking (revealed only) */}
      {revealed && (
        <div className="mt-5 mb-1 flex justify-center">
          <button
            onClick={() => openFakeDoor("inline_bar")}
            className="relative w-full flex items-center justify-between gap-3 px-5 h-14 rounded-full text-white font-bold text-[13px] cursor-pointer active:scale-[0.98] transition-all overflow-hidden"
            style={{
              background: "linear-gradient(135deg, #1a6dff 0%, #1a6dff 25%, #6b1f8a 50%, #e8193e 75%, #e8193e 100%)",
              boxShadow:
                "inset 0 2px 4px rgba(255,255,255,0.25), " +
                "inset 0 -2px 4px rgba(0,0,0,0.45), " +
                "inset 0 0 0 1px rgba(255,255,255,0.12), " +
                "0 10px 28px rgba(0,0,0,0.5)",
            }}
          >
            {/* Top convex highlight */}
            <div
              className="absolute inset-x-0 top-0 h-1/2 pointer-events-none"
              style={{
                background: "linear-gradient(180deg, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0.04) 60%, transparent 100%)",
                borderRadius: "9999px 9999px 0 0",
              }}
            />
            {/* Bottom shadow for depth */}
            <div
              className="absolute inset-x-0 bottom-0 h-1/3 pointer-events-none"
              style={{
                background: "linear-gradient(0deg, rgba(0,0,0,0.3) 0%, transparent 100%)",
                borderRadius: "0 0 9999px 9999px",
              }}
            />

            <span className="relative flex items-center gap-2 drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0110 0v4" />
              </svg>
              TOP 10 비밀 (장소·세팅값) 전부 열기
            </span>
            <span className="relative flex items-center gap-1 drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]">
              <span className="text-[14px] font-black">₩990</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </span>
          </button>
        </div>
      )}

      {/* Ranking */}
      <div className="mt-6 animate-card-rise" style={{ animationDelay: "0.4s" }}>
        <h3 className="text-sm font-semibold mb-3">
          {revealed ? "최종 인기 순위" : "인기 순위"}
          {revealMode === "preview" && <span className="ml-2 text-[10px] font-normal text-red-400">(미리보기)</span>}
        </h3>
        {revealed ? (
          <div className="pb-28">
            <p className="text-[11px] text-muted mb-4">{totalVotes.toLocaleString()}명이 선택한 단 10장. 나머지는 잠겨 있어요.</p>

            {/* TOP 1~3 — auto-scrolling horizontal carousel, all using the hero variant */}
            <TopThreeCarousel
              entries={sortedByVotes.slice(0, 3)}
              onPhotoClick={onPhotoClick}
              onUnlock={(rank, photoId) => openFakeDoor(`inline_card_${rank}`, photoId)}
            />

            {/* #4 ~ #10 — masonry: distribute to the shorter column so the
                last card lands on whichever side has more empty space */}
            {sortedByVotes.length > 3 && (() => {
              const rest = sortedByVotes.slice(3, 10);
              const left: { entry: PhotoEntry; rank: number }[] = [];
              const right: { entry: PhotoEntry; rank: number }[] = [];
              rest.forEach((entry, i) => {
                const rank = i + 4;
                // All cards share the same aspect ratio, so we can simply
                // push to whichever column currently has fewer cards.
                if (left.length <= right.length) left.push({ entry, rank });
                else right.push({ entry, rank });
              });
              const renderCard = ({ entry, rank }: { entry: PhotoEntry; rank: number }) => (
                <div key={entry.id} className="mb-3">
                  <TopCard
                    entry={entry}
                    rank={rank}
                    variant="grid"
                    onPhotoClick={onPhotoClick}
                    onUnlock={() => openFakeDoor(`inline_card_${rank}`, entry.id)}
                  />
                </div>
              );
              return (
                <div className="mt-4 flex gap-3">
                  <div className="flex-1 min-w-0">
                    {left.map(renderCard)}
                  </div>
                  <div className="flex-1 min-w-0">
                    {right.map(renderCard)}
                  </div>
                </div>
              );
            })()}
          </div>
        ) : (
          <div className="relative">
            <div className="space-y-3">
              {Array.from({ length: 5 }, (_, i) => {
                const medalStyles = ["bg-yellow-500/20 text-yellow-400", "bg-gray-400/20 text-gray-300", "bg-amber-600/20 text-amber-400", "text-muted", "text-muted"];
                const barWidths = ["w-4/5", "w-3/5", "w-1/2", "w-2/5", "w-1/3"];
                return (
                  <div key={i} className="flex items-center gap-3 rounded-2xl p-3 pr-4"
                    style={{ background: i < 3 ? "linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)" : "rgba(255,255,255,0.03)", border: `1px solid rgba(255,255,255,${i < 3 ? "0.08" : "0.05"})` }}>
                    <span className={`w-7 h-7 flex items-center justify-center rounded-full text-xs font-bold ${medalStyles[i]}`}>{i + 1}</span>
                    <div className="w-11 h-11 rounded-xl bg-white/5 flex items-center justify-center"><span className="text-muted text-lg">?</span></div>
                    <div className="flex-1 min-w-0">
                      <div className={`h-3 ${barWidths[i]} rounded-full bg-white/8 mb-1.5`} />
                      <div className="h-2 w-12 rounded-full bg-white/5" />
                    </div>
                    <div className="text-right"><div className="h-4 w-6 rounded bg-white/8" /></div>
                  </div>
                );
              })}
            </div>
            <div className="absolute inset-0 flex items-center justify-center backdrop-blur-md rounded-2xl" style={{ background: "rgba(10,10,10,0.4)" }}>
              <div className="text-center px-6">
                <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-neutral-700 flex items-center justify-center">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-foreground">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0110 0v4" />
                  </svg>
                </div>
                <p className="text-sm font-bold mb-1">순위는 결과 발표 때 공개됩니다</p>
                <p className="text-xs text-muted">지금은 투표에 집중하세요!</p>
              </div>
            </div>
          </div>
        )}
      </div>

      <FakeDoorModal open={fakeDoorOpen} onClose={() => setFakeDoorOpen(false)} source={fakeDoorSource} />
    </div>
  );
}

type LockIconKey = "pin" | "camera" | "lens" | "settings" | "edit" | "quote";

function LockIcon({ name }: { name: LockIconKey }) {
  const common = { width: 13, height: 13, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (name) {
    case "pin":
      return <svg {...common}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" /></svg>;
    case "camera":
      return <svg {...common}><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" /><circle cx="12" cy="13" r="4" /></svg>;
    case "lens":
      return <svg {...common}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4" /><circle cx="12" cy="12" r="1.2" fill="currentColor" /></svg>;
    case "settings":
      return <svg {...common}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z" /></svg>;
    case "edit":
      return <svg {...common}><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 113 3L7 19l-4 1 1-4z" /></svg>;
    case "quote":
      return <svg {...common}><path d="M3 21c0-3 1-5 4-7" /><path d="M9 21c0-3 1-5 4-7" /><path d="M3 7h6v6H3z" /><path d="M13 7h6v6h-6z" /></svg>;
  }
}

// Different placeholder text per icon so blurred lengths look organic
const OVERLAY_PLACEHOLDERS: Record<LockIconKey, string> = {
  pin: "고려대 서울캠퍼스 본관 앞",
  camera: "Sony A7C II",
  lens: "35mm F1.4 GM",
  settings: "f/1.8 · 1/250s · ISO 400",
  edit: "VSCO A6",
  quote: "이 한 컷을 위해 세 번을 갔어요",
};

function OverlayLockedRow({ icon, label }: { icon: LockIconKey; label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-[9px] leading-none">
      <span className="text-white/70 shrink-0"><LockIcon name={icon} /></span>
      <span className="text-white/60 font-semibold w-9 shrink-0">{label}</span>
      <span
        className="truncate text-white/80 max-w-[60%]"
        style={{ filter: "blur(4px)", WebkitFilter: "blur(4px)" }}
      >
        {OVERLAY_PLACEHOLDERS[icon]}
      </span>
    </div>
  );
}

function LockedRow({ icon, label, placeholder }: { icon: LockIconKey; label: string; placeholder: string }) {
  return (
    <div className="flex items-center gap-2.5 text-[11px]">
      <span className="text-foreground/55 shrink-0"><LockIcon name={icon} /></span>
      <span className="text-muted/70 font-semibold w-14 shrink-0">{label}</span>
      <span
        className="flex-1 truncate text-foreground/70"
        style={{ filter: "blur(5px)", WebkitFilter: "blur(5px)" }}
      >
        {placeholder}
      </span>
    </div>
  );
}

interface TopCardProps {
  entry: PhotoEntry;
  rank: number;
  variant: "hero" | "podium" | "grid";
  onPhotoClick: (entry: PhotoEntry) => void;
  onUnlock: () => void;
}

function TopCard({ entry, rank, variant, onPhotoClick, onUnlock }: TopCardProps) {
  const isHero = variant === "hero";
  const isPodium = variant === "podium";

  return (
    <div
      className="relative rounded-3xl overflow-hidden"
      style={{
        border: "1px solid rgba(255,255,255,0.07)",
        boxShadow: "0 4px 14px rgba(0,0,0,0.3)",
        background: "linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.015) 100%)",
      }}
    >
      {/* Photo (always sharp). All cards: header overlaid on top, author + locked meta on bottom.
          Wide photos are letterboxed inside a 4:5 card with a self-blurred background fill,
          so meta overlays never crop the subject. */}
      {(() => {
        const imgAspect = entry.aspect_ratio || 0.8;
        const maxCardAspect = 0.8; // never wider than 4:5
        const useFill = imgAspect > maxCardAspect;
        const cardAspect = useFill ? maxCardAspect : imgAspect;
        const src = entry.thumb_url || entry.image_url;
        return (
      <div
        role="button"
        tabIndex={0}
        onClick={() => onPhotoClick(entry)}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onPhotoClick(entry); }}
        className="relative w-full block cursor-pointer active:opacity-95 transition-opacity overflow-hidden"
        style={{ aspectRatio: `${cardAspect}` }}
      >
        {useFill && (
          <>
            <img
              src={src}
              alt=""
              aria-hidden
              className="absolute inset-0 w-full h-full object-cover scale-125"
              style={{ filter: "blur(28px) saturate(1.1)", WebkitFilter: "blur(28px) saturate(1.1)" }}
              draggable={false}
            />
            <div className="absolute inset-0 bg-black/20" />
          </>
        )}
        <img
          src={src}
          alt={entry.nickname}
          className={useFill ? "absolute inset-0 w-full h-full object-contain" : "relative w-full h-full object-cover block"}
          draggable={false}
        />

        {/* Top dark gradient + header (rank, school badge, votes) */}
        <div className="absolute inset-x-0 top-0 pointer-events-none"
          style={{
            height: isHero ? "38%" : "42%",
            background: "linear-gradient(180deg, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.6) 50%, transparent 100%)",
          }} />
        <div className={`absolute inset-x-0 top-0 flex items-center justify-between select-none ${isHero ? "px-4 pt-3.5 pb-3" : "px-3 pt-2.5 pb-2"}`}>
          <div className="flex items-center gap-1.5 min-w-0">
            {rank <= 3 && (
              <svg
                width={isHero ? 22 : 16}
                height={isHero ? 22 : 16}
                viewBox="0 0 24 24"
                fill="none"
                stroke={rank === 1 ? "#ffd166" : rank === 2 ? "#d8d8e0" : "#cd9270"}
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="shrink-0"
                style={{ filter: "drop-shadow(0 1px 4px rgba(0,0,0,0.95))" }}
                aria-label={`${rank} place trophy`}
              >
                <path d="M16.5 18.75h-9m9 0a3 3 0 0 1 3 3h-15a3 3 0 0 1 3-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 0 1-.982-3.172M9.497 14.25a7.454 7.454 0 0 0 .981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 0 0 7.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 0 0 2.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 0 1 2.916.52 6.003 6.003 0 0 1-5.395 4.972m0 0a6.726 6.726 0 0 1-2.749 1.35m0 0a6.772 6.772 0 0 1-3.044 0" />
              </svg>
            )}
            <span
              className={`font-rank text-white ${isHero ? "text-[24px]" : isPodium ? "text-[19px]" : "text-[17px]"} leading-none`}
              style={{ textShadow: "0 1px 4px rgba(0,0,0,0.95)", transform: "translateY(2px)", display: "inline-block" }}
            >
              {rank}
            </span>
            <SchoolBadge school={entry.school} size="sm" />
          </div>
          <p
            className={`font-black text-white shrink-0 ${isHero ? "text-[18px]" : isPodium ? "text-[13px]" : "text-[12px]"}`}
            style={{ textShadow: "0 1px 4px rgba(0,0,0,0.95)" }}
          >
            {entry.votes.toLocaleString()}
            <span className={`font-medium text-white/80 ml-0.5 ${isHero ? "text-[11px]" : "text-[9px]"}`}>표</span>
          </p>
        </div>

        {/* Bottom dark gradient + author + locked meta + unlock CTA */}
        <div className="absolute inset-x-0 bottom-0 pointer-events-none"
          style={{
            height: isHero ? "70%" : "78%",
            background: "linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.85) 35%, rgba(0,0,0,0.98) 100%)",
          }} />
        <div className={`absolute inset-x-0 bottom-0 select-none ${isHero ? "px-5 pb-4 pt-4" : "px-3 pb-3 pt-3"}`}>
          <p
            className={`font-bold text-white truncate ${isHero ? "text-[19px]" : isPodium ? "text-[15px]" : "text-[14px]"}`}
            style={{ textShadow: "0 1px 4px rgba(0,0,0,0.95)" }}
          >
            {entry.nickname}
          </p>
          {entry.club && isHero && (
            <p className="text-white/70 mt-0.5 truncate text-[11px]" style={{ textShadow: "0 1px 4px rgba(0,0,0,0.95)" }}>
              {entry.club}
            </p>
          )}
          <div className={`mt-2 ${isHero ? "space-y-1" : "space-y-0.5"}`} aria-hidden>
            {isHero ? (
              <>
                <OverlayLockedRow icon="pin" label="촬영지" />
                <OverlayLockedRow icon="camera" label="카메라" />
                <OverlayLockedRow icon="lens" label="렌즈" />
                <OverlayLockedRow icon="settings" label="세팅값" />
                <OverlayLockedRow icon="edit" label="보정" />
                <OverlayLockedRow icon="quote" label="작가의 말" />
              </>
            ) : (
              <>
                <OverlayLockedRow icon="pin" label="촬영지" />
                <OverlayLockedRow icon="camera" label="카메라" />
                <OverlayLockedRow icon="settings" label="세팅값" />
              </>
            )}
          </div>

          {/* Unlock CTA — centered plain inline text on the photo, no chrome */}
          <button
            onClick={(e) => { e.stopPropagation(); onUnlock(); }}
            className={`mt-5 mb-1 mx-auto inline-flex items-center justify-center gap-1.5 font-bold cursor-pointer hover:opacity-90 transition-opacity w-full ${isHero ? "text-[12px]" : "text-[10px]"}`}
            style={{ filter: "drop-shadow(0 1px 4px rgba(0,0,0,0.95))" }}
          >
            <svg
              width={isHero ? 12 : 10}
              height={isHero ? 12 : 10}
              viewBox="0 0 24 24"
              fill="none"
              stroke="#6aa3ff"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="shrink-0 self-center"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0110 0v4" />
            </svg>
            <span
              className="self-center"
              style={{
                color: "transparent",
                backgroundImage: "linear-gradient(135deg, #6aa3ff 0%, #ffffff 50%, #ff5b78 100%)",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                lineHeight: 1,
              }}
            >
              TOP 10 비밀 전부 열기 · ₩990
            </span>
          </button>
        </div>
      </div>
        );
      })()}
    </div>
  );
}

interface TopThreeCarouselProps {
  entries: PhotoEntry[];
  onPhotoClick: (entry: PhotoEntry) => void;
  onUnlock: (rank: number, photoId: string) => void;
}

function TopThreeCarousel({ entries, onPhotoClick, onUnlock }: TopThreeCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const userInteractingRef = useRef(false);
  const resumeTimerRef = useRef<number | null>(null);
  const settleTimerRef = useRef<number | null>(null);

  // Scroll a given index to the horizontal center of the carousel only.
  // Avoid scrollIntoView because it can also adjust the vertical page scroll
  // and yank the user back to the top whenever the auto-advance ticks.
  const scrollToIdx = (idx: number, smooth = true) => {
    const el = scrollRef.current;
    const card = cardRefs.current[idx];
    if (!el || !card) return;
    const cardCenter = card.offsetLeft + card.offsetWidth / 2;
    const target = cardCenter - el.clientWidth / 2;
    el.scrollTo({ left: target, behavior: smooth ? "smooth" : "auto" });
  };

  // Center the first card on mount. Wait for two frames + a short timeout
  // so the layout is fully measured before computing scrollLeft, otherwise
  // the offsetLeft we read can be off by a few px and the snap looks crooked.
  useEffect(() => {
    if (entries.length === 0) return;
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        scrollToIdx(0, false);
        setActiveIdx(0);
        // One more correction after fonts/images settle
        window.setTimeout(() => scrollToIdx(0, false), 120);
      });
    });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries.length]);

  // Recompute the active card center on viewport resize so a rotation lands
  // exactly in the middle even after the user resizes their window.
  useEffect(() => {
    if (entries.length === 0) return;
    const onResize = () => scrollToIdx(activeIdx, false);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIdx, entries.length]);

  // Auto-advance every 2.5s: 1 → 2 → 3 → 1 → 2 → 3 → ...
  // After the last card, jump straight back to the first.
  useEffect(() => {
    if (entries.length === 0) return;
    const interval = window.setInterval(() => {
      if (userInteractingRef.current) return;
      setActiveIdx((prev) => {
        const next = (prev + 1) % entries.length;
        scrollToIdx(next, true);
        return next;
      });
    }, 2500);
    return () => window.clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries.length]);

  // Pointer / touch interaction: pause auto-advance, then snap to nearest card on release
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const pause = () => {
      userInteractingRef.current = true;
      if (resumeTimerRef.current) window.clearTimeout(resumeTimerRef.current);
      if (settleTimerRef.current) window.clearTimeout(settleTimerRef.current);
    };

    const findNearestIdx = () => {
      const center = el.scrollLeft + el.clientWidth / 2;
      let bestIdx = 0;
      let bestDist = Infinity;
      cardRefs.current.forEach((card, i) => {
        if (!card) return;
        const c = card.offsetLeft + card.offsetWidth / 2;
        const dist = Math.abs(c - center);
        if (dist < bestDist) {
          bestDist = dist;
          bestIdx = i;
        }
      });
      return bestIdx;
    };

    const scheduleResume = () => {
      if (resumeTimerRef.current) window.clearTimeout(resumeTimerRef.current);
      if (settleTimerRef.current) window.clearTimeout(settleTimerRef.current);
      settleTimerRef.current = window.setTimeout(() => {
        const nearest = findNearestIdx();
        setActiveIdx(nearest);
        scrollToIdx(nearest, true);
        userInteractingRef.current = false;
      }, 250);
    };

    el.addEventListener("pointerdown", pause);
    el.addEventListener("touchstart", pause, { passive: true });
    el.addEventListener("pointerup", scheduleResume);
    el.addEventListener("pointercancel", scheduleResume);
    el.addEventListener("touchend", scheduleResume);
    el.addEventListener("touchcancel", scheduleResume);

    return () => {
      el.removeEventListener("pointerdown", pause);
      el.removeEventListener("touchstart", pause);
      el.removeEventListener("pointerup", scheduleResume);
      el.removeEventListener("pointercancel", scheduleResume);
      el.removeEventListener("touchend", scheduleResume);
      el.removeEventListener("touchcancel", scheduleResume);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries.length]);

  if (entries.length === 0) return null;

  return (
    <div
      ref={scrollRef}
      className="flex gap-3 overflow-x-auto hide-scrollbar -mx-4 px-[12%]"
      style={{
        scrollBehavior: "auto",
        scrollSnapType: "none",
        WebkitOverflowScrolling: "touch",
        overflowAnchor: "none",
      }}
    >
      {entries.map((entry, i) => {
        const rank = i + 1;
        return (
          <div
            key={entry.id}
            ref={(el) => { cardRefs.current[i] = el; }}
            className="shrink-0 w-[76%] transition-transform duration-300"
            style={{ transform: i === activeIdx ? "scale(1)" : "scale(0.92)", opacity: i === activeIdx ? 1 : 0.55 }}
          >
            <TopCard
              entry={entry}
              rank={rank}
              variant="hero"
              onPhotoClick={onPhotoClick}
              onUnlock={() => onUnlock(rank, entry.id)}
            />
          </div>
        );
      })}
    </div>
  );
}
