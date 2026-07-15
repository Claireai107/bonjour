// 진행바 — 디자인: "1 / 9 단계"(16px Bold 포레스트) + 10px 트랙(#E8F0E3) 위 포레스트 채움
export default function ProgressBar({
  current,
  total,
}: {
  current: number;
  total: number;
}) {
  const pct = Math.round((current / total) * 100);
  return (
    <div className="w-full">
      <div className="text-[16px] font-bold text-forest mb-1.5">
        {current} / {total} 단계
      </div>
      <div className="w-full h-2.5 rounded-chip bg-lightgreen overflow-hidden">
        <div
          className="h-full rounded-chip bg-forest transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
