"use client";

import { useEffect, useState } from "react";
import { PhotoEntry } from "@/lib/types";

interface VoteStatsProps {
  entries: PhotoEntry[];
  votedIds: Set<string>;
  onPhotoClick: (entry: PhotoEntry) => void;
}

export function VoteStats({ entries, votedIds, onPhotoClick }: VoteStatsProps) {
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 100);
    return () => clearTimeout(t);
  }, []);

  const yonseiEntries = entries.filter((e) => e.school === "yonsei");
  const koreaEntries = entries.filter((e) => e.school === "korea");

  const yonseiVotes = yonseiEntries.reduce((sum, e) => sum + e.votes, 0);
  const koreaVotes = koreaEntries.reduce((sum, e) => sum + e.votes, 0);
  const totalVotes = yonseiVotes + koreaVotes || 1;

  const yonseiPct = Math.round((yonseiVotes / totalVotes) * 100);
  const koreaPct = 100 - yonseiPct;

  const yonseiVotedCount = yonseiEntries.filter((e) => votedIds.has(e.id)).length;
  const koreaVotedCount = koreaEntries.filter((e) => votedIds.has(e.id)).length;

  return (
    <div className="max-w-3xl mx-auto px-4 pt-2 pb-28">
      {/* Hero section with school color accents */}
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
          <div className="flex items-end justify-between mb-3">
            <div className="text-left">
              <p className={`text-xs font-semibold uppercase tracking-wider ${yonseiPct === 0 ? "text-muted" : "text-yonsei"}`}>연세대</p>
              <p className={`text-3xl font-black leading-none ${yonseiPct === 0 ? "text-muted" : "text-yonsei"}`}>{yonseiPct}%</p>
            </div>
            <div className="text-xs text-muted font-medium px-3 py-1 rounded-full" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
              총 {totalVotes.toLocaleString()}표
            </div>
            <div className="text-right">
              <p className={`text-xs font-semibold uppercase tracking-wider ${koreaPct === 0 ? "text-muted" : "text-korea"}`}>고려대</p>
              <p className={`text-3xl font-black leading-none ${koreaPct === 0 ? "text-muted" : "text-korea"}`}>{koreaPct}%</p>
            </div>
          </div>

        {/* Progress bar - 3D liquid glass style */}
        <div
          className="relative h-14 rounded-[20px] overflow-hidden mb-2 transition-all duration-1000 ease-out"
          style={{
            background: animated
              ? (yonseiVotes === 0 && koreaVotes === 0)
                ? "#2a2a2a"
                : yonseiVotes === 0
                  ? `linear-gradient(to right, #2a2a2a 0%, #2a2a2a 5%, #e8193e 30%, #e8193e 100%)`
                  : koreaVotes === 0
                    ? `linear-gradient(to right, #1a6dff 0%, #1a6dff 70%, #2a2a2a 95%, #2a2a2a 100%)`
                    : `linear-gradient(to right, #1a6dff 0%, #1a6dff ${yonseiPct - 15}%, #3a2a6a ${yonseiPct}%, #6a1a3a ${yonseiPct}%, #e8193e ${yonseiPct + 15}%, #e8193e 100%)`
              : "#1a1a1a",
            boxShadow: "0 8px 32px rgba(0,0,0,0.4), inset 0 2px 4px rgba(255,255,255,0.1), inset 0 -2px 4px rgba(0,0,0,0.3)",
          }}
        >
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

      {/* Top voted */}
      <div className="mt-6 animate-card-rise" style={{ animationDelay: "0.4s" }}>
        <h3 className="text-sm font-semibold mb-3">인기 순위</h3>
        <div className="space-y-3">
          {(() => {
            const ranked = [...entries]
              .filter((e) => e.votes > 0)
              .sort((a, b) => b.votes - a.votes)
              .slice(0, 5);

            const slots = Array.from({ length: 5 }, (_, i) => {
              const entry = ranked[i];
              if (entry) {
                const medalColors = ["from-yellow-500/20 to-yellow-600/5", "from-gray-400/15 to-gray-500/5", "from-amber-600/15 to-amber-700/5"];
                const borderColor = entry.school === "yonsei" ? "rgba(26,109,255,0.15)" : "rgba(232,25,62,0.15)";
                return (
                  <button
                    key={entry.id}
                    onClick={() => onPhotoClick(entry)}
                    className={`w-full flex items-center gap-3 relative overflow-hidden rounded-2xl p-3 pr-4 text-left cursor-pointer transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]`}
                    style={{
                      background: i < 3
                        ? `linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)`
                        : "rgba(255,255,255,0.03)",
                      border: `1px solid ${i < 3 ? borderColor : "rgba(255,255,255,0.05)"}`,
                      boxShadow: "0 4px 20px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.06)",
                    }}
                  >
                    {/* Medal gradient overlay for top 3 */}
                    {i < 3 && (
                      <div className={`absolute inset-0 bg-linear-to-r ${medalColors[i]} pointer-events-none`} />
                    )}
                    {/* Top highlight */}
                    <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-white/10 to-transparent pointer-events-none" />

                    <span className={`relative w-7 h-7 flex items-center justify-center rounded-full text-xs font-bold
                      ${i === 0 ? "bg-yellow-500/20 text-yellow-400" : i === 1 ? "bg-gray-400/20 text-gray-300" : i === 2 ? "bg-amber-600/20 text-amber-400" : "text-muted"}`}>
                      {i + 1}
                    </span>
                    <img
                      src={entry.image_url}
                      alt={entry.nickname}
                      className="relative w-11 h-11 rounded-xl object-cover"
                      style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.3)" }}
                    />
                    <div className="relative flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{entry.nickname}</p>
                      <p className={`text-[10px] font-semibold ${entry.school === "yonsei" ? "text-yonsei" : "text-korea"}`}>
                        {entry.school === "yonsei" ? "연세대" : "고려대"}
                      </p>
                    </div>
                    <div className="relative text-right">
                      <p className="text-base font-bold">{entry.votes}</p>
                      <p className="text-[9px] text-muted">votes</p>
                    </div>
                  </button>
                );
              }
              return (
                <div
                  key={`empty-${i}`}
                  className="flex items-center gap-3 bg-surface/50 rounded-2xl p-3 pr-4 border border-dashed border-white/10"
                >
                  <span className="w-6 text-center text-xs font-bold text-muted">{i + 1}</span>
                  <div className="w-10 h-10 rounded-lg bg-border/30 flex items-center justify-center">
                    <span className="text-muted text-lg">?</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-muted">지금 투표해서 확인하세요</p>
                    <p className="text-[10px] text-muted/60">{i + 1}위의 주인공은 누구?</p>
                  </div>
                </div>
              );
            });

            return slots;
          })()}
        </div>
      </div>
    </div>
  );
}
