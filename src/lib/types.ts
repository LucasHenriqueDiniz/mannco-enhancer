import type { ExternalPriceEntry, ExternalPriceProviderId } from "./external-prices";

export type AppLanguage = "auto" | "en" | "pt_BR" | "es" | "ru";
export type ItemChartMode = "keep" | "minimize" | "hide" | "afterBuyOrders";
export type InventoryQuickAutoPriceMode = "none" | "match" | "suggested";
export type ItemSectionOrder =
  | "buyorders-sales-items"
  | "buyorders-items-sales"
  | "sales-buyorders-items"
  | "sales-items-buyorders"
  | "items-buyorders-sales"
  | "items-sales-buyorders";

export type Settings = {
  enabled: boolean;
  globalHeaderSummary: boolean;
  hideHeaderBalance: boolean;
  hideGlobalAlert: boolean;
  globalHideBreadcrumbs: boolean;
  globalBlockTrackers: boolean;
  homeHideBanner: boolean;
  homeHideFaq: boolean;
  inventoryHighlights: boolean;
  inventoryUndercutToggle: boolean;
  inventoryQuickUpdate: boolean;
  inventoryQuickUpdateUseSuggested: boolean;
  inventoryQuickUpdateAutoPriceMode: InventoryQuickAutoPriceMode;
  inventoryQuickUpdateAutoConfirmTotalItems: boolean;
  inventoryQuickUpdateIgnoreDiscountWarning: boolean;
  inventoryShowPaintedTag: boolean;
  profileHelpers: boolean;
  profileFixXError: boolean;
  profileExportTransactions: boolean;
  profileExportCashouts: boolean;
  profileExportBuyOrders: boolean;
  profileRemoveAllBuyOrders: boolean;
  profileImproveDeleteHitbox: boolean;
  itemHideDetailsTitle: boolean;
  itemHideBuyOrderHint: boolean;
  itemHideTf2ShopButton: boolean;
  itemAutoFillBuyOrderPrice: boolean;
  itemWarnNegativeFlipOnSubmit: boolean;
  itemPreventNegativeInputs: boolean;
  itemBuyOrderTableProfit: boolean;
  itemHideItemsListMakeOfferButton: boolean;
  itemHideItemsListInspectButton: boolean;
  itemHideItemsListViewOnSteamButton: boolean;
  itemHideItemsListSteamCollectorButton: boolean;
  itemHideItemsListInspectInGameButton: boolean;
  itemItemsListColumnSpell: boolean;
  itemItemsListColumnSheen: boolean;
  itemItemsListColumnKillstreaker: boolean;
  itemItemsListColumnFloat: boolean;
  itemItemsListColumnStickers: boolean;
  itemItemsListColumnPart: boolean;
  itemShowItemsListAttributes: boolean;
  itemEnableItemsListSearch: boolean;
  itemWarnExorcismDiscount: boolean;
  itemExternalMarketPrices: boolean;
  itemChartMode: ItemChartMode;
  itemSectionOrder: ItemSectionOrder;
  itemBuyOrderQuantityRules: string;
  giveawaysHelpers: boolean;
  bundlesValueHints: boolean;
  auctionsValueHints: boolean;
  language: AppLanguage;
};

export type Message =
  | { type: "SETTINGS_UPDATED"; settings: Settings }
  | { type: "PING" }
  | { type: "FETCH_EXTERNAL_PRICES"; itemName: string }
  | { type: "FETCH_EXTERNAL_PRICE_PROVIDER"; itemName: string; providerId: ExternalPriceProviderId };

export type FetchExternalPricesResponse =
  | { ok: true; prices: ExternalPriceEntry[] }
  | { ok: false; error: string };

export type FetchExternalPriceProviderResponse =
  | { ok: true; price: ExternalPriceEntry }
  | { ok: false; error: string };
