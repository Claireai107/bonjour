"use client";

// 공용 다이얼로그 — 완료 알림(확인만) / 삭제 확인(취소+확인).
// 딤 탭으로는 닫히지 않음(시니어 오조작 방지) — 버튼으로만 닫는다.
export default function Dialog({
  open,
  message,
  confirmLabel = "확인",
  cancelLabel,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string; // 있으면 2버튼(취소/확인)
  onConfirm: () => void;
  onCancel?: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-gutter">
      <div className="absolute inset-0 bg-[rgba(43,43,43,.45)]" aria-hidden />
      <div className="relative w-full max-w-[340px] bg-white rounded-card px-6 pt-7 pb-5 shadow-[0_8px_30px_rgba(0,0,0,.2)]">
        <p className="text-[18px] font-bold text-charcoal text-center leading-[1.5] break-keep whitespace-pre-line">
          {message}
        </p>
        <div className="mt-6 flex gap-2.5">
          {cancelLabel && (
            <button
              onClick={onCancel}
              className="flex-1 h-touch rounded-btn bg-lightgreen text-forest text-[18px] font-bold active:brightness-95"
            >
              {cancelLabel}
            </button>
          )}
          <button
            onClick={onConfirm}
            className="flex-1 h-touch rounded-btn bg-forest text-white text-[18px] font-bold active:brightness-95"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
