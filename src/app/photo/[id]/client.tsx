"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { PhotoEntry } from "@/lib/types";
import { voteForPhoto, unvotePhoto, fetchMyVotedIds } from "@/lib/api";
import { useAuth } from "@/components/auth-provider";
import { PhotoModal } from "@/components/photo-modal";
import { LoginPrompt } from "@/components/login-prompt";

export function PhotoPageClient({ id }: { id: string }) {
  const router = useRouter();
  const { user } = useAuth();
  const [entry, setEntry] = useState<PhotoEntry | null>(null);
  const [votedIds, setVotedIds] = useState<Set<string>>(new Set());
  const [showLogin, setShowLogin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("photos_with_votes")
      .select("*")
      .eq("id", id)
      .single()
      .then(({ data }) => {
        if (data) {
          setEntry({
            id: data.id,
            image_url: data.image_url,
            thumb_url: data.thumb_url ?? undefined,
            nickname: data.nickname,
            club: data.club ?? undefined,
            school: data.school,
            aspect_ratio: data.aspect_ratio,
            votes: data.votes,
          });
        }
        setLoading(false);
      });
  }, [id]);

  useEffect(() => {
    if (user) {
      fetchMyVotedIds().then(setVotedIds);
    }
  }, [user]);

  const handleVote = async (photoId: string) => {
    if (!user) {
      setShowLogin(true);
      return;
    }
    setVotedIds((prev) => new Set(prev).add(photoId));
    setEntry((prev) => prev ? { ...prev, votes: prev.votes + 1 } : prev);
    const success = await voteForPhoto(photoId);
    if (!success) {
      setVotedIds((prev) => { const next = new Set(prev); next.delete(photoId); return next; });
      setEntry((prev) => prev ? { ...prev, votes: prev.votes - 1 } : prev);
    }
  };

  const handleUnvote = async (photoId: string) => {
    setVotedIds((prev) => { const next = new Set(prev); next.delete(photoId); return next; });
    setEntry((prev) => prev ? { ...prev, votes: Math.max(0, prev.votes - 1) } : prev);
    const success = await unvotePhoto(photoId);
    if (!success) {
      setVotedIds((prev) => new Set(prev).add(photoId));
      setEntry((prev) => prev ? { ...prev, votes: prev.votes + 1 } : prev);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-border border-t-foreground rounded-full animate-spin" />
      </div>
    );
  }

  if (!entry) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3">
        <p className="text-muted">사진을 찾을 수 없습니다</p>
        <button onClick={() => router.push("/")} className="text-sm text-yonsei cursor-pointer">홈으로 돌아가기</button>
      </div>
    );
  }

  return (
    <>
      <PhotoModal
        entry={entry}
        voted={votedIds.has(entry.id)}
        onVote={handleVote}
        onUnvote={handleUnvote}
        onClose={() => router.push("/")}
      />
      {showLogin && <LoginPrompt onClose={() => setShowLogin(false)} />}
    </>
  );
}
