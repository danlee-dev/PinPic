"use client";

import { useMemo, useCallback, useSyncExternalStore } from "react";
import { PhotoEntry } from "@/lib/types";
import { SchoolBadge } from "./school-badge";

function useColCount() {
  const subscribe = useCallback((cb: () => void) => {
    window.addEventListener("resize", cb);
    return () => window.removeEventListener("resize", cb);
  }, []);
  return useSyncExternalStore(
    subscribe,
    () => (window.innerWidth >= 640 ? 3 : 2),
    () => 2
  );
}

function distributeToColumns<T extends { aspect_ratio: number }>(
  items: T[],
  colCount: number
): { item: T; globalIndex: number }[][] {
  const cols: { item: T; globalIndex: number }[][] = Array.from(
    { length: colCount },
    () => []
  );
  const heights = new Array(colCount).fill(0);

  for (let i = 0; i < items.length; i++) {
    let minIdx = 0;
    let minH = heights[0];
    for (let c = 1; c < colCount; c++) {
      if (heights[c] < minH) {
        minH = heights[c];
        minIdx = c;
      }
    }
    cols[minIdx].push({ item: items[i], globalIndex: i });
    heights[minIdx] += 1 / (items[i].aspect_ratio || 0.8);
  }

  return cols;
}

interface MyVotesProps {
  entries: PhotoEntry[];
  votedIds: Set<string>;
  onPhotoClick: (entry: PhotoEntry) => void;
}

export function MyVotes({ entries, votedIds, onPhotoClick }: MyVotesProps) {
  const colCount = useColCount();
  const votedEntries = entries.filter((e) => votedIds.has(e.id));

  if (votedEntries.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 pt-20 pb-28 text-center animate-card-rise">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-surface border border-border/50 flex items-center justify-center">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted">
            <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
          </svg>
        </div>
        <h3 className="text-lg font-bold mb-1">아직 투표한 사진이 없어요</h3>
        <p className="text-sm text-muted">피드에서 사진을 더블탭해서 투표하세요</p>
      </div>
    );
  }

  const yonseiVoted = votedEntries.filter((e) => e.school === "yonsei");
  const koreaVoted = votedEntries.filter((e) => e.school === "korea");

  return (
    <div className="max-w-3xl mx-auto px-4 pt-2 pb-28">
      {/* Hero section */}
      <div
        className="relative text-center rounded-3xl py-8 px-5 mb-6 animate-card-rise overflow-hidden"
        style={{
          background: "linear-gradient(135deg, rgba(26,109,255,0.12) 0%, rgba(10,10,10,0.9) 40%, rgba(10,10,10,0.9) 60%, rgba(232,25,62,0.12) 100%)",
        }}
      >
        <div className="absolute top-0 left-0 w-32 h-32 rounded-full opacity-30 blur-3xl pointer-events-none" style={{ background: "radial-gradient(circle, #1a6dff 0%, transparent 70%)" }} />
        <div className="absolute bottom-0 right-0 w-32 h-32 rounded-full opacity-30 blur-3xl pointer-events-none" style={{ background: "radial-gradient(circle, #e8193e 0%, transparent 70%)" }} />
        <div className="absolute inset-0 rounded-3xl pointer-events-none" style={{ border: "1px solid rgba(255,255,255,0.06)" }} />

        <h2 className="relative text-2xl font-bold tracking-tight mb-1">내 투표</h2>
        <p className="relative text-sm text-muted mb-5">{votedEntries.length}개 사진에 투표했어요</p>

        <div className="relative flex justify-center gap-2">
          <span className="px-3 py-1.5 rounded-full text-yonsei text-xs font-semibold" style={{ background: "rgba(26,109,255,0.15)", border: "1px solid rgba(26,109,255,0.2)" }}>
            연세대 {yonseiVoted.length}
          </span>
          <span className="px-3 py-1.5 rounded-full text-korea text-xs font-semibold" style={{ background: "rgba(232,25,62,0.15)", border: "1px solid rgba(232,25,62,0.2)" }}>
            고려대 {koreaVoted.length}
          </span>
        </div>
      </div>

      <MyVotesMasonry entries={votedEntries} colCount={colCount} onPhotoClick={onPhotoClick} />
    </div>
  );
}

function MyVotesMasonry({
  entries,
  colCount,
  onPhotoClick,
}: {
  entries: PhotoEntry[];
  colCount: number;
  onPhotoClick: (entry: PhotoEntry) => void;
}) {
  const columns = useMemo(
    () => distributeToColumns(entries, colCount),
    [entries, colCount]
  );

  return (
    <div className="flex gap-3">
      {columns.map((col, c) => (
        <div key={c} className="flex-1 min-w-0">
          {col.map(({ item: entry, globalIndex: i }) => (
            <button
              key={entry.id}
              onClick={() => onPhotoClick(entry)}
              className="w-full mb-3 group cursor-pointer bg-transparent border-none p-0 text-left animate-card-rise"
              style={{ animationDelay: `${Math.min(i, 8) * 0.06}s` }}
            >
              <div className="relative rounded-2xl overflow-hidden bg-surface transition-all duration-300 group-hover:shadow-xl group-hover:shadow-black/30">
                <img
                  src={entry.thumb_url || entry.image_url}
                  alt={entry.nickname}
                  className="w-full block transition-transform duration-500 ease-out group-hover:scale-[1.05]"
                  loading="lazy"
                />
                <div className="absolute top-2.5 left-2.5">
                  <SchoolBadge school={entry.school} />
                </div>
                <div className="absolute top-2.5 right-2.5">
                  <div className="w-7 h-7 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="#ff2d55">
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                    </svg>
                  </div>
                </div>
                <div className="absolute inset-0 bg-linear-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </div>
              <div className="px-1 pt-2 pb-1">
                <p className="text-sm font-medium truncate">{entry.nickname}</p>
              </div>
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}
