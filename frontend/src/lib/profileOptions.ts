// 고용허가제(EPS) 협약 16개국 + 협약 논의 대상국 포함 17개국 (2026-01 기준)
export const NATIONALITIES = [
  { code: "KH", ko: "캄보디아", en: "Cambodia", vi: "Campuchia" },
  { code: "ID", ko: "인도네시아", en: "Indonesia", vi: "Indonesia" },
  { code: "LA", ko: "라오스", en: "Laos", vi: "Lào" },
  { code: "MM", ko: "미얀마", en: "Myanmar", vi: "Myanmar" },
  { code: "PH", ko: "필리핀", en: "Philippines", vi: "Philippines" },
  { code: "TH", ko: "태국", en: "Thailand", vi: "Thái Lan" },
  { code: "TL", ko: "동티모르", en: "Timor-Leste", vi: "Đông Timor" },
  { code: "VN", ko: "베트남", en: "Vietnam", vi: "Việt Nam" },
  { code: "BD", ko: "방글라데시", en: "Bangladesh", vi: "Bangladesh" },
  { code: "NP", ko: "네팔", en: "Nepal", vi: "Nepal" },
  { code: "PK", ko: "파키스탄", en: "Pakistan", vi: "Pakistan" },
  { code: "LK", ko: "스리랑카", en: "Sri Lanka", vi: "Sri Lanka" },
  { code: "KG", ko: "키르기스스탄", en: "Kyrgyzstan", vi: "Kyrgyzstan" },
  { code: "TJ", ko: "타지키스탄", en: "Tajikistan", vi: "Tajikistan" },
  { code: "UZ", ko: "우즈베키스탄", en: "Uzbekistan", vi: "Uzbekistan" },
  { code: "CN", ko: "중국", en: "China", vi: "Trung Quốc" },
  { code: "MN", ko: "몽골", en: "Mongolia", vi: "Mông Cổ" },
];

export const VISA_TYPES = ["E-9", "H-2", "E-8_LEGACY_TRAINING_EMPLOYMENT", "E-8_SEASONAL_WORK"];

export const VISA_TYPE_LABELS: Record<string, string> = {
  "E-9": "E-9",
  "H-2": "H-2",
  "E-8_LEGACY_TRAINING_EMPLOYMENT": "E-8 · 연수취업",
  "E-8_SEASONAL_WORK": "E-8 · 계절근로",
};

export const VISIT_TIMES = [
  { code: "weekday_daytime", key: "weekday" },
  { code: "saturday", key: "saturday" },
  { code: "sunday_only", key: "sundayOnly" },
];
