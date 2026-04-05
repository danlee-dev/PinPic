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

export interface EngagementStats {
  total: { views: number; clicks: number; rate: number };
  byPhoto: { photo_id: string; nickname: string; school: string; views: number; clicks: number; rate: number }[];
  byUser: { user_id: string; email: string; views: number; clicks: number; rate: number }[];
}

export async function fetchEngagementStats(): Promise<EngagementStats> {
  const supabase = getSupabase();

  // Get admin user IDs to exclude
  const { data: adminData } = await supabase.from("admins").select("user_id");
  const adminIds = new Set((adminData || []).map((a: any) => a.user_id));

  // Fetch views and clicks
  const [{ data: views }, { data: clicks }] = await Promise.all([
    supabase.from("photo_views").select("photo_id, user_id, photos(nickname, school)"),
    supabase.from("photo_clicks").select("photo_id, user_id, photos(nickname, school)"),
  ]);

  const safeViews = ((views || []) as any[]).filter(v => !v.user_id || !adminIds.has(v.user_id));
  const safeClicks = ((clicks || []) as any[]).filter(c => !c.user_id || !adminIds.has(c.user_id));

  // Total
  const totalViews = safeViews.length;
  const totalClicks = safeClicks.length;

  // By photo
  const photoMap: Record<string, { nickname: string; school: string; views: number; clicks: number }> = {};
  for (const v of safeViews) {
    const pid = v.photo_id;
    if (!photoMap[pid]) photoMap[pid] = { nickname: v.photos?.nickname || "?", school: v.photos?.school || "?", views: 0, clicks: 0 };
    photoMap[pid].views++;
  }
  for (const c of safeClicks) {
    const pid = c.photo_id;
    if (!photoMap[pid]) photoMap[pid] = { nickname: c.photos?.nickname || "?", school: c.photos?.school || "?", views: 0, clicks: 0 };
    photoMap[pid].clicks++;
  }

  // By user (only logged-in users)
  const userMap: Record<string, { views: number; clicks: number }> = {};
  for (const v of safeViews) {
    if (!v.user_id) continue;
    if (!userMap[v.user_id]) userMap[v.user_id] = { views: 0, clicks: 0 };
    userMap[v.user_id].views++;
  }
  for (const c of safeClicks) {
    if (!c.user_id) continue;
    if (!userMap[c.user_id]) userMap[c.user_id] = { views: 0, clicks: 0 };
    userMap[c.user_id].clicks++;
  }

  // Resolve user emails
  const userIds = Object.keys(userMap);
  let emailMap: Record<string, string> = {};
  if (userIds.length > 0) {
    const { data: users } = await supabase.from("admins").select("user_id"); // dummy to get auth - we'll use user_id as fallback
    // Since we can't query auth.users from client, use user_id as identifier
    emailMap = Object.fromEntries(userIds.map(id => [id, id.slice(0, 8) + "..."]));
  }

  return {
    total: { views: totalViews, clicks: totalClicks, rate: totalViews > 0 ? Math.round((totalClicks / totalViews) * 100) : 0 },
    byPhoto: Object.entries(photoMap)
      .map(([photo_id, v]) => ({ photo_id, ...v, rate: v.views > 0 ? Math.round((v.clicks / v.views) * 100) : 0 }))
      .sort((a, b) => b.views - a.views),
    byUser: Object.entries(userMap)
      .map(([user_id, v]) => ({ user_id, email: emailMap[user_id] || user_id, ...v, rate: v.views > 0 ? Math.round((v.clicks / v.views) * 100) : 0 }))
      .sort((a, b) => b.views - a.views),
  };
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
