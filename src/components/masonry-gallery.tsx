"use client";

import { useState, useEffect, useRef, useCallback, useMemo, useSyncExternalStore } from "react";
import { PhotoEntry, School, VotingPeriod, ResultAnnouncement, RevealMode } from "@/lib/types";
import { fetchPhotos, fetchMyVotedIds, voteForPhoto, unvotePhoto, fetchAllVoteTimes, fetchTotalVoters } from "@/lib/api";
import { createClient } from "@/utils/supabase/client";
import { fetchVotingPeriod, fetchResultAnnouncement, isResultRevealed, isVotingOpen, getVotingStatus } from "@/lib/admin";
import { getRevealPreview, subscribeRevealPreview } from "@/lib/reveal-preview";
import { useAuth } from "./auth-provider";
import { PhotoCard } from "./photo-card";
import { PhotoModal } from "./photo-modal";
import { BottomDock, Tab } from "./bottom-dock";
import { VoteStats } from "./vote-stats";
import { trackEvent } from "@/lib/analytics";
import { MyVotes } from "./my-votes";
import { UserButton } from "./user-button";
import { LoginPrompt } from "./login-prompt";
import { AdminPanel } from "./admin-panel";
import { CountUp } from "./count-up";

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

function MiniVoteBar({ entries }: { entries: PhotoEntry[] }) {
  const [animated, setAnimated] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 100);
    return () => clearTimeout(t);
  }, []);

  const yVotes = entries.filter(e => e.school === "yonsei").reduce((s, e) => s + e.votes, 0);
  const kVotes = entries.filter(e => e.school === "korea").reduce((s, e) => s + e.votes, 0);
  const total = yVotes + kVotes;
  const kPct = total === 0 ? 0 : Math.round((kVotes / total) * 100);
  const yPct = total === 0 ? 0 : 100 - kPct;

  return (
    <div className="relative mb-5 mx-auto max-w-[300px]">
      <div className="relative flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <img src="/korea-logo.png" alt="고려대" className="w-4 h-4 object-contain" />
          <span className={`text-[11px] font-bold ${kPct === 0 ? "text-muted" : "text-korea"}`}>{kPct}%</span>
        </div>
        <span className="absolute left-1/2 -translate-x-1/2 text-muted text-[10px]">{total.toLocaleString()}표</span>
        <div className="flex items-center gap-1.5">
          <span className={`text-[11px] font-bold ${yPct === 0 ? "text-muted" : "text-yonsei"}`}>{yPct}%</span>
          <img src="/yonsei-logo.png" alt="연세대" className="w-4 h-4 rounded-full object-cover" />
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
            width: total === 0 ? "0%" : `${kPct}%`,
            background: "linear-gradient(to right, #e8193e 0%, #e8193e 60%, #6a1a3a 100%)",
            transformOrigin: "left",
            transform: animated ? "scaleX(1)" : "scaleX(0)",
          }} />
        <div className="absolute inset-y-0 right-0 transition-transform duration-1000 ease-out"
          style={{
            width: total === 0 ? "0%" : `${yPct}%`,
            background: "linear-gradient(to left, #1a6dff 0%, #1a6dff 60%, #3a2a6a 100%)",
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
        <div className="absolute inset-0 flex items-center justify-between px-3">
          <span className="text-white text-[10px] font-bold drop-shadow-md">{kVotes}</span>
          <span className="text-white text-[10px] font-bold drop-shadow-md">{yVotes}</span>
        </div>
      </div>
    </div>
  );
}

