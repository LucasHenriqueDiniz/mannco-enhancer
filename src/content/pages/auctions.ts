import { parseMoney, validatePrice } from "../shared/safety";
import type { ContentModule } from "../types";

const AUCTIONS_STYLE_ID = "mannco-enhancer-auctions-style";
const AUCTIONS_OPEN_TOP_LINK_CLASS = "mannco-enhancer-auctions-open-top";
const AUCTIONS_MANNCO_DT_CLASS = "mannco-enhancer-auctions-mannco-dt";
const AUCTIONS_MANNCO_DD_CLASS = "mannco-enhancer-auctions-mannco-dd";
const AUCTIONS_FLIP_DT_CLASS = "mannco-enhancer-auctions-flip-dt";
const AUCTIONS_FLIP_DD_CLASS = "mannco-enhancer-auctions-flip-dd";
const AUCTIONS_FLIP_PCT_CLASS = "mannco-enhancer-auctions-flip-pct";
const AUCTIONS_FLIP_TOOLTIP_CLASS = "mannco-enhancer-auctions-flip-tooltip";
const AUCTIONS_FLIP_TOOLTIP_TITLE_CLASS = "mannco-enhancer-auctions-flip-tooltip-title";
const AUCTIONS_FLIP_TOOLTIP_LINE_CLASS = "mannco-enhancer-auctions-flip-tooltip-line";
const AUCTIONS_MANNCO_STATE_LOADING_CLASS = "is-loading";
const AUCTIONS_MANNCO_STATE_UNAVAILABLE_CLASS = "is-unavailable";
const AUCTIONS_MANNCO_STATE_CHEAP_CLASS = "is-cheap";
const AUCTIONS_MANNCO_STATE_FAIR_CLASS = "is-fair";
const AUCTIONS_MANNCO_STATE_EXPENSIVE_CLASS = "is-expensive";

const LEGACY_PANEL_CLASS = "mannco-enhancer-auctions-panel";
const LEGACY_LINK_CLASS = "mannco-enhancer-auctions-open-item";

const PRICE_CACHE_MS = 45_000;
const ITEM_LOWEST_PRICE_SELECTORS = [
  ".card-body.text-center .important-text .ecurrency",
  ".important-text .ecurrency",
  ".card-body.text-center .ecurrency",
  "#transacContent td.ecurrency",
  ".table-items #transacContent td.ecurrency"
] as const;

type CachedProviderPrice = {
  at: number;
  price: number | null;
  unavailable?: true;
  note?: string;
};

let applyToken = 0;
const priceCache = new Map<string, CachedProviderPrice>();
const priceInflight = new Map<string, Promise<CachedProviderPrice>>();

function normalizePriceCacheKey(itemHref: string): string {
  try {
    const url = new URL(itemHref, window.location.origin);
    return `${url.origin}${url.pathname}`;
  } catch {
    return itemHref;
  }
}

