import type { ContentModule } from "../types";
import { parseMoney, validatePrice } from "../shared/safety";
import { EXTERNAL_PRICE_PROVIDERS, type ExternalPriceEntry, type ExternalPriceProviderId } from "../../lib/external-prices";
import type { FetchExternalPriceProviderResponse } from "../../lib/types";

const BUY_ORDER_PROFIT_HEADER_CLASS = "mannco-enhancer-buy-order-profit-header";
const BUY_ORDER_PROFIT_CELL_CLASS = "mannco-enhancer-buy-order-profit-cell";
const CHART_TOGGLE_BUTTON_ID = "mannco-enhancer-chart-toggle";
const BUY_ORDER_SUMMARY_ID = "mannco-enhancer-buy-order-summary";
const ITEM_STYLE_ID = "mannco-enhancer-item-style";
const ITEM_FLIP_WRAP_CLASS = "mannco-enhancer-flip-wrap";
const ITEM_FLIP_PILL_CLASS = "mannco-enhancer-flip-pill";
const ITEM_FLIP_TOOLTIP_LEGACY_CLASS = "mannco-enhancer-flip-tooltip";
const ITEM_FLIP_TOOLTIP_TITLE_CLASS = "mannco-enhancer-flip-tooltip-title";
const ITEM_FLIP_TOOLTIP_LINE_CLASS = "mannco-enhancer-flip-tooltip-line";
const ITEM_FLIP_FLOAT_TOOLTIP_ID = "mannco-enhancer-flip-tooltip-floating";
const ITEM_ROW_META_CLASS = "mannco-enhancer-item-row-meta";
const ITEMS_FILTER_WRAP_ID = "mannco-enhancer-items-filter";
const ITEMS_FILTER_LAYOUT_ID = "mannco-enhancer-items-filter-layout";
const ITEMS_FILTER_INPUT_ID = "mannco-enhancer-items-filter-input";
const ITEMS_FILTER_OPTIONS_ID = "mannco-enhancer-items-filter-options";
const ITEMS_FILTER_OPTION_EXORCISM_CLASS = "mannco-enhancer-items-filter-option-exorcism";
const ITEMS_FILTER_TAGS_ID = "mannco-enhancer-items-filter-tags";
const ITEMS_FILTER_CLEAR_ID = "mannco-enhancer-items-filter-clear";
const ITEMS_FILTER_SEARCH_ROW_ID = "mannco-enhancer-items-filter-search-row";
const ITEMS_LIST_EXORCISM_ALERT_ID = "mannco-enhancer-items-exorcism-alert";
const ITEMS_LIST_EXORCISM_ROW_CLASS = "mannco-enhancer-items-row-exorcism-discount";
const ITEMS_COLOR_TOOLTIP_ID = "mannco-enhancer-items-color-tooltip";
const ITEM_FLIP_POSITIVE_CLASS = "mannco-enhancer-flip-positive";
const ITEM_FLIP_NEGATIVE_CLASS = "mannco-enhancer-flip-negative";
const BUY_ORDER_HELPER_BUTTON_ID = "mannco-enhancer-buyorder-helper";
const BUY_ORDER_ACTIONS_CLASS = "mannco-enhancer-buyorder-actions";
const BUY_ORDER_CLICKABLE_ROW_CLASS = "mannco-enhancer-buyorder-clickable";
const BUY_ORDER_USER_NOTICE_ID = "mannco-enhancer-buyorder-user-notice";
const BUY_ORDER_USER_ROW_CLASS = "mannco-enhancer-buyorder-user-row";
const BUY_ORDER_USER_BADGE_CLASS = "mannco-enhancer-buyorder-user-badge";
const BUY_ORDER_HEADER_ROW_CLASS = "mannco-enhancer-buyorder-header-row";
const STEP_WRAP_CLASS = "mannco-enhancer-step-wrap";
const STEP_BUTTON_CLASS = "mannco-enhancer-step-btn";
const STEP_PRICE_BUTTON_CLASS = "mannco-enhancer-step-btn-price";
const STEP_INLINE_ROW_CLASS = "mannco-enhancer-step-inline-row";
const STEP_INPUTGROUP_BUTTON_CLASS = "mannco-enhancer-step-inputgroup-btn";
const OFFER_MODAL_SELECTOR = "#modal-offerCreate";
const OFFER_INPUT_SELECTOR = "#modal-offerCreate .inputprice";
const OFFER_REFERENCE_TABLE_ID = "mannco-enhancer-offer-reference";
const BPTF_UNUSUAL_LIST_SELECTOR = "#unusual-pricelist";
const PARTICLE_EFFECT_SRC_PATTERN = /\/particles\/(\d+)_\d+x\d+\.png/i;
const EXTERNAL_PRICE_CARD_ID = "mannco-enhancer-external-prices";
const EXTERNAL_PRICE_STATE_OK_CLASS = "mannco-enhancer-external-price-ok";
const EXTERNAL_PRICE_STATE_BAD_CLASS = "mannco-enhancer-external-price-bad";
const EXTERNAL_PRICE_IMAGE_HINT_ID = "mannco-enhancer-external-prices-top-icon";
const EXTERNAL_PRICE_IMAGE_TOOLTIP_ID = "mannco-enhancer-external-prices-top-tooltip";
const EXTERNAL_PRICE_CARD_TILE_CLASS = "mannco-enhancer-external-price-tile";
const EXTERNAL_PRICE_CACHE_MS = 120000;

const PROVIDER_LOGO_BY_ID: Record<string, string> = {
  mannco: "assets/providers/mannco.svg",
  steamCommunity: "assets/providers/steam.png",
  backpackTf: "assets/providers/backpacktf.png",
  dmarket: "assets/providers/dmarket.ico",
  skinport: "assets/providers/skinport.png",
  csfloat: "assets/providers/csgobp.png",
  tradeit: "assets/providers/tradeit.svg",
  bitskins: "assets/providers/bitskins.png",
  shadowpay: "assets/providers/shadowpay.svg",
  waxpeer: "assets/providers/waxpeer.svg",
  skinbaron: "assets/providers/skinbaron.svg"
};

let submitGuardBound = false;
let buyOrderToastRefreshBound = false;
let pendingBuyOrderSubmitAt = 0;

let originalChartParent: Node | null = null;
let originalChartNextSibling: ChildNode | null = null;
let latestEnabled = true;
let latestWarnNegativeFlip = true;
let latestPreventNegative = true;
let latestQuantityRules = "0.05:25,0.10:15,0.50:5,999999:1";
let effectIdNameMapCache: Record<string, string> = {};
let effectIdNameMapCacheKey = "";
let externalPriceProviderCache = new Map<string, { at: number; price: ExternalPriceEntry }>();
let externalPriceProviderInflight = new Map<string, Promise<ExternalPriceEntry | null>>();
let externalOverlayToken = 0;

type SearchOptionGroup = "spell" | "sheen" | "killstreaker" | "part" | "color" | "stickers";

let itemsListSearchOptionsSignature = "";
let itemsListSearchUiSignature = "";
let itemsListSearchFilterSignature = "";
let itemsListSearchQuery = "";
let itemsListSearchSelected = new Set<string>();

const BUY_ORDER_INPUT_SELECTORS = [
  "input[name='buy_order_price']",
  "input[name='price']",
  "input[name='boprice']",
  "input.boprice",
  ".boprice input",
  ".boamount ~ .boprice input",
  ".inputnb.boprice",
  "#transacContent .boprice",
  ".table-items__actions input[type='number']",
  ".table-itemsactions input[type='number']"
] as const;

const PRICE_REFERENCE_SELECTORS = [
  "[data-highest-buy-order]",
  ".thisll",
  ".ecurrency",
  ".tbodyitem .ecurrency",
  ".classSales .ecurrency",
  ".buy-order-price",
  ".item-price",
  "#transacContent .ecurrency"
] as const;

const BUY_ORDER_QTY_SELECTORS = ["input.boamount", ".boamount", "#cashout-amount"] as const;
const LOWEST_PRICE_SELECTORS = [
  ".card-body.text-center .important-text .ecurrency",
  ".card-body.text-center .important-text [data-bs-original-title]",
  ".card-body.text-center .important-text",
  ".important-text .ecurrency",
  ".important-text [data-bs-original-title]",
  ".important-text",
  ".card-body.text-center .ecurrency"
] as const;
const BUY_ORDER_TABLE_SELECTORS = [
  ".card-body.h-100.border-start table",
  ".card .card-body.h-100.border-start .table",
  ".card table.table.table-striped.mb-0"
] as const;
const ITEMS_LIST_PRICE_SELECTORS = [
  "#transacContent td.ecurrency",
  ".table-items #transacContent td.ecurrency",
  "#transacContent td[data-bs-original-title]"
] as const;
const ITEMS_LIST_ROW_SELECTORS = ["#transacContent tr.itemListPagination", "#transacContent tr"] as const;
const ITEMS_LIST_ACTION_CELL_SELECTORS = ["td.table-itemsactions", "td.table-items__actions"] as const;
const ITEMS_LIST_EXTRA_HEADER_CLASS = "mannco-enhancer-items-extra-header";
const ITEMS_LIST_EXTRA_CELL_CLASS = "mannco-enhancer-items-extra-cell";
const MARKET_LEGEND_ID = "mannco-enhancer-items-market-legend";
const MARKET_LEGEND_COUNT_ID = "mannco-enhancer-items-market-legend-count";

function parseBpTfEffectIdNameMap(): Record<string, string> {
  const list = document.querySelector<HTMLElement>(BPTF_UNUSUAL_LIST_SELECTOR);
  if (!list) return {};

  const effectItems = Array.from(list.querySelectorAll<HTMLLIElement>("li[data-effect_id]"));
  if (effectItems.length === 0) return {};

  const firstId = effectItems[0]?.getAttribute("data-effect_id") || "";
  const lastId = effectItems[effectItems.length - 1]?.getAttribute("data-effect_id") || "";
  const cacheKey = `${effectItems.length}:${firstId}:${lastId}`;
  if (cacheKey === effectIdNameMapCacheKey) return effectIdNameMapCache;

  const nextMap: Record<string, string> = {};
  for (const item of effectItems) {
    const id = (item.getAttribute("data-effect_id") || "").trim();
    if (!id) continue;

    const fromData = (item.getAttribute("data-effect_name") || "").trim();
    const fromTitle = (item.getAttribute("title") || item.getAttribute("data-original-title") || "").trim();
    const fromText = (item.querySelector("span")?.textContent || "")
      .replace(/^Unusual\s+/i, "")
      .trim();
    const name = fromData || fromTitle || fromText;
    if (!name) continue;

    nextMap[id] = name;
  }

  effectIdNameMapCache = nextMap;
  effectIdNameMapCacheKey = cacheKey;
  return nextMap;
}

function effectIdFromParticleImage(src: string): string | null {
  const match = src.match(PARTICLE_EFFECT_SRC_PATTERN);
  return match?.[1] || null;
}

