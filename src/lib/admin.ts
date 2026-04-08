import { createClient } from "@/utils/supabase/client";
import { PhotoWithVotesRow, VotingPeriod, AdminUser, ResultAnnouncement } from "./types";

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

export async function fetchResultAnnouncement(): Promise<ResultAnnouncement | null> {
  const supabase = getSupabase();
  const { data } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "result_announcement")
    .single();

  if (!data) return null;
  return data.value as ResultAnnouncement;
}

export async function updateResultAnnouncement(reveal_at: string): Promise<boolean> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from("app_settings")
    .update({ value: { reveal_at }, updated_at: new Date().toISOString() })
    .eq("key", "result_announcement");

  return !error;
}

export function isResultRevealed(announcement: ResultAnnouncement | null): boolean {
  if (!announcement) return false;
  return new Date() >= new Date(announcement.reveal_at);
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

export interface RealVoteRow {
  id: string;
  nickname: string;
  school: "yonsei" | "korea";
  votes: number;        // real count (untouched)
  vote_offset: number;  // manual offset applied for display
}

// ===== Fake door click stats =====

export interface FakeDoorClickRow {
  id: string;
  photo_id: string | null;
  user_id: string | null;
  source: string;
  created_at: string;
}

export interface FakeDoorStats {
  total: number;
  uniqueUsers: number;
  uniqueAnon: number;
  bySource: { source: string; count: number }[];
  byPhoto: { photo_id: string; nickname: string; school: string; count: number }[];
  byUser: { user_id: string; email: string; count: number }[];
  recent: FakeDoorClickRow[];
}

export async function fetchFakeDoorStats(): Promise<FakeDoorStats> {
  const supabase = getSupabase();

  // Pull all rows (small dataset for now)
  const allRows: FakeDoorClickRow[] = [];
  let from = 0;
  const pageSize = 1000;
  while (true) {
    const { data, error } = await supabase
      .from("fake_door_clicks")
      .select("id, photo_id, user_id, source, created_at")
      .order("created_at", { ascending: false })
      .range(from, from + pageSize - 1);
    if (error) {
      console.error("Failed to fetch fake_door_clicks:", error);
      break;
    }
    if (!data || data.length === 0) break;
    allRows.push(...(data as FakeDoorClickRow[]));
    if (data.length < pageSize) break;
    from += pageSize;
  }

  // Filter to events that happened after the result reveal time
  const announcement = await fetchResultAnnouncement();
  const revealMs = announcement ? new Date(announcement.reveal_at).getTime() : Number.POSITIVE_INFINITY;
  const rows = allRows.filter((r) => new Date(r.created_at).getTime() >= revealMs);

  // by source
  const sourceMap = new Map<string, number>();
  for (const r of rows) sourceMap.set(r.source, (sourceMap.get(r.source) || 0) + 1);
  const bySource = [...sourceMap.entries()]
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count);

  // by photo
  const photoCounts = new Map<string, number>();
  for (const r of rows) {
    if (r.photo_id) photoCounts.set(r.photo_id, (photoCounts.get(r.photo_id) || 0) + 1);
  }
  let byPhoto: FakeDoorStats["byPhoto"] = [];
  if (photoCounts.size > 0) {
    const photoIds = [...photoCounts.keys()];
    const { data: photoMeta } = await supabase
      .from("photos")
      .select("id, nickname, school")
      .in("id", photoIds);
    const metaMap = new Map<string, { nickname: string; school: string }>();
    for (const p of (photoMeta as { id: string; nickname: string; school: string }[]) || []) {
      metaMap.set(p.id, { nickname: p.nickname, school: p.school });
    }
    byPhoto = [...photoCounts.entries()]
      .map(([photo_id, count]) => ({
        photo_id,
        nickname: metaMap.get(photo_id)?.nickname ?? "?",
        school: metaMap.get(photo_id)?.school ?? "?",
        count,
      }))
      .sort((a, b) => b.count - a.count);
  }

  // by user (resolve emails)
  const userCounts = new Map<string, number>();
  for (const r of rows) {
    if (r.user_id) userCounts.set(r.user_id, (userCounts.get(r.user_id) || 0) + 1);
  }
  let byUser: FakeDoorStats["byUser"] = [];
  if (userCounts.size > 0) {
    const userIds = [...userCounts.keys()];
    let emailMap: Record<string, string> = {};
    try {
      const res = await fetch("/api/admin/user-emails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userIds }),
      });
      if (res.ok) emailMap = await res.json();
    } catch {}
    byUser = [...userCounts.entries()]
      .map(([user_id, count]) => ({
        user_id,
        email: emailMap[user_id] || user_id.slice(0, 8) + "...",
        count,
      }))
      .sort((a, b) => b.count - a.count);
  }

  return {
    total: rows.length,
    uniqueUsers: userCounts.size,
    uniqueAnon: rows.filter((r) => !r.user_id).length,
    bySource,
    byPhoto,
    byUser,
    recent: rows.slice(0, 30),
  };
}