function ensureAuctionsStyle(): void {
  if (document.getElementById(AUCTIONS_STYLE_ID)) return;

  const style = document.createElement("style");
  style.id = AUCTIONS_STYLE_ID;
  style.textContent = `
    .auctions-list .auctions-item[data-auctionid] {
      display: flex;
      flex-direction: column;
      min-height: 470px;
    }

    .auctions-list .auctions-item[data-auctionid] .auctions-item__header {
      position: relative;
    }

    .auctions-list .auctions-item[data-auctionid] .auctions-item__body {
      flex: 1;
      display: flex;
      flex-direction: column;
    }

    .auctions-list .auctions-item[data-auctionid] .auctions-item__info {
      margin-bottom: 0;
    }

    .auctions-list .auctions-item[data-auctionid] .auctions-item__body > .auctions-item__title {
      height: 100%;
    }

    .auctions-list .auctions-item[data-auctionid] .auctions-item__footer {
      margin-top: auto;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      gap: 8px;
    }

    .${AUCTIONS_OPEN_TOP_LINK_CLASS} {
      position: absolute;
      top: 8px;
      right: 8px;
      width: 24px;
      height: 24px;
      border-radius: 999px;
      border: 1px solid #5e7397;
      background: linear-gradient(180deg, rgba(46, 67, 101, 0.95) 0%, rgba(34, 50, 76, 0.95) 100%);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      text-decoration: none;
      box-shadow: 0 2px 8px rgba(7, 10, 20, 0.45);
      z-index: 2;
    }

    .${AUCTIONS_OPEN_TOP_LINK_CLASS} svg {
      width: 13px;
      height: 13px;
      color: #dce9ff;
      display: block;
    }

    .${AUCTIONS_OPEN_TOP_LINK_CLASS}:hover,
    .${AUCTIONS_OPEN_TOP_LINK_CLASS}:focus-visible {
      filter: brightness(1.08);
      text-decoration: none;
      outline: none;
    }

    .${AUCTIONS_MANNCO_DT_CLASS} {
      color: #afc4ea;
    }

    .${AUCTIONS_FLIP_DT_CLASS} {
      color: #afc4ea;
    }

    .${AUCTIONS_MANNCO_DD_CLASS} {
      display: inline-block;
      width: auto;
      min-height: 20px;
      background: transparent;
      border: 0;
      border-radius: 0;
      padding: 0;
      margin: 0;
      color: #e7f1ff;
      font-weight: 700;
      text-align: left;
      margin-left: auto;
    }

    .${AUCTIONS_FLIP_DD_CLASS} {
      display: inline-block;
      width: auto;
      min-height: 20px;
      background: transparent;
      border: 0;
      border-radius: 0;
      padding: 0;
      margin: 0 0 0 auto;
      color: #e7f1ff;
      font-weight: 700;
      text-align: left;
    }

    .${AUCTIONS_FLIP_DD_CLASS}.${AUCTIONS_MANNCO_STATE_LOADING_CLASS} {
      color: #d7e2f8;
    }

    .${AUCTIONS_FLIP_DD_CLASS}.${AUCTIONS_MANNCO_STATE_UNAVAILABLE_CLASS} {
      color: #c2cde2;
    }

    .${AUCTIONS_FLIP_DD_CLASS}.${AUCTIONS_MANNCO_STATE_CHEAP_CLASS} {
      color: #8de0ba;
    }

    .${AUCTIONS_FLIP_DD_CLASS}.${AUCTIONS_MANNCO_STATE_FAIR_CLASS} {
      color: #e7f1ff;
    }

    .${AUCTIONS_FLIP_DD_CLASS}.${AUCTIONS_MANNCO_STATE_EXPENSIVE_CLASS} {
      color: #ffc8b5;
    }

    .${AUCTIONS_MANNCO_DD_CLASS}.${AUCTIONS_MANNCO_STATE_LOADING_CLASS} {
      color: #d7e2f8;
    }

    .${AUCTIONS_MANNCO_DD_CLASS}.${AUCTIONS_MANNCO_STATE_UNAVAILABLE_CLASS} {
      color: #c2cde2;
    }

    .${AUCTIONS_MANNCO_DD_CLASS}.${AUCTIONS_MANNCO_STATE_CHEAP_CLASS} {
      color: #8de0ba;
    }

    .${AUCTIONS_MANNCO_DD_CLASS}.${AUCTIONS_MANNCO_STATE_FAIR_CLASS} {
      color: #e7f1ff;
    }

    .${AUCTIONS_MANNCO_DD_CLASS}.${AUCTIONS_MANNCO_STATE_EXPENSIVE_CLASS} {
      color: #ffc8b5;
    }

    .${AUCTIONS_FLIP_DD_CLASS} {
      position: relative;
    }

    .${AUCTIONS_FLIP_DD_CLASS} .${AUCTIONS_FLIP_PCT_CLASS} {
      position: relative;
      border-bottom: 1px dotted currentColor;
      cursor: help;
      outline: none;
    }

    .${AUCTIONS_FLIP_DD_CLASS} .${AUCTIONS_FLIP_TOOLTIP_CLASS} {
      position: absolute;
      right: 0;
      bottom: calc(100% + 8px);
      width: min(340px, 72vw);
      padding: 10px;
      border-radius: 10px;
      border: 1px solid #5772a0;
      background: linear-gradient(180deg, #243657 0%, #1a2943 100%);
      color: #eef5ff;
      font-size: 12px;
      line-height: 1.4;
      white-space: normal;
      text-align: left;
      box-shadow: 0 12px 28px rgba(5, 9, 18, 0.52);
      opacity: 0;
      visibility: hidden;
      pointer-events: none;
      transition: opacity 0.14s ease, transform 0.14s ease;
      transform: translateY(4px);
      z-index: 10;
    }

    .${AUCTIONS_FLIP_DD_CLASS} .${AUCTIONS_FLIP_TOOLTIP_TITLE_CLASS} {
      font-size: 11px;
      font-weight: 700;
      color: #dbe9ff;
      letter-spacing: 0.02em;
      text-transform: uppercase;
      margin-bottom: 7px;
      padding-bottom: 6px;
      border-bottom: 1px solid rgba(147, 178, 226, 0.35);
    }

    .${AUCTIONS_FLIP_DD_CLASS} .${AUCTIONS_FLIP_TOOLTIP_LINE_CLASS} {
      display: flex;
      justify-content: space-between;
      gap: 10px;
      color: #e9f3ff;
      margin-top: 4px;
    }

    .${AUCTIONS_FLIP_DD_CLASS} .${AUCTIONS_FLIP_TOOLTIP_LINE_CLASS} strong {
      color: #b8cff2;
      font-weight: 600;
    }

    .${AUCTIONS_FLIP_DD_CLASS} .${AUCTIONS_FLIP_PCT_CLASS}:hover + .${AUCTIONS_FLIP_TOOLTIP_CLASS},
    .${AUCTIONS_FLIP_DD_CLASS} .${AUCTIONS_FLIP_PCT_CLASS}:focus-visible + .${AUCTIONS_FLIP_TOOLTIP_CLASS} {
      opacity: 1;
      visibility: visible;
      transform: translateY(0);
    }
  `;

  document.head.appendChild(style);
}

