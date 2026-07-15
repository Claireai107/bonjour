"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Avatar from "@/components/Avatar";
import { avatarPose } from "@/components/Boni";
import Dialog from "@/components/Dialog";
import { useBonJour } from "@/lib/store";
import type { ProfileData } from "@/lib/types";

// 화면 4a · 사용자 전환 바텀시트 — 마이페이지 상단 사용자에서 올라옴
export default function ProfileSwitcher({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const profiles = useBonJour((s) => s.profiles);
  const activeId = useBonJour((s) => s.activeId);
  const switchProfile = useBonJour((s) => s.switchProfile);
  const removeProfile = useBonJour((s) => s.removeProfile);
  const [editing, setEditing] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ProfileData | null>(null);

  // 시트를 닫으면 편집 모드/삭제 대기 초기화 — 재오픈은 항상 일반 모드
  useEffect(() => {
    if (!open) {
      setEditing(false);
      setDeleteTarget(null);
    }
  }, [open]);

  if (!open) return null;

  const pick = (id: string) => {
    switchProfile(id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* 딤 배경 */}
      <button
        aria-label="닫기"
        onClick={onClose}
        className="absolute inset-0 bg-[rgba(43,43,43,.45)]"
      />
      {/* 시트 */}
      <div className="relative w-full max-w-frame bg-white rounded-t-[24px] px-6 pt-3 pb-8 shadow-[0_-4px_20px_rgba(0,0,0,.15)] animate-[slideup_.25s_ease]">
        <div className="w-11 h-[5px] rounded-chip bg-borderline mx-auto" />

        {/* 헤더: 가운데 타이틀 + 편집 버튼 */}
        <div className="mt-3.5 flex items-center">
          <div className="w-8" />
          <h2 className="flex-1 text-center text-[20px] font-bold text-charcoal">
            사용자 전환
          </h2>
          <button
            aria-label={editing ? "편집 완료" : "사용자 편집"}
            onClick={() => setEditing((v) => !v)}
            className="min-w-8 h-8 px-1.5 rounded-[10px] bg-lightgreen flex items-center justify-center"
          >
            {editing ? (
              <span className="text-[15px] font-bold text-forest">완료</span>
            ) : (
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#3E7A4E"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z" />
              </svg>
            )}
          </button>
        </div>

        <div className="mt-3.5 h-px bg-[#F0EEE6]" />

        {/* 프로필 목록 */}
        <div className="mt-1.5 flex flex-col">
          {profiles.map((p, i) => {
            const active = p.id === activeId;
            const label = p.name?.trim() || p.relation || "사용자";
            return (
              <div
                key={p.id}
                className={`flex items-center gap-3.5 py-3.5 px-1 ${
                  i > 0 ? "border-t border-[#F7F5EF]" : ""
                }`}
              >
                {editing ? (
                  <>
                    <Avatar pose={avatarPose(p.avatar)} size={56} />
                    <span className="text-[20px] font-medium text-charcoal">
                      {label}
                    </span>
                    {p.relation === "본인" && (
                      <span className="text-[13px] font-bold text-graytext bg-[#F0EEE6] rounded-chip px-2.5 py-[3px]">
                        관리인
                      </span>
                    )}
                    <span className="flex-1" />
                    <button
                      aria-label={`${label} 수정`}
                      onClick={() => {
                        onClose();
                        router.push(`/profile-add?edit=${p.id}`);
                      }}
                      className="w-10 h-10 rounded-[10px] bg-lightgreen flex items-center justify-center"
                    >
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#3E7A4E"
                        strokeWidth="2.4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M12 20h9" />
                        <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z" />
                      </svg>
                    </button>
                    {p.relation !== "본인" && (
                      <button
                        aria-label={`${label} 삭제`}
                        onClick={() => setDeleteTarget(p)}
                        className="w-10 h-10 rounded-[10px] bg-[#F7ECEA] flex items-center justify-center"
                      >
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="#C7503A"
                          strokeWidth="2.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M3 6h18" />
                          <path d="M8 6V4h8v2" />
                          <path d="M19 6l-1 14H6L5 6" />
                          <path d="M10 11v6" />
                          <path d="M14 11v6" />
                        </svg>
                      </button>
                    )}
                  </>
                ) : (
                  <button
                    onClick={() => pick(p.id)}
                    className="flex-1 flex items-center gap-3.5 text-left"
                  >
                    <Avatar pose={avatarPose(p.avatar)} size={56} ring={active} />
                    <span
                      className={`text-[20px] text-charcoal ${
                        active ? "font-bold" : "font-medium"
                      }`}
                    >
                      {label}
                    </span>
                    {p.relation === "본인" && (
                      <span className="text-[13px] font-bold text-graytext bg-[#F0EEE6] rounded-chip px-2.5 py-[3px]">
                        관리인
                      </span>
                    )}
                    <span className="flex-1" />
                    {active && (
                      <svg
                        width="26"
                        height="26"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#3E7A4E"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                    )}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-1.5 h-px bg-[#F0EEE6]" />

        {/* 새 사용자 추가 */}
        <button
          onClick={() => {
            onClose();
            router.push("/profile-add");
          }}
          className="flex items-center gap-3.5 pt-4 px-1 w-full text-left"
        >
          <span className="w-14 h-14 rounded-full bg-lightgreen flex items-center justify-center flex-none">
            <svg
              width="26"
              height="26"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#3E7A4E"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 5v14" />
              <path d="M5 12h14" />
            </svg>
          </span>
          <span className="text-[20px] font-bold text-forest">
            새 사용자 추가
          </span>
        </button>
      </div>

      <Dialog
        open={deleteTarget != null}
        message={`'${
          deleteTarget?.name?.trim() || deleteTarget?.relation || "사용자"
        }'님을 삭제할까요?\n기록도 함께 삭제돼요`}
        confirmLabel="삭제"
        cancelLabel="취소"
        onConfirm={() => {
          if (deleteTarget) removeProfile(deleteTarget.id);
          setDeleteTarget(null);
        }}
        onCancel={() => setDeleteTarget(null)}
      />

      <style>{`
        @keyframes slideup { from { transform: translateY(100%); } to { transform: translateY(0); } }
      `}</style>
    </div>
  );
}
