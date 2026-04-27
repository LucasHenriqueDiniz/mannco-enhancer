import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();

const base = {
  tab: {
    general: { en: "General", pt_BR: "Geral", es: "General", ru: "Общие" },
    giveaways: { en: "Giveaways", pt_BR: "Sorteios", es: "Sorteos", ru: "Подарки" },
    item: { en: "Items", pt_BR: "Itens", es: "Artículos", ru: "Предметы" },
    inventory: { en: "Inventory", pt_BR: "Inventario", es: "Inventario", ru: "Инвентарь" },
    profile: { en: "Profile", pt_BR: "Perfil", es: "Perfil", ru: "Профиль" },
    auctions: { en: "Auctions", pt_BR: "Leilões", es: "Subastas", ru: "Аукционы" }
  }
};

function upsert(obj, key, value) {
  obj[key] = value;
}

async function loadJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

function buildNormalized(locale, current) {
  const out = {};

  // keep all existing first
  Object.keys(current).sort().forEach((k) => {
    out[k] = current[k];
  });

  // enforce corrected values for core tabs
  for (const [k, values] of Object.entries(base.tab)) {
    upsert(out, `tab.${k}`, values[locale]);
  }

  // normalize group names used in item tab
  const groups = {
    "group.General": { en: "General", pt_BR: "Geral", es: "General", ru: "Общие" },
    "group.pageVisibility": { en: "Page visibility", pt_BR: "Visibilidade da página", es: "Visibilidad de página", ru: "Видимость страницы" },
    "group.buyOrderSafety": { en: "Buy-order safety", pt_BR: "Segurança de buy-order", es: "Seguridad de buy-order", ru: "Безопасность buy-order" },
    "group.itemsListActions": { en: "Items list actions", pt_BR: "Ações da lista de itens", es: "Acciones de lista de artículos", ru: "Действия списка предметов" },
    "group.itemsListColumns": { en: "Items list columns", pt_BR: "Colunas da lista de itens", es: "Columnas de lista de artículos", ru: "Колонки списка предметов" },
    "group.priceReferences": { en: "Price references", pt_BR: "Referências de preço", es: "Referencias de precio", ru: "Справочные цены" }
  };

  for (const [k, values] of Object.entries(groups)) {
    upsert(out, k, values[locale]);
  }

  // canonical toggle keys from options-config (ensures options translate)
  const canonicalMap = {
    enabled: "globalEnabled",
    hideGlobalAlert: "globalHideGlobalAlert",
    inventoryQuickUpdateIgnoreDiscountWarning: "inventoryQuickUpdateIgnoreWarning",
    inventoryQuickUpdateAutoConfirmTotalItems: "inventoryQuickUpdateAutoAdd",
    itemAutoFillBuyOrderPrice: "itemAutoFillBuyOrder",
    itemWarnNegativeFlipOnSubmit: "itemWarnNegativeFlip",
    itemPreventNegativeInputs: "itemPreventNegatives",
    itemHideItemsListMakeOfferButton: "itemHideMakeOffer",
    itemHideItemsListInspectButton: "itemHideInspect",
    itemHideItemsListViewOnSteamButton: "itemHideViewOnSteam",
    itemHideItemsListSteamCollectorButton: "itemHideSteamcollector",
    itemHideItemsListInspectInGameButton: "itemHideInspectInGame",
    itemItemsListColumnSpell: "itemColumnSpell",
    itemItemsListColumnSheen: "itemColumnSheen",
    itemItemsListColumnKillstreaker: "itemColumnKillstreaker",
    itemItemsListColumnFloat: "itemColumnFloat",
    itemItemsListColumnStickers: "itemColumnStickers",
    itemItemsListColumnPart: "itemColumnPart",
    itemShowItemsListAttributes: "itemShowAttributes",
    itemEnableItemsListSearch: "itemEnableSearch",
    itemWarnExorcismDiscount: "itemWarnExorcism"
  };

  for (const [canonical, legacy] of Object.entries(canonicalMap)) {
    const lk = `toggle.${legacy}`;
    const dk = `toggle.${legacy}.desc`;
    const cLK = `toggle.${canonical}`;
    const cDK = `toggle.${canonical}.desc`;
    if (out[lk] && !out[cLK]) out[cLK] = out[lk];
    if (out[dk] && !out[cDK]) out[cDK] = out[dk];
  }

  // keep sort deterministic
  return Object.fromEntries(Object.entries(out).sort(([a], [b]) => a.localeCompare(b)));
}

async function main() {
  const locales = ["en", "pt_BR", "es", "ru"];
  for (const locale of locales) {
    const filePath = resolve(root, "locales", `${locale}.json`);
    const current = await loadJson(filePath);
    const normalized = buildNormalized(locale, current);
    await writeFile(filePath, `${JSON.stringify(normalized, null, 2)}\n`, "utf8");
    console.log(`rebuilt ${locale}.json`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
