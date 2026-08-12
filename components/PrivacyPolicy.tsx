"use client";

/**
 * 동의 전문 (개인정보 / 민감정보 / 위치정보)
 *
 * 법령상 각각 별도 동의가 필요해 문서를 셋으로 나눴다.
 *  - 개인정보 수집·이용   : 개인정보보호법 제15조 (필수)
 *  - 민감정보(건강정보) 처리 : 개인정보보호법 제23조 — 일반 개인정보와 '별도' 동의 (필수)
 *  - 위치정보 이용         : 위치정보법 제19조 (선택)
 *
 * 쓰는 방법
 *  - <ConsentSheet doc="privacy" />   : 회원가입에서 '전문 보기'로 띄우는 전체화면 시트
 *  - <PrivacyPolicyContent />         : 세 문서를 모두 담은 본문. /privacy 페이지에서 사용
 *
 * 회원가입에서 라우트를 옮기지 않고 시트로 띄우는 이유는, 페이지를 이동하면
 * 입력해 둔 값과 휴대폰 인증 상태가 전부 날아가기 때문이다.
 */

const UPDATED_AT = "2026년 8월 6일";
const CONTACT = "1102minseo@gmail.com";

export type ConsentDoc = "privacy" | "sensitive" | "location";

export const DOC_TITLE: Record<ConsentDoc, string> = {
  privacy: "개인정보 수집·이용 동의",
  sensitive: "민감정보(건강정보) 처리 동의",
  location: "위치정보 이용 동의",
};

/* ─────────────────────────── ① 개인정보 수집·이용 ─────────────────────────── */

export function PersonalInfoConsent() {
  return (
    <>
      <p>
        본주르는 회원 식별과 서비스 제공을 위해 아래와 같이 개인정보를
        수집·이용합니다. 서비스에 꼭 필요한 항목만 받습니다.
      </p>

      <Section n="1" title="수집하는 항목">
        <Table
          rows={[
            ["필수", "이름, 휴대폰번호, 생년월일, 성별, 주소(지역)"],
            ["자동 수집", "접속 일시, 접속 기록(개인정보 취급 이력 확인용)"],
          ]}
        />
        <Note>
          주민등록번호 등 고유식별정보는 일절 수집하지 않습니다.
        </Note>
      </Section>

      <Section n="2" title="이용 목적">
        <Bullets
          items={[
            "회원 식별 및 본인 확인(휴대폰 인증)",
            "거주 지역 기준 보건소·운동 프로그램 안내",
            "부정 가입·부정 이용 방지 및 문의 응대",
          ]}
        />
      </Section>

      <Section n="3" title="보유 및 이용 기간">
        <Bullets
          items={[
            "회원 정보: 회원 탈퇴 시까지. 탈퇴하면 지체 없이 파기합니다.",
            "휴대폰 인증 기록: 발급 후 24시간이 지나면 자동 삭제",
            "접속 기록: 「개인정보의 안전성 확보조치 기준」에 따라 1년간 보관",
            "1년 이상 로그인하지 않으면 별도 안내 후 분리 보관하거나 파기합니다.",
          ]}
        />
      </Section>

      <Section n="4" title="동의를 거부할 권리">
        <p>
          동의를 거부하실 수 있습니다. 다만 위 항목은 회원 식별에 반드시 필요한
          정보라, 동의하지 않으시면 회원가입을 할 수 없습니다.
        </p>
      </Section>
    </>
  );
}

/* ─────────────────────── ② 민감정보(건강정보) 처리 ─────────────────────── */

export function SensitiveInfoConsent() {
  return (
    <>
      <p>
        건강에 관한 정보는 법에서 정한 <b>민감정보</b>에 해당해, 일반
        개인정보와 별도로 동의를 받습니다.
      </p>

      <Section n="1" title="처리하는 민감정보">
        <Table
          rows={[
            [
              "설문 응답",
              "나이, 키, 몸무게, 폐경 연령, 초경 연령, 임신 횟수, 골절 이력, 흡연·음주·운동 습관",
            ],
            [
              "건강검진 수치",
              "체중, 총콜레스테롤, ALP(알칼리성 인산분해효소), 크레아티닌 (선택 입력)",
            ],
            ["분석 결과", "뼈 건강 점수, 위험 등급, 위험·보호 요인 분석 결과"],
          ]}
        />
        <Note>
          검진표 사진은 숫자를 읽어낸 뒤 즉시 폐기하며, 이미지 자체를 보관하지
          않습니다. 건강검진 수치는 선택 항목이라 입력하지 않아도 설문만으로
          결과를 받을 수 있습니다.
        </Note>
      </Section>

      <Section n="2" title="처리 목적">
        <Bullets
          items={[
            "뼈 건강 위험도 예측과 결과 리포트 제공",
            "위험요인에 맞는 운동 추천 및 생활습관 개선 시뮬레이션",
            "과거 리포트와 비교한 변화 확인",
          ]}
        />
        <Note>
          본주르의 결과는 의학적 진단이 아니라 건강관리를 돕는 참고 정보입니다.
        </Note>
      </Section>

      <Section n="3" title="보유 및 이용 기간">
        <p>
          회원 탈퇴 시까지 보관하며, 탈퇴하면 건강정보를 지체 없이 파기합니다.
          이름·연락처가 담긴 정보와 따로 저장하고, 서로를 임의의 식별번호로만
          연결합니다.
        </p>
      </Section>

      <Section n="4" title="동의를 거부할 권리">
        <p>
          동의를 거부하실 수 있습니다. 다만 건강정보 없이는 뼈 건강 예측과 운동
          추천을 제공할 수 없어, 동의하지 않으시면 서비스의 핵심 기능을 이용할 수
          없습니다.
        </p>
      </Section>
    </>
  );
}

