"use client";

import { useEffect, useState } from "react";
import { PhotoEntry, RevealMode } from "@/lib/types";
import { ConfettiBurst } from "./confetti-burst";

interface VoteStatsProps {
  entries: PhotoEntry[];
  votedIds: Set<string>;
  onPhotoClick: (entry: PhotoEntry) => void;
  revealMode?: RevealMode;
}

export function VoteStats({ entries, votedIds, onPhotoClick, revealMode = "hidden" }: VoteStatsProps) {
  const [animated, setAnimated] = useState(false);
  const [confettiKey, setConfettiKey] = useState(0);
  const revealed = revealMode !== "hidden";

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
          <div className="space-y-3">
            {/* Top 3 podium-style cards */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              {sortedByVotes.slice(0, 3).map((entry, i) => {
                const medalBg = ["from-yellow-400/30 to-yellow-600/10", "from-gray-300/30 to-gray-500/10", "from-amber-500/30 to-amber-700/10"][i];
                const medalBorder = ["rgba(255,215,0,0.4)", "rgba(192,192,192,0.4)", "rgba(205,127,50,0.4)"][i];
                const medalEmoji = ["1st", "2nd", "3rd"][i];
                const medalColor = ["text-yellow-300", "text-gray-200", "text-amber-400"][i];
                return (
                  <button
                    key={entry.id}
                    onClick={() => onPhotoClick(entry)}
                    className={`relative rounded-2xl overflow-hidden cursor-pointer active:scale-[0.97] transition-all bg-gradient-to-br ${medalBg}`}
                    style={{ border: `1px solid ${medalBorder}`, boxShadow: i === 0 ? "0 4px 20px rgba(255,215,0,0.15)" : "0 2px 12px rgba(0,0,0,0.3)" }}
                  >
                    <div className="aspect-[3/4] relative">
                      <img src={entry.thumb_url || entry.image_url} alt={entry.nickname} className="absolute inset-0 w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                      <div className={`absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-sm text-[9px] font-black ${medalColor}`}>
                        {medalEmoji}
                      </div>
                      <div className="absolute bottom-2 left-2 right-2">
                        <p className="text-white text-xs font-bold truncate drop-shadow-md">{entry.nickname}</p>
                        <p className="text-white/80 text-[10px] font-semibold drop-shadow-md">{entry.votes}표</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* 4th and below as a list */}
            {sortedByVotes.slice(3).map((entry, i) => {
              const rank = i + 4;
              return (
                <button
                  key={entry.id}
                  onClick={() => onPhotoClick(entry)}
                  className="w-full flex items-center gap-3 rounded-2xl p-3 pr-4 text-left cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99]"
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.05)",
                  }}
                >
                  <span className="w-7 h-7 flex items-center justify-center rounded-full text-xs font-bold text-muted">
                    {rank}
                  </span>
                  <img src={entry.thumb_url || entry.image_url} alt={entry.nickname} className="w-11 h-11 rounded-xl object-cover" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{entry.nickname}</p>
                    <p className={`text-[10px] font-semibold ${entry.school === "yonsei" ? "text-yonsei" : "text-korea"}`}>
                      {entry.school === "yonsei" ? "연세대" : "고려대"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-base font-bold">{entry.votes}</p>
                    <p className="text-[9px] text-muted">votes</p>
                  </div>
                </button>
              );
            })}
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
    </div>
  );
}
