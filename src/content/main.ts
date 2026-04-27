import { getSettings } from "../lib/storage";
import { loadLocale, t, localizeContainer } from "../lib/i18n";
import type { Message, Settings } from "../lib/types";
import { auctionsModule } from "./pages/auctions";
import { giveawaysModule } from "./pages/giveaways";
import { headerModule } from "./pages/header";
import { homeModule } from "./pages/home";
import { inventoryModule } from "./pages/inventory";
import { itemModule } from "./pages/item";
import { profileModule } from "./pages/profile";
import { buildPageContext } from "./shared/page-context";
import { debounce } from "./shared/dom";
import type { ContentModule, PageContext } from "./types";

const LOG = "[Mannco Enhancer]";

const modules: ContentModule[] = [headerModule, homeModule, inventoryModule, profileModule, itemModule, giveawaysModule, auctionsModule];

let settings: Settings;
const invalidatedModules = new Set<string>();

function isContextInvalidatedError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const message = (error.message || "").toLowerCase();
  return message.includes("extension context invalidated");
}

function getActiveModules(context: PageContext): ContentModule[] {
  return modules.filter((module) => module.routes === "all" || module.routes.includes(context.route));
}

function applyModules(): void {
  const context = buildPageContext();
  const activeModules = getActiveModules(context);

  for (const module of activeModules) {
    if (invalidatedModules.has(module.id)) continue;

    try {
      module.apply(context, settings);
    } catch (error) {
      if (isContextInvalidatedError(error)) {
        invalidatedModules.add(module.id);
        console.warn(`${LOG} module disabled after extension context invalidation: ${module.id}. Reload page to restore.`);
        continue;
      }
      console.warn(`${LOG} module failed: ${module.id}`, error);
    }
  }
}

function startObserver(): void {
  const applyDebounced = debounce(() => applyModules(), 120);
  const observer = new MutationObserver((mutations) => {
    const isElementInItemMagnifier = (element: Element | null): boolean => {
      if (!element) return false;
      if (element.closest(".item-magnifier")) return true;

      const className = typeof element.className === "string" ? element.className : "";
      if (!className) return false;
      if (className.includes("item-magnifier")) return true;
      if (className.includes("magnifier")) return true;
      if (className.includes("zoomContainer")) return true;
      return false;
    };

    const isEnhancerNode = (node: Node | null): boolean => {
      if (!(node instanceof Element)) return false;
      const id = node.id || "";
      const className = node.className || "";
      if (id.startsWith("mannco-enhancer")) return true;
      if (typeof className === "string" && className.includes("mannco-enhancer")) return true;
      return false;
    };

    const isTooltipNode = (node: Node | null): boolean => {
      if (!(node instanceof Element)) return false;
      if (node.matches("[role='tooltip'], .tooltip, .tooltip-inner, .tooltip-arrow, .bs-tooltip-top, .bs-tooltip-bottom, .bs-tooltip-start, .bs-tooltip-end")) {
        return true;
      }
      if (node.closest("[role='tooltip'], .tooltip, .bs-tooltip-top, .bs-tooltip-bottom, .bs-tooltip-start, .bs-tooltip-end")) {
        return true;
      }
      return false;
    };

    const isAriaLiveHelperNode = (node: Node | null): boolean => {
      if (!(node instanceof Element)) return false;
      if (!node.classList.contains("ui-helper-hidden-accessible")) return false;

      const role = (node.getAttribute("role") || "").toLowerCase();
      const ariaLive = (node.getAttribute("aria-live") || "").toLowerCase();
      const ariaRelevant = (node.getAttribute("aria-relevant") || "").toLowerCase();

      return role === "log" && ariaLive === "assertive" && ariaRelevant === "additions";
    };

    const onlyChartNoise = mutations.every((mutation) => {
      const target = mutation.target;
      if (!(target instanceof Element)) return false;

      const className = target.className || "";
      const isChartMonitor = typeof className === "string" && className.includes("chartjs-size-monitor");
      const inChartCard = Boolean(target.closest(".card-chart") || target.closest("#sales-chart"));

      return isChartMonitor || inChartCard;
    });

    const onlyEnhancerNoise = mutations.every((mutation) => {
      if (isEnhancerNode(mutation.target)) return true;

      const added = Array.from(mutation.addedNodes);
      const removed = Array.from(mutation.removedNodes);
      const all = added.concat(removed);
      if (all.length === 0) return false;

      return all.every((node) => isEnhancerNode(node));
    });

    const onlyMagnifierNoise = mutations.every((mutation) => {
      const target = mutation.target;
      if (!(target instanceof Element)) return false;
      const inMagnifier = isElementInItemMagnifier(target);
      if (!inMagnifier) return false;

      const added = Array.from(mutation.addedNodes);
      const removed = Array.from(mutation.removedNodes);
      const all = added.concat(removed);
      if (all.length === 0) return true;

      return all.every((node) => !(node instanceof Element) || isElementInItemMagnifier(node));
    });

    const onlyTooltipNoise = mutations.every((mutation) => {
      if (isTooltipNode(mutation.target)) return true;

      const added = Array.from(mutation.addedNodes);
      const removed = Array.from(mutation.removedNodes);
      const all = added.concat(removed);
      if (all.length === 0) return false;

      return all.every((node) => !(node instanceof Element) || isTooltipNode(node));
    });

    const onlyAriaLiveHelperNoise = mutations.every((mutation) => {
      if (isAriaLiveHelperNode(mutation.target)) return true;

      const added = Array.from(mutation.addedNodes);
      const removed = Array.from(mutation.removedNodes);
      const all = added.concat(removed);
      if (all.length === 0) return false;

      return all.every((node) => !(node instanceof Element) || isAriaLiveHelperNode(node));
    });

    const onlyItemListHoverNoise = mutations.every((mutation) => {
      const target = mutation.target;
      if (!(target instanceof Element)) return false;
      if (!target.closest("#transacContent")) return false;

      const added = Array.from(mutation.addedNodes);
      const removed = Array.from(mutation.removedNodes);
      const all = added.concat(removed);
      if (all.length === 0) return false;

      return all.every((node) => {
        if (!(node instanceof Element)) return true;
        if (node.matches("tr,tbody,table")) return false;
        if (node.querySelector("tr,tbody,table")) return false;
        if (isEnhancerNode(node)) return true;
        return isElementInItemMagnifier(node);
      });
    });

    const onlyItemListInnerNodeNoise = mutations.every((mutation) => {
      const target = mutation.target;
      if (!(target instanceof Element)) return false;
      if (!target.closest("#transacContent")) return false;

      const added = Array.from(mutation.addedNodes);
      const removed = Array.from(mutation.removedNodes);
      const all = added.concat(removed);
      if (all.length === 0) return false;

      return all.every((node) => {
        if (!(node instanceof Element)) return true;
        if (node.matches("tr.itemListPagination, tbody, table")) return false;
        if (node.querySelector("tr.itemListPagination, tbody, table")) return false;
        return true;
      });
    });

    const onlyTextNodeNoise = mutations.every((mutation) => {
      const added = Array.from(mutation.addedNodes);
      const removed = Array.from(mutation.removedNodes);
      const all = added.concat(removed);
      if (all.length === 0) return false;
      return all.every((node) => node.nodeType === Node.TEXT_NODE);
    });

    if (onlyChartNoise) return;
    if (onlyEnhancerNoise) return;
    if (onlyMagnifierNoise) return;
    if (onlyTooltipNoise) return;
    if (onlyAriaLiveHelperNoise) return;
    if (onlyItemListHoverNoise) return;
    if (onlyItemListInnerNodeNoise) return;
    if (onlyTextNodeNoise) return;
    applyDebounced();
  });

  observer.observe(document.documentElement, {
    subtree: true,
    childList: true,
    attributes: false
  });
}

async function bootstrap(): Promise<void> {
  settings = await getSettings();
  
  await loadLocale(settings.language);
  applyTranslations();
  
  applyModules();
  startObserver();

  chrome.runtime.onMessage.addListener((message: Message) => {
    if (message.type !== "SETTINGS_UPDATED") return;
    const oldLanguage = settings.language;
    settings = message.settings;
    
    if (oldLanguage !== settings.language) {
      loadLocale(settings.language).then(applyTranslations);
    }
    
    applyModules();
  });

  console.log(`${LOG} content script ready`);
}

function applyTranslations(): void {
  const lang = settings.language;
  localizeContainer(document.body, lang);
}

void bootstrap();
