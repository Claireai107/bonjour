-- 본주르(BonJour) 스키마
-- Supabase → SQL Editor 에 붙여넣고 실행하면 됩니다.
-- 기획서 「2. 개발 내용 — 데이터 수집 방식 / 암호화 적용 방식」 대응

-- ────────────────────────────────────────────────────────────
-- 1. 식별정보 테이블 (users)
--    휴대폰·이름·생년월일은 평문으로 저장하지 않는다.
--    phone_hash 는 검색용 결정적 해시(HMAC), *_enc 는 AES-256-GCM 암호문.
-- ────────────────────────────────────────────────────────────
create table if not exists public.users (
  id              uuid primary key default gen_random_uuid(),
  phone_hash      text not null unique,          -- HMAC-SHA256 (검색 인덱스)
  phone_enc       text not null,                 -- AES-256-GCM
  name_enc        text not null,                 -- AES-256-GCM
  birth_enc       text,                          -- AES-256-GCM
  password_hash   text not null,                 -- Salt 기반 일방향 해시 (복호화 불가)
  gender          text check (gender in ('F','M')),
  region          text,                          -- 보건소 추천용 (시/군/구 수준)
  consent_at      timestamptz,                   -- 개인정보 수집·이용 동의 시각 (필수)
  consent_sensitive_at timestamptz,              -- 민감정보(건강정보) 처리 동의 시각 (필수, 법 제23조 별도 동의)
  consent_location_at  timestamptz,              -- 위치정보 이용 동의 시각 (선택, 위치정보법 제19조)
  failed_attempts int  not null default 0,       -- 로그인 연속 실패 횟수
  locked_until    timestamptz,                   -- 5회 실패 시 잠금 해제 시각
  created_at      timestamptz not null default now()
);

-- ────────────────────────────────────────────────────────────
-- 2. 건강정보 테이블 (health_records)
--    users 를 UUID 로만 참조한다. 이 테이블에는 식별정보가 일절 없다.
-- ────────────────────────────────────────────────────────────
create table if not exists public.health_records (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.users(id) on delete cascade,
  answers    jsonb not null default '{}'::jsonb,   -- 설문 10문항
  checkup    jsonb not null default '{}'::jsonb,   -- 검진 수치
  result     jsonb,                                -- 예측 결과 (점수·등급·기여도)
  created_at timestamptz not null default now()
);
create index if not exists health_records_user_idx on public.health_records(user_id);

-- ────────────────────────────────────────────────────────────
-- 3. 인증번호 (phone_verifications)
--    코드 자체는 해시로만 저장. 만료·시도횟수·사용여부를 서버가 관리한다.
-- ────────────────────────────────────────────────────────────
create table if not exists public.phone_verifications (
  id         uuid primary key default gen_random_uuid(),
  phone_hash text not null,
  code_hash  text not null,
  expires_at timestamptz not null,       -- 발급 후 3분
  attempts   int  not null default 0,    -- 5회 초과 시 폐기
  consumed   boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists phone_verifications_phone_idx
  on public.phone_verifications(phone_hash, created_at desc);

-- ────────────────────────────────────────────────────────────
-- 4. 감사 로그 (audit_logs)
--    개인정보 취급 이력을 상시 적재. IP 는 해시로만 남긴다.
-- ────────────────────────────────────────────────────────────
create table if not exists public.audit_logs (
  id           uuid primary key default gen_random_uuid(),
  action       text not null,      -- signup / login / login_failed / verify_sent ...
  subject_hash text,               -- 대상자 phone_hash (평문 없음)
  ip_hash      text,
  detail       text,
  created_at   timestamptz not null default now()
);
create index if not exists audit_logs_created_idx on public.audit_logs(created_at desc);

-- ────────────────────────────────────────────────────────────
-- 5. 세션 (sessions)
-- ────────────────────────────────────────────────────────────
create table if not exists public.sessions (
  id         uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  user_id    uuid not null references public.users(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

-- ────────────────────────────────────────────────────────────
-- 6. RLS — 익명 키로는 어떤 테이블도 읽거나 쓸 수 없다.
--    모든 접근은 서버(API Route)의 service_role 키를 통해서만 이뤄진다.
-- ────────────────────────────────────────────────────────────
alter table public.users               enable row level security;
alter table public.health_records      enable row level security;
alter table public.phone_verifications enable row level security;
alter table public.audit_logs          enable row level security;
alter table public.sessions            enable row level security;
-- 정책을 하나도 만들지 않으면 anon/authenticated 는 전면 차단된다(기본 거부).

-- ────────────────────────────────────────────────────────────
-- 7. 최소 권한의 원칙 — 분석용 계정
--    통계 산출용 계정에는 건강정보 '읽기'만 부여하고,
--    식별정보(users) 접근은 원천 차단한다.
-- ────────────────────────────────────────────────────────────
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'bonjour_analyst') then
    create role bonjour_analyst nologin;
  end if;
end $$;

grant usage on schema public to bonjour_analyst;
grant select on public.health_records to bonjour_analyst;
revoke all on public.users               from bonjour_analyst;
revoke all on public.audit_logs          from bonjour_analyst;
revoke all on public.phone_verifications from bonjour_analyst;
revoke all on public.sessions            from bonjour_analyst;

-- ────────────────────────────────────────────────────────────
-- 8. 보관 기간 — 만료된 인증번호는 남겨두지 않는다.
--    (Supabase → Database → Cron 에서 하루 1회 실행 권장)
-- ────────────────────────────────────────────────────────────
create or replace function public.purge_expired_verifications()
returns void language sql as $$
  delete from public.phone_verifications where expires_at < now() - interval '1 day';
$$;
