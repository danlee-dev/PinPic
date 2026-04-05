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
  const [selectedEntry, setSelectedEntry] = useState<PhotoEntry | null>(null);
  const [votedIds, setVotedIds] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<Tab>("feed");
  const [showLogin, setShowLogin] = useState(false);
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

  // Shuffle entries once on initial load (stable during session)
  const [shuffledEntries, setShuffledEntries] = useState<PhotoEntry[]>([]);
  useEffect(() => {
    if (entries.length > 0 && shuffledEntries.length === 0) {
      const shuffled = [...entries].sort(() => Math.random() - 0.5);
      setShuffledEntries(shuffled);
    } else if (entries.length > shuffledEntries.length) {
      // Append new entries (from infinite scroll) without re-shuffling existing
      const newOnes = entries.slice(shuffledEntries.length);
      setShuffledEntries((prev) => [...prev, ...newOnes.sort(() => Math.random() - 0.5)]);
    }
  }, [entries]);

  const filtered = filter === "all"
    ? shuffledEntries
    : shuffledEntries.filter((e) => e.school === filter);

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
            {/* Hero section with school color accents */}
            <div className="relative text-center mb-6 animate-card-rise overflow-hidden rounded-3xl py-8 px-4"
              style={{
                background: "linear-gradient(135deg, rgba(26,109,255,0.12) 0%, rgba(10,10,10,0.9) 40%, rgba(10,10,10,0.9) 60%, rgba(232,25,62,0.12) 100%)",
              }}
            >
              {/* Subtle glow orbs */}
              <div className="absolute top-0 left-0 w-32 h-32 rounded-full opacity-30 blur-3xl pointer-events-none" style={{ background: "radial-gradient(circle, #1a6dff 0%, transparent 70%)" }} />
              <div className="absolute bottom-0 right-0 w-32 h-32 rounded-full opacity-30 blur-3xl pointer-events-none" style={{ background: "radial-gradient(circle, #e8193e 0%, transparent 70%)" }} />
              {/* Glass border */}
              <div className="absolute inset-0 rounded-3xl pointer-events-none" style={{ border: "1px solid rgba(255,255,255,0.06)" }} />

              <h2 className="relative text-2xl font-bold tracking-tight mb-1">사진 투표</h2>
              <p className="relative text-sm text-muted mb-5">마음에 드는 사진을 더블클릭해서 투표하세요</p>

              <div className="relative flex items-center justify-center gap-3 mb-5">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full" style={{ background: "rgba(26,109,255,0.15)", border: "1px solid rgba(26,109,255,0.2)" }}>
                  <img src="/yonsei-logo.png" alt="연세대" className="w-5 h-5 rounded-full object-cover" />
                  <span className="text-yonsei text-xs font-semibold">연세대</span>
                </div>
                <span className="text-muted text-xs font-bold">VS</span>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full" style={{ background: "rgba(232,25,62,0.15)", border: "1px solid rgba(232,25,62,0.2)" }}>
                  <img src="/korea-logo.png" alt="고려대" className="w-5 h-5 object-contain" />
                  <span className="text-korea text-xs font-semibold">고려대</span>
                </div>
              </div>

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

              <nav className="relative inline-flex gap-1 bg-white/5 backdrop-blur-sm rounded-full p-1" style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
                {(["all", "yonsei", "korea"] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all duration-300 cursor-pointer
                      ${filter === f
                        ? f === "yonsei"
                          ? "bg-yonsei/20 text-yonsei shadow-sm animate-filter-switch"
                          : f === "korea"
                            ? "bg-korea/20 text-korea shadow-sm animate-filter-switch"
                            : "bg-white/10 text-foreground shadow-sm animate-filter-switch"
                        : "text-muted hover:text-foreground"
                      }`}
                  >
                    {f === "all" ? "전체" : f === "yonsei" ? "연세대" : "고려대"}
                  </button>
                ))}
              </nav>

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
                className="relative mt-4 px-5 py-2.5 rounded-full text-xs font-semibold text-foreground cursor-pointer transition-all duration-200 active:scale-95 flex items-center gap-2"
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
            <div className="columns-2 sm:columns-3 gap-3">
              {filtered.map((entry, i) => (
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
