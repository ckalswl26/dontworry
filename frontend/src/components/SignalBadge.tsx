import type { Lang, SignalStatus } from "@/lib/types";
import { t } from "@/lib/i18n";

const STYLES: Record<SignalStatus, string> = {
  GREEN: "bg-green-100 text-green-700",
  AMBER: "bg-amber-100 text-amber-700",
  RED: "bg-red-100 text-brand-red",
  "N/A": "bg-gray-100 text-gray-500",
};

const DOTS: Record<SignalStatus, string> = {
  GREEN: "bg-green-500",
  AMBER: "bg-amber-500",
  RED: "bg-brand-red",
  "N/A": "bg-gray-400",
};

const LABEL_KEY: Record<SignalStatus, string> = {
  GREEN: "signalGreen",
  AMBER: "signalAmber",
  RED: "signalRed",
  "N/A": "signalNA",
};

export function SignalBadge({ signal, lang }: { signal: SignalStatus; lang: Lang }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${STYLES[signal]}`}>
      <span className={`h-2 w-2 rounded-full ${DOTS[signal]}`} />
      {t(lang, LABEL_KEY[signal])}
    </span>
  );
}

export function SignalDot({ signal }: { signal: SignalStatus }) {
  return <span className={`inline-block h-2.5 w-2.5 rounded-full ${DOTS[signal]}`} />;
}

// 만기-체류기간 적합성 배지. SignalBadge와 같은 색상/점 스타일을 그대로 쓰되,
// "만기" 맥락의 라벨을 쓴다(SignalBadge의 방문신호 라벨과는 의미가 다르다).
const TERM_FIT_LABEL: Record<"GREEN" | "AMBER" | "RED", string> = {
  GREEN: "만기 여유 있음",
  AMBER: "만기 임박",
  RED: "만기 출국 이후",
};

export function TermFitBadge({ termFit }: { termFit: "GREEN" | "AMBER" | "RED" }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${STYLES[termFit]}`}>
      <span className={`h-2 w-2 rounded-full ${DOTS[termFit]}`} />
      {TERM_FIT_LABEL[termFit]}
    </span>
  );
}