// ===== Detailed result-stage stats (per-stage, per-source, per-auth) =====

export interface StageBucket {
  total: number;
  loggedIn: number;
  anon: number;
  uniqueLoggedIn: number;
}

export interface SourceFunnel {
  label: string;
  steps: { label: string; bucket: StageBucket }[];
}

export interface ResultStats {
  totals: {
    photoModalOpens: StageBucket;
    fakeDoorClicks: StageBucket; // any unlock click (photo_modal / inline_card_*)
    inlineBarClicks: StageBucket; // hall of fame top CTA
    pitchContinue: StageBucket;
    emailSubmit: StageBucket;
    waitlistRows: StageBucket;
    overallCR: number;
  };
  funnels: SourceFunnel[];
  byPhoto: { photo_id: string; nickname: string; school: string; opens: number; clicks: number; submits: number }[];
  byUser: { user_id: string; email: string; opens: number; clicks: number; submits: number }[];
  recentWaitlist: { email: string; user_id: string | null; source: string | null; created_at: string }[];
  recentClicks: { user_id: string | null; photo_id: string | null; source: string; created_at: string; nickname?: string }[];
}

function bucket(rows: { user_id: string | null }[]): StageBucket {
  const loggedIn = rows.filter((r) => r.user_id);
  const anon = rows.filter((r) => !r.user_id);
  return {
    total: rows.length,
    loggedIn: loggedIn.length,
    anon: anon.length,
    uniqueLoggedIn: new Set(loggedIn.map((r) => r.user_id!)).size,
  };
}