function ensureItemStyle(): void {
  if (document.getElementById(ITEM_STYLE_ID)) return;

  const style = document.createElement("style");
  style.id = ITEM_STYLE_ID;
  style.textContent = `
    .${ITEM_FLIP_WRAP_CLASS} {
      position: relative;
      display: inline-block;
      align-items: center;
      margin-left: 8px;
      vertical-align: middle;
    }

    .${ITEM_FLIP_PILL_CLASS} {
      border: 1px solid #5f7d95;
      background: rgba(27, 45, 60, 0.78);
      color: #d6e8f8;
      border-radius: 999px;
      font-size: 10px;
      font-weight: 700;
      line-height: 1;
      padding: 4px 8px;
      cursor: help;
      user-select: none;
    }

    .${ITEM_FLIP_PILL_CLASS}.${ITEM_FLIP_POSITIVE_CLASS} {
      border-color: #5ea17a;
      background: rgba(30, 64, 45, 0.82);
      color: #d4f7e2;
    }

    .${ITEM_FLIP_PILL_CLASS}.${ITEM_FLIP_NEGATIVE_CLASS} {
      border-color: #a9824d;
      background: rgba(74, 53, 24, 0.82);
      color: #ffe7c5;
    }

    #${ITEM_FLIP_FLOAT_TOOLTIP_ID} {
      position: fixed;
      left: 0;
      top: 0;
      min-width: 220px;
      max-width: 320px;
      z-index: 2200;
      border: 1px solid #4f687c;
      border-radius: 10px;
      background: linear-gradient(180deg, #13202b 0%, #0f1a23 100%);
      color: #dceaf8;
      box-shadow: 0 10px 28px rgba(0, 0, 0, 0.42);
      font-size: 11px;
      line-height: 1.4;
      padding: 10px 11px;
      opacity: 0;
      visibility: hidden;
      transform: translate(0, 6px) scale(0.98);
      transform-origin: 50% 100%;
      transition: opacity .2s ease-out, transform .22s cubic-bezier(.2, .7, .2, 1), visibility .2s ease-out;
      pointer-events: none;
      white-space: normal;
    }

    #${ITEM_FLIP_FLOAT_TOOLTIP_ID}.visible {
      opacity: 1;
      visibility: visible;
      transform: translate(0, 0) scale(1);
    }

    #${ITEM_FLIP_FLOAT_TOOLTIP_ID}::after {
      content: "";
      position: absolute;
      left: 50%;
      top: 100%;
      width: 10px;
      height: 10px;
      margin-left: -5px;
      border-right: 1px solid #4f687c;
      border-bottom: 1px solid #4f687c;
      background: #0f1a23;
      transform: rotate(45deg);
    }

    #${ITEM_FLIP_FLOAT_TOOLTIP_ID}.upward::after {
      top: auto;
      bottom: 100%;
      background: #13202b;
      transform: rotate(225deg);
    }

    .${ITEM_FLIP_TOOLTIP_TITLE_CLASS} {
      display: block;
      font-size: 11px;
      font-weight: 700;
      color: #f0f6fd;
      margin-bottom: 5px;
    }

    .${ITEM_FLIP_TOOLTIP_LINE_CLASS} {
      display: block;
      color: #bad0e3;
      margin-top: 2px;
    }

    .${ITEM_ROW_META_CLASS} {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 6px;
    }

    .${ITEM_ROW_META_CLASS} > span {
      border: 1px solid #495f74;
      border-radius: 999px;
      padding: 2px 7px;
      font-size: 10px;
      color: #c8d9ea;
      background: rgba(38, 56, 70, 0.55);
      line-height: 1.2;
    }

    .item-info__aside {
      position: relative;
    }

    #${EXTERNAL_PRICE_IMAGE_HINT_ID} {
      position: absolute;
      right: 8px;
      top: 8px;
      width: 22px;
      height: 22px;
      border-radius: 999px;
      border: 1px solid #5f7f99;
      background: linear-gradient(180deg, #203547 0%, #172835 100%);
      color: #d6e8f8;
      font-size: 12px;
      font-weight: 700;
      line-height: 20px;
      text-align: center;
      z-index: 120;
      cursor: help;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.35);
      user-select: none;
      pointer-events: auto;
      background-size: 14px 14px;
      background-repeat: no-repeat;
      background-position: center;
      color: transparent;
    }

    #${EXTERNAL_PRICE_IMAGE_TOOLTIP_ID} {
      position: fixed;
      left: 0;
      top: 0;
      width: min(560px, 95vw);
      z-index: 2000;
      border: 1px solid #4f6477;
      border-radius: 12px;
      background: linear-gradient(180deg, #13202b 0%, #0c1720 100%);
      color: #d9eaf9;
      box-shadow: 0 12px 28px rgba(0, 0, 0, 0.45);
      padding: 10px;
      opacity: 0;
      visibility: hidden;
      transform: translate3d(0, 0, 0);
      transition: opacity 0.12s ease;
      pointer-events: auto;
    }

    #${EXTERNAL_PRICE_IMAGE_TOOLTIP_ID}.is-visible {
      opacity: 1;
      visibility: visible;
    }

    #${EXTERNAL_PRICE_IMAGE_TOOLTIP_ID} .title {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.02em;
      color: #e5f1fb;
      margin-bottom: 6px;
      padding-bottom: 6px;
      border-bottom: 1px solid #3f5567;
    }

    #${EXTERNAL_PRICE_IMAGE_TOOLTIP_ID} .grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(180px, 1fr));
      gap: 8px;
    }

    .${EXTERNAL_PRICE_CARD_TILE_CLASS} {
      border: 1px solid #3e5568;
      border-radius: 10px;
      background: rgba(34, 51, 65, 0.52);
      padding: 8px;
      min-height: 76px;
      display: flex;
      flex-direction: column;
      gap: 5px;
    }

    .${EXTERNAL_PRICE_CARD_TILE_CLASS} .label {
      color: #a9c5da;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.02em;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .${EXTERNAL_PRICE_CARD_TILE_CLASS} .label img {
      width: 14px;
      height: 14px;
      object-fit: contain;
      border-radius: 3px;
    }

    .${EXTERNAL_PRICE_CARD_TILE_CLASS} .value {
      color: #ecf5fd;
      font-size: 14px;
      font-weight: 800;
      line-height: 1.2;
    }

    .${EXTERNAL_PRICE_CARD_TILE_CLASS}.${EXTERNAL_PRICE_STATE_OK_CLASS} .value {
      color: #bfe8d1;
    }

    .${EXTERNAL_PRICE_CARD_TILE_CLASS}.${EXTERNAL_PRICE_STATE_BAD_CLASS} .value {
      color: #d8c2b5;
      font-weight: 700;
    }

    .${EXTERNAL_PRICE_CARD_TILE_CLASS} .note {
      color: #9eb5c7;
      font-size: 10px;
      line-height: 1.25;
      min-height: 24px;
    }

    .${EXTERNAL_PRICE_CARD_TILE_CLASS} .open {
      align-self: flex-start;
      color: #b0d5f2;
      text-decoration: none;
      border: 1px solid #557996;
      border-radius: 999px;
      padding: 2px 7px;
      font-size: 10px;
      font-weight: 600;
    }

    @media (max-width: 760px) {
      #${EXTERNAL_PRICE_IMAGE_TOOLTIP_ID} .grid {
        grid-template-columns: 1fr;
      }
    }

    #transacContent td:nth-child(2) {
      position: relative;
    }

    #transacContent td:nth-child(2) .item-magnifier {
      left: 50% !important;
      right: auto !important;
      top: calc(100% + 8px) !important;
      transform: translateX(-50%);
      max-width: min(460px, 92vw);
      width: max-content;
      z-index: 140;
    }

    @media (max-width: 900px) {
      #transacContent td:nth-child(2) .item-magnifier {
        left: 0 !important;
        transform: none;
        max-width: min(96vw, 460px);
      }
    }

    #${ITEMS_FILTER_LAYOUT_ID} {
      display: block;
      margin-bottom: 10px;
      min-width: 0;
    }

    #${ITEMS_FILTER_WRAP_ID} {
      padding: 0;
      border: 1px solid #4e6375;
      border-radius: 10px;
      background: transparent;
      box-shadow: none;
      margin-bottom: 8px;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      min-width: 0;
    }

    #${ITEMS_FILTER_TAGS_ID} {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin: 0 8px 7px 8px;
    }

    #${ITEMS_FILTER_SEARCH_ROW_ID} {
      display: flex;
      gap: 6px;
      align-items: center;
      margin: 6px 8px;
    }

    #${ITEMS_FILTER_SEARCH_ROW_ID} .search-wrap {
      position: relative;
      flex: 1;
    }

    #${ITEMS_FILTER_SEARCH_ROW_ID} .search-icon {
      position: absolute;
      left: 9px;
      top: 50%;
      transform: translateY(-50%);
      opacity: 0.55;
      pointer-events: none;
      font-size: 12px;
      color: #9bb1c4;
    }

    #${ITEMS_FILTER_INPUT_ID} {
      width: 100%;
      border: 1px solid #5b7388;
      border-radius: 8px;
      background: transparent;
      color: #d8e9f8;
      height: 34px;
      padding: 0 8px 0 28px;
      font-size: 12px;
    }

    #${ITEMS_FILTER_INPUT_ID}::placeholder {
      color: #97afc4;
    }

    #${ITEMS_FILTER_CLEAR_ID} {
      font-size: 11px;
      color: #aac2d4;
      padding: 2px 0;
      cursor: pointer;
      white-space: nowrap;
    }

    #${ITEMS_FILTER_CLEAR_ID}:hover {
      color: #d2e4f1;
    }

    #${ITEMS_FILTER_TAGS_ID} .tag {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      border: 1px solid #557390;
      border-radius: 999px;
      padding: 2px 8px;
      font-size: 10px;
      font-weight: 600;
      color: #cfe1ef;
      background: rgba(25, 40, 52, 0.65);
    }

    #${ITEMS_FILTER_TAGS_ID} .tag .tag-thumb {
      width: 14px;
      height: 14px;
      object-fit: contain;
      border-radius: 3px;
      background: rgba(20, 33, 44, 0.6);
      border: 1px solid rgba(106, 135, 158, 0.5);
      flex: 0 0 auto;
    }

    #${ITEMS_FILTER_TAGS_ID} .tag .tag-thumb {
      width: 14px;
      height: 14px;
      object-fit: contain;
      border-radius: 3px;
      background: rgba(20, 33, 44, 0.6);
      border: 1px solid rgba(106, 135, 158, 0.5);
      flex: 0 0 auto;
    }

    #${ITEMS_FILTER_TAGS_ID} .tag.${ITEMS_FILTER_OPTION_EXORCISM_CLASS} {
      border-color: #8d6f3b;
      background: rgba(74, 57, 23, 0.35);
      color: #f3deb3;
    }

    #${ITEMS_FILTER_TAGS_ID} .tag button {
      border: none;
      background: none;
      color: inherit;
      opacity: 0.75;
      cursor: pointer;
      font-size: 12px;
      line-height: 1;
    }

    #${ITEMS_FILTER_OPTIONS_ID} {
      border-top: 1px solid #4f687d;
      overflow-y: auto;
      overflow-x: hidden;
      max-height: none;
      background: transparent;
      display: grid;
      gap: 0;
      flex: 1 1 auto;
      min-height: 220px;
      scrollbar-width: thin;
      scrollbar-color: #6a879e rgba(20, 33, 44, 0.65);
    }

    #${ITEMS_FILTER_OPTIONS_ID}::-webkit-scrollbar {
      width: 8px;
    }

    #${ITEMS_FILTER_OPTIONS_ID}::-webkit-scrollbar-thumb {
      background: linear-gradient(180deg, #7b9bb5 0%, #5f7b92 100%);
      border-radius: 999px;
      border: 1px solid rgba(17, 28, 37, 0.7);
    }

    #${ITEMS_FILTER_OPTIONS_ID}::-webkit-scrollbar-track {
      background: rgba(18, 30, 40, 0.6);
    }

    #${ITEMS_FILTER_OPTIONS_ID} details {
      border-bottom: 1px solid rgba(82, 106, 126, 0.45);
      overflow: hidden;
    }

    #${ITEMS_FILTER_OPTIONS_ID} details:last-child {
      border-bottom: none;
    }

    #${ITEMS_FILTER_OPTIONS_ID} summary {
      cursor: pointer;
      padding: 8px 9px;
      font-size: 10px;
      font-weight: 700;
      color: #cfe1ef;
      list-style: none;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      background: transparent;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      min-width: 0;
    }

    #${ITEMS_FILTER_OPTIONS_ID} summary::-webkit-details-marker {
      display: none;
    }

    #${ITEMS_FILTER_OPTIONS_ID} summary .summary-icon {
      font-size: 10px;
      opacity: 0.85;
      transition: transform 0.14s ease;
      transform: rotate(-90deg);
    }

    #${ITEMS_FILTER_OPTIONS_ID} details[open] summary .summary-icon {
      transform: rotate(0deg);
    }

    #${ITEMS_FILTER_OPTIONS_ID} .group-list {
      max-height: none;
      overflow: visible;
      min-width: 0;
    }

    #${ITEMS_FILTER_OPTIONS_ID} label {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px;
      border-bottom: 1px solid rgba(82, 106, 126, 0.45);
      font-size: 12px;
      color: #d4e4f1;
      cursor: pointer;
    }

    #${ITEMS_FILTER_OPTIONS_ID} label:last-child {
      border-bottom: none;
    }

    #${ITEMS_FILTER_OPTIONS_ID} input[type="checkbox"] {
      width: 13px;
      height: 13px;
      margin: 0;
    }

    #${ITEMS_FILTER_OPTIONS_ID} .option-name {
      flex: 1;
      text-transform: capitalize;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    #${ITEMS_FILTER_OPTIONS_ID} .option-thumb {
      width: 18px;
      height: 18px;
      object-fit: contain;
      border-radius: 4px;
      background: rgba(20, 33, 44, 0.6);
      border: 1px solid rgba(106, 135, 158, 0.5);
      flex: 0 0 auto;
    }

    #${ITEMS_FILTER_OPTIONS_ID} .option-thumb {
      width: 18px;
      height: 18px;
      object-fit: contain;
      border-radius: 4px;
      background: rgba(20, 33, 44, 0.6);
      border: 1px solid rgba(106, 135, 158, 0.5);
      flex: 0 0 auto;
    }

    #${ITEMS_FILTER_OPTIONS_ID} .option-count {
      color: #9cb3c5;
      min-width: 22px;
      text-align: right;
      font-size: 11px;
      font-variant-numeric: tabular-nums;
    }

    #${ITEMS_FILTER_OPTIONS_ID} label.option-row:hover {
      background: rgba(40, 61, 78, 0.45);
    }

    #${ITEMS_FILTER_OPTIONS_ID} label.${ITEMS_FILTER_OPTION_EXORCISM_CLASS} {
      border-color: #8d6f3b;
      background: rgba(74, 57, 23, 0.35);
      color: #f3deb3;
    }

    #${ITEMS_FILTER_WRAP_ID} .option-preview {
      position: fixed;
      z-index: 1700;
      width: 120px;
      height: 120px;
      border: 1px solid #5d768a;
      border-radius: 10px;
      background: rgba(18, 30, 40, 0.95);
      box-shadow: 0 10px 22px rgba(0, 0, 0, 0.45);
      padding: 6px;
      pointer-events: none;
      opacity: 0;
      transform: scale(0.98);
      transition: opacity 0.08s ease, transform 0.08s ease;
    }

    #${ITEMS_FILTER_WRAP_ID} .option-preview.visible {
      opacity: 1;
      transform: scale(1);
    }

    #${ITEMS_FILTER_WRAP_ID} .option-preview img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      border-radius: 8px;
      background: rgba(31, 47, 62, 0.55);
    }

    #${ITEMS_FILTER_LAYOUT_ID} .table-responsive-md {
      overflow-x: auto;
      overflow-y: visible !important;
      min-width: 0;
    }

    #${ITEMS_FILTER_LAYOUT_ID} .table,
    #${ITEMS_FILTER_LAYOUT_ID} #transacContent,
    #${ITEMS_FILTER_LAYOUT_ID} .table-items {
      overflow: visible;
    }

    #${ITEMS_COLOR_TOOLTIP_ID} {
      position: fixed;
      z-index: 1800;
      left: 0;
      top: 0;
      pointer-events: none;
      border: 1px solid #4f667a;
      border-radius: 8px;
      background: rgba(16, 26, 35, 0.96);
      color: #d9ecfc;
      font-size: 11px;
      line-height: 1.2;
      padding: 5px 8px;
      white-space: nowrap;
      opacity: 0;
      visibility: hidden;
      transform: translateY(4px);
      transition: opacity .09s ease, transform .09s ease;
      box-shadow: 0 8px 16px rgba(0, 0, 0, 0.35);
    }

    #${ITEMS_COLOR_TOOLTIP_ID}.visible {
      opacity: 1;
      visibility: visible;
      transform: translateY(0);
    }

    @media (min-width: 1080px) {
      #${ITEMS_FILTER_LAYOUT_ID} {
        display: flex;
        align-items: stretch;
        gap: 12px;
        min-width: 0;
      }

      #${ITEMS_FILTER_WRAP_ID} {
        flex: 0 0 290px;
        margin-bottom: 0;
        height: 100%;
      }

      #${ITEMS_FILTER_LAYOUT_ID} .table-responsive-md {
        flex: 1 1 auto;
        min-width: 0;
        overflow-x: auto;
        overflow-y: visible !important;
      }
    }

    #${ITEMS_LIST_EXORCISM_ALERT_ID} {
      margin-bottom: 8px;
      padding: 8px 10px;
      border: 1px solid #96743f;
      border-radius: 8px;
      background: linear-gradient(180deg, rgba(74, 54, 20, 0.65) 0%, rgba(60, 44, 16, 0.62) 100%);
      color: #efd7a8;
      font-size: 11px;
      line-height: 1.35;
    }

    .${ITEMS_LIST_EXORCISM_ROW_CLASS} {
      box-shadow: inset 0 0 0 1px rgba(164, 124, 54, 0.55);
      background: rgba(90, 66, 25, 0.2) !important;
    }

    .${ITEMS_LIST_EXTRA_HEADER_CLASS},
    .${ITEMS_LIST_EXTRA_CELL_CLASS} {
      white-space: nowrap;
      font-size: 11px;
      text-align: left;
      vertical-align: middle;
      color: #c9dcec;
      min-width: 92px;
    }

    .${ITEMS_LIST_EXTRA_HEADER_CLASS} i {
      margin-right: 4px;
      opacity: 0.9;
    }

    .${ITEMS_LIST_EXTRA_CELL_CLASS} {
      color: #d9e8f6;
    }

    .${ITEMS_LIST_EXTRA_CELL_CLASS}.is-empty {
      color: #8da4b8;
    }

    .${ITEMS_LIST_EXTRA_CELL_CLASS}.is-bool-yes {
      color: #9ae0ae;
      font-weight: 700;
    }

    .${ITEMS_LIST_EXTRA_CELL_CLASS}.is-bool-no {
      color: #d4a9a9;
      font-weight: 700;
    }

    #${OFFER_REFERENCE_TABLE_ID} {
      margin-top: 10px;
      border: 1px solid rgba(255, 255, 255, 0.14);
      border-radius: 8px;
      overflow: hidden;
      background: rgba(255, 255, 255, 0.04);
    }

    #${OFFER_REFERENCE_TABLE_ID} .title {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.02em;
      text-transform: uppercase;
      color: #cfe2f1;
      padding: 7px 9px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.12);
    }

    #${OFFER_REFERENCE_TABLE_ID} .row {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 8px;
      padding: 6px 9px;
      font-size: 11px;
      color: #d9e8f5;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      cursor: pointer;
    }

    #${OFFER_REFERENCE_TABLE_ID} .row:hover {
      background: rgba(255, 255, 255, 0.06);
    }

    #${OFFER_REFERENCE_TABLE_ID} .row:last-child {
      border-bottom: none;
    }

    #${OFFER_REFERENCE_TABLE_ID} .row .qty {
      color: #9eb6c9;
      margin-left: 6px;
      font-size: 10px;
    }

    #${BUY_ORDER_HELPER_BUTTON_ID} {
      border: 1px solid #6089a8;
      background: linear-gradient(180deg, #29465c 0%, #20394b 100%);
      color: #dff0fe;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 600;
      line-height: 1.2;
      padding: 9px 10px;
      cursor: pointer;
    }

    #${BUY_ORDER_HELPER_BUTTON_ID}:hover {
      border-color: #75a4c7;
    }

    .${BUY_ORDER_ACTIONS_CLASS} {
      display: flex !important;
      align-items: stretch;
      gap: 8px !important;
      width: 100%;
      flex-wrap: nowrap;
    }

    .${BUY_ORDER_ACTIONS_CLASS} > .btn,
    .${BUY_ORDER_ACTIONS_CLASS} > form,
    .${BUY_ORDER_ACTIONS_CLASS} > #${BUY_ORDER_HELPER_BUTTON_ID} {
      min-height: 56px;
      height: 56px;
    }

    .${BUY_ORDER_ACTIONS_CLASS} > .btn,
    .${BUY_ORDER_ACTIONS_CLASS} > form {
      flex: 1 1 0;
      width: auto !important;
      min-width: 0;
    }

    .${BUY_ORDER_ACTIONS_CLASS} > form {
      margin: 0;
    }

    .${BUY_ORDER_ACTIONS_CLASS} > form > .btn {
      width: 100%;
      height: 100%;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
    }

    .${BUY_ORDER_ACTIONS_CLASS} > .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
    }

    .${BUY_ORDER_ACTIONS_CLASS} > #${BUY_ORDER_HELPER_BUTTON_ID} {
      flex: 0 0 92px;
      width: 92px;
      min-width: 92px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
    }

    @media (max-width: 860px) {
      .${BUY_ORDER_ACTIONS_CLASS} {
        flex-wrap: wrap;
      }

      .${BUY_ORDER_ACTIONS_CLASS} > #${BUY_ORDER_HELPER_BUTTON_ID} {
        flex: 1 1 100%;
        width: 100%;
      }
    }

    .${BUY_ORDER_CLICKABLE_ROW_CLASS} {
      cursor: pointer;
    }

    .${BUY_ORDER_CLICKABLE_ROW_CLASS}:hover {
      background: rgba(83, 113, 138, 0.22) !important;
    }

    #${BUY_ORDER_USER_NOTICE_ID} {
      display: inline-flex;
      align-items: center;
      max-width: 100%;
      margin: 0;
      padding: 6px 10px;
      border-radius: 999px;
      border: 1px solid #5f86a4;
      background: linear-gradient(180deg, rgba(35, 58, 74, 0.94) 0%, rgba(24, 42, 55, 0.94) 100%);
      color: #dceaf8;
      font-size: 11px;
      line-height: 1.2;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    #${BUY_ORDER_USER_NOTICE_ID}::before {
      content: "";
      width: 7px;
      height: 7px;
      margin-right: 7px;
      border-radius: 999px;
      background: #7fd3ff;
      box-shadow: 0 0 8px rgba(127, 211, 255, 0.65);
      flex: 0 0 auto;
    }

    .${BUY_ORDER_HEADER_ROW_CLASS} {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      margin-bottom: 10px;
      flex-wrap: wrap;
    }

    .${BUY_ORDER_HEADER_ROW_CLASS} > h3 {
      margin: 0;
    }

    .${BUY_ORDER_USER_ROW_CLASS} {
      box-shadow: inset 3px 0 0 #74b0d8;
      background: rgba(89, 127, 156, 0.2) !important;
    }

    .${BUY_ORDER_USER_BADGE_CLASS} {
      display: inline-flex;
      align-items: center;
      margin-left: 8px;
      padding: 1px 6px;
      border-radius: 999px;
      border: 1px solid #6e9fbe;
      background: rgba(40, 67, 86, 0.84);
      color: #d7edff;
      font-size: 10px;
      line-height: 1.2;
      vertical-align: middle;
      white-space: nowrap;
    }

    .${STEP_WRAP_CLASS} {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-top: 6px;
    }

    .${STEP_BUTTON_CLASS} {
      border: 1px solid #547086;
      background: linear-gradient(180deg, #213748 0%, #182a38 100%);
      color: #d4e7f9;
      border-radius: 7px;
      padding: 5px 8px;
      font-size: 11px;
      line-height: 1;
      cursor: pointer;
      min-width: 42px;
    }

    .${STEP_BUTTON_CLASS}.${STEP_PRICE_BUTTON_CLASS} {
      min-width: 66px;
      padding: 8px 10px;
      font-weight: 700;
      letter-spacing: 0.01em;
    }

    .${STEP_INLINE_ROW_CLASS} {
      display: flex;
      align-items: center;
      gap: 0;
      margin-top: 6px;
      min-height: 48px;
    }

    .${STEP_INLINE_ROW_CLASS} > input {
      flex: 1;
      min-width: 0;
      border-radius: 0;
      height: 48px;
    }

    .${STEP_INLINE_ROW_CLASS} .${STEP_BUTTON_CLASS} {
      min-width: 64px;
      padding: 0 10px;
      height: 48px;
      font-weight: 700;
      border-radius: 0;
      border-color: #4f667a;
      margin: 0;
      background: linear-gradient(180deg, #2a4458 0%, #22384a 100%);
      color: #e0efff;
      transition: background 0.14s ease, border-color 0.14s ease, transform 0.06s ease;
    }

    .${STEP_INLINE_ROW_CLASS} .${STEP_BUTTON_CLASS}:hover {
      border-color: #7aa8c9;
      background: linear-gradient(180deg, #34566e 0%, #2b465c 100%);
    }

    .${STEP_INLINE_ROW_CLASS} .${STEP_BUTTON_CLASS}:active {
      transform: translateY(1px);
      background: linear-gradient(180deg, #203645 0%, #1b2d3a 100%);
    }

    .${STEP_INLINE_ROW_CLASS} .${STEP_BUTTON_CLASS}:first-child {
      border-top-left-radius: 8px;
      border-bottom-left-radius: 8px;
      border-right: 0;
    }

    .${STEP_INLINE_ROW_CLASS} .${STEP_BUTTON_CLASS}:last-child {
      border-top-right-radius: 8px;
      border-bottom-right-radius: 8px;
      border-left: 0;
    }

    .${STEP_INPUTGROUP_BUTTON_CLASS} {
      border-radius: 0 !important;
      border-color: #566f86 !important;
      background: linear-gradient(180deg, #294256 0%, #203648 100%) !important;
      color: #d9ecfc !important;
      min-width: 76px;
      font-size: 11px;
      font-weight: 700;
      height: 48px;
      min-height: 48px;
      margin: 0;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      transition: background 0.14s ease, border-color 0.14s ease, transform 0.06s ease;
    }

    .${STEP_INPUTGROUP_BUTTON_CLASS}:hover {
      border-color: #75a1c3 !important;
      background: linear-gradient(180deg, #2f4d63 0%, #274055 100%) !important;
    }

    .${STEP_INPUTGROUP_BUTTON_CLASS}:active {
      transform: translateY(1px);
      background: linear-gradient(180deg, #243c4d 0%, #1d3241 100%) !important;
    }

    .${STEP_INPUTGROUP_BUTTON_CLASS}[data-step-role='minus'] {
      border-top-left-radius: 8px !important;
      border-bottom-left-radius: 8px !important;
      border-right: 0 !important;
    }

    .${STEP_INPUTGROUP_BUTTON_CLASS}[data-step-role='plus'] {
      border-top-right-radius: 8px !important;
      border-bottom-right-radius: 8px !important;
      border-left: 0 !important;
    }
  `;

  document.head?.appendChild(style);
}

function findBuyOrderInput(): HTMLInputElement | null {
  for (const selector of BUY_ORDER_INPUT_SELECTORS) {
    const input = document.querySelector<HTMLInputElement>(selector);
    if (input) return input;
  }

  return null;
}

function findBuyOrderQtyInput(): HTMLInputElement | null {
  for (const selector of BUY_ORDER_QTY_SELECTORS) {
    const input = document.querySelector<HTMLInputElement>(selector);
    if (input) return input;
  }

  return null;
}

function getReferencePrice(): number | null {
  for (const selector of PRICE_REFERENCE_SELECTORS) {
    const node = document.querySelector<HTMLElement>(selector);
    if (!node?.textContent) continue;
    const parsed = parseMoney(node.textContent);
    if (parsed && validatePrice(parsed)) return parsed;
  }

  return null;
}

function calcAfterFees(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  const afterRaw = Math.floor(value * 95) / 100;
  return Math.max(0.01, Number(afterRaw.toFixed(2)));
}

function findBuyOrdersCard(): HTMLElement | null {
  const byForm = document.querySelector<HTMLElement>(".card .nologinbo")?.closest<HTMLElement>(".card");
  if (byForm) return byForm;

  const byInputs =
    document.querySelector<HTMLElement>(".card input.boamount")?.closest<HTMLElement>(".card") ||
    document.querySelector<HTMLElement>(".card input.boprice")?.closest<HTMLElement>(".card") ||
    document.querySelector<HTMLElement>(".card .removebuyorder")?.closest<HTMLElement>(".card");
  if (byInputs) return byInputs;

  return null;
}

