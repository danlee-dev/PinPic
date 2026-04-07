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
    created_at: row.created_at,
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

export async function fetchVoteOverrides(): Promise<Map<string, number>> {
  const supabase = getSupabase();
  const { data, error } = await supabase.from("vote_overrides").select("photo_id, vote_offset");
  if (error) {
    console.error("Failed to fetch vote_overrides:", error);
    return new Map();
  }
  const map = new Map<string, number>();
  for (const row of (data || []) as { photo_id: string; vote_offset: number }[]) {
    map.set(row.photo_id, row.vote_offset);
  }
  return map;
}

export async function fetchTotalVoters(): Promise<number> {
  const supabase = getSupabase();
  // Count distinct voter_ids by fetching the column and dedup client-side
  // (small dataset, simpler than RPC)
  const all: { voter_id: string }[] = [];
  let from = 0;
  const pageSize = 1000;
  while (true) {
    const { data, error } = await supabase
      .from("votes")
      .select("voter_id")
      .range(from, from + pageSize - 1);
    if (error) {
      console.error("Failed to fetch voters:", error);
      break;
    }
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return new Set(all.map((v) => v.voter_id)).size;
}

export async function fetchAllVoteTimes(): Promise<Map<string, number[]>> {
  const supabase = getSupabase();
  const all: { photo_id: string; created_at: string }[] = [];
  let from = 0;
  const pageSize = 1000;
  while (true) {
    const { data, error } = await supabase
      .from("votes")
      .select("photo_id, created_at")
      .range(from, from + pageSize - 1);
    if (error) {
      console.error("Failed to fetch vote times:", error);
      break;
    }
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }

  const map = new Map<string, number[]>();
  for (const v of all) {
    const arr = map.get(v.photo_id) || [];
    arr.push(new Date(v.created_at).getTime());
    map.set(v.photo_id, arr);
  }
  return map;
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

export async function recordPhotoModalOpen(opts: { photoId: string; source: "feed" | "hall_of_fame" }): Promise<void> {
  const supabase = getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  await supabase.from("photo_modal_opens").insert({
    photo_id: opts.photoId,
    user_id: user?.id ?? null,
    source: opts.source,
  });
}

export async function recordFakeDoorClick(opts: { photoId?: string; source: string }): Promise<void> {
  const supabase = getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  await supabase.from("fake_door_clicks").insert({
    photo_id: opts.photoId ?? null,
    user_id: user?.id ?? null,
    source: opts.source,
  });
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