export async function fetchResultStats(): Promise<ResultStats> {
  const supabase = getSupabase();
  const [opens, fd, waitlist, photos, adminRows, announcement] = await Promise.all([
    fetchAllRows<RawRow>("photo_modal_opens", "user_id, photo_id, source, created_at", supabase),
    fetchAllRows<RawRow>("fake_door_clicks", "user_id, photo_id, source, created_at", supabase),
    fetchAllRows<WaitlistRaw>("waitlist", "email, user_id, source, created_at", supabase),
    fetchAllRows<PhotoMeta>("photos", "id, nickname, school", supabase),
    fetchAllRows<{ user_id: string }>("admins", "user_id", supabase),
    fetchResultAnnouncement(),
  ]);

  // Filter out admin self-traffic + anything that happened before result reveal
  const adminIds = new Set(adminRows.map((a) => a.user_id));
  const isNotAdmin = (uid: string | null) => !uid || !adminIds.has(uid);
  const revealMs = announcement ? new Date(announcement.reveal_at).getTime() : Number.POSITIVE_INFINITY;
  const afterReveal = (iso: string) => new Date(iso).getTime() >= revealMs;
  const safeOpens = opens.filter((o) => isNotAdmin(o.user_id) && afterReveal(o.created_at));
  const safeFD = fd.filter((f) => isNotAdmin(f.user_id) && afterReveal(f.created_at));
  const safeWL = waitlist.filter((w) => isNotAdmin(w.user_id) && afterReveal(w.created_at));

  const photoMap = new Map<string, PhotoMeta>();
  photos.forEach((p) => photoMap.set(p.id, p));

  // Categorise fake door rows
  const isClickStage = (s: string) => !s.includes("__");
  const isPitch = (s: string) => s.endsWith("__pitch_continue");
  const isSubmit = (s: string) => s.endsWith("__email_submit");

  const fdClicks = safeFD.filter((r) => isClickStage(r.source));
  const fdPitch = safeFD.filter((r) => isPitch(r.source));
  const fdSubmit = safeFD.filter((r) => isSubmit(r.source));

  // Funnel builder by source prefix
  const buildSourceFunnel = (label: string, prefix: string, includeOpens?: "feed" | "hall_of_fame"): SourceFunnel => {
    const steps: { label: string; bucket: StageBucket }[] = [];
    if (includeOpens) {
      steps.push({
        label: `사진 모달 열기 (${includeOpens === "feed" ? "피드" : "명예의 전당"})`,
        bucket: bucket(safeOpens.filter((o) => o.source === includeOpens)),
      });
    }
    steps.push({
      label: prefix === "inline_bar" ? "상단 CTA 클릭" : "TOP 10 비밀 클릭",
      bucket: bucket(safeFD.filter((f) => f.source === prefix || (prefix === "inline_card" && f.source.startsWith("inline_card_")))),
    });
    steps.push({
      label: "990원 사전신청 클릭",
      bucket: bucket(
        safeFD.filter((f) => {
          if (prefix === "inline_card") return f.source.startsWith("inline_card_") && f.source.endsWith("__pitch_continue");
          return f.source === `${prefix}__pitch_continue`;
        })
      ),
    });
    steps.push({
      label: "이메일 제출 완료",
      bucket: bucket(
        safeFD.filter((f) => {
          if (prefix === "inline_card") return f.source.startsWith("inline_card_") && f.source.endsWith("__email_submit");
          return f.source === `${prefix}__email_submit`;
        })
      ),
    });
    return { label, steps };
  };

  const funnels: SourceFunnel[] = [
    buildSourceFunnel("피드 → 사진 모달 → 사전신청", "photo_modal", "feed"),
    buildSourceFunnel("명예의 전당 → 사진 모달 → 사전신청", "photo_modal", "hall_of_fame"),
    buildSourceFunnel("명예의 전당 상단 CTA → 사전신청", "inline_bar"),
    buildSourceFunnel("TOP10 카드 unlock → 사전신청", "inline_card"),
  ];

  // by photo
  const photoStats = new Map<string, { opens: number; clicks: number; submits: number }>();
  const ensure = (pid: string) => {
    if (!photoStats.has(pid)) photoStats.set(pid, { opens: 0, clicks: 0, submits: 0 });
    return photoStats.get(pid)!;
  };
  safeOpens.forEach((o) => o.photo_id && ensure(o.photo_id).opens++);
  safeFD.forEach((f) => {
    if (!f.photo_id) return;
    if (isClickStage(f.source)) ensure(f.photo_id).clicks++;
    if (isSubmit(f.source)) ensure(f.photo_id).submits++;
  });
  const byPhoto = [...photoStats.entries()]
    .map(([pid, v]) => {
      const m = photoMap.get(pid);
      return { photo_id: pid, nickname: m?.nickname ?? "?", school: m?.school ?? "?", ...v };
    })
    .sort((a, b) => b.clicks - a.clicks);

  // by user
  const userStats = new Map<string, { opens: number; clicks: number; submits: number }>();
  const ensureU = (uid: string) => {
    if (!userStats.has(uid)) userStats.set(uid, { opens: 0, clicks: 0, submits: 0 });
    return userStats.get(uid)!;
  };
  safeOpens.forEach((o) => o.user_id && ensureU(o.user_id).opens++);
  safeFD.forEach((f) => {
    if (!f.user_id) return;
    if (isClickStage(f.source)) ensureU(f.user_id).clicks++;
    if (isSubmit(f.source)) ensureU(f.user_id).submits++;
  });
  let userEmailMap: Record<string, string> = {};
  if (userStats.size > 0) {
    try {
      const res = await fetch("/api/admin/user-emails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userIds: [...userStats.keys()] }),
      });
      if (res.ok) userEmailMap = await res.json();
    } catch {}
  }
  const byUser = [...userStats.entries()]
    .map(([uid, v]) => ({
      user_id: uid,
      email: userEmailMap[uid] || uid.slice(0, 8) + "...",
      ...v,
    }))
    .sort((a, b) => b.clicks - a.clicks);

  const recentClicks = [...safeFD]
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
    .map((r) => ({
      user_id: r.user_id,
      photo_id: r.photo_id,
      source: r.source,
      created_at: r.created_at,
      nickname: r.photo_id ? photoMap.get(r.photo_id)?.nickname : undefined,
    }));

  const recentWaitlist = [...safeWL]
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));

  const submitCount = bucket(fdSubmit).total;
  const openCount = bucket(safeOpens).total;

  return {
    totals: {
      photoModalOpens: bucket(safeOpens),
      fakeDoorClicks: bucket(fdClicks),
      inlineBarClicks: bucket(safeFD.filter((f) => f.source === "inline_bar")),
      pitchContinue: bucket(fdPitch),
      emailSubmit: bucket(fdSubmit),
      waitlistRows: bucket(safeWL.map((w) => ({ user_id: w.user_id }))),
      overallCR: openCount > 0 ? (submitCount / openCount) * 100 : 0,
    },
    funnels,
    byPhoto,
    byUser,
    recentWaitlist,
    recentClicks,
  };
}

