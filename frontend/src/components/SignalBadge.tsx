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
