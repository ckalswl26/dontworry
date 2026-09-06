import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.cwd(), "src");
const i18nPath = path.join(root, "lib", "i18n.ts");
const source = fs.readFileSync(i18nPath, "utf8");
const languages = ["ko", "en", "vi", "km", "id", "lo", "my", "bn", "ne", "ur", "si", "ky", "tg", "uz", "zh", "mn"];

function matchingBrace(text, openIndex) {
  let depth = 0;
  let quote = null;
  let escaped = false;
  for (let i = openIndex; i < text.length; i += 1) {
    const char = text[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'" || char === "`") quote = char;
    else if (char === "{") depth += 1;
    else if (char === "}" && --depth === 0) return i;
  }
  throw new Error("Unmatched brace");
}

const dictionaryStart = source.indexOf("export const dictionaries");
const dictionaryOpen = source.indexOf("{", dictionaryStart);
const dictionaryEnd = matchingBrace(source, dictionaryOpen);
const dictionarySource = source.slice(dictionaryOpen + 1, dictionaryEnd);
const dictionaries = {};

for (const lang of languages) {
  const match = new RegExp(`\\n\\s{2}${lang}:\\s*\\{`).exec(`\n${dictionarySource}`);
  if (!match) throw new Error(`Missing language dictionary: ${lang}`);
  const open = match.index + match[0].lastIndexOf("{") - 1;
  const close = matchingBrace(dictionarySource, open);
  const body = dictionarySource.slice(open + 1, close);
  dictionaries[lang] = new Map(
    [...body.matchAll(/^\s{4}([A-Za-z0-9_]+):\s*(?:"((?:\\.|[^"\\])*)"|'((?:\\.|[^'\\])*)')/gm)]
      .map((item) => [item[1], item[2] ?? item[3] ?? ""]),
  );
}

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(target) : /\.(ts|tsx)$/.test(entry.name) ? [target] : [];
  });
}

const used = new Set();
for (const file of walk(root)) {
  const text = fs.readFileSync(file, "utf8");
  for (const match of text.matchAll(/\bt\(\s*[^,]+,\s*["']([A-Za-z0-9_]+)["']/g)) used.add(match[1]);
  for (const match of text.matchAll(/(?:labelKey|descKey|titleKey):\s*["']([A-Za-z0-9_]+)["']/g)) used.add(match[1]);
}

const rows = languages.map((lang) => {
  const missing = [...used].filter((key) => !dictionaries[lang].has(key) || !dictionaries[lang].get(key)?.trim()).sort();
  return { lang, used: used.size, translated: used.size - missing.length, missing: missing.length, keys: missing };
});

console.log(JSON.stringify({ usedKeys: [...used].sort(), rows }, null, 2));
if (rows.some((row) => row.missing > 0)) process.exitCode = 1;
