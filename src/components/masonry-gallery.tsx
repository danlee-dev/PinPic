"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { PhotoEntry, School } from "@/lib/types";
import { fetchPhotos, fetchMyVotedIds, voteForPhoto } from "@/lib/api";
import { useAuth } from "./auth-provider";
import { PhotoCard } from "./photo-card";
import { PhotoModal } from "./photo-modal";
import { BottomDock, Tab } from "./bottom-dock";
import { VoteStats } from "./vote-stats";
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

  const filtered = filter === "all"
    ? entries
    : entries.filter((e) => e.school === filter);

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
            </div>
            <div className="columns-2 sm:columns-3 gap-3">
              {filtered.map((entry, i) => (
                <PhotoCard
                  key={entry.id}
                  entry={entry}
                  index={i}
                  voted={votedIds.has(entry.id)}
                  onVote={handleVote}
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
        onClose={() => setSelectedEntry(null)}
      />

      {showLogin && <LoginPrompt onClose={() => setShowLogin(false)} />}
    </>
  );
}
