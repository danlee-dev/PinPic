"use client";

import { useState, useEffect, useCallback } from "react";
import { PhotoWithVotesRow, AdminUser, VotingPeriod } from "@/lib/types";
import {
  fetchPendingPhotos,
  fetchAllPhotosAdmin,
  approvePhoto,
  rejectPhoto,
  deletePhoto,
  fetchVotingPeriod,
  updateVotingPeriod,
  fetchAdmins,
  addAdmin,
  removeAdmin,
} from "@/lib/admin";
import { SchoolBadge } from "./school-badge";

type AdminTab = "pending" | "photos" | "settings";

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
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [photoSearch, setPhotoSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [editStart, setEditStart] = useState("");
  const [editEnd, setEditEnd] = useState("");
  const [message, setMessage] = useState("");
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [p, all, vp, adm] = await Promise.all([
      fetchPendingPhotos(),
      fetchAllPhotosAdmin(),
      fetchVotingPeriod(),
      fetchAdmins(),
    ]);
    setPending(p);
    setAllPhotos(all);
    setPeriod(vp);
    setAdmins(adm);
    if (vp) {
      setEditStart(toKSTInput(vp.start));
      setEditEnd(toKSTInput(vp.end));
    }
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
      <div className="flex gap-1 mb-4 bg-surface rounded-xl p-1">
        {([
          ["pending", `승인 대기 (${pending.length})`],
          ["photos", "사진 관리"],
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
