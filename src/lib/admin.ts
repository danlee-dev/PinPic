import { createClient } from "@/utils/supabase/client";
import { PhotoWithVotesRow, VotingPeriod, AdminUser } from "./types";

function getSupabase() {
  return createClient();
}

export async function checkIsAdmin(): Promise<boolean> {
  try {
    const supabase = getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data } = await supabase
      .from("admins")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    return !!data;
  } catch {
    return false;
  }
}

export async function fetchVotingPeriod(): Promise<VotingPeriod | null> {
  const supabase = getSupabase();
  const { data } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "voting_period")
    .single();

  if (!data) return null;
  return data.value as VotingPeriod;
}

export async function updateVotingPeriod(start: string, end: string): Promise<boolean> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from("app_settings")
    .update({ value: { start, end }, updated_at: new Date().toISOString() })
    .eq("key", "voting_period");

  return !error;
}

export async function fetchPendingPhotos(): Promise<PhotoWithVotesRow[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("photos_admin_all")
    .select("*")
    .eq("status", "pending");

  if (error) return [];
  return data as PhotoWithVotesRow[];
}

export async function fetchAllPhotosAdmin(): Promise<PhotoWithVotesRow[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("photos_admin_all")
    .select("*");

  if (error) return [];
  return data as PhotoWithVotesRow[];
}

export async function approvePhoto(id: string): Promise<boolean> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from("photos")
    .update({ status: "approved" })
    .eq("id", id);

  return !error;
}

export async function rejectPhoto(id: string): Promise<boolean> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from("photos")
    .update({ status: "rejected" })
    .eq("id", id);

  return !error;
}

export async function deletePhoto(id: string): Promise<boolean> {
  const res = await fetch("/api/admin/delete-photo", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id }),
  });
  return res.ok;
}

export async function fetchAdmins(): Promise<AdminUser[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("admins")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) return [];
  return data as AdminUser[];
}

export async function addAdmin(email: string): Promise<{ success: boolean; error?: string }> {
  const res = await fetch("/api/admin/add-admin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  const data = await res.json();
  if (!res.ok) return { success: false, error: data.error };
  return { success: true };
}

export async function removeAdmin(userId: string): Promise<boolean> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from("admins")
    .delete()
    .eq("user_id", userId);

  return !error;
}

export async function fetchPhotoClicks(): Promise<{ photo_id: string; nickname: string; school: string; click_count: number }[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("photo_clicks")
    .select("photo_id, photos(nickname, school)")
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  const counts: Record<string, { nickname: string; school: string; count: number }> = {};
  for (const row of data as any[]) {
    const pid = row.photo_id;
    if (!counts[pid]) {
      counts[pid] = { nickname: row.photos?.nickname || "?", school: row.photos?.school || "?", count: 0 };
    }
    counts[pid].count++;
  }

  return Object.entries(counts)
    .map(([photo_id, v]) => ({ photo_id, nickname: v.nickname, school: v.school, click_count: v.count }))
    .sort((a, b) => b.click_count - a.click_count);
}

export function isVotingOpen(period: VotingPeriod | null): boolean {
  if (!period) return false;
  const now = new Date();
  return now >= new Date(period.start) && now <= new Date(period.end);
}

export function getVotingStatus(period: VotingPeriod | null): "before" | "during" | "after" {
  if (!period) return "before";
  const now = new Date();
  if (now < new Date(period.start)) return "before";
  if (now > new Date(period.end)) return "after";
  return "during";
}
