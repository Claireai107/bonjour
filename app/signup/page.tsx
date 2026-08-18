"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useBonJour } from "@/lib/store";
import PostcodeSearch from "@/components/PostcodeSearch";
import ScrollWheelColumn from "@/components/ScrollWheelColumn";
import Dialog from "@/components/Dialog";
import { ConsentSheet, type ConsentDoc } from "@/components/PrivacyPolicy";

// 화면 5a · 회원가입 — 휴대폰 인증 → 동의 → 서버 가입(DB 저장). 스플래시 → 회원가입 → 홈
const fieldCls =
  "w-full h-[60px] rounded-field bg-white border-2 border-borderline px-5 text-[length:calc(18px*var(--ts))] text-charcoal placeholder:text-graytext focus:border-forest outline-none";

export default function SignupScreen() {
  const router = useRouter();
  const setProfileInfo = useBonJour((s) => s.setProfileInfo);

  const [phone, setPhone] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState("");
  const [verified, setVerified] = useState(false);
  const [verifiedToken, setVerifiedToken] = useState("");
  const [mockCode, setMockCode] = useState("");
  const [codeMsg, setCodeMsg] = useState("");
  const [codeErr, setCodeErr] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [sending, setSending] = useState(false);
  // 동의는 법령상 항목별로 따로 받는다 (일괄 동의 불가)
  const [agreePrivacy, setAgreePrivacy] = useState(false);   // 개인정보 (필수)
  const [agreeSensitive, setAgreeSensitive] = useState(false); // 건강정보 (필수)
  const [agreeLocation, setAgreeLocation] = useState(false);   // 위치정보 (선택)
  const [openDoc, setOpenDoc] = useState<ConsentDoc | null>(null);
  const [formErr, setFormErr] = useState("");
  const [needVerify, setNeedVerify] = useState(false); // 인증 없이 가입 시도 시 안내
  const [askLocation, setAskLocation] = useState(false); // 현재위치 클릭 시 위치 동의 확인
  const [busy, setBusy] = useState(false);
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [name, setName] = useState("");
  const [gender, setGender] = useState<"F" | "M" | null>(null);
  const [bYear, setBYear] = useState(1968);
  const [bMonth, setBMonth] = useState(3);
  const [bDay, setBDay] = useState(15);
  const [address, setAddress] = useState("");
  const [addressDetail, setAddressDetail] = useState("");
  const [postcodeOpen, setPostcodeOpen] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [addrNote, setAddrNote] = useState("");

  // 인증번호 유효시간 카운트다운 (3분)
  useEffect(() => {
    if (secondsLeft <= 0) return;
    const id = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [secondsLeft]);

  // 인증번호 받기 — 서버가 코드 생성·해시 저장, 쿨다운·일일한도를 검사한다
  const sendCode = async () => {
    if (sending) return;
    setSending(true);
    setCodeErr("");
    setCodeMsg("");
    try {
      const res = await fetch("/api/auth/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCodeErr(data.error || "인증번호를 보내지 못했어요.");
        return;
      }
      setCodeSent(true);
      setVerified(false);
      setCode("");
      setSecondsLeft(data.expiresInSec ?? 180);
      setMockCode(data.mockCode || "");
      setCodeMsg(
        data.mockCode
          ? "시연 모드예요. 아래 번호를 그대로 입력해 주세요."
          : "문자로 보낸 6자리 번호를 입력해 주세요."
      );
    } catch {
      setCodeErr("연결이 불안정해요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setSending(false);
    }
  };

  // 인증번호 확인 — 서버가 만료·시도횟수를 검사하고 성공 시 증표를 발급한다
  const verifyCode = async () => {
    setCodeErr("");
    try {
      const res = await fetch("/api/auth/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCodeErr(data.error || "인증하지 못했어요.");
        return;
      }
      setVerified(true);
      setVerifiedToken(data.verifiedToken);
      setSecondsLeft(0);
      setCodeMsg("인증이 완료됐어요.");
      setMockCode("");
    } catch {
      setCodeErr("연결이 불안정해요. 잠시 후 다시 시도해 주세요.");
    }
  };

  // 현재 위치로 주소 채우기 (GPS → 서버 → 카카오 좌표→주소)
  //
  // 위치정보법(제15조)상 개인위치정보 수집·이용에는 동의가 필요하다.
  // 다만 미리 아래 체크박스를 찾아 동의하게 하는 대신, 버튼을 누른 시점에
  // 동의를 물어(just-in-time) 동의하면 바로 이어서 위치를 읽는다.
  const useCurrentLocation = () => {
    if (!agreeLocation) {
      setAskLocation(true); // 동의 다이얼로그 → 동의 시 체크 + 즉시 실행
      return;
    }
    doLocate();
  };

  const doLocate = () => {
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

  // 휴대폰 인증(verified)은 버튼 활성화 조건에서 빼고, 클릭 시 안내로 알려준다
  // — 왜 비활성인지 모른 채 버튼만 눌러보는 상황 방지
  const canSubmit =
    name.trim().length > 0 &&
    gender != null &&
    agreePrivacy &&
    agreeSensitive &&
    password.length >= 8;

  const submit = async () => {
    if (!canSubmit || busy) return;
    if (!verified) {
      setNeedVerify(true);
      return;
    }
    setBusy(true);
    setFormErr("");
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone,
          password,
          name: name.trim(),
          gender,
          birth,
          region: address || "순천시",
          verifiedToken,
          consent: agreePrivacy,
          consentSensitive: agreeSensitive,
          consentLocation: agreeLocation,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormErr(data.error || "가입하지 못했어요.");
        return;
      }
      setProfileInfo({
        name: name.trim(),
        relation: "본인",
        gender: gender ?? undefined,
        birth: birth || undefined,
        region: address || "순천시",
      });
      router.push("/home");
    } catch {
      setFormErr("연결이 불안정해요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  };

  // 데모용: 확인하기 좋은 연령대(폐경 후 50대 여성)로 폼만 채운다 — 이동은 가입하기로
  const quickFillDemo = () => {
    setPhone("010-1234-5678");
    setPassword("bonjour2026");
    setAgreePrivacy(true);
    setAgreeSensitive(true);
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
      {/* 상단 고정: 뒤로가기 + 타이틀 */}
      <div className="shrink-0 flex items-center gap-3 pt-safetop pb-3 px-gutter">
        <button
          type="button"
          onClick={() => router.push("/")}
          aria-label="뒤로가기"
          className="shrink-0 flex items-center justify-center"
        >
          <svg
            width="26"
            height="26"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#2B2B2B"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <span className="text-[length:calc(22px*var(--ts))] font-bold text-charcoal whitespace-nowrap">
          회원가입
        </span>
      </div>

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
          onClick={sendCode}
          disabled={sending || verified || secondsLeft > 120}
          className="shrink-0 h-[60px] rounded-field bg-lightgreen px-4 text-[length:calc(16px*var(--ts))] font-bold text-forest whitespace-nowrap active:brightness-95 disabled:opacity-50 transition"
        >
          {verified ? "인증 완료" : codeSent ? "다시 받기" : "인증번호 받기"}
        </button>
      </div>

      {codeSent && !verified && (
        <>
          <div className="mt-[10px] flex gap-[10px]">
            <div className="relative flex-1 min-w-0">
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) =>
                  setCode(e.target.value.replace(/[^0-9]/g, ""))
                }
                placeholder="인증번호 6자리"
                className={`${fieldCls} pr-[70px]`}
              />
              {secondsLeft > 0 && (
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[length:calc(16px*var(--ts))] font-bold text-danger tabular-nums">
                  {String(Math.floor(secondsLeft / 60)).padStart(2, "0")}:
                  {String(secondsLeft % 60).padStart(2, "0")}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={verifyCode}
              disabled={code.length !== 6}
              className="shrink-0 h-[60px] rounded-field bg-forest px-5 text-[length:calc(16px*var(--ts))] font-bold text-white whitespace-nowrap active:brightness-95 disabled:opacity-40 transition"
            >
              확인
            </button>
          </div>
          {mockCode && (
            <div className="mt-2 rounded-chip bg-lightgreen px-4 py-2.5 flex items-center gap-2">
              <span className="text-[length:calc(16px*var(--ts))] text-forest">시연용 인증번호</span>
              <span className="text-[length:calc(20px*var(--ts))] font-bold text-forest tracking-[0.15em] tabular-nums">
                {mockCode}
              </span>
            </div>
          )}
        </>
      )}

      {verified && (
        <p className="mt-2 text-[length:calc(16px*var(--ts))] font-bold text-forest">
          휴대폰 인증이 완료됐어요
        </p>
      )}
      {codeErr && <p className="mt-2 text-[length:calc(16px*var(--ts))] text-danger">{codeErr}</p>}
      {!codeErr && codeMsg && !verified && (
        <p className="mt-2 text-[length:calc(16px*var(--ts))] text-graytext">{codeMsg}</p>
      )}

      {/* 비밀번호 */}
      <label className="mt-4 text-sub font-bold text-charcoal">비밀번호</label>
      <div className="mt-2 flex items-center gap-3 h-[60px] rounded-field bg-white border-2 border-borderline px-5 focus-within:border-forest">
        <input
          type={showPw ? "text" : "password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="비밀번호를 입력해 주세요"
          className="flex-1 min-w-0 h-full bg-transparent text-[length:calc(18px*var(--ts))] text-charcoal placeholder:text-graytext outline-none"
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

      <p className="mt-2 text-[length:calc(16px*var(--ts))] text-graytext">
        영문과 숫자를 함께 넣어 8자 이상으로 만들어 주세요
      </p>

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
              className={`flex-1 h-[60px] rounded-field flex items-center justify-center gap-2 transition active:brightness-95 ${
                selected
                  ? "bg-forest border-[2.5px] border-forest text-[length:calc(19px*var(--ts))] font-bold text-white"
                  : "bg-white border-2 border-borderline text-[length:calc(19px*var(--ts))] font-medium text-charcoal"
              }`}
            >
              <span>{label}</span>
              {selected && (
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#FFFFFF"
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

      {/*
        생년월일 — 숫자 직접 입력이 기본, 휠은 보조.
        1차 UT에서 P4·P5가 "어떻게 변경하지?", "아래로 내려서 선택하는구나" 하며
        휠 조작법을 몰라 진행자 안내를 받아야 했다(각각 195초·167초 소요).
      */}
      <label className="mt-4 text-sub font-bold text-charcoal">생년월일</label>
      <p className="mt-1 text-[length:calc(16px*var(--ts))] text-graytext">
        숫자로 바로 입력하세요 (예: 1962 / 05 / 14)
      </p>
      <div className="mt-2 flex items-center gap-2">
        <BirthNumberInput
          value={bYear}
          onChange={setBYear}
          min={1920}
          max={today.getFullYear()}
          length={4}
          suffix="년"
          ariaLabel="태어난 연도"
        />
        <BirthNumberInput
          value={bMonth}
          onChange={setBMonth}
          min={1}
          max={12}
          length={2}
          suffix="월"
          ariaLabel="태어난 달"
        />
        <BirthNumberInput
          value={day}
          onChange={setBDay}
          min={1}
          max={daysInMonth}
          length={2}
          suffix="일"
          ariaLabel="태어난 날"
        />
      </div>

      {/* 스크롤 휠 — 항상 표시 (숫자 직접 입력과 병행) */}
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
        <span className="text-[length:calc(16px*var(--ts))] font-bold text-forest bg-lightgreen rounded-chip px-3 py-1">
          만 {age}세
        </span>
      </div>

      {/* 주소 — 현재 위치(카카오 좌표→주소) + 주소 검색(우편번호) */}
      <label className="mt-4 text-sub font-bold text-charcoal">주소</label>
      {/* 도로명만 되는 줄 알고 헤매는 경우가 있었다 — 검색 가능한 형태를 미리 알려준다 */}
      <p className="mt-1 text-[length:calc(16px*var(--ts))] text-graytext leading-[1.5]">
        도로명·동번지·건물명 모두 찾을 수 있어요
        <br />
        예) 백강로 38 · 조례동 1234 · 순천시청
      </p>
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
              <span className="text-[length:calc(17px*var(--ts))] font-bold text-forest">
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
              <span className="text-[length:calc(17px*var(--ts))] font-bold text-forest">
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
          <span className="text-[length:calc(17px*var(--ts))] font-bold text-forest">주소 검색</span>
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
          className={`text-[length:calc(18px*var(--ts))] truncate ${
            address ? "text-charcoal" : "text-graytext"
          }`}
        >
          {address || "주소를 검색해 주세요"}
        </span>
      </div>
      {addrNote && (
        <p className="mt-1.5 text-[length:calc(16px*var(--ts))] text-graytext">{addrNote}</p>
      )}
      <input
        type="text"
        value={addressDetail}
        onChange={(e) => setAddressDetail(e.target.value)}
        placeholder="○○아파트 101동 202호"
        className={`${fieldCls} mt-[10px]`}
      />
      <p className="mt-2 text-[length:calc(16px*var(--ts))] text-graytext">
        가까운 보건소·프로그램 추천에 사용돼요
      </p>

      {/* 동의 — 개인정보보호법 제23조(민감정보)와 위치정보법 제19조에 따라 항목별로 따로 받는다 */}
      <div className="mt-5 rounded-card bg-white border-2 border-borderline overflow-hidden">
        <ConsentRow
          label="개인정보 수집·이용"
          required
          checked={agreePrivacy}
          onToggle={() => setAgreePrivacy((v) => !v)}
          onOpen={() => setOpenDoc("privacy")}
        />
        <ConsentRow
          label="건강정보(민감정보) 처리"
          required
          checked={agreeSensitive}
          onToggle={() => setAgreeSensitive((v) => !v)}
          onOpen={() => setOpenDoc("sensitive")}
        />
        <ConsentRow
          label="위치정보 이용"
          checked={agreeLocation}
          onToggle={() => setAgreeLocation((v) => !v)}
          onOpen={() => setOpenDoc("location")}
          last
        />
      </div>
      <p className="mt-2 text-[length:calc(16px*var(--ts))] text-graytext leading-[1.55]">
        위치정보는 선택이에요. 동의하지 않으셔도 가입과 뼈 건강 예측은 그대로
        이용하실 수 있어요.
      </p>

      {formErr && (
        <p className="mt-3 text-[length:calc(16px*var(--ts))] text-danger leading-[1.5]">{formErr}</p>
      )}
      </div>

      {/* 하단 고정: 가입하기 CTA + 데모 채우기 */}
      <div className="shrink-0 flex flex-col px-gutter pt-3 pb-8 bg-ivory">
        <button
          type="button"
          onClick={submit}
          disabled={!canSubmit}
          className="btn-primary"
        >
          {busy ? "가입 중…" : "가입하기"}
        </button>
        <button
          type="button"
          onClick={quickFillDemo}
          className="mt-3 mx-auto text-[length:calc(16px*var(--ts))] text-graytext underline underline-offset-4 active:brightness-90"
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

      {/* 동의 전문 — 전체화면 시트 */}
      <ConsentSheet
        doc={openDoc}
        onClose={() => setOpenDoc(null)}
        onAgree={(d) => {
          if (d === "privacy") setAgreePrivacy(true);
          if (d === "sensitive") setAgreeSensitive(true);
          if (d === "location") setAgreeLocation(true);
        }}
      />

      {/* 인증 없이 가입하기를 누른 경우 안내 */}
      <Dialog
        open={needVerify}
        message={"핸드폰 번호를 인증해주세요."}
        onConfirm={() => setNeedVerify(false)}
      />

      {/* 현재 위치 사용 시점 동의 (위치정보법 — 동의 없이 수집하지 않는다) */}
      <Dialog
        open={askLocation}
        message={
          "현재 위치로 주소를 찾으려면\n위치정보 이용 동의가 필요해요.\n동의하고 계속할까요?"
        }
        cancelLabel="취소"
        confirmLabel="동의하고 찾기"
        onCancel={() => setAskLocation(false)}
        onConfirm={() => {
          setAgreeLocation(true); // 아래 동의 항목에도 체크로 반영된다
          setAskLocation(false);
          doLocate();
        }}
      />
    </div>
  );
}

/** 동의 항목 한 줄 — 체크박스 + 전문 보기 */
function ConsentRow({
  label,
  required = false,
  checked,
  onToggle,
  onOpen,
  last = false,
}: {
  label: string;
  required?: boolean;
  checked: boolean;
  onToggle: () => void;
  onOpen: () => void;
  last?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-2 pl-4 pr-2 py-3 ${
        last ? "" : "border-b border-[#F0EEE6]"
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={checked}
        className="flex-1 min-w-0 flex items-center gap-3 text-left"
      >
        <span
          className={`w-[26px] h-[26px] shrink-0 rounded-lg flex items-center justify-center border-2 ${
            checked ? "bg-forest border-forest" : "bg-white border-borderline"
          }`}
        >
          {checked && (
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="3.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20 6L9 17l-5-5" />
            </svg>
          )}
        </span>
        <span className="min-w-0 text-[length:calc(17px*var(--ts))] font-bold text-charcoal leading-[1.4]">
          <span className={required ? "text-danger" : "text-graytext"}>
            [{required ? "필수" : "선택"}]
          </span>{" "}
          {label}
        </span>
      </button>
      <button
        type="button"
        onClick={onOpen}
        aria-label={`${label} 전문 보기`}
        className="shrink-0 flex items-center gap-0.5 px-2 py-2 text-[length:calc(16px*var(--ts))] text-graytext underline underline-offset-4 active:brightness-90"
      >
        전문 보기
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#6B6B6B"
          strokeWidth="2.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M9 18l6-6-6-6" />
        </svg>
      </button>
    </div>
  );
}

/**
 * 생년월일 숫자 입력 칸.
 * 자릿수를 채우면 다음 칸으로 알아서 넘어가고, 범위를 벗어나면 맞춰준다.
 */
function BirthNumberInput({
  value,
  onChange,
  min,
  max,
  length,
  suffix,
  ariaLabel,
}: {
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  length: number;
  suffix: string;
  ariaLabel: string;
}) {
  const ref = useRef<HTMLInputElement>(null);

  return (
    <div className="flex-1 flex items-center gap-1.5">
      <input
        ref={ref}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={length}
        value={String(value)}
        aria-label={ariaLabel}
        onChange={(e) => {
          const digits = e.target.value.replace(/[^0-9]/g, "").slice(0, length);
          if (!digits) return;
          const n = Number(digits);
          onChange(n);
          // 자릿수를 다 채우면 다음 칸으로
          if (digits.length === length) {
            const inputs = Array.from(
              document.querySelectorAll<HTMLInputElement>(
                'input[inputmode="numeric"]'
              )
            );
            const i = inputs.indexOf(e.target as HTMLInputElement);
            inputs[i + 1]?.focus();
          }
        }}
        onBlur={() => {
          // 범위를 벗어나면 조용히 맞춘다 (경고창을 띄우지 않는다)
          onChange(Math.max(min, Math.min(max, value || min)));
        }}
        className="w-full h-touch rounded-field bg-white border-2 border-borderline text-center text-[length:calc(24px*var(--ts))] font-bold text-charcoal outline-none focus:border-forest tabular-nums"
      />
      <span className="text-[length:calc(18px*var(--ts))] text-graytext shrink-0">
        {suffix}
      </span>
    </div>
  );
}
