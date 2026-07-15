"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useBonJour } from "@/lib/store";
import { useHydrated } from "@/lib/useHydrated";
import ageLib from "@/lib/age";
import PageHeader from "@/components/PageHeader";
import PostcodeSearch from "@/components/PostcodeSearch";
import ScrollWheelColumn from "@/components/ScrollWheelColumn";
import TabBar from "@/components/TabBar";
import Avatar from "@/components/Avatar";
import Dialog from "@/components/Dialog";
import { AVATARS, avatarPose, type BoniPose } from "@/components/Boni";

const YEAR_MIN = 1930;
const YEAR_MAX = 2012;

function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

// 화면 4b · 새 사용자 추가 — 이름·연락처·성별·생년월일·주소 입력 후 설문 시작
export default function ProfileAddScreen() {
  return (
    <Suspense fallback={null}>
      <ProfileAddGate />
    </Suspense>
  );
}

// 편집 모드는 persist 복원 후에 프리필해야 하므로 hydration 게이트
function ProfileAddGate() {
  const params = useSearchParams();
  const rawEdit = params.get("edit");
  const hydrated = useHydrated();
  const profiles = useBonJour((s) => s.profiles);
  if (rawEdit && !hydrated) return null;
  // 존재하지 않는 프로필 id면 신규 모드로 (스테일 URL 방어)
  const editId = rawEdit && profiles.some((p) => p.id === rawEdit) ? rawEdit : null;
  return <ProfileAddForm editId={editId} />;
}

