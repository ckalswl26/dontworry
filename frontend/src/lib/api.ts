const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options?.headers || {}) },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API_ERROR ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  health: () => request<{ status: string }>("/api/health"),
  demoPersona: () => request<import("./types").DemoPersona>("/api/demo/persona"),
  intent: (body: unknown) => request<import("./types").IntentResult>("/api/intent", { method: "POST", body: JSON.stringify(body) }),
  rulesEvaluate: (body: unknown) =>
    request<import("./types").RuleEvaluateResponse>("/api/rules/evaluate", { method: "POST", body: JSON.stringify(body) }),
  departurePlan: (body: unknown) =>
    request<import("./types").DeparturePlanResponse>("/api/departure/plan", { method: "POST", body: JSON.stringify(body) }),
  documentsReadiness: (body: unknown) => request("/api/documents/readiness", { method: "POST", body: JSON.stringify(body) }),
  plannerCalculate: (body: unknown) =>
    request<import("./types").PlannerResponse>("/api/planner/calculate", { method: "POST", body: JSON.stringify(body) }),
  scenario: (body: unknown) => request("/api/scenario", { method: "POST", body: JSON.stringify(body) }),
  briefing: (body: unknown) =>
    request<import("./types").BriefingResponse>("/api/briefing", { method: "POST", body: JSON.stringify(body) }),
  dday: (date: string) => request<import("./types").DDayResponse>(`/api/dday/${date}`),
  financeDeposits: () => request<{ products: import("./types").FinanceProduct[]; error: string | null }>("/api/finance/deposits"),
  financeSavings: () => request<{ products: import("./types").FinanceProduct[]; error: string | null }>("/api/finance/savings"),
  financeWhitelist: () => request<{ products: import("./types").FinanceProduct[] }>("/api/finance/whitelist"),
  productsRecommend: (body: import("./types").UserFinanceProfile) =>
    request<import("./types").ProductRecommendationResponse>("/api/products/recommend", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  source: (id: string) => request(`/api/sources/${id}`),
  multilingualBranches: () =>
    request<{ branches: import("./types").MultilingualBranch[] }>("/api/locations/multilingual-branches"),
  fxRates: () => request<import("./types").FxRatesResponse>("/api/fx/rates"),
  fxHistory: (currency: string, range: string) =>
    request<import("./types").FxHistoryResponse>(
      `/api/fx/history?currency=${encodeURIComponent(currency)}&range=${encodeURIComponent(range)}`
    ),
  bankList: () => request<{ banks: string[] }>("/api/locations/bank-list"),
  nearbyBanks: (lat: number, lng: number) =>
    request<import("./types").BranchSearchResponse>(`/api/locations/nearby-banks?lat=${lat}&lng=${lng}`),
  branchSearch: (bank: string, query: string) =>
    request<import("./types").BranchSearchResponse>(
      `/api/locations/branch-search?bank=${encodeURIComponent(bank)}&query=${encodeURIComponent(query)}`
    ),
  pushVapidPublicKey: () => request<{ public_key: string; configured: boolean }>("/api/push/vapid-public-key"),
  pushSubscribe: (body: {
    endpoint: string;
    keys: { p256dh: string; auth: string };
    departure_date: string | null;
    lang: string;
  }) => request("/api/push/subscribe", { method: "POST", body: JSON.stringify(body) }),
  pushUnsubscribe: (endpoint: string) =>
    request("/api/push/unsubscribe", { method: "POST", body: JSON.stringify({ endpoint }) }),
  guides: () => request<import("./types").GuideContent[]>("/api/guides"),
  guide: (id: string) => request<import("./types").GuideContent>(`/api/guides/${id}`),
  minWage: () => request<import("./types").MinWageInfo>("/api/wage/min-wage"),
};
