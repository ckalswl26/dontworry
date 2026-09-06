"use client";

import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import type { Lang, PlannerRequest, UserProfile } from "./types";

const STORAGE_KEY = "dontworry_session_v1";

export const DEFAULT_PROFILE: UserProfile = {
  name: "",
  nationality: "VN",
  visa_type: "E-9",
  visa_expiry_date: null,
  departure_date: null,
  available_visit_time: [],
  nps_enrolled: null,
  nps_insured_months: null,
  tenure_months: null,
  industry: null,
  language: "ko",
};

export const DEFAULT_PLANNER: PlannerRequest = {
  target_amount: 0,
  current_savings: 0,
  months_left: 1,
  monthly_income: 0,
  expenses: { housing: 0, food: 0, communication: 0, transportation: 0, remittance: 0, other: 0 },
  meals_housing_provided: false,
};

interface SessionState {
  onboarded: boolean;
  profile: UserProfile;
  planner: PlannerRequest;
  documentsHeld: string[];
  lastQuestion: string;
  lastConfirmedIntent: string | null;
  conversationContext: Record<string, string>;
  assetsHidden: boolean;
  consultation: {
    branch: string;
    branchIsSunday: boolean;
    visitDate: string;
    visitTime: string;
    memo: string;
    ready: boolean;
    // F5에서 "상담카드에 담기"로 넘어온 예금/적금 상품 정보 (선택적)
    productName: string;
    productReasonKo: string;
    productEligibilityBadgeKo: string;
    // F15: 방문 기관 유형 ("" = 아직 미선택, 업무에서 자동 추론되기 전)
    institutionType: string;
  };
  // 여권 등 민감정보 - 이 필드는 state.profile과 분리해서 어떤 API 요청 payload에도
  // 절대 섞여 들어가지 않게 한다 (state.profile은 그대로 서버로 전송되는 필드라서).
  passportPrep: {
    englishName: string;
    passportNumber: string;
    passportExpiry: string;
    address: string;
    phone: string;
  };
  // F5에서 사용자가 고른 상품의 만기일 - 서버에 저장하지 않고 로컬에만 보관해
  // 홈 화면 D-Day 옆에 "OO적금 만기 D-45"로 보여준다.
  savingsTracking: {
    productName: string;
    maturityDate: string | null;
  };
}

const DEFAULT_STATE: SessionState = {
  onboarded: false,
  profile: DEFAULT_PROFILE,
  planner: DEFAULT_PLANNER,
  documentsHeld: [],
  lastQuestion: "",
  lastConfirmedIntent: null,
  conversationContext: {},
  assetsHidden: false,
  consultation: {
    branch: "",
    branchIsSunday: false,
    visitDate: "",
    visitTime: "",
    memo: "",
    ready: false,
    productName: "",
    productReasonKo: "",
    productEligibilityBadgeKo: "",
    institutionType: "",
  },
  passportPrep: { englishName: "", passportNumber: "", passportExpiry: "", address: "", phone: "" },
  savingsTracking: { productName: "", maturityDate: null },
};

interface StoreContextValue {
  state: SessionState;
  setProfile: (p: Partial<UserProfile>) => void;
  setPlanner: (p: Partial<PlannerRequest>) => void;
  setDocumentsHeld: (docs: string[]) => void;
  setLastQuestion: (q: string) => void;
  confirmIntent: (intent: string) => void;
  resetConversation: () => void;
  setOnboarded: (v: boolean) => void;
  setLang: (l: Lang) => void;
  setAssetsHidden: (v: boolean) => void;
  setConsultation: (value: Partial<SessionState["consultation"]>) => void;
  setPassportPrep: (value: Partial<SessionState["passportPrep"]>) => void;
  setSavingsTracking: (value: Partial<SessionState["savingsTracking"]>) => void;
  loadDemo: (profile: UserProfile, planner: PlannerRequest, docs: string[]) => void;
  restoreState: (data: Partial<SessionState>) => void;
  reset: () => void;
}

export type { SessionState };

const StoreContext = createContext<StoreContextValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SessionState>(DEFAULT_STATE);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Partial<SessionState>;
        setState({
          ...DEFAULT_STATE,
          ...saved,
          consultation: { ...DEFAULT_STATE.consultation, ...saved.consultation },
          passportPrep: { ...DEFAULT_STATE.passportPrep, ...saved.passportPrep },
          savingsTracking: { ...DEFAULT_STATE.savingsTracking, ...saved.savingsTracking },
        });
      }
    } catch {
      // ignore corrupted storage
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // storage unavailable (private mode etc.) - fail silently, app still works in-memory
    }
  }, [state, hydrated]);

  const value = useMemo<StoreContextValue>(
    () => ({
      state,
      setProfile: (p) => setState((s) => ({ ...s, profile: { ...s.profile, ...p } })),
      setPlanner: (p) => setState((s) => ({ ...s, planner: { ...s.planner, ...p } })),
      setDocumentsHeld: (docs) => setState((s) => ({ ...s, documentsHeld: docs })),
      setLastQuestion: (q) => setState((s) => ({ ...s, lastQuestion: q })),
      confirmIntent: (intent) => setState((s) => ({
        ...s,
        lastConfirmedIntent: intent,
        conversationContext: {
          nationality: s.profile.nationality,
          visa_type: s.profile.visa_type,
          last_intent: intent,
        },
      })),
      resetConversation: () => setState((s) => ({ ...s, lastQuestion: "", lastConfirmedIntent: null, conversationContext: {} })),
      setOnboarded: (v) => setState((s) => ({ ...s, onboarded: v })),
      setLang: (l) => setState((s) => ({ ...s, profile: { ...s.profile, language: l } })),
      setAssetsHidden: (v) => setState((s) => ({ ...s, assetsHidden: v })),
      setConsultation: (consultation) =>
        setState((s) => ({ ...s, consultation: { ...s.consultation, ...consultation } })),
      setPassportPrep: (passportPrep) =>
        setState((s) => ({ ...s, passportPrep: { ...s.passportPrep, ...passportPrep } })),
      setSavingsTracking: (savingsTracking) =>
        setState((s) => ({ ...s, savingsTracking: { ...s.savingsTracking, ...savingsTracking } })),
      loadDemo: (profile, planner, docs) =>
        setState((s) => ({ ...s, profile, planner, documentsHeld: docs, onboarded: true })),
      restoreState: (data) =>
        setState((s) => ({
          ...DEFAULT_STATE,
          ...s,
          ...data,
          consultation: { ...DEFAULT_STATE.consultation, ...data.consultation },
          passportPrep: { ...DEFAULT_STATE.passportPrep, ...data.passportPrep },
          savingsTracking: { ...DEFAULT_STATE.savingsTracking, ...data.savingsTracking },
        })),
      reset: () => setState(DEFAULT_STATE),
    }),
    [state]
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreContextValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}
