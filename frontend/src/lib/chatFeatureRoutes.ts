import { t } from "@/lib/i18n";
import type { Lang } from "@/lib/types";

type Feature = { route: string; keys: string[]; aliases: string[] };

const FEATURES: Feature[] = [
  { route: "/fx", keys: ["menuFxTitle", "menuFxDesc", "fxCalculatorTitle"], aliases: ["환율", "환전", "exchange rate", "currency converter", "tỷ giá", "đổi tiền", "汇率", "换汇", "বিনিময় হার"] },
  { route: "/planner", keys: ["menuPlannerTitle", "menuPlannerDesc", "plannerTitle"], aliases: ["자산 계획", "저축 계획", "asset planner", "savings plan", "kế hoạch tiết kiệm", "资产规划", "储蓄计划", "সঞ্চয় পরিকল্পনা"] },
  {
    route: "/finance",
    keys: ["menuFinanceTitle", "menuFinanceDesc", "relatedProducts", "myRecommendedProducts"],
    aliases: [
      "금융 상품", "상품 추천", "상품을 추천", "추천 상품", "맞는 상품", "예금 추천", "적금 추천", "예금", "적금",
      "recommend a product", "recommend products", "product recommendation", "financial product", "deposit product", "savings product",
      "gợi ý sản phẩm", "đề xuất sản phẩm", "sản phẩm phù hợp", "sản phẩm tài chính",
      "推荐产品", "产品推荐", "适合的产品", "金融产品",
      "পণ্য সুপারিশ", "আর্থিক পণ্য সুপারিশ", "উপযুক্ত পণ্য", "আর্থিক পণ্য",
    ],
  },
  { route: "/settlement-checklist", keys: ["menuSettlementTitle", "menuSettlementDesc"], aliases: ["귀국 정산", "정산 체크", "return settlement", "departure settlement", "quyết toán về nước", "回国结算", "ফেরার হিসাব"] },
  { route: "/wage-slip-check", keys: ["menuWageSlipTitle", "menuWageSlipDesc"], aliases: ["급여명세서", "수당 계산", "payslip", "wage slip", "phiếu lương", "工资单", "বেতন স্লিপ"] },
  { route: "/wage-check", keys: ["minWageCheckTitle", "minWageCheckDesc"], aliases: ["최저임금", "최저시급", "minimum wage", "lương tối thiểu", "最低工资", "ন্যূনতম মজুরি"] },
  { route: "/passport-prep", keys: ["menuPassportPrepTitle", "menuPassportPrepDesc"], aliases: ["계좌개설 준비", "여권 계좌", "account opening", "passport account", "mở tài khoản", "护照开户", "অ্যাকাউন্ট খোলা"] },
  { route: "/dday", keys: ["menuDdayTitle", "menuDdayDesc", "ddayTitle"], aliases: ["디데이", "출국 일정", "departure schedule", "ngày xuất cảnh", "出境日期", "প্রস্থানের তারিখ"] },
  { route: "/tasks", keys: ["menuTasksTitle", "menuTasksDesc", "taskResult"], aliases: ["필요 서류", "업무 확인", "required documents", "documents needed", "giấy tờ cần thiết", "所需材料", "প্রয়োজনীয় কাগজপত্র"] },
  { route: "/briefing", keys: ["menuBriefingTitle", "menuBriefingDesc", "briefingTitle"], aliases: ["재무 브리핑", "우선 할 일", "financial briefing", "what to do first", "tóm tắt tài chính", "财务简报", "আর্থিক সারাংশ"] },
  { route: "/consult-card", keys: ["consultCard", "menuConsultCardDesc"], aliases: ["사전상담 카드", "통역 카드", "consultation card", "interpretation card", "thẻ tư vấn", "咨询卡", "পরামর্শ কার্ড"] },
  { route: "/branches", keys: ["menuBranchesTitle", "menuBranchesDesc", "multilingualBranchesTitle"], aliases: ["은행 지점", "통역 지점", "bank branch", "multilingual branch", "chi nhánh ngân hàng", "银行网点", "ব্যাংক শাখা"] },
  { route: "/guides/wage_claim", keys: ["wageClaimTitle", "wageClaimDesc"], aliases: ["임금체불", "월급 못 받", "unpaid wage", "unpaid salary", "nợ lương", "拖欠工资", "বেতন পাইনি"] },
  { route: "/guides/reentry_special_case", keys: ["reentryTitle", "reentryDesc"], aliases: ["재입국", "다시 한국에서 일", "work in korea again", "reentry korea", "làm việc lại ở hàn quốc", "再次在韩国工作", "আবার কোরিয়ায় কাজ"] },
];

function normalize(value: string): string {
  return value.toLocaleLowerCase().normalize("NFKC").replace(/[\s·,./!?()[\]{}'"_-]+/g, "");
}

export function resolveChatFeature(text: string, lang: Lang): string | null {
  const input = normalize(text);
  if (!input) return null;
  for (const feature of FEATURES) {
    const phrases = [...feature.keys.map((key) => t(lang, key)), ...feature.aliases];
    if (phrases.some((phrase) => {
      const candidate = normalize(phrase);
      return candidate.length >= 3 && input.includes(candidate);
    })) return feature.route;
  }
  return null;
}
