import { NextRequest, NextResponse } from "next/server";
import { audit, select, update } from "@/lib/db";
import { blindIndex, hashIp, normalizePhone, verifySecret } from "@/lib/crypto";
import { issueVerifiedToken } from "@/lib/authToken";

/**
 * 인증번호 확인
 *  · 만료(3분) 확인
 *  · 시도 5회 초과 시 코드 폐기 → 재발송해야 함
 *  · 성공한 코드는 즉시 소진(consumed) 처리 — 재사용 불가
 */

const MAX_ATTEMPTS = 5;

export async function POST(req: NextRequest) {
  const ipHash = hashIp(req.headers.get("x-forwarded-for") || "");
  let phone = "";
  let code = "";
  try {
    ({ phone, code } = await req.json());
  } catch {
    return NextResponse.json({ error: "요청을 읽지 못했어요." }, { status: 400 });
  }

  const phoneHash = blindIndex(normalizePhone(phone));

  try {
    const [row] = await select("phone_verifications", { phone_hash: phoneHash }, 1);

    if (!row || row.consumed) {
      return NextResponse.json(
        { error: "인증번호를 먼저 받아 주세요." },
        { status: 400 }
      );
    }
    if (new Date(row.expires_at).getTime() < Date.now()) {
      return NextResponse.json(
        { error: "인증번호가 만료됐어요. 다시 받아 주세요." },
        { status: 400 }
      );
    }
    if (row.attempts >= MAX_ATTEMPTS) {
      return NextResponse.json(
        { error: "입력 횟수를 초과했어요. 인증번호를 다시 받아 주세요." },
        { status: 429 }
      );
    }

    if (!verifySecret(String(code || ""), row.code_hash)) {
      const attempts = row.attempts + 1;
      await update("phone_verifications", row.id, { attempts });
      await audit({
        action: "verify_failed",
        subject_hash: phoneHash,
        ip_hash: ipHash,
        detail: `${attempts}/${MAX_ATTEMPTS}`,
      });
      const left = MAX_ATTEMPTS - attempts;
      return NextResponse.json(
        {
          error:
            left > 0
              ? `인증번호가 달라요. ${left}번 더 입력할 수 있어요.`
              : "입력 횟수를 초과했어요. 인증번호를 다시 받아 주세요.",
          attemptsLeft: Math.max(left, 0),
        },
        { status: 400 }
      );
    }

    await update("phone_verifications", row.id, { consumed: true });
    await audit({
      action: "verify_ok",
      subject_hash: phoneHash,
      ip_hash: ipHash,
    });

    return NextResponse.json({
      ok: true,
      verifiedToken: issueVerifiedToken(phoneHash),
    });
  } catch (e) {
    console.error("[verify-code]", e);
    return NextResponse.json(
      { error: "인증을 확인하지 못했어요. 잠시 후 다시 시도해 주세요." },
      { status: 500 }
    );
  }
}
