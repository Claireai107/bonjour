/**
 * 본주르 데이터 접근 계층 (서버 전용)
 *
 * 기획서 「DB 물리적/논리적 분리」 대응
 *  - users           : 식별정보 (암호화 컬럼)
 *  - health_records  : 건강정보 — users를 UUID로만 참조
 *  - phone_verifications : 인증번호 (해시 저장, 만료·시도 제한)
 *  - audit_logs      : 개인정보 취급 이력
 *
 * 두 가지 모드로 동작한다.
 *  ① SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY 가 있으면 → 실제 Postgres (Supabase REST)
 *  ② 없으면 → 프로세스 메모리 (발표·로컬 시연용, 서버 재시작 시 초기화)
 * 두 경로가 같은 인터페이스를 쓰므로 화면 코드는 어느 쪽인지 알 필요가 없다.
 *
 * 외부 의존성 없음 — fetch만 사용하므로 npm 설치가 필요 없다.
 */

const URL_BASE = process.env.SUPABASE_URL || "";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

export const usingRealDb = Boolean(URL_BASE && SERVICE_KEY);

export type Row = Record<string, any>;

// ─────────────────────────────── Supabase REST ───────────────────────────────

async function rest(
  table: string,
  init: RequestInit & { query?: string } = {}
): Promise<Row[]> {
  const { query = "", ...rest } = init;
  const res = await fetch(`${URL_BASE}/rest/v1/${table}${query}`, {
    ...rest,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(rest.headers || {}),
    },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`DB ${table} ${res.status}: ${await res.text()}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : [];
}

// ─────────────────────────────── 메모리 폴백 ───────────────────────────────

type MemStore = Record<string, Row[]>;
const g = globalThis as any;
const mem: MemStore =
  g.__bonjourMem ||
  (g.__bonjourMem = {
    users: [],
    health_records: [],
    phone_verifications: [],
    audit_logs: [],
    sessions: [],
  });

function uuid(): string {
  return (globalThis.crypto as any).randomUUID();
}

function matches(row: Row, where: Row): boolean {
  return Object.entries(where).every(([k, v]) => row[k] === v);
}

// ─────────────────────────────── 공용 API ───────────────────────────────

/** 조건에 맞는 행을 최신순으로 조회 */
export async function select(
  table: string,
  where: Row,
  limit = 1
): Promise<Row[]> {
  if (usingRealDb) {
    const filters = Object.entries(where)
      .map(([k, v]) => `${k}=eq.${encodeURIComponent(String(v))}`)
      .join("&");
    const q = filters ? `${filters}&` : "";
    return rest(table, {
      method: "GET",
      query: `?${q}order=created_at.desc&limit=${limit}`,
    });
  }
  return (mem[table] || [])
    .filter((r) => matches(r, where))
    .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
    .slice(0, limit);
}

/** 행 삽입 — 생성된 행을 돌려준다 */
export async function insert(table: string, values: Row): Promise<Row> {
  const row = {
    ...values,
    id: values.id ?? uuid(),
    created_at: values.created_at ?? new Date().toISOString(),
  };
  if (usingRealDb) {
    const [created] = await rest(table, {
      method: "POST",
      body: JSON.stringify(row),
    });
    return created ?? row;
  }
  (mem[table] ||= []).push(row);
  return row;
}

/** id로 부분 수정 */
export async function update(
  table: string,
  id: string,
  patch: Row
): Promise<void> {
  if (usingRealDb) {
    await rest(table, {
      method: "PATCH",
      query: `?id=eq.${encodeURIComponent(id)}`,
      body: JSON.stringify(patch),
    });
    return;
  }
  const row = (mem[table] || []).find((r) => r.id === id);
  if (row) Object.assign(row, patch);
}

/** 같은 조건의 행 개수 (일일 발송 한도 계산 등) */
export async function countSince(
  table: string,
  where: Row,
  sinceIso: string
): Promise<number> {
  if (usingRealDb) {
    const filters = Object.entries(where)
      .map(([k, v]) => `${k}=eq.${encodeURIComponent(String(v))}`)
      .join("&");
    const rows = await rest(table, {
      method: "GET",
      query: `?${filters}&created_at=gte.${encodeURIComponent(
        sinceIso
      )}&select=id&limit=1000`,
    });
    return rows.length;
  }
  return (mem[table] || []).filter(
    (r) => matches(r, where) && String(r.created_at) >= sinceIso
  ).length;
}

/**
 * 감사 로그 적재 — 개인정보 취급 이력을 상시 기록한다.
 * 로그 실패가 본 기능을 막지 않도록 절대 throw하지 않는다.
 */
export async function audit(entry: {
  action: string;
  subject_hash?: string;
  ip_hash?: string;
  detail?: string;
}): Promise<void> {
  try {
    await insert("audit_logs", entry);
  } catch (e) {
    console.error("[audit] 적재 실패", e);
  }
}
