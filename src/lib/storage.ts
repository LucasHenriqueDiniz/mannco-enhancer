import type { Settings } from "./types";

export const DEFAULT_SETTINGS: Settings = {
  enabled: true,
  globalHeaderSummary: true,
  hideHeaderBalance: true,
  hideGlobalAlert: false,
  globalHideBreadcrumbs: false,
  globalBlockTrackers: false,
  homeHideBanner: false,
  homeHideFaq: false,
  inventoryHighlights: true,
  inventoryUndercutToggle: true,
  inventoryQuickUpdate: false,
  inventoryQuickUpdateUseSuggested: true,
  inventoryQuickUpdateAutoPriceMode: "match",
  inventoryQuickUpdateAutoConfirmTotalItems: false,
  inventoryQuickUpdateIgnoreDiscountWarning: false,
  inventoryShowPaintedTag: true,
  profileHelpers: true,
  profileFixXError: false,
  itemHideDetailsTitle: true,
  itemHideBuyOrderHint: true,
  itemHideTf2ShopButton: false,
  itemAutoFillBuyOrderPrice: true,
  itemWarnNegativeFlipOnSubmit: true,
  itemPreventNegativeInputs: true,
  itemBuyOrderTableProfit: true,
  itemHideItemsListMakeOfferButton: false,
  itemHideItemsListInspectButton: false,
  itemHideItemsListViewOnSteamButton: false,
  itemHideItemsListSteamCollectorButton: false,
  itemHideItemsListInspectInGameButton: false,
  itemItemsListColumnSpell: false,
  itemItemsListColumnSheen: false,
  itemItemsListColumnKillstreaker: false,
  itemItemsListColumnFloat: false,
  itemItemsListColumnStickers: false,
  itemItemsListColumnPart: false,
  itemShowItemsListAttributes: true,
  itemEnableItemsListSearch: true,
  itemWarnExorcismDiscount: true,
  itemExternalMarketPrices: false,
  itemChartMode: "keep",
  itemSectionOrder: "buyorders-sales-items",
  itemBuyOrderQuantityRules: "0.05:25,0.10:15,0.50:5,999999:1",
  giveawaysHelpers: true,
  bundlesValueHints: true,
  auctionsValueHints: true,
  language: "auto"
};

