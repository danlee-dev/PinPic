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
  total: { views: number; clicks: number; rate: number; loggedInViews: number; anonViews: number; loggedInClicks: number; anonClicks: number };
  byPhoto: { photo_id: string; nickname: string; school: string; views: number; clicks: number; rate: number }[];
  byUser: { user_id: string; email: string; views: number; clicks: number; rate: number }[];
}

export async function fetchEngagementStats(): Promise<EngagementStats> {
  const supabase = getSupabase();

  // Fetch from DB views (aggregated server-side)
  const [{ data: totals }, { data: byPhoto }, { data: byUserRaw }] = await Promise.all([
    supabase.from("engagement_totals").select("*").single(),
    supabase.from("engagement_by_photo").select("*"),
    supabase.rpc("engagement_by_user"),
  ]);

  const t = totals || { total_views: 0, total_clicks: 0, logged_in_views: 0, anon_views: 0, logged_in_clicks: 0, anon_clicks: 0 };
  const totalViews = t.total_views || 0;
  const totalClicks = t.total_clicks || 0;

  // Resolve user emails
  const userRows = (byUserRaw || []) as { user_id: string; views: number; clicks: number }[];
  const userIds = userRows.map(u => u.user_id);
  let emailMap: Record<string, string> = {};
  if (userIds.length > 0) {
    try {
      const res = await fetch("/api/admin/user-emails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userIds }),
      });
      if (res.ok) emailMap = await res.json();
    } catch {}
    for (const id of userIds) {
      if (!emailMap[id]) emailMap[id] = id.slice(0, 8) + "...";
    }
  }

  return {
    total: { views: totalViews, clicks: totalClicks, rate: totalViews > 0 ? Math.round((totalClicks / totalViews) * 100) : 0, loggedInViews: t.logged_in_views || 0, anonViews: t.anon_views || 0, loggedInClicks: t.logged_in_clicks || 0, anonClicks: t.anon_clicks || 0 },
    byPhoto: ((byPhoto || []) as any[])
      .map(p => ({ photo_id: p.photo_id, nickname: p.nickname, school: p.school, views: p.views || 0, clicks: p.clicks || 0, rate: p.views > 0 ? Math.round((p.clicks / p.views) * 100) : 0 }))
      .sort((a, b) => b.views - a.views),
    byUser: userRows
      .map(u => ({ user_id: u.user_id, email: emailMap[u.user_id] || u.user_id.slice(0, 8) + "...", views: u.views, clicks: u.clicks, rate: u.views > 0 ? Math.round((u.clicks / u.views) * 100) : 0 }))
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
