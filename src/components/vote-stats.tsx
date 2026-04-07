"use client";

import { useEffect, useState } from "react";
import { PhotoEntry, RevealMode } from "@/lib/types";
import { ConfettiBurst } from "./confetti-burst";
import { FakeDoorModal } from "./fake-door-modal";
import { trackEvent } from "@/lib/analytics";

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
  const revealed = revealMode !== "hidden";

  const openFakeDoor = (src: string) => {
    setFakeDoorSource(src);
    setFakeDoorOpen(true);
    trackEvent("fake_door_click", { source: src });
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

  const sortedByVotes = [...entries].sort((a, b) => b.votes - a.votes);
  const winnerSchool: "yonsei" | "korea" | "tie" =
    yonseiVotes === koreaVotes ? "tie" : (yonseiVotes > koreaVotes ? "yonsei" : "korea");

  return (
    <div className="max-w-3xl mx-auto px-4 pt-2 pb-28">
      {/* === REVEAL MODE: Hall of Fame Hero === */}
      {revealed && (
        <div className="relative rounded-3xl pt-7 pb-5 px-5 mb-5 overflow-hidden animate-card-rise"
          style={{
            background: "linear-gradient(135deg, rgba(255,215,0,0.08) 0%, rgba(10,10,10,0.92) 50%, rgba(255,138,0,0.08) 100%)",
          }}
        >
          <ConfettiBurst trigger={confettiKey} />
          <div className="absolute inset-0 rounded-3xl pointer-events-none" style={{ border: "1px solid rgba(255,215,0,0.18)" }} />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-40 rounded-full opacity-30 blur-3xl pointer-events-none" style={{ background: "radial-gradient(circle, #ffd700 0%, transparent 70%)" }} />

          <div className="relative text-center">
            <p className="text-[11px] font-bold tracking-[0.2em] text-yellow-300/90 uppercase mb-1">Hall of Fame</p>
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
              <div className="relative h-6 rounded-full overflow-hidden bg-[#1a1a1a]" style={{ boxShadow: "inset 0 1px 2px rgba(255,255,255,0.08), 0 2px 8px rgba(0,0,0,0.3)" }}>
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
              </div>
              {winnerSchool !== "tie" && (
                <p className="mt-3 text-[11px] font-semibold">
                  <span className={winnerSchool === "yonsei" ? "text-yonsei" : "text-korea"}>
                    {winnerSchool === "yonsei" ? "연세대" : "고려대"}
                  </span>
                  <span className="text-muted"> 승리</span>
                </p>
              )}
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

      {/* Detail cards - Liquid Glass */}
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

      {/* Ranking */}
      <div className="mt-6 animate-card-rise" style={{ animationDelay: "0.4s" }}>
        <h3 className="text-sm font-semibold mb-3">
          {revealed ? "최종 인기 순위" : "인기 순위"}
          {revealMode === "preview" && <span className="ml-2 text-[10px] font-normal text-yellow-400">(미리보기)</span>}
        </h3>
        {revealed ? (
          <div className="pb-28">
            <p className="text-[11px] text-muted mb-4">{totalVotes.toLocaleString()}명이 선택한 단 10장. 나머지는 잠겨 있어요.</p>

            {/* #1 — full-width hero card */}
            {sortedByVotes.slice(0, 1).map((entry) => (
              <TopCard
                key={entry.id}
                entry={entry}
                rank={1}
                variant="hero"
                onPhotoClick={onPhotoClick}
                onUnlock={() => openFakeDoor("inline_card_1")}
              />
            ))}

            {/* #2 ~ #10 — true masonry: column-flow so heights are not aligned */}
            {sortedByVotes.length > 1 && (
              <div className="mt-3 [column-count:2] [column-gap:0.75rem]">
                {sortedByVotes.slice(1, 10).map((entry, i) => {
                  const rank = i + 2;
                  return (
                    <div key={entry.id} className="mb-3 break-inside-avoid">
                      <TopCard
                        entry={entry}
                        rank={rank}
                        variant={rank <= 3 ? "podium" : "grid"}
                        onPhotoClick={onPhotoClick}
                        onUnlock={() => openFakeDoor(`inline_card_${rank}`)}
                      />
                    </div>
                  );
                })}
              </div>
            )}
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

      {/* Sticky fake-door CTA bar (only when revealed) */}
      {revealed && (
        <div className="fixed inset-x-0 bottom-24 z-30 flex justify-center px-4 pointer-events-none">
          <button
            onClick={() => openFakeDoor("sticky_bar")}
            className="pointer-events-auto relative w-full max-w-md flex items-center justify-between gap-3 px-5 py-3.5 rounded-full text-black font-bold text-[13px] cursor-pointer active:scale-[0.98] transition-all overflow-hidden"
            style={{
              background: "linear-gradient(135deg, #ffd700 0%, #ffb700 50%, #ff8a00 100%)",
              boxShadow: "0 8px 28px rgba(255,170,0,0.4), 0 0 0 1px rgba(255,255,255,0.25) inset",
            }}
          >
            <span className="flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0110 0v4" />
              </svg>
              TOP 10 비밀 전부 열기
            </span>
            <span className="flex items-center gap-1">
              <span className="text-[14px] font-black">₩990</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </span>
          </button>
        </div>
      )}

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
  const isGrid = variant === "grid";

  // Subtle gold accent ONLY for #1; podium gets a hint of color via small medal text
  const cardBorder = isHero
    ? "1px solid rgba(255,200,90,0.4)"
    : "1px solid rgba(255,255,255,0.07)";
  const cardShadow = isHero
    ? "0 12px 36px rgba(255,180,60,0.12), 0 4px 16px rgba(0,0,0,0.4)"
    : "0 4px 14px rgba(0,0,0,0.3)";
  const cardBg = isHero
    ? "linear-gradient(180deg, rgba(255,200,90,0.05) 0%, rgba(255,255,255,0.02) 35%, rgba(255,255,255,0.02) 100%)"
    : "linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.015) 100%)";

  const rankAccent =
    rank === 1 ? "text-[#ffd166]" :
    rank === 2 ? "text-[#d8d8e0]" :
    rank === 3 ? "text-[#cd9270]" :
    "text-foreground/55";

  return (
    <div
      className="relative rounded-3xl overflow-hidden"
      style={{ border: cardBorder, boxShadow: cardShadow, background: cardBg }}
    >
      {/* Hero card has a faint top hairline accent for #1 */}
      {isHero && (
        <div className="absolute inset-x-6 top-0 h-px pointer-events-none"
          style={{ background: "linear-gradient(90deg, transparent 0%, rgba(255,210,120,0.5) 50%, transparent 100%)" }} />
      )}

      {/* Header: rank + school + votes */}
      <div className={`flex items-center justify-between ${isHero ? "px-5 pt-4 pb-3" : "px-3.5 pt-3 pb-2"}`}>
        <div className="flex items-center gap-2 min-w-0">
          <span className={`font-black ${rankAccent} ${isHero ? "text-[22px]" : isPodium ? "text-[18px]" : "text-[15px]"}`}>
            #{rank}
          </span>
          <span className={`font-bold uppercase tracking-wider truncate ${entry.school === "yonsei" ? "text-yonsei" : "text-korea"} ${isHero ? "text-[11px]" : "text-[9px]"}`}>
            {entry.school === "yonsei" ? "연세대" : "고려대"}
          </span>
        </div>
        <div className="text-right shrink-0">
          <p className={`font-black ${isHero ? "text-[18px]" : isPodium ? "text-[14px]" : "text-[12px]"}`}>
            {entry.votes.toLocaleString()}
            <span className={`font-medium text-muted ml-0.5 ${isHero ? "text-[11px]" : "text-[9px]"}`}>표</span>
          </p>
        </div>
      </div>

      {/* Photo (always sharp) */}
      <button
        onClick={() => onPhotoClick(entry)}
        className="relative w-full block cursor-pointer active:opacity-95 transition-opacity"
      >
        <img
          src={entry.thumb_url || entry.image_url}
          alt={entry.nickname}
          className="w-full block"
          draggable={false}
        />
        {isHero && (
          <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-[9px] font-black tracking-[0.15em]"
            style={{
              background: "rgba(0,0,0,0.65)",
              color: "#ffd166",
              border: "1px solid rgba(255,210,120,0.45)",
              backdropFilter: "blur(8px)",
            }}
          >
            WINNER
          </div>
        )}
        {isPodium && (
          <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[8px] font-black tracking-wider"
            style={{
              background: "rgba(0,0,0,0.6)",
              color: rank === 2 ? "#d8d8e0" : "#cd9270",
              border: `1px solid ${rank === 2 ? "rgba(216,216,224,0.35)" : "rgba(205,146,112,0.35)"}`,
              backdropFilter: "blur(6px)",
            }}
          >
            {rank === 2 ? "2ND" : "3RD"}
          </div>
        )}
      </button>

      {/* Author */}
      <div className={`${isHero ? "px-5 pt-3 pb-2" : "px-3.5 pt-2.5 pb-2"}`}>
        <p className={`font-bold truncate ${isHero ? "text-[14px]" : isPodium ? "text-[12px]" : "text-[11px]"}`}>{entry.nickname}</p>
        {entry.club && !isGrid && (
          <p className={`text-muted mt-0.5 truncate ${isHero ? "text-[10px]" : "text-[9px]"}`}>{entry.club}</p>
        )}
      </div>

      {/* Locked metadata — flush with card, separated by hairline only */}
      <div className={`${isHero ? "px-5 pt-3 pb-3" : "px-3.5 pt-2.5 pb-3"} border-t border-white/5 select-none`} aria-hidden>
        <div className={`${isHero ? "space-y-1.5" : "space-y-1"}`}>
          {isHero ? (
            <>
              <LockedRow icon="pin" label="촬영지" placeholder="홍대입구역 8번 출구" />
              <LockedRow icon="camera" label="카메라" placeholder="Sony A7C II" />
              <LockedRow icon="lens" label="렌즈" placeholder="35mm F1.4 GM" />
              <LockedRow icon="settings" label="세팅값" placeholder="f/1.8 · 1/250s · ISO 400" />
              <LockedRow icon="edit" label="보정" placeholder="VSCO A6 · Highlights -30" />
              <LockedRow icon="quote" label="작가의 말" placeholder="이 한 컷을 위해 세 번을 갔어요" />
            </>
          ) : (
            <>
              <LockedRow icon="pin" label="촬영지" placeholder="잠긴 정보" />
              <LockedRow icon="camera" label="카메라" placeholder="잠긴 정보" />
              <LockedRow icon="settings" label="세팅값" placeholder="잠긴 정보" />
            </>
          )}
        </div>
      </div>
      <button
        onClick={onUnlock}
        className="w-full py-3 text-[11px] font-semibold text-yellow-300 hover:bg-yellow-300/5 border-t border-white/5 cursor-pointer transition-colors flex items-center justify-center gap-1.5"
      >
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0110 0v4" />
        </svg>
        잠금 해제하기
      </button>
    </div>
  );
}
