import { NextRequest, NextResponse } from "next/server";
import { audit, insert, select, update } from "@/lib/db";
import {
  blindIndex,
  decrypt,
  hashIp,
  hmac,
  newToken,
  normalizePhone,
  verifySecret,
} from "@/lib/crypto";

/**
 * 로그인
 *
 * 기획서 「민감정보 접근 제어 — 인증 5회 연속 실패 시 계정 접근 잠금」 대응
 *  · 5회 연속 실패 → 10분 잠금
 *  · 성공하면 실패 카운트 초기화
 *  · 존재하지 않는 번호와 틀린 비밀번호를 같은 문구로 응답 (계정 존재 여부 노출 방지)
 */

const MAX_FAILS = 5;
const LOCK_MINUTES = 10;
const SESSION_DAYS = 14;
const GENERIC = "번호 또는 비밀번호가 맞지 않아요.";

export async function POST(req: NextRequest) {
  const ipHash = hashIp(req.headers.get("x-forwarded-for") || "");
  let phone = "";
  let password = "";
  try {
    ({ phone, password } = await req.json());
  } catch {
    return NextResponse.json({ error: "요청을 읽지 못했어요." }, { status: 400 });
  }

  const phoneHash = blindIndex(normalizePhone(phone));

  try {
    const [user] = await select("users", { phone_hash: phoneHash }, 1);
    if (!user) {
      await audit({ action: "login_failed", subject_hash: phoneHash, ip_hash: ipHash });
      return NextResponse.json({ error: GENERIC }, { status: 401 });
    }

    if (user.locked_until && new Date(user.locked_until).getTime() > Date.now()) {
      const left = Math.ceil(
        (new Date(user.locked_until).getTime() - Date.now()) / 60000
      );
      return NextResponse.json(
        { error: `비밀번호를 ${MAX_FAILS}번 틀려 잠겼어요. ${left}분 뒤에 다시 시도해 주세요.` },
        { status: 423 }
      );
    }

    if (!verifySecret(String(password || ""), user.password_hash)) {
      const failed = (user.failed_attempts || 0) + 1;
      const locked =
        failed >= MAX_FAILS
          ? new Date(Date.now() + LOCK_MINUTES * 60 * 1000).toISOString()
          : null;
      await update("users", user.id, {
        failed_attempts: failed,
        locked_until: locked,
      });
      await audit({
        action: locked ? "account_locked" : "login_failed",
        subject_hash: phoneHash,
        ip_hash: ipHash,
        detail: `${failed}/${MAX_FAILS}`,
      });
      return NextResponse.json(
        {
          error: locked
            ? `비밀번호를 ${MAX_FAILS}번 틀렸어요. ${LOCK_MINUTES}분 뒤에 다시 시도해 주세요.`
            : `${GENERIC} (${MAX_FAILS - failed}번 남음)`,
        },
        { status: locked ? 423 : 401 }
      );
    }

    await update("users", user.id, { failed_attempts: 0, locked_until: null });

    const token = newToken();
    await insert("sessions", {
      token_hash: hmac(token),
      user_id: user.id,
      expires_at: new Date(
        Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000
      ).toISOString(),
    });
    await audit({ action: "login", subject_hash: phoneHash, ip_hash: ipHash });

    const res = NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        name: decrypt(user.name_enc) || "",
        gender: user.gender,
        birth: user.birth_enc ? decrypt(user.birth_enc) : null,
        region: user.region,
      },
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
    console.error("[login]", e);
    return NextResponse.json(
      { error: "로그인하지 못했어요. 잠시 후 다시 시도해 주세요." },
      { status: 500 }
    );
  }
}
