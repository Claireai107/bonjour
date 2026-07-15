"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  SurveyAnswers,
  CheckupInputs,
  PredictionResult,
  ProfileData,
  FavoriteItem,
} from "./types";
import { predict } from "./predict";
import age from "./age";

export type AnswerMode = "hand" | "voice";

/** 빈 프로필 생성 */
function emptyProfile(
  id: string,
  name: string,
  relation: string,
  extra: Partial<ProfileData> = {}
): ProfileData {
  return {
    id,
    name,
    relation,
    region: "순천시",
    answers: {},
    checkup: {},
    result: null,
    simTarget: null,
    favorites: [],
    reports: [],
    ...extra,
  };
}

const FIRST = emptyProfile("me", "", "본인");

interface BonJourState {
  answerMode: AnswerMode;

  // 가족 프로필 (여러 명). activeId 프로필이 모든 화면 데이터의 주인
  profiles: ProfileData[];
  activeId: string;

  // 활성 프로필 미러 (기존 화면들이 그대로 사용) — 항상 activeId 프로필과 동기화됨
  answers: SurveyAnswers;
  checkup: CheckupInputs;
  result: PredictionResult | null;
  simTarget: { weight?: number; strengthDays?: number } | null;
  favorites: FavoriteItem[];
  profile: {
    name: string;
    relation: string;
    gender?: "F" | "M";
    birth?: string;
    region?: string;
    avatar?: string;
  };

  setAnswerMode: (m: AnswerMode) => void;
  setAnswer: <K extends keyof SurveyAnswers>(
    key: K,
    value: SurveyAnswers[K]
  ) => void;
  setCheckup: (c: CheckupInputs) => void;
  runAnalysis: () => PredictionResult;
  setSimTarget: (t: { weight?: number; strengthDays?: number }) => void;

  // 회원가입 / 프로필 정보
  setProfileInfo: (info: Partial<ProfileData>) => void;

  // 관심(하트)
  toggleFavorite: (item: FavoriteItem) => void;
  isFavorite: (id: string) => boolean;

  // 가족 프로필 전환 / 추가
  switchProfile: (id: string) => void;
  addProfile: (name: string, relation: string) => string;
  updateProfile: (id: string, patch: Partial<ProfileData>) => void;
  removeProfile: (id: string) => void;

  reset: () => void; // 활성 프로필의 진단 데이터만 초기화
}

/** 활성 프로필의 필드로 미러(top-level)를 만든다 */
function mirror(p: ProfileData) {
  return {
    answers: p.answers,
    checkup: p.checkup,
    result: p.result,
    simTarget: p.simTarget,
    favorites: p.favorites,
    profile: {
      name: p.name,
      relation: p.relation,
      gender: p.gender,
      birth: p.birth,
      region: p.region,
      avatar: p.avatar,
    },
  };
}

export const useBonJour = create<BonJourState>()(
  persist(
    (set, get) => {
      /** 활성 프로필에 patch를 적용하고, 미러도 함께 갱신 */
      const patchActive = (patch: Partial<ProfileData>) =>
        set((s) => {
          const profiles = s.profiles.map((p) =>
            p.id === s.activeId ? { ...p, ...patch } : p
          );
          const active = profiles.find((p) => p.id === s.activeId)!;
          return { profiles, ...mirror(active) };
        });

      return {
        answerMode: "hand",
        profiles: [FIRST],
        activeId: FIRST.id,
        ...mirror(FIRST),

        setAnswerMode: (m) => set({ answerMode: m }),

        setAnswer: (key, value) =>
          patchActive({ answers: { ...get().answers, [key]: value } }),

        setCheckup: (c) =>
          patchActive({ checkup: { ...get().checkup, ...c } }),

        runAnalysis: () => {
          const { answers: raw, checkup, profiles, activeId } = get();
          // 나이는 프로필 생년월일에서 파생 (설문에 나이 문항 없음)
          const birth = profiles.find((p) => p.id === activeId)?.birth;
          const answers = {
            ...raw,
            age: age.ageFromBirth(birth) ?? raw.age,
          };
          const result = predict(answers, checkup);
          const prev =
            profiles.find((p) => p.id === activeId)?.reports ?? [];
          // 분석 이력 적재 (최근 20개 유지) — 리포트 날짜 드롭다운용
          const reports = [
            ...prev,
            { date: new Date().toISOString(), result },
          ].slice(-20);
          patchActive({ answers, result, reports });
          return result;
        },

        setSimTarget: (t) => patchActive({ simTarget: t }),

        setProfileInfo: (info) => patchActive(info),

        toggleFavorite: (item) => {
          const cur = get().favorites;
          const exists = cur.some((f) => f.id === item.id);
          const favorites = exists
            ? cur.filter((f) => f.id !== item.id)
            : [...cur, item];
          patchActive({ favorites });
        },
        isFavorite: (id) => get().favorites.some((f) => f.id === id),

        switchProfile: (id) =>
          set((s) => {
            const target = s.profiles.find((p) => p.id === id);
            if (!target) return {};
            return { activeId: id, ...mirror(target) };
          }),

        addProfile: (name, relation) => {
          const id = "p" + Date.now().toString(36);
          const np = emptyProfile(id, name, relation);
          set((s) => ({
            profiles: [...s.profiles, np],
            activeId: id,
            ...mirror(np),
          }));
          return id;
        },

        updateProfile: (id, patch) =>
          set((s) => {
            const profiles = s.profiles.map((p) =>
              p.id === id ? { ...p, ...patch } : p
            );
            const active = profiles.find((p) => p.id === s.activeId)!;
            return { profiles, ...mirror(active) };
          }),

        // 본인("me")은 삭제 불가. 활성 사용자를 지우면 본인으로 전환
        removeProfile: (id) =>
          set((s) => {
            if (id === "me") return {};
            const profiles = s.profiles.filter((p) => p.id !== id);
            const activeId = s.activeId === id ? "me" : s.activeId;
            const active = profiles.find((p) => p.id === activeId)!;
            return { profiles, activeId, ...mirror(active) };
          }),

        reset: () =>
          patchActive({
            answers: {},
            checkup: {},
            result: null,
            simTarget: null,
          }),
      };
    },
    {
      name: "bonjour-store",
      storage: createJSONStorage(() =>
        typeof window !== "undefined" ? sessionStorage : (undefined as any)
      ),
    }
  )
);
