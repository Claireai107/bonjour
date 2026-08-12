import crypto from "crypto";

/**
 * 본주르 암호화 유틸 (서버 전용)
 *
 * 기획서 「데이터 수집 방식 / 암호화 적용 방식」 대응
 *  - 생년월일·휴대폰 등 식별정보 : AES-256-GCM 컬럼 단위 암호화
 *  - 비밀번호 / 인증번호        : Salt 기반 일방향 해시 (scrypt, 복호화 불가)
 *  - 조회용 인덱스              : HMAC-SHA256 결정적 해시 (평문 저장 없이 검색)
 *
 * 키는 코드가 아니라 환경변수(APP_ENCRYPTION_KEY / APP_HASH_PEPPER)에서 읽는다.
 * 운영에서는 이 값을 DB와 분리된 시크릿 저장소(KMS·Vercel 환경변수)에 둔다.
 */

function keyFrom(envName: string, fallback: string): Buffer {
  const raw = process.env[envName] || fallback;
  // 어떤 길이의 문자열이든 32바이트 키로 정규화
  return crypto.createHash("sha256").update(raw).digest();
}

const ENC_KEY = () => keyFrom("APP_ENCRYPTION_KEY", "bonjour-dev-encryption-key");
const PEPPER = () => keyFrom("APP_HASH_PEPPER", "bonjour-dev-hash-pepper");

/** AES-256-GCM 암호화 → "iv.tag.ciphertext" (base64) */
export function encrypt(plain: string): string {
  if (!plain) return "";
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", ENC_KEY(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), enc]
    .map((b) => b.toString("base64"))
    .join(".");
}

/** AES-256-GCM 복호화. 위변조 시 null */
export function decrypt(payload: string): string | null {
  if (!payload) return null;
  try {
    const [ivB64, tagB64, dataB64] = payload.split(".");
    const decipher = crypto.createDecipheriv(
      "aes-256-gcm",
      ENC_KEY(),
      Buffer.from(ivB64, "base64")
    );
    decipher.setAuthTag(Buffer.from(tagB64, "base64"));
    return Buffer.concat([
      decipher.update(Buffer.from(dataB64, "base64")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    return null;
  }
}

/**
 * 검색용 결정적 해시(HMAC-SHA256).
 * 휴대폰번호 평문을 저장하지 않으면서 "이 번호로 가입한 사람" 조회를 가능하게 한다.
 */
export function blindIndex(value: string): string {
  return crypto
    .createHmac("sha256", PEPPER())
    .update(normalizePhone(value))
    .digest("hex");
}

/** 결정적 HMAC — 세션 토큰처럼 "원문 저장 없이 조회"가 필요한 값에 쓴다 */
export function hmac(value: string): string {
  return crypto.createHmac("sha256", PEPPER()).update(value).digest("hex");
}

/** Salt 기반 일방향 해시 (scrypt) → "scrypt$salt$hash". 복호화 불가 */
export function hashSecret(secret: string): string {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(secret, salt, 32);
  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
}

/** 해시 검증 — 타이밍 공격 방지를 위해 상수 시간 비교 */
export function verifySecret(secret: string, stored: string): boolean {
  try {
    const [algo, saltHex, hashHex] = stored.split("$");
    if (algo !== "scrypt") return false;
    const expected = Buffer.from(hashHex, "hex");
    const actual = crypto.scryptSync(
      secret,
      Buffer.from(saltHex, "hex"),
      expected.length
    );
    return crypto.timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

/** 6자리 인증번호 생성 (암호학적 난수) */
export function generateCode(): string {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
}

/** 010-1234-5678 · 010 1234 5678 → 01012345678 */
export function normalizePhone(phone: string): string {
  return (phone || "").replace(/[^0-9]/g, "");
}

/** 감사 로그용 IP 해시 — 접속 이력은 남기되 IP 평문은 저장하지 않는다 */
export function hashIp(ip: string): string {
  return crypto
    .createHmac("sha256", PEPPER())
    .update(ip || "unknown")
    .digest("hex")
    .slice(0, 32);
}

/** 세션 토큰 */
export function newToken(): string {
  return crypto.randomBytes(32).toString("hex");
}