function ProfileAddForm({ editId }: { editId: string | null }) {
  const router = useRouter();
  const addProfile = useBonJour((s) => s.addProfile);
  const setProfileInfo = useBonJour((s) => s.setProfileInfo);
  const profiles = useBonJour((s) => s.profiles);
  const updateProfile = useBonJour((s) => s.updateProfile);

  const editing = profiles.find((p) => p.id === editId) ?? null;
  const [by, bm, bd] = editing?.birth?.split("-").map(Number) ?? [];

  const [avatar, setAvatar] = useState<BoniPose>(avatarPose(editing?.avatar));
  const [name, setName] = useState(editing?.name ?? "");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState<"F" | "M">(editing?.gender ?? "F");
  const [year, setYear] = useState(by || 1962);
  const [month, setMonth] = useState(bm || 7);
  const [day, setDay] = useState(bd || 2);
  const [addr, setAddr] = useState(editing?.region ?? "");
  const [addrDetail, setAddrDetail] = useState("");
  const [postcodeOpen, setPostcodeOpen] = useState(false);
  const [doneOpen, setDoneOpen] = useState(false);

  const age = ageLib.ageFromParts(year, month, day);
  const canSubmit = name.trim().length > 0;

  const setYearSafe = (y: number) => {
    const ny = Math.min(YEAR_MAX, Math.max(YEAR_MIN, y));
    setYear(ny);
    setDay((d) => Math.min(d, daysInMonth(ny, month)));
  };
  const setMonthSafe = (m: number) => {
    const nm = Math.min(12, Math.max(1, m));
    setMonth(nm);
    setDay((d) => Math.min(d, daysInMonth(year, nm)));
  };
  const setDaySafe = (d: number) =>
    setDay(Math.min(daysInMonth(year, month), Math.max(1, d)));

  const submit = () => {
    if (!canSubmit) return;
    const birth = `${year}-${String(month).padStart(2, "0")}-${String(
      day
    ).padStart(2, "0")}`;
    const region = addr.trim() || "순천시";
    if (editId) {
      updateProfile(editId, { name: name.trim(), avatar, gender, birth, region });
    } else {
      addProfile(name.trim(), "가족"); // 새 프로필 생성 + 활성화
      setProfileInfo({ avatar, gender, birth, region });
    }
    setDoneOpen(true); // 확인 시 마이페이지로 (설문 강제 진입 제거)
  };

  // 데모용: 확인하기 좋은 연령대(60대 여성 가족)로 폼만 채운다 — 이동은 추가하기로
  const quickFillDemo = () => {
    setName("이영희");
    setPhone("010-9876-5432");
    setGender("F");
    setYear(1962);
    setMonth(7);
    setDay(2);
    setAddr("전남 순천시 백강로 38"); // 실제 도로명 주소(순천 조례동)
    setAddrDetail("본주르아파트 101동 202호");
  };

  return (
    <div className="h-dvh bg-ivory flex flex-col">
      <PageHeader title={editId ? "사용자 정보 수정" : "새 사용자 추가"} back />
      {/* 입력 영역(스크롤) — 자식이 눌려 찌그러지지 않게 shrink-0 강제.
          가로 스크롤은 아바타 선택 줄에서만 — 페이지는 overflow-x-hidden으로 고정 */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-gutter pb-4 flex flex-col [&>*]:shrink-0">
      <p className="mt-1 text-[18px] text-graytext">
        이 분의 뼈 건강을 관리할게요
      </p>

      {/* 프로필 이미지 선택 */}
      <label className="mt-5 text-sub font-bold text-charcoal">
        프로필 이미지
      </label>
      {/* overscroll-x-contain: 줄 끝에서 스와이프가 페이지로 번지는 것(iOS 체이닝) 차단 */}
      <div className="mt-2 -mx-gutter px-gutter flex gap-3 overflow-x-auto overscroll-x-contain pb-1">
        {AVATARS.map((a) => (
          <button
            key={a}
            type="button"
            onClick={() => setAvatar(a)}
            className="shrink-0"
          >
            <Avatar
              pose={a}
              size={64}
              ring={avatar === a}
              className={avatar === a ? "" : "border border-borderline"}
            />
          </button>
        ))}
      </div>

      {/* 이름 */}
      <label className="mt-5 text-[16px] font-bold text-charcoal">이름</label>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="이름을 입력해 주세요"
        className="mt-2 h-[60px] bg-white border-2 border-borderline rounded-field px-5 text-[19px] text-charcoal placeholder:text-graytext focus:border-forest"
      />

      {/* 휴대폰 번호 */}
      <label className="mt-4 text-[16px] font-bold text-charcoal">
        휴대폰 번호
      </label>
      <input
        type="tel"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder="010-1234-5678"
        className="mt-2 h-[60px] bg-white border-2 border-borderline rounded-field px-5 text-[18px] text-charcoal placeholder:text-graytext focus:border-forest"
      />
      <p className="mt-1.5 text-[14px] text-graytext">
        건강 알림을 보내드릴 때 사용해요
      </p>

      {/* 성별 */}
      <label className="mt-4 text-[16px] font-bold text-charcoal">성별</label>
      <div className="mt-2 flex gap-3">
        {(
          [
            { key: "F", label: "여성" },
            { key: "M", label: "남성" },
          ] as const
        ).map((g) => {
          const selected = gender === g.key;
          return (
            <button
              key={g.key}
              onClick={() => setGender(g.key)}
              disabled={g.key === "M"}
              className={`flex-1 h-[60px] rounded-field flex items-center justify-center gap-2 box-border ${
                selected
                  ? "bg-lightgreen border-[2.5px] border-forest text-[19px] font-bold text-forest"
                  : g.key === "M"
                  ? "bg-white border-2 border-borderline text-[19px] font-medium text-borderline opacity-50 cursor-not-allowed"
                  : "bg-white border-2 border-borderline text-[19px] font-medium text-charcoal"
              }`}
            >
              {g.label}
              {selected && (
                <svg
                  width="20"
                  height="20"
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
          );
        })}
      </div>
      <p className="mt-1.5 text-[13px] text-graytext break-keep">
        남성용 예측 AI는 열심히 개발 중이에요 · 준비되는 대로 열어드릴게요
      </p>

      {/* 생년월일 휠 */}
      <label className="mt-4 text-[16px] font-bold text-charcoal">
        생년월일
      </label>
      <div className="mt-2 bg-white border-2 border-borderline rounded-field p-2.5 relative">
        <div className="absolute left-2.5 right-2.5 top-1/2 -translate-y-1/2 h-[42px] bg-lightgreen rounded-chip" />
        <div className="relative grid grid-cols-[1.3fr_1fr_1fr]">
          <ScrollWheelColumn
            value={year}
            format={(v) => `${v}년`}
            min={YEAR_MIN}
            max={YEAR_MAX}
            onChange={setYearSafe}
          />
          <ScrollWheelColumn
            value={month}
            format={(v) => `${v}월`}
            min={1}
            max={12}
            onChange={setMonthSafe}
          />
          <ScrollWheelColumn
            value={day}
            format={(v) => `${v}일`}
            min={1}
            max={daysInMonth(year, month)}
            onChange={setDaySafe}
          />
        </div>
      </div>
      <div className="mt-2 flex items-center gap-2.5">
        <span className="text-[15px] font-bold text-forest bg-lightgreen rounded-chip px-3 py-1">
          만 {age}세
        </span>
        <span className="text-[14px] text-graytext">
          40세 미만은 예측이 참고용이에요
        </span>
      </div>

      {/* 주소 */}
      <label className="mt-4 text-[16px] font-bold text-charcoal">주소</label>
      <button
        onClick={() => setPostcodeOpen(true)}
        className="mt-2 h-[60px] rounded-field bg-lightgreen flex items-center justify-center gap-2.5 active:brightness-95 transition"
      >
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#3E7A4E"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.35-4.35" />
        </svg>
        <span className="text-[19px] font-bold text-forest">주소 검색</span>
      </button>
      <div className="mt-2.5 h-[60px] bg-white border-2 border-borderline rounded-field flex items-center px-5 gap-2.5">
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#3E7A4E"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="flex-none"
        >
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
        <input
          type="text"
          value={addr}
          onChange={(e) => setAddr(e.target.value)}
          placeholder="주소 검색을 눌러 주세요"
          className="flex-1 min-w-0 bg-transparent text-[18px] text-charcoal placeholder:text-graytext outline-none"
        />
      </div>
      <input
        type="text"
        value={addrDetail}
        onChange={(e) => setAddrDetail(e.target.value)}
        placeholder="○○아파트 101동 202호"
        className="mt-2.5 h-[60px] bg-white border-2 border-borderline rounded-field px-5 text-[18px] text-charcoal placeholder:text-graytext focus:border-forest"
      />
      <p className="mt-1.5 text-[14px] text-graytext">
        이 분께 가까운 보건소·프로그램 추천에 사용돼요
      </p>
      </div>

      {/* 하단 고정: 추가하기 CTA + 데모 채우기 */}
      <div className="shrink-0 flex flex-col px-gutter pt-3 pb-8 bg-ivory">
        <button onClick={submit} disabled={!canSubmit} className="btn-primary">
          {editId ? "저장하기" : "추가하기"}
        </button>
        {!editId && (
          <button
            onClick={quickFillDemo}
            className="mt-3 mx-auto text-[14px] text-graytext underline underline-offset-4 active:brightness-90"
          >
            데모용 빠르게 채우기
          </button>
        )}
      </div>

      {/* 주소 검색 (카카오 우편번호 서비스) */}
      <PostcodeSearch
        open={postcodeOpen}
        onSelect={setAddr}
        onClose={() => setPostcodeOpen(false)}
      />
      <TabBar />

      <Dialog
        open={doneOpen}
        message={editId ? "수정되었습니다" : "사용자가 추가되었습니다"}
        onConfirm={() => router.push("/mypage")}
      />
    </div>
  );
}
