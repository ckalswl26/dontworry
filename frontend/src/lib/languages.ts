import type { Lang } from "@/lib/types";

export const LANGS: { code: Lang; label: string; greeting: string }[] = [
  { code: "ko", label: "한국어", greeting: "안녕하세요" },
  { code: "en", label: "English", greeting: "Welcome" },
  { code: "vi", label: "Tiếng Việt", greeting: "Xin chào" },
  { code: "km", label: "ខ្មែរ", greeting: "សួស្តី" },
  { code: "id", label: "Bahasa Indonesia", greeting: "Halo" },
  { code: "lo", label: "ລາວ", greeting: "ສະບາຍດີ" },
  { code: "my", label: "မြန်မာ", greeting: "မင်္ဂလာပါ" },
  { code: "bn", label: "বাংলা", greeting: "হ্যালো" },
  { code: "ne", label: "नेपाली", greeting: "नमस्ते" },
  { code: "ur", label: "اردو", greeting: "ہیلو" },
  { code: "si", label: "සිංහල", greeting: "ආයුබෝවන්" },
  { code: "ky", label: "Кыргызча", greeting: "Салам" },
  { code: "tg", label: "Тоҷикӣ", greeting: "Салом" },
  { code: "uz", label: "O'zbek", greeting: "Salom" },
  { code: "zh", label: "中文", greeting: "你好" },
  { code: "mn", label: "Монгол", greeting: "Сайн байна уу" },
];
