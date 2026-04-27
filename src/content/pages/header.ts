import type { ContentModule } from "../types";
import { HEADER_BALANCE_SELECTORS } from "../shared/constants";

const BALANCE_ATTR = "data-mannco-enhancer-balance-original";
const STYLE_ID = "mannco-enhancer-money-toggle-style";
const TOGGLE_CLASS = "mannco-enhancer-money-toggle";
const HEADER_MONEY_WRAP_CLASS = "mannco-enhancer-header-money-wrap";
const HEADER_MONEY_VALUE_CLASS = "mannco-enhancer-header-money-value";
const HEADER_MONEY_HIDDEN_CLASS = "is-hidden";
const GLOBAL_ALERT_HIDDEN_ATTR = "data-mannco-enhancer-global-alert-hidden";
const GLOBAL_BREADCRUMBS_HIDDEN_ATTR = "data-mannco-enhancer-global-breadcrumbs-hidden";
const TRACKER_BLOCKED_ATTR = "data-mannco-enhancer-tracker-blocked";
let trackerObserver: MutationObserver | null = null;
let isHeaderMoneyRevealed = false;

function isBlockedTrackerUrl(rawUrl: string): boolean {
  if (!rawUrl) return false;

  const source = rawUrl.trim();
  if (!source) return false;

  let parsed: URL;
  try {
    parsed = new URL(source, window.location.href);
  } catch {
    return false;
  }

  const host = parsed.hostname.toLowerCase();
  const path = parsed.pathname.toLowerCase();

  if (host === "static.cloudflareinsights.com" && path.startsWith("/beacon.min.js")) {
    return true;
  }

  if ((host === "www.googletagmanager.com" || host === "googletagmanager.com") && path.startsWith("/gtm.js")) {
    return true;
  }

  return false;
}

function removeBlockedTrackerElement(node: Element): void {
  if (!(node instanceof HTMLElement || node instanceof SVGElement)) return;

  const script = node as HTMLScriptElement;
  const iframe = node as HTMLIFrameElement;
  const image = node as HTMLImageElement;
  const link = node as HTMLLinkElement;
  const source = script.src || iframe.src || image.src || link.href || "";
  if (!isBlockedTrackerUrl(source)) return;

  node.setAttribute(TRACKER_BLOCKED_ATTR, "true");
  node.remove();
}

function sweepBlockedTrackers(root: ParentNode = document): void {
  root.querySelectorAll("script[src],iframe[src],img[src],link[href]").forEach((node) => {
    removeBlockedTrackerElement(node);
  });
}

function startTrackerObserver(): void {
  if (trackerObserver) return;

  trackerObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === "attributes") {
        if (!(mutation.target instanceof Element)) continue;
        removeBlockedTrackerElement(mutation.target);
        continue;
      }

      mutation.addedNodes.forEach((added) => {
        if (!(added instanceof Element)) return;
        removeBlockedTrackerElement(added);
        sweepBlockedTrackers(added);
      });
    }
  });

  trackerObserver.observe(document.documentElement, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ["src", "href"]
  });
}

function stopTrackerObserver(): void {
  trackerObserver?.disconnect();
  trackerObserver = null;
}

function applyTrackerBlocking(shouldBlock: boolean): void {
  if (!shouldBlock) {
    stopTrackerObserver();
    return;
  }

  sweepBlockedTrackers();
  startTrackerObserver();
}

