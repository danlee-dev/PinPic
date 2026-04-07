"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { PhotoWithVotesRow, AdminUser, VotingPeriod, ResultAnnouncement } from "@/lib/types";
import {
  fetchPendingPhotos,
  fetchAllPhotosAdmin,
  approvePhoto,
  rejectPhoto,
  deletePhoto,
  fetchVotingPeriod,
  updateVotingPeriod,
  fetchResultAnnouncement,
  updateResultAnnouncement,
  fetchAdmins,
  addAdmin,
  removeAdmin,
  fetchEngagementStats,
  EngagementStats,
  fetchOriginalRanking,
  RealVoteRow,
} from "@/lib/admin";
import { getRevealPreview, setRevealPreview } from "@/lib/reveal-preview";
import { SchoolBadge } from "./school-badge";

type AdminTab = "pending" | "photos" | "clicks" | "original" | "settings";

function Pagination({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (p: number) => void }) {
  if (totalPages <= 1) return null;
  const current = page + 1; // 1-indexed for display
  const items: (number | "...")[] = [];
  const add = (v: number | "...") => { if (items[items.length - 1] !== v) items.push(v); };
  add(1);
  for (let i = current - 1; i <= current + 1; i++) {
    if (i > 1 && i < totalPages) {
      if (i > 2 && items[items.length - 1] !== i - 1 && items[items.length - 1] !== "...") add("...");
      add(i);
    }
  }
  if (current + 1 < totalPages - 1) add("...");
  if (totalPages > 1) add(totalPages);

  const btnBase = "min-w-7 h-7 px-2 rounded-lg text-xs font-medium cursor-pointer transition-colors flex items-center justify-center";
  return (
    <div className="flex items-center justify-center gap-1 mt-3 pt-3 border-t border-border/20">
      <button
        onClick={() => onChange(Math.max(0, page - 1))}
        disabled={page === 0}
        className={`${btnBase} text-muted hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed`}
        aria-label="이전 페이지"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
      </button>
      {items.map((it, idx) =>
        it === "..." ? (
          <span key={`e${idx}`} className="min-w-7 h-7 flex items-center justify-center text-xs text-muted">…</span>
        ) : (
          <button
            key={it}
            onClick={() => onChange(it - 1)}
            className={`${btnBase} ${current === it ? "bg-white/15 text-foreground" : "text-muted hover:text-foreground"}`}
          >
            {it}
          </button>
        )
      )}
      <button
        onClick={() => onChange(Math.min(totalPages - 1, page + 1))}
        disabled={page === totalPages - 1}
        className={`${btnBase} text-muted hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed`}
        aria-label="다음 페이지"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
      </button>
    </div>
  );
}

interface ConfirmAction {
  type: "reject" | "delete";
  photoId: string;
  photoName: string;
}

