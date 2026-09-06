"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BackHeader } from "@/components/Card";
import { Mascot } from "@/components/Logo";
import { useStore } from "@/lib/store";
import { t } from "@/lib/i18n";
import { isChatGreeting, resolveChatFeature } from "@/lib/chatFeatureRoutes";

export default function ChatPage() {
  const router = useRouter();
  const { state, setLastQuestion } = useStore();
  const [question, setQuestion] = useState("");
  const [botReply, setBotReply] = useState("");
  const lang = state.profile.language;

  const submit = () => {
    const value = question.trim();
    if (!value) return;
    if (isChatGreeting(value)) {
      setBotReply(t(lang, "chatGreetingReply"));
      setQuestion("");
      return;
    }
    const featureRoute = resolveChatFeature(value, lang);
    if (featureRoute) {
      router.push(featureRoute);
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

        {botReply && (
          <div className="mt-6 flex items-start gap-2">
            <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full border-2 border-white bg-brand-sky shadow-sm">
              <Mascot size={36} className="h-full w-full scale-125 object-contain" />
            </div>
            <div role="status" className="rounded-2xl rounded-tl-md bg-white px-4 py-3 text-sm font-semibold text-brand-navy shadow-sm">
              {botReply}
            </div>
          </div>
        )}

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
