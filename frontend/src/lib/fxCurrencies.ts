import { pickLang3, type Lang } from "@/lib/types";

// EPS 17개국 중 동티모르(USD, 자체 통화 없음)를 제외한 16개 통화.
// 실제로 실시간 환율을 받아오는지 여부는 백엔드 unsupported 목록으로 판단하고,
// 여기서는 목록/라벨만 정의한다 - 숫자는 절대 여기서 만들지 않는다.
export const FX_CURRENCIES: { code: string; ko: string; en: string; vi: string }[] = [
  { code: "VND", ko: "베트남 동", en: "Vietnamese Dong", vi: "Việt Nam Đồng" },
  { code: "PHP", ko: "필리핀 페소", en: "Philippine Peso", vi: "Peso Philippines" },
  { code: "THB", ko: "태국 바트", en: "Thai Baht", vi: "Baht Thái Lan" },
  { code: "IDR", ko: "인도네시아 루피아", en: "Indonesian Rupiah", vi: "Rupiah Indonesia" },
  { code: "BDT", ko: "방글라데시 타카", en: "Bangladeshi Taka", vi: "Taka Bangladesh" },
  { code: "PKR", ko: "파키스탄 루피", en: "Pakistani Rupee", vi: "Rupee Pakistan" },
  { code: "CNY", ko: "중국 위안", en: "Chinese Yuan", vi: "Nhân dân tệ Trung Quốc" },
  { code: "MNT", ko: "몽골 투그릭", en: "Mongolian Tugrik", vi: "Tugrik Mông Cổ" },
  { code: "KHR", ko: "캄보디아 리엘", en: "Cambodian Riel", vi: "Riel Campuchia" },
  { code: "LAK", ko: "라오스 킵", en: "Lao Kip", vi: "Kip Lào" },
  { code: "MMK", ko: "미얀마 짯", en: "Myanmar Kyat", vi: "Kyat Myanmar" },
  { code: "NPR", ko: "네팔 루피", en: "Nepalese Rupee", vi: "Rupee Nepal" },
  { code: "LKR", ko: "스리랑카 루피", en: "Sri Lankan Rupee", vi: "Rupee Sri Lanka" },
  { code: "KGS", ko: "키르기스스탄 솜", en: "Kyrgyzstani Som", vi: "Som Kyrgyzstan" },
  { code: "TJS", ko: "타지키스탄 소모니", en: "Tajikistani Somoni", vi: "Somoni Tajikistan" },
  { code: "UZS", ko: "우즈베키스탄 숨", en: "Uzbekistani Som", vi: "Som Uzbekistan" },
];

export const NATIONALITY_TO_CURRENCY: Record<string, string> = {
  KH: "KHR", ID: "IDR", LA: "LAK", MM: "MMK", PH: "PHP", TH: "THB", TL: "USD",
  VN: "VND", BD: "BDT", NP: "NPR", PK: "PKR", LK: "LKR", KG: "KGS", TJ: "TJS",
  UZ: "UZS", CN: "CNY", MN: "MNT",
};

export function currencyLabel(lang: Lang, code: string): string {
  const entry = FX_CURRENCIES.find((c) => c.code === code);
  return entry ? `${pickLang3(entry, lang)} (${code})` : code;
}

export function formatFxNumber(value: number): string {
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export function defaultCurrencyForNationality(nationality: string): string {
  const mapped = NATIONALITY_TO_CURRENCY[nationality] ?? "VND";
  return mapped === "USD" ? "VND" : mapped;
}
