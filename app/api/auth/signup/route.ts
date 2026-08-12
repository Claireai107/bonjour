import { NextRequest, NextResponse } from "next/server";
import { audit, insert, select } from "@/lib/db";
import {
  blindIndex,
  encrypt,
  hashIp,
  hashSecret,
  hmac,
  newToken,
  normalizePhone,
} from "@/lib/crypto";
import { checkVerifiedToken } from "@/lib/authToken";

/**
 * 회원가입
 *
 * 기획서 대응
 *  · 최소 수집 : 휴대폰·이름·성별·생년월일·지역만 받는다
 *  · 식별정보는 AES-256-GCM 컬럼 암호화, 휴대폰은 검색용 해시를 따로 둔다
 *  · 비밀번호는 Salt 기반 일방향 해시 (복호화 불가)
 *  · 개인정보 수집·이용 동의 없이는 가입이 진행되지 않는다
 *  · 건강정보는 users 가 아니라 health_records 에 UUID 참조로만 적재
 */

const SESSION_DAYS = 14;

export async function POST(req: NextRequest) {
  const ipHash = hashIp(req.headers.get("x-forwarded-for") || "");
  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "요청을 읽지 못했어요." }, { status: 400 });
  }

  const {
    phone,
    password,
    name,
    gender,
    birth,
    region,
    verifiedToken,
    consent,
    consentSensitive,
    consentLocation,
  } = body;
  const digits = normalizePhone(phone || "");
  const phoneHash = blindIndex(digits);

  if (!consent) {
    return NextResponse.json(
      { error: "개인정보 수집·이용에 동의해야 가입할 수 있어요." },
      { status: 400 }
    );
  }
  // 건강정보는 민감정보라 일반 개인정보와 별도로 동의를 받아야 한다 (개인정보보호법 제23조)
  if (!consentSensitive) {
    return NextResponse.json(
      { error: "건강정보 처리에 동의해야 뼈 건강 예측을 이용할 수 있어요." },
      { status: 400 }
    );
  }
  if (!checkVerifiedToken(verifiedToken || "", phoneHash)) {
    return NextResponse.json(
      { error: "휴대폰 인증을 먼저 완료해 주세요." },
      { status: 400 }
    );
  }
  if (!name || String(name).trim().length < 2) {
    return NextResponse.json({ error: "이름을 입력해 주세요." }, { status: 400 });
  }
  if (!password || String(password).length < 8) {
    return NextResponse.json(
      { error: "비밀번호는 8자 이상으로 만들어 주세요." },
      { status: 400 }
    );
  }
  if (!/[0-9]/.test(password) || !/[a-zA-Z]/.test(password)) {
    return NextResponse.json(
      { error: "비밀번호에 영문과 숫자를 함께 넣어 주세요." },
      { status: 400 }
    );
  }

  try {
    const [existing] = await select("users", { phone_hash: phoneHash }, 1);
    if (existing) {
      return NextResponse.json(
        { error: "이미 가입된 번호예요. 로그인해 주세요." },
        { status: 409 }
      );
    }

    const now = new Date().toISOString();
    const user = await insert("users", {
      phone_hash: phoneHash,
      phone_enc: encrypt(digits),
      name_enc: encrypt(String(name).trim()),
      birth_enc: birth ? encrypt(String(birth)) : null,
      password_hash: hashSecret(String(password)),
      gender: gender === "F" || gender === "M" ? gender : null,
      region: region || null,
      consent_at: now,
      consent_sensitive_at: now,
      consent_location_at: consentLocation ? now : null,
      failed_attempts: 0,
      locked_until: null,
    });

    const token = newToken();
    await insert("sessions", {
      token_hash: hmac(token), // 토큰 원문은 저장하지 않는다
      user_id: user.id,
      expires_at: new Date(
        Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000
      ).toISOString(),
    });
    // 어떤 항목에 동의했는지도 이력으로 남긴다 (동의 증빙)
    await audit({
      action: "signup",
      subject_hash: phoneHash,
      ip_hash: ipHash,
      detail: `consent=개인정보,건강정보${consentLocation ? ",위치정보" : ""}`,
    });

    const res = NextResponse.json({
      ok: true,
      user: { id: user.id, name: String(name).trim(), gender, birth, region },
    });
    res.cookies.set("bj_session", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: SESSION_DAYS * 24 * 60 * 60,
    });
    return res;
  } catch (e) {
    console.error("[signup]", e);
    return NextResponse.json(
      { error: "가입을 완료하지 못했어요. 잠시 후 다시 시도해 주세요." },
      { status: 500 }
    );
  }
}
