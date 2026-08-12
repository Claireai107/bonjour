import { NextRequest, NextResponse } from "next/server";
import { audit, countSince, insert, select } from "@/lib/db";
import {
  blindIndex,
  generateCode,
  hashIp,
  hashSecret,
  normalizePhone,
} from "@/lib/crypto";

/**
 * 인증번호 발송
 *
 * 기획서 「보안 설계 — 회원가입 시, 인증번호 제한」 대응
 *  · 유효시간 3분
 *  · 재발송 쿨다운 60초
 *  · 번호당 24시간 5회 한도
 *  · 코드는 해시로만 저장 (DB가 털려도 코드를 알 수 없음)
 *
 * 발송 채널은 SMS_MODE 로 갈아끼운다.
 *  - mock (기본) : 실제 발송 없이 화면에 코드를 표시 — 시연·심사용, 비용 0원
 *  - sms         : 실제 문자 발송 (알리고 등). sendSms() 안쪽만 바꾸면 된다.
 */

const CODE_TTL_MS = 3 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const DAILY_LIMIT = 5;

const MOCK = (process.env.SMS_MODE || "mock") !== "sms";

async function sendSms(phone: string, code: string): Promise<void> {
  // 실발송으로 전환할 때 이 함수만 교체하면 된다.
  // 예) 알리고: POST https://apis.aligo.in/send/ (key, user_id, sender, receiver, msg)
  console.info(`[sms] ${phone} 로 인증번호 발송 (mock=${MOCK})`);
}

export async function POST(req: NextRequest) {
  const ipHash = hashIp(req.headers.get("x-forwarded-for") || "");
  let phone = "";
  try {
    ({ phone } = await req.json());
  } catch {
    return NextResponse.json({ error: "요청을 읽지 못했어요." }, { status: 400 });
  }

  const digits = normalizePhone(phone);
  if (!/^01[016789][0-9]{7,8}$/.test(digits)) {
    return NextResponse.json(
      { error: "휴대폰 번호를 다시 확인해 주세요." },
      { status: 400 }
    );
  }

  const phoneHash = blindIndex(digits);

  try {
    // 재발송 쿨다운 — 직전 발송이 60초 이내면 거절
    const [last] = await select("phone_verifications", { phone_hash: phoneHash }, 1);
    if (last) {
      const elapsed = Date.now() - new Date(last.created_at).getTime();
      if (elapsed < RESEND_COOLDOWN_MS) {
        const wait = Math.ceil((RESEND_COOLDOWN_MS - elapsed) / 1000);
        return NextResponse.json(
          { error: `${wait}초 뒤에 다시 받을 수 있어요.`, retryAfter: wait },
          { status: 429 }
        );
      }
    }

    // 24시간 발송 한도
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const todayCount = await countSince(
      "phone_verifications",
      { phone_hash: phoneHash },
      since
    );
    if (todayCount >= DAILY_LIMIT) {
      await audit({
        action: "verify_blocked",
        subject_hash: phoneHash,
        ip_hash: ipHash,
        detail: "일일 발송 한도 초과",
      });
      return NextResponse.json(
        { error: "오늘은 인증번호를 더 받을 수 없어요. 내일 다시 시도해 주세요." },
        { status: 429 }
      );
    }

    const code = generateCode();
    await insert("phone_verifications", {
      phone_hash: phoneHash,
      code_hash: hashSecret(code),
      expires_at: new Date(Date.now() + CODE_TTL_MS).toISOString(),
      attempts: 0,
      consumed: false,
    });
    await sendSms(digits, code);
    await audit({
      action: "verify_sent",
      subject_hash: phoneHash,
      ip_hash: ipHash,
    });

    return NextResponse.json({
      ok: true,
      expiresInSec: CODE_TTL_MS / 1000,
      remaining: DAILY_LIMIT - todayCount - 1,
      // mock 모드에서만 코드를 내려준다. 실발송 모드에서는 절대 노출되지 않는다.
      ...(MOCK ? { mockCode: code } : {}),
    });
  } catch (e) {
    console.error("[send-code]", e);
    return NextResponse.json(
      { error: "인증번호를 보내지 못했어요. 잠시 후 다시 시도해 주세요." },
      { status: 500 }
    );
  }
}