export function AdminPanel() {
  const [tab, setTab] = useState<AdminTab>("pending");
  const [pending, setPending] = useState<PhotoWithVotesRow[]>([]);
  const [allPhotos, setAllPhotos] = useState<PhotoWithVotesRow[]>([]);
  const [period, setPeriod] = useState<VotingPeriod | null>(null);
  const [announcement, setAnnouncement] = useState<ResultAnnouncement | null>(null);
  const [editRevealAt, setEditRevealAt] = useState("");
  const [previewMode, setPreviewModeState] = useState(false);
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [photoSearch, setPhotoSearch] = useState("");
  const [engagement, setEngagement] = useState<EngagementStats | null>(null);
  const [originalRanking, setOriginalRanking] = useState<RealVoteRow[]>([]);
  const [photoPage, setPhotoPage] = useState(0);
  const [userPage, setUserPage] = useState(0);
  const [photoSort, setPhotoSort] = useState<"views" | "rate">("views");
  const [userSort, setUserSort] = useState<"views" | "rate">("views");
  const [photoSortOpen, setPhotoSortOpen] = useState(false);
  const [userSortOpen, setUserSortOpen] = useState(false);
  const [engPhotoSearch, setEngPhotoSearch] = useState("");
  const [engUserSearch, setEngUserSearch] = useState("");
  const [photoModal, setPhotoModal] = useState<{ nickname: string; image_url: string; thumb_url: string | null; location: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [editStart, setEditStart] = useState("");
  const [editEnd, setEditEnd] = useState("");
  const [message, setMessage] = useState("");
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [p, all, vp, ann, adm, eng, orig] = await Promise.all([
      fetchPendingPhotos(),
      fetchAllPhotosAdmin(),
      fetchVotingPeriod(),
      fetchResultAnnouncement(),
      fetchAdmins(),
      fetchEngagementStats(),
      fetchOriginalRanking(),
    ]);
    setPending(p);
    setEngagement(eng);
    setAllPhotos(all);
    setPeriod(vp);
    setAnnouncement(ann);
    setAdmins(adm);
    setOriginalRanking(orig);
    if (vp) {
      setEditStart(toKSTInput(vp.start));
      setEditEnd(toKSTInput(vp.end));
    }
    if (ann) {
      setEditRevealAt(toKSTInput(ann.reveal_at));
    }
    setPreviewModeState(getRevealPreview());
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const showMessage = (msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(""), 2000);
  };

  const handleApprove = async (id: string) => {
    await approvePhoto(id);
    setPending((prev) => prev.filter((p) => p.id !== id));
    setAllPhotos((prev) => prev.map((p) => p.id === id ? { ...p, status: "approved" as const } : p));
    showMessage("승인 완료");
  };

  const handleReject = async (id: string) => {
    await rejectPhoto(id);
    setPending((prev) => prev.filter((p) => p.id !== id));
    setAllPhotos((prev) => prev.map((p) => p.id === id ? { ...p, status: "rejected" as const } : p));
    showMessage("거절 완료 (사진 관리에서 복원 가능)");
  };

  const handleDelete = async (id: string) => {
    await deletePhoto(id);
    setAllPhotos((prev) => prev.filter((p) => p.id !== id));
    setPending((prev) => prev.filter((p) => p.id !== id));
    showMessage("삭제 완료");
  };

  const executeConfirmAction = async () => {
    if (!confirmAction) return;
    if (confirmAction.type === "reject") {
      await handleReject(confirmAction.photoId);
    } else {
      await handleDelete(confirmAction.photoId);
    }
    setConfirmAction(null);
  };

  const handleSaveReveal = async () => {
    if (!editRevealAt) return;
    const reveal_at = new Date(editRevealAt + ":00+09:00").toISOString();
    const ok = await updateResultAnnouncement(reveal_at);
    if (ok) {
      setAnnouncement({ reveal_at });
      showMessage("결과 발표 시각 저장 완료");
    } else {
      showMessage("저장 실패");
    }
  };

  const handleTogglePreview = () => {
    const next = !previewMode;
    setPreviewModeState(next);
    setRevealPreview(next);
    showMessage(next ? "미리보기 ON (관리자 전용)" : "미리보기 OFF");
  };

  const handleSavePeriod = async () => {
    const start = new Date(editStart + ":00+09:00").toISOString();
    const end = new Date(editEnd + ":00+09:00").toISOString();
    const ok = await updateVotingPeriod(start, end);
    if (ok) {
      setPeriod({ start, end });
      showMessage("투표 기간 저장 완료");
    }
  };

  const handleAddAdmin = async () => {
    if (!newAdminEmail.trim()) return;
    const result = await addAdmin(newAdminEmail.trim());
    if (result.success) {
      setNewAdminEmail("");
      loadData();
      showMessage("관리자 추가 완료");
    } else {
      showMessage(result.error || "추가 실패");
    }
  };

  const handleRemoveAdmin = async (userId: string, email: string) => {
    if (!confirm(`${email}을(를) 관리자에서 제거하시겠습니까?`)) return;
    await removeAdmin(userId);
    setAdmins((prev) => prev.filter((a) => a.user_id !== userId));
    showMessage("관리자 제거 완료");
  };

  const filteredPhotos = useMemo(() => {
    if (!engagement) return [];
    let list = engagement.byPhoto;
    if (engPhotoSearch.trim()) {
      const q = engPhotoSearch.trim().toLowerCase();
      list = list.filter(p => p.nickname.toLowerCase().includes(q) || (p.club && p.club.toLowerCase().includes(q)));
    }
    return [...list].sort((a, b) => photoSort === "views" ? b.views - a.views : b.rate - a.rate);
  }, [engagement, engPhotoSearch, photoSort]);

  const filteredUsers = useMemo(() => {
    if (!engagement) return [];
    let list = engagement.byUser;
    if (engUserSearch.trim()) {
      const q = engUserSearch.trim().toLowerCase();
      list = list.filter(u => u.email.toLowerCase().includes(q));
    }
    return [...list].sort((a, b) => userSort === "views" ? b.views - a.views : b.rate - a.rate);
  }, [engagement, engUserSearch, userSort]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 pt-20 pb-28 text-center">
        <div className="w-6 h-6 mx-auto border-2 border-border border-t-foreground rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 pt-2 pb-28">
      {message && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-surface border border-border/50 text-sm px-4 py-2 rounded-xl shadow-lg animate-card-rise">
          {message}
        </div>
      )}

      {/* Confirm modal */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70" onClick={() => setConfirmAction(null)}>
          <div className="bg-card rounded-3xl p-6 max-w-sm w-full text-center border border-white/10 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-2">
              {confirmAction.type === "delete" ? "사진을 삭제하시겠습니까?" : "사진을 거절하시겠습니까?"}
            </h3>
            <p className="text-sm text-muted mb-1">{confirmAction.photoName}</p>
            <p className="text-xs text-muted mb-5">
              {confirmAction.type === "delete"
                ? "삭제하면 복원할 수 없습니다."
                : "거절된 사진은 사진 관리에서 다시 승인할 수 있습니다."}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmAction(null)}
                className="flex-1 py-2.5 bg-surface text-foreground text-sm font-semibold rounded-xl cursor-pointer border border-border/50 active:scale-[0.97] transition-all"
              >
                취소
              </button>
              <button
                onClick={executeConfirmAction}
                className={`flex-1 py-2.5 text-sm font-semibold rounded-xl cursor-pointer active:scale-[0.97] transition-all
                  ${confirmAction.type === "delete" ? "bg-red-500 text-white" : "bg-yellow-500 text-black"}`}
              >
                {confirmAction.type === "delete" ? "삭제" : "거절"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin sub-tabs */}
      <div className="flex gap-1 mb-4 bg-surface rounded-xl p-1 overflow-x-auto hide-scrollbar">
        {([
          ["pending", `대기 (${pending.length})`],
          ["photos", "사진"],
          ["clicks", "관심도"],
          ["original", "원본 순위"],
          ["settings", "설정"],
        ] as const).map(([value, label]) => (
          <button
            key={value}
            onClick={() => setTab(value)}
            className={`flex-1 py-2 text-xs font-medium rounded-lg transition-colors cursor-pointer
              ${tab === value ? "bg-white/10 text-foreground" : "text-muted hover:text-foreground"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "pending" && (
        <div className="space-y-3">
          {pending.length === 0 ? (
            <div className="text-center py-12 text-muted text-sm">대기 중인 사진이 없습니다</div>
          ) : (
            pending.map((photo) => (
              <PhotoAdminCard
                key={photo.id}
                photo={photo}
                onApprove={() => handleApprove(photo.id)}
                onReject={() => setConfirmAction({ type: "reject", photoId: photo.id, photoName: photo.nickname })}
                onDelete={() => setConfirmAction({ type: "delete", photoId: photo.id, photoName: photo.nickname })}
              />
            ))
          )}
        </div>
      )}

      {tab === "photos" && (
        <div className="space-y-3">
          <input
            type="text"
            value={photoSearch}
            onChange={(e) => setPhotoSearch(e.target.value)}
            placeholder="닉네임 또는 동아리로 검색"
            className="w-full bg-black/30 text-sm text-foreground px-3 py-2 rounded-lg border border-border/50 outline-none placeholder:text-muted/50"
          />
          {allPhotos
            .filter((p) => {
              if (!photoSearch.trim()) return true;
              const q = photoSearch.trim().toLowerCase();
              return p.nickname.toLowerCase().includes(q) || (p.club && p.club.toLowerCase().includes(q));
            })
            .map((photo) => (
            <PhotoAdminCard
              key={photo.id}
              photo={photo}
              onApprove={photo.status !== "approved" ? () => handleApprove(photo.id) : undefined}
              onReject={photo.status !== "rejected" ? () => setConfirmAction({ type: "reject", photoId: photo.id, photoName: photo.nickname }) : undefined}
              onDelete={() => setConfirmAction({ type: "delete", photoId: photo.id, photoName: photo.nickname })}
            />
          ))}
        </div>
      )}

      {/* Photo modal */}
      {photoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 animate-modal-overlay-in" onClick={() => setPhotoModal(null)}>
          <div className="relative max-w-md w-full animate-modal-in" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setPhotoModal(null)}
              className="absolute top-3 right-3 z-10 w-8 h-8 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-black/70 cursor-pointer"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
            </button>
            <img
              src={photoModal.thumb_url || photoModal.image_url}
              alt={photoModal.nickname}
              className="w-full rounded-2xl object-contain max-h-[70vh]"
            />
            <p className="text-center text-sm font-semibold mt-3">{photoModal.nickname}</p>
            {photoModal.location && (
              <p className="text-center text-xs text-muted mt-1">{photoModal.location}</p>
            )}
          </div>
        </div>
      )}

      {tab === "clicks" && engagement && (
        <div className="space-y-4">
          {/* 스프레드시트 링크 */}
          <a
            href="https://docs.google.com/spreadsheets/d/1qGGTXxQ_X-4HkrYpUhNWo0W2cEZc549d7EdSXSUw7pg/edit"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 py-2.5 bg-surface rounded-xl border border-border/30 text-sm font-medium text-foreground hover:bg-white/5 transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="3" width="18" height="18" rx="2" fill="#34A853" />
              <path d="M7 7h10v2H7V7zm0 4h10v2H7v-2zm0 4h7v2H7v-2z" fill="white" />
            </svg>
            Google Sheets에서 상세 데이터 보기
          </a>

          {/* 전체 통계 */}
          <div className="bg-surface rounded-2xl p-4 border border-border/30">
            <h4 className="text-xs font-semibold text-muted mb-3">전체 통계</h4>
            <div className="grid grid-cols-3 gap-3 text-center mb-3">
              <div>
                <p className="text-2xl font-black">{engagement.total.views}</p>
                <p className="text-[10px] text-muted">사진 조회</p>
              </div>
              <div>
                <p className="text-2xl font-black">{engagement.total.clicks}</p>
                <p className="text-[10px] text-muted">스팟 클릭</p>
              </div>
              <div>
                <p className="text-2xl font-black">{engagement.total.rate}%</p>
                <p className="text-[10px] text-muted">전환율</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 pt-3 border-t border-border/20 mb-3">
              <div className="text-center">
                <p className="text-sm font-bold">{engagement.total.uniqueViewers}명</p>
                <p className="text-[10px] text-muted leading-tight">사진 열람</p>
              </div>
              <div className="text-center">
                <p className="text-sm font-bold">{engagement.total.uniqueClickers}명</p>
                <p className="text-[10px] text-muted leading-tight">스팟 클릭</p>
              </div>
              <div className="text-center">
                <p className="text-sm font-bold">{Math.max(0, engagement.total.uniqueViewers - engagement.total.uniqueClickers)}명</p>
                <p className="text-[10px] text-muted leading-tight">스팟 미클릭</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-3 border-t border-border/20">
              <div className="text-center">
                <p className="text-sm font-bold">{engagement.total.loggedInViews} / {engagement.total.loggedInClicks}</p>
                <p className="text-[10px] text-muted">로그인 (조회/클릭)</p>
              </div>
              <div className="text-center">
                <p className="text-sm font-bold">{engagement.total.anonViews} / {engagement.total.anonClicks}</p>
                <p className="text-[10px] text-muted">비로그인 (조회/클릭)</p>
              </div>
            </div>
          </div>

          {/* 사진별 */}
          <div className="bg-surface rounded-2xl p-4 border border-border/30">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-semibold text-muted">사진별 ({filteredPhotos.length}개)</h4>
              <div className="relative">
                <button
                  onClick={() => setPhotoSortOpen(!photoSortOpen)}
                  className="flex items-center gap-1.5 text-xs text-muted font-medium px-3 h-7 rounded-lg cursor-pointer hover:text-foreground transition-colors"
                  style={{ background: "linear-gradient(180deg, #2a2a2a 0%, #1e1e1e 100%)", border: "1px solid rgba(255,255,255,0.12)", boxShadow: "0 1px 3px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.04)" }}
                >
                  {photoSort === "views" ? "조회순" : "전환율순"}
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
                </button>
                {photoSortOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setPhotoSortOpen(false)} />
                    <div className="absolute right-0 top-8 z-50 rounded-xl py-1 min-w-[100px] animate-card-rise"
                      style={{ background: "linear-gradient(180deg, #2a2a2a 0%, #1e1e1e 100%)", border: "1px solid rgba(255,255,255,0.12)", boxShadow: "0 8px 30px rgba(0,0,0,0.5), 0 2px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.08)" }}
                    >
                      {([["views", "조회순"], ["rate", "전환율순"]] as const).map(([value, label]) => (
                        <button key={value} onClick={() => { setPhotoSort(value); setPhotoSortOpen(false); setPhotoPage(0); }}
                          className={`w-full text-left px-3 py-2 text-xs transition-colors cursor-pointer ${photoSort === value ? "text-foreground font-semibold" : "text-muted hover:text-foreground hover:bg-white/5"}`}
                        >{label}</button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
            <input
              type="text"
              value={engPhotoSearch}
              onChange={(e) => { setEngPhotoSearch(e.target.value); setPhotoPage(0); }}
              placeholder="닉네임 또는 동아리로 검색"
              className="w-full bg-black/30 text-xs text-foreground px-3 py-1.5 rounded-lg border border-border/50 outline-none placeholder:text-muted/50 mb-3"
            />
            <div className="space-y-2">
              {filteredPhotos.length === 0 ? (
                <p className="text-xs text-muted text-center py-4">아직 기록이 없습니다</p>
              ) : filteredPhotos.slice(photoPage * 10, photoPage * 10 + 10).map((p) => (
                <div key={p.photo_id} className="flex items-center gap-2 py-1.5 cursor-pointer hover:bg-white/5 rounded-lg px-1 -mx-1 transition-colors" onClick={() => setPhotoModal({ nickname: p.nickname, image_url: p.image_url, thumb_url: p.thumb_url, location: p.location })}>
                  <SchoolBadge school={p.school as "yonsei" | "korea"} />
                  <span className="text-xs font-semibold flex-1 truncate">{p.nickname}</span>
                  <span className="text-[10px] text-muted">{p.unique_viewers}명/{p.unique_clickers}명</span>
                  <span className="text-xs text-muted">{p.views}뷰</span>
                  <span className="text-xs text-muted">{p.clicks}클릭</span>
                  <span className="text-xs font-bold w-10 text-right">{p.rate}%</span>
                </div>
              ))}
            </div>
            <Pagination page={photoPage} totalPages={Math.ceil(filteredPhotos.length / 10)} onChange={setPhotoPage} />
          </div>

          {/* 사용자별 */}
          <div className="bg-surface rounded-2xl p-4 border border-border/30">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-semibold text-muted">사용자별 ({filteredUsers.length}명)</h4>
              <div className="relative">
                <button
                  onClick={() => setUserSortOpen(!userSortOpen)}
                  className="flex items-center gap-1.5 text-xs text-muted font-medium px-3 h-7 rounded-lg cursor-pointer hover:text-foreground transition-colors"
                  style={{ background: "linear-gradient(180deg, #2a2a2a 0%, #1e1e1e 100%)", border: "1px solid rgba(255,255,255,0.12)", boxShadow: "0 1px 3px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.04)" }}
                >
                  {userSort === "views" ? "조회순" : "전환율순"}
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
                </button>
                {userSortOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setUserSortOpen(false)} />
                    <div className="absolute right-0 top-8 z-50 rounded-xl py-1 min-w-[100px] animate-card-rise"
                      style={{ background: "linear-gradient(180deg, #2a2a2a 0%, #1e1e1e 100%)", border: "1px solid rgba(255,255,255,0.12)", boxShadow: "0 8px 30px rgba(0,0,0,0.5), 0 2px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.08)" }}
                    >
                      {([["views", "조회순"], ["rate", "전환율순"]] as const).map(([value, label]) => (
                        <button key={value} onClick={() => { setUserSort(value); setUserSortOpen(false); setUserPage(0); }}
                          className={`w-full text-left px-3 py-2 text-xs transition-colors cursor-pointer ${userSort === value ? "text-foreground font-semibold" : "text-muted hover:text-foreground hover:bg-white/5"}`}
                        >{label}</button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
            <input
              type="text"
              value={engUserSearch}
              onChange={(e) => { setEngUserSearch(e.target.value); setUserPage(0); }}
              placeholder="이메일로 검색"
              className="w-full bg-black/30 text-xs text-foreground px-3 py-1.5 rounded-lg border border-border/50 outline-none placeholder:text-muted/50 mb-3"
            />
            <div className="space-y-2">
              {filteredUsers.length === 0 ? (
                <p className="text-xs text-muted text-center py-4">아직 기록이 없습니다</p>
              ) : filteredUsers.slice(userPage * 10, userPage * 10 + 10).map((u) => (
                <div key={u.user_id} className="flex items-center gap-2 py-1.5">
                  <span className="text-xs flex-1 truncate">{u.email}</span>
                  <span className="text-xs text-muted">{u.views}뷰</span>
                  <span className="text-xs text-muted">{u.clicks}클릭</span>
                  <span className="text-xs font-bold w-10 text-right">{u.rate}%</span>
                </div>
              ))}
            </div>
            <Pagination page={userPage} totalPages={Math.ceil(filteredUsers.length / 10)} onChange={setUserPage} />
          </div>
        </div>
      )}

      {tab === "original" && (
        <div className="space-y-4">
          <div className="bg-surface rounded-2xl p-4 border border-border/30">
            <h4 className="text-xs font-semibold text-muted mb-2">원본 인기 순위</h4>
            <p className="text-[10px] text-muted/70 mb-3 leading-relaxed">
              실제 votes 테이블 기준 (조작 오프셋 미반영). 일반 사용자에게 보이는 화면은 조작 반영된 수치이고, 이 값은 조작 후에도 그대로 유지됩니다.
            </p>
            <div className="space-y-2">
              {originalRanking.length === 0 ? (
                <p className="text-xs text-muted text-center py-4">데이터가 없습니다</p>
              ) : (
                originalRanking.map((p, i) => {
                  const displayed = p.votes + (p.vote_offset || 0);
                  const hasOffset = (p.vote_offset || 0) !== 0;
                  return (
                    <div key={p.id} className="flex items-center gap-2 py-1.5 px-1">
                      <span className="text-[11px] font-bold text-muted w-6 text-right">{i + 1}</span>
                      <span className={`text-[10px] font-semibold w-10 ${p.school === "yonsei" ? "text-yonsei" : "text-korea"}`}>
                        {p.school === "yonsei" ? "연세대" : "고려대"}
                      </span>
                      <span className="text-xs flex-1 truncate">{p.nickname}</span>
                      <div className="text-right">
                        <p className="text-xs font-bold">{p.votes}<span className="text-[9px] text-muted ml-0.5">표</span></p>
                        {hasOffset && (
                          <p className="text-[9px] text-yellow-400/80 leading-none mt-0.5">
                            +{p.vote_offset} → {displayed}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="bg-surface rounded-2xl p-4 border border-border/30">
            <h4 className="text-xs font-semibold text-muted mb-2">학교 합계 (원본)</h4>
            <div className="grid grid-cols-2 gap-3 text-center">
              <div>
                <p className="text-[10px] text-muted">연세대</p>
                <p className="text-2xl font-black text-yonsei">
                  {originalRanking.filter(p => p.school === "yonsei").reduce((s, p) => s + p.votes, 0)}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-muted">고려대</p>
                <p className="text-2xl font-black text-korea">
                  {originalRanking.filter(p => p.school === "korea").reduce((s, p) => s + p.votes, 0)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === "settings" && (
        <div className="space-y-6">
          {/* Voting period */}
          <div className="bg-surface rounded-2xl p-4 border border-border/30 overflow-hidden">
            <h3 className="text-sm font-semibold mb-3">투표 기간 (KST)</h3>
            <div className="space-y-2">
              <div className="overflow-hidden">
                <label className="text-xs text-muted block mb-1">시작</label>
                <input
                  type="datetime-local"
                  value={editStart}
                  onChange={(e) => setEditStart(e.target.value)}
                  className="w-full bg-black/30 text-sm text-foreground px-3 py-2 rounded-lg border border-border/50 outline-none"
                  style={{ colorScheme: "dark", maxWidth: "100%", boxSizing: "border-box", WebkitAppearance: "none" }}
                />
              </div>
              <div className="overflow-hidden">
                <label className="text-xs text-muted block mb-1">종료</label>
                <input
                  type="datetime-local"
                  value={editEnd}
                  onChange={(e) => setEditEnd(e.target.value)}
                  className="w-full bg-black/30 text-sm text-foreground px-3 py-2 rounded-lg border border-border/50 outline-none"
                  style={{ colorScheme: "dark", maxWidth: "100%", boxSizing: "border-box", WebkitAppearance: "none" }}
                />
              </div>
              <button
                onClick={handleSavePeriod}
                className="w-full py-2 bg-white text-black text-sm font-semibold rounded-lg cursor-pointer hover:bg-white/90 active:scale-[0.98] transition-all"
              >
                저장
              </button>
            </div>
          </div>

          {/* Result announcement */}
          <div className="bg-surface rounded-2xl p-4 border border-border/30 overflow-hidden">
            <h3 className="text-sm font-semibold mb-1">결과 발표 (KST)</h3>
            <p className="text-[11px] text-muted mb-3">발표 시각이 지나면 모든 사용자에게 인기 순위와 상위 5개의 촬영 정보가 공개됩니다.</p>
            <div className="space-y-2">
              <div className="overflow-hidden">
                <label className="text-xs text-muted block mb-1">발표 시각</label>
                <input
                  type="datetime-local"
                  value={editRevealAt}
                  onChange={(e) => setEditRevealAt(e.target.value)}
                  className="w-full bg-black/30 text-sm text-foreground px-3 py-2 rounded-lg border border-border/50 outline-none"
                  style={{ colorScheme: "dark", maxWidth: "100%", boxSizing: "border-box", WebkitAppearance: "none" }}
                />
              </div>
              <button
                onClick={handleSaveReveal}
                className="w-full py-2 bg-white text-black text-sm font-semibold rounded-lg cursor-pointer hover:bg-white/90 active:scale-[0.98] transition-all"
              >
                저장
              </button>
              {announcement && (
                <p className="text-[11px] text-muted text-center">
                  현재 발표 시각: {formatKSTDisplay(announcement.reveal_at)}
                </p>
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-border/30">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold">결과 화면 미리보기</p>
                  <p className="text-[10px] text-muted mt-0.5">관리자 본인에게만 발표 화면이 보입니다</p>
                </div>
                <button
                  onClick={handleTogglePreview}
                  className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer ${previewMode ? "bg-green-500" : "bg-white/15"}`}
                >
                  <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform ${previewMode ? "translate-x-5" : "translate-x-0.5"}`} />
                </button>
              </div>
            </div>
          </div>

          {/* Admin management */}
          <div className="bg-surface rounded-2xl p-4 border border-border/30 overflow-hidden">
            <h3 className="text-sm font-semibold mb-3">관리자 계정</h3>
            <div className="space-y-2 mb-3">
              {admins.map((admin) => (
                <div key={admin.id} className="flex items-center justify-between py-2 px-3 bg-black/20 rounded-lg">
                  <span className="text-sm truncate">{admin.email}</span>
                  {admins.length > 1 && (
                    <button
                      onClick={() => handleRemoveAdmin(admin.user_id, admin.email)}
                      className="text-xs text-muted hover:text-korea cursor-pointer flex-shrink-0 ml-2"
                    >
                      제거
                    </button>
                  )}
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="email"
                value={newAdminEmail}
                onChange={(e) => setNewAdminEmail(e.target.value)}
                placeholder="관리자 이메일"
                className="flex-1 min-w-0 bg-black/30 text-sm text-foreground px-3 py-2 rounded-lg border border-border/50 outline-none placeholder:text-muted/50"
              />
              <button
                onClick={handleAddAdmin}
                className="px-4 py-2 bg-white text-black text-sm font-semibold rounded-lg cursor-pointer hover:bg-white/90 active:scale-[0.98] transition-all flex-shrink-0"
              >
                추가
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PhotoAdminCard({
  photo,
  onApprove,
  onReject,
  onDelete,
}: {
  photo: PhotoWithVotesRow;
  onApprove?: () => void;
  onReject?: () => void;
  onDelete: () => void;
}) {
  const statusLabel = {
    pending: "대기",
    approved: "승인",
    rejected: "거절",
  }[photo.status];
  const statusColor = {
    pending: "bg-yellow-500/20 text-yellow-400",
    approved: "bg-green-500/20 text-green-400",
    rejected: "bg-red-500/20 text-red-400",
  }[photo.status];

  return (
    <div className="flex gap-3 p-3 bg-surface rounded-2xl border border-border/30">
      <img
        src={photo.thumb_url || photo.image_url}
        alt={photo.nickname}
        className="w-16 h-16 rounded-xl object-cover flex-shrink-0"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <SchoolBadge school={photo.school} />
          <span className="text-sm font-semibold truncate">{photo.nickname}</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 ${statusColor}`}>
            {statusLabel}
          </span>
        </div>
        {photo.club && <p className="text-xs text-muted">{photo.club}</p>}
        <div className="flex gap-2 mt-2">
          {onApprove && (
            <button onClick={onApprove} className="text-xs px-3 py-1 bg-green-500/20 text-green-400 rounded-lg cursor-pointer hover:bg-green-500/30 transition-colors">
              승인
            </button>
          )}
          {onReject && (
            <button onClick={onReject} className="text-xs px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded-lg cursor-pointer hover:bg-yellow-500/30 transition-colors">
              거절
            </button>
          )}
          <button onClick={onDelete} className="text-xs px-3 py-1 bg-red-500/20 text-red-400 rounded-lg cursor-pointer hover:bg-red-500/30 transition-colors">
            삭제
          </button>
        </div>
      </div>
    </div>
  );
}

function toKSTInput(utcStr: string): string {
  const d = new Date(utcStr);
  const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 16);
}

function formatKSTDisplay(utcStr: string): string {
  const d = new Date(utcStr);
  return d.toLocaleString("ko-KR", { timeZone: "Asia/Seoul", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });
}