/* ─────────────────────────── ③ 위치정보 이용 ─────────────────────────── */

export function LocationConsent() {
  return (
    <>
      <p>
        내 주변 보건소를 찾아드리기 위해 위치정보를 이용합니다. <b>선택 항목</b>
        이라 동의하지 않으셔도 회원가입과 뼈 건강 예측을 모두 이용하실 수
        있습니다.
      </p>

      <Section n="1" title="이용하는 위치정보">
        <Table
          rows={[
            ["항목", "기기에서 확인한 현재 위치 좌표(위도·경도)"],
            ["수집 시점", "회원가입의 '현재 위치' 또는 '내 주변 보건소 찾기'를 누르셨을 때만"],
          ]}
        />
      </Section>

      <Section n="2" title="이용 목적">
        <Bullets
          items={[
            "현재 위치를 주소로 바꾸어 입력란을 채우기",
            "가까운 순서로 보건소·운동 프로그램 안내",
          ]}
        />
      </Section>

      <Section n="3" title="보유 기간">
        <p>
          위치 좌표는 주소 변환과 주변 검색에만 쓰고 <b>저장하지 않습니다.</b>{" "}
          처리 후 즉시 폐기하며, 앱에는 변환된 지역명만 남습니다.
        </p>
      </Section>

      <Section n="4" title="동의 철회와 거부">
        <p>
          동의는 언제든 철회하실 수 있습니다. 기기의 브라우저 설정에서 위치 권한을
          끄시면 즉시 중단됩니다. 동의하지 않으시면 현재 위치 자동 입력만 사용할 수
          없고, 주소를 직접 검색해 넣으시면 보건소 안내는 그대로 받으실 수 있습니다.
        </p>
      </Section>
    </>
  );
}

/* ─────────────────────── 공통 안내 (처리방침 전체에만) ─────────────────────── */

function CommonPolicy() {
  return (
    <>
      <Section n="5" title="제3자 제공">
        <p>
          본주르는 이용자의 개인정보를 제3자에게 제공하지 않습니다. 법령에 따라
          수사기관 등이 적법한 절차로 요구하는 경우에만 예외로 합니다.
        </p>
      </Section>

      <Section n="6" title="처리 위탁">
        <Table
          rows={[
            ["클라우드 인프라", "서비스 운영 및 데이터 보관"],
            ["문자 발송 대행", "휴대폰 인증번호 발송"],
            ["지도·주소 서비스", "현재 위치 기준 보건소 검색"],
          ]}
        />
        <Note>
          위탁받는 업체는 위탁받은 업무 외의 목적으로 개인정보를 이용할 수 없으며,
          위탁 계약 시 안전성 확보조치를 함께 약정합니다.
        </Note>
      </Section>

      <Section n="7" title="안전성 확보조치">
        <Bullets
          items={[
            "이름·휴대폰번호·생년월일은 AES-256 방식으로 암호화해 저장합니다.",
            "비밀번호는 복호화가 불가능한 일방향 해시로만 저장하며, 운영자도 알 수 없습니다.",
            "이름·연락처가 담긴 테이블과 건강정보 테이블을 분리해 보관합니다.",
            "통계 분석용 계정에는 건강정보 읽기 권한만 부여하고 식별정보 접근은 차단합니다.",
            "모든 통신 구간에 TLS 암호화를 적용합니다.",
            "개인정보 취급 이력을 접속 기록으로 남기고 정기적으로 점검합니다.",
          ]}
        />
      </Section>

      <Section n="8" title="이용자의 권리">
        <p>
          이용자는 언제든지 자신의 개인정보를 열람·정정·삭제하거나 처리를 정지해
          달라고 요구할 수 있습니다. 마이페이지에서 직접 확인·수정할 수 있고, 아래
          연락처로 요청하셔도 됩니다. 요청은 지체 없이 처리합니다.
        </p>
      </Section>

      <Section n="9" title="만 14세 미만 아동">
        <p>
          본주르는 만 14세 미만 아동의 개인정보를 수집하지 않으며, 만 14세 미만은
          회원으로 가입할 수 없습니다.
        </p>
      </Section>

      <Section n="10" title="개인정보 보호책임자">
        <Table
          rows={[
            ["책임자", "본주르 개인정보 보호책임자"],
            ["문의", CONTACT],
          ]}
        />
        <Note>
          개인정보 침해로 도움이 필요하시면 개인정보침해신고센터(국번없이 118)나
          개인정보보호위원회(privacy.go.kr)로도 문의하실 수 있습니다.
        </Note>
      </Section>
    </>
  );
}

