export function hintCacheKey(language: string, hint: string): string {
  return `${language}:${hint.trim()}`;
}

export async function resolveLocalizedHint(
  hint: string,
  language: string,
  translate: (text: string, language: string) => Promise<string>,
  cache: Map<string, string>,
): Promise<string> {
  const text = hint.trim();
  if (!text || language === "he") return text;
  const key = hintCacheKey(language, text);
  const hit = cache.get(key);
  if (hit) return hit;
  const translated = ((await translate(text, language)) || "").trim() || text;
  cache.set(key, translated);
  return translated;
}
