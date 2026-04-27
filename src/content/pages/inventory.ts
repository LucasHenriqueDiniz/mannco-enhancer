import type { ContentModule } from "../types";
import { parseMoney, validatePrice } from "../shared/safety";

const ITEM_SELECTORS = [
  "#site-inventory-items > li",
  "#on-sale-items > li",
  "li[data-id][data-name][data-isd]"
] as const;

const STYLE_ID = "mannco-enhancer-inventory-style";
const SUMMARY_ID = "mannco-enhancer-inventory-summary";
const BASE_CLASS = "mannco-enhancer-inventory-item";
const TAG_ATTR = "data-mannco-enhancer-inventory-tag";
const TAGS_ATTR = "data-mannco-enhancer-inventory-tags";
const HIDDEN_CLASS = "mannco-enhancer-inventory-hidden";
const UNDERCUT_BUTTON_ID = "mannco-enhancer-inventory-undercut-toggle";
const QUICK_UPDATE_BUTTON_ID = "mannco-enhancer-inventory-quick-update-open";
const QUICK_UPDATE_NAV_ITEM_ID = "mannco-enhancer-inventory-quick-update-nav-item";
const QUICK_MODAL_ID = "mannco-enhancer-inventory-quick-modal";
const CONTROLS_WRAP_ID = "mannco-enhancer-inventory-controls";
const LISTINGS_HEADING_SELECTOR = "#on-sale > div.card-body.card-body-full-onsale > div.card-head > h3";
const MULTI_SELECTED_CLASS = "mannco-enhancer-multi-selected";
const MULTI_MODE_CLASS = "mannco-enhancer-multi-mode";

type TagDef = {
  key: string;
  label: string;
  color: string;
  tokens: readonly string[];
};

type QuickSource = "suggested" | "match" | "instant";

type QuickPrices = {
  current: number | null;
  instant: number | null;
  match: number | null;
  suggested: number | null;
  steam: number | null;
};

const TAGS: readonly TagDef[] = [
  { key: "australium", label: "Australium", color: "#f0c756", tokens: ["australium"] },
  { key: "unusual", label: "Unusual", color: "#7f6bff", tokens: ["unusual"] },
  { key: "strange", label: "Strange", color: "#ff8b37", tokens: ["strange"] },
  { key: "stattrak", label: "StatTrak", color: "#ff6e4d", tokens: ["stattrak", "stattrak™"] },
  { key: "genuine", label: "Genuine", color: "#69d28b", tokens: ["genuine"] },
  { key: "vintage", label: "Vintage", color: "#8dc2ff", tokens: ["vintage"] },
  { key: "festivized", label: "Festivized", color: "#ff86b7", tokens: ["festivized"] },
  { key: "uncraftable", label: "Uncraftable", color: "#9ea7b3", tokens: ["uncraftable"] },
  {
    key: "painted",
    label: "Painted",
    color: "#64d1b8",
    tokens: ["paint:", "painted", "peculiarly", "color no.", "color number"]
  }
];

let activeTagFilter: string | null = null;
let undercutOnly = false;
let quickPreferredSource: QuickSource = "suggested";
let quickAutoPriceMode: "none" | "match" | "suggested" = "match";
let quickOpen = false;
let quickSessionCompleted = false;
let quickItems: HTMLElement[] = [];
let quickIndex = 0;
let quickSource: QuickSource = "suggested";
let quickApplyPending = false;
let quickIgnoreDiscountWarning = false;
let quickAutoConfirmTotalItems = false;
let quickLastRunError = "";
const QUICK_APPLY_COOLDOWN_MS = 550;
const QUICK_PREPARED_TTL_MS = 8000;
const QUICK_VERIFY_INTERVAL_MS = 45;
const QUICK_VERIFY_TIMEOUT_MS = 2200;
let quickLastApplyAt = 0;
let quickSelectionRun = 0;
let listingsAutoSelectBound = false;
let listingsAutoSelectTimer: number | null = null;
let lastHandledInventoryTab: "listings" | "inventory" | null = null;
let multiWithdrawToggleBound = false;

type QuickPreparedState = {
  itemId: string;
  source: QuickSource;
  preparedAt: number;
};

let quickPreparedState: QuickPreparedState | null = null;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function findInventoryItems(): HTMLElement[] {
  const all: HTMLElement[] = [];
  for (const selector of ITEM_SELECTORS) {
    document.querySelectorAll<HTMLElement>(selector).forEach((node) => {
      const item = node.matches("li") ? node : node.closest<HTMLElement>("li[data-id][data-isd]");
      if (!item) return;
      if (!all.includes(item)) all.push(item);
    });
  }
  return all;
}

function isVisible(node: HTMLElement): boolean {
  return node.offsetParent !== null && !node.classList.contains(HIDDEN_CLASS);
}

function getTagByKey(tagKey: string): TagDef | null {
  return TAGS.find((tag) => tag.key === tagKey) || null;
}

function ensureInventoryStyle(): void {
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    .${BASE_CLASS} {
      position: relative;
      outline: 1px solid transparent;
      outline-offset: -1px;
      transition: outline-color .16s ease, box-shadow .16s ease;
    }

    .${BASE_CLASS}[${TAG_ATTR}] {
      box-shadow: inset 0 0 0 1px rgba(15, 20, 26, 0.24);
    }

    .${BASE_CLASS}[${TAG_ATTR}="australium"] { outline-color: #f0c756; }
    .${BASE_CLASS}[${TAG_ATTR}="unusual"] { outline-color: #7f6bff; }
    .${BASE_CLASS}[${TAG_ATTR}="strange"] { outline-color: #ff8b37; }
    .${BASE_CLASS}[${TAG_ATTR}="stattrak"] { outline-color: #ff6e4d; }
    .${BASE_CLASS}[${TAG_ATTR}="genuine"] { outline-color: #69d28b; }
    .${BASE_CLASS}[${TAG_ATTR}="vintage"] { outline-color: #8dc2ff; }
    .${BASE_CLASS}[${TAG_ATTR}="festivized"] { outline-color: #ff86b7; }
    .${BASE_CLASS}[${TAG_ATTR}="uncraftable"] { outline-color: #9ea7b3; }
    .${BASE_CLASS}[${TAG_ATTR}="painted"] { outline-color: #64d1b8; }

    .${HIDDEN_CLASS} {
      display: none !important;
    }

    #site-inventory-items > li.${MULTI_SELECTED_CLASS} {
      outline: 2px solid #58b8ff !important;
      outline-offset: -2px;
      box-shadow: inset 0 0 0 1px rgba(10, 24, 40, 0.5), 0 0 0 1px rgba(88, 184, 255, 0.35);
    }

    #site-inventory-items > li.${MULTI_SELECTED_CLASS}::after {
      content: "✓";
      position: absolute;
      top: 8px;
      right: 8px;
      width: 18px;
      height: 18px;
      border-radius: 999px;
      background: #1d7fd8;
      color: #eef7ff;
      font-size: 12px;
      font-weight: 800;
      line-height: 18px;
      text-align: center;
      box-shadow: 0 0 0 1px rgba(7, 24, 40, 0.45);
      z-index: 3;
      pointer-events: none;
    }

    .card-body-full-inventory.${MULTI_MODE_CLASS} {
      border: 1px solid rgba(96, 171, 226, 0.45);
      border-radius: 10px;
      box-shadow: 0 0 0 1px rgba(58, 126, 178, 0.25), 0 8px 24px rgba(9, 23, 36, 0.22);
      background: linear-gradient(180deg, rgba(26, 40, 57, 0.2) 0%, rgba(19, 31, 45, 0.12) 100%);
    }

    .card-body-full-inventory.${MULTI_MODE_CLASS} .card-head h3 {
      color: #d9ecff;
    }

    .card-body-full-inventory .ww {
      display: none !important;
      align-items: center;
      justify-content: center;
      margin-left: 8px;
      padding: 0 10px !important;
      min-height: 28px;
      border-radius: 8px;
      border: 1px solid rgba(96, 171, 226, 0.26);
      background: rgba(27, 43, 61, 0.56);
      color: #8ec9f0 !important;
      font-weight: 600;
      letter-spacing: 0.01em;
      transition: background .14s ease, border-color .14s ease, color .14s ease, box-shadow .14s ease;
    }

    .card-body-full-inventory .ww:hover {
      background: rgba(36, 58, 80, 0.8);
      border-color: rgba(132, 200, 242, 0.6);
      color: #d9f1ff !important;
    }

    .card-body-full-inventory.${MULTI_MODE_CLASS} .ww {
      display: inline-flex !important;
      border-color: rgba(101, 187, 238, 0.62);
      background: rgba(31, 73, 103, 0.74);
      color: #e7f7ff !important;
      box-shadow: 0 0 0 1px rgba(102, 186, 235, 0.25);
    }

    .card-body-full-inventory.${MULTI_MODE_CLASS} .mbtn {
      border-color: rgba(102, 186, 235, 0.65) !important;
      background: rgba(26, 78, 109, 0.78) !important;
      color: #e8f8ff !important;
      box-shadow: 0 0 0 1px rgba(102, 186, 235, 0.18);
    }

    #${SUMMARY_ID} {
      display: inline-flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
      margin-left: 0;
      vertical-align: middle;
    }

    #${SUMMARY_ID} .tag,
    #${UNDERCUT_BUTTON_ID} {
      display: inline-flex;
      align-items: center;
      border: 1px solid rgba(125, 145, 160, 0.45);
      border-radius: 8px;
      font-size: 12px;
      line-height: 1;
      color: #d8e2eb;
      background: rgba(36, 47, 57, 0.82);
      padding: 4px 10px;
      white-space: nowrap;
      cursor: pointer;
      user-select: none;
    }

    #${SUMMARY_ID} .tag:hover,
    #${UNDERCUT_BUTTON_ID}:hover {
      border-color: rgba(164, 184, 198, 0.8);
      background: rgba(40, 53, 66, 0.84);
    }

    #${SUMMARY_ID} .tag.active,
    #${UNDERCUT_BUTTON_ID}[data-active="true"] {
      border-color: #5ac4dd;
      color: #ebf9ff;
      box-shadow: 0 0 0 1px rgba(90, 196, 221, 0.22);
      background: rgba(41, 71, 86, 0.86);
    }

    #${SUMMARY_ID} .tag.tag-muted {
      opacity: 0.55;
    }

    #${UNDERCUT_BUTTON_ID} {
      margin-left: 0;
      padding: 4px 10px;
      border-radius: 8px;
      border: 1px solid rgba(125, 145, 160, 0.45);
      background: rgba(36, 47, 57, 0.82);
      color: #d7e6f2;
      font-size: 12px;
      line-height: 1.2;
      cursor: pointer;
    }

    #${QUICK_UPDATE_BUTTON_ID} {
      margin-left: 1rem;
    }

    #${CONTROLS_WRAP_ID} {
      display: inline-flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 8px;
      margin-left: 10px;
      vertical-align: middle;
    }

    #${QUICK_MODAL_ID} {
      position: fixed;
      inset: 0;
      z-index: 1035;
      display: none;
      align-items: center;
      justify-content: center;
      padding: 20px;
      background: rgba(8, 12, 16, 0.58);
      backdrop-filter: blur(2px);
    }

    #${QUICK_MODAL_ID}[data-open="true"] {
      display: flex;
    }

    #${QUICK_MODAL_ID} .q-card {
      width: min(700px, calc(100vw - 24px));
      border-radius: 14px;
      border: 1px solid rgba(114, 136, 153, 0.44);
      background: linear-gradient(180deg, #13202b 0%, #0f1a23 100%);
      box-shadow: 0 24px 52px rgba(0, 0, 0, 0.48);
      color: #dceaf8;
      overflow: hidden;
    }

    #${QUICK_MODAL_ID} .q-head,
    #${QUICK_MODAL_ID} .q-foot {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 12px 14px;
      border-bottom: 1px solid rgba(114, 136, 153, 0.22);
    }

    #${QUICK_MODAL_ID} .q-foot {
      border-top: 1px solid rgba(114, 136, 153, 0.22);
      border-bottom: 0;
    }

    #${QUICK_MODAL_ID} .q-body {
      padding: 14px;
    }

    #${QUICK_MODAL_ID} .q-main {
      display: grid;
      grid-template-columns: 228px minmax(0, 1fr);
      gap: 12px;
      align-items: start;
    }

    #${QUICK_MODAL_ID} .q-item-preview {
      width: 100%;
      min-height: 0;
      border-radius: 10px;
      border: 1px solid rgba(120, 145, 164, 0.28);
      background: rgba(12, 20, 28, 0.75);
      padding: 8px;
      overflow: hidden;
      display: flex;
      align-items: flex-start;
      justify-content: center;
    }

    #${QUICK_MODAL_ID} .q-mini-card {
      width: 100%;
      max-width: 205px;
      border: 1px solid rgba(255, 110, 110, 0.72);
      border-radius: 9px;
      background: linear-gradient(180deg, rgba(35, 43, 67, 0.98) 0%, rgba(29, 36, 56, 0.98) 100%);
      position: relative;
      overflow: hidden;
      box-shadow: 0 8px 18px rgba(0, 0, 0, 0.34);
    }

    #${QUICK_MODAL_ID} .q-mini-qty {
      position: absolute;
      right: 8px;
      top: 8px;
      font-size: 11px;
      line-height: 1;
      border-radius: 6px;
      background: #2a4f78;
      color: #d7eafb;
      padding: 4px 7px;
      z-index: 2;
    }

    #${QUICK_MODAL_ID} .q-mini-image-wrap {
      height: 118px;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 10px 10px 6px;
    }

    #${QUICK_MODAL_ID} .q-mini-image {
      max-width: 100%;
      max-height: 96px;
      object-fit: contain;
      filter: drop-shadow(0 8px 16px rgba(0, 0, 0, 0.45));
    }

    #${QUICK_MODAL_ID} .q-mini-meta {
      padding: 4px 10px 8px;
      color: #d3e4f2;
      font-size: 11px;
      line-height: 1.2;
    }

    #${QUICK_MODAL_ID} .q-mini-ref {
      display: flex;
      gap: 8px;
      margin-bottom: 6px;
      color: #f0f6fb;
      opacity: 0.92;
      font-weight: 600;
      font-size: 11px;
    }

    #${QUICK_MODAL_ID} .q-mini-name {
      color: #ff5d5d;
      font-weight: 700;
      font-size: 13px;
      line-height: 1.12;
      margin-bottom: 6px;
      word-break: break-word;
    }

    #${QUICK_MODAL_ID} .q-mini-price {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-top: 1px solid rgba(255, 116, 116, 0.45);
      background: #f44a4a;
      color: #071120;
      padding: 7px 10px;
      font-weight: 800;
      font-size: 18px;
      line-height: 1;
    }

    #${QUICK_MODAL_ID} .q-mini-price .q-mini-arrow {
      color: #0c6416;
      font-size: 15px;
      font-weight: 900;
    }

    @media (max-width: 760px) {
      #${QUICK_MODAL_ID} .q-main {
        grid-template-columns: 1fr;
      }

      #${QUICK_MODAL_ID} .q-mini-card {
        max-width: 240px;
      }
    }

    #${QUICK_MODAL_ID} .q-name {
      font-size: 14px;
      font-weight: 700;
      margin-bottom: 10px;
      line-height: 1.3;
    }

    #${QUICK_MODAL_ID} .q-prices {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 8px;
      margin-bottom: 12px;
    }

    #${QUICK_MODAL_ID} .q-price-btn {
      border: 1px solid rgba(115, 138, 154, 0.42);
      border-radius: 10px;
      background: rgba(31, 46, 56, 0.76);
      color: #dceaf8;
      padding: 8px 10px;
      text-align: left;
      cursor: pointer;
      width: 100%;
    }

    #${QUICK_MODAL_ID} .q-price-btn[data-active="true"] {
      border-color: #6cc9e2;
      background: rgba(45, 74, 89, 0.88);
    }

    #${QUICK_MODAL_ID} .q-price-btn .k {
      display: block;
      opacity: 0.82;
      font-size: 11px;
      margin-bottom: 3px;
    }

    #${QUICK_MODAL_ID} .q-price-btn .v {
      display: block;
      font-size: 14px;
      font-weight: 700;
    }

    #${QUICK_MODAL_ID} .q-input {
      width: 100%;
      height: 42px;
      border: 1px solid rgba(118, 142, 158, 0.46);
      border-radius: 10px;
      padding: 8px 11px;
      font-size: 15px;
      font-weight: 700;
      color: #ecf6ff;
      background: rgba(13, 21, 29, 0.82);
    }

    #${QUICK_MODAL_ID} .q-warning {
      margin-top: 7px;
      font-size: 12px;
      color: #f3c384;
      min-height: 16px;
    }

    #${QUICK_MODAL_ID} .q-status {
      font-size: 12px;
      color: #8fb8cf;
      min-height: 16px;
    }

    #${QUICK_MODAL_ID} .q-btn {
      border: 1px solid rgba(118, 142, 158, 0.42);
      border-radius: 10px;
      background: rgba(33, 48, 60, 0.82);
      color: #dceaf8;
      padding: 8px 12px;
      cursor: pointer;
      min-width: 84px;
    }

    #${QUICK_MODAL_ID} .q-btn.q-primary {
      border-color: #5cbdd5;
      background: rgba(37, 84, 102, 0.92);
      color: #ecf9ff;
      min-width: 154px;
    }

    #${QUICK_MODAL_ID}[data-busy="true"] .q-card {
      cursor: progress;
    }

    #${QUICK_MODAL_ID} .q-btn:disabled,
    #${QUICK_MODAL_ID} .q-price-btn:disabled,
    #${QUICK_MODAL_ID} .q-input:disabled {
      opacity: 0.62;
      cursor: not-allowed;
    }

    #${QUICK_MODAL_ID} .q-shortcuts {
      font-size: 11px;
      color: #89a8be;
      margin-top: 9px;
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 6px;
      line-height: 1.3;
    }

    #${QUICK_MODAL_ID} .q-shortcuts .q-key {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 18px;
      padding: 0 6px;
      border-radius: 5px;
      border: 1px solid rgba(130, 161, 181, 0.45);
      background: rgba(24, 38, 50, 0.88);
      color: #d9ecfb;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.01em;
    }

    #${QUICK_MODAL_ID} .q-shortcuts .q-sep {
      opacity: 0.6;
    }

    #modal-total-selldiscount .mannco-enhancer-shortcut-hint,
    #modal-total-items .mannco-enhancer-shortcut-hint {
      display: inline-flex;
      align-items: center;
      margin-left: 8px;
    }

    #modal-total-selldiscount .mannco-enhancer-keycap,
    #modal-total-items .mannco-enhancer-keycap {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 18px;
      padding: 0 6px;
      border-radius: 5px;
      border: 1px solid rgba(130, 161, 181, 0.45);
      background: rgba(24, 38, 50, 0.88);
      color: #d9ecfb;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.01em;
    }

    #${QUICK_MODAL_ID} .q-counter {
      font-size: 12px;
      color: #9ec2d8;
    }
  `;

  document.head.appendChild(style);
}

function getItemText(item: HTMLElement): string {
  const dataName = item.getAttribute("data-name") || "";
  const title = item.querySelector<HTMLElement>(".item-name-description")?.textContent || "";
  const info = item.querySelector<HTMLElement>(".item-info")?.textContent || "";
  const className = item.className || "";
  return `${dataName} ${title} ${info} ${className}`.toLowerCase();
}

function hasLikelyPaintedEffectIcon(item: HTMLElement): boolean {
  const game = item.getAttribute("data-h-game") || "";
  if (game !== "440") return false;

  const src = item.querySelector<HTMLImageElement>("img.item-thumbnail")?.src || "";
  if (!src) return false;

  const normalized = src.toLowerCase().split("/200fx200f")[0] || "";

  // Painted TF2 items use a different thumbnail family from regular item thumbnails.
  // Keep this conservative and image-based (no effect/name heuristics).
  return normalized.includes("/izmf");
}

function detectTags(item: HTMLElement, showPaintedTag: boolean): string[] {
  const text = getItemText(item);
  const tags: string[] = [];

  for (const tag of TAGS) {
    if (!showPaintedTag && tag.key === "painted") continue;
    if (tag.tokens.some((token) => text.includes(token))) {
      tags.push(tag.key);
    }
  }

  if (showPaintedTag) {
    const paintSprite = item.querySelector<HTMLElement>("img[src*='paint_'], img[src*='paintkit']");
    if (paintSprite && !tags.includes("painted")) tags.push("painted");

    const paintNameSignal = /\b(peculiarly\s+painted|painted|paint\s*color|color\s*(no\.|number)|mann\s*co\.\s*orange|team\s*spirit|australium\s*gold)\b/i.test(
      item.getAttribute("data-name") || ""
    );
    if (paintNameSignal && !tags.includes("painted")) tags.push("painted");

    if (hasLikelyPaintedEffectIcon(item) && !tags.includes("painted")) tags.push("painted");
  }

  return tags;
}

function primaryTag(tags: string[]): string | null {
  if (tags.length === 0) return null;
  for (const tag of TAGS) {
    if (tags.includes(tag.key)) return tag.key;
  }
  return tags[0] || null;
}

function ensureSummaryNode(): HTMLElement | null {
  const host = ensureControlsHost();
  if (!host) return null;

  const existing = document.getElementById(SUMMARY_ID);
  if (existing) {
    if (existing.parentElement !== host) {
      host.appendChild(existing);
    }
    return existing;
  }

  const summary = document.createElement("span");
  summary.id = SUMMARY_ID;
  host.appendChild(summary);
  return summary;
}

function ensureControlsHost(): HTMLElement | null {
  const heading = document.querySelector<HTMLElement>(LISTINGS_HEADING_SELECTOR);

  if (!heading) return null;

  const existing = document.getElementById(CONTROLS_WRAP_ID);
  if (existing) {
    if (existing.parentElement !== heading) {
      const anchorButton = heading.querySelector<HTMLButtonElement>("button[onclick*='Inventory.uu'], button#" + UNDERCUT_BUTTON_ID);
      if (anchorButton?.nextSibling) {
        heading.insertBefore(existing, anchorButton.nextSibling);
      } else {
        heading.appendChild(existing);
      }
    }
    return existing;
  }

  const wrap = document.createElement("span");
  wrap.id = CONTROLS_WRAP_ID;

  const nativeUndercutButton = heading.querySelector<HTMLButtonElement>("button[onclick*='Inventory.uu']");
  if (nativeUndercutButton) {
    nativeUndercutButton.removeAttribute("onclick");
    nativeUndercutButton.onclick = null;
    nativeUndercutButton.id = UNDERCUT_BUTTON_ID;
    nativeUndercutButton.setAttribute("type", "button");
    nativeUndercutButton.classList.add("btn", "btn-sm", "btn-secondary");

    if (nativeUndercutButton.nextSibling) {
      heading.insertBefore(wrap, nativeUndercutButton.nextSibling);
    } else {
      heading.appendChild(wrap);
    }
    return wrap;
  }

  heading.appendChild(wrap);
  return wrap;
}

function isUndercutItem(item: HTMLElement): boolean {
  return Boolean(item.querySelector(".item-price.is-high, .item-price .price-high, .price-high"));
}

function applyVisibilityFilters(items: HTMLElement[]): void {
  for (const item of items) {
    let hidden = false;

    if (activeTagFilter) {
      const itemTags = (item.getAttribute(TAGS_ATTR) || "").split(",").filter((part) => part.length > 0);
      if (!itemTags.includes(activeTagFilter)) hidden = true;
    }

    if (!hidden && undercutOnly && item.closest("#on-sale-items")) {
      hidden = !isUndercutItem(item);
    }

    item.classList.toggle(HIDDEN_CLASS, hidden);
  }
}

function renderSummary(countByTag: Map<string, number>, items: HTMLElement[]): void {
  const summary = ensureSummaryNode();
  if (!summary) return;

  const rows = TAGS.map((tag) => ({ tag, count: countByTag.get(tag.key) || 0 }));

  if (activeTagFilter && !rows.some((entry) => entry.tag.key === activeTagFilter)) {
    activeTagFilter = null;
  }

  const chips = rows
    .map(({ tag, count }) => {
      const active = activeTagFilter === tag.key;
      const muted = count === 0 ? "tag-muted" : "";
      return `<span class="tag ${active ? "active" : ""} ${muted}" data-tag="${tag.key}">${tag.label}: ${count}</span>`;
    })
    .join("");

  summary.innerHTML = chips;

  summary.onclick = (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const chip = target.closest<HTMLElement>(".tag[data-tag]");
    if (!chip) return;
    const tag = chip.dataset.tag || "";
    activeTagFilter = activeTagFilter === tag ? null : tag;
    renderSummary(countByTag, items);
    applyVisibilityFilters(items);
    refreshQuickUpdateScope();
  };
}

function ensureUndercutToggleButton(enabled: boolean, items: HTMLElement[]): void {
  const host = ensureControlsHost();
  if (!host) return;

  if (!enabled) {
    undercutOnly = false;
    const buttonOff = document.getElementById(UNDERCUT_BUTTON_ID) as HTMLButtonElement | null;
    if (buttonOff) {
      buttonOff.setAttribute("data-active", "false");
      buttonOff.textContent = "Show only undercut";
      buttonOff.dataset.i18nKey = "inventory.showUndercut";
    }
    return;
  }

  let button = document.getElementById(UNDERCUT_BUTTON_ID) as HTMLButtonElement | null;
  if (!button) {
    const native = host.querySelector<HTMLButtonElement>("button");
    button = native || document.createElement("button");
    button.id = UNDERCUT_BUTTON_ID;
    button.type = "button";
    button.removeAttribute("onclick");
    button.onclick = null;
    host.appendChild(button);
  }

  if (button && button.dataset.manncoEnhancerBound !== "true") {
    button.addEventListener("click", () => {
      undercutOnly = !undercutOnly;
      button?.setAttribute("data-active", undercutOnly ? "true" : "false");
      button && (button.textContent = "Show only undercut");

      const search = document.querySelector<HTMLInputElement>(".serachBottom");
      if (search) {
        search.value = undercutOnly ? "undercut" : "";
        search.dispatchEvent(new KeyboardEvent("keyup", { bubbles: true }));
        const jq = (window as Window & { $?: (target: Element) => { trigger: (eventName: string) => void } }).$;
        if (typeof jq === "function") {
          jq(search).trigger("keyup");
        }
      }

      applyVisibilityFilters(items);
      refreshQuickUpdateScope();
    });
    button.dataset.manncoEnhancerBound = "true";
  }

  button.setAttribute("data-active", undercutOnly ? "true" : "false");
  button.textContent = "Show only undercut";
}

function getListingsContainer(): HTMLElement | null {
  return document.querySelector<HTMLElement>("#on-sale-items");
}

function getSiteInventoryContainer(): HTMLElement | null {
  return document.querySelector<HTMLElement>("#site-inventory-items");
}

function getVisibleSiteInventoryItems(): HTMLElement[] {
  const container = getSiteInventoryContainer();
  if (!container) return [];
  return Array.from(container.querySelectorAll<HTMLElement>(":scope > li")).filter((item) => isVisible(item));
}

function isMultiWithdrawModeActive(): boolean {
  const toggleButton = document.querySelector<HTMLElement>(".card-body-full-inventory .mbtn");
  const text = (toggleButton?.textContent || "").toLowerCase();
  return /^\s*exit\s+multi-withdraw\s+mode\s*$/i.test(text);
}

function updateMultiWithdrawControlsVisibility(multiMode: boolean): void {
  const inventoryCard = document.querySelector<HTMLElement>(".card-body-full-inventory");
  inventoryCard?.classList.toggle(MULTI_MODE_CLASS, multiMode);

  const multiActions = document.querySelectorAll<HTMLElement>(".card-body-full-inventory .ww");
  for (const action of Array.from(multiActions)) {
    action.hidden = !multiMode;
    action.setAttribute("aria-hidden", multiMode ? "false" : "true");
    action.style.display = multiMode ? "inline-flex" : "none";
  }
}

function bindMultiWithdrawToggleWatcher(): void {
  if (multiWithdrawToggleBound) return;
  multiWithdrawToggleBound = true;

  const toggleButton = document.querySelector<HTMLElement>(".card-body-full-inventory .mbtn");
  if (!toggleButton) return;

  toggleButton.addEventListener("click", () => {
    window.setTimeout(() => {
      updateMultiWithdrawControlsVisibility(isMultiWithdrawModeActive());
    }, 80);
  });
}

function syncMultiWithdrawVisual(item: HTMLElement): void {
  const checkbox = item.querySelector<HTMLInputElement>(".selecctmultiplewithdraw");
  item.classList.toggle(MULTI_SELECTED_CLASS, Boolean(checkbox?.checked));
}

function ensureMultiWithdrawItemClicks(): void {
  const items = document.querySelectorAll<HTMLElement>("#site-inventory-items > li");
  const multiMode = isMultiWithdrawModeActive();
  updateMultiWithdrawControlsVisibility(multiMode);
  bindMultiWithdrawToggleWatcher();

  for (const item of Array.from(items)) {
    syncMultiWithdrawVisual(item);

    if (item.dataset.manncoEnhancerMultiClickBound !== "true") {
      item.addEventListener("click", (event) => {
        if (!isMultiWithdrawModeActive()) return;

        const target = event.target;
        if (!(target instanceof HTMLElement)) return;
        if (target.closest("button, a, input, label, .item-actions")) return;

        const checkbox = item.querySelector<HTMLInputElement>(".selecctmultiplewithdraw");
        if (!checkbox) return;

        event.preventDefault();
        event.stopPropagation();

        checkbox.checked = !checkbox.checked;
        checkbox.dispatchEvent(new Event("change", { bubbles: true }));
        syncMultiWithdrawVisual(item);
      }, true);

      const checkbox = item.querySelector<HTMLInputElement>(".selecctmultiplewithdraw");
      checkbox?.addEventListener("change", () => syncMultiWithdrawVisual(item));

      item.dataset.manncoEnhancerMultiClickBound = "true";
    }

    if (!multiMode) {
      item.classList.remove(MULTI_SELECTED_CLASS);
    }
  }
}

function getVisibleListingItems(): HTMLElement[] {
  const container = getListingsContainer();
  if (!container) return [];
  return Array.from(container.querySelectorAll<HTMLElement>(":scope > li")).filter((item) => isVisible(item));
}

function getQuickUpdateItems(): HTMLElement[] {
  return getVisibleListingItems().filter((item) => isUndercutItem(item));
}

function getListingsTabTrigger(): HTMLElement | null {
  return document.querySelector<HTMLElement>("a[data-bs-toggle='pill'][href='#tab-on-sale']");
}

function getSiteInventoryTabTrigger(): HTMLElement | null {
  return document.querySelector<HTMLElement>("a[data-bs-toggle='pill'][href='#tab-site-inventory']");
}

function getActiveInventoryTab(): "listings" | "inventory" | null {
  const listingsPane = document.querySelector<HTMLElement>("#tab-on-sale");
  const inventoryPane = document.querySelector<HTMLElement>("#tab-site-inventory");

  if (listingsPane?.classList.contains("active") || listingsPane?.classList.contains("show")) return "listings";
  if (inventoryPane?.classList.contains("active") || inventoryPane?.classList.contains("show")) return "inventory";

  const listingsTrigger = getListingsTabTrigger();
  if (listingsTrigger?.classList.contains("active") || listingsTrigger?.getAttribute("aria-selected") === "true") return "listings";

  const inventoryTrigger = getSiteInventoryTabTrigger();
  if (inventoryTrigger?.classList.contains("active") || inventoryTrigger?.getAttribute("aria-selected") === "true") return "inventory";

  return null;
}

function scheduleAutoSelectFirstTabItem(delayMs = 120): void {
  if (listingsAutoSelectTimer !== null) {
    window.clearTimeout(listingsAutoSelectTimer);
  }

  listingsAutoSelectTimer = window.setTimeout(() => {
    listingsAutoSelectTimer = null;
    let candidate: HTMLElement | null = null;
    const activeTab = getActiveInventoryTab();

    if (activeTab === "listings") {
      candidate = getQuickUpdateItems()[0] || getVisibleListingItems()[0] || null;
    } else if (activeTab === "inventory") {
      candidate = getVisibleSiteInventoryItems()[0] || null;
    }

    if (!candidate) return;

    void ensureItemSelectedForUpdate(candidate);
  }, delayMs);
}

function bindListingsAutoSelectOnManualTabChange(): void {
  if (listingsAutoSelectBound) return;
  listingsAutoSelectBound = true;

  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const tabTrigger = target.closest<HTMLElement>("a[data-bs-toggle='pill'][href='#tab-on-sale'], a[data-bs-toggle='pill'][href='#tab-site-inventory']");
    if (!tabTrigger) return;
    scheduleAutoSelectFirstTabItem(160);
  });

  document.addEventListener("shown.bs.tab", () => {
    scheduleAutoSelectFirstTabItem(160);
  });
}

function isListingsTabActive(): boolean {
  return getActiveInventoryTab() === "listings";
}

async function ensureListingsTabActive(): Promise<void> {
  if (isListingsTabActive()) return;

  const trigger = getListingsTabTrigger();
  trigger?.click();

  for (let i = 0; i < 20; i += 1) {
    if (isListingsTabActive()) return;
    await sleep(60);
  }
}

async function ensureListingsGridLayout(): Promise<void> {
  const gridButton = document.querySelector<HTMLButtonElement>(
    "#tab-on-sale button.btn-switch-layout.layout-grid, .card-head button.btn-switch-layout.layout-grid"
  );
  if (!gridButton) return;

  const isActive = (): boolean =>
    gridButton.classList.contains("is-active") ||
    gridButton.classList.contains("active") ||
    gridButton.getAttribute("aria-selected") === "true";

  if (isActive()) return;
  gridButton.click();

  for (let i = 0; i < 16; i += 1) {
    if (isActive()) return;
    await sleep(60);
  }
}

function ensureQuickUpdateButton(enabled: boolean): void {
  const nav = document.querySelector<HTMLElement>("ul.inventory-navbar.nav.nav-pills");
  if (!nav) return;

  if (!enabled) {
    document.getElementById(QUICK_UPDATE_BUTTON_ID)?.remove();
    document.getElementById(QUICK_UPDATE_NAV_ITEM_ID)?.remove();
    closeQuickModal();
    quickSessionCompleted = false;
    return;
  }

  let navItem = document.getElementById(QUICK_UPDATE_NAV_ITEM_ID) as HTMLLIElement | null;
  let button = document.getElementById(QUICK_UPDATE_BUTTON_ID) as HTMLButtonElement | null;
  if (!navItem) {
    navItem = document.createElement("li");
    navItem.id = QUICK_UPDATE_NAV_ITEM_ID;
    navItem.className = "inventory-navbar__item nav-item";
  }

  if (!button) {

    button = document.createElement("button");
    button.id = QUICK_UPDATE_BUTTON_ID;
    button.type = "button";
    button.className = "btn btn-secondary";
    button.textContent = "Quick Update";
    button.addEventListener("click", () => {
      void openQuickModal();
    });

    navItem.appendChild(button);
  }

  if (button.parentElement !== navItem) {
    navItem.appendChild(button);
  }

  const tabsGroupItem = nav.querySelector<HTMLElement>(".inventory-navbar__item-group")?.closest("li.inventory-navbar__item");
  if (tabsGroupItem) {
    nav.insertBefore(navItem, tabsGroupItem);
  } else if (navItem.parentElement !== nav) {
    nav.appendChild(navItem);
  }

  button.disabled = quickSessionCompleted;
  button.textContent = quickSessionCompleted ? "Quick Update (done)" : "Quick Update";
  button.title = quickSessionCompleted ? "Quick update finished. Refresh page to run again." : "";
}

function completeQuickSession(): void {
  quickSessionCompleted = true;
  closeQuickModal();
  const button = document.getElementById(QUICK_UPDATE_BUTTON_ID) as HTMLButtonElement | null;
  if (!button) return;
  button.disabled = true;
  button.textContent = "Quick Update (done)";
  button.title = "Quick update finished. Refresh page to run again.";
}

function readMoneyFromNode(node: Element | null): number | null {
  if (!(node instanceof HTMLElement)) return null;
  return parseMoney(node.textContent || "");
}

function readQuickPrices(item: HTMLElement): QuickPrices {
  const current = readMoneyFromNode(item.querySelector(".item-price"));
  const instant = readMoneyFromNode(item.querySelector(".item-lowest-price span"));
  const match = readMoneyFromNode(item.querySelector(".item-highest-price span"));
  const suggested = typeof match === "number" && Number.isFinite(match) && match > 0 ? Math.max(0.01, Number((match - 0.01).toFixed(2))) : null;
  const steam = readMoneyFromNode(item.querySelector(".item-highest-sprice span"));
  return { current, instant, match, suggested, steam };
}

function formatMoney(value: number | null): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "n/a";
  return `$${value.toFixed(2)}`;
}

function toCents(value: number): number {
  return Math.round(value * 100);
}

function getItemIdentity(item: HTMLElement): string {
  const id = item.getAttribute("data-id")?.trim();
  if (id) return `id:${id}`;

  const isd = item.getAttribute("data-isd")?.trim() || "";
  const name = item.getAttribute("data-name")?.trim() || item.querySelector<HTMLElement>(".item-name-description")?.textContent?.trim() || "";
  return `fallback:${isd}:${name}`;
}

function isPreparedStateValid(item: HTMLElement, source: QuickSource): boolean {
  if (!quickPreparedState) return false;
  const now = Date.now();
  if (now - quickPreparedState.preparedAt > QUICK_PREPARED_TTL_MS) return false;
  return quickPreparedState.itemId === getItemIdentity(item) && quickPreparedState.source === source;
}

function clearPreparedState(): void {
  quickPreparedState = null;
}

function getQuickSourcePrice(prices: QuickPrices, source: QuickSource): number | null {
  if (source === "suggested") return prices.suggested;
  if (source === "match") return prices.match;
  return prices.instant;
}

function getAutoSidebarSource(): QuickSource | null {
  if (quickAutoPriceMode === "suggested") return "suggested";
  if (quickAutoPriceMode === "match") return "match";
  return null;
}

function hasGreenSuccessToastSince(startedAtMs: number): boolean {
  const toasts = document.querySelectorAll<HTMLElement>(".iziToast.iziToast-opened.iziToast-color-green[data-izitoast-ref]");
  for (const toast of Array.from(toasts)) {
    const ref = Number(toast.getAttribute("data-izitoast-ref") || "");
    if (Number.isFinite(ref) && ref >= startedAtMs - 600) return true;
  }
  return false;
}

function normalizeKey(value: string): string {
  return value
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[^a-z0-9|()\-\s]/g, "")
    .trim();
}

function readSidebarSelectedName(): string {
  const raw =
    document.querySelector<HTMLElement>(".inventory-sidebar__item .item-name-description")?.textContent ||
    document.querySelector<HTMLElement>(".inventory-sidebar__item .inventory-sidebar__item-name")?.textContent ||
    "";
  return normalizeKey(raw);
}

function readListItemName(item: HTMLElement): string {
  const raw =
    item.querySelector<HTMLElement>(".item-name-description")?.textContent ||
    item.getAttribute("data-name") ||
    "";
  return normalizeKey(raw);
}

function isSidebarSyncedWithItem(item: HTMLElement): boolean {
  const sidebarName = readSidebarSelectedName();
  const listName = readListItemName(item);
  if (!sidebarName || !listName) return true;
  return sidebarName.includes(listName) || listName.includes(sidebarName);
}

function getLiveListingNode(item: HTMLElement): HTMLElement {
  const id = item.getAttribute("data-id")?.trim();
  if (id) {
    const byId = document.querySelector<HTMLElement>(`#on-sale-items > li[data-id="${CSS.escape(id)}"]`);
    if (byId) return byId;
  }
  return item;
}

function listingHasExpectedGridPrice(item: HTMLElement, expectedPriceCents: number): boolean {
  const live = getLiveListingNode(item);

  const attrValue = Number(live.getAttribute("data-price") || "");
  if (Number.isFinite(attrValue) && attrValue === expectedPriceCents) return true;

  const uiPrice = readMoneyFromNode(live.querySelector(".item-price"));
  if (typeof uiPrice === "number" && Number.isFinite(uiPrice) && toCents(uiPrice) === expectedPriceCents) return true;

  return false;
}

async function waitForPriceChange(
  item: HTMLElement,
  previousPriceCents: number | null,
  expectedPriceCents: number,
  actionStartedAtMs: number
): Promise<boolean> {
  return new Promise((resolve) => {
    const started = Date.now();

    const timer = window.setInterval(() => {
      if (listingHasExpectedGridPrice(item, expectedPriceCents)) {
        window.clearInterval(timer);
        resolve(true);
        return;
      }

      if (previousPriceCents === expectedPriceCents && Date.now() - started >= 140) {
        window.clearInterval(timer);
        resolve(true);
        return;
      }

      if (hasGreenSuccessToastSince(actionStartedAtMs)) {
        window.clearInterval(timer);
        resolve(true);
        return;
      }

      if (Date.now() - started >= QUICK_VERIFY_TIMEOUT_MS) {
        window.clearInterval(timer);
        resolve(false);
      }
    }, QUICK_VERIFY_INTERVAL_MS);
  });
}

function shouldCheckDiscountWarning(item: HTMLElement, targetPrice: number): boolean {
  const prices = readQuickPrices(item);
  const steam = prices.steam;
  const baseline = prices.match ?? prices.suggested;
  if (typeof steam !== "number" || !Number.isFinite(steam) || steam <= 0) return false;
  if (typeof baseline !== "number" || !Number.isFinite(baseline) || baseline <= 0) return false;

  const steamVsBaselineGap = Math.abs(steam - baseline) / steam;
  const targetVsBaselineGap = Math.abs(targetPrice - baseline) / baseline;

  return steamVsBaselineGap >= 0.2 && targetVsBaselineGap <= 0.08;
}

async function ensureItemSelectedForUpdate(item: HTMLElement): Promise<void> {
  item.click();
  await sleep(60);
}

function getUpdateButtonForItem(item: HTMLElement): HTMLButtonElement | null {
  return (
    item.querySelector<HTMLButtonElement>(".item-actions .btn.btn-sm.btn-secondary.uuu.ukj") ||
    item.querySelector<HTMLButtonElement>(".item-actions .ukj") ||
    item.querySelector<HTMLButtonElement>("button[onclick*='typez = \'update\''], button[onclick*='typez = \"update\"']")
  );
}

function getQuickSidebarForm(): HTMLElement | null {
  return (
    document.querySelector<HTMLElement>("#tab-on-sale .inventory-sidebar__form") ||
    document.querySelector<HTMLElement>(".inventory-sidebar__form")
  );
}

function getOnclickText(node: Element): string {
  return (node.getAttribute("onclick") || "").replace(/\s+/g, "").toLowerCase();
}

function clickSidebarPreset(form: HTMLElement, source: QuickSource): boolean {
  const candidates = Array.from(form.querySelectorAll<HTMLElement>(".predefined-prices__item[onclick], [onclick*='setLowest'], [onclick*='setHiorice']"));
  const target = candidates.find((node) => {
    const onclick = getOnclickText(node);
    if (source === "suggested") return onclick.includes("inventory.setlowestnow(");
    if (source === "instant") return onclick.includes("inventory.sethiorice(");
    return onclick.includes("inventory.setlowest(") && !onclick.includes("inventory.setlowestnow(");
  });
  if (!target) return false;
  target.click();
  return true;
}

function clickSidebarUpdate(form: HTMLElement): boolean {
  const button =
    form.querySelector<HTMLButtonElement>("button.update") ||
    form.querySelector<HTMLButtonElement>("button[onclick*='Inventory.update']") ||
    Array.from(form.querySelectorAll<HTMLButtonElement>("button")).find((node) => /update/i.test(node.textContent || "")) ||
    null;
  if (!button) return false;
  button.click();
  return true;
}

function readSidebarPrice(form: HTMLElement): number | null {
  const input =
    form.querySelector<HTMLInputElement>("#inventory-sidebar-price") ||
    form.querySelector<HTMLInputElement>("input.inventory-sidebar__price-field.pricesel") ||
    form.querySelector<HTMLInputElement>("input.pricesel") ||
    null;
  if (!input) return null;
  return parseMoney(input.value || "");
}

async function prepareSidebarForQuickUpdate(item: HTMLElement, expectedPrice: number | null, source: QuickSource): Promise<boolean> {
  quickLastRunError = "";

  await ensureItemSelectedForUpdate(item);
  await sleep(35);

  if (!isSidebarSyncedWithItem(item)) {
    quickLastRunError = "Selected item did not sync to sidebar yet. Try again.";
    clearPreparedState();
    return false;
  }

  const sidebarForm = getQuickSidebarForm();
  if (!sidebarForm) {
    quickLastRunError = "Could not find sidebar form for quick update.";
    clearPreparedState();
    return false;
  }

  if (!clickSidebarPreset(sidebarForm, source)) {
    quickLastRunError = "Could not click the selected predefined price button.";
    clearPreparedState();
    return false;
  }

  await sleep(30);

  const confirmed = readSidebarPrice(sidebarForm);
  if (typeof confirmed !== "number" || !Number.isFinite(confirmed)) {
    quickLastRunError = "Could not read sidebar value after preset click.";
    clearPreparedState();
    return false;
  }

  if (typeof expectedPrice === "number" && Number.isFinite(expectedPrice) && Math.abs(toCents(confirmed) - toCents(expectedPrice)) >= 300) {
    setQuickStatus("Warning: sidebar value is far from HUD value. Please confirm before update.");
  }

  quickPreparedState = {
    itemId: getItemIdentity(item),
    source,
    preparedAt: Date.now()
  };

  return true;
}

async function handleLowPriceWarningModal(ignoreWarning: boolean): Promise<"none" | "confirmed" | "blocked"> {
  const timeoutMs = 3200;
  const started = Date.now();
  let seenModal = false;

  while (Date.now() - started < timeoutMs) {
    const visible = getVisibleDiscountWarningModal();
    if (visible) {
      seenModal = true;
      if (ignoreWarning) {
        if (!clickDiscountWarningOk(visible)) return "blocked";
        await sleep(20);
        return "confirmed";
      }

      await sleep(25);
      continue;
    }

    if (!ignoreWarning && seenModal) {
      return "confirmed";
    }

    if (!ignoreWarning && Date.now() - started > 100) {
      return "confirmed";
    }

    await sleep(25);
  }

  return ignoreWarning ? "none" : "blocked";
}

function getVisibleDiscountWarningModal(): HTMLElement | null {
  const warningModal = document.querySelector<HTMLElement>("#modal-total-selldiscount");
  if (!warningModal) return null;

  ensureDiscountWarningShortcutHints(warningModal);

  const visible =
    warningModal.classList.contains("show") ||
    warningModal.style.display === "block" ||
    warningModal.getAttribute("aria-modal") === "true";

  return visible ? warningModal : null;
}

function ensureDiscountWarningShortcutHints(modal: HTMLElement): void {
  const attachHint = (button: HTMLButtonElement | null, label: string): void => {
    if (!button) return;
    if (button.querySelector(".mannco-enhancer-shortcut-hint")) return;
    const hint = document.createElement("span");
    hint.className = "mannco-enhancer-shortcut-hint";
    hint.innerHTML = `<span class="mannco-enhancer-keycap">${label}</span>`;
    button.appendChild(hint);
  };

  const cancelButton =
    modal.querySelector<HTMLButtonElement>(".modal-footer .btn.btn-secondary") ||
    Array.from(modal.querySelectorAll<HTMLButtonElement>("button")).find((button) => /cancel/i.test(button.textContent || "")) ||
    null;

  const okButton =
    modal.querySelector<HTMLButtonElement>("button[onclick*='Inventory.lastfunction']") ||
    modal.querySelector<HTMLButtonElement>(".modal-footer .btn.btn-primary") ||
    null;

  attachHint(cancelButton, "Esc");
  attachHint(okButton, "Enter");
}

function clickDiscountWarningOk(modal: HTMLElement): boolean {
  const okButton =
    modal.querySelector<HTMLButtonElement>("button[onclick*='Inventory.lastfunction']") ||
    modal.querySelector<HTMLButtonElement>(".modal-footer .btn.btn-primary") ||
    null;
  if (!okButton) return false;
  okButton.click();
  return true;
}

function getVisibleTotalItemsModal(): HTMLElement | null {
  const modal = document.querySelector<HTMLElement>("#modal-total-items");
  if (!modal) return null;

  ensureTotalItemsShortcutHints(modal);

  const visible =
    modal.classList.contains("show") ||
    modal.style.display === "block" ||
    modal.getAttribute("aria-modal") === "true";

  return visible ? modal : null;
}

function ensureTotalItemsShortcutHints(modal: HTMLElement): void {
  const attachHint = (button: HTMLButtonElement | null, label: string): void => {
    if (!button) return;
    if (button.querySelector(".mannco-enhancer-shortcut-hint")) return;
    const hint = document.createElement("span");
    hint.className = "mannco-enhancer-shortcut-hint";
    hint.innerHTML = `<span class="mannco-enhancer-keycap">${label}</span>`;
    button.appendChild(hint);
  };

  const cancelButton = modal.querySelector<HTMLButtonElement>(".modal-body button[type='button'].btn.btn-secondary");
  const addButton = modal.querySelector<HTMLButtonElement>(".modal-body button[type='submit'].btn.btn-primary");
  attachHint(cancelButton, "Esc");
  attachHint(addButton, "Enter");
}

function setTotalItemsInputValue(modal: HTMLElement): void {
  const input = modal.querySelector<HTMLInputElement>("input.quantitydep");
  if (!input) return;

  const rawIds = input.getAttribute("data-id") || "";
  const totalIds = rawIds
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean).length;
  const current = Number(input.value || "");

  const target = totalIds > 0 ? totalIds : Number.isFinite(current) && current > 0 ? current : 1;
  input.value = String(target);
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

function clickTotalItemsAdd(modal: HTMLElement): boolean {
  const addButton = modal.querySelector<HTMLButtonElement>(".modal-body button[type='submit'].btn.btn-primary");
  if (!addButton) return false;
  addButton.click();
  return true;
}

function isModalVisibleById(modalId: string): boolean {
  const modal = document.getElementById(modalId);
  if (!modal) return false;
  return modal.classList.contains("show") || modal.getAttribute("aria-modal") === "true" || modal.style.display === "block";
}

function waitForModalClose(modalId: string, timeoutMs: number): Promise<boolean> {
  return new Promise((resolve) => {
    const modal = document.getElementById(modalId);
    if (!modal || !isModalVisibleById(modalId)) {
      resolve(true);
      return;
    }

    const done = (value: boolean): void => {
      observer.disconnect();
      window.clearInterval(pollTimer);
      window.clearTimeout(timeoutTimer);
      resolve(value);
    };

    const check = (): void => {
      if (!isModalVisibleById(modalId)) done(true);
    };

    const observer = new MutationObserver(() => {
      check();
    });

    observer.observe(modal, { attributes: true, attributeFilter: ["class", "style", "aria-modal"] });

    const pollTimer = window.setInterval(check, 35);
    const timeoutTimer = window.setTimeout(() => done(false), timeoutMs);
  });
}

async function handleTotalItemsModal(autoConfirm: boolean): Promise<"none" | "confirmed" | "blocked"> {
  const timeoutMs = 2600;
  const started = Date.now();
  let seenModal = false;

  while (Date.now() - started < timeoutMs) {
    const modal = getVisibleTotalItemsModal();
    if (!modal) {
      if (seenModal) return "confirmed";
      await sleep(45);
      continue;
    }

    seenModal = true;

    if (!autoConfirm) {
      const closed = await waitForModalClose("modal-total-items", 6000);
      return closed ? "confirmed" : "blocked";
    }

    setTotalItemsInputValue(modal);
    await sleep(20);
    if (!clickTotalItemsAdd(modal)) return "blocked";
    const closed = await waitForModalClose("modal-total-items", 2200);
    return closed ? "confirmed" : "blocked";
  }

  return "none";
}

async function openUpdateModalForItem(item: HTMLElement): Promise<HTMLElement | null> {
  const updateButton = getUpdateButtonForItem(item);
  if (!updateButton) return null;

  updateButton.click();

  for (let i = 0; i < 20; i += 1) {
    const modal = document.querySelector<HTMLElement>("#modal-total-sinven");
    if (modal && (modal.classList.contains("show") || modal.style.display !== "none")) return modal;
    await sleep(60);
  }

  return document.querySelector<HTMLElement>("#modal-total-sinven");
}

function setUpdateModalPrice(modal: HTMLElement, price: number): boolean {
  const input =
    modal.querySelector<HTMLInputElement>(".pricessel") ||
    modal.querySelector<HTMLInputElement>(".pricesel") ||
    modal.querySelector<HTMLInputElement>("input[type='tel']");
  if (!input) return false;

  input.value = price.toFixed(2);
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
  return true;
}

function applyUpdateModalPreset(modal: HTMLElement, source: QuickSource): boolean {
  const selectorBySource: Record<QuickSource, string> = {
    suggested: "dl[onclick*='setLowestNow']",
    match: "dl[onclick*='setLowest']",
    instant: "dl[onclick*='setHiorice']"
  };

  const preset = modal.querySelector<HTMLElement>(selectorBySource[source]);
  if (!preset) return false;

  preset.click();
  return true;
}

function clickUpdateModalValidate(modal: HTMLElement): boolean {
  const validateButton =
    modal.querySelector<HTMLButtonElement>("button[onclick*='Inventory.validate']") ||
    Array.from(modal.querySelectorAll<HTMLButtonElement>("button")).find((button) =>
      /validate/i.test(button.textContent || "")
    ) ||
    null;

  if (!validateButton) return false;
  validateButton.click();
  return true;
}

async function syncQuickCurrentItemSelection(item: HTMLElement): Promise<void> {
  const runId = ++quickSelectionRun;
  await ensureItemSelectedForUpdate(item);
  if (runId !== quickSelectionRun) return;
}

async function runListingUpdate(item: HTMLElement, price: number): Promise<boolean> {
  const previousPriceCentsRaw = Number(item.getAttribute("data-price") || "");
  const previousPriceCents = Number.isFinite(previousPriceCentsRaw) ? previousPriceCentsRaw : null;
  const expectedPriceCents = Math.round(price * 100);

  const sidebarForm = getQuickSidebarForm();
  if (!sidebarForm) {
    quickLastRunError = "Could not find sidebar form for quick update.";
    return false;
  }

  if (!isSidebarSyncedWithItem(item)) {
    quickLastRunError = "Sidebar item changed before update. Update canceled for safety.";
    return false;
  }

  const actionStartedAtMs = Date.now();
  if (!clickSidebarUpdate(sidebarForm)) {
    quickLastRunError = "Could not click sidebar Update button.";
    return false;
  }

  const totalItemsState = await handleTotalItemsModal(quickAutoConfirmTotalItems);
  if (totalItemsState === "blocked") {
    quickLastRunError = quickAutoConfirmTotalItems
      ? "Total-items modal appeared but could not be auto-confirmed."
      : "Total-items modal appeared. Press Enter to Add or enable auto add quantity.";
    return false;
  }

  if (shouldCheckDiscountWarning(item, price)) {
    const warningState = await handleLowPriceWarningModal(quickIgnoreDiscountWarning);
    if (warningState === "blocked") {
      quickLastRunError = quickIgnoreDiscountWarning
        ? "Low-price warning appeared but could not be auto-confirmed."
        : "Low-price warning is waiting for confirmation (press Enter on modal).";
      return false;
    }
  }

  const changed = await waitForPriceChange(item, previousPriceCents, expectedPriceCents, actionStartedAtMs);
  if (!changed) {
    quickLastRunError = "Site did not confirm update (no price change/toast in time).";
  }
  clearPreparedState();
  return changed;
}

function ensureQuickModal(): HTMLElement {
  let modal = document.getElementById(QUICK_MODAL_ID);
  if (modal) return modal;

  modal = document.createElement("div");
  modal.id = QUICK_MODAL_ID;
  modal.innerHTML = `
    <div class="q-card" role="dialog" aria-modal="true" aria-label="Quick update modal">
      <div class="q-head">
        <strong>Quick Update</strong>
        <span class="q-counter" id="mannco-enhancer-quick-counter">0 / 0</span>
      </div>
      <div class="q-body">
        <div class="q-main">
          <div class="q-item-preview" id="mannco-enhancer-quick-item-preview"></div>
          <div>
            <div class="q-prices">
              <button type="button" class="q-price-btn" data-source="instant"><span class="k">Instant sell</span><span class="v" id="mannco-enhancer-quick-instant">n/a</span></button>
              <button type="button" class="q-price-btn" data-source="suggested"><span class="k">Suggested</span><span class="v" id="mannco-enhancer-quick-suggested">n/a</span></button>
              <button type="button" class="q-price-btn" data-source="match"><span class="k">Price match</span><span class="v" id="mannco-enhancer-quick-match">n/a</span></button>
              <button type="button" class="q-price-btn" data-source="steam"><span class="k">Steam Price</span><span class="v" id="mannco-enhancer-quick-steam">n/a</span></button>
            </div>
            <input id="mannco-enhancer-quick-input" class="q-input" type="text" inputmode="decimal" placeholder="0.00" />
            <div class="q-warning" id="mannco-enhancer-quick-warning"></div>
            <div class="q-status" id="mannco-enhancer-quick-status"></div>
            <div class="q-shortcuts">
              <span class="q-key">Enter</span> update + next
              <span class="q-sep">|</span>
              <span class="q-key">Esc</span> close/cancel
              <span class="q-sep">|</span>
              <span class="q-key">Left</span>/<span class="q-key">Right</span> navigate
              <span class="q-sep">|</span>
              <span class="q-key">1</span> Suggested
              <span class="q-key">2</span> Match
              <span class="q-key">3</span> Instant
            </div>
          </div>
        </div>
      </div>
      <div class="q-foot">
        <button type="button" class="q-btn" id="mannco-enhancer-quick-prev">Prev</button>
        <button type="button" class="q-btn q-primary" id="mannco-enhancer-quick-apply">Apply & Next</button>
        <button type="button" class="q-btn" id="mannco-enhancer-quick-next">Next</button>
        <button type="button" class="q-btn" id="mannco-enhancer-quick-close">Close</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  modal.addEventListener("click", (event) => {
    if (event.target === modal) closeQuickModal();
  });

  const closeButton = modal.querySelector<HTMLButtonElement>("#mannco-enhancer-quick-close");
  closeButton?.addEventListener("click", () => closeQuickModal());

  const prevButton = modal.querySelector<HTMLButtonElement>("#mannco-enhancer-quick-prev");
  prevButton?.addEventListener("click", () => {
    if (!quickOpen || quickItems.length === 0) return;
    quickIndex = quickIndex <= 0 ? quickItems.length - 1 : quickIndex - 1;
    renderQuickModalItem();
  });

  const nextButton = modal.querySelector<HTMLButtonElement>("#mannco-enhancer-quick-next");
  nextButton?.addEventListener("click", () => {
    if (!quickOpen || quickItems.length === 0) return;
    quickIndex = (quickIndex + 1) % quickItems.length;
    renderQuickModalItem();
  });

  const applyButton = modal.querySelector<HTMLButtonElement>("#mannco-enhancer-quick-apply");
  applyButton?.addEventListener("click", () => {
    void applyQuickCurrentAndMove();
  });

  const input = modal.querySelector<HTMLInputElement>("#mannco-enhancer-quick-input");
  input?.addEventListener("input", () => {
    clearPreparedState();
    renderQuickWarning();
  });

  const sourceButtons = modal.querySelectorAll<HTMLButtonElement>(".q-price-btn[data-source]");
  for (const button of Array.from(sourceButtons)) {
    button.addEventListener("click", () => {
      const sourceRaw = button.dataset.source || "suggested";
      if (sourceRaw === "steam") return;
      const source = sourceRaw === "match" ? "match" : sourceRaw === "instant" ? "instant" : "suggested";
      quickSource = source;
      const currentItem = quickItems[quickIndex];
      if (!currentItem) return;
      const prices = readQuickPrices(currentItem);
      const candidate = getQuickSourcePrice(prices, quickSource);
      if (typeof candidate === "number" && Number.isFinite(candidate)) {
        input && (input.value = candidate.toFixed(2));
      }
      clearPreparedState();
      renderQuickSourceState(prices);
      renderQuickWarning();
      const value = parseMoney(input?.value || "");
      if (typeof value === "number" && Number.isFinite(value) && validatePrice(value)) {
        void prepareSidebarForQuickUpdate(currentItem, value, quickSource);
      } else {
        void prepareSidebarForQuickUpdate(currentItem, null, quickSource);
      }
    });
  }

  document.addEventListener("keydown", (event) => {
    if (!quickOpen) return;

    if (event.key === "Escape") {
      event.preventDefault();
      closeQuickModal();
      return;
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      prevButton?.click();
      return;
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      nextButton?.click();
      return;
    }

    if (event.key === "Enter") {
      const totalItemsModal = getVisibleTotalItemsModal();
      if (totalItemsModal) {
        event.preventDefault();
        setTotalItemsInputValue(totalItemsModal);
        const added = clickTotalItemsAdd(totalItemsModal);
        if (added) {
          setQuickStatus("Updating...");
        }
        return;
      }

      const warningModal = getVisibleDiscountWarningModal();
      if (warningModal) {
        event.preventDefault();
        const ok = clickDiscountWarningOk(warningModal);
        if (ok) {
          setQuickStatus("Updating...");
        }
        return;
      }

      event.preventDefault();
      void applyQuickCurrentAndMove();
      return;
    }

    if (event.key === "1") {
      event.preventDefault();
      modal.querySelector<HTMLButtonElement>(".q-price-btn[data-source='suggested']")?.click();
      return;
    }

    if (event.key === "2") {
      event.preventDefault();
      modal.querySelector<HTMLButtonElement>(".q-price-btn[data-source='match']")?.click();
      return;
    }

    if (event.key === "3") {
      event.preventDefault();
      modal.querySelector<HTMLButtonElement>(".q-price-btn[data-source='instant']")?.click();
    }
  });

  return modal;
}

function setQuickStatus(text: string): void {
  const status = document.querySelector<HTMLElement>("#mannco-enhancer-quick-status");
  if (status) status.textContent = text;
}

function setQuickModalBusy(busy: boolean): void {
  const modal = document.getElementById(QUICK_MODAL_ID);
  if (!modal) return;

  modal.setAttribute("data-busy", busy ? "true" : "false");

  const applyButton = modal.querySelector<HTMLButtonElement>("#mannco-enhancer-quick-apply");
  const prevButton = modal.querySelector<HTMLButtonElement>("#mannco-enhancer-quick-prev");
  const nextButton = modal.querySelector<HTMLButtonElement>("#mannco-enhancer-quick-next");
  const closeButton = modal.querySelector<HTMLButtonElement>("#mannco-enhancer-quick-close");
  const input = modal.querySelector<HTMLInputElement>("#mannco-enhancer-quick-input");
  const sourceButtons = modal.querySelectorAll<HTMLButtonElement>(".q-price-btn[data-source]");

  if (applyButton) {
    applyButton.disabled = busy;
    applyButton.textContent = busy ? "Updating..." : "Apply & Next";
  }
  if (prevButton) prevButton.disabled = busy;
  if (nextButton) nextButton.disabled = busy;
  if (closeButton) closeButton.disabled = busy;
  if (input) input.disabled = busy;
  for (const button of Array.from(sourceButtons)) {
    button.disabled = busy;
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildQuickItemPreview(item: HTMLElement): HTMLElement {
  const card = document.createElement("div");
  card.className = "q-mini-card";

  const quantity = item.querySelector<HTMLElement>(".item-quantity")?.textContent?.trim() || "1";
  const image = item.querySelector<HTMLImageElement>("img.item-thumbnail")?.src || "";
  const nameRaw = item.querySelector<HTMLElement>(".item-name-description")?.textContent?.trim() || (item.getAttribute("data-name") || "").trim();
  const name = escapeHtml(nameRaw || "Item");
  const low = escapeHtml(item.querySelector<HTMLElement>(".item-lowest-price span")?.textContent?.trim() || "n/a");
  const high = escapeHtml(item.querySelector<HTMLElement>(".item-highest-price span")?.textContent?.trim() || "n/a");
  const currentRaw = item.querySelector<HTMLElement>(".item-price")?.textContent?.trim() || "n/a";
  const current = escapeHtml(currentRaw);
  const undercut = isUndercutItem(item);

  card.innerHTML = `
    <div class="q-mini-qty">${escapeHtml(quantity)}x</div>
    <div class="q-mini-image-wrap"><img class="q-mini-image" src="${escapeHtml(image)}" alt="${name}" /></div>
    <div class="q-mini-meta">
      <div class="q-mini-ref"><span>${low}</span><span>${high}</span></div>
      <div class="q-mini-name">${name}</div>
    </div>
    <div class="q-mini-price"><span>${current}</span><span class="q-mini-arrow">${undercut ? "↓" : ""}</span></div>
  `;

  return card;
}

function renderQuickWarning(): void {
  const warning = document.querySelector<HTMLElement>("#mannco-enhancer-quick-warning");
  if (!warning || quickItems.length === 0) return;

  const input = document.querySelector<HTMLInputElement>("#mannco-enhancer-quick-input");
  const item = quickItems[quickIndex];
  if (!item) {
    warning.textContent = "";
    return;
  }
  const prices = readQuickPrices(item);
  const value = parseMoney(input?.value || "");

  if (typeof value !== "number" || !Number.isFinite(value)) {
    warning.textContent = "Type a valid price.";
    return;
  }

  if (!validatePrice(value)) {
    warning.textContent = "Price must be above 0 and below 999999.";
    return;
  }

  const reference = getQuickSourcePrice(prices, quickSource) ?? prices.match ?? prices.suggested ?? prices.current;
  if (typeof reference !== "number" || reference <= 0) {
    warning.textContent = "";
    return;
  }

  const drift = Math.abs(value - reference) / reference;
  if (drift >= 0.35) {
    warning.textContent = `Warning: value is ${(drift * 100).toFixed(0)}% away from reference.`;
    return;
  }

  warning.textContent = "";
}

function renderQuickSourceState(prices: QuickPrices): void {
  const sources = document.querySelectorAll<HTMLButtonElement>(".q-price-btn[data-source]");
  for (const source of Array.from(sources)) {
    const sourceRaw = source.dataset.source || "";
    const active = sourceRaw === quickSource;
    source.setAttribute("data-active", active ? "true" : "false");
  }

  const instantNode = document.getElementById("mannco-enhancer-quick-instant");
  const suggestedNode = document.getElementById("mannco-enhancer-quick-suggested");
  const matchNode = document.getElementById("mannco-enhancer-quick-match");
  const steamNode = document.getElementById("mannco-enhancer-quick-steam");
  instantNode && (instantNode.textContent = formatMoney(prices.instant));
  suggestedNode && (suggestedNode.textContent = formatMoney(prices.suggested));
  matchNode && (matchNode.textContent = formatMoney(prices.match));
  steamNode && (steamNode.textContent = formatMoney(prices.steam));
}

function renderQuickModalItem(): void {
  if (!quickOpen || quickItems.length === 0) return;

  const item = quickItems[quickIndex];
  if (!item) return;
  const previewNode = document.getElementById("mannco-enhancer-quick-item-preview");
  const counterNode = document.getElementById("mannco-enhancer-quick-counter");
  const input = document.querySelector<HTMLInputElement>("#mannco-enhancer-quick-input");

  const prices = readQuickPrices(item);

  if (previewNode) {
    previewNode.innerHTML = "";
    previewNode.appendChild(buildQuickItemPreview(item));
  }
  counterNode && (counterNode.textContent = `${quickIndex + 1} / ${quickItems.length}`);

  const candidate = getQuickSourcePrice(prices, quickSource) ?? prices.match ?? prices.suggested ?? prices.current;
  if (input) {
    input.value = typeof candidate === "number" && Number.isFinite(candidate) ? candidate.toFixed(2) : "";
    input.focus();
    input.select();
  }

  clearPreparedState();

  renderQuickSourceState(prices);
  renderQuickWarning();
  setQuickStatus("");

  void syncQuickCurrentItemSelection(item);
  const autoSource = getAutoSidebarSource();
  if (autoSource) {
    const autoCandidate = getQuickSourcePrice(prices, autoSource);
    quickSource = autoSource;
    void prepareSidebarForQuickUpdate(item, autoCandidate, autoSource);
  }
}

function refreshQuickUpdateScope(): void {
  if (!quickOpen) return;

  const previousItems = quickItems;
  const previousIndex = quickIndex;
  const previousCurrent = quickItems[quickIndex] || null;
  const nextItems = getQuickUpdateItems();

  if (nextItems.length === 0) {
    closeQuickModal();
    return;
  }

  let nextIndex = previousIndex;
  if (previousCurrent && nextItems.includes(previousCurrent)) {
    nextIndex = nextItems.indexOf(previousCurrent);
  } else {
    nextIndex = Math.max(0, Math.min(previousIndex, nextItems.length - 1));
  }

  const sameLength = previousItems.length === nextItems.length;
  const sameItems = sameLength && previousItems.every((item, index) => item === nextItems[index]);
  const sameIndex = previousIndex === nextIndex;

  quickItems = nextItems;
  quickIndex = nextIndex;

  if (sameItems && sameIndex) {
    return;
  }

  renderQuickModalItem();
}

async function openQuickModal(): Promise<void> {
  if (quickSessionCompleted) return;

  const modal = ensureQuickModal();

  await ensureListingsTabActive();
  await ensureListingsGridLayout();
  await sleep(120);

  quickItems = getQuickUpdateItems();
  if (quickItems.length === 0) {
    setQuickStatus("No undercut listings to update.");
    return;
  }

  quickSource = quickPreferredSource;
  quickIndex = 0;
  quickOpen = true;
  quickLastRunError = "";
  clearPreparedState();
  modal.setAttribute("data-open", "true");
  setQuickModalBusy(false);
  renderQuickModalItem();

  const firstItem = quickItems[0];
  if (firstItem) {
    await ensureItemSelectedForUpdate(firstItem);
  }
}

function closeQuickModal(): void {
  quickOpen = false;
  quickApplyPending = false;
  clearPreparedState();
  setQuickModalBusy(false);
  const modal = document.getElementById(QUICK_MODAL_ID);
  modal?.setAttribute("data-open", "false");
}

async function applyQuickCurrentAndMove(): Promise<void> {
  if (quickApplyPending || !quickOpen || quickItems.length === 0) return;

  const now = Date.now();
  const remaining = QUICK_APPLY_COOLDOWN_MS - (now - quickLastApplyAt);
  if (remaining > 0) {
    const roundedRemaining = Math.ceil(remaining / 100) * 100;
    setQuickStatus(`Cooldown: wait ${roundedRemaining}ms before next update.`);
    return;
  }

  const item = quickItems[quickIndex];
  if (!item) {
    setQuickStatus("No item selected.");
    return;
  }
  const input = document.querySelector<HTMLInputElement>("#mannco-enhancer-quick-input");
  const value = parseMoney(input?.value || "");

  const sourceForUpdate = getAutoSidebarSource() ?? quickSource;
  const prices = readQuickPrices(item);
  const expectedFromSource = getQuickSourcePrice(prices, sourceForUpdate);

  const instantValue = prices.instant;
  const isInstantAttempt =
    sourceForUpdate === "instant" ||
    (typeof instantValue === "number" && Number.isFinite(instantValue) && typeof value === "number" && Math.abs(value - instantValue) <= 0.0001);

  if (isInstantAttempt) {
    const confirmInstant = window.confirm("Are you sure you want to use Instant sell for this item?");
    if (!confirmInstant) {
      setQuickStatus("Instant sell canceled.");
      return;
    }
  }

  const reference = getQuickSourcePrice(prices, sourceForUpdate) ?? prices.match ?? prices.suggested ?? prices.current;
  if (typeof reference === "number" && reference > 0 && typeof value === "number" && Number.isFinite(value)) {
    const drift = Math.abs(value - reference) / reference;
    if (drift >= 0.35) {
      setQuickStatus(`Warning: ${Math.round(drift * 100)}% away from reference. Check value before update.`);
    }
  }

  quickApplyPending = true;
  setQuickModalBusy(true);
  try {
    if (!isPreparedStateValid(item, sourceForUpdate)) {
      setQuickStatus("Preparing sidebar...");
      const prepared = await prepareSidebarForQuickUpdate(item, expectedFromSource, sourceForUpdate);
      if (!prepared) {
        setQuickStatus(quickLastRunError || "Could not prepare sidebar safely.");
        return;
      }
    }

    const sidebarForm = getQuickSidebarForm();
    const sidebarValue = sidebarForm ? readSidebarPrice(sidebarForm) : null;
    if (typeof sidebarValue !== "number" || !Number.isFinite(sidebarValue) || !validatePrice(sidebarValue)) {
      setQuickStatus("Sidebar price is invalid. Check the value before update.");
      return;
    }

    if (typeof reference === "number" && reference > 0) {
      const sidebarDrift = Math.abs(sidebarValue - reference) / reference;
      if (sidebarDrift >= 0.35) {
        setQuickStatus(`Warning: sidebar value is ${Math.round(sidebarDrift * 100)}% away from reference.`);
      }
    }

    setQuickStatus("Updating...");
    const ok = await runListingUpdate(item, sidebarValue);
    quickLastApplyAt = Date.now();

    if (!ok) {
      setQuickStatus(quickLastRunError || "Could not confirm update. Check site response and try again.");
      return;
    }

    setQuickStatus("Updated.");
  } finally {
    quickApplyPending = false;
    setQuickModalBusy(false);
  }
  await sleep(90);

  if (quickItems.length <= 1) {
    completeQuickSession();
    return;
  }

  quickItems = getQuickUpdateItems();
  if (quickItems.length === 0) {
    completeQuickSession();
    return;
  }

  if (quickIndex >= quickItems.length - 1) {
    completeQuickSession();
    return;
  }

  quickIndex += 1;
  renderQuickModalItem();
}

function clearItemState(item: HTMLElement): void {
  item.classList.remove(BASE_CLASS, HIDDEN_CLASS);
  item.style.outline = "";
  item.style.outlineOffset = "";
  item.removeAttribute(TAG_ATTR);
  item.removeAttribute(TAGS_ATTR);
}

function cleanupInventoryUi(items: HTMLElement[]): void {
  document.getElementById(SUMMARY_ID)?.remove();
  document.getElementById(QUICK_UPDATE_BUTTON_ID)?.remove();
  document.getElementById(QUICK_UPDATE_NAV_ITEM_ID)?.remove();
  closeQuickModal();
  for (const item of items) {
    clearItemState(item);
  }
}

function applyItemTags(items: HTMLElement[], showPaintedTag: boolean): Map<string, number> {
  const countByTag = new Map<string, number>();
  for (const tag of TAGS) {
    if (!showPaintedTag && tag.key === "painted") continue;
    countByTag.set(tag.key, 0);
  }

  for (const item of items) {
    item.classList.add(BASE_CLASS);
    const tags = detectTags(item, showPaintedTag);
    const first = primaryTag(tags);

    if (!first) {
      item.removeAttribute(TAG_ATTR);
      item.removeAttribute(TAGS_ATTR);
      continue;
    }

    item.setAttribute(TAG_ATTR, first);
    item.setAttribute(TAGS_ATTR, tags.join(","));

    for (const tag of tags) {
      if (!countByTag.has(tag)) continue;
      countByTag.set(tag, (countByTag.get(tag) || 0) + 1);
    }
  }

  return countByTag;
}

export const inventoryModule: ContentModule = {
  id: "inventory-module",
  routes: ["inventory"],
  apply(_context, settings) {
    const items = findInventoryItems();

    if (!settings.enabled || !settings.inventoryHighlights) {
      cleanupInventoryUi(items);
      return;
    }

    quickAutoPriceMode = settings.inventoryQuickUpdateAutoPriceMode;
    quickPreferredSource =
      quickAutoPriceMode === "suggested"
        ? "suggested"
        : quickAutoPriceMode === "match"
          ? "match"
          : settings.inventoryQuickUpdateUseSuggested
            ? "suggested"
            : "match";
    quickAutoConfirmTotalItems = Boolean(settings.inventoryQuickUpdateAutoConfirmTotalItems);
    quickIgnoreDiscountWarning = Boolean(settings.inventoryQuickUpdateIgnoreDiscountWarning);
    ensureInventoryStyle();

    const countByTag = applyItemTags(items, settings.inventoryShowPaintedTag);
    renderSummary(countByTag, items);
    ensureUndercutToggleButton(settings.inventoryUndercutToggle, items);
    ensureQuickUpdateButton(settings.inventoryQuickUpdate);
    applyVisibilityFilters(items);
    refreshQuickUpdateScope();
    ensureMultiWithdrawItemClicks();
    bindListingsAutoSelectOnManualTabChange();

    const activeTab = getActiveInventoryTab();
    if (activeTab !== lastHandledInventoryTab) {
      lastHandledInventoryTab = activeTab;
      scheduleAutoSelectFirstTabItem(160);
    }
  }
};
