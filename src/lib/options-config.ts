import type { Settings } from "./types";

export type ToggleKey = {
  [K in keyof Settings]: Settings[K] extends boolean ? K : never;
}[keyof Settings];

export type ToggleOption = {
  key: ToggleKey;
  page: "global" | "home" | "item" | "inventory" | "profile" | "giveaways" | "bundles" | "auctions";
  group?: string;
  label: string;
  description: string;
};

export const TOGGLE_OPTIONS: ToggleOption[] = [
  {
    key: "enabled",
    page: "global",
    label: "Enable extension",
    description: "Master toggle for all features."
  },
  {
    key: "hideGlobalAlert",
    page: "global",
    label: "Hide global alert",
    description: "Hides the top global alert banner when present."
  },
  {
    key: "globalHideBreadcrumbs",
    page: "global",
    label: "Esconder breadcrumbs (global)",
    description: "Esconde a linha de breadcrumbs em todas as páginas."
  },
  {
    key: "globalBlockTrackers",
    page: "global",
    label: "Block known trackers",
    description: "Blocks known tracker scripts like Cloudflare Insights and GTM."
  },
  {
    key: "homeHideBanner",
    page: "home",
    label: "Hide main banner",
    description: "Hides the home page top carousel/banner."
  },
  {
    key: "homeHideFaq",
    page: "home",
    label: "Hide FAQ",
    description: "Hides home FAQ/SEO sections."
  },
  {
    key: "inventoryHighlights",
    page: "inventory",
    label: "Inventory Highlights",
    description: "Highlight items based on value or condition."
  },
  {
    key: "inventoryUndercutToggle",
    page: "inventory",
    label: "Undercut Button",
    description: "Adds a quick undercut button to the inventory."
  },
  {
    key: "inventoryQuickUpdate",
    page: "inventory",
    label: "Quick Update Modal",
    description: "Update item prices quickly via a modal."
  },
  {
    key: "inventoryQuickUpdateIgnoreDiscountWarning",
    page: "inventory",
    label: "Quick Update: Ignore Warnings",
    description: "Auto-skips the discount warning during quick updates."
  },
  {
    key: "inventoryQuickUpdateAutoConfirmTotalItems",
    page: "inventory",
    label: "Quick Update: Auto Quantity",
    description: "Automatically adds item quantity during quick updates."
  },
  {
    key: "inventoryShowPaintedTag",
    page: "inventory",
    label: "Show Painted Tag",
    description: "Shows the 'Painted' tag for painted items in the inventory."
  },
  {
    key: "profileFixXError",
    page: "profile",
    label: "Fix Accessibility Spam",
    description: "Prevents repeated invisible ARIA regions that can cause profile lag."
  },
  {
    key: "profileExportTransactions",
    page: "profile",
    label: "Export Transactions",
    description: "Adds an export button to the transaction history table."
  },
  {
    key: "profileExportCashouts",
    page: "profile",
    label: "Export Cashouts",
    description: "Adds an export button to the cashouts table."
  },
  {
    key: "profileExportBuyOrders",
    page: "profile",
    label: "Export Buy Orders",
    description: "Adds an export button to the buy orders table."
  },
  {
    key: "profileRemoveAllBuyOrders",
    page: "profile",
    label: "Remove All Buy Orders",
    description: "Adds a button to remove all buy orders at once with progress tracking."
  },
  {
    key: "profileImproveDeleteHitbox",
    page: "profile",
    label: "Improve Delete Button Hitbox",
    description: "Makes individual buy-order delete buttons larger and easier to click."
  },
  {
    key: "itemHideDetailsTitle",
    page: "item",
    group: "Page visibility",
    label: "Hide item title",
    description: "Hides the Item Details heading on item pages."
  },
  {
    key: "itemHideBuyOrderHint",
    page: "item",
    group: "Page visibility",
    label: "Hide buy-order hint",
    description: "Hides the explanatory buy-order paragraph."
  },
  {
    key: "itemHideTf2ShopButton",
    page: "item",
    group: "Page visibility",
    label: "Hide tf2shop button",
    description: "Hides the tf2shop button in the quantity/actions block."
  },
  {
    key: "itemAutoFillBuyOrderPrice",
    page: "item",
    group: "Buy-order safety",
    label: "Auto-fill buy-order",
    description: "Fills buy-order price using best order +0.01 (no submit)."
  },
  {
    key: "itemWarnNegativeFlipOnSubmit",
    page: "item",
    group: "Buy-order safety",
    label: "Warn negative flip",
    description: "Shows confirm before placing buy order with negative flip."
  },
  {
    key: "itemPreventNegativeInputs",
    page: "item",
    group: "Buy-order safety",
    label: "Prevent negatives",
    description: "Blocks negative quantity/price values in item controls."
  },
  {
    key: "itemBuyOrderTableProfit",
    page: "item",
    group: "Buy-order safety",
    label: "Buy-order profits",
    description: "Adds net/profit columns on buy-order table."
  },
  {
    key: "itemHideItemsListMakeOfferButton",
    page: "item",
    group: "Items list actions",
    label: "Hide Make offer",
    description: "Hides the Make offer button in each Items list row."
  },
  {
    key: "itemHideItemsListInspectButton",
    page: "item",
    group: "Items list actions",
    label: "Hide Inspect",
    description: "Hides the Inspect button in each Items list row."
  },
  {
    key: "itemHideItemsListViewOnSteamButton",
    page: "item",
    group: "Items list actions",
    label: "Hide View on Steam",
    description: "Hides the View on Steam button in each Items list row."
  },
  {
    key: "itemHideItemsListSteamCollectorButton",
    page: "item",
    group: "Items list actions",
    label: "Hide Steamcollector",
    description: "Hides the Steamcollector.com button in each Items list row."
  },
  {
    key: "itemHideItemsListInspectInGameButton",
    page: "item",
    group: "Items list actions",
    label: "Hide Inspect in game",
    description: "Hides the Inspect in game button in each Items list row."
  },
  {
    key: "itemItemsListColumnSpell",
    page: "item",
    group: "Items list columns",
    label: "Column: Spell",
    description: "Adds a Spell column with icon in Items list."
  },
  {
    key: "itemItemsListColumnSheen",
    page: "item",
    group: "Items list columns",
    label: "Column: Sheen",
    description: "Adds a Sheen column with icon in Items list."
  },
  {
    key: "itemItemsListColumnKillstreaker",
    page: "item",
    group: "Items list columns",
    label: "Column: Killstreaker",
    description: "Adds a Killstreaker column with icon in Items list."
  },
  {
    key: "itemItemsListColumnFloat",
    page: "item",
    group: "Items list columns",
    label: "Column: Float",
    description: "Adds a Float column when float value is present in row details."
  },
  {
    key: "itemItemsListColumnStickers",
    page: "item",
    group: "Items list columns",
    label: "Column: Stickers",
    description: "Adds a Stickers column with checkmark/cross for sticker presence."
  },
  {
    key: "itemItemsListColumnPart",
    page: "item",
    group: "Items list columns",
    label: "Column: Part",
    description: "Adds a Part column with icon in Items list."
  },
  {
    key: "itemShowItemsListAttributes",
    page: "item",
    group: "Items list columns",
    label: "Show item attributes",
    description: "Shows sheen and killstreaker summary in Items list rows."
  },
  {
    key: "itemEnableItemsListSearch",
    page: "item",
    group: "Items list columns",
    label: "Items list search",
    description: "Adds search box for effect, sheen, killstreaker, and parts."
  },
  {
    key: "itemWarnExorcismDiscount",
    page: "item",
    group: "Buy-order safety",
    label: "Warn Exorcism at base price",
    description: "Warns when Exorcism listings are priced near regular non-spell listings."
  },
  {
    key: "itemExternalMarketPrices",
    page: "item",
    group: "Price references",
    label: "External market prices",
    description: "Shows Steam/Backpack price references for the current item."
  },
  {
    key: "giveawaysHelpers",
    page: "giveaways",
    label: "Giveaways helpers",
    description: "Adds joined-state and list helper cues for giveaways."
  },
  {
    key: "auctionsValueHints",
    page: "auctions",
    label: "Auctions value hints",
    description: "Adds lightweight value hints on auctions pages."
  }
];