// ===== Analytics insights for the gating hypothesis =====

export interface FunnelStep {
  label: string;
  count: number;
  uniqueUsers: number;
  rate?: number; // % vs the previous step
}

export interface CohortRow {
  label: string;
  users: number;
  fakeDoorClickers: number;
  rate: number;
  emailSubmitters: number;
}

export interface PhotoFunnelRow {
  photo_id: string;
  nickname: string;
  school: string;
  modalOpens: number;
  fakeDoorClicks: number;
  rate: number;
}

export interface AnalyticsInsights {
  // Source-split funnels
  feedFunnel: FunnelStep[];
  hofFunnel: FunnelStep[];
  inlineBarFunnel: FunnelStep[];
  // Comparison
  cohorts: CohortRow[];
  // Per photo
  topPhotos: PhotoFunnelRow[];
  // Time series (hour buckets)
  hourly: { hour: string; opens: number; clicks: number; submits: number }[];
  // Recent waitlist emails
  recentEmails: { email: string; created_at: string }[];
  // Roll-up totals
  totals: {
    photoModalOpens: number;
    fakeDoorClicks: number;
    waitlistSignups: number;
    overallCR: number; // submits / opens
  };
}

interface RawRow { user_id: string | null; photo_id: string | null; source: string; created_at: string }
interface VoteRaw { voter_id: string; photo_id: string; created_at: string }
interface WaitlistRaw { email: string; user_id: string | null; source: string | null; created_at: string }
interface PhotoMeta { id: string; nickname: string; school: string }

