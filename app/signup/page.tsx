"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useBonJour } from "@/lib/store";
import PageHeader from "@/components/PageHeader";
import PostcodeSearch from "@/components/PostcodeSearch";
import ScrollWheelColumn from "@/components/ScrollWheelColumn";

// 화면 5a · 회원가입(데모) — 인증 없이 화면만. 스플래시 → 회원가입 → 홈
const fieldCls =
  "w-full h-[60px] rounded-field bg-white border-2 border-borderline px-5 text-[18px] text-charcoal placeholder:text-graytext focus:border-forest outline-none";


export default function SignupScreen() {
  const router = useRouter();
  const setProfileInfo = useBonJour((s) => s.setProfileInfo);

  const [phone, setPhone] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [name, setName] = useState("");
  // 예측 모델이 여성 데이터 기준 — 남성은 딤 처리, 여성 기본 선택
  const [gender, setGender] = useState<"F" | "M" | null>("F");
  const [bYear, setBYear] = useState(1968);
  const [bMonth, setBMonth] = useState(3);
  const [bDay, setBDay] = useState(15);
  const [address, setAddress] = useState("");
  const [addressDetail, setAddressDetail] = useState("");
  const [postcodeOpen, setPostcodeOpen] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [addrNote, setAddrNote] = useState("");

  // 현재 위치로 주소 채우기 (GPS → 서버 → 카카오 좌표→주소)
  const useCurrentLocation = () => {
    if (!("geolocation" in navigator)) {
      setAddrNote("이 기기에서는 위치를 사용할 수 없어요.");
      return;
    }
    setGeoLoading(true);
    setAddrNote("");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const res = await fetch(
            `/api/reverse-geocode?lat=${latitude}&lng=${longitude}`
          );
          const data = await res.json();
          setAddress(data.address || "");
          if (data.source === "fallback") {
            setAddrNote(
              "* 예시 주소예요. (카카오 키 연결 시 실제 주소가 채워져요)"
            );
          }
        } catch {
          setAddrNote("주소를 불러오지 못했어요. 잠시 후 다시 시도해주세요.");
        } finally {
          setGeoLoading(false);
        }
      },
      (err) => {
        setGeoLoading(false);
        setAddrNote(
          err.code === err.PERMISSION_DENIED
            ? "위치 권한이 꺼져 있어요. 브라우저 설정에서 허용해주세요."
            : "위치를 확인하지 못했어요."
        );
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
    );
  };

  // 월/연도 변경 시 일자가 말일을 넘지 않게 보정
  const daysInMonth = new Date(bYear, bMonth, 0).getDate();
  const day = Math.min(bDay, daysInMonth);
  const birth = `${bYear}-${String(bMonth).padStart(2, "0")}-${String(
    day
  ).padStart(2, "0")}`;

  const today = new Date();
  let age = today.getFullYear() - bYear;
  if (
    today.getMonth() + 1 < bMonth ||
    (today.getMonth() + 1 === bMonth && today.getDate() < day)
  ) {
    age -= 1;
  }

  const canSubmit = name.trim().length > 0 && gender != null;

  const submit = () => {
    if (!canSubmit) return;
    setProfileInfo({
      name: name.trim(),
      relation: "본인",
      gender: gender ?? undefined,
      birth: birth || undefined,
      region: address || "순천시",
    });
    router.push("/home");
  };

  // 데모용: 확인하기 좋은 연령대(폐경 후 50대 여성)로 폼만 채운다 — 이동은 가입하기로
  const quickFillDemo = () => {
    setPhone("010-1234-5678");
    setPassword("bonjour123!");
    setName("김순자");
    setGender("F");
    setBYear(1968);
    setBMonth(3);
    setBDay(15);
    setAddress("전남 순천시 백강로 38"); // 실제 도로명 주소(순천 조례동)
    setAddressDetail("본주르아파트 101동 202호");
  };

  return (
    <div className="flex flex-col h-dvh bg-ivory">
      <PageHeader title="회원가입" back onBack={() => router.push("/")} />

      {/* 입력 영역(스크롤) — 자식이 눌려 찌그러지지 않게 shrink-0 강제 */}
      <div className="flex-1 overflow-y-auto px-gutter pb-4 flex flex-col [&>*]:shrink-0">
      {/* 휴대폰 번호 */}
      <label className="mt-2 text-sub font-bold text-charcoal">
        휴대폰 번호
      </label>
      <div className="mt-2 flex gap-[10px]">
        <input
          type="tel"
          inputMode="numeric"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="010-1234-5678"
          className={`${fieldCls} flex-1 min-w-0`}
        />
        <button
          type="button"
          onClick={() => setCodeSent(true)}
          className="shrink-0 h-[60px] rounded-field bg-lightgreen px-4 text-[16px] font-bold text-forest whitespace-nowrap active:brightness-95 transition"
        >
          인증번호 받기
        </button>
      </div>
      {codeSent && (
        <input
          type="text"
          inputMode="numeric"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="인증번호 6자리"
          className={`${fieldCls} mt-[10px]`}
        />
      )}

      {/* 비밀번호 */}
      <label className="mt-4 text-sub font-bold text-charcoal">비밀번호</label>
      <div className="mt-2 flex items-center gap-3 h-[60px] rounded-field bg-white border-2 border-borderline px-5 focus-within:border-forest">
        <input
          type={showPw ? "text" : "password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="비밀번호를 입력해 주세요"
          className="flex-1 min-w-0 h-full bg-transparent text-[18px] text-charcoal placeholder:text-graytext outline-none"
        />
        <button
          type="button"
          onClick={() => setShowPw((v) => !v)}
          aria-label={showPw ? "비밀번호 숨기기" : "비밀번호 표시"}
          className="shrink-0"
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#6B6B6B"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </button>
      </div>

      {/* 이름 */}
      <label className="mt-4 text-sub font-bold text-charcoal">이름</label>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="이름을 입력해 주세요"
        className={`${fieldCls} mt-2`}
      />

      {/* 성별 */}
      <label className="mt-4 text-sub font-bold text-charcoal">성별</label>
      <div className="mt-2 flex gap-3">
        {(
          [
            ["F", "여성"],
            ["M", "남성"],
          ] as const
        ).map(([g, label]) => {
          const selected = gender === g;
          return (
            <button
              key={g}
              type="button"
              onClick={() => setGender(g)}
              disabled={g === "M"}
              className={`flex-1 h-[60px] rounded-field flex items-center justify-center gap-2 transition active:brightness-95 ${
                selected
                  ? "bg-lightgreen border-[2.5px] border-forest text-[19px] font-bold text-forest"
                  : g === "M"
                  ? "bg-white border-2 border-borderline text-[19px] font-medium text-borderline opacity-50 cursor-not-allowed"
                  : "bg-white border-2 border-borderline text-[19px] font-medium text-charcoal"
              }`}
            >
              <span>{label}</span>
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

      {/* 생년월일 — 휠 피커 */}
      <label className="mt-4 text-sub font-bold text-charcoal">생년월일</label>
      <div className="mt-2 relative rounded-field bg-white border-2 border-borderline p-[10px]">
        <div className="absolute left-[10px] right-[10px] top-1/2 -translate-y-1/2 h-[42px] bg-lightgreen rounded-chip" />
        <div className="relative grid grid-cols-[1.3fr_1fr_1fr]">
          <ScrollWheelColumn
            value={bYear}
            min={1920}
            max={today.getFullYear()}
            format={(v) => `${v}년`}
            onChange={setBYear}
          />
          <ScrollWheelColumn
            value={bMonth}
            min={1}
            max={12}
            format={(v) => `${v}월`}
            onChange={setBMonth}
          />
          <ScrollWheelColumn
            value={day}
            min={1}
            max={daysInMonth}
            format={(v) => `${v}일`}
            onChange={setBDay}
          />
        </div>
      </div>
      <div className="mt-2 flex">
        <span className="text-[15px] font-bold text-forest bg-lightgreen rounded-chip px-3 py-1">
          만 {age}세
        </span>
      </div>

      {/* 주소 — 현재 위치(카카오 좌표→주소) + 주소 검색(우편번호) */}
      <label className="mt-4 text-sub font-bold text-charcoal">주소</label>
      <div className="mt-2 flex gap-2.5">
        <button
          type="button"
          onClick={useCurrentLocation}
          disabled={geoLoading}
          className="flex-1 h-[60px] rounded-field bg-lightgreen flex items-center justify-center gap-2 active:brightness-95 disabled:opacity-70 transition"
        >
          {geoLoading ? (
            <>
              <span
                className="inline-block w-[18px] h-[18px] rounded-full border-2 border-forest border-t-transparent animate-spin"
                aria-hidden
              />
              <span className="text-[17px] font-bold text-forest">
                확인 중…
              </span>
            </>
          ) : (
            <>
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#3E7A4E"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="3" />
                <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
                <circle cx="12" cy="12" r="8" />
              </svg>
              <span className="text-[17px] font-bold text-forest">
                현재 위치
              </span>
            </>
          )}
        </button>
        <button
          type="button"
          onClick={() => setPostcodeOpen(true)}
          className="flex-1 h-[60px] rounded-field bg-lightgreen flex items-center justify-center gap-2 active:brightness-95 transition"
        >
          <svg
            width="20"
            height="20"
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
          <span className="text-[17px] font-bold text-forest">주소 검색</span>
        </button>
      </div>
      <div className="mt-[10px] h-[60px] rounded-field bg-white border-2 border-borderline flex items-center gap-[10px] px-5">
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#3E7A4E"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="shrink-0"
        >
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
        <span
          className={`text-[18px] truncate ${
            address ? "text-charcoal" : "text-graytext"
          }`}
        >
          {address || "주소를 검색해 주세요"}
        </span>
      </div>
      {addrNote && (
        <p className="mt-1.5 text-[14px] text-graytext">{addrNote}</p>
      )}
      <input
        type="text"
        value={addressDetail}
        onChange={(e) => setAddressDetail(e.target.value)}
        placeholder="○○아파트 101동 202호"
        className={`${fieldCls} mt-[10px]`}
      />
      <p className="mt-2 text-[14px] text-graytext">
        가까운 보건소·프로그램 추천에 사용돼요
      </p>
      </div>

      {/* 하단 고정: 가입하기 CTA + 데모 채우기 */}
      <div className="shrink-0 flex flex-col px-gutter pt-3 pb-8 bg-ivory">
        <button
          type="button"
          onClick={submit}
          disabled={!canSubmit}
          className="btn-primary"
        >
          가입하기
        </button>
        <button
          type="button"
          onClick={quickFillDemo}
          className="mt-3 mx-auto text-[14px] text-graytext underline underline-offset-4 active:brightness-90"
        >
          데모용 빠르게 채우기
        </button>
      </div>

      {/* 주소 검색 (카카오 우편번호 서비스) */}
      <PostcodeSearch
        open={postcodeOpen}
        onSelect={setAddress}
        onClose={() => setPostcodeOpen(false)}
      />
    </div>
  );
}
