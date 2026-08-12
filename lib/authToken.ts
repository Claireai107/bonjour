import crypto from "crypto";

/**
 * 인증 완료 증표 (서버 서명 토큰)
 *
 * 인증번호 확인 → 가입하기 사이에 "이 번호는 방금 인증됐다"를 증명하는 데 쓴다.
 * 서버 서명이라 클라이언트가 위조할 수 없고, 10분 뒤 자동으로 만료된다.
 * DB에 별도 상태를 두지 않으므로 인증 단계와 가입 단계가 서로 얽히지 않는다.
 */

const TTL_MS = 10 * 60 * 1000;

function secret(): Buffer {
  return crypto
    .createHash("sha256")
    .update(process.env.APP_HASH_PEPPER || "bonjour-dev-hash-pepper")
    .digest();
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", secret()).update(payload).digest("hex");
}

export function issueVerifiedToken(phoneHash: string): string {
  const exp = Date.now() + TTL_MS;
  const payload = `${phoneHash}.${exp}`;
  return `${payload}.${sign(payload)}`;
}

/** 토큰이 이 번호에 대해 유효한지 확인 */
export function checkVerifiedToken(token: string, phoneHash: string): boolean {
  try {
    const [hash, expStr, mac] = (token || "").split(".");
    if (hash !== phoneHash) return false;
    if (Number(expStr) < Date.now()) return false;
    const expected = sign(`${hash}.${expStr}`);
    return crypto.timingSafeEqual(
      Buffer.from(expected, "hex"),
      Buffer.from(mac, "hex")
    );
  } catch {
    return false;
  }
}
