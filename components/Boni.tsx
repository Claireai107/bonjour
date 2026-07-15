/* eslint-disable @next/next/no-img-element */
// 마스코트 "본이" — 공식 투명 PNG (public/boni-*.png, design/캐릭터에셋 원본).
// pose 이름은 scripts/prepare_boni_assets.py의 MAP과 1:1 대응.

export type BoniPose =
  | "hello" // 반가운 인사
  | "point" // 확성기 안내·설명
  | "speak" // 앉아서 확성기(음성 모드)
  | "think" // 연구중(분석·인식)
  | "aha" // 아하! (시뮬레이터)
  | "heart" // 하트(관심·즐겨찾기)
  | "praise" // 최고 칭찬(루틴)
  | "face" // 얼굴만(작은 칩·아바타 기본)
  | "dad" // 본이아빠(프로필 아바타)
  | "mom" // 본이엄마(프로필 아바타)
  | "run" // 달리기(우리동네)
  | "lift" // 역기(루틴 운동)
  | "curious"; // 궁금한 표정(검진 촬영)

const LABEL: Record<BoniPose, string> = {
  hello: "인사하는 본이",
  point: "확성기를 든 본이",
  speak: "앉아서 확성기를 든 본이",
  think: "연구하는 본이",
  aha: "아하! 하는 본이",
  heart: "하트를 든 본이",
  praise: "엄지를 든 본이",
  face: "웃는 본이 얼굴",
  dad: "아빠",
  mom: "엄마",
  run: "달리는 본이",
  lift: "역기를 든 본이",
  curious: "궁금한 표정의 본이",
};

// 프로필 아바타 후보 (프로필 추가 화면 선택 순서)
export const AVATARS: readonly BoniPose[] = [
  "face",
  "dad",
  "mom",
  "hello",
  "heart",
  "praise",
];

// 저장된 아바타 값 → 유효한 포즈 (미설정·무효값은 face)
export function avatarPose(v?: string): BoniPose {
  return AVATARS.includes(v as BoniPose) ? (v as BoniPose) : "face";
}

export default function Boni({
  pose = "hello",
  size = 96,
  className,
}: {
  pose?: BoniPose;
  size?: number; // 렌더 높이(px) — 디자인은 높이 기준으로 배치
  className?: string;
}) {
  return (
    <img
      src={`/boni-${pose}.png`}
      alt={`마스코트 본이 (${LABEL[pose]})`}
      style={{ height: size, width: "auto" }}
      className={className}
      draggable={false}
    />
  );
}