function formatUsd(value: number): string {
  return `$${value.toFixed(2)}`;
}

function readAuctionPrice(card: HTMLElement): number | null {
  const fromBidButton = card.querySelector<HTMLElement>(".auctions-item__bid-price.bet .auctions-item__amount");
  if (fromBidButton?.textContent) {
    const parsedBid = parseMoney(fromBidButton.textContent);
    if (parsedBid && validatePrice(parsedBid)) return parsedBid;
  }

  const fromData = Number(card.getAttribute("data-price") || "");
  if (Number.isFinite(fromData) && fromData > 0) {
    const fromDataPrice = fromData / 100;
    if (validatePrice(fromDataPrice)) return fromDataPrice;
  }

  const priceNode = card.querySelector<HTMLElement>(".auctions-item__price");
  if (!priceNode?.textContent) return null;

  const parsed = parseMoney(priceNode.textContent);
  if (!parsed || !validatePrice(parsed)) return null;
  return parsed;
}

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (match) => {
    if (match === "&") return "&amp;";
    if (match === "<") return "&lt;";
    if (match === ">") return "&gt;";
    if (match === '"') return "&quot;";
    if (match === "'") return "&#39;";
    return match;
  });
}

function getItemHref(card: HTMLElement): string {
  return card.querySelector<HTMLAnchorElement>(".auctions-item__thumbnail-card")?.href || "";
}

function getComparisonState(diffPct: number): string {
  if (diffPct <= -5) return AUCTIONS_MANNCO_STATE_CHEAP_CLASS;
  if (diffPct >= 5) return AUCTIONS_MANNCO_STATE_EXPENSIVE_CLASS;
  return AUCTIONS_MANNCO_STATE_FAIR_CLASS;
}

function ensureTopOpenLink(card: HTMLElement): void {
  const itemHref = getItemHref(card);
  if (!itemHref) return;

  const header = card.querySelector<HTMLElement>(".auctions-item__header");
  if (!header) return;

  const existing = header.querySelector<HTMLAnchorElement>(`.${AUCTIONS_OPEN_TOP_LINK_CLASS}`);
  if (existing) {
    if (existing.href !== itemHref) existing.href = itemHref;
    return;
  }

  const link = document.createElement("a");
  link.className = AUCTIONS_OPEN_TOP_LINK_CLASS;
  link.href = itemHref;
  link.target = "_blank";
  link.rel = "noreferrer noopener";
  link.setAttribute("aria-label", "Open item in new tab");
  link.title = "Open item in new tab";
  const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  icon.setAttribute("viewBox", "0 0 24 24");
  icon.setAttribute("aria-hidden", "true");
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute(
    "d",
    "M14 3h7v7h-2V6.41l-9.29 9.3-1.42-1.42 9.3-9.29H14V3zM5 5h6v2H7v10h10v-4h2v6H5V5z"
  );
  path.setAttribute("fill", "currentColor");
  icon.appendChild(path);
  link.appendChild(icon);
  header.appendChild(link);
}