function findItemsListCard(): HTMLElement | null {
  const byTable = document.querySelector<HTMLElement>(".card .table-items")?.closest<HTMLElement>(".card");
  if (byTable) return byTable;

  const byContent = document.getElementById("transacContent")?.closest<HTMLElement>(".card");
  if (byContent) return byContent;

  return null;
}

function findSalesChartCard(): HTMLElement | null {
  const chart = document.getElementById("sales-chart");
  return chart?.closest<HTMLElement>(".card") || null;
}

function applySectionOrder(
  order: "buyorders-sales-items" | "buyorders-items-sales" | "sales-buyorders-items" | "sales-items-buyorders" | "items-buyorders-sales" | "items-sales-buyorders",
  enabled: boolean
): void {
  if (!enabled) return;

  const buyOrders = findBuyOrdersCard();
  const sales = findSalesChartCard();
  const items = findItemsListCard();
  if (!buyOrders || !sales || !items) return;

  const byKey = { buyorders: buyOrders, sales, items };
  const desired = order.split("-") as Array<keyof typeof byKey>;
  if (desired.length < 3) return;

  const firstKey = desired[0];
  if (!firstKey) return;

  const parent = buyOrders.parentElement;
  if (!parent || sales.parentElement !== parent || items.parentElement !== parent) return;

  const cardsInParent = Array.from(parent.children).filter(
    (node) => node === buyOrders || node === sales || node === items
  );
  const desiredFirst = byKey[firstKey];
  const currentFirst = cardsInParent[0];
  if (desiredFirst && currentFirst && desiredFirst !== currentFirst) {
    parent.insertBefore(desiredFirst, currentFirst);
  }

  for (let i = 1; i < desired.length; i += 1) {
    const prevKey = desired[i - 1];
    const currKey = desired[i];
    if (!prevKey || !currKey) continue;
    const prev = byKey[prevKey];
    const curr = byKey[currKey];
    if (!prev || !curr) continue;
    if (prev.nextElementSibling !== curr) {
      prev.insertAdjacentElement("afterend", curr);
    }
  }
}

function findBuyOrderTable(root: ParentNode = document): HTMLTableElement | null {
  for (const selector of BUY_ORDER_TABLE_SELECTORS) {
    const table = root.querySelector<HTMLTableElement>(selector);
    if (table) return table;
  }

  return null;
}

function isElementVisible(node: Element | null): boolean {
  if (!(node instanceof HTMLElement)) return false;
  if (node.hidden) return false;
  const style = window.getComputedStyle(node);
  if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0) return false;
  const rect = node.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

function parseQuantityFromCellText(text: string): number | null {
  const compact = text.replace(/\s+/g, " ").trim();
  if (!compact) return null;
  const match = compact.match(/\d+/);
  if (!match?.[0]) return null;
  const parsed = Number(match[0]);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.floor(parsed);
}

function parseActiveBuyOrderFromBootstrapScripts(): { price: number; qty: number } | null {
  let priceRaw = "";
  let qtyRaw = "";

  const qtyRegex = /(?:\$|jQuery)\s*\(\s*['"]\.boamount['"]\s*\)\s*\.val\(\s*['"]?([\d.,]+)['"]?\s*\)/i;
  const priceRegex = /(?:\$|jQuery)\s*\(\s*['"]\.boprice['"]\s*\)\s*\.val\(\s*['"]?([\d.,]+)['"]?\s*\)/i;

  document.querySelectorAll<HTMLScriptElement>("script").forEach((script) => {
    const text = script.textContent || "";
    if (!text) return;

    const qtyMatch = text.match(qtyRegex);
    const priceMatch = text.match(priceRegex);
    if (qtyMatch?.[1]) qtyRaw = qtyMatch[1];
    if (priceMatch?.[1]) priceRaw = priceMatch[1];
  });

  if (!qtyRaw || !priceRaw) return null;

  const qtyParsed = Number(qtyRaw.replace(/[^\d]/g, ""));
  const priceParsed = parseMoney(priceRaw);
  if (!Number.isFinite(qtyParsed) || qtyParsed <= 0) return null;
  if (!priceParsed || !validatePrice(priceParsed)) return null;

  return {
    price: priceParsed,
    qty: Math.floor(qtyParsed)
  };
}

function parseQuantityRules(raw: string): Array<{ maxPrice: number; quantity: number }> {
  const lines = raw
    .split(/[,;\n]/)
    .map((line) => line.trim())
    .filter(Boolean);

  const rules: Array<{ maxPrice: number; quantity: number }> = [];

  for (const line of lines) {
    const match = line.match(/^([\d.,]+)\s*[:=]\s*(\d+)$/);
    if (!match) continue;
    const rawMaxPrice = match[1];
    const rawQuantity = match[2];
    if (!rawMaxPrice || !rawQuantity) continue;
    const maxPrice = Number(rawMaxPrice.replace(",", "."));
    const quantity = Number(rawQuantity);
    if (!Number.isFinite(maxPrice) || !Number.isFinite(quantity) || quantity <= 0) continue;
    rules.push({ maxPrice, quantity: Math.floor(quantity) });
  }

  return rules.sort((a, b) => a.maxPrice - b.maxPrice);
}

function resolveQuantityByPrice(price: number, rawRules: string): number {
  const rules = parseQuantityRules(rawRules);
  if (rules.length === 0) return 1;

  for (const rule of rules) {
    if (price <= rule.maxPrice) return rule.quantity;
  }

  return rules[rules.length - 1]?.quantity ?? 1;
}

function parsePriceFromCellText(text: string): number | null {
  const parsed = parseMoney(text);
  if (!parsed || !validatePrice(parsed)) return null;
  return parsed;
}

function parseMoneyFromElement(node: Element | null): number | null {
  if (!node) return null;

  const candidates: string[] = [];
  const ownTitle = node.getAttribute("data-bs-original-title") || node.getAttribute("title") || "";
  if (ownTitle) candidates.push(ownTitle);

  const nestedTitleNode = node.querySelector<HTMLElement>("[data-bs-original-title], [title]");
  const nestedTitle = nestedTitleNode?.getAttribute("data-bs-original-title") || nestedTitleNode?.getAttribute("title") || "";
  if (nestedTitle) candidates.push(nestedTitle);

  const text = (node.textContent || "").trim();
  if (text) candidates.push(text);

  for (const candidate of candidates) {
    const parsed = parseMoney(candidate);
    if (parsed && validatePrice(parsed)) return parsed;
  }

  return null;
}

function getCurrentCurrencyCode(): string {
  const code = (document.querySelector<HTMLElement>("#dropdown-currency")?.textContent || "").trim().toUpperCase();
  return /^[A-Z]{3}$/.test(code) ? code : "USD";
}

function formatCurrency(value: number): string {
  const code = getCurrentCurrencyCode();
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: code,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  } catch {
    return `$${value.toFixed(2)}`;
  }
}

function getHighestBuyOrderPrice(): number | null {
  const buyOrdersCard = findBuyOrdersCard();
  if (!buyOrdersCard) return null;

  const table = findBuyOrderTable(buyOrdersCard);
  if (!table) return null;

  const rows = table.querySelectorAll<HTMLTableRowElement>("tr");
  let highest: number | null = null;

  rows.forEach((row) => {
    const firstCell = row.querySelector<HTMLElement>("td");
    if (!firstCell?.textContent) return;
    const value = parsePriceFromCellText(firstCell.textContent);
    if (!value) return;
    highest = highest === null ? value : Math.max(highest, value);
  });

  return highest;
}

function getLowestBuyOrderPrice(): number | null {
  const buyOrdersCard = findBuyOrdersCard();
  if (!buyOrdersCard) return null;

  const table = findBuyOrderTable(buyOrdersCard);
  if (!table) return null;

  const rows = table.querySelectorAll<HTMLTableRowElement>("tr");
  let lowest: number | null = null;

  rows.forEach((row) => {
    const firstCell = row.querySelector<HTMLElement>("td");
    if (!firstCell?.textContent) return;
    const value = parsePriceFromCellText(firstCell.textContent);
    if (!value) return;
    lowest = lowest === null ? value : Math.min(lowest, value);
  });

  return lowest;
}

function getLowestListingPrice(): number | null {
  for (const selector of LOWEST_PRICE_SELECTORS) {
    const node = document.querySelector<HTMLElement>(selector);
    const value = parseMoneyFromElement(node);
    if (value) return value;
  }

  return null;
}

function normalizeItemName(raw: string): string {
  return raw.replace(/\s+/g, " ").trim();
}

function getProviderLogoUrl(providerId: string): string {
  const rel = PROVIDER_LOGO_BY_ID[providerId];
  if (!rel) return "";
  return chrome.runtime.getURL(rel);
}

function resolveExternalLookupItemName(contextItemName: string | null): string {
  const fromCart = document.querySelector<HTMLAnchorElement>("#transacContent a.acCart[itemname]")?.getAttribute("itemname");
  const cartName = normalizeItemName(fromCart || "");
  if (cartName) return cartName;

  const h1 = normalizeItemName(document.querySelector<HTMLElement>("h1")?.textContent || "");
  if (h1 && h1.toLowerCase() !== "item details") {
    return h1;
  }

  const rowNameCell = document.querySelector<HTMLElement>("#transacContent tr.itemListPagination td:nth-child(2)");
  const rowNameRaw = normalizeItemName(rowNameCell?.childNodes?.[0]?.textContent || rowNameCell?.textContent || "");
  if (rowNameRaw) {
    return rowNameRaw.replace(/\s*\([^)]*\)\s*$/, "").trim();
  }

  return normalizeItemName(contextItemName || "");
}

type ExternalPriceRowView = {
  id: string;
  label: string;
  value: string;
  note?: string;
  url?: string;
  loading?: boolean;
  state: "ok" | "unavailable" | "error";
};

function buildInitialExternalPriceRows(): ExternalPriceRowView[] {
  const lowestListing = getLowestListingPrice();
  const rows: ExternalPriceRowView[] = [
    {
      id: "mannco",
      label: "Mannco lowest",
      value: lowestListing ? `$${lowestListing.toFixed(2)}` : "-",
      note: lowestListing ? "Current page listing reference" : "Listing unavailable on page",
      state: lowestListing ? "ok" : "unavailable"
    }
  ];

  EXTERNAL_PRICE_PROVIDERS.forEach((provider) => {
    rows.push({
      id: provider.id,
      label: provider.label,
      value: "Loading...",
      note: "Fetching provider data",
      url: provider.buildUrl(""),
      loading: true,
      state: "unavailable"
    });
  });

  return rows;
}

async function fetchExternalPriceProvider(providerId: ExternalPriceProviderId, itemName: string): Promise<ExternalPriceEntry | null> {
  const key = `${normalizeItemName(itemName).toLowerCase()}::${providerId}`;
  const cached = externalPriceProviderCache.get(key);
  if (cached && Date.now() - cached.at < EXTERNAL_PRICE_CACHE_MS) {
    return cached.price;
  }

  const inflight = externalPriceProviderInflight.get(key);
  if (inflight) return inflight;

  const request = chrome.runtime
    .sendMessage({ type: "FETCH_EXTERNAL_PRICE_PROVIDER", itemName: normalizeItemName(itemName), providerId })
    .then((response: FetchExternalPriceProviderResponse) => {
      if (!response || !response.ok) return null;
      externalPriceProviderCache.set(key, { at: Date.now(), price: response.price });
      return response.price;
    })
    .catch(() => null)
    .finally(() => {
      externalPriceProviderInflight.delete(key);
    });

  externalPriceProviderInflight.set(key, request);
  return request;
}

function renderExternalPriceImageTooltip(itemName: string, rows: ExternalPriceRowView[]): void {
  const aside = document.querySelector<HTMLElement>(".item-info__aside");
  if (!aside) return;

  const existingHint = document.getElementById(EXTERNAL_PRICE_IMAGE_HINT_ID) as HTMLElement | null;
  const existingTooltip = document.getElementById(EXTERNAL_PRICE_IMAGE_TOOLTIP_ID) as HTMLElement | null;

  const hint = existingHint ?? document.createElement("span");
  hint.id = EXTERNAL_PRICE_IMAGE_HINT_ID;
  hint.textContent = "i";
  hint.setAttribute("aria-label", "External price details");
  hint.title = "External price tooltip";
  const topIconUrl = chrome.runtime.getURL("assets/SteamLogo.png");
  if (hint.style.backgroundImage !== `url("${topIconUrl}")`) {
    hint.style.backgroundImage = `url("${topIconUrl}")`;
  }

  const tooltip = existingTooltip ?? document.createElement("div");
  tooltip.id = EXTERNAL_PRICE_IMAGE_TOOLTIP_ID;

  const tooltipRows = rows
    .map((row) => {
      const stateClass = row.state === "ok" ? EXTERNAL_PRICE_STATE_OK_CLASS : EXTERNAL_PRICE_STATE_BAD_CLASS;
      const safeLabel = row.label.replace(/[&<>]/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[m] || m));
      const safeValue = row.value.replace(/[&<>]/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[m] || m));
      const safeNote = (row.note || "").replace(/[&<>]/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[m] || m));
      const safeUrl = (row.url || "").replace(/"/g, "&quot;");
      const logoUrl = getProviderLogoUrl(row.id);
      const logo = logoUrl ? `<img src=\"${logoUrl}\" alt=\"\" loading=\"lazy\" decoding=\"async\"/>` : "";
      const link = row.url ? `<a class=\"open\" href=\"${safeUrl}\" target=\"_blank\" rel=\"noreferrer noopener\">Open</a>` : "";
      const noteHtml = safeNote ? `<div class=\"note\">${safeNote}</div>` : "";
      const valueHtml = row.loading ? `<span style=\"opacity:.82\">${safeValue}</span>` : safeValue;
      return `<div class=\"${EXTERNAL_PRICE_CARD_TILE_CLASS} ${stateClass}\"><div class=\"label\">${logo}<span>${safeLabel}</span></div><div class=\"value\">${valueHtml}</div>${noteHtml}${link}</div>`;
    })
    .join("");

  const html = `<div class="title">${itemName}</div><div class="grid">${tooltipRows}</div>`;
  if (tooltip.innerHTML !== html) {
    tooltip.innerHTML = html;
  }

  const placeTooltip = (): void => {
    const rect = hint.getBoundingClientRect();
    const preferredLeft = rect.right + 10;
    const preferredTop = rect.top - 4;
    const left = Math.min(preferredLeft, window.innerWidth - tooltip.offsetWidth - 8);
    const top = Math.min(Math.max(8, preferredTop), window.innerHeight - tooltip.offsetHeight - 8);
    tooltip.style.left = `${Math.max(8, left)}px`;
    tooltip.style.top = `${top}px`;
  };

  const openTooltip = (): void => {
    placeTooltip();
    tooltip.classList.add("is-visible");
  };
  const closeTooltip = (): void => {
    tooltip.classList.remove("is-visible");
  };
  const toggleTooltip = (): void => {
    if (tooltip.classList.contains("is-visible")) {
      closeTooltip();
      return;
    }
    openTooltip();
  };

  if (!hint.dataset.manncoEnhancerPriceTooltipBound) {
    hint.dataset.manncoEnhancerPriceTooltipBound = "1";
    hint.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      toggleTooltip();
    });
    tooltip.addEventListener("click", (event) => {
      event.stopPropagation();
    });
    document.addEventListener("click", (event) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (hint.contains(target) || tooltip.contains(target)) return;
      closeTooltip();
    });
    window.addEventListener("scroll", () => {
      if (tooltip.classList.contains("is-visible")) placeTooltip();
    });
    window.addEventListener("resize", () => {
      if (tooltip.classList.contains("is-visible")) placeTooltip();
    });
  }

  if (hint.parentElement !== aside) {
    aside.appendChild(hint);
  }

  if (!tooltip.parentElement) {
    document.body.appendChild(tooltip);
  }
}

function applyExternalMarketPrices(enabled: boolean, itemName: string | null): void {
  const existingHint = document.getElementById(EXTERNAL_PRICE_IMAGE_HINT_ID);
  const existingTooltip = document.getElementById(EXTERNAL_PRICE_IMAGE_TOOLTIP_ID);
  if (!enabled) {
    document.getElementById(EXTERNAL_PRICE_CARD_ID)?.remove();
    existingHint?.remove();
    existingTooltip?.remove();
    return;
  }

  const normalizedName = resolveExternalLookupItemName(itemName);
  if (!normalizedName) {
    document.getElementById(EXTERNAL_PRICE_CARD_ID)?.remove();
    existingHint?.remove();
    existingTooltip?.remove();
    return;
  }

  const token = ++externalOverlayToken;
  const rows = buildInitialExternalPriceRows();
  renderExternalPriceImageTooltip(normalizedName, rows);

  EXTERNAL_PRICE_PROVIDERS.forEach((provider) => {
    void fetchExternalPriceProvider(provider.id, normalizedName).then((entry) => {
      if (token !== externalOverlayToken) return;

      const idx = rows.findIndex((row) => row.id === provider.id);
      if (idx < 0) return;

      if (!entry) {
        rows[idx] = {
          id: provider.id,
          label: provider.label,
          value: "Error",
          note: "Failed to fetch provider data",
          url: provider.buildUrl(normalizedName),
          loading: false,
          state: "error"
        };
      } else {
        rows[idx] = {
          id: provider.id,
          label: entry.label,
          value: entry.priceText,
          note: entry.note,
          url: entry.url || provider.buildUrl(normalizedName),
          loading: false,
          state: entry.state
        };
      }

      renderExternalPriceImageTooltip(normalizedName, rows);
    });
  });
}

function applyItemVisibilityOptions(settings: {
  enabled: boolean;
  globalHideBreadcrumbs: boolean;
  itemHideDetailsTitle: boolean;
  itemHideBuyOrderHint: boolean;
  itemHideTf2ShopButton: boolean;
}): void {
  const breadcrumbs = document.querySelector<HTMLElement>("nav[aria-label='breadcrumb']")?.parentElement;
  if (breadcrumbs) {
    breadcrumbs.style.display = settings.enabled && settings.globalHideBreadcrumbs ? "none" : "";
  }

  const breadcrumbNav = document.querySelector<HTMLElement>(
    "nav[aria-label='breadcrumb'], nav[aria-label='Breadcrumb'], nav[aria-label*='breadcrumb' i]"
  );
  const detailsTitle =
    breadcrumbNav?.parentElement?.querySelector<HTMLElement>("h1") ||
    document.querySelector<HTMLElement>("#content h1.mb-0") ||
    document.querySelector<HTMLElement>(".page-content h1.mb-0");
  if (detailsTitle) {
    detailsTitle.style.display = settings.enabled && settings.itemHideDetailsTitle ? "none" : "";
  }

  const placingText = document.querySelector<HTMLElement>(".placingtext");
  if (placingText) {
    placingText.style.display = settings.enabled && settings.itemHideBuyOrderHint ? "none" : "";
  }

  const tf2ShopButtons = Array.from(
    document.querySelectorAll<HTMLElement>(".btn.btn-tf2shop, a.btn-tf2shop, button.btn-tf2shop")
  );
  const shouldHideTf2Shop = settings.enabled && settings.itemHideTf2ShopButton;
  tf2ShopButtons.forEach((button) => {
    if (shouldHideTf2Shop) {
      button.style.setProperty("display", "none", "important");
    } else {
      button.style.removeProperty("display");
    }

    const cardBody = button.closest<HTMLElement>(".card-body");
    if (!cardBody) return;

    const localSeparators = Array.from(cardBody.querySelectorAll<HTMLElement>("span.separator.separator--md.mt-3"));
    localSeparators.forEach((separator) => {
      if (shouldHideTf2Shop) {
        separator.style.setProperty("display", "none", "important");
      } else {
        separator.style.removeProperty("display");
      }
    });
  });

  const tf2ShopSeparators = Array.from(document.querySelectorAll<HTMLElement>("span.separator.separator--md.mt-3"));
  tf2ShopSeparators.forEach((separator) => {
    if (shouldHideTf2Shop) {
      separator.style.setProperty("display", "none", "important");
    } else {
      separator.style.removeProperty("display");
    }
  });
}

function applyChartMode(mode: "keep" | "minimize" | "hide" | "afterBuyOrders", enabled: boolean): void {
  const chart = document.getElementById("sales-chart");
  const chartCard = chart?.closest<HTMLElement>(".card");
  if (!chart || !chartCard) return;

  if (!originalChartParent) {
    originalChartParent = chartCard.parentNode;
    originalChartNextSibling = chartCard.nextSibling;
  }

  chartCard.style.display = "";
  chart.style.display = "";
  chartCard.style.maxHeight = "";
  chartCard.style.overflow = "";
  chart.style.maxHeight = "";
  chart.style.width = "";

  const existingToggle = document.getElementById(CHART_TOGGLE_BUTTON_ID) as HTMLButtonElement | null;

  if (!enabled || mode === "keep") {
    existingToggle?.remove();
    chart.dataset.manncoEnhancerCollapsed = "0";

    if (originalChartParent) {
      if (originalChartNextSibling) {
        originalChartParent.insertBefore(chartCard, originalChartNextSibling);
      } else {
        originalChartParent.appendChild(chartCard);
      }
    }
    return;
  }

  if (mode === "hide") {
    existingToggle?.remove();
    chartCard.style.display = "none";
    return;
  }

  if (mode === "minimize") {
    const header = chartCard.querySelector<HTMLElement>("h3");
    if (header) {
      const toggle =
        existingToggle ??
        (() => {
          const node = document.createElement("button");
          node.id = CHART_TOGGLE_BUTTON_ID;
          node.type = "button";
          node.setAttribute(
            "style",
            "float:right;margin-left:8px;padding:2px 8px;font-size:11px;border:1px solid #5d7387;border-radius:6px;background:#1f2c37;color:#dceaf6;cursor:pointer;"
          );
          return node;
        })();

      if (!toggle.dataset.bound) {
        toggle.dataset.bound = "1";
        toggle.addEventListener("click", () => {
          const isCollapsed = chart.dataset.manncoEnhancerCollapsed !== "0";
          chart.dataset.manncoEnhancerCollapsed = isCollapsed ? "0" : "1";
          const nextCollapsed = chart.dataset.manncoEnhancerCollapsed !== "0";
          chart.style.display = nextCollapsed ? "none" : "block";
          chartCard.style.maxHeight = nextCollapsed ? "66px" : "";
          chartCard.style.overflow = nextCollapsed ? "hidden" : "";
          toggle.textContent = nextCollapsed ? "Expand" : "Collapse";
        });
      }

      if (!toggle.parentElement) {
        header.appendChild(toggle);
      }

      if (!chart.dataset.manncoEnhancerCollapsed) {
        chart.dataset.manncoEnhancerCollapsed = "1";
      }

      const collapsed = chart.dataset.manncoEnhancerCollapsed !== "0";
      chart.style.display = collapsed ? "none" : "block";
      chartCard.style.maxHeight = collapsed ? "66px" : "";
      chartCard.style.overflow = collapsed ? "hidden" : "";
      toggle.textContent = collapsed ? "Expand" : "Collapse";
    }

    return;
  }

  existingToggle?.remove();
  const buyOrdersCard = findBuyOrdersCard();
  if (mode === "afterBuyOrders" && buyOrdersCard?.parentNode) {
    if (buyOrdersCard.nextElementSibling !== chartCard) {
      buyOrdersCard.insertAdjacentElement("afterend", chartCard);
    }
    const parent = buyOrdersCard.parentElement;
    if (parent && parent === chartCard.parentElement && window.getComputedStyle(parent).display.includes("flex")) {
      buyOrdersCard.style.order = "2";
      chartCard.style.order = "3";
    }
  }
}

function applyBuyOrderAutoFill(settings: {
  enabled: boolean;
  itemAutoFillBuyOrderPrice: boolean;
  itemBuyOrderQuantityRules: string;
}): void {
  if (!settings.enabled || !settings.itemAutoFillBuyOrderPrice) return;

  const priceInput = findBuyOrderInput();
  const qtyInput = findBuyOrderQtyInput();
  if (!priceInput) return;

  if (!priceInput.dataset.boundManual) {
    priceInput.dataset.boundManual = "1";
    priceInput.addEventListener("input", () => {
      priceInput.dataset.manual = "1";
    });
  }

  if (qtyInput && !qtyInput.dataset.boundManual) {
    qtyInput.dataset.boundManual = "1";
    qtyInput.addEventListener("input", () => {
      qtyInput.dataset.manual = "1";
    });
  }

  if (priceInput.dataset.manual === "1") return;

  const ref = getHighestBuyOrderPrice() ?? getReferencePrice();
  if (!ref) return;

  const suggested = Number((ref + 0.01).toFixed(2));
  if (!validatePrice(suggested)) return;

  setBuyOrderFields(suggested, settings.itemBuyOrderQuantityRules, false);
}

function applyBuyOrderTooltips(settings: { enabled: boolean; itemAutoFillBuyOrderPrice: boolean; itemBuyOrderQuantityRules: string }): void {
  const priceInput = findBuyOrderInput();
  const qtyInput = findBuyOrderQtyInput();

  const priceHelp = settings.enabled && settings.itemAutoFillBuyOrderPrice
    ? "Auto-fill on: uses highest buy order + 0.01. No auto submit."
    : "Buy order price input.";

  if (priceInput) {
    priceInput.title = priceHelp;
  }

  if (qtyInput) {
    const rulesText = settings.itemBuyOrderQuantityRules.replace(/\s+/g, " ");
    qtyInput.title = `Quantity rules: ${rulesText}`;
  }
}

function setBuyOrderFields(price: number, rawRules: string, markManual: boolean): void {
  const priceInput = findBuyOrderInput();
  const qtyInput = findBuyOrderQtyInput();
  if (!priceInput || !validatePrice(price)) return;

  if (markManual) {
    priceInput.dataset.manual = "1";
    if (qtyInput) qtyInput.dataset.manual = "1";
  }

  const nextPrice = price.toFixed(2);
  if (priceInput.value !== nextPrice) {
    priceInput.value = nextPrice;
    priceInput.dataset.auto = "1";
    priceInput.dispatchEvent(new Event("input", { bubbles: true }));
    priceInput.dispatchEvent(new Event("change", { bubbles: true }));
  }

  if (qtyInput && qtyInput.dataset.manual !== "1") {
    const qty = resolveQuantityByPrice(price, rawRules);
    const nextQty = String(qty);
    if (qtyInput.value !== nextQty) {
      qtyInput.value = nextQty;
      qtyInput.dataset.auto = "1";
      qtyInput.dispatchEvent(new Event("input", { bubbles: true }));
      qtyInput.dispatchEvent(new Event("change", { bubbles: true }));
    }
  }
}

function parseInputValue(input: HTMLInputElement): number {
  const parsed = parseMoney(input.value || "");
  return Number.isFinite(parsed) && parsed !== null ? parsed : 0;
}

function setInputValue(input: HTMLInputElement, value: number, decimals: number): void {
  const normalized = latestPreventNegative ? Math.max(0, value) : value;
  const next = decimals === 0 ? String(Math.max(0, Math.floor(normalized))) : normalized.toFixed(decimals);
  if (input.value !== next) {
    input.value = next;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }
}

function ensureStepper(input: HTMLInputElement, step: number, decimals: number, mode: "quantity" | "price"): void {
  if (mode === "quantity") {
    const legacy = input.parentElement?.querySelector(`.${STEP_WRAP_CLASS}[data-step-mode='quantity']`) as HTMLDivElement | null;
    legacy?.remove();

    if (input.parentElement?.classList.contains(STEP_INLINE_ROW_CLASS)) {
      return;
    }

    const inlineRow = document.createElement("div");
    inlineRow.className = STEP_INLINE_ROW_CLASS;
    inlineRow.dataset.stepMode = "quantity";

    const minus = document.createElement("button");
    minus.type = "button";
    minus.className = STEP_BUTTON_CLASS;
    minus.textContent = "-";

    const plus = document.createElement("button");
    plus.type = "button";
    plus.className = STEP_BUTTON_CLASS;
    plus.textContent = "+";

    plus.addEventListener("click", () => {
      const next = parseInputValue(input) + step;
      setInputValue(input, next, decimals);
    });

    minus.addEventListener("click", () => {
      const next = parseInputValue(input) - step;
      setInputValue(input, next, decimals);
    });

    input.insertAdjacentElement("beforebegin", inlineRow);
    inlineRow.appendChild(minus);
    inlineRow.appendChild(input);
    inlineRow.appendChild(plus);
    return;
  }

  if (mode === "price" && input.parentElement?.classList.contains("input-group")) {
    const group = input.parentElement;
    const legacy = group.querySelector(`.${STEP_WRAP_CLASS}[data-step-mode='price']`) as HTMLDivElement | null;
    legacy?.remove();

    let minus = group.querySelector<HTMLButtonElement>(`.${STEP_INPUTGROUP_BUTTON_CLASS}[data-step-role='minus']`);
    let plus = group.querySelector<HTMLButtonElement>(`.${STEP_INPUTGROUP_BUTTON_CLASS}[data-step-role='plus']`);

    const suffix = group.querySelector("#recipient-username-addon");

    if (!minus) {
      minus = document.createElement("button");
      minus.type = "button";
      minus.className = `${STEP_BUTTON_CLASS} ${STEP_PRICE_BUTTON_CLASS} ${STEP_INPUTGROUP_BUTTON_CLASS} input-group-text`;
      minus.dataset.stepRole = "minus";
      minus.textContent = "-0.01";
    }

    if (!plus) {
      plus = document.createElement("button");
      plus.type = "button";
      plus.className = `${STEP_BUTTON_CLASS} ${STEP_PRICE_BUTTON_CLASS} ${STEP_INPUTGROUP_BUTTON_CLASS} input-group-text`;
      plus.dataset.stepRole = "plus";
      plus.textContent = "+0.01";
    }

    minus.onclick = () => {
      const next = parseInputValue(input) - step;
      setInputValue(input, next, decimals);
    };

    plus.onclick = () => {
      const next = parseInputValue(input) + step;
      setInputValue(input, next, decimals);
    };

    if (minus.parentElement !== group) {
      group.insertBefore(minus, input);
    }

    if (suffix && suffix.parentElement === group) {
      if (plus.parentElement !== group) {
        suffix.insertAdjacentElement("afterend", plus);
      } else if (suffix.nextElementSibling !== plus) {
        suffix.insertAdjacentElement("afterend", plus);
      }
    } else {
      if (plus.parentElement !== group) group.appendChild(plus);
    }

    return;
  }

  const existing = input.parentElement?.querySelector(`.${STEP_WRAP_CLASS}[data-step-mode='${mode}']`) as HTMLDivElement | null;
  if (existing) return;

  const wrap = document.createElement("div");
  wrap.className = STEP_WRAP_CLASS;
  wrap.dataset.stepMode = mode;

  const down = document.createElement("button");
  down.type = "button";
  down.className = `${STEP_BUTTON_CLASS}${mode === "price" ? ` ${STEP_PRICE_BUTTON_CLASS}` : ""}`;
  down.textContent = mode === "price" ? "-0.01" : "-1";

  const up = document.createElement("button");
  up.type = "button";
  up.className = `${STEP_BUTTON_CLASS}${mode === "price" ? ` ${STEP_PRICE_BUTTON_CLASS}` : ""}`;
  up.textContent = mode === "price" ? "+0.01" : "+1";

  down.addEventListener("click", () => {
    const next = parseInputValue(input) - step;
    setInputValue(input, next, decimals);
  });

  up.addEventListener("click", () => {
    const next = parseInputValue(input) + step;
    setInputValue(input, next, decimals);
  });

  wrap.appendChild(down);
  wrap.appendChild(up);
  input.insertAdjacentElement("afterend", wrap);
}

function bindWheelStep(input: HTMLInputElement, step: number, decimals: number): void {
  if (input.dataset.boundWheel) return;
  input.dataset.boundWheel = "1";

  input.addEventListener(
    "wheel",
    (event) => {
      if (!latestEnabled) return;
      event.preventDefault();
      const delta = event.deltaY < 0 ? step : -step;
      const next = parseInputValue(input) + delta;
      setInputValue(input, next, decimals);
    },
    { passive: false }
  );
}

function bindNonNegativeGuard(input: HTMLInputElement, decimals: number): void {
  if (input.dataset.boundNonNegative) return;
  input.dataset.boundNonNegative = "1";

  const clamp = (): void => {
    if (!latestPreventNegative) return;
    const value = parseInputValue(input);
    if (value < 0) {
      setInputValue(input, 0, decimals);
    }
  };

  input.addEventListener("input", clamp);
  input.addEventListener("change", clamp);
}

function enhanceQuantityAndPriceInputs(settings: {
  enabled: boolean;
  itemPreventNegativeInputs: boolean;
}): void {
  latestEnabled = settings.enabled;
  latestPreventNegative = settings.itemPreventNegativeInputs;

  const addToCartQty = document.querySelector<HTMLInputElement>(".card-body.border-top input.inputnb");
  if (addToCartQty) {
    ensureStepper(addToCartQty, 1, 0, "quantity");
    bindWheelStep(addToCartQty, 1, 0);
    bindNonNegativeGuard(addToCartQty, 0);
  }

  const buyQty = findBuyOrderQtyInput();
  if (buyQty) {
    ensureStepper(buyQty, 1, 0, "quantity");
    bindWheelStep(buyQty, 1, 0);
    bindNonNegativeGuard(buyQty, 0);
  }

  const buyPrice = findBuyOrderInput();
  if (buyPrice) {
    ensureStepper(buyPrice, 0.01, 2, "price");
    bindWheelStep(buyPrice, 0.01, 2);
    bindNonNegativeGuard(buyPrice, 2);
  }
}

function enhanceOfferCreateModal(settings: {
  enabled: boolean;
  itemPreventNegativeInputs: boolean;
}): void {
  const modal = document.querySelector<HTMLElement>(OFFER_MODAL_SELECTOR);
  const offerInput = document.querySelector<HTMLInputElement>(OFFER_INPUT_SELECTOR);
  if (!modal || !offerInput) return;

  const isVisible = modal.classList.contains("show") || modal.style.display === "block";
  if (!isVisible) {
    offerInput.dataset.manual = "";
    offerInput.dataset.offerAutoFilled = "";
    const existing = modal.querySelector<HTMLElement>(`#${OFFER_REFERENCE_TABLE_ID}`);
    existing?.remove();
    return;
  }

  if (!offerInput.dataset.boundManual) {
    offerInput.dataset.boundManual = "1";
    offerInput.addEventListener("input", () => {
      offerInput.dataset.manual = "1";
    });
  }

  ensureStepper(offerInput, 0.01, 2, "quantity");
  bindWheelStep(offerInput, 0.01, 2);
  if (settings.itemPreventNegativeInputs) {
    bindNonNegativeGuard(offerInput, 2);
  }

  if (!settings.enabled) return;
  if (offerInput.dataset.manual === "1") return;
  if (offerInput.dataset.offerAutoFilled === "1") return;

  const buyOrderInput = findBuyOrderInput();
  const fromField = buyOrderInput?.value ? parseMoney(buyOrderInput.value) : null;
  const topBuyOrder = getHighestBuyOrderPrice();
  const base = fromField && validatePrice(fromField) ? fromField : topBuyOrder;
  if (!base || !validatePrice(base)) return;

  setInputValue(offerInput, base, 2);
  offerInput.dataset.offerAutoFilled = "1";

  const modalBody = modal.querySelector<HTMLElement>(".modal-body");
  if (modalBody) {
    const sourceTable = findBuyOrderTable(findBuyOrdersCard() ?? document);
    const rows = sourceTable ? Array.from(sourceTable.querySelectorAll<HTMLTableRowElement>("tr")) : [];
      const ladderRows = rows
        .slice(1)
        .map((row) => {
          const cells = row.querySelectorAll<HTMLElement>("td");
          const priceText = (cells[0]?.textContent || "").trim();
          const qtyText = (cells[1]?.textContent || "").trim();
          const priceValue = parsePriceFromCellText(priceText);
          return { priceText, qtyText, priceValue };
        })
        .filter((entry) => Boolean(entry.priceText && entry.priceValue))
        .slice(0, 6);

    const existing = modalBody.querySelector<HTMLElement>(`#${OFFER_REFERENCE_TABLE_ID}`);
    if (ladderRows.length === 0) {
      existing?.remove();
    } else {
      const block = existing ?? document.createElement("div");
      block.id = OFFER_REFERENCE_TABLE_ID;
      const htmlRows = ladderRows
        .map(
          (entry) =>
            `<div class=\"row\" data-price=\"${entry.priceValue?.toFixed(2) || ""}\"><span>${entry.priceText}${entry.qtyText ? `<span class=\"qty\">qty ${entry.qtyText}</span>` : ""}</span><span>match</span></div>`
        )
        .join("");
      const html = `<div class=\"title\">Buy Orders</div>${htmlRows}`;
      if (block.innerHTML !== html) block.innerHTML = html;
      if (!block.dataset.boundClick) {
        block.dataset.boundClick = "1";
        block.addEventListener("click", (event) => {
          const target = event.target as HTMLElement | null;
          if (!target) return;
          const rowNode = target.closest<HTMLElement>(".row[data-price]");
          if (!rowNode) return;
          const price = Number(rowNode.dataset.price || "");
          if (!Number.isFinite(price) || price <= 0) return;
          setInputValue(offerInput, price, 2);
          offerInput.dataset.manual = "1";
        });
      }
      if (!existing) {
        const sendButton = modalBody.querySelector<HTMLElement>(".btn.btn-primary");
        if (sendButton) {
          sendButton.insertAdjacentElement("beforebegin", block);
        } else {
          modalBody.appendChild(block);
        }
      }
    }
  }
}

function ensureBuyOrderQuickMatchButton(settings: {
  enabled: boolean;
  itemAutoFillBuyOrderPrice: boolean;
  itemBuyOrderQuantityRules: string;
}): void {
  const actions =
    document.querySelector<HTMLElement>(".nologinbo .d-grid.gap-2.d-md-flex") ||
    document.querySelector<HTMLElement>(".nologinbo .d-grid");
  if (!actions) return;

  actions.classList.add(BUY_ORDER_ACTIONS_CLASS);

  const existing = document.getElementById(BUY_ORDER_HELPER_BUTTON_ID) as HTMLButtonElement | null;
  if (!settings.enabled || !settings.itemAutoFillBuyOrderPrice) {
    existing?.remove();
    return;
  }

  const button =
    existing ??
    (() => {
      const node = document.createElement("button");
      node.id = BUY_ORDER_HELPER_BUTTON_ID;
      node.type = "button";
      node.textContent = "Match top +0.01";
      node.dataset.i18nKey = "content.matchTop";
      return node;
    })();

  button.onclick = () => {
    const top = getHighestBuyOrderPrice() ?? getReferencePrice();
    if (!top) return;
    const suggested = Number((top + 0.01).toFixed(2));
    setBuyOrderFields(suggested, settings.itemBuyOrderQuantityRules, false);
  };

  if (!button.parentElement) {
    actions.appendChild(button);
  }
}

function enhanceBuyOrderActionButtons(): void {
  const actions =
    document.querySelector<HTMLElement>(".nologinbo .d-grid.gap-2.d-md-flex") ||
    document.querySelector<HTMLElement>(".nologinbo .d-grid");
  if (!actions) return;

  actions.classList.add(BUY_ORDER_ACTIONS_CLASS);

}

function bindBuyOrderTableRowFill(settings: {
  enabled: boolean;
  itemAutoFillBuyOrderPrice: boolean;
  itemBuyOrderQuantityRules: string;
}): void {
  latestQuantityRules = settings.itemBuyOrderQuantityRules;

  const table = findBuyOrderTable(findBuyOrdersCard() ?? document);
  if (!table) return;

  const rows = table.querySelectorAll<HTMLTableRowElement>("tr");
  rows.forEach((row, index) => {
    if (index === 0) return;
    const priceCell = row.querySelector<HTMLElement>("td");
    if (!priceCell?.textContent) return;
    const rowPrice = parsePriceFromCellText(priceCell.textContent);
    if (!rowPrice) return;

    row.classList.add(BUY_ORDER_CLICKABLE_ROW_CLASS);
    if (!settings.enabled || !settings.itemAutoFillBuyOrderPrice) return;

    if (!row.dataset.boundClick) {
      row.dataset.boundClick = "1";
      row.addEventListener("click", (event) => {
        const target = event.target;
        if (target instanceof Element && target.closest("button,a,input,select,textarea")) return;
        const currentPrice = priceCell.textContent ? parsePriceFromCellText(priceCell.textContent) : null;
        if (!currentPrice) return;
        setBuyOrderFields(currentPrice, latestQuantityRules, true);
      });
    }
  });
}

function bindNegativeFlipSubmitWarning(settings: {
  enabled: boolean;
  itemWarnNegativeFlipOnSubmit: boolean;
}): void {
  latestEnabled = settings.enabled;
  latestWarnNegativeFlip = settings.itemWarnNegativeFlipOnSubmit;

  if (submitGuardBound) return;
  submitGuardBound = true;

  document.addEventListener(
    "click",
    (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const button = target.closest(".addbuyorder") as HTMLElement | null;
      if (!button) return;

      if (!latestEnabled || !latestWarnNegativeFlip) return;

      const input = findBuyOrderInput();
      const lowest = getLowestListingPrice();
      if (!input || !lowest) return;

      const buyPrice = parseMoney(input.value || "");
      if (!buyPrice || !validatePrice(buyPrice)) return;

      const netSell = calcAfterFees(lowest);
      const profit = netSell - buyPrice;
      if (profit >= 0) return;

      const ok = window.confirm(
        `This buy order is negative flip.\\nBuy: ${formatCurrency(buyPrice)}\\nSell net (lowest): ${formatCurrency(netSell)}\\nP/L: ${formatCurrency(profit)}\\n\\nDo you still want to place it?`
      );

      if (!ok) {
        event.preventDefault();
        event.stopPropagation();
        if (typeof (event as Event).stopImmediatePropagation === "function") {
          (event as Event).stopImmediatePropagation();
        }
      }
    },
    true
  );
}

function bindBuyOrderAutoRefreshOnSuccess(settings: {
  enabled: boolean;
}): void {
  if (!settings.enabled) return;
  if (buyOrderToastRefreshBound) return;
  buyOrderToastRefreshBound = true;

  const markPendingBuyOrderSubmit = (): void => {
    pendingBuyOrderSubmitAt = Date.now();
    window.setTimeout(() => {
      if (Date.now() - pendingBuyOrderSubmitAt >= 14000) {
        pendingBuyOrderSubmitAt = 0;
      }
    }, 14500);
  };

  const hasPendingSubmit = (): boolean => {
    if (!pendingBuyOrderSubmitAt) return false;
    if (Date.now() - pendingBuyOrderSubmitAt > 14000) {
      pendingBuyOrderSubmitAt = 0;
      return false;
    }
    return true;
  };

  const evaluateToast = (toastNode: Element): void => {
    if (!hasPendingSubmit()) return;

    const normalizeToastText = (value: string): string => value.replace(/\s+/g, " ").trim().toLowerCase();
    const titleText = normalizeToastText(toastNode.querySelector<HTMLElement>(".iziToast-title")?.textContent || "");
    const messageText = normalizeToastText(toastNode.querySelector<HTMLElement>(".iziToast-message")?.textContent || "");
    const combined = `${titleText} ${messageText}`;
    const toastClasses = toastNode instanceof HTMLElement ? Array.from(toastNode.classList).map((token) => token.toLowerCase()) : [];
    const iconClasses = Array.from(toastNode.querySelector<HTMLElement>(".iziToast-icon")?.classList || []).map((token) => token.toLowerCase());

    const hasErrorClass =
      toastClasses.some((token) => token.includes("color-red") || token.includes("color-orange") || token.includes("color-yellow")) ||
      iconClasses.some((token) => token.includes("error") || token.includes("warning") || token.includes("fail"));

    const hasSuccessClass =
      toastClasses.some((token) => token.includes("color-green") || token.includes("success")) ||
      iconClasses.some((token) => token.includes("success") || token.includes("check"));

    const isError =
      hasErrorClass ||
      titleText.includes("error") ||
      titleText.includes("warning") ||
      combined.includes("already have buy order") ||
      combined.includes("failed") ||
      combined.includes("invalid") ||
      combined.includes("insufficient");

    if (isError) {
      pendingBuyOrderSubmitAt = 0;
      return;
    }

    const isSuccess =
      hasSuccessClass ||
      titleText.includes("success") ||
      (combined.includes("buy order") && (combined.includes("created") || combined.includes("placed") || combined.includes("added")));

    if (!isSuccess) return;

    pendingBuyOrderSubmitAt = 0;
    window.setTimeout(() => {
      window.location.reload();
    }, 700);
  };

  document.addEventListener(
    "click",
    (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const button = target.closest(".addbuyorder") as HTMLElement | null;
      if (!button) return;
      markPendingBuyOrderSubmit();
    },
    true
  );

  const observer = new MutationObserver((mutations) => {
    if (!hasPendingSubmit()) return;

    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (!(node instanceof Element)) return;
        if (node.classList.contains("iziToast")) {
          evaluateToast(node);
          return;
        }

        const nestedToasts = node.querySelectorAll?.(".iziToast");
        nestedToasts?.forEach((toast) => {
          evaluateToast(toast);
        });
      });
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

function applyBuyOrderProfitTable(enabled: boolean): void {
  const buyOrdersCard = findBuyOrdersCard();
  if (!buyOrdersCard) return;

  const table = findBuyOrderTable(buyOrdersCard);
  if (!table) return;

  const summaryExisting = buyOrdersCard.querySelector<HTMLElement>(`#${BUY_ORDER_SUMMARY_ID}`);

  const headerRow = table.querySelector<HTMLTableRowElement>("tr");
  if (!headerRow) return;

  if (!enabled) {
    summaryExisting?.remove();
    table.querySelectorAll(`.${BUY_ORDER_PROFIT_HEADER_CLASS}, .${BUY_ORDER_PROFIT_CELL_CLASS}`).forEach((node) => node.remove());
    return;
  }

  summaryExisting?.remove();

  const lowestListing = getLowestListingPrice();
  const lowestAfterFees = lowestListing ? calcAfterFees(lowestListing) : null;

  let profitHeader = headerRow.querySelector<HTMLTableCellElement>(`.${BUY_ORDER_PROFIT_HEADER_CLASS}`);
  if (!profitHeader) {
    profitHeader = document.createElement("th");
    profitHeader.className = BUY_ORDER_PROFIT_HEADER_CLASS;
    headerRow.appendChild(profitHeader);
  }
  profitHeader.textContent = "Flip P/L @ Lowest";
  profitHeader.title = "Estimated profit if buy order fills and you sell at current lowest listing.";

  const dataRows = table.querySelectorAll<HTMLTableRowElement>("tr");

  dataRows.forEach((row, index) => {
    if (index === 0) return;
    const duplicatedProfitCells = row.querySelectorAll(`.${BUY_ORDER_PROFIT_CELL_CLASS}`);
    if (duplicatedProfitCells.length > 1) {
      for (let i = 1; i < duplicatedProfitCells.length; i += 1) {
        duplicatedProfitCells[i]?.remove();
      }
    }

    const priceCell = row.querySelector<HTMLElement>("td");
    const orderPrice = priceCell?.textContent ? parsePriceFromCellText(priceCell.textContent) : null;

    let profitCell = row.querySelector<HTMLTableCellElement>(`.${BUY_ORDER_PROFIT_CELL_CLASS}`);
    if (!profitCell) {
      profitCell = document.createElement("td");
      profitCell.className = BUY_ORDER_PROFIT_CELL_CLASS;
      row.appendChild(profitCell);
    }

    if (!orderPrice) {
      if (profitCell.textContent !== "-") profitCell.textContent = "-";
      profitCell.removeAttribute("title");
    } else {
      if (!lowestAfterFees) {
        if (profitCell.textContent !== "-") profitCell.textContent = "-";
        profitCell.removeAttribute("title");
      } else {
        const profit = lowestAfterFees - orderPrice;
        const pct = orderPrice > 0 ? (profit / orderPrice) * 100 : 0;
        const sign = profit >= 0 ? "+" : "";
        const nextText = `${sign}${formatCurrency(Math.abs(profit))} (${sign}${pct.toFixed(1)}%)`;
        if (profitCell.textContent !== nextText) {
          profitCell.textContent = nextText;
        }
        const nextTitle = `Buy at ${formatCurrency(orderPrice)} -> sell at lowest ${lowestListing ? formatCurrency(lowestListing) : "-"} (after fees ${formatCurrency(lowestAfterFees)})`;
        if (profitCell.title !== nextTitle) {
          profitCell.title = nextTitle;
        }
      }
    }
  });
}

function applyUserBuyOrderMarker(enabled: boolean): void {
  const buyOrdersCard = findBuyOrdersCard();
  if (!buyOrdersCard) return;

  const clearUserOrderMarker = (): void => {
    const tableNode = findBuyOrderTable(buyOrdersCard);
    tableNode?.querySelectorAll<HTMLTableRowElement>(`.${BUY_ORDER_USER_ROW_CLASS}`).forEach((row) => {
      row.classList.remove(BUY_ORDER_USER_ROW_CLASS);
    });
    tableNode?.querySelectorAll<HTMLElement>(`.${BUY_ORDER_USER_BADGE_CLASS}`).forEach((badge) => {
      badge.remove();
    });
    buyOrdersCard.querySelector<HTMLElement>(`#${BUY_ORDER_USER_NOTICE_ID}`)?.remove();
  };

  if (!enabled) {
    clearUserOrderMarker();
    return;
  }

  const paintUserOrder = (userPrice: number, userQty: number): void => {
    const table = findBuyOrderTable(buyOrdersCard);
    table?.querySelectorAll<HTMLTableRowElement>(`.${BUY_ORDER_USER_ROW_CLASS}`).forEach((row) => {
      row.classList.remove(BUY_ORDER_USER_ROW_CLASS);
    });
    table?.querySelectorAll<HTMLElement>(`.${BUY_ORDER_USER_BADGE_CLASS}`).forEach((badge) => {
      badge.remove();
    });

    const noticeHost =
      buyOrdersCard.querySelector<HTMLElement>(".col-xl-4 .card-body") ||
      buyOrdersCard.querySelector<HTMLElement>(".card-body") ||
      buyOrdersCard;

    let notice = buyOrdersCard.querySelector<HTMLElement>(`#${BUY_ORDER_USER_NOTICE_ID}`);
    if (!notice) {
      notice = document.createElement("div");
      notice.id = BUY_ORDER_USER_NOTICE_ID;
    }

    const header = noticeHost.querySelector<HTMLElement>("h3");
    let desiredParent: HTMLElement = noticeHost;
    if (header) {
      let row = noticeHost.querySelector<HTMLElement>(`.${BUY_ORDER_HEADER_ROW_CLASS}`);
      if (!row) {
        row = document.createElement("div");
        row.className = BUY_ORDER_HEADER_ROW_CLASS;
        header.insertAdjacentElement("beforebegin", row);
        row.appendChild(header);
      }
      desiredParent = row;
    }

    if (notice.parentElement !== desiredParent) {
      notice.remove();
      desiredParent.appendChild(notice);
    }

    if (!table) {
      notice.textContent = `Your active buy order: ${formatCurrency(userPrice)} x${userQty}.`;
      return;
    }

    const rows = Array.from(table.querySelectorAll<HTMLTableRowElement>("tr")).slice(1);
    const priceMatches = rows.filter((row) => {
      const priceCell = row.querySelector<HTMLElement>("td");
      if (!priceCell?.textContent) return false;
      const rowPrice = parsePriceFromCellText(priceCell.textContent);
      if (!rowPrice) return false;
      return Math.abs(rowPrice - userPrice) < 0.0001;
    });

    const exactMatches = priceMatches.filter((row) => {
      const cells = row.querySelectorAll<HTMLElement>("td");
      const qtyText = cells[1]?.textContent || "";
      const rowQty = parseQuantityFromCellText(qtyText);
      return rowQty !== null && rowQty === userQty;
    });

    const matches = exactMatches.length > 0 ? exactMatches : priceMatches;
    matches.forEach((row) => {
      row.classList.add(BUY_ORDER_USER_ROW_CLASS);
      const priceCell = row.querySelector<HTMLElement>("td");
      if (!priceCell || priceCell.querySelector(`.${BUY_ORDER_USER_BADGE_CLASS}`)) return;
      const badge = document.createElement("span");
      badge.className = BUY_ORDER_USER_BADGE_CLASS;
      badge.textContent = "Your order";
      badge.dataset.i18nKey = "content.yourOrder";
      priceCell.appendChild(badge);
    });

    if (notice.textContent !== `Your active buy order: ${formatCurrency(userPrice)} x${userQty}.`) {
      notice.textContent = `Your active buy order: ${formatCurrency(userPrice)} x${userQty}.`;
    }
  };

  const removeButton = buyOrdersCard.querySelector<HTMLElement>(".removebuyorder");
  const fromBootstrapScript = parseActiveBuyOrderFromBootstrapScripts();
  const hasActiveOrderSignal = isElementVisible(removeButton) || Boolean(fromBootstrapScript);
  if (!hasActiveOrderSignal) {
    clearUserOrderMarker();
    return;
  }

  if (fromBootstrapScript) {
    paintUserOrder(fromBootstrapScript.price, fromBootstrapScript.qty);
    return;
  }

  const inputPrice = findBuyOrderInput();
  const inputQty = findBuyOrderQtyInput();
  const userPrice = inputPrice?.value ? parseMoney(inputPrice.value) : null;
  const userQtyRaw = inputQty?.value ? Number(inputQty.value.replace(/[^\d]/g, "")) : NaN;
  const userQty = Number.isFinite(userQtyRaw) && userQtyRaw > 0 ? Math.floor(userQtyRaw) : null;

  if (userPrice && validatePrice(userPrice) && userQty) {
    paintUserOrder(userPrice, userQty);
    return;
  }

  clearUserOrderMarker();
}

function getItemsListRows(): HTMLTableRowElement[] {
  const primaryRows = Array.from(document.querySelectorAll<HTMLTableRowElement>("#transacContent tr.itemListPagination"));
  if (primaryRows.length > 0) return primaryRows;

  const rows: HTMLTableRowElement[] = [];
  for (const selector of ITEMS_LIST_ROW_SELECTORS) {
    document.querySelectorAll<HTMLTableRowElement>(selector).forEach((row) => {
      if (!row.querySelector("td")) return;
      if (!rows.includes(row)) rows.push(row);
    });
  }
  return rows;
}

function getItemsListActionCell(row: HTMLTableRowElement): HTMLTableCellElement | null {
  for (const selector of ITEMS_LIST_ACTION_CELL_SELECTORS) {
    const cell = row.querySelector<HTMLTableCellElement>(selector);
    if (cell) return cell;
  }
  return null;
}

function getItemsListPriceCell(row: HTMLTableRowElement): HTMLTableCellElement | null {
  const classBased = row.querySelector<HTMLTableCellElement>("td.ecurrency");
  if (classBased) return classBased;

  const actionCell = getItemsListActionCell(row);
  if (actionCell) {
    const cells = Array.from(row.querySelectorAll<HTMLTableCellElement>(":scope > td"));
    const actionIndex = cells.indexOf(actionCell);
    if (actionIndex > 0) {
      const previous = cells[actionIndex - 1];
      if (previous) return previous;
    }
  }

  const tooltipBased = row.querySelector<HTMLTableCellElement>("td[data-bs-original-title], td[title]");
  if (tooltipBased) return tooltipBased;

  const cells = Array.from(row.querySelectorAll<HTMLTableCellElement>(":scope > td"));
  return cells.find((cell) => {
    if (cell.querySelector("a, button, form")) return false;
    const text = (cell.textContent || "").replace(/\s+/g, " ").trim();
    return /\d/.test(text) && /[$€£¥₽₹₩R$~]/i.test(text);
  }) || null;
}

function getItemsListPriceCells(): HTMLElement[] {
  const cells: HTMLElement[] = getItemsListRows()
    .map((row) => getItemsListPriceCell(row))
    .filter((cell): cell is HTMLTableCellElement => Boolean(cell));

  for (const selector of ITEMS_LIST_PRICE_SELECTORS) {
    document.querySelectorAll<HTMLElement>(selector).forEach((cell) => {
      if (!cells.includes(cell)) cells.push(cell);
    });
  }

  return cells;
}

type ItemsListPrimaryAttributes = {
  spell: string;
  sheen: string;
  killstreaker: string;
  float: string;
  stickers: boolean;
  part: string;
};

function normalizeItemsListAttributeValue(value: string): string {
  const compact = value.replace(/\s+/g, " ").trim();
  if (!compact) return "";
  if (/^[^a-z]*$/.test(compact)) {
    return compact
      .toLowerCase()
      .replace(/\b\w/g, (ch) => ch.toUpperCase());
  }
  return compact;
}

function extractItemsListPrimaryAttributes(row: HTMLTableRowElement): ItemsListPrimaryAttributes {
  const attrs: ItemsListPrimaryAttributes = {
    spell: "",
    sheen: "",
    killstreaker: "",
    float: "",
    stickers: false,
    part: ""
  };

  const description = row.querySelector<HTMLElement>(".item-magnifier-description");
  const stickerImages = row.querySelectorAll(".sticker_info img, #sticker_info img, img[src*='/stickers/'], img[title*='Sticker']");
  if (stickerImages.length > 0) {
    attrs.stickers = true;
  }
  const text = description?.innerText || "";
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line) continue;

    const labeled = line.match(/^(Sheen|Killstreaker|Halloween Spell|Strange part)\s*:\s*(.*)$/i);
    if (!labeled) continue;

    const label = labeled[1]?.toLowerCase() || "";
    const inlineValue = normalizeItemsListAttributeValue(labeled[2] || "");
    const nextLine = normalizeItemsListAttributeValue(lines[i + 1] || "");
    const value = inlineValue || nextLine;
    if (!value) continue;
    if (!inlineValue && nextLine) i += 1;

    if (label === "sheen" && !attrs.sheen) attrs.sheen = value;
    if (label === "killstreaker" && !attrs.killstreaker) attrs.killstreaker = value;
    if (label === "halloween spell" && !attrs.spell) attrs.spell = value;
    if (label === "strange part" && !attrs.part) attrs.part = value;

    if (!attrs.float) {
      const floatInlineMatch = line.match(/\bfloat\b\s*[:#]?\s*([0-9]+\.[0-9]+)/i);
      if (floatInlineMatch?.[1]) {
        attrs.float = floatInlineMatch[1];
      }
    }
  }

  if (!attrs.float) {
    const floatLine = lines.find((line) => /\bfloat\b/i.test(line));
    const floatMatch = floatLine?.match(/([0-9]+\.[0-9]+)/);
    if (floatMatch?.[1]) {
      attrs.float = floatMatch[1];
    }
  }

  const descriptionHtml = description?.innerHTML || "";
  if (!attrs.spell) {
    const spellMatch = descriptionHtml.match(/Halloween Spell\s*<\/strong>\s*:\s*([^<\n\r]+)/i);
    const spell = normalizeItemsListAttributeValue(spellMatch?.[1] || "");
    if (spell) attrs.spell = spell;
  }

  if (!attrs.part) {
    const partMatch = descriptionHtml.match(/Strange part:\s*<\/strong>\s*([^<\n\r]+)/i);
    const part = normalizeItemsListAttributeValue(partMatch?.[1] || "");
    if (part) attrs.part = part;
  }

  if (!attrs.float) {
    const floatHtmlMatch = descriptionHtml.match(/\bfloat\b\s*(?:value)?\s*:\s*([^<\n\r]+)/i);
    const floatValue = normalizeItemsListAttributeValue(floatHtmlMatch?.[1] || "");
    const numeric = floatValue.match(/([0-9]+\.[0-9]+)/)?.[1] || "";
    if (numeric) attrs.float = numeric;
  }

  const nameCell = row.querySelector<HTMLElement>("td:nth-child(2)");
  const nameCellText = nameCell?.textContent || "";
  const effectMatch = nameCellText.match(/\(([^,\)]+),\s*([^\)]+)\)/);
  if (!attrs.sheen && effectMatch?.[1]) attrs.sheen = normalizeItemsListAttributeValue(effectMatch[1]);
  if (!attrs.killstreaker && effectMatch?.[2]) attrs.killstreaker = normalizeItemsListAttributeValue(effectMatch[2]);

  return attrs;
}

type ItemsListActionKind = "make-offer" | "inspect" | "view-on-steam" | "steamcollector" | "inspect-in-game" | "other";

function detectItemsListActionKind(button: HTMLAnchorElement): ItemsListActionKind {
  const onclick = (button.getAttribute("onclick") || "").toLowerCase();
  const href = (button.getAttribute("href") || "").toLowerCase();

  if (onclick.includes("offer.create")) {
    return "make-offer";
  }

  if (onclick.includes("type.join")) {
    return "inspect-in-game";
  }

  if (href.includes("steamcollector.com")) {
    return "steamcollector";
  }

  if (href.includes("steamcommunity.com") && href.includes("/inventory/")) {
    return "view-on-steam";
  }

  if (href.startsWith("steam://")) {
    return "inspect";
  }

  return "other";
}

function isAddToCartButton(button: HTMLAnchorElement): boolean {
  const onclick = (button.getAttribute("onclick") || "").toLowerCase();
  const classes = button.className.toLowerCase();
  return classes.includes("accart") || onclick.includes("type.addtocart");
}

function applyItemsListActionButtonsVisibility(
  enabled: boolean,
  hideMakeOffer: boolean,
  hideInspect: boolean,
  hideViewOnSteam: boolean,
  hideSteamCollector: boolean,
  hideInspectInGame: boolean
): void {
  const rows = getItemsListRows();
  rows.forEach((row) => {
    let actionCell: HTMLElement | null = null;
    for (const selector of ITEMS_LIST_ACTION_CELL_SELECTORS) {
      const node = row.querySelector<HTMLElement>(selector);
      if (node) {
        actionCell = node;
        break;
      }
    }

    if (!actionCell) return;

    const links = Array.from(actionCell.querySelectorAll<HTMLAnchorElement>("a.btn"));
    links.forEach((link) => {
      if (!enabled) {
        link.style.display = "";
        return;
      }

      if (isAddToCartButton(link)) {
        link.style.display = "";
        return;
      }

      const kind = detectItemsListActionKind(link);
      const shouldHide =
        (kind === "make-offer" && hideMakeOffer) ||
        (kind === "inspect" && hideInspect) ||
        (kind === "view-on-steam" && hideViewOnSteam) ||
        (kind === "steamcollector" && hideSteamCollector) ||
        (kind === "inspect-in-game" && hideInspectInGame);

      link.style.display = shouldHide ? "none" : "";
    });
  });
}

function applyItemsListAttributeColumns(
  enabled: boolean,
  showSpell: boolean,
  showSheen: boolean,
  showKillstreaker: boolean,
  showFloat: boolean,
  showStickers: boolean,
  showPart: boolean,
  appId: number | null
): void {
  const table = document.querySelector<HTMLTableElement>(".table-items");
  if (!table) return;

  const headerRow = Array.from(table.querySelectorAll<HTMLTableRowElement>("tr")).find((row) => row.querySelector("th")) || null;
  if (!headerRow) return;

  table.querySelectorAll(`th.${ITEMS_LIST_EXTRA_HEADER_CLASS}`).forEach((node) => node.remove());
  getItemsListRows().forEach((row) => {
    row.querySelectorAll(`td.${ITEMS_LIST_EXTRA_CELL_CLASS}`).forEach((node) => node.remove());
  });

  if (!enabled) return;

  const labelsByApp: Record<string, { spell: string; sheen: string; killstreaker: string; float: string; stickers: string; part: string }> = {
    "440": { spell: "Spell", sheen: "Sheen", killstreaker: "Killstreaker", float: "Float", stickers: "Stickers", part: "Part" },
    "730": { spell: "Sticker", sheen: "Wear", killstreaker: "Pattern", float: "Float", stickers: "Stickers", part: "Charm" },
    "570": { spell: "Gem", sheen: "Style", killstreaker: "Kinetic", float: "Float", stickers: "Stickers", part: "Inscribed" },
    "252490": { spell: "Pattern", sheen: "Collection", killstreaker: "Workshop", float: "Float", stickers: "Stickers", part: "Tag" }
  };
  const appKey = String(appId ?? "");
  const labels = labelsByApp[appKey] ?? labelsByApp["440"]!;

  const allColumns = [
    { key: "spell", label: labels.spell, iconClass: "fas fa-hat-wizard", enabled: showSpell },
    { key: "sheen", label: labels.sheen, iconClass: "fas fa-sun", enabled: showSheen },
    { key: "killstreaker", label: labels.killstreaker, iconClass: "fas fa-bolt", enabled: showKillstreaker },
    { key: "float", label: labels.float, iconClass: "fas fa-water", enabled: showFloat },
    { key: "stickers", label: labels.stickers, iconClass: "fas fa-tags", enabled: showStickers },
    { key: "part", label: labels.part, iconClass: "fas fa-puzzle-piece", enabled: showPart }
  ].filter((column) => column.enabled);

  const rows = getItemsListRows();
  const rowAttrs = rows.map((row) => ({ row, attrs: extractItemsListPrimaryAttributes(row) }));
  const sampleRowWithPrice = rowAttrs.find((entry) => Boolean(getItemsListPriceCell(entry.row)))?.row || null;
  const sampleRowCells = sampleRowWithPrice
    ? Array.from(sampleRowWithPrice.querySelectorAll<HTMLTableCellElement>(":scope > td"))
    : [];
  const samplePriceCell = sampleRowWithPrice ? getItemsListPriceCell(sampleRowWithPrice) : null;
  const priceColumnIndex = samplePriceCell ? sampleRowCells.indexOf(samplePriceCell) : -1;

  const alignRowCellCountToHeader = (): void => {
    const headerCount = headerRow.querySelectorAll("th").length;
    if (headerCount <= 0) return;

    rowAttrs.forEach(({ row }) => {
      const cells = Array.from(row.querySelectorAll<HTMLTableCellElement>(":scope > td"));
      if (cells.length === 0) return;

      const delta = headerCount - cells.length;
      if (delta === 0) return;

      const priceCell = getItemsListPriceCell(row);
      const actionCell = getItemsListActionCell(row);
      const insertionTarget = priceCell || actionCell || null;

      if (delta > 0) {
        for (let i = 0; i < delta; i += 1) {
          const filler = document.createElement("td");
          filler.className = `${ITEMS_LIST_EXTRA_CELL_CLASS} is-empty`;
          filler.textContent = "-";
          if (insertionTarget) {
            row.insertBefore(filler, insertionTarget);
          } else {
            row.appendChild(filler);
          }
        }
        return;
      }

      const removable = cells
        .filter((cell) => {
          if (priceCell && cell === priceCell) return false;
          if (actionCell && cell === actionCell) return false;
          return !cell.classList.contains("table-itemsactions") && !cell.classList.contains("table-items__actions");
        })
        .slice(delta);
      removable.forEach((cell) => cell.remove());
    });
  };

  alignRowCellCountToHeader();
  const isCsgoApp = String(appId ?? "") === "730";
  const hasAnyStickers = rowAttrs.some((entry) => entry.attrs.stickers);
  const columns = allColumns.filter((column) => {
    if (column.key === "stickers") return isCsgoApp && hasAnyStickers;
    return rowAttrs.some((entry) => Boolean(entry.attrs[column.key as keyof ItemsListPrimaryAttributes]));
  });

  if (columns.length === 0) return;

  const headerCells = Array.from(headerRow.querySelectorAll<HTMLTableCellElement>("th"));
  const insertionTarget =
    priceColumnIndex >= 0 && priceColumnIndex < headerCells.length
      ? headerCells[priceColumnIndex] || null
      : headerCells[headerCells.length - 1] || null;

  columns.forEach((column) => {
    const th = document.createElement("th");
    th.className = ITEMS_LIST_EXTRA_HEADER_CLASS;
    th.title = column.label;
    th.innerHTML = `<i class="${column.iconClass}" aria-hidden="true"></i>${column.label}`;
    if (insertionTarget) {
      headerRow.insertBefore(th, insertionTarget);
    } else {
      headerRow.appendChild(th);
    }
  });

  rowAttrs.forEach(({ row, attrs }) => {

    columns.forEach((column) => {
      const td = document.createElement("td");
      td.className = ITEMS_LIST_EXTRA_CELL_CLASS;
      if (column.key === "stickers") {
        td.textContent = attrs.stickers ? "✓" : "✗";
        td.classList.add(attrs.stickers ? "is-bool-yes" : "is-bool-no");
      } else {
        const key = column.key as Exclude<keyof ItemsListPrimaryAttributes, "stickers">;
        const value = attrs[key] || "";
        td.textContent = value || "-";
        if (!value) td.classList.add("is-empty");
      }

      const rowCells = Array.from(row.querySelectorAll<HTMLTableCellElement>(":scope > td"));
      const rowTargetByIndex =
        priceColumnIndex >= 0 && priceColumnIndex < rowCells.length ? rowCells[priceColumnIndex] || null : null;
      const rowPriceCell = rowTargetByIndex || getItemsListPriceCell(row);
      if (rowPriceCell) {
        row.insertBefore(td, rowPriceCell);
      } else {
        row.appendChild(td);
      }
    });
  });
}

function applyItemsListAttributeSummary(enabled: boolean, showAttributes: boolean): void {
  const normalizeValue = (value: string): string => {
    const compact = value.replace(/\s+/g, " ").trim();
    if (!compact) return "";
    if (/^[^a-z]*$/.test(compact)) {
      return compact
        .toLowerCase()
        .replace(/\b\w/g, (ch) => ch.toUpperCase());
    }
    return compact;
  };

  const effectIdNameMap = parseBpTfEffectIdNameMap();
  const tokenPriority = (token: string): number => {
    const lower = token.toLowerCase();
    if (lower.startsWith("spell:")) return 1;
    if (lower.startsWith("sheen:")) return 2;
    if (lower.startsWith("killstreaker:")) return 3;
    if (lower.startsWith("part:")) return 4;
    if (lower.startsWith("effect:")) return 5;
    if (lower.startsWith("attr:")) return 6;
    return 99;
  };

  const rows = getItemsListRows();
  rows.forEach((row) => {
    const nameCell = row.querySelector<HTMLElement>("td:nth-child(2)");
    if (!nameCell) return;

    const existing = nameCell.querySelector<HTMLElement>(`.${ITEM_ROW_META_CLASS}`);
    if (!enabled || !showAttributes) {
      existing?.remove();
      return;
    }

    const description = row.querySelector<HTMLElement>(".item-magnifier-description");
    const text = description?.innerText || "";
    const lines = text
      .split(/\r?\n/)
      .map((line) => line.replace(/\s+/g, " ").trim())
      .filter(Boolean);

    const tokens: string[] = [];
    const tokenKeys = new Set<string>();
    const pushUnique = (value: string): void => {
      const normalized = normalizeValue(value);
      if (!normalized) return;
      const key = normalized.toLowerCase();
      if (tokenKeys.has(key)) return;
      tokenKeys.add(key);
      tokens.push(normalized);
    };

    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i];
      if (!line) continue;

      const labeled = line.match(/^(Sheen|Killstreaker|Halloween Spell|Strange part)\s*:\s*(.*)$/i);
      if (!labeled) continue;

      const rawLabel = labeled[1]?.toLowerCase() || "";
      const inlineValue = normalizeValue(labeled[2] || "");
      const nextLine = normalizeValue(lines[i + 1] || "");
      const value = inlineValue || nextLine;
      if (!value) continue;

      if (!inlineValue && nextLine) {
        i += 1;
      }

      if (rawLabel === "sheen") pushUnique(`Sheen: ${value}`);
      if (rawLabel === "killstreaker") pushUnique(`Killstreaker: ${value}`);
      if (rawLabel === "halloween spell") pushUnique(`Spell: ${value}`);
      if (rawLabel === "strange part") pushUnique(`Part: ${value}`);
    }

    const descriptionHtml = description?.innerHTML || "";
    const spellHtmlMatches = Array.from(descriptionHtml.matchAll(/Halloween Spell\s*<\/strong>\s*:\s*([^<\n\r]+)/gi));
    spellHtmlMatches.forEach((match) => {
      const spellValue = normalizeValue(match[1] || "");
      if (spellValue) pushUnique(`Spell: ${spellValue}`);
    });

    const strangePartHtmlMatches = Array.from(descriptionHtml.matchAll(/Strange part:\s*<\/strong>\s*([^<\n\r]+)/gi));
    strangePartHtmlMatches.forEach((match) => {
      const partValue = normalizeValue(match[1] || "");
      if (partValue) pushUnique(`Part: ${partValue}`);
    });

    row.querySelectorAll<HTMLElement>(".special-attribute__name").forEach((nameNode) => {
      const value = normalizeValue(nameNode.innerText || nameNode.textContent || "");
      if (!value) return;

      const specialNode = nameNode.closest<HTMLElement>(".special-attribute");
      const particleImg = specialNode?.querySelector<HTMLImageElement>("img[src*='/particles/']");
      const particleId = particleImg ? effectIdFromParticleImage(particleImg.src) : null;
      const effectNameFromMap = particleId ? effectIdNameMap[particleId] : "";
      const resolvedValue = normalizeValue(effectNameFromMap || value);

      const href =
        specialNode instanceof HTMLAnchorElement
          ? specialNode.getAttribute("href") || ""
          : specialNode?.querySelector<HTMLAnchorElement>("a")?.getAttribute("href") || "";
      const iconClass = specialNode?.querySelector<HTMLElement>(".special-attribute__icon")?.className || "";
      const hint = `${iconClass} ${resolvedValue}`.toLowerCase();

      if (href.includes("/effects/")) {
        pushUnique(`Effect: ${resolvedValue}`);
        return;
      }

      if (particleId && effectNameFromMap) {
        pushUnique(`Effect: ${resolvedValue}`);
        return;
      }

      if (/spell|exorcism/.test(hint)) {
        pushUnique(`Spell: ${resolvedValue}`);
        return;
      }

      pushUnique(`Attr: ${resolvedValue}`);
    });

    const nameCellText = nameCell.textContent || "";
    const effectMatch = nameCellText.match(/\(([^,\)]+),\s*([^\)]+)\)/);
    if (effectMatch?.[1]) pushUnique(`Sheen: ${normalizeValue(effectMatch[1])}`);
    if (effectMatch?.[2]) pushUnique(`Killstreaker: ${normalizeValue(effectMatch[2])}`);

    if (tokens.length === 0) {
      existing?.remove();
      return;
    }

    tokens.sort((a, b) => {
      const byPriority = tokenPriority(a) - tokenPriority(b);
      if (byPriority !== 0) return byPriority;
      return a.localeCompare(b);
    });

    const wrap = existing ?? document.createElement("div");
    wrap.className = ITEM_ROW_META_CLASS;
    const previous = Array.from(wrap.querySelectorAll("span"))
      .map((node) => node.textContent || "")
      .join("\n");
    const next = tokens.join("\n");
    if (previous !== next) {
      wrap.replaceChildren();
      tokens.forEach((token) => {
        const badge = document.createElement("span");
        badge.textContent = token;
        wrap.appendChild(badge);
      });
    }

    if (!existing) {
      const magnifier = nameCell.querySelector<HTMLElement>(".item-magnifier");
      if (magnifier) {
        magnifier.insertAdjacentElement("beforebegin", wrap);
      } else {
        nameCell.appendChild(wrap);
      }
    }
  });
}

