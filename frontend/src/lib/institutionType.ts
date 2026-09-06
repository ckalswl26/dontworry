export type InstitutionType = "BANK" | "EMPLOYMENT_CENTER" | "IMMIGRATION" | "PENSION" | "WELFARE";

export const INSTITUTION_TYPES: { value: InstitutionType; label: string }[] = [
  { value: "BANK", label: "은행" },
  { value: "EMPLOYMENT_CENTER", label: "고용센터" },
  { value: "IMMIGRATION", label: "출입국·외국인청" },
  { value: "PENSION", label: "국민연금공단" },
  { value: "WELFARE", label: "근로복지공단" },
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

export function institutionLabel(type: InstitutionType | ""): string {
  return INSTITUTION_TYPES.find((i) => i.value === type)?.label ?? "기관";
}