export function MasonryGallery() {
  const { user, isAdmin } = useAuth();
  const colCount = useColCount();
  const [entries, setEntries] = useState<PhotoEntry[]>([]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [sortBy, setSortBy] = useState<"recommended" | "random" | "latest">("recommended");
  const [selectedEntry, setSelectedEntry] = useState<PhotoEntry | null>(null);
  const [votedIds, setVotedIds] = useState<Set<string>>(new Set());
  const [voteTimes, setVoteTimes] = useState<Map<string, number[]>>(new Map());
  const [activeTab, setActiveTabState] = useState<Tab>("feed");
  const setActiveTab = useCallback((tab: Tab) => {
    setActiveTabState(tab);
    window.location.hash = tab;
  }, []);

  // Restore tab from URL hash after mount
  useEffect(() => {
    const hash = window.location.hash.replace("#", "") as Tab;
    if (["feed", "stats", "voted", "admin"].includes(hash)) {
      setActiveTabState(hash);
    }
  }, []);
  const [showLogin, setShowLogin] = useState(false);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [votingPeriod, setVotingPeriod] = useState<VotingPeriod | null>(null);
  const [showVotingAlert, setShowVotingAlert] = useState(false);
  const [votingLoaded, setVotingLoaded] = useState(false);
  const [announcement, setAnnouncement] = useState<ResultAnnouncement | null>(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [totalVoters, setTotalVoters] = useState<number>(0);
  const loaderRef = useRef<HTMLDivElement>(null);

  const canVote = isAdmin || isVotingOpen(votingPeriod);
  const votingStatus = getVotingStatus(votingPeriod);

  useEffect(() => {
    fetchVotingPeriod().then((vp) => {
      setVotingPeriod(vp);
      setVotingLoaded(true);
    });
    fetchResultAnnouncement().then(setAnnouncement);
    fetchTotalVoters().then(setTotalVoters);
  }, []);

  // Track admin preview mode toggle (localStorage-based, admin only)
  useEffect(() => {
    if (!isAdmin) {
      setPreviewMode(false);
      return;
    }
    setPreviewMode(getRevealPreview());
    return subscribeRevealPreview(() => setPreviewMode(getRevealPreview()));
  }, [isAdmin]);

  // Compute reveal mode: revealed (everyone) > preview (admin only) > hidden
  const revealMode: RevealMode = isResultRevealed(announcement)
    ? "revealed"
    : (isAdmin && previewMode)
      ? "preview"
      : "hidden";
  const showResults = revealMode !== "hidden";

  const handleVote = useCallback(async (id: string) => {
    if (!user) {
      setShowLogin(true);
      return;
    }

    if (!canVote) {
      setShowVotingAlert(true);
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
  }, [user, canVote]);

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
    fetchAllVoteTimes().then(setVoteTimes);
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

  // Realtime vote updates
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("votes-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "votes" }, () => {
        fetchPhotos(0, 100).then((fresh) => {
          if (fresh.length > 0) setEntries(fresh);
        });
        fetchAllVoteTimes().then(setVoteTimes);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

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

  // Top 5 photo IDs by votes (used to gate location/settings reveal in modal)
  const topRankIds = useMemo(() => {
    const sorted = [...uniqueEntries].sort((a, b) => b.votes - a.votes).slice(0, 5);
    return new Set(sorted.map((e) => e.id));
  }, [uniqueEntries]);

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
      case "latest":
        return base;
      case "recommended": {
        const now = Date.now();
        const totalVotes = base.reduce((s, e) => s + e.votes, 0);
        const avgVotes = base.length > 0 ? totalVotes / base.length : 0;

        // Wilson Score Lower Bound (95% confidence)
        const wilsonLower = (votes: number, n: number) => {
          if (n === 0) return 0;
          const z = 1.96;
          const p = votes / n;
          const denominator = 1 + (z * z) / n;
          const center = p + (z * z) / (2 * n);
          const spread = z * Math.sqrt((p * (1 - p) + (z * z) / (4 * n)) / n);
          return (center - spread) / denominator;
        };

        const estimatedImpressions = Math.max(base.length, 10);

        const scores = base.map((entry) => {
          const votes = entry.votes;

          // 1) Wilson Score
          const wilson = wilsonLower(votes, estimatedImpressions);

          // 2) Time Decay (half-life = 12 hours)
          const ageMs = entry.created_at
            ? now - new Date(entry.created_at).getTime()
            : 7 * 24 * 3600 * 1000;
          const ageHours = Math.max(ageMs / (1000 * 3600), 1);
          const halfLife = 24;
          const timeBoost = Math.pow(2, -ageHours / halfLife);

          // 3) Exploration Bonus with quality gate
          // Raw exploration: high for low-vote photos
          const rawExploration = 1 / (1 + votes / Math.max(avgVotes, 1));

          // 3b) Mid-tier Boost: gaussian around average votes
          // Surfaces decent photos that are neither viral nor unknown
          const midTarget = Math.max(avgVotes, 1);
          const midRange = Math.max(avgVotes * 0.5, 1);
          const midDiff = (votes - midTarget) / midRange;
          const midBoost = Math.exp(-midDiff * midDiff);
          // Quality gate: photos below 30% of average votes get dampened exploration
          // Prevents persistently low-quality photos from hogging top spots
          const qualityThreshold = avgVotes * 0.3;
          const qualityGate = votes >= qualityThreshold || ageHours < 6
            ? 1.0
            : 0.3 + 0.7 * (votes / Math.max(qualityThreshold, 1));
          const exploration = rawExploration * qualityGate;

          // 4) Peak Velocity Penalty: based on highest 1-hour vote burst (persistent)
          // Recovers as photo accumulates "normal-paced" votes over time
          const times = (voteTimes.get(entry.id) || []).slice().sort((a, b) => a - b);
          let peakVelocity = 0;
          let peakEndIdx = -1;
          // Sliding 1-hour window: find max votes within any 1-hour span
          for (let i = 0; i < times.length; i++) {
            let count = 1;
            for (let j = i + 1; j < times.length; j++) {
              if (times[j] - times[i] <= 3600 * 1000) count++;
              else break;
            }
            if (count > peakVelocity) {
              peakVelocity = count;
              peakEndIdx = i + count - 1;
            }
          }

          // Base penalty from peak (two-tier)
          let basePenalty = 1.0;
          if (peakVelocity > 20) {
            basePenalty = 0.5 / (1 + Math.log2(peakVelocity / 20));
          } else if (peakVelocity > 10) {
            basePenalty = 1.0 - 0.5 * ((peakVelocity - 10) / 10);
          }

          // Recovery: count "normal-paced" votes after peak
          // Normal pace = no 1-hour window after peak exceeds 10 votes
          let velocityPenalty = basePenalty;
          if (basePenalty < 1.0 && peakEndIdx >= 0) {
            const postPeakTimes = times.slice(peakEndIdx + 1);
            let normalVotesSincePeak = 0;
            for (let i = 0; i < postPeakTimes.length; i++) {
              // Check if this vote is part of a >10/hr burst
              let burstCount = 1;
              for (let j = i + 1; j < postPeakTimes.length; j++) {
                if (postPeakTimes[j] - postPeakTimes[i] <= 3600 * 1000) burstCount++;
                else break;
              }
              if (burstCount <= 10) normalVotesSincePeak++;
            }
            // Recovery threshold scales with platform average (5x)
            const recoveryThreshold = Math.max(avgVotes * 5, 15);
            const recoveryRate = Math.min(normalVotesSincePeak / recoveryThreshold, 1.0);
            // Cap recovery at 80% so abuse history is never fully erased
            velocityPenalty = basePenalty + (1 - basePenalty) * recoveryRate * 0.8;
          }

          // 5) Personalization: demote already-voted photos
          const votedDemote = votedIds.has(entry.id) ? 0.4 : 1.0;

          // 6) Random Jitter per session
          let s = Math.floor(
            (shuffleSeedRef.current * 2147483647 + entry.id.charCodeAt(0) * 31 + entry.id.charCodeAt(1) * 17) % 2147483647
          ) | 1;
          s ^= s << 13; s ^= s >> 17; s ^= s << 5;
          const jitter = 0.85 + ((s >>> 0) / 4294967296) * 0.3;

          const score = (wilson * 0.35 + timeBoost * 0.2 + exploration * 0.25 + midBoost * 0.2) * velocityPenalty * votedDemote * jitter;

          return { entry, score };
        });

        scores.sort((a, b) => b.score - a.score);
        const sortedAll = scores.map((s) => s.entry);

        // School fairness: interleave by stride scheduling when filter is "all"
        // Each school maintains its internal ranking; output proportionally mixes them
        if (filter === "all") {
          const korea = sortedAll.filter((e) => e.school === "korea");
          const yonsei = sortedAll.filter((e) => e.school === "yonsei");
          if (korea.length === 0 || yonsei.length === 0) return sortedAll;

          const total = korea.length + yonsei.length;
          const koreaStep = total / korea.length;
          const yonseiStep = total / yonsei.length;
          let kCounter = koreaStep;
          let yCounter = yonseiStep;
          let kIdx = 0;
          let yIdx = 0;
          const result: PhotoEntry[] = [];
          while (kIdx < korea.length || yIdx < yonsei.length) {
            if (yIdx >= yonsei.length) { result.push(korea[kIdx++]); continue; }
            if (kIdx >= korea.length) { result.push(yonsei[yIdx++]); continue; }
            // Pick the school with smaller counter (more "due")
            if (kCounter <= yCounter) {
              result.push(korea[kIdx++]);
              kCounter += koreaStep;
            } else {
              result.push(yonsei[yIdx++]);
              yCounter += yonseiStep;
            }
          }
          return result;
        }

        return sortedAll;
      }
      case "random":
      default: {
        const arr = [...base];
        let s = Math.floor(shuffleSeedRef.current * 2147483647) | 1;
        const rand = () => {
          s ^= s << 13; s ^= s >> 17; s ^= s << 5;
          return (s >>> 0) / 4294967296;
        };
        for (let i = arr.length - 1; i > 0; i--) {
          const j = Math.floor(rand() * (i + 1));
          [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
      }
    }
  }, [uniqueEntries, filter, sortBy, searchQuery, votedIds, voteTimes]);

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
              {/* Poster banner with result date overlay */}
              <div className="relative">
                <picture>
                  <source srcSet="/poster.webp" type="image/webp" />
                  <img src="/poster.png" alt="제1회 사진 고연전" className="w-full rounded-t-3xl" />
                </picture>
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
                  {showResults ? (
                    <div className="relative">
                      <span className="animate-result-cta-glow" />
                      <button
                        onClick={() => setActiveTab("stats")}
                        className="relative overflow-hidden text-white text-[12px] font-bold px-5 h-9 rounded-full cursor-pointer animate-result-cta flex items-center gap-1.5"
                        style={{
                          background: "linear-gradient(135deg, #1a6dff 0%, #1a6dff 25%, #6b1f8a 50%, #e8193e 75%, #e8193e 100%)",
                          boxShadow:
                            "inset 0 2px 4px rgba(255,255,255,0.25), " +
                            "inset 0 -2px 4px rgba(0,0,0,0.45), " +
                            "inset 0 0 0 1px rgba(255,255,255,0.12), " +
                            "0 8px 22px rgba(0,0,0,0.55)",
                        }}
                      >
                        <div
                          className="absolute inset-x-0 top-0 h-1/2 pointer-events-none"
                          style={{
                            background: "linear-gradient(180deg, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0.04) 60%, transparent 100%)",
                            borderRadius: "9999px 9999px 0 0",
                          }}
                        />
                        <div
                          className="absolute inset-x-0 bottom-0 h-1/3 pointer-events-none"
                          style={{
                            background: "linear-gradient(0deg, rgba(0,0,0,0.3) 0%, transparent 100%)",
                            borderRadius: "0 0 9999px 9999px",
                          }}
                        />
                        <span className="relative z-10 drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]">순위 확인하기</span>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" className="relative z-10 drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]">
                          <polyline points="9 18 15 12 9 6" />
                        </svg>
                        <span className="absolute inset-0 animate-result-cta-shimmer pointer-events-none" />
                      </button>
                    </div>
                  ) : (
                    <span className="bg-black/70 backdrop-blur-sm text-white text-[11px] font-semibold px-4 py-1.5 rounded-full border border-white/15">
                      결과 발표 4월 8일
                    </span>
                  )}
                </div>
              </div>

              {/* Vote bar + share area */}
              <div className="relative px-5 pt-4 pb-5"
                style={{
                  background: "linear-gradient(135deg, rgba(26,109,255,0.1) 0%, rgba(10,10,10,0.95) 40%, rgba(10,10,10,0.95) 60%, rgba(232,25,62,0.1) 100%)",
                }}
              >
                <div className="absolute inset-0 pointer-events-none" style={{ borderLeft: "1px solid rgba(255,255,255,0.06)", borderRight: "1px solid rgba(255,255,255,0.06)", borderBottom: "1px solid rgba(255,255,255,0.06)", borderRadius: "0 0 24px 24px" }} />

              {/* Reveal-mode title + count-up stats */}
              {showResults && uniqueEntries.length > 0 && (
                <RevealStatsBlock
                  totalVotes={uniqueEntries.reduce((s, e) => s + e.votes, 0)}
                  totalEntries={uniqueEntries.length}
                  totalVoters={totalVoters}
                />
              )}

              {/* Mini vote bar */}
              {uniqueEntries.length > 0 && (
                <MiniVoteBar entries={uniqueEntries} />
              )}

              {/* Share button */}
              <button
                onClick={() => {
                  const url = typeof window !== "undefined" ? window.location.origin : "";
                  const liveText = `제1회 캠퍼스 사진 고연전 - 어느 캠퍼스가 더 낭만적인가? 지금 바로 참전해서 투표로 지원 사격하세요!\n${url}`;
                  const revealText = `제1회 캠퍼스 사진 고연전 결과가 발표됐어요! TOP 10 명예의 전당 보러가기 →\n${url}`;
                  const text = showResults ? revealText : liveText;
                  if (navigator.share) {
                    navigator.share({ text }).catch(() => {});
                  } else {
                    navigator.clipboard.writeText(text);
                    alert("링크가 복사되었습니다!");
                  }
                  trackEvent("share_feed");
                }}
                className="relative mt-4 mx-auto px-6 py-3 rounded-full text-xs font-bold cursor-pointer transition-all duration-200 active:scale-95 hover:brightness-110 flex items-center gap-2"
                style={{
                  background: "rgba(255,255,255,0.12)",
                  color: "#fff",
                  border: "1px solid rgba(255,255,255,0.2)",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" />
                  <polyline points="16 6 12 2 8 6" />
                  <line x1="12" y1="2" x2="12" y2="15" />
                </svg>
                {showResults ? "친구에게 결과 공유하기" : "단톡방에 화력 지원 요청하기"}
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
                  placeholder="닉네임이나 동아리 이름을 검색해보세요"
                  className="w-full text-xs text-foreground pl-8 pr-3 h-9 rounded-xl outline-none placeholder:text-muted/50 focus:border-white/20 transition-colors bg-surface border border-white/8"
                  style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.04)" }}
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
                className="flex items-center gap-1.5 text-xs text-muted font-medium px-3 h-9 rounded-xl cursor-pointer hover:text-foreground transition-colors bg-surface border border-white/8"
                style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.04)" }}
              >
                {filter === "korea" ? "고려대" : filter === "yonsei" ? "연세대" : sortBy === "recommended" ? "추천" : sortBy === "random" ? "랜덤" : "최신순"}
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
              {showSortMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowSortMenu(false)} />
                  <div className="absolute right-0 top-9 z-50 rounded-xl py-1 min-w-[100px] animate-card-rise"
                    style={{
                      background: "linear-gradient(180deg, #2a2a2a 0%, #1e1e1e 100%)",
                      border: "1px solid rgba(255,255,255,0.12)",
                      boxShadow: "0 8px 30px rgba(0,0,0,0.5), 0 2px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.08)",
                    }}
                  >
                    {([["recommended", "추천"], ["random", "랜덤"], ["latest", "최신순"]] as const).map(([value, label]) => (
                      <button
                        key={value}
                        onClick={() => { setSortBy(value); setFilter("all"); setShowSortMenu(false); }}
                        className={`w-full text-left px-3 py-2 text-xs transition-colors cursor-pointer
                          ${filter === "all" && sortBy === value ? "text-foreground font-semibold" : "text-muted hover:text-foreground hover:bg-white/5"}`}
                      >
                        {label}
                      </button>
                    ))}
                    <div className="my-1 border-t border-border/30" />
                    {([["korea", "고려대", "/korea-logo.png"], ["yonsei", "연세대", "/yonsei-logo.png"]] as const).map(([value, label, logo]) => (
                      <button
                        key={value}
                        onClick={() => { setFilter(value); setShowSortMenu(false); }}
                        className={`w-full text-left px-3 py-2 text-xs transition-colors cursor-pointer flex items-center gap-2
                          ${filter === value ? "text-foreground font-semibold" : "text-muted hover:text-foreground hover:bg-white/5"}`}
                      >
                        <img src={logo} alt={label} className="w-4 h-4 object-contain rounded-full" />
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
          <VoteStats
            entries={uniqueEntries}
            votedIds={votedIds}
            onPhotoClick={setSelectedEntry}
            revealMode={revealMode}
          />
        )}

        {activeTab === "voted" && (
          <MyVotes
            entries={uniqueEntries}
            votedIds={votedIds}
            onPhotoClick={setSelectedEntry}
          />
        )}

        {activeTab === "admin" && isAdmin && <AdminPanel />}
      </div>


      {/* Fixed voting period banner */}
      {votingLoaded && votingStatus !== "during" && !isAdmin && (
        <div className="fixed top-40 left-0 right-0 z-30 flex justify-center pointer-events-none">
          <div className="bg-black/70 backdrop-blur-sm text-white text-sm font-semibold px-6 py-3.5 rounded-full border border-white/20 shadow-lg pointer-events-auto">
            {votingStatus === "before"
              ? `투표는 ${formatKST(votingPeriod?.start)}부터 시작됩니다`
              : "투표가 종료되었습니다"}
          </div>
        </div>
      )}

      <BottomDock
        activeTab={activeTab}
        onTabChange={setActiveTab}
        votedCount={votedIds.size}
        isAdmin={isAdmin}
        revealed={showResults}
      />

      <PhotoModal
        entry={selectedEntry}
        voted={selectedEntry ? votedIds.has(selectedEntry.id) : false}
        onVote={handleVote}
        onUnvote={handleUnvote}
        onClose={() => setSelectedEntry(null)}
        canVote={canVote}
        votingStatus={votingStatus}
        votingPeriod={votingPeriod}
        revealMode={revealMode}
        isTopRank={selectedEntry ? topRankIds.has(selectedEntry.id) : false}
      />

      {showLogin && <LoginPrompt onClose={() => setShowLogin(false)} />}

      {showVotingAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setShowVotingAlert(false)}>
          <div className="bg-card rounded-3xl p-6 max-w-sm w-full text-center border border-white/10" style={{ boxShadow: "0 25px 60px rgba(0,0,0,0.5), 0 8px 20px rgba(0,0,0,0.3)" }} onClick={(e) => e.stopPropagation()}>
            <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-surface flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-foreground">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
            <h3 className="text-lg font-bold mb-1">
              {votingStatus === "before" ? "아직 투표 기간이 아닙니다" : "투표가 종료되었습니다"}
            </h3>
            <p className="text-sm text-muted mb-4">
              {votingStatus === "before"
                ? `투표 기간: ${formatKST(votingPeriod?.start)} ~ ${formatKST(votingPeriod?.end)}`
                : "결과 발표를 기대해주세요!"}
            </p>
            <button
              onClick={() => setShowVotingAlert(false)}
              className="w-full py-2.5 bg-white text-black text-sm font-semibold rounded-xl cursor-pointer active:scale-[0.97] transition-all"
            >
              확인
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function formatKST(utcStr?: string): string {
  if (!utcStr) return "";
  const d = new Date(utcStr);
  return d.toLocaleString("ko-KR", { timeZone: "Asia/Seoul", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function RevealStatsBlock({ totalVotes, totalEntries, totalVoters }: { totalVotes: number; totalEntries: number; totalVoters: number }) {
  return (
    <div className="relative mb-4 text-center">
      <p className="text-[10px] font-semibold tracking-[0.2em] text-foreground/55 uppercase mb-1 animate-stat-rise" style={{ animationDelay: "0ms" }}>
        제1회 캠퍼스 사진 고연전
      </p>
      <p className="text-[22px] font-black mb-4 animate-stat-rise tracking-tight" style={{ animationDelay: "80ms" }}>
        결과가 발표됐어요
      </p>
      <div className="grid grid-cols-3 gap-2 max-w-xs mx-auto">
        <StatTile to={totalVotes} label="총 투표수" delay={250} duration={1600} riseDelay="200ms" />
        <StatTile to={totalEntries} label="출품작" delay={400} duration={1300} riseDelay="320ms" />
        <StatTile to={totalVoters} label="참여자" delay={550} duration={1600} riseDelay="440ms" />
      </div>
      <p className="text-[11px] text-muted mt-4 animate-stat-rise" style={{ animationDelay: "560ms" }}>
        양교의 낭만이 모인 결과를 확인하세요
      </p>
    </div>
  );
}

function StatTile({
  to,
  label,
  delay,
  duration,
  riseDelay,
}: {
  to: number;
  label: string;
  delay: number;
  duration: number;
  riseDelay: string;
}) {
  const [popped, setPopped] = useState(false);
  const handleComplete = useCallback(() => {
    if (popped) return;
    setPopped(true);
  }, [popped]);
  return (
    <div className="animate-stat-rise" style={{ animationDelay: riseDelay }}>
      <div className={`inline-block ${popped ? "animate-number-pop" : ""}`}>
        <p className="text-[28px] font-rank leading-none text-foreground" style={{ transform: "translateY(2px)" }}>
          <CountUp to={to} duration={duration} delay={delay} onComplete={handleComplete} />
        </p>
      </div>
      <p className="text-[10px] text-muted mt-1.5 font-medium">{label}</p>
    </div>
  );
}