function ensureToggleStyles(): void {
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    .${TOGGLE_CLASS} {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      margin-left: 8px;
      border: 1px solid rgba(132, 156, 175, 0.55);
      border-radius: 8px;
      background: rgba(41, 54, 67, 0.95);
      color: #d9e4ee;
      cursor: pointer;
      vertical-align: middle;
      line-height: 1;
    }

    .${TOGGLE_CLASS}:hover {
      background: rgba(57, 72, 87, 0.98);
      border-color: rgba(166, 188, 205, 0.8);
    }

    .${TOGGLE_CLASS} i {
      font-size: 12px;
    }

    .${HEADER_MONEY_WRAP_CLASS} {
      position: relative;
      display: inline-flex;
      align-items: center;
      vertical-align: middle;
    }

    .${HEADER_MONEY_VALUE_CLASS} {
      transition: filter .18s ease;
    }

    .${HEADER_MONEY_WRAP_CLASS}.${HEADER_MONEY_HIDDEN_CLASS} .${HEADER_MONEY_VALUE_CLASS} {
      filter: blur(4px);
      user-select: none;
      pointer-events: none;
    }

    .${HEADER_MONEY_WRAP_CLASS}.${HEADER_MONEY_HIDDEN_CLASS}::before {
      content: "";
      position: absolute;
      inset: -2px;
      border-radius: 7px;
      background: rgba(17, 28, 38, 0.22);
      pointer-events: none;
    }
  `;

  document.head.appendChild(style);
}

function createToggleButton(nextReveal: boolean): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = TOGGLE_CLASS;
  button.title = nextReveal ? "Show balance" : "Hide balance";
  button.setAttribute("aria-label", button.title);
  button.innerHTML = `<i class="fas ${nextReveal ? "fa-eye" : "fa-eye-slash"}" aria-hidden="true"></i>`;
  button.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    isHeaderMoneyRevealed = nextReveal;

    for (const node of getBalanceNodes()) {
      const original = node.getAttribute(BALANCE_ATTR) ?? node.textContent ?? "";
      if (!node.hasAttribute(BALANCE_ATTR)) node.setAttribute(BALANCE_ATTR, original);
      renderBalanceNode(node, node.getAttribute(BALANCE_ATTR) ?? original, true);
    }
  });
  return button;
}

function renderBalanceNode(node: HTMLElement, original: string, shouldMask: boolean): void {
  if (!shouldMask) {
    node.textContent = original;
    return;
  }

  node.replaceChildren();
  const wrap = document.createElement("span");
  wrap.className = HEADER_MONEY_WRAP_CLASS;

  const value = document.createElement("span");
  value.className = HEADER_MONEY_VALUE_CLASS;
  value.textContent = original;

  const hidden = !isHeaderMoneyRevealed;
  wrap.classList.toggle(HEADER_MONEY_HIDDEN_CLASS, hidden);
  wrap.append(value);
  wrap.append(createToggleButton(hidden));

  node.append(wrap);
}

function getBalanceNodes(): HTMLElement[] {
  const nodes: HTMLElement[] = [];

  for (const selector of HEADER_BALANCE_SELECTORS) {
    document.querySelectorAll<HTMLElement>(selector).forEach((node) => {
      if (!nodes.includes(node)) nodes.push(node);
    });
  }

  return nodes;
}

function getGlobalAlertNodes(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>(".global-alert"));
}

function applyGlobalAlertVisibility(shouldHide: boolean): void {
  for (const alertNode of getGlobalAlertNodes()) {
    if (shouldHide) {
      alertNode.style.display = "none";
      alertNode.setAttribute(GLOBAL_ALERT_HIDDEN_ATTR, "true");
      continue;
    }

    if (alertNode.getAttribute(GLOBAL_ALERT_HIDDEN_ATTR) === "true") {
      alertNode.style.display = "";
      alertNode.removeAttribute(GLOBAL_ALERT_HIDDEN_ATTR);
    }
  }
}

function getBreadcrumbRows(): HTMLElement[] {
  const rows: HTMLElement[] = [];
  const selectors = [
    "nav[aria-label='breadcrumb']",
    "nav[aria-label='Breadcrumb']",
    "nav[aria-label*='breadcrumb' i]",
    "nav.breadcrumb"
  ];

  document.querySelectorAll<HTMLElement>(selectors.join(",")).forEach((node) => {
    if (!rows.includes(node)) rows.push(node);
  });

  return rows;
}

function applyGlobalBreadcrumbVisibility(shouldHide: boolean): void {
  for (const breadcrumbRow of getBreadcrumbRows()) {
    if (shouldHide) {
      breadcrumbRow.style.setProperty("display", "none", "important");
      breadcrumbRow.setAttribute(GLOBAL_BREADCRUMBS_HIDDEN_ATTR, "true");
      continue;
    }

    if (breadcrumbRow.getAttribute(GLOBAL_BREADCRUMBS_HIDDEN_ATTR) === "true") {
      breadcrumbRow.style.removeProperty("display");
      breadcrumbRow.removeAttribute(GLOBAL_BREADCRUMBS_HIDDEN_ATTR);
    }
  }
}

export const headerModule: ContentModule = {
  id: "header-module",
  routes: "all",
  apply(_context, settings) {
    const shouldMask = false;
    const shouldHideGlobalAlert = settings.enabled && settings.hideGlobalAlert;
    const shouldHideGlobalBreadcrumbs = settings.enabled && settings.globalHideBreadcrumbs;
    const shouldBlockTrackers = settings.enabled && settings.globalBlockTrackers;

    applyGlobalAlertVisibility(shouldHideGlobalAlert);
    applyGlobalBreadcrumbVisibility(shouldHideGlobalBreadcrumbs);
    applyTrackerBlocking(shouldBlockTrackers);

    if (!shouldMask) {
      isHeaderMoneyRevealed = false;
    } else {
      ensureToggleStyles();
    }

    for (const node of getBalanceNodes()) {
      const original = node.getAttribute(BALANCE_ATTR) ?? node.textContent ?? "";

      if (!node.hasAttribute(BALANCE_ATTR)) {
        node.setAttribute(BALANCE_ATTR, original);
      }

      renderBalanceNode(node, node.getAttribute(BALANCE_ATTR) ?? original, shouldMask);
    }
  }
};