export async function getSettings(): Promise<Settings> {
  const data = await chrome.storage.sync.get(DEFAULT_SETTINGS);

  return {
    enabled: Boolean(data.enabled),
    globalHeaderSummary: Boolean(data.globalHeaderSummary),
    hideHeaderBalance: Boolean(data.hideHeaderBalance),
    hideGlobalAlert: Boolean(data.hideGlobalAlert),
    globalHideBreadcrumbs: Boolean(data.globalHideBreadcrumbs),
    globalBlockTrackers: Boolean(data.globalBlockTrackers),
    homeHideBanner: Boolean(data.homeHideBanner),
    homeHideFaq: Boolean(data.homeHideFaq),
    inventoryHighlights: Boolean(data.inventoryHighlights),
    inventoryUndercutToggle: Boolean(data.inventoryUndercutToggle),
    inventoryQuickUpdate: Boolean(data.inventoryQuickUpdate),
    inventoryQuickUpdateUseSuggested: Boolean(data.inventoryQuickUpdateUseSuggested),
    inventoryQuickUpdateAutoPriceMode:
      data.inventoryQuickUpdateAutoPriceMode === "none" ||
      data.inventoryQuickUpdateAutoPriceMode === "match" ||
      data.inventoryQuickUpdateAutoPriceMode === "suggested"
        ? data.inventoryQuickUpdateAutoPriceMode
        : data.inventoryQuickUpdateUseSuggested
          ? "suggested"
          : "match",
    inventoryQuickUpdateAutoConfirmTotalItems: Boolean(data.inventoryQuickUpdateAutoConfirmTotalItems),
    inventoryQuickUpdateIgnoreDiscountWarning: Boolean(data.inventoryQuickUpdateIgnoreDiscountWarning),
    inventoryShowPaintedTag: Boolean(data.inventoryShowPaintedTag),
    profileHelpers: Boolean(data.profileHelpers),
    profileFixXError: Boolean(data.profileFixXError),
    itemHideDetailsTitle: Boolean(data.itemHideDetailsTitle),
    itemHideBuyOrderHint: Boolean(data.itemHideBuyOrderHint),
    itemHideTf2ShopButton: Boolean(data.itemHideTf2ShopButton),
    itemAutoFillBuyOrderPrice: Boolean(data.itemAutoFillBuyOrderPrice),
    itemWarnNegativeFlipOnSubmit: Boolean(data.itemWarnNegativeFlipOnSubmit),
    itemPreventNegativeInputs: Boolean(data.itemPreventNegativeInputs),
    itemBuyOrderTableProfit: Boolean(data.itemBuyOrderTableProfit),
    itemHideItemsListMakeOfferButton: Boolean(data.itemHideItemsListMakeOfferButton),
    itemHideItemsListInspectButton: Boolean(data.itemHideItemsListInspectButton),
    itemHideItemsListViewOnSteamButton: Boolean(data.itemHideItemsListViewOnSteamButton),
    itemHideItemsListSteamCollectorButton: Boolean(data.itemHideItemsListSteamCollectorButton),
    itemHideItemsListInspectInGameButton: Boolean(data.itemHideItemsListInspectInGameButton),
    itemItemsListColumnSpell: Boolean(data.itemItemsListColumnSpell),
    itemItemsListColumnSheen: Boolean(data.itemItemsListColumnSheen),
    itemItemsListColumnKillstreaker: Boolean(data.itemItemsListColumnKillstreaker),
    itemItemsListColumnFloat: Boolean(data.itemItemsListColumnFloat),
    itemItemsListColumnStickers: Boolean(data.itemItemsListColumnStickers),
    itemItemsListColumnPart: Boolean(data.itemItemsListColumnPart),
    itemShowItemsListAttributes: Boolean(data.itemShowItemsListAttributes),
    itemEnableItemsListSearch: Boolean(data.itemEnableItemsListSearch),
    itemWarnExorcismDiscount: Boolean(data.itemWarnExorcismDiscount),
    itemExternalMarketPrices: Boolean(data.itemExternalMarketPrices),
    itemChartMode:
      data.itemChartMode === "keep" ||
      data.itemChartMode === "minimize" ||
      data.itemChartMode === "hide" ||
      data.itemChartMode === "afterBuyOrders"
        ? data.itemChartMode
        : "keep",
    itemSectionOrder:
      data.itemSectionOrder === "buyorders-sales-items" ||
      data.itemSectionOrder === "buyorders-items-sales" ||
      data.itemSectionOrder === "sales-buyorders-items" ||
      data.itemSectionOrder === "sales-items-buyorders" ||
      data.itemSectionOrder === "items-buyorders-sales" ||
      data.itemSectionOrder === "items-sales-buyorders"
        ? data.itemSectionOrder
        : "buyorders-sales-items",
    itemBuyOrderQuantityRules: typeof data.itemBuyOrderQuantityRules === "string" ? data.itemBuyOrderQuantityRules : DEFAULT_SETTINGS.itemBuyOrderQuantityRules,
    giveawaysHelpers: Boolean(data.giveawaysHelpers),
    bundlesValueHints: Boolean(data.bundlesValueHints),
    auctionsValueHints: Boolean(data.auctionsValueHints),
    language:
      data.language === "en" ||
      data.language === "pt_BR" ||
      data.language === "es" ||
      data.language === "ru" ||
      data.language === "auto"
        ? data.language
        : "auto"
  };
}

export async function saveSettings(settings: Settings): Promise<void> {
  await chrome.storage.sync.set(settings);
}

export async function resetSettings(): Promise<Settings> {
  await saveSettings(DEFAULT_SETTINGS);
  return DEFAULT_SETTINGS;
}