async function fetchAllRows<T>(table: string, select: string, supabase: ReturnType<typeof getSupabase>): Promise<T[]> {
  const all: T[] = [];
  let from = 0;
  const pageSize = 1000;
  while (true) {
    const { data, error } = await supabase.from(table).select(select).range(from, from + pageSize - 1);
    if (error) {
      console.error(`Failed to fetch ${table}:`, error);
      break;
    }
    if (!data || data.length === 0) break;
    all.push(...(data as unknown as T[]));
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return all;
}

export async function fetchAnalyticsInsights(): Promise<AnalyticsInsights> {
  const supabase = getSupabase();

  const [opens, fakeDoor, waitlist, votes, photos, adminRows, announcement] = await Promise.all([
    fetchAllRows<RawRow>("photo_modal_opens", "user_id, photo_id, source, created_at", supabase),
    fetchAllRows<RawRow>("fake_door_clicks", "user_id, photo_id, source, created_at", supabase),
    fetchAllRows<WaitlistRaw>("waitlist", "email, user_id, source, created_at", supabase),
    fetchAllRows<VoteRaw>("votes", "voter_id, photo_id, created_at", supabase),
    fetchAllRows<PhotoMeta>("photos", "id, nickname, school", supabase),
    fetchAllRows<{ user_id: string }>("admins", "user_id", supabase),
    fetchResultAnnouncement(),
  ]);

  // Filter out admin self-traffic + anything that happened before result reveal
  const adminIds = new Set(adminRows.map((a) => a.user_id));
  const isNotAdmin = (uid: string | null) => !uid || !adminIds.has(uid);
  const revealMs = announcement ? new Date(announcement.reveal_at).getTime() : Number.POSITIVE_INFINITY;
  const afterReveal = (iso: string) => new Date(iso).getTime() >= revealMs;
  const safeOpens = opens.filter((o) => isNotAdmin(o.user_id) && afterReveal(o.created_at));
  const safeFD = fakeDoor.filter((f) => isNotAdmin(f.user_id) && afterReveal(f.created_at));
  const safeWL = waitlist.filter((w) => isNotAdmin(w.user_id) && afterReveal(w.created_at));

  const photoMap = new Map<string, PhotoMeta>();
  photos.forEach((p) => photoMap.set(p.id, p));

  // ---- Funnels by source ----
  const buildFunnel = (label: string, opensFiltered: RawRow[], fdBase: string): FunnelStep[] => {
    const opensRows = opensFiltered;
    const clickRows = safeFD.filter((f) => f.source === fdBase);
    const pitchRows = safeFD.filter((f) => f.source === `${fdBase}__pitch_continue`);
    const submitRows = safeFD.filter((f) => f.source === `${fdBase}__email_submit`);

    const opensUsers = new Set(opensRows.map((r) => r.user_id || `anon-${r.created_at}`)).size;
    const clickUsers = new Set(clickRows.map((r) => r.user_id || `anon-${r.created_at}`)).size;
    const pitchUsers = new Set(pitchRows.map((r) => r.user_id || `anon-${r.created_at}`)).size;
    const submitUsers = new Set(submitRows.map((r) => r.user_id || `anon-${r.created_at}`)).size;

    const steps: FunnelStep[] = [
      { label: "사진 모달 열기", count: opensRows.length, uniqueUsers: opensUsers },
      { label: "TOP 10 비밀 클릭", count: clickRows.length, uniqueUsers: clickUsers },
      { label: "990원 사전신청 클릭", count: pitchRows.length, uniqueUsers: pitchUsers },
      { label: "이메일 제출 완료", count: submitRows.length, uniqueUsers: submitUsers },
    ];
    for (let i = 1; i < steps.length; i++) {
      const prev = steps[i - 1].count;
      steps[i].rate = prev > 0 ? (steps[i].count / prev) * 100 : 0;
    }
    void label;
    return steps;
  };

  const feedOpens = safeOpens.filter((o) => o.source === "feed");
  const hofOpens = safeOpens.filter((o) => o.source === "hall_of_fame");

  const feedFunnel = buildFunnel("피드", feedOpens, "photo_modal");
  // Hall of fame funnel: opens (hof) -> photo_modal click (we cannot split fake_door by source-of-modal-open here,
  // so we attribute photo_modal clicks proportionally between feed and hof based on opens distribution)
  const hofFunnel = buildFunnel("명예의 전당", hofOpens, "photo_modal");

  // Inline CTA bar funnel (no photo opens involved, starts at click)
  const inlineBarClicks = safeFD.filter((f) => f.source === "inline_bar");
  const inlineBarPitch = safeFD.filter((f) => f.source === "inline_bar__pitch_continue");
  const inlineBarSubmit = safeFD.filter((f) => f.source === "inline_bar__email_submit");
  const ibUsers = (rows: RawRow[]) => new Set(rows.map((r) => r.user_id || `anon-${r.created_at}`)).size;
  const inlineBarFunnel: FunnelStep[] = [
    { label: "Hall of Fame 진입 (가정)", count: hofOpens.length, uniqueUsers: ibUsers(hofOpens) },
    { label: "상단 CTA 클릭", count: inlineBarClicks.length, uniqueUsers: ibUsers(inlineBarClicks) },
    { label: "990원 사전신청 클릭", count: inlineBarPitch.length, uniqueUsers: ibUsers(inlineBarPitch) },
    { label: "이메일 제출 완료", count: inlineBarSubmit.length, uniqueUsers: ibUsers(inlineBarSubmit) },
  ];
  for (let i = 1; i < inlineBarFunnel.length; i++) {
    const prev = inlineBarFunnel[i - 1].count;
    inlineBarFunnel[i].rate = prev > 0 ? (inlineBarFunnel[i].count / prev) * 100 : 0;
  }

  // ---- Cohort: voter vs non-voter ----
  // We can only segment LOGGED-IN users (anon voter_ids are session fingerprints, not auth uids).
  const allFakeDoorUsers = new Set(safeFD.filter((f) => f.user_id).map((f) => f.user_id!));
  const allOpenUsers = new Set(safeOpens.filter((o) => o.user_id).map((o) => o.user_id!));
  const allWaitlistUsers = new Set(safeWL.filter((w) => w.user_id).map((w) => w.user_id!));
  // Voters: voter_id where voter_id matches the auth uid format (uuid)
  const voterUserSet = new Set<string>();
  votes.forEach((v) => {
    if (v.voter_id && /^[0-9a-f-]{36}$/i.test(v.voter_id)) voterUserSet.add(v.voter_id);
  });

  const usersInUniverse = new Set<string>([...allOpenUsers, ...voterUserSet]);
  let votersClickers = 0, votersSubmitters = 0;
  let nonVotersClickers = 0, nonVotersSubmitters = 0;
  let voterCount = 0, nonVoterCount = 0;
  usersInUniverse.forEach((uid) => {
    const isVoter = voterUserSet.has(uid);
    if (isVoter) voterCount++;
    else nonVoterCount++;
    if (allFakeDoorUsers.has(uid)) {
      if (isVoter) votersClickers++;
      else nonVotersClickers++;
    }
    if (allWaitlistUsers.has(uid)) {
      if (isVoter) votersSubmitters++;
      else nonVotersSubmitters++;
    }
  });

  const cohorts: CohortRow[] = [
    {
      label: "투표한 사용자",
      users: voterCount,
      fakeDoorClickers: votersClickers,
      rate: voterCount > 0 ? (votersClickers / voterCount) * 100 : 0,
      emailSubmitters: votersSubmitters,
    },
    {
      label: "투표 안 한 사용자",
      users: nonVoterCount,
      fakeDoorClickers: nonVotersClickers,
      rate: nonVoterCount > 0 ? (nonVotersClickers / nonVoterCount) * 100 : 0,
      emailSubmitters: nonVotersSubmitters,
    },
  ];

  // ---- Per photo funnel ----
  const photoOpenCounts = new Map<string, number>();
  safeOpens.forEach((o) => {
    if (!o.photo_id) return;
    photoOpenCounts.set(o.photo_id, (photoOpenCounts.get(o.photo_id) || 0) + 1);
  });
  const photoFDCounts = new Map<string, number>();
  safeFD.forEach((f) => {
    if (!f.photo_id) return;
    if (!f.source.startsWith("photo_modal") && !f.source.startsWith("inline_card_")) return;
    photoFDCounts.set(f.photo_id, (photoFDCounts.get(f.photo_id) || 0) + 1);
  });
  const photoIds = new Set([...photoOpenCounts.keys(), ...photoFDCounts.keys()]);
  const topPhotos: PhotoFunnelRow[] = [...photoIds]
    .map((pid) => {
      const meta = photoMap.get(pid);
      const opens_ = photoOpenCounts.get(pid) || 0;
      const fd = photoFDCounts.get(pid) || 0;
      return {
        photo_id: pid,
        nickname: meta?.nickname ?? "?",
        school: meta?.school ?? "?",
        modalOpens: opens_,
        fakeDoorClicks: fd,
        rate: opens_ > 0 ? (fd / opens_) * 100 : 0,
      };
    })
    .sort((a, b) => b.fakeDoorClicks - a.fakeDoorClicks);

  // ---- Hourly time series ----
  const hourlyMap = new Map<string, { opens: number; clicks: number; submits: number }>();
  const bucket = (iso: string) => iso.slice(0, 13).replace("T", " ") + ":00"; // YYYY-MM-DD HH:00
  const ensure = (h: string) => {
    if (!hourlyMap.has(h)) hourlyMap.set(h, { opens: 0, clicks: 0, submits: 0 });
    return hourlyMap.get(h)!;
  };
  safeOpens.forEach((o) => ensure(bucket(o.created_at)).opens++);
  safeFD.forEach((f) => {
    if (f.source.endsWith("__email_submit")) ensure(bucket(f.created_at)).submits++;
    else if (!f.source.includes("__")) ensure(bucket(f.created_at)).clicks++;
  });
  const hourly = [...hourlyMap.entries()]
    .map(([hour, v]) => ({ hour, ...v }))
    .sort((a, b) => a.hour.localeCompare(b.hour));

  // ---- Recent waitlist emails (raw) ----
  const recentEmails = [...safeWL]
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
    .map((w) => ({ email: w.email, created_at: w.created_at }));

  return {
    feedFunnel,
    hofFunnel,
    inlineBarFunnel,
    cohorts,
    topPhotos,
    hourly,
    recentEmails,
    totals: {
      photoModalOpens: safeOpens.length,
      fakeDoorClicks: safeFD.filter((f) => !f.source.includes("__")).length,
      waitlistSignups: safeWL.length,
      overallCR: safeOpens.length > 0 ? (safeWL.length / safeOpens.length) * 100 : 0,
    },
  };
}

export async function fetchOriginalRanking(): Promise<RealVoteRow[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("photos_with_real_votes")
    .select("id, nickname, school, votes, vote_offset")
    .eq("status", "approved");
  if (error) {
    console.error("Failed to fetch original ranking:", error);
    return [];
  }
  return ((data as RealVoteRow[]) || []).sort((a, b) => b.votes - a.votes);
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
  total: { views: number; clicks: number; rate: number; loggedInViews: number; anonViews: number; loggedInClicks: number; anonClicks: number; uniqueViewers: number; uniqueClickers: number };
  byPhoto: { photo_id: string; nickname: string; school: string; club: string | null; image_url: string; thumb_url: string | null; location: string | null; views: number; clicks: number; rate: number; unique_viewers: number; unique_clickers: number }[];
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

  const t = totals || { total_views: 0, total_clicks: 0, logged_in_views: 0, anon_views: 0, logged_in_clicks: 0, anon_clicks: 0, unique_viewers: 0, unique_clickers: 0 };
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
    total: { views: totalViews, clicks: totalClicks, rate: totalViews > 0 ? Math.round((totalClicks / totalViews) * 100) : 0, loggedInViews: t.logged_in_views || 0, anonViews: t.anon_views || 0, loggedInClicks: t.logged_in_clicks || 0, anonClicks: t.anon_clicks || 0, uniqueViewers: t.unique_viewers || 0, uniqueClickers: t.unique_clickers || 0 },
    byPhoto: ((byPhoto || []) as any[])
      .map(p => ({ photo_id: p.photo_id, nickname: p.nickname, school: p.school, club: p.club || null, image_url: p.image_url, thumb_url: p.thumb_url || null, location: p.location || null, views: p.views || 0, clicks: p.clicks || 0, rate: p.views > 0 ? Math.round((p.clicks / p.views) * 100) : 0, unique_viewers: p.unique_viewers || 0, unique_clickers: p.unique_clickers || 0 }))
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
