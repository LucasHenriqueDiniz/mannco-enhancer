export type LocaleMap = Record<string, string>;

const LOCALE_CACHE: Record<string, LocaleMap> = {};
const LOCALE_LOADED = new Set<string>();

export function resolveLanguage(lang: string): string {
  if (lang !== "auto") return lang;
  
  const browserLang = navigator.language.toLowerCase();
  if (browserLang.startsWith("pt")) return "pt_BR";
  if (browserLang.startsWith("es")) return "es";
  if (browserLang.startsWith("ru")) return "ru";
  return "en";
}

export async function loadLocale(lang: string): Promise<void> {
  const resolvedLang = resolveLanguage(lang);
  if (LOCALE_LOADED.has(resolvedLang)) return;
  try {
    const url = chrome.runtime.getURL(`locales/${resolvedLang}.json`);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Locale load failed`);
    const data: LocaleMap = await res.json();
    LOCALE_CACHE[resolvedLang] = data;
  } catch {
    LOCALE_CACHE[resolvedLang] = {};
  }
  LOCALE_LOADED.add(resolvedLang);
}

export function t(key: string, lang: string): string {
  const resolvedLang = resolveLanguage(lang);
  const map = LOCALE_CACHE[resolvedLang] ?? {};
  return map[key] ?? key;
}

export function localizeContainer(container: HTMLElement, lang: string): void {
  const resolvedLang = resolveLanguage(lang);
  const keyNodes = Array.from(container.querySelectorAll<HTMLElement>('[data-i18n-key]'));
  for (const node of keyNodes) {
    const key = node.dataset.i18nKey;
    if (key) {
      node.textContent = t(key, resolvedLang);
    }
  }
  
  const placeholderNodes = Array.from(container.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('[data-i18n-placeholder-key]'));
  for (const node of placeholderNodes) {
    const phKey = node.dataset.i18nPlaceholderKey;
    if (phKey) {
      node.placeholder = t(phKey, resolvedLang);
    }
  }
}

export function getCurrentLanguage(): string {
  return resolveLanguage("auto");
}

export async function initI18n(lang: string): Promise<void> {
  await loadLocale(lang);
}