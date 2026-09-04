"use client";

import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import type { Lang, PlannerRequest, UserProfile } from "./types";

const STORAGE_KEY = "dontworry_session_v1";

export const DEFAULT_PROFILE: UserProfile = {
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
  assetsHidden: boolean;
}

const DEFAULT_STATE: SessionState = {
  onboarded: false,
  profile: DEFAULT_PROFILE,
  planner: DEFAULT_PLANNER,
  documentsHeld: [],
  lastQuestion: "",
  assetsHidden: false,
};

interface StoreContextValue {
  state: SessionState;
  setProfile: (p: Partial<UserProfile>) => void;
  setPlanner: (p: Partial<PlannerRequest>) => void;
  setDocumentsHeld: (docs: string[]) => void;
  setLastQuestion: (q: string) => void;
  setOnboarded: (v: boolean) => void;
  setLang: (l: Lang) => void;
  setAssetsHidden: (v: boolean) => void;
  loadDemo: (profile: UserProfile, planner: PlannerRequest, docs: string[]) => void;
  reset: () => void;
}

const StoreContext = createContext<StoreContextValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SessionState>(DEFAULT_STATE);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) setState({ ...DEFAULT_STATE, ...JSON.parse(raw) });
    } catch {
      // ignore corrupted storage
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
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
      setOnboarded: (v) => setState((s) => ({ ...s, onboarded: v })),
      setLang: (l) => setState((s) => ({ ...s, profile: { ...s.profile, language: l } })),
      setAssetsHidden: (v) => setState((s) => ({ ...s, assetsHidden: v })),
      loadDemo: (profile, planner, docs) =>
        setState((s) => ({ ...s, profile, planner, documentsHeld: docs, onboarded: true })),
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