/* ─────────────────────────── 조립 ─────────────────────────── */

/** 처리방침 전체 — /privacy 페이지용 */
export function PrivacyPolicyContent() {
  return (
    <div className="text-[length:calc(17px*var(--ts))] text-charcoal leading-[1.7]">
      <p className="text-[length:calc(16px*var(--ts))] text-graytext">시행일 {UPDATED_AT}</p>

      <Heading>개인정보 수집·이용</Heading>
      <PersonalInfoConsent />

      <Heading>민감정보(건강정보) 처리</Heading>
      <SensitiveInfoConsent />

      <Heading>위치정보 이용</Heading>
      <LocationConsent />

      <Heading>공통 사항</Heading>
      <CommonPolicy />

      <p className="mt-8 text-[length:calc(16px*var(--ts))] text-graytext">
        이 방침이 바뀌면 시행 7일 전에 앱 안에서 알려드립니다.
      </p>
    </div>
  );
}

/** 회원가입에서 '전문 보기'로 여는 전체화면 시트 */
export function ConsentSheet({
  doc,
  onClose,
  onAgree,
}: {
  doc: ConsentDoc | null;
  onClose: () => void;
  onAgree: (doc: ConsentDoc) => void;
}) {
  if (!doc) return null;

  const Body =
    doc === "privacy"
      ? PersonalInfoConsent
      : doc === "sensitive"
      ? SensitiveInfoConsent
      : LocationConsent;

  return (
    <div className="fixed inset-0 z-50 flex justify-center">
      <div className="relative w-full max-w-frame h-dvh bg-ivory flex flex-col">
        <div className="shrink-0 flex items-center gap-3 pt-safetop pb-3 px-gutter bg-ivory border-b border-borderline">
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
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
          <h2 className="text-[length:calc(21px*var(--ts))] font-bold text-charcoal">
            {DOC_TITLE[doc]}
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto px-gutter py-5">
          <div className="text-[length:calc(17px*var(--ts))] text-charcoal leading-[1.7]">
            <p className="text-[length:calc(16px*var(--ts))] text-graytext">시행일 {UPDATED_AT}</p>
            <div className="mt-4">
              <Body />
            </div>
            <p className="mt-8 text-[length:calc(16px*var(--ts))] text-graytext">
              문의: {CONTACT}
            </p>
          </div>
          <div className="h-4" />
        </div>

        <div className="shrink-0 px-gutter pt-3 pb-8 bg-ivory border-t border-borderline">
          <button
            type="button"
            onClick={() => {
              onAgree(doc);
              onClose();
            }}
            className="btn-primary"
          >
            읽었어요, 동의합니다
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────── 조각 ─────────────────────────── */

function Heading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mt-9 mb-1 pb-2 border-b-2 border-forest text-[length:calc(22px*var(--ts))] font-bold text-forest">
      {children}
    </h2>
  );
}

function Section({
  n,
  title,
  children,
}: {
  n: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-7">
      <h3 className="text-[length:calc(19px*var(--ts))] font-bold text-charcoal">
        <span className="text-forest">{n}.</span> {title}
      </h3>
      <div className="mt-2">{children}</div>
    </section>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-3 text-graytext text-[length:calc(16px*var(--ts))] leading-[1.6]">{children}</p>
  );
}

function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="flex flex-col gap-2">
      {items.map((t) => (
        <li key={t} className="flex gap-2.5">
          <span
            className="mt-[11px] w-[5px] h-[5px] shrink-0 rounded-full bg-forest"
            aria-hidden
          />
          <span className="flex-1">{t}</span>
        </li>
      ))}
    </ul>
  );
}

function Table({ rows }: { rows: [string, string][] }) {
  return (
    <div className="rounded-card border border-borderline overflow-hidden">
      {rows.map(([label, value], i) => (
        <div
          key={label}
          className={`flex ${i === 0 ? "" : "border-t border-borderline"}`}
        >
          <div className="w-[110px] shrink-0 bg-lightgreen px-3 py-2.5 text-[length:calc(16px*var(--ts))] font-bold text-forest">
            {label}
          </div>
          <div className="flex-1 px-3 py-2.5 text-[length:calc(16px*var(--ts))] leading-[1.6]">
            {value}
          </div>
        </div>
      ))}
    </div>
  );
}