function ensureManncoValueNodes(card: HTMLElement): { dt: HTMLElement; dd: HTMLElement } | null {
  const info = card.querySelector<HTMLElement>(".auctions-item__info");
  if (!info) return null;

  let dt = info.querySelector<HTMLElement>(`dt.${AUCTIONS_MANNCO_DT_CLASS}`);
  if (!dt) {
    dt = document.createElement("dt");
    dt.className = AUCTIONS_MANNCO_DT_CLASS;
    dt.textContent = "Mannco sell";
      dt.dataset.i18nKey = "content.manncoSell";
    info.appendChild(dt);
  }

  let dd = info.querySelector<HTMLElement>(`dd.${AUCTIONS_MANNCO_DD_CLASS}`);
  if (!dd) {
    dd = document.createElement("dd");
    dd.className = AUCTIONS_MANNCO_DD_CLASS;
    info.appendChild(dd);
  }

  return { dt, dd };
}

function ensureFlipValueNodes(card: HTMLElement): { dt: HTMLElement; dd: HTMLElement } | null {
  const info = card.querySelector<HTMLElement>(".auctions-item__info");
  if (!info) return null;

  let dt = info.querySelector<HTMLElement>(`dt.${AUCTIONS_FLIP_DT_CLASS}`);
  if (!dt) {
    dt = document.createElement("dt");
    dt.className = AUCTIONS_FLIP_DT_CLASS;
    dt.textContent = "Flip value";
      dt.dataset.i18nKey = "content.flipValue";
    info.appendChild(dt);
  }

  let dd = info.querySelector<HTMLElement>(`dd.${AUCTIONS_FLIP_DD_CLASS}`);
  if (!dd) {
    dd = document.createElement("dd");
    dd.className = AUCTIONS_FLIP_DD_CLASS;
    info.appendChild(dd);
  }

  return { dt, dd };
}

function setManncoValue(card: HTMLElement, text: string, stateClass: string, title: string): void {
  const nodes = ensureManncoValueNodes(card);
  if (!nodes) return;

  const nextClassName = `${AUCTIONS_MANNCO_DD_CLASS} ${stateClass}`;
  if (nodes.dd.className !== nextClassName) nodes.dd.className = nextClassName;
  if (nodes.dd.childElementCount > 0 || nodes.dd.textContent !== text) nodes.dd.textContent = text;
  if (nodes.dd.title !== title) nodes.dd.title = title;
}

function setFlipValue(card: HTMLElement, text: string, stateClass: string, title: string, pctText?: string, tooltipHtml?: string): void {
  const nodes = ensureFlipValueNodes(card);
  if (!nodes) return;

  const nextClassName = `${AUCTIONS_FLIP_DD_CLASS} ${stateClass}`;
  if (nodes.dd.className !== nextClassName) nodes.dd.className = nextClassName;
  if (pctText && tooltipHtml) {
    const safeText = escapeHtml(text);
    const safePct = escapeHtml(pctText);
    const nextHtml = `${safeText} <span class="${AUCTIONS_FLIP_PCT_CLASS}" tabindex="0">${safePct}</span>${tooltipHtml}`;
    if (nodes.dd.innerHTML !== nextHtml) nodes.dd.innerHTML = nextHtml;
    if (nodes.dd.hasAttribute("title")) nodes.dd.removeAttribute("title");
    return;
  }

  if (nodes.dd.childElementCount > 0 || nodes.dd.textContent !== text) nodes.dd.textContent = text;
  if (nodes.dd.title !== title) nodes.dd.title = title;
}

function calcAfterFees(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  const afterRaw = Math.floor(value * 95) / 100;
  return Math.max(0.01, Number(afterRaw.toFixed(2)));
}

