import { t } from "@/lib/i18n";
import type { Lang } from "@/lib/types";

export type InstitutionType = "BANK" | "EMPLOYMENT_CENTER" | "IMMIGRATION" | "PENSION" | "WELFARE";

export const INSTITUTION_TYPES: { value: InstitutionType; labelKey: string }[] = [
  { value: "BANK", labelKey: "institutionBank" },
  { value: "EMPLOYMENT_CENTER", labelKey: "institutionEmploymentCenter" },
  { value: "IMMIGRATION", labelKey: "institutionImmigration" },
  { value: "PENSION", labelKey: "institutionPension" },
  { value: "WELFARE", labelKey: "institutionWelfare" },
];

// TaskSignal.responsible_org는 Rule Graph의 자유 텍스트("한국산업인력공단 / 고용센터" 등)라
// 정확히 5개 기관 유형과 일치하지 않는다. 우선순위대로 부분 일치를 확인해 매핑한다.
const ORG_TEXT_PRIORITY: [string, InstitutionType][] = [
  ["은행", "BANK"],
  ["고용센터", "EMPLOYMENT_CENTER"],
  ["출입국", "IMMIGRATION"],
  ["국민연금", "PENSION"],
  ["근로복지공단", "WELFARE"],
];

export function inferInstitutionType(responsibleOrg: string | null | undefined): InstitutionType | null {
  if (!responsibleOrg) return null;
  for (const [needle, type] of ORG_TEXT_PRIORITY) {
    if (responsibleOrg.includes(needle)) return type;
  }
  return null;
}

export function institutionLabel(lang: Lang, type: InstitutionType | ""): string {
  const key = INSTITUTION_TYPES.find((i) => i.value === type)?.labelKey;
  return t(lang, key ?? "institutionFallback");
}
