"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { LogoWordmark, Mascot } from "@/components/Logo";
import { PrimaryButton } from "@/components/Card";
import { Dropdown } from "@/components/Dropdown";
import { t } from "@/lib/i18n";
import { LANGS } from "@/lib/languages";
import { AUTO_TRANSLATED_LANGS, type Lang } from "@/lib/types";

const SPLASH_TITLE: Record<Lang, string> = {
  ko: "한국 생활의 금융 고민,\n돈워리가 함께 해결해요",
  en: "Money worries in Korea,\nDon't Worry solves them with you",
  vi: "Nỗi lo tài chính khi ở Hàn Quốc,\nDon't Worry cùng bạn giải quyết",
  km: "កូរ៉េនៅរស់នៅដោះស្រាយបញ្ហាហិរញ្ញវត្ថុ,\nDon't Worry នឹងជួយអ្នក",
  id: "Kekhawatiran keuangan di Korea,\nDon't Worry menyelesaikannya bersama Anda",
  lo: "ຄວາມກັງວົນທາງການເງິນໃນເກົາຫຼີ,\nDon't Worry ຊ່ວຍແກ້ໄຂພ້ອມທ່ານ",
  my: "ကိုရီးယားမှာနေထိုင်စဉ် ငွေကြေးစိုးရိမ်မှုများ,\nDon't Worry နှင့်အတူဖြေရှင်းပါ",
  bn: "কোরিয়ায় জীবনযাত্রার আর্থিক দুশ্চিন্তা,\nDon't Worry আপনার সাথে সমাধান করবে",
  ne: "कोरियामा जीवनको आर्थिक चिन्ता,\nDon't Worry ले तपाईंसँगै समाधान गर्छ",
  ur: "کوریا میں زندگی کی مالی پریشانیاں,\nDon't Worry آپ کے ساتھ حل کرے گا",
  si: "කොරියාවේ ජීවිතයේ මූල්‍ය කනස්සල්ල,\nDon't Worry ඔබ සමඟ විසඳයි",
  ky: "Кореяда жашоонун каржылык тынчсыздануулары,\nDon't Worry сиз менен чечет",
  tg: "Нигаронии молиявии зиндагӣ дар Корея,\nDon't Worry онро якҷоя бо шумо ҳал мекунад",
  uz: "Koreyada hayotning moliyaviy tashvishlari,\nDon't Worry siz bilan birga hal qiladi",
  zh: "在韩生活的财务烦恼,\nDon't Worry与您一起解决",
  mn: "Солонгост амьдрах үеийн санхүүгийн санаа зовнил,\nDon't Worry тантай хамт шийднэ",
};

const SPLASH_TAGLINE: Record<Lang, string> = {
  ko: "외국인 근로자를 위한 금융 서비스",
  en: "A financial service for foreign workers",
  vi: "Dịch vụ tài chính dành cho lao động nước ngoài",
  km: "សេវាហិរញ្ញវត្ថុសម្រាប់កម្មករបរទេស",
  id: "Layanan keuangan untuk pekerja asing",
  lo: "ບໍລິການທາງການເງິນສຳລັບແຮງງານຕ່າງປະເທດ",
  my: "နိုင်ငံခြားသားလုပ်သားများအတွက် ငွေကြေးဝန်ဆောင်မှု",
  bn: "বিদেশি শ্রমিকদের জন্য আর্থিক সেবা",
  ne: "विदेशी कामदारहरूका लागि वित्तीय सेवा",
  ur: "غیر ملکی کارکنوں کے لیے مالیاتی خدمت",
  si: "විදේශීය සේවකයින් සඳහා මූල්‍ය සේවාවක්",
  ky: "Чет элдик жумушчулар үчүн каржылык кызмат",
  tg: "Хидмати молиявӣ барои коргарони хориҷӣ",
  uz: "Xorijiy ishchilar uchun moliyaviy xizmat",
  zh: "为外国劳动者提供的金融服务",
  mn: "Гадаад ажилчдад зориулсан санхүүгийн үйлчилгээ",
};

export default function SplashPage() {
  const router = useRouter();
  const { state, setLang } = useStore();
  const [ready, setReady] = useState(false);
  const [selected, setSelected] = useState<Lang>(state.profile.language);

  useEffect(() => setReady(true), []);

  useEffect(() => {
    if (ready && state.onboarded) {
      router.replace("/home");
    }
  }, [ready, state.onboarded, router]);

  const isAutoTranslated = AUTO_TRANSLATED_LANGS.includes(selected);

  return (
    <main className="splash-main relative flex min-h-dvh flex-col overflow-x-hidden overflow-y-auto px-6 py-5 text-center">
      <div className="absolute -right-24 -top-28 h-72 w-72 rounded-full bg-brand-sky" />
      <div className="relative flex shrink-0 flex-col items-center gap-1">
        <LogoWordmark height={32} />
        <p className="text-xs font-semibold text-slate-500">{SPLASH_TAGLINE[selected]}</p>
        <div className="relative flex h-[245px] w-full items-center justify-center">
          <Mascot
            size={208}
            className="mascot-float relative z-[1] h-[min(24vh,190px)] w-[min(24vh,190px)] object-contain drop-shadow-[0_18px_24px_rgba(17,28,78,0.22)]"
          />
          <span aria-hidden="true" className="mascot-shadow absolute bottom-3 h-4 w-28 rounded-full bg-brand-navy/15 blur-md" />
        </div>
        <h1 className={`whitespace-pre-line font-black tracking-[-0.05em] text-brand-navy ${selected === "ko" ? "text-[22px] leading-[1.3]" : selected === "en" ? "text-[19px] leading-[1.25]" : "text-[18px] leading-[1.25]"}`}>
          {SPLASH_TITLE[selected]}
        </h1>
      </div>

      <div className="relative mt-auto w-full shrink-0 pb-6 pt-8">
        <p className="mb-2 text-left text-sm font-bold text-brand-navy">
          {t(selected, "langSelect")} <span className="font-normal text-slate-400">Select language</span>
        </p>
        <Dropdown
          value={selected}
          onChange={(code) => setSelected(code as Lang)}
          options={LANGS.map((l) => ({ value: l.code, label: `${l.greeting} · ${l.label}` }))}
          placement="up"
        />
        {isAutoTranslated && (
          <p className="mt-1.5 text-left text-[11px] text-amber-600">
            ⚠ 자동번역 - 오류가 있을 수 있어요 / Auto-translated - may contain errors
          </p>
        )}
        <div className="mt-3">
          <PrimaryButton onClick={() => { setLang(selected); router.push("/onboarding"); }}>
            {t(selected, "start")}
          </PrimaryButton>
        </div>
      </div>
    </main>
  );
}
