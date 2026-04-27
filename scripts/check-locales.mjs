import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();

async function parseJson(path) {
  const raw = await readFile(path, "utf8");
  return JSON.parse(raw);
}

async function extractToggleKeys() {
  const optionsRaw = await readFile(resolve(root, "src", "lib", "options-config.ts"), "utf8");
  return [...optionsRaw.matchAll(/key:\s*"([^"]+)"/g)].map((m) => m[1]);
}

async function extractPopupKeys() {
  const popupRaw = await readFile(resolve(root, "popup.html"), "utf8");
  const i18n = [...popupRaw.matchAll(/data-i18n-key="([^"]+)"/g)].map((m) => m[1]);
  const placeholders = [...popupRaw.matchAll(/data-i18n-placeholder-key="([^"]+)"/g)].map((m) => m[1]);
  return [...new Set([...i18n, ...placeholders])];
}

async function main() {
  const toggleKeys = await extractToggleKeys();
  const popupKeys = await extractPopupKeys();
  const base = new Set(popupKeys);

  for (const key of toggleKeys) {
    base.add(`toggle.${key}`);
    base.add(`toggle.${key}.desc`);
  }

  [
    "group.General",
    "noOptions",
    "empty.rules",
    "table.maxPrice",
    "table.quantity",
    "table.actions",
    "alert.invalidPrice",
    "alert.invalidQty",
    "panel.global",
    "panel.home",
    "panel.bundles",
    "panel.giveaways",
    "panel.item",
    "panel.inventory",
    "panel.profile",
    "panel.auctions"
  ].forEach((k) => base.add(k));

  const required = Array.from(base).sort();
  const locales = ["en", "es", "pt_BR", "ru"];
  let hasError = false;

  for (const locale of locales) {
    const obj = await parseJson(resolve(root, "locales", `${locale}.json`));
    const missing = required.filter((k) => !(k in obj));
    if (missing.length > 0) {
      hasError = true;
      console.error(`Locale ${locale} missing ${missing.length} keys:`);
      for (const key of missing) console.error(`  - ${key}`);
    }
  }

  if (hasError) process.exit(1);
  console.log(`Locales OK. Required keys: ${required.length}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
