import { createClient } from "@/utils/supabase/client";
import { PhotoEntry, PhotoWithVotesRow } from "./types";

function getSupabase() {
  return createClient();
}

function toPhotoEntry(row: PhotoWithVotesRow): PhotoEntry {
  return {
    id: row.id,
    image_url: row.image_url,
    thumb_url: row.thumb_url ?? undefined,
    nickname: row.nickname,
    club: row.club ?? undefined,
    school: row.school,
    aspect_ratio: row.aspect_ratio,
    votes: row.votes,
    location: (row as any).location ?? undefined,
  };
}

export async function fetchPhotos(
  page: number,
  pageSize: number = 20
): Promise<PhotoEntry[]> {
  const supabase = getSupabase();
  const from = page * pageSize;
  const to = from + pageSize - 1;

  const { data, error } = await supabase
    .from("photos_with_votes")
    .select("*")
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    console.error("Failed to fetch photos:", error);
    return [];
  }

  return (data as PhotoWithVotesRow[]).map(toPhotoEntry);
}

export async function fetchMyVotedIds(): Promise<Set<string>> {
  const supabase = getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Set();

  const { data, error } = await supabase
    .from("votes")
    .select("photo_id")
    .eq("voter_id", user.id);

  if (error) {
    console.error("Failed to fetch voted ids:", error);
    return new Set();
  }

  return new Set(data.map((v) => v.photo_id));
}

export async function voteForPhoto(photoId: string): Promise<boolean> {
  const supabase = getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase
    .from("votes")
    .upsert({ photo_id: photoId, voter_id: user.id }, { onConflict: "photo_id,voter_id" });

  if (error) {
    console.error("Failed to vote:", error);
    return false;
  }

  return true;
}

export async function unvotePhoto(photoId: string): Promise<boolean> {
  const supabase = getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase
    .from("votes")
    .delete()
    .eq("photo_id", photoId)
    .eq("voter_id", user.id);

  if (error) {
    console.error("Failed to unvote:", error);
    return false;
  }

  return true;
}

export async function recordPhotoClick(photoId: string): Promise<void> {
  const supabase = getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  await supabase.from("photo_clicks").insert({
    photo_id: photoId,
    user_id: user?.id || null,
  });
}

const viewedPhotos = new Set<string>();

export async function recordPhotoView(photoId: string): Promise<void> {
  // Deduplicate within session
  if (viewedPhotos.has(photoId)) return;
  viewedPhotos.add(photoId);

  const supabase = getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  await supabase.from("photo_views").insert({
    photo_id: photoId,
    user_id: user?.id || null,
  });
}
