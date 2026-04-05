"use client";

import { useState, useEffect, useRef, useCallback, useMemo, useSyncExternalStore } from "react";
import { PhotoEntry, School } from "@/lib/types";
import { fetchPhotos, fetchMyVotedIds, voteForPhoto, unvotePhoto } from "@/lib/api";
import { useAuth } from "./auth-provider";
import { PhotoCard } from "./photo-card";
import { PhotoModal } from "./photo-modal";
import { BottomDock, Tab } from "./bottom-dock";
import { VoteStats } from "./vote-stats";
import { trackEvent } from "@/lib/analytics";
import { MyVotes } from "./my-votes";
import { UserButton } from "./user-button";
import { LoginPrompt } from "./login-prompt";

type Filter = "all" | School;

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
    // Find shortest column, prefer leftmost on tie (natural reading order)
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

function MasonryGrid({
  items,
  colCount,
  renderItem,
}: {
  items: PhotoEntry[];
  colCount: number;
  renderItem: (item: PhotoEntry, globalIndex: number) => React.ReactNode;
}) {
  const columns = useMemo(
    () => distributeToColumns(items, colCount),
    [items, colCount]
  );

  return (
    <div className="flex gap-3">
      {columns.map((col, c) => (
        <div key={c} className="flex-1 min-w-0">
          {col.map(({ item, globalIndex }) => renderItem(item, globalIndex))}
        </div>
      ))}
    </div>
  );
}

