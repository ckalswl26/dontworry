"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BackHeader } from "@/components/Card";
import { Mascot } from "@/components/Logo";
import { useStore } from "@/lib/store";
import { t } from "@/lib/i18n";

export default function ChatPage() {
  const router = useRouter();
  const { state, setLastQuestion } = useStore();
  const [question, setQuestion] = useState("");
  const lang = state.profile.language;

  const featureRoutes = [
    { route: "/planner", words: ["플래너", "자산 계획", "저축 계획", "planner", "savings plan", "kế hoạch", "lập kế hoạch", "规划", "计划", "পরিকল্পনা"] },
    { route: "/fx", words: ["환율", "환전", "exchange rate", "currency", "tỷ giá", "đổi tiền", "汇率", "换汇", "বিনিময় হার"] },
    { route: "/dday", words: ["d-day", "디데이", "출국 일정", "departure schedule", "ngày xuất cảnh", "出境日期", "প্রস্থানের তারিখ"] },
    { route: "/finance", words: ["금융 상품", "적금", "예금", "financial product", "deposit", "sản phẩm tài chính", "金融产品", "আর্থিক পণ্য"] },
    { route: "/wage-check", words: ["최저임금", "월급", "minimum wage", "salary", "lương tối thiểu", "最低工资", "ন্যূনতম মজুরি"] },
  ];

  const submit = () => {
    const value = question.trim();
    if (!value) return;
    const normalized = value.toLocaleLowerCase();
    const feature = featureRoutes.find((item) => item.words.some((word) => normalized.includes(word.toLocaleLowerCase())));
    if (feature) {
      router.push(feature.route);
      return;
    }
    setLastQuestion(value);
    router.push("/intent");
  };

  return (
    <div className="flex min-h-dvh flex-col bg-gradient-to-b from-brand-sky/45 to-white">
      <BackHeader title={t(lang, "aiChatbotTitle")} onBack={() => router.back()} />
      <main className="flex flex-1 flex-col px-5 pb-8 pt-10">
        <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-full bg-white shadow-[0_14px_36px_rgba(17,28,78,0.12)]">
          <Mascot size={104} className="h-[104px] w-[104px] object-contain" />
        </div>
        <div className="mt-6 text-center">
          <h1 className="text-xl font-black text-brand-navy">{t(lang, "aiChatbotTitle")}</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">{t(lang, "aiChatbotPlaceholder")}</p>
        </div>

        <div className="mt-auto rounded-2xl border border-brand-blue/15 bg-white p-3 shadow-[0_12px_32px_rgba(17,28,78,0.1)]">
          <textarea
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                submit();
              }
            }}
            rows={3}
            autoFocus
            placeholder={t(lang, "aiChatbotPlaceholder")}
            className="w-full resize-none bg-transparent px-2 py-2 text-sm leading-6 text-brand-navy outline-none placeholder:text-slate-400"
          />
          <button
            type="button"
            onClick={submit}
            disabled={!question.trim()}
            className="mt-2 w-full rounded-xl bg-brand-blue py-3 text-sm font-bold text-white shadow-sm transition disabled:cursor-not-allowed disabled:bg-slate-200"
          >
            {t(lang, "confirmQuestion")}
          </button>
        </div>
      </main>
    </div>
  );
}