function normalizePaintImageSource(source: string): string {
  const raw = source.trim();
  if (!raw) return "";

  const clean = raw.replace(/\\/g, "/");
  const normalizePath = (pathPart: string): string => {
    const onlyPath = pathPart.split(/[?#]/)[0] || "";
    const encoded = onlyPath
      .split("/")
      .filter(Boolean)
      .map((segment) => encodeURIComponent(decodeURIComponent(segment)))
      .join("/");
    return encoded ? `/${encoded}` : "";
  };

  const pathMatch = clean.match(/(?:https?:\/\/[^/]+)?\/?(?:[a-z]{2}(?:_[a-z]{2})?\/)?(statics\/img\/paints\/[^?#]+)/i);
  if (pathMatch?.[1]) return normalizePath(pathMatch[1]);

  const marker = "/statics/img/paints/";
  const markerIndex = clean.toLowerCase().indexOf(marker);
  if (markerIndex >= 0) {
    return normalizePath(`statics/img/paints/${clean.slice(markerIndex + marker.length).split(/[?#]/)[0] || ""}`);
  }

  if (/^https?:\/\//i.test(clean)) return clean;
  return normalizePath(clean.replace(/^\/+/, ""));
}

function normalizeItemsListPaintImageSources(rows: HTMLTableRowElement[] = getItemsListRows()): void {
  rows.forEach((row) => {
    const firstCell = row.querySelector<HTMLElement>("td:first-child");
    if (!firstCell) return;

    const img = row.querySelector<HTMLImageElement>("td:first-child img");

    const tooltipNode = firstCell.querySelector<HTMLElement>("[title], [data-bs-original-title]");
    const tooltipTitle = (tooltipNode?.getAttribute("title") || tooltipNode?.getAttribute("data-bs-original-title") || "").replace(/\s+/g, " ").trim();
    const imageTitle = (img?.getAttribute("title") || img?.getAttribute("data-bs-original-title") || img?.getAttribute("alt") || "").replace(/\s+/g, " ").trim();
    const cellTitle = (firstCell.getAttribute("title") || firstCell.getAttribute("data-bs-original-title") || "").replace(/\s+/g, " ").trim();
    const label = imageTitle || tooltipTitle || cellTitle;
    if (label) {
      firstCell.dataset.manncoColorLabel = label;
    }

    firstCell.removeAttribute("title");
    firstCell.removeAttribute("data-bs-original-title");
    firstCell.querySelectorAll<HTMLElement>("[title], [data-bs-original-title]").forEach((node) => {
      node.removeAttribute("title");
      node.removeAttribute("data-bs-original-title");
    });

    if (!img) return;

    const current = img.getAttribute("src") || img.src || "";
    if (!/statics\/img\/paints\//i.test(current)) return;

    const normalized = normalizePaintImageSource(current);
    if (!normalized || normalized === current) return;
    img.setAttribute("src", normalized);
  });
}

function hasNoColorMarker(row: HTMLTableRowElement): boolean {
  if (row.querySelector(".no-color")) return true;
  if (row.querySelector("[class*='no-color']")) return true;

  const firstCell = row.querySelector<HTMLElement>("td:first-child");
  if (!firstCell) return false;

  const tooltipNode = firstCell.querySelector<HTMLElement>("[title], [data-bs-original-title]");
  const title = (tooltipNode?.getAttribute("title") || tooltipNode?.getAttribute("data-bs-original-title") || "").trim().toLowerCase();
  if (title === "no color") return true;

  const text = (firstCell.innerText || "").replace(/\s+/g, " ").trim();
  if (/no\s*color/i.test(text)) return true;
  if (/sem\s*cor/i.test(text)) return true;

  if (!text) {
    const visibleColorMarkers = firstCell.querySelector("img, svg, [style*='background-color'], [style*='background:']");
    if (!visibleColorMarkers) return true;
  }

  return false;
}

function getItemsRowColorToken(row: HTMLTableRowElement): { key: string; previewSrc?: string } {
  const firstCell = row.querySelector<HTMLElement>("td:first-child");
  if (!firstCell) return { key: "color: no color" };

  if (hasNoColorMarker(row)) return { key: "color: no color" };

  const img = firstCell.querySelector<HTMLImageElement>("img");
  const cachedTitle = (firstCell.dataset.manncoColorLabel || "").replace(/\s+/g, " ").trim();
  const imageTitle =
    (img?.getAttribute("title") || img?.getAttribute("data-bs-original-title") || img?.getAttribute("alt") || "").replace(/\s+/g, " ").trim();
  const cellTitle = (firstCell.getAttribute("title") || firstCell.getAttribute("data-bs-original-title") || "").replace(/\s+/g, " ").trim();
  const label = (cachedTitle || imageTitle || cellTitle || "color").toLowerCase();

  const previewSrcRaw = img ? img.getAttribute("src") || img.src || "" : "";
  const previewSrc = previewSrcRaw ? normalizePaintImageSource(previewSrcRaw) : "";
  if (img && previewSrc && previewSrc !== previewSrcRaw) {
    img.setAttribute("src", previewSrc);
  }

  return {
    key: `color: ${label}`,
    previewSrc: previewSrc || undefined
  };
}

function applyHideItemsListIfNoColor(enabled: boolean): void {
  const itemsCard = findItemsListCard();
  if (!itemsCard) return;

  const applyColorColumnVisibility = (hide: boolean): void => {
    const table = itemsCard.querySelector<HTMLTableElement>(".table-items");
    if (!table) return;

    const headerRow = Array.from(table.querySelectorAll<HTMLTableRowElement>("tr")).find((row) => row.querySelector("th"));
    const colorHeader = headerRow?.querySelector<HTMLElement>("th:first-child") || null;
    const nameHeader = headerRow?.querySelector<HTMLElement>("th:nth-child(2)") || null;
    if (colorHeader) {
      if (hide) {
        colorHeader.style.setProperty("display", "none", "important");
      } else {
        colorHeader.style.removeProperty("display");
      }
    }

    if (nameHeader) {
      if (hide) {
        nameHeader.style.setProperty("border-top-left-radius", ".5rem", "important");
        nameHeader.style.setProperty("border-bottom-left-radius", ".5rem", "important");
      } else {
        nameHeader.style.removeProperty("border-top-left-radius");
        nameHeader.style.removeProperty("border-bottom-left-radius");
      }
    }

    getItemsListRows().forEach((row) => {
      const colorCell = row.querySelector<HTMLElement>("td:first-child");
      const nameCell = row.querySelector<HTMLElement>("td:nth-child(2)");
      if (colorCell) {
        if (hide) {
          colorCell.style.setProperty("display", "none", "important");
        } else {
          colorCell.style.removeProperty("display");
        }
      }

      if (nameCell) {
        if (hide) {
          nameCell.style.setProperty("border-top-left-radius", ".5rem", "important");
          nameCell.style.setProperty("border-bottom-left-radius", ".5rem", "important");
        } else {
          nameCell.style.removeProperty("border-top-left-radius");
          nameCell.style.removeProperty("border-bottom-left-radius");
        }
      }
    });
  };

  if (!enabled) {
    itemsCard.style.display = "";
    applyColorColumnVisibility(false);
    return;
  }

  const rows = getItemsListRows();
  normalizeItemsListPaintImageSources(rows);
  if (rows.length === 0) {
    itemsCard.style.display = "";
    applyColorColumnVisibility(false);
    return;
  }

  const itemRows = rows.filter((row) => Boolean(getItemsListPriceCell(row) && row.querySelector("a.acCart")));
  if (itemRows.length === 0) {
    itemsCard.style.display = "";
    applyColorColumnVisibility(false);
    return;
  }

  const allNoColor = itemRows.every((row) => hasNoColorMarker(row));
  applyColorColumnVisibility(allNoColor);
  itemsCard.style.display = "";
}

function rowSearchText(row: HTMLTableRowElement, appId: number | null): string {
  const name = row.querySelector<HTMLElement>("td:nth-child(2)")?.innerText || "";
  const description = row.querySelector<HTMLElement>(".item-magnifier-description")?.innerText || "";
  const price = getItemsListPriceCell(row)?.innerText || "";
  const attrs = extractItemsListPrimaryAttributes(row);
  const colorToken = getItemsRowColorToken(row).key;
  const stickerToken = String(appId ?? "") === "730" ? (attrs.stickers ? "stickers: with stickers" : "stickers: without stickers") : "";
  return `${name} ${description} ${price} ${colorToken} ${stickerToken}`.replace(/\s+/g, " ").toLowerCase();
}

function ensureItemsListTooltipOverflowVisible(): void {
  const itemsCard = findItemsListCard();
  if (!itemsCard) return;

  itemsCard.style.overflow = "visible";
  const cardBody = itemsCard.querySelector<HTMLElement>(".card-body");
  if (cardBody) cardBody.style.overflow = "visible";

  const tableResponsive = itemsCard.querySelector<HTMLElement>(".table-responsive-md");
  if (tableResponsive) {
    tableResponsive.style.overflowX = "auto";
    tableResponsive.style.overflowY = "visible";
  }

  const table = itemsCard.querySelector<HTMLElement>(".table-items");
  if (table) table.style.overflow = "visible";

  const transac = itemsCard.querySelector<HTMLElement>("#transacContent");
  if (transac) transac.style.overflow = "visible";
}

function ensureFlipFloatingTooltip(): HTMLElement {
  let tooltip = document.getElementById(ITEM_FLIP_FLOAT_TOOLTIP_ID) as HTMLElement | null;
  if (tooltip) return tooltip;

  tooltip = document.createElement("div");
  tooltip.id = ITEM_FLIP_FLOAT_TOOLTIP_ID;
  document.body.appendChild(tooltip);
  return tooltip;
}

function ensureItemsColorTooltip(): HTMLElement {
  let tooltip = document.getElementById(ITEMS_COLOR_TOOLTIP_ID) as HTMLElement | null;
  if (tooltip) return tooltip;

  tooltip = document.createElement("div");
  tooltip.id = ITEMS_COLOR_TOOLTIP_ID;
  document.body.appendChild(tooltip);
  return tooltip;
}

function hideItemsColorTooltip(): void {
  const tooltip = document.getElementById(ITEMS_COLOR_TOOLTIP_ID) as HTMLElement | null;
  if (!tooltip) return;
  tooltip.classList.remove("visible");
}

function getItemsRowColorLabel(row: HTMLTableRowElement): string {
  const firstCell = row.querySelector<HTMLElement>("td:first-child");
  if (!firstCell) return "Color";
  if (hasNoColorMarker(row)) return "No color";

  const cached = (firstCell.dataset.manncoColorLabel || "").replace(/\s+/g, " ").trim();
  if (cached) return cached;

  const img = firstCell.querySelector<HTMLImageElement>("img");
  const rawLabel =
    img?.getAttribute("title") ||
    img?.getAttribute("data-bs-original-title") ||
    img?.getAttribute("alt") ||
    firstCell.getAttribute("title") ||
    firstCell.getAttribute("data-bs-original-title") ||
    "";
  const clean = rawLabel.replace(/\s+/g, " ").trim();
  return clean || "Color";
}

function applyItemsListColorQuickTooltip(enabled: boolean): void {
  const table = document.querySelector<HTMLTableElement>(".table-items");
  if (!table) return;

  if (!enabled) {
    hideItemsColorTooltip();
    return;
  }

  const rows = getItemsListRows();
  rows.forEach((row) => {
    const firstCell = row.querySelector<HTMLElement>("td:first-child");
    if (!firstCell) return;

    firstCell.dataset.manncoColorLabel = getItemsRowColorLabel(row);
    firstCell.querySelectorAll<HTMLElement>("[title], [data-bs-original-title]").forEach((node) => {
      node.removeAttribute("title");
      node.removeAttribute("data-bs-original-title");
    });
    firstCell.removeAttribute("title");
    firstCell.removeAttribute("data-bs-original-title");
  });

  if (table.dataset.manncoColorTooltipBound) return;
  table.dataset.manncoColorTooltipBound = "1";

  const positionTooltip = (x: number, y: number): void => {
    const tooltip = ensureItemsColorTooltip();
    const margin = 12;
    const maxLeft = window.innerWidth - tooltip.offsetWidth - 8;
    const maxTop = window.innerHeight - tooltip.offsetHeight - 8;
    const left = Math.max(8, Math.min(maxLeft, x + margin));
    const top = Math.max(8, Math.min(maxTop, y + margin));
    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
  };

  table.addEventListener("mousemove", (event) => {
    const target = event.target as HTMLElement | null;
    if (!target) return;
    const cell = target.closest<HTMLElement>("td:first-child");
    if (!cell) {
      hideItemsColorTooltip();
      return;
    }

    const row = cell.closest<HTMLTableRowElement>("tr");
    if (!row || !getItemsListPriceCell(row)) {
      hideItemsColorTooltip();
      return;
    }

    const label = (cell.dataset.manncoColorLabel || "").trim();
    if (!label) {
      hideItemsColorTooltip();
      return;
    }

    const tooltip = ensureItemsColorTooltip();
    if (tooltip.textContent !== label) tooltip.textContent = label;
    positionTooltip(event.clientX, event.clientY);
    tooltip.classList.add("visible");
  });

  table.addEventListener("mouseleave", () => {
    hideItemsColorTooltip();
  });
}

function showFlipFloatingTooltip(anchor: HTMLElement, html: string): void {
  const tooltip = ensureFlipFloatingTooltip();
  if (tooltip.innerHTML !== html) tooltip.innerHTML = html;

  const rect = anchor.getBoundingClientRect();
  const margin = 10;
  const preferAboveTop = rect.top - tooltip.offsetHeight - margin;
  const showAbove = preferAboveTop >= 8;
  const top = showAbove ? preferAboveTop : rect.bottom + margin;
  const left = Math.min(
    Math.max(8, rect.left + rect.width / 2 - tooltip.offsetWidth / 2),
    window.innerWidth - tooltip.offsetWidth - 8
  );

  tooltip.style.left = `${left}px`;
  tooltip.style.top = `${Math.max(8, top)}px`;
  tooltip.classList.toggle("upward", !showAbove);
  tooltip.classList.add("visible");
}

function hideFlipFloatingTooltip(): void {
  const tooltip = document.getElementById(ITEM_FLIP_FLOAT_TOOLTIP_ID) as HTMLElement | null;
  if (!tooltip) return;
  tooltip.classList.remove("visible", "upward");
}

type SearchOption = {
  key: string;
  label: string;
  count: number;
  group: SearchOptionGroup;
  previewSrc?: string;
};

function getRowPreviewImage(row: HTMLTableRowElement): string {
  return row.querySelector<HTMLImageElement>(".special-attribute img[src*='/particles/']")?.src || "";
}

function buildItemsSearchOptions(rows: HTMLTableRowElement[], appId: number | null): SearchOption[] {
  const counter = new Map<string, { count: number; previewSrc?: string }>();
  const isCsgoApp = String(appId ?? "") === "730";
  const hasAnyStickerRow = rows.some((row) => extractItemsListPrimaryAttributes(row).stickers);

  rows.forEach((row) => {
    const attrs = extractItemsListPrimaryAttributes(row);
    const previewSrc = getRowPreviewImage(row);
    const colorToken = getItemsRowColorToken(row);
    const stickerToken = isCsgoApp && hasAnyStickerRow ? (attrs.stickers ? "stickers: with stickers" : "stickers: without stickers") : "";
    const tokens = [
      attrs.spell ? `spell: ${attrs.spell}` : "",
      attrs.sheen ? `sheen: ${attrs.sheen}` : "",
      attrs.killstreaker ? `killstreaker: ${attrs.killstreaker}` : "",
      attrs.part ? `part: ${attrs.part}` : "",
      colorToken.key,
      stickerToken
    ].filter(Boolean);

    tokens.forEach((token) => {
      const key = token.toLowerCase();
      const current = counter.get(key);
      const currentPreview = key.startsWith("color:") ? colorToken.previewSrc || undefined : previewSrc || undefined;
      if (!current) {
        counter.set(key, { count: 1, previewSrc: currentPreview });
        return;
      }
      counter.set(key, {
        count: current.count + 1,
        previewSrc: current.previewSrc || currentPreview
      });
    });
  });

  return Array.from(counter.entries())
    .map(([key, meta]) => {
      const group: SearchOptionGroup = key.startsWith("spell:")
        ? "spell"
        : key.startsWith("sheen:")
          ? "sheen"
        : key.startsWith("killstreaker:")
            ? "killstreaker"
        : key.startsWith("color:")
            ? "color"
        : key.startsWith("stickers:")
            ? "stickers"
            : "part";
      return {
        key,
        label: key,
        count: meta.count,
        group,
        previewSrc: meta.previewSrc
      };
    })
    .sort((a, b) => {
      if (a.group !== b.group) return a.group.localeCompare(b.group);
      const countDiff = b.count - a.count;
      if (countDiff !== 0) return countDiff;
      return a.key.localeCompare(b.key);
    })
    .slice(0, 40);
}

function optionsSignature(options: SearchOption[]): string {
  return options.map((option) => `${option.group}:${option.key}:${option.count}:${option.previewSrc || ""}`).join("|");
}

function applyItemsListSearch(enabled: boolean, searchEnabled: boolean, appId: number | null): void {
  const itemsCard = findItemsListCard();
  if (!itemsCard) return;

  ensureItemsListTooltipOverflowVisible();

  const existingWrap = itemsCard.querySelector<HTMLElement>(`#${ITEMS_FILTER_WRAP_ID}`);
  const existingLayout = itemsCard.querySelector<HTMLElement>(`#${ITEMS_FILTER_LAYOUT_ID}`);
  const existingTable = itemsCard.querySelector<HTMLElement>(".table-responsive-md");
  if (!enabled || !searchEnabled) {
    existingWrap?.remove();
    if (existingLayout) {
      const tableInside = existingLayout.querySelector<HTMLElement>(".table-responsive-md");
      if (tableInside) {
        existingLayout.insertAdjacentElement("afterend", tableInside);
      }
      existingLayout.remove();
    }
    itemsListSearchOptionsSignature = "";
    itemsListSearchUiSignature = "";
    itemsListSearchFilterSignature = "";
    itemsListSearchSelected.clear();
    itemsListSearchQuery = "";
    getItemsListRows().forEach((row) => {
      row.style.display = "";
    });
    return;
  }

  const wrap = existingWrap ?? document.createElement("div");
  wrap.id = ITEMS_FILTER_WRAP_ID;

  const applyFilters = (): void => {
    const rows = getItemsListRows();
    const signature = `${rows.length}|${itemsListSearchQuery}|${Array.from(itemsListSearchSelected).sort().join(",")}|${itemsListSearchOptionsSignature}`;
    if (signature === itemsListSearchFilterSignature) return;
    itemsListSearchFilterSignature = signature;

    rows.forEach((row) => {
      const searchable = rowSearchText(row, appId);
      const queryMatch = !itemsListSearchQuery || searchable.includes(itemsListSearchQuery);
      const optionMatch =
        itemsListSearchSelected.size === 0 ||
        Array.from(itemsListSearchSelected).every((token) => searchable.includes(token));
      row.style.display = queryMatch && optionMatch ? "" : "none";
    });
  };

  if (!wrap.dataset.bound) {
    wrap.dataset.bound = "1";
    wrap.addEventListener("input", (event) => {
      const target = event.target as HTMLInputElement | null;
      if (!target || target.id !== ITEMS_FILTER_INPUT_ID) return;
      itemsListSearchQuery = target.value.trim().toLowerCase();
      renderUi();
      applyFilters();
    });

    wrap.addEventListener("change", (event) => {
      const target = event.target as HTMLInputElement | null;
      if (!target || target.type !== "checkbox" || !target.dataset.optionKey) return;
      const key = target.dataset.optionKey;
      if (!key) return;
      if (target.checked) itemsListSearchSelected.add(key);
      else itemsListSearchSelected.delete(key);
      renderUi();
      applyFilters();
    });

    wrap.addEventListener("click", (event) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      const actionNode = target.closest<HTMLElement>("[data-action]");
      if (!actionNode) return;
      const action = actionNode.dataset.action;
      if (action === "clear-all") {
        itemsListSearchSelected.clear();
        itemsListSearchQuery = "";
        renderUi();
        applyFilters();
      }
      if (action === "remove-tag") {
        const key = actionNode.dataset.optionKey;
        if (!key) return;
        itemsListSearchSelected.delete(key);
        renderUi();
        applyFilters();
      }
    });

    const placePreview = (x: number, y: number): void => {
      const preview = wrap.querySelector<HTMLElement>(".option-preview");
      if (!preview) return;
      const left = Math.min(x + 14, window.innerWidth - 132);
      const top = Math.min(y + 14, window.innerHeight - 132);
      preview.style.left = `${Math.max(8, left)}px`;
      preview.style.top = `${Math.max(8, top)}px`;
    };

    wrap.addEventListener("mousemove", (event) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      const preview = wrap.querySelector<HTMLElement>(".option-preview");
      if (!preview) return;
      const optionRow = target.closest<HTMLElement>("label.option-row[data-preview-src]");
      if (!optionRow) {
        preview.classList.remove("visible");
        return;
      }
      const src = optionRow.dataset.previewSrc || "";
      if (!src) {
        preview.classList.remove("visible");
        return;
      }
      const img = preview.querySelector("img") as HTMLImageElement | null;
      if (img && img.src !== src) img.src = src;
      placePreview(event.clientX, event.clientY);
      preview.classList.add("visible");
    });

    wrap.addEventListener("mouseleave", () => {
      const preview = wrap.querySelector<HTMLElement>(".option-preview");
      if (!preview) return;
      preview.classList.remove("visible");
    });
  }

  const options = buildItemsSearchOptions(getItemsListRows(), appId);
  const currentSignature = `${optionsSignature(options)}|rows:${getItemsListRows().length}`;

  const validKeys = new Set(options.map((option) => option.key));
  itemsListSearchSelected = new Set(Array.from(itemsListSearchSelected).filter((key) => validKeys.has(key)));

  const renderUi = (): void => {
    const esc = (value: string): string => value.replace(/[&<>"']/g, (m) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[m] || m));

    const filteredOptions = options.filter((option) => !itemsListSearchQuery || option.label.includes(itemsListSearchQuery));

    const selectedTags = Array.from(itemsListSearchSelected);
    const uiSignature = [
      currentSignature,
      itemsListSearchQuery,
      selectedTags.sort().join(","),
      filteredOptions.map((option) => `${option.key}:${option.count}`).join("|")
    ].join("::");
    if (uiSignature === itemsListSearchUiSignature) return;
    itemsListSearchUiSignature = uiSignature;

    const groupOrder: SearchOptionGroup[] = ["color", "stickers", "spell", "sheen", "killstreaker", "part"];
    const groupLabel: Record<SearchOptionGroup, string> = {
      color: "Color",
      stickers: "Stickers",
      spell: "Spell",
      sheen: "Sheen",
      killstreaker: "Killstreaker",
      part: "Strange Part"
    };

    const optionByKey = new Map(options.map((option) => [option.key, option]));
    const tags = selectedTags
      .map((key) => {
        const selectedOption = optionByKey.get(key);
        const display = esc(key.split(":")[1]?.trim() || key);
        const exorcismClass = key === "spell: exorcism" ? ` ${ITEMS_FILTER_OPTION_EXORCISM_CLASS}` : "";
        const tagImg = selectedOption?.previewSrc ? `<img class="tag-thumb" src="${esc(selectedOption.previewSrc)}" alt="" />` : "";
        return `<span class="tag${exorcismClass}">${tagImg}${display}<button type="button" data-action="remove-tag" data-option-key="${esc(key)}">x</button></span>`;
      })
      .join("");

    const groupedHtml = groupOrder
      .map((group) => {
        const groupOptions = filteredOptions.filter((option) => option.group === group);
        if (groupOptions.length === 0) return "";
        const rowsHtml = groupOptions
          .map((option, index) => {
            const checked = itemsListSearchSelected.has(option.key) ? " checked" : "";
            const id = `${ITEMS_FILTER_OPTIONS_ID}-${group}-${index}`;
            const exorcismCls = option.key === "spell: exorcism" ? ` ${ITEMS_FILTER_OPTION_EXORCISM_CLASS}` : "";
            const previewAttr = option.previewSrc ? ` data-preview-src="${esc(option.previewSrc)}"` : "";
            const optionImg = option.previewSrc ? `<img class="option-thumb" src="${esc(option.previewSrc)}" alt="" />` : "";
            return `<label class="option-row${exorcismCls}" for="${id}"${previewAttr}><input id="${id}" type="checkbox" data-option-key="${esc(option.key)}"${checked}/>${optionImg}<span class="option-name">${esc(option.label.replace(/^\w+:\s*/, ""))}</span><span class="option-count">${option.count}</span></label>`;
          })
          .join("");
        return `<details open><summary><span>${groupLabel[group]} (${groupOptions.length})</span><i class="fas fa-chevron-down summary-icon" aria-hidden="true"></i></summary><div class="group-list">${rowsHtml}</div></details>`;
      })
      .join("");

    const optionRows = groupedHtml || `<div class="none">No options for this filter.</div>`;

    wrap.innerHTML = `
      <div id="${ITEMS_FILTER_SEARCH_ROW_ID}">
        <div class="search-wrap">
          <i class="fas fa-search search-icon" aria-hidden="true"></i>
          <input id="${ITEMS_FILTER_INPUT_ID}" type="text" placeholder="search..." value="${esc(itemsListSearchQuery)}" />
        </div>
        ${selectedTags.length > 0 ? `<span id="${ITEMS_FILTER_CLEAR_ID}" data-action="clear-all">clear all</span>` : ""}
      </div>
      ${selectedTags.length > 0 ? `<div id="${ITEMS_FILTER_TAGS_ID}">${tags}</div>` : ""}
      <div id="${ITEMS_FILTER_OPTIONS_ID}">${optionRows}</div>
      <div class="option-preview"><img alt="" /></div>
    `;
  };

  if (currentSignature !== itemsListSearchOptionsSignature) {
    itemsListSearchOptionsSignature = currentSignature;
    itemsListSearchUiSignature = "";
    itemsListSearchFilterSignature = "";
  }

  renderUi();
  applyFilters();

  const layout = existingLayout ?? document.createElement("div");
  layout.id = ITEMS_FILTER_LAYOUT_ID;

  const cardBody = itemsCard.querySelector<HTMLElement>(".card-body") || itemsCard;
  const tableResponsive = existingTable ?? cardBody.querySelector<HTMLElement>(".table-responsive-md");

  if (!existingLayout) {
    if (tableResponsive) {
      tableResponsive.insertAdjacentElement("beforebegin", layout);
    } else {
      cardBody.appendChild(layout);
    }
  }

  if (wrap.parentElement !== layout) {
    wrap.remove();
    layout.prepend(wrap);
  }

  if (tableResponsive && tableResponsive.parentElement !== layout) {
    tableResponsive.remove();
    layout.appendChild(tableResponsive);
  }
}

function applyExorcismDiscountAlert(enabled: boolean, warnEnabled: boolean): void {
  const itemsCard = findItemsListCard();
  if (!itemsCard) return;

  const existing = itemsCard.querySelector<HTMLElement>(`#${ITEMS_LIST_EXORCISM_ALERT_ID}`);
  getItemsListRows().forEach((row) => row.classList.remove(ITEMS_LIST_EXORCISM_ROW_CLASS));

  if (!enabled || !warnEnabled) {
    existing?.remove();
    return;
  }

  const rows = getItemsListRows().filter((row) => Boolean(getItemsListPriceCell(row) && row.querySelector("a.acCart")));
  if (rows.length === 0) {
    existing?.remove();
    return;
  }

  const parseRowPrice = (row: HTMLTableRowElement): number | null => {
    const priceCell = getItemsListPriceCell(row);
    if (!priceCell) return null;

    const fromTooltip = parseMoneyFromElement(priceCell);
    if (fromTooltip) return fromTooltip;

    const source = priceCell.getAttribute("data-mannco-base-price") || priceCell.textContent || "";
    const parsed = parseMoney(source);
    if (!parsed || !validatePrice(parsed)) return null;
    return parsed;
  };

  const withAttrs = rows.map((row) => {
    const attrs = extractItemsListPrimaryAttributes(row);
    const price = parseRowPrice(row);
    return { row, attrs, price };
  });

  const nonSpellPrices = withAttrs
    .filter((entry) => !entry.attrs.spell && entry.price !== null)
    .map((entry) => entry.price as number)
    .sort((a, b) => a - b);

  if (nonSpellPrices.length === 0) {
    existing?.remove();
    return;
  }

  const baseline = nonSpellPrices[Math.floor(nonSpellPrices.length / 2)] || nonSpellPrices[0];
  if (!baseline || !validatePrice(baseline)) {
    existing?.remove();
    return;
  }

  const flagged = withAttrs.filter((entry) => {
    if (!entry.price) return false;
    const spell = (entry.attrs.spell || "").toLowerCase();
    if (!spell.includes("exorcism")) return false;
    return entry.price <= baseline * 1.05;
  });

  if (flagged.length === 0) {
    existing?.remove();
    return;
  }

  flagged.forEach((entry) => entry.row.classList.add(ITEMS_LIST_EXORCISM_ROW_CLASS));
  const minFlagged = Math.min(...flagged.map((entry) => entry.price as number));
  const premiumPct = baseline > 0 ? ((minFlagged - baseline) / baseline) * 100 : 0;
  const text = `Exorcism alert: ${flagged.length} listing(s) at ${formatCurrency(minFlagged)} are priced near regular baseline (${formatCurrency(baseline)}, delta ${premiumPct.toFixed(1)}%).`;

  const alertNode = existing ?? document.createElement("div");
  alertNode.id = ITEMS_LIST_EXORCISM_ALERT_ID;
  if (alertNode.textContent !== text) {
    alertNode.textContent = text;
  }

  if (!existing) {
    const tableResponsive = itemsCard.querySelector<HTMLElement>(".table-responsive-md");
    if (tableResponsive) {
      tableResponsive.insertAdjacentElement("beforebegin", alertNode);
    } else {
      itemsCard.prepend(alertNode);
    }
  }
}

function clearItemsListFlipDecorations(): void {
  hideFlipFloatingTooltip();
  document.getElementById(ITEM_FLIP_FLOAT_TOOLTIP_ID)?.remove();

  const itemsCard = findItemsListCard();
  if (itemsCard) {
    itemsCard.style.removeProperty("overflow");
    const cardBody = itemsCard.querySelector<HTMLElement>(".card-body");
    cardBody?.style.removeProperty("overflow");

    const tableResponsive = itemsCard.querySelector<HTMLElement>(".table-responsive-md");
    if (tableResponsive) {
      tableResponsive.style.removeProperty("overflow");
      tableResponsive.style.removeProperty("overflow-x");
      tableResponsive.style.removeProperty("overflow-y");
    }

    const table = itemsCard.querySelector<HTMLElement>(".table-items");
    table?.style.removeProperty("overflow");

    const transac = itemsCard.querySelector<HTMLElement>("#transacContent");
    transac?.style.removeProperty("overflow");
  }

  const cells = getItemsListPriceCells();
  for (const cell of cells) {
    cell.querySelector(`.${ITEM_FLIP_WRAP_CLASS}`)?.remove();
  }
}

function applyItemsListFlipTooltips(enabled: boolean): void {
  ensureItemStyle();
  ensureItemsListTooltipOverflowVisible();

  const cells = getItemsListPriceCells();
  if (cells.length === 0) return;

  const bestBuyOrder = getHighestBuyOrderPrice();
  const weakestBuyOrder = getLowestBuyOrderPrice();
  const lowestListing = getLowestListingPrice();
  const lowestNet = lowestListing ? calcAfterFees(lowestListing) : null;

  for (const cell of cells) {
    const existingWrap = cell.querySelector(`.${ITEM_FLIP_WRAP_CLASS}`) as HTMLSpanElement | null;

    if (!cell.dataset.manncoBasePrice) {
      const tooltipNode = cell.querySelector<HTMLElement>("[data-bs-original-title], [title]");
      const tooltipText = tooltipNode?.getAttribute("data-bs-original-title") || tooltipNode?.getAttribute("title") || "";
      const ownTooltip = cell.getAttribute("data-bs-original-title") || cell.getAttribute("title") || "";
      cell.dataset.manncoBasePrice = (tooltipText || ownTooltip || cell.textContent || "").trim();
    }

    if (!enabled) {
      existingWrap?.remove();
      hideFlipFloatingTooltip();
      continue;
    }

    const listingPrice = parsePriceFromCellText(cell.dataset.manncoBasePrice || "");
    const wrap =
      existingWrap ??
      (() => {
        const node = document.createElement("span");
        node.className = ITEM_FLIP_WRAP_CLASS;

        const pill = document.createElement("span");
        pill.className = ITEM_FLIP_PILL_CLASS;
pill.textContent = "Flip";
        pill.dataset.i18nKey = "content.flip";
        node.appendChild(pill);
        cell.appendChild(node);
        return node;
      })();

    const pill = wrap.querySelector(`.${ITEM_FLIP_PILL_CLASS}`) as HTMLSpanElement | null;
    if (!pill) continue;

    wrap.querySelectorAll(`.${ITEM_FLIP_TOOLTIP_LEGACY_CLASS}`).forEach((node) => node.remove());

    if (!wrap.dataset.boundFlipHover) {
      wrap.dataset.boundFlipHover = "1";
      wrap.addEventListener("mouseenter", () => {
        const html = wrap.dataset.flipTooltipHtml || "";
        if (!html) return;
        showFlipFloatingTooltip(wrap, html);
      });
      wrap.addEventListener("mousemove", () => {
        const html = wrap.dataset.flipTooltipHtml || "";
        if (!html) return;
        showFlipFloatingTooltip(wrap, html);
      });
      wrap.addEventListener("mouseleave", () => {
        hideFlipFloatingTooltip();
      });
    }

    if (!listingPrice) {
      const html = `<span class="${ITEM_FLIP_TOOLTIP_TITLE_CLASS}">Flip estimate</span><span class="${ITEM_FLIP_TOOLTIP_LINE_CLASS}">Waiting for buy-order data to compute flip estimate.</span>`;
      wrap.dataset.flipTooltipHtml = html;
      if (pill) pill.classList.remove(ITEM_FLIP_POSITIVE_CLASS, ITEM_FLIP_NEGATIVE_CLASS);
      if (pill && pill.textContent !== "Flip") pill.textContent = "Flip";
      continue;
    }

    const instantFlip = bestBuyOrder ? bestBuyOrder - listingPrice : null;
    const instantPct = instantFlip !== null ? (instantFlip / listingPrice) * 100 : null;
    const relistFlip = lowestNet !== null ? lowestNet - listingPrice : null;
    const relistPct = relistFlip !== null ? (relistFlip / listingPrice) * 100 : null;

    const sign = (value: number | null): string => (value !== null && value >= 0 ? "+" : "");
    const money = (value: number | null): string => (value === null ? "-" : `${sign(value)}${formatCurrency(Math.abs(value))}`);
    const pct = (value: number | null): string => (value === null ? "-" : `${sign(value)}${value.toFixed(1)}%`);

    const html = [
      `<span class="${ITEM_FLIP_TOOLTIP_TITLE_CLASS}">Flip estimate for this listing</span>`,
      `<span class="${ITEM_FLIP_TOOLTIP_LINE_CLASS}">Top buy order: ${bestBuyOrder ? formatCurrency(bestBuyOrder) : "-"}</span>`,
      `<span class="${ITEM_FLIP_TOOLTIP_LINE_CLASS}">Listing price: ${formatCurrency(listingPrice)}</span>`,
      `<span class="${ITEM_FLIP_TOOLTIP_LINE_CLASS}">Instant sell to top buy order: ${money(instantFlip)} (${pct(instantPct)})</span>`,
      `<span class="${ITEM_FLIP_TOOLTIP_LINE_CLASS}">Relist at lowest (net): ${money(relistFlip)} (${pct(relistPct)})</span>`,
      weakestBuyOrder
        ? `<span class="${ITEM_FLIP_TOOLTIP_LINE_CLASS}">Lowest buy order: ${formatCurrency(weakestBuyOrder)}</span>`
        : "",
      lowestListing && lowestNet
        ? `<span class="${ITEM_FLIP_TOOLTIP_LINE_CLASS}">Lowest listing reference: ${formatCurrency(lowestListing)} -> ${formatCurrency(lowestNet)} net</span>`
        : ""
    ].join("");

    wrap.dataset.flipTooltipHtml = html;
    if (pill) {
      const primary = relistFlip ?? instantFlip ?? 0;
      pill.classList.toggle(ITEM_FLIP_POSITIVE_CLASS, primary >= 0);
      pill.classList.toggle(ITEM_FLIP_NEGATIVE_CLASS, primary < 0);
      const primaryPct = relistPct ?? instantPct;
      const label = primaryPct === null ? "Flip" : `Flip ${primaryPct >= 0 ? "+" : ""}${primaryPct.toFixed(1)}%`;
      if (pill.textContent !== label) pill.textContent = label;
    }
  }
}

export const itemModule: ContentModule = {
  id: "item-module",
  routes: ["item"],
  apply(context, settings) {
    ensureItemStyle();

    applyItemVisibilityOptions(settings);
    applyChartMode(settings.itemChartMode, settings.enabled);
    applySectionOrder(settings.itemSectionOrder, settings.enabled);
    applyBuyOrderProfitTable(settings.enabled && settings.itemBuyOrderTableProfit);
    clearItemsListFlipDecorations();
    applyItemsListActionButtonsVisibility(
      settings.enabled,
      settings.itemHideItemsListMakeOfferButton,
      settings.itemHideItemsListInspectButton,
      settings.itemHideItemsListViewOnSteamButton,
      settings.itemHideItemsListSteamCollectorButton,
      settings.itemHideItemsListInspectInGameButton
    );
    applyItemsListAttributeColumns(
      settings.enabled,
      settings.itemItemsListColumnSpell,
      settings.itemItemsListColumnSheen,
      settings.itemItemsListColumnKillstreaker,
      settings.itemItemsListColumnFloat,
      settings.itemItemsListColumnStickers,
      settings.itemItemsListColumnPart,
      context.appId
    );
    applyItemsListAttributeSummary(settings.enabled, settings.itemShowItemsListAttributes);
    applyItemsListSearch(settings.enabled, settings.itemEnableItemsListSearch, context.appId);
    applyExorcismDiscountAlert(settings.enabled, settings.itemWarnExorcismDiscount);
    applyHideItemsListIfNoColor(settings.enabled);
    applyItemsListColorQuickTooltip(settings.enabled);
    try {
      applyExternalMarketPrices(settings.enabled && settings.itemExternalMarketPrices, context.itemName);
    } catch (error) {
      const msg = error instanceof Error ? (error.message || "").toLowerCase() : "";
      if (!msg.includes("extension context invalidated")) {
        throw error;
      }
    }
    applyBuyOrderTooltips(settings);
    applyBuyOrderAutoFill(settings);
    enhanceQuantityAndPriceInputs(settings);
    enhanceOfferCreateModal(settings);
    ensureBuyOrderQuickMatchButton(settings);
    enhanceBuyOrderActionButtons();
    bindBuyOrderTableRowFill(settings);
    applyUserBuyOrderMarker(settings.enabled);
    bindNegativeFlipSubmitWarning(settings);
    bindBuyOrderAutoRefreshOnSuccess(settings);
    // Market-style UI enhancements for Items page
    setupMarketLegendAndObserver();
    // Simplified filters UI: hide search and show active tags + resumo
    hideSearchRowInFilters();
    renderActiveFilterTagsAndResumo();
    setupFilterTagsListeners();
  }
};

// Market style helpers for the Items page (legend and live count)
function countShownItems(): number {
  const rows = Array.from(document.querySelectorAll<HTMLTableRowElement>('#transacContent tr'));
  const itemRows = rows.filter((r) => !r.classList.contains('itemListPagination'));
  return itemRows.length;
}

function ensureMarketLegendBox(): void {
  const storeFilters = document.getElementById('store-filters');
  if (!storeFilters) return;
  // legend is created elsewhere in ensureMarketLegendBox; avoid duplicate declarations here
  // Inject market-style CSS once
  let marketStyle = document.getElementById('mannco-market-styles') as HTMLStyleElement | null;
  if (!marketStyle) {
    marketStyle = document.createElement('style');
    marketStyle.id = 'mannco-market-styles';
    marketStyle.textContent = `
      .mannco-enhancer-market-legend {
        padding: 6px 10px;
        border: 1px solid #4e6375;
        border-radius: 6px;
        background: rgba(24,28,36,.75);
        color: #dbe7f6;
        font-size: 12px;
        display: flex;
        align-items: center;
        gap: 8px;
        margin-top: 6px;
      }
      .mannco-enhancer-market-legend .marker {
        width: 8px; height: 8px; border-radius: 999px; display: inline-block; margin-right: 6px;
        background: #2dbd5a;
      }
    `;
    document.head.appendChild(marketStyle);
  }
  const count = countShownItems();
  const el = document.getElementById(MARKET_LEGEND_COUNT_ID);
  if (el) el.textContent = String(count);
}

function observeMarketListMutations(): void {
  const target = document.getElementById('transacContent');
  if (!target) return;
  const observer = new MutationObserver(() => {
    const count = countShownItems();
    const el = document.getElementById(MARKET_LEGEND_COUNT_ID);
    if (el) el.textContent = String(count);
  });
  observer.observe(target, { childList: true, subtree: true, characterData: true });
}

function setupMarketLegendAndObserver(): void {
  ensureMarketLegendBox();
  observeMarketListMutations();
}

// Hide the search bar inside the filters to simplify UI
function hideSearchRowInFilters(): void {
  const searchRow = document.getElementById(ITEMS_FILTER_SEARCH_ROW_ID);
  if (searchRow) {
    (searchRow as HTMLElement).style.display = 'none';
  }
}

// Render active filter tags and update summary text
function renderActiveFilterTagsAndResumo(): void {
  renderActiveFilterTags();
  updateResumo();
}

function renderActiveFilterTags(): void {
  const container = document.getElementById(ITEMS_FILTER_TAGS_ID);
  if (!container) return;
  container.innerHTML = "";
  const inputs = Array.from<HTMLInputElement>(
    document.querySelectorAll<HTMLInputElement>("#mannco-enhancer-items-filter-options input[type='checkbox'], #mannco-enhancer-items-filter-options input[type='radio']")
  );
  inputs.forEach((inp) => {
    if (!inp.checked) return;
    const label = inp.closest("label");
    let rawText = label?.textContent?.trim() ?? "";
    let displayText = rawText;
    if (rawText.toLowerCase() === "no color") {
      displayText = "No color";
    } else if (rawText.length > 0) {
      displayText = rawText.charAt(0).toUpperCase() + rawText.slice(1);
    }
    if (!displayText) return;
    const span = document.createElement("span");
    span.className = "tag";
    span.textContent = displayText;
    container.appendChild(span);
  });
}

function updateResumo(): void {
  const wrap = document.getElementById(ITEMS_FILTER_WRAP_ID);
  const summaryId = "mannco-enhancer-items-summary";
  let el = document.getElementById(summaryId);
  // Use English text and count total items using the market rows (no color filter specific)
  const countTotal = (document.querySelectorAll('.itemListPagination').length) || 0;
  const text = `Summary of current items: ${countTotal}`;
  if (!el && wrap) {
    el = document.createElement("div");
    el.id = summaryId;
    el.style.marginTop = "6px";
    wrap.insertBefore(el, wrap.firstChild);
  }
  if (el) el.textContent = text;
}

function setupFilterTagsListeners(): void {
  const inputs = Array.from<HTMLInputElement>(
    document.querySelectorAll<HTMLInputElement>("#mannco-enhancer-items-filter-options input[type='checkbox'], #mannco-enhancer-items-filter-options input[type='radio']")
  );
  inputs.forEach((inp) => {
    inp.addEventListener("change", () => {
      renderActiveFilterTagsAndResumo();
    });
  });
}
