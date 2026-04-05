"use client";

import { useState, useEffect, useRef, useCallback } from "react";
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

export function MasonryGallery() {
  const { user } = useAuth();
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

    const newEntries = await fetchPhotos(page, 20);
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

  // Shuffle order (stable per session)
  const [shuffleOrder, setShuffleOrder] = useState<string[]>([]);
  useEffect(() => {
    if (entries.length > shuffleOrder.length) {
      const newIds = entries.slice(shuffleOrder.length).map((e) => e.id);
      setShuffleOrder((prev) => [...prev, ...newIds].sort(() => Math.random() - 0.5));
    }
  }, [entries]);

  const sorted = (() => {
    const base = filter === "all" ? entries : entries.filter((e) => e.school === filter);
    switch (sortBy) {
      case "popular":
        return [...base].sort((a, b) => b.votes - a.votes);
      case "latest":
        return base;
      case "random":
      default:
        return [...base].sort((a, b) => shuffleOrder.indexOf(a.id) - shuffleOrder.indexOf(b.id));
    }
  })();

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

              {/* Mini vote bar */}
              {entries.length > 0 && (() => {
                const yVotes = entries.filter(e => e.school === "yonsei").reduce((s, e) => s + e.votes, 0);
                const kVotes = entries.filter(e => e.school === "korea").reduce((s, e) => s + e.votes, 0);
                const total = yVotes + kVotes;
                const yPct = total === 0 ? 0 : Math.round((yVotes / total) * 100);
                const kPct = total === 0 ? 0 : 100 - yPct;
                return (
                  <div className="relative mb-5 mx-auto max-w-[280px]">
                    <div className="flex justify-between mb-1.5 text-[11px] font-bold">
                      <span className={yPct === 0 ? "text-muted" : "text-yonsei"}>{yPct}%</span>
                      <span className="text-muted text-[10px]">{(yVotes + kVotes).toLocaleString()}표</span>
                      <span className={kPct === 0 ? "text-muted" : "text-korea"}>{kPct}%</span>
                    </div>
                    <div className="relative h-6 rounded-full overflow-hidden"
                      style={{
                        background: yVotes === 0 && kVotes === 0 ? "#2a2a2a"
                          : yVotes === 0 ? "linear-gradient(to right, #2a2a2a 5%, #e8193e 30%, #e8193e 100%)"
                          : kVotes === 0 ? "linear-gradient(to right, #1a6dff 0%, #1a6dff 70%, #2a2a2a 95%)"
                          : `linear-gradient(to right, #1a6dff 0%, #1a6dff ${yPct - 12}%, #3a2a6a ${yPct}%, #6a1a3a ${yPct}%, #e8193e ${yPct + 12}%, #e8193e 100%)`,
                        boxShadow: "inset 0 1px 2px rgba(255,255,255,0.08), 0 2px 8px rgba(0,0,0,0.3)",
                      }}
                    >
                      <div className="absolute inset-x-0 top-0 h-1/2 pointer-events-none" style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.1) 0%, transparent 100%)" }} />
                      <div className="absolute inset-0 flex items-center justify-between px-2.5">
                        <span className="text-white text-[10px] font-bold drop-shadow-md">{yVotes}</span>
                        <span className="text-white text-[10px] font-bold drop-shadow-md">{kVotes}</span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Share button */}
              <button
                onClick={() => {
                  const url = typeof window !== "undefined" ? window.location.href : "";
                  const text = "연고전 사진 대결! 우리 학교 화력 지원하러 가자";
                  if (navigator.share) {
                    navigator.share({ title: "PinPic - 연고전 사진 대결", text, url });
                  } else {
                    navigator.clipboard.writeText(`${text}\n${url}`);
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

            {/* Sort dropdown */}
            <div className="flex justify-end mb-3 px-1 relative">
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

            <div className="columns-2 sm:columns-3 gap-3">
              {sorted.map((entry, i) => (
                <PhotoCard
                  key={entry.id}
                  entry={entry}
                  index={i}
                  voted={votedIds.has(entry.id)}
                  onClick={setSelectedEntry}
                />
              ))}
            </div>
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