export function MasonryGallery() {
  const { user } = useAuth();
  const colCount = useColCount();
  const [entries, setEntries] = useState<PhotoEntry[]>([]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [sortBy, setSortBy] = useState<"random" | "popular" | "latest">("random");
  const [selectedEntry, setSelectedEntry] = useState<PhotoEntry | null>(null);
  const [votedIds, setVotedIds] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<Tab>("feed");
  const [showLogin, setShowLogin] = useState(false);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const loaderRef = useRef<HTMLDivElement>(null);

  const handleVote = useCallback(async (id: string) => {
    if (!user) {
      setShowLogin(true);
      return;
    }

    // Optimistic update
    setVotedIds((prev) => new Set(prev).add(id));
    setEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, votes: e.votes + 1 } : e))
    );

    const success = await voteForPhoto(id);
    if (!success) {
      setVotedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      setEntries((prev) =>
        prev.map((e) => (e.id === id ? { ...e, votes: e.votes - 1 } : e))
      );
    }
  }, [user]);

  const handleUnvote = useCallback(async (id: string) => {
    // Optimistic update
    setVotedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    setEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, votes: Math.max(0, e.votes - 1) } : e))
    );

    const success = await unvotePhoto(id);
    if (!success) {
      // Revert
      setVotedIds((prev) => new Set(prev).add(id));
      setEntries((prev) =>
        prev.map((e) => (e.id === id ? { ...e, votes: e.votes + 1 } : e))
      );
    }
  }, []);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);

    const newEntries = await fetchPhotos(page, 100);
    if (newEntries.length === 0) {
      setHasMore(false);
    } else {
      setEntries((prev) => [...prev, ...newEntries]);
      setPage((p) => p + 1);
    }
    setLoading(false);
  }, [page, loading, hasMore]);

  // Initial load
  useEffect(() => {
    loadMore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reload voted ids when user changes
  useEffect(() => {
    if (user) {
      fetchMyVotedIds().then(setVotedIds);
    } else {
      setVotedIds(new Set());
    }
  }, [user]);

  useEffect(() => {
    const loader = loaderRef.current;
    if (!loader || activeTab !== "feed") return;

    const observer = new IntersectionObserver(
      (observerEntries) => {
        if (observerEntries[0].isIntersecting) {
          loadMore();
        }
      },
      { rootMargin: "400px" }
    );

    observer.observe(loader);
    return () => observer.disconnect();
  }, [loadMore, activeTab]);

  // Shuffle seed (stable per session, set once)
  const shuffleSeedRef = useRef<number>(Math.random());

  // Deduplicate entries by id
  const uniqueEntries = useMemo(() => {
    const seen = new Set<string>();
    return entries.filter((e) => {
      if (seen.has(e.id)) return false;
      seen.add(e.id);
      return true;
    });
  }, [entries]);

  const sorted = useMemo(() => {
    let base = filter === "all" ? uniqueEntries : uniqueEntries.filter((e) => e.school === filter);
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      base = base.filter((e) =>
        e.nickname.toLowerCase().includes(q) ||
        (e.club && e.club.toLowerCase().includes(q))
      );
    }
    switch (sortBy) {
      case "popular":
        return [...base].sort((a, b) => b.votes - a.votes);
      case "latest":
        return base;
      case "random":
      default: {
        const seed = shuffleSeedRef.current;
        return [...base].sort((a, b) => {
          const hashA = a.id.split("").reduce((s, c) => s + c.charCodeAt(0) * seed, 0);
          const hashB = b.id.split("").reduce((s, c) => s + c.charCodeAt(0) * seed, 0);
          return hashA - hashB;
        });
      }
    }
  }, [uniqueEntries, filter, sortBy, searchQuery]);

  return (
    <>
      {/* Top bar with user button */}
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl">
        <div className="max-w-3xl mx-auto px-4 h-12 flex items-center justify-end">
          <UserButton />
        </div>
      </div>

      <div key={activeTab} className="animate-page-in">
        {activeTab === "feed" && (
          <main className="max-w-3xl mx-auto px-3 pt-2 pb-28">
            {/* Hero section with poster banner */}
            <div className="relative text-center mb-6 animate-card-rise overflow-hidden rounded-3xl"
            >
              {/* Poster banner */}
              <img src="/poster.png" alt="제1회 사진 고연전" className="w-full rounded-t-3xl" />

              {/* Vote bar + share area */}
              <div className="relative px-5 pt-4 pb-5"
                style={{
                  background: "linear-gradient(135deg, rgba(26,109,255,0.1) 0%, rgba(10,10,10,0.95) 40%, rgba(10,10,10,0.95) 60%, rgba(232,25,62,0.1) 100%)",
                }}
              >
                <div className="absolute inset-0 pointer-events-none" style={{ borderLeft: "1px solid rgba(255,255,255,0.06)", borderRight: "1px solid rgba(255,255,255,0.06)", borderBottom: "1px solid rgba(255,255,255,0.06)", borderRadius: "0 0 24px 24px" }} />

              {/* Mini vote bar - left=Korea, right=Yonsei (matching poster) */}
              {entries.length > 0 && (() => {
                const yVotes = entries.filter(e => e.school === "yonsei").reduce((s, e) => s + e.votes, 0);
                const kVotes = entries.filter(e => e.school === "korea").reduce((s, e) => s + e.votes, 0);
                const total = yVotes + kVotes;
                const kPct = total === 0 ? 0 : Math.round((kVotes / total) * 100);
                const yPct = total === 0 ? 0 : 100 - kPct;
                return (
                  <div className="relative mb-5 mx-auto max-w-[300px]">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <img src="/korea-logo.png" alt="고려대" className="w-4 h-4 object-contain" />
                        <span className={`text-[11px] font-bold ${kPct === 0 ? "text-muted" : "text-korea"}`}>{kPct}%</span>
                      </div>
                      <span className="text-muted text-[10px]">{total.toLocaleString()}표</span>
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[11px] font-bold ${yPct === 0 ? "text-muted" : "text-yonsei"}`}>{yPct}%</span>
                        <img src="/yonsei-logo.png" alt="연세대" className="w-4 h-4 rounded-full object-cover" />
                      </div>
                    </div>
                    <div className="relative h-7 rounded-full overflow-hidden"
                      style={{
                        background: kVotes === 0 && yVotes === 0 ? "#2a2a2a"
                          : kVotes === 0 ? `linear-gradient(to right, #2a2a2a 5%, #1a6dff 30%, #1a6dff 100%)`
                          : yVotes === 0 ? `linear-gradient(to right, #e8193e 0%, #e8193e 70%, #2a2a2a 95%)`
                          : `linear-gradient(to right, #e8193e 0%, #e8193e ${kPct - 12}%, #6a1a3a ${kPct}%, #3a2a6a ${kPct}%, #1a6dff ${kPct + 12}%, #1a6dff 100%)`,
                        boxShadow: "inset 0 1px 2px rgba(255,255,255,0.08), 0 2px 8px rgba(0,0,0,0.3)",
                      }}
                    >
                      <div className="absolute inset-x-0 top-0 h-1/2 pointer-events-none" style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.1) 0%, transparent 100%)" }} />
                      <div className="absolute inset-0 flex items-center justify-between px-3">
                        <span className="text-white text-[10px] font-bold drop-shadow-md">{kVotes}</span>
                        <span className="text-white text-[10px] font-bold drop-shadow-md">{yVotes}</span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Share button */}
              <button
                onClick={() => {
                  const url = typeof window !== "undefined" ? window.location.href : "";
                  const message = `제1회 캠퍼스 사진 고연전 - 어느 캠퍼스가 더 낭만적인가? 지금 바로 참전해서 투표로 지원 사격하세요!\n${url}`;
                  if (navigator.share) {
                    navigator.share({ text: message }).catch(() => {});
                  } else {
                    navigator.clipboard.writeText(message);
                    alert("링크가 복사되었습니다!");
                  }
                  trackEvent("share_feed");
                }}
                className="relative mt-4 mx-auto px-5 py-2.5 rounded-full text-xs font-semibold text-foreground cursor-pointer transition-all duration-200 active:scale-95 flex items-center gap-2"
                style={{
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" />
                  <polyline points="16 6 12 2 8 6" />
                  <line x1="12" y1="2" x2="12" y2="15" />
                </svg>
                단톡방에 화력 지원 요청하기
              </button>
              </div>
            </div>

            {/* Search + Sort row */}
            <div className="flex items-center gap-2 mb-3 px-1">
              <div className="flex-1 relative">
                <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="닉네임, 동아리 검색"
                  className="w-full bg-surface text-xs text-foreground pl-8 pr-3 py-2 rounded-lg border border-border/50 outline-none placeholder:text-muted/50 focus:border-white/20 transition-colors"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-foreground cursor-pointer"
                  >
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M4 4L12 12M12 4L4 12" />
                    </svg>
                  </button>
                )}
              </div>

              <div className="relative">
              <button
                onClick={() => setShowSortMenu(!showSortMenu)}
                className="flex items-center gap-1.5 bg-surface text-xs text-muted font-medium px-3 py-1.5 rounded-lg cursor-pointer border border-border/50 hover:text-foreground transition-colors"
              >
                {sortBy === "random" ? "랜덤" : sortBy === "popular" ? "인기순" : "최신순"}
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
              {showSortMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowSortMenu(false)} />
                  <div className="absolute right-0 top-9 z-50 bg-card rounded-xl border border-border/50 shadow-2xl shadow-black/50 py-1 min-w-[100px] animate-card-rise">
                    {([["random", "랜덤"], ["popular", "인기순"], ["latest", "최신순"]] as const).map(([value, label]) => (
                      <button
                        key={value}
                        onClick={() => { setSortBy(value); setShowSortMenu(false); }}
                        className={`w-full text-left px-3 py-2 text-xs transition-colors cursor-pointer
                          ${sortBy === value ? "text-foreground font-semibold" : "text-muted hover:text-foreground hover:bg-white/5"}`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </>
              )}
              </div>
            </div>

            <MasonryGrid
              items={sorted}
              colCount={colCount}
              renderItem={(entry, index) => (
                <PhotoCard
                  key={entry.id}
                  entry={entry}
                  index={index}
                  voted={votedIds.has(entry.id)}
                  onClick={setSelectedEntry}
                />
              )}
            />
            <div ref={loaderRef} className="flex justify-center py-8">
              {loading && (
                <div className="w-6 h-6 border-2 border-border border-t-foreground rounded-full animate-spin" />
              )}
              {!hasMore && entries.length > 0 && (
                <p className="text-sm text-muted">모든 사진을 불러왔어요</p>
              )}
            </div>
          </main>
        )}

        {activeTab === "stats" && (
          <VoteStats entries={entries} votedIds={votedIds} onPhotoClick={setSelectedEntry} />
        )}

        {activeTab === "voted" && (
          <MyVotes
            entries={entries}
            votedIds={votedIds}
            onPhotoClick={setSelectedEntry}
          />
        )}
      </div>

      <BottomDock
        activeTab={activeTab}
        onTabChange={setActiveTab}
        votedCount={votedIds.size}
      />

      <PhotoModal
        entry={selectedEntry}
        voted={selectedEntry ? votedIds.has(selectedEntry.id) : false}
        onVote={handleVote}
        onUnvote={handleUnvote}
        onClose={() => setSelectedEntry(null)}
      />

      {showLogin && <LoginPrompt onClose={() => setShowLogin(false)} />}
    </>
  );
}