function formatSignedUsd(value: number): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${formatUsd(value)}`;
}

function getFlipState(profitPct: number): string {
  if (profitPct >= 5) return AUCTIONS_MANNCO_STATE_CHEAP_CLASS;
  if (profitPct <= -5) return AUCTIONS_MANNCO_STATE_EXPENSIVE_CLASS;
  return AUCTIONS_MANNCO_STATE_FAIR_CLASS;
}

function parseLowestPriceFromItemPage(html: string): number | null {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  let lowest: number | null = null;

  ITEM_LOWEST_PRICE_SELECTORS.forEach((selector) => {
    const nodes = Array.from(doc.querySelectorAll<HTMLElement>(selector));
    nodes.forEach((node) => {
      const parsed = parseMoney(node.textContent || "");
      if (!parsed || !validatePrice(parsed)) return;
      lowest = lowest === null ? parsed : Math.min(lowest, parsed);
    });
  });

  return lowest;
}

async function fetchManncoReferencePrice(itemHref: string): Promise<CachedProviderPrice> {
  if (!itemHref) {
    return { at: Date.now(), price: null, unavailable: true, note: "Item link not found." };
  }

  const cacheKey = normalizePriceCacheKey(itemHref);

  const cached = priceCache.get(cacheKey);
  if (cached && Date.now() - cached.at < PRICE_CACHE_MS) return cached;

  const inflight = priceInflight.get(cacheKey);
  if (inflight) return inflight;

  const request = fetch(itemHref, { method: "GET", credentials: "include" })
    .then(async (response) => {
      if (!response.ok) {
        const payload: CachedProviderPrice = {
          at: Date.now(),
          price: null,
          unavailable: true,
          note: "Could not open item page."
        };
        priceCache.set(cacheKey, payload);
        return payload;
      }
      const html = await response.text();
      const price = parseLowestPriceFromItemPage(html);
      if (!price) {
        const payload: CachedProviderPrice = {
          at: Date.now(),
          price: null,
          unavailable: true,
          note: "No active sell listing found on item page."
        };
        priceCache.set(cacheKey, payload);
        return payload;
      }

      const payload: CachedProviderPrice = {
        at: Date.now(),
        price,
        note: "Lowest sell listing on item page"
      };
      priceCache.set(cacheKey, payload);
      return payload;
    })
    .catch(() => {
      const payload: CachedProviderPrice = {
        at: Date.now(),
        price: null,
        unavailable: true,
        note: "Failed to load item page."
      };
      priceCache.set(cacheKey, payload);
      return payload;
    })
    .finally(() => {
      priceInflight.delete(cacheKey);
    });

  priceInflight.set(cacheKey, request);
  return request;
}

function getFreshCachedManncoReferencePrice(itemHref: string): CachedProviderPrice | null {
  if (!itemHref) return null;
  const cacheKey = normalizePriceCacheKey(itemHref);
  const cached = priceCache.get(cacheKey);
  if (!cached) return null;
  if (Date.now() - cached.at >= PRICE_CACHE_MS) return null;
  return cached;
}

function cleanEnhancerNodes(removeCurrent: boolean): void {
  const selectors = [`.${LEGACY_PANEL_CLASS}`, `.${LEGACY_LINK_CLASS}`];
  if (removeCurrent) {
    selectors.push(
      `.${AUCTIONS_OPEN_TOP_LINK_CLASS}`,
      `dt.${AUCTIONS_MANNCO_DT_CLASS}`,
      `dd.${AUCTIONS_MANNCO_DD_CLASS}`,
      `dt.${AUCTIONS_FLIP_DT_CLASS}`,
      `dd.${AUCTIONS_FLIP_DD_CLASS}`
    );
  }

  document
    .querySelectorAll<HTMLElement>(selectors.join(", "))
    .forEach((node) => node.remove());
}

function applyPriceValues(card: HTMLElement, auctionPrice: number | null, entry: CachedProviderPrice): void {
  if (entry.unavailable || !entry.price) {
    const unavailableReason = entry.note || "Could not read price from item page.";
    setManncoValue(card, "N/A", AUCTIONS_MANNCO_STATE_UNAVAILABLE_CLASS, unavailableReason);
    setFlipValue(card, "N/A", AUCTIONS_MANNCO_STATE_UNAVAILABLE_CLASS, "Could not calculate flip value.");
    return;
  }

  if (!auctionPrice) {
    setManncoValue(card, formatUsd(entry.price), AUCTIONS_MANNCO_STATE_FAIR_CLASS, entry.note || "Lowest sell listing on item page.");
    setFlipValue(card, "N/A", AUCTIONS_MANNCO_STATE_UNAVAILABLE_CLASS, "Bid target price not available.");
    return;
  }

  const diffPct = ((auctionPrice - entry.price) / entry.price) * 100;
  const stateClass = getComparisonState(diffPct);
  const title = `Bid target ${formatUsd(auctionPrice)} vs Mannco ${formatUsd(entry.price)} (${diffPct.toFixed(1)}%)`;
  setManncoValue(card, formatUsd(entry.price), stateClass, title);

  const netSell = calcAfterFees(entry.price);
  const profit = netSell - auctionPrice;
  const profitPct = auctionPrice > 0 ? (profit / auctionPrice) * 100 : 0;
  const flipState = getFlipState(profitPct);
  const flipText = formatSignedUsd(profit);
  const flipPct = `(${profitPct.toFixed(1)}%)`;
  const flipTitle = `Buy at ${formatUsd(auctionPrice)} and relist at ${formatUsd(entry.price)}. Estimated net after 5% fee: ${formatUsd(netSell)}. Estimated flip P/L: ${formatSignedUsd(profit)}.`;
  const tooltipHtml =
    `<div class="${AUCTIONS_FLIP_TOOLTIP_CLASS}">` +
    `<div class="${AUCTIONS_FLIP_TOOLTIP_TITLE_CLASS}">Flip Estimate</div>` +
    `<div class="${AUCTIONS_FLIP_TOOLTIP_LINE_CLASS}"><strong>Bid target</strong><span>${escapeHtml(formatUsd(auctionPrice))}</span></div>` +
    `<div class="${AUCTIONS_FLIP_TOOLTIP_LINE_CLASS}"><strong>Mannco sell</strong><span>${escapeHtml(formatUsd(entry.price))}</span></div>` +
    `<div class="${AUCTIONS_FLIP_TOOLTIP_LINE_CLASS}"><strong>Net after 5%</strong><span>${escapeHtml(formatUsd(netSell))}</span></div>` +
    `<div class="${AUCTIONS_FLIP_TOOLTIP_LINE_CLASS}"><strong>Flip P/L</strong><span>${escapeHtml(formatSignedUsd(profit))}</span></div>` +
    `</div>`;
  setFlipValue(card, flipText, flipState, flipTitle, flipPct, tooltipHtml);
}

function enhanceAuctionCard(card: HTMLElement, token: number): void {
  ensureTopOpenLink(card);

  const auctionPrice = readAuctionPrice(card);
  const itemHref = getItemHref(card);
  if (!itemHref) {
    setManncoValue(card, "N/A", AUCTIONS_MANNCO_STATE_UNAVAILABLE_CLASS, "Item link not found.");
    setFlipValue(card, "N/A", AUCTIONS_MANNCO_STATE_UNAVAILABLE_CLASS, "Item link not found.");
    return;
  }

  const cachedEntry = getFreshCachedManncoReferencePrice(itemHref);
  if (!cachedEntry) {
    setManncoValue(card, "Loading...", AUCTIONS_MANNCO_STATE_LOADING_CLASS, "Loading lowest sell listing from item page.");
    setFlipValue(card, "Loading...", AUCTIONS_MANNCO_STATE_LOADING_CLASS, "Calculating net flip value.");
  } else {
    applyPriceValues(card, auctionPrice, cachedEntry);
  }

  void fetchManncoReferencePrice(itemHref).then((entry) => {
    if (token !== applyToken) return;
    if (!card.isConnected) return;
    applyPriceValues(card, auctionPrice, entry);
  });
}

export const auctionsModule: ContentModule = {
  id: "auctions-module",
  routes: ["auctions"],
  apply(_context, settings) {
    if (!settings.enabled || !settings.auctionsValueHints) {
      cleanEnhancerNodes(true);
      return;
    }

    cleanEnhancerNodes(false);

    ensureAuctionsStyle();
    const token = ++applyToken;
    const cards = document.querySelectorAll<HTMLElement>(".auctions-item[data-auctionid]");
    cards.forEach((card) => {
      enhanceAuctionCard(card, token);
    });
  }
};
