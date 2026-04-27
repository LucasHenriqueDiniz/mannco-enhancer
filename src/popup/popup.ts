import { getSettings, saveSettings } from "../lib/storage";
import { TOGGLE_OPTIONS } from "../lib/options-config";
import { loadLocale, t, localizeContainer } from "../lib/i18n";
import type { Settings } from "../lib/types";
import type { ToggleOption } from "../lib/options-config";

const LEGACY_TOGGLE_KEY_ALIASES: Record<string, string> = {
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

function tr(key: string, lang: string, fallback: string): string {
  const translated = t(key, lang);
  return translated === key ? fallback : translated;
}

function trToggle(toggleKey: string, suffix: "" | ".desc", lang: string, fallback: string): string {
  const directKey = `toggle.${toggleKey}${suffix}`;
  const direct = t(directKey, lang);
  if (direct !== directKey) return direct;

  const alias = LEGACY_TOGGLE_KEY_ALIASES[toggleKey];
  if (!alias) return fallback;
  const legacyKey = `toggle.${alias}${suffix}`;
  const legacy = t(legacyKey, lang);
  return legacy === legacyKey ? fallback : legacy;
}

function localizeUI(lang: string): void {
  localizeContainer(document.body, lang);
}

function updateLanguageFlag(lang: string): void {
  const flag = document.getElementById("languageFlag") as HTMLImageElement | null;
  if (!flag) return;

  const map: Record<string, string> = {
    en: "gbr",
    pt_BR: "bra",
    es: "esp",
    ru: "rus",
    auto: "eun"
  };

  const code = map[lang] ?? "gbr";
  flag.src = `assets/flags/1x1/${code}.svg`;
}

function translateGroupName(groupName: string, lang: string): string {
  const groupKeyMap: Record<string, string> = {
    "Page visibility": "group.pageVisibility",
    "Buy-order safety": "group.buyOrderSafety",
    "Items list actions": "group.itemsListActions",
    "Items list columns": "group.itemsListColumns",
    "Price references": "group.priceReferences"
  };

  const mapped = groupKeyMap[groupName];
  if (!mapped) return groupName;
  return tr(mapped, lang, groupName);
}

const PANEL_PAGES = {
  general: ["global", "home", "bundles"],
  giveaways: ["giveaways"],
  item: ["item"],
  inventory: ["inventory"],
  profile: ["profile"],
  auctions: ["auctions"]
} as const;

function byId<T extends HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (!node) throw new Error(`Missing element: ${id}`);
  return node as T;
}

async function notifyActiveTab(settings: Settings): Promise<void> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;
  if (!tab.url?.startsWith("https://mannco.store/") && !tab.url?.startsWith("https://www.mannco.store/")) return;

  await chrome.tabs.sendMessage(tab.id, { type: "SETTINGS_UPDATED", settings });
}

function getLanguageValue(settings: Settings): "auto" | "en" | "pt_BR" | "es" | "ru" {
  return settings.language;
}

function setActiveTab(tab: "general" | "giveaways" | "item" | "inventory" | "profile" | "auctions"): void {
  const tabs = [
    { button: byId<HTMLButtonElement>("tabGeneral"), panel: byId<HTMLElement>("generalPanel"), key: "general" as const },
    { button: byId<HTMLButtonElement>("tabGiveaways"), panel: byId<HTMLElement>("giveawaysPanel"), key: "giveaways" as const },
    { button: byId<HTMLButtonElement>("tabItem"), panel: byId<HTMLElement>("itemPanel"), key: "item" as const },
    { button: byId<HTMLButtonElement>("tabInventory"), panel: byId<HTMLElement>("inventoryPanel"), key: "inventory" as const },
    { button: byId<HTMLButtonElement>("tabProfile"), panel: byId<HTMLElement>("profilePanel"), key: "profile" as const },
    { button: byId<HTMLButtonElement>("tabAuctions"), panel: byId<HTMLElement>("auctionsPanel"), key: "auctions" as const }
  ];

  for (const tabInfo of tabs) {
    const active = tabInfo.key === tab;
    tabInfo.button.classList.toggle("active", active);
    tabInfo.panel.classList.toggle("active", active);
  }
}

function renderPanelRows(containerId: string, pages: readonly string[], lang: string): void {
  const rows = byId<HTMLDivElement>(containerId);

  const renderSectionRows = (options: ToggleOption[]): string => {
    const groups = new Map<string, ToggleOption[]>();
    const orderedGroupNames: string[] = [];

    options.forEach((option) => {
      const groupName = option.group ? translateGroupName(option.group, lang) : tr("group.General", lang, "General");
      if (!groups.has(groupName)) {
        groups.set(groupName, []);
        orderedGroupNames.push(groupName);
      }
      groups.get(groupName)!.push(option);
    });

    const hasCustomGroups = orderedGroupNames.some((name) => name !== tr("group.General", lang, "General"));

    return orderedGroupNames
      .map((groupName) => {
        const groupOptions = groups.get(groupName) ?? [];
        const optionRows = groupOptions
          .map(
            (option) => {
              const label = trToggle(option.key, "", lang, option.label);
              const desc = trToggle(option.key, ".desc", lang, option.description);
              return `<label class="row"><span class="label-wrap"><span class="label">${label}</span><span class="desc">${desc}</span></span><input id="${option.key}" type="checkbox" /></label>`;
            }
          )
          .join("");

        if (!hasCustomGroups || groupName === tr("group.General", lang, "General")) return optionRows;
        return `<div class="section-title">${groupName}</div>${optionRows}`;
      })
      .join("");
  };

  const html = pages
    .map((page) => {
      const options = TOGGLE_OPTIONS.filter((option) => option.page === page);
      if (options.length === 0) return "";

      const sectionRows = renderSectionRows(options);
      const defaults: Record<string, string> = {
        global: "Global",
        home: "Home",
        bundles: "Bundles",
        giveaways: "Giveaways",
        item: "Items",
        inventory: "Inventory",
        profile: "Profile",
        auctions: "Auctions"
      };
      const label = tr(`panel.${page}`, lang, defaults[page] ?? page);
      return `<div class="section-title">${label}</div>${sectionRows}`;
    })
    .join("");

  rows.innerHTML = html || `<div class="empty">${tr("noOptions", lang, "No options in this section yet.")}</div>`;
}

function parseQuantityRules(ruleString: string): Array<{ price: number; qty: number }> {
  if (!ruleString.trim()) return [];
  
  const rules = ruleString
    .split(/[,\n]+/)
    .map((rule) => rule.trim())
    .filter((rule) => rule.length > 0)
    .map((rule) => {
      const [priceStr, qtyStr] = rule.split(":");
      const price = parseFloat(priceStr ?? "0");
      const qty = parseInt(qtyStr ?? "1", 10);
      return { price: isNaN(price) ? 0 : price, qty: isNaN(qty) ? 1 : qty };
    })
    .sort((a, b) => a.price - b.price);
  
  return rules;
}

function rulesToString(rules: Array<{ price: number; qty: number }>): string {
  return rules.map((r) => `${r.price}:${r.qty}`).join(",");
}

function renderQuantityRulesTable(
  rules: Array<{ price: number; qty: number }>,
  onDelete: (index: number) => Promise<void>,
  lang: string
): void {
  const container = byId<HTMLDivElement>("quantityRulesTable");
  
  if (rules.length === 0) {
    container.innerHTML = `<div class="quantity-empty">${tr("empty.rules", lang, "No rules yet. Add one to get started.")}</div>`;
    return;
  }

  const tableHtml = `
    <table class="quantity-rules-table">
      <thead>
        <tr>
          <th>${tr("table.maxPrice", lang, "Max Price")}</th>
          <th>${tr("table.quantity", lang, "Quantity")}</th>
          <th>${tr("table.actions", lang, "Actions")}</th>
        </tr>
      </thead>
      <tbody>
        ${rules
          .map(
            (rule, idx) => `
          <tr>
            <td>$${rule.price.toFixed(2)}</td>
            <td>${rule.qty}×</td>
            <td class="quantity-rule-actions">
              <button class="danger" data-delete="${idx}">🗑️</button>
            </td>
          </tr>
        `
          )
          .join("")}
      </tbody>
    </table>
  `;

  container.innerHTML = tableHtml;

  // Add delete handlers
  container.querySelectorAll<HTMLButtonElement>("button[data-delete]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const idx = parseInt(btn.dataset.delete || "0", 10);
      await onDelete(idx);
    });
  });
}

async function bootstrap(): Promise<void> {
  let settings = await getSettings();

  const renderAndBindToggles = (): void => {
    renderPanelRows("generalToggleRows", PANEL_PAGES.general, settings.language);
    renderPanelRows("giveawaysToggleRows", PANEL_PAGES.giveaways, settings.language);
    renderPanelRows("itemToggleRows", PANEL_PAGES.item, settings.language);
    renderPanelRows("inventoryToggleRows", PANEL_PAGES.inventory, settings.language);
    renderPanelRows("profileToggleRows", PANEL_PAGES.profile, settings.language);
    renderPanelRows("auctionsToggleRows", PANEL_PAGES.auctions, settings.language);

    for (const option of TOGGLE_OPTIONS) {
      const field = byId<HTMLInputElement>(option.key);
      field.checked = Boolean(settings[option.key]);
      field.addEventListener("change", async () => {
        settings = { ...settings, [option.key]: field.checked };
        await saveSettings(settings);
        await notifyActiveTab(settings);
      });
    }
  };

  // Localize UI based on current language
  await loadLocale(settings.language);
  renderAndBindToggles();
  localizeUI(settings.language);
  updateLanguageFlag(settings.language);

  const tabGeneral = byId<HTMLButtonElement>("tabGeneral");
  const tabGiveaways = byId<HTMLButtonElement>("tabGiveaways");
  const tabItem = byId<HTMLButtonElement>("tabItem");
  const tabInventory = byId<HTMLButtonElement>("tabInventory");
  const tabProfile = byId<HTMLButtonElement>("tabProfile");
  const tabAuctions = byId<HTMLButtonElement>("tabAuctions");
  tabGeneral.addEventListener("click", () => setActiveTab("general"));
  tabGiveaways.addEventListener("click", () => setActiveTab("giveaways"));
  tabItem.addEventListener("click", () => setActiveTab("item"));
  tabInventory.addEventListener("click", () => setActiveTab("inventory"));
  tabProfile.addEventListener("click", () => setActiveTab("profile"));
  tabAuctions.addEventListener("click", () => setActiveTab("auctions"));

  const chartMode = byId<HTMLSelectElement>("itemChartMode");
  chartMode.value = settings.itemChartMode;
  chartMode.addEventListener("change", async () => {
    const value = chartMode.value;
    const next =
      value === "keep" || value === "minimize" || value === "hide" || value === "afterBuyOrders"
        ? value
        : "keep";
    settings = { ...settings, itemChartMode: next };
    await saveSettings(settings);
    await notifyActiveTab(settings);
  });

  const sectionOrder = byId<HTMLSelectElement>("itemSectionOrder");
  sectionOrder.value = settings.itemSectionOrder;
  sectionOrder.addEventListener("change", async () => {
    const value = sectionOrder.value;
    const next =
      value === "buyorders-sales-items" ||
      value === "buyorders-items-sales" ||
      value === "sales-buyorders-items" ||
      value === "sales-items-buyorders" ||
      value === "items-buyorders-sales" ||
      value === "items-sales-buyorders"
        ? value
        : "buyorders-sales-items";
    settings = { ...settings, itemSectionOrder: next };
    await saveSettings(settings);
    await notifyActiveTab(settings);
  });

  const quantityRules = byId<HTMLTextAreaElement>("itemBuyOrderQuantityRules");
  quantityRules.value = settings.itemBuyOrderQuantityRules;

  let currentRules = parseQuantityRules(settings.itemBuyOrderQuantityRules);

  const persistQuantityRules = async (): Promise<void> => {
    quantityRules.value = rulesToString(currentRules);
    settings = { ...settings, itemBuyOrderQuantityRules: quantityRules.value };
    await saveSettings(settings);
    await notifyActiveTab(settings);
  };

  const renderRules = (): void => {
    renderQuantityRulesTable(currentRules, async (index) => {
      currentRules.splice(index, 1);
      await persistQuantityRules();
      renderRules();
    }, settings.language);
  };

  renderRules();

  const addRuleBtn = byId<HTMLButtonElement>("addQuantityRuleBtn");
  const priceInput = byId<HTMLInputElement>("quantityRulePrice");
  const qtyInput = byId<HTMLInputElement>("quantityRuleQty");

  const addRule = async (): Promise<void> => {
    const price = parseFloat(priceInput.value);
    const qty = parseInt(qtyInput.value, 10);

    if (isNaN(price) || price < 0) {
      alert(tr("alert.invalidPrice", settings.language, "Please enter a valid price"));
      return;
    }

    if (isNaN(qty) || qty < 1) {
      alert(tr("alert.invalidQty", settings.language, "Please enter a valid quantity"));
      return;
    }

    currentRules.push({ price, qty });
    currentRules.sort((a, b) => a.price - b.price);

    await persistQuantityRules();

    priceInput.value = "";
    qtyInput.value = "";
    renderRules();
  };

  addRuleBtn.addEventListener("click", addRule);
  priceInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      void addRule();
      qtyInput.focus();
    }
  });
  qtyInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      void addRule();
      priceInput.focus();
    }
  });

  const language = byId<HTMLSelectElement>("language");
  language.value = getLanguageValue(settings);
  language.addEventListener("change", async () => {
    const value = language.value;
    const nextLanguage = value === "en" || value === "pt_BR" || value === "es" || value === "ru" || value === "auto" ? value : "auto";
    settings = { ...settings, language: nextLanguage };
    await saveSettings(settings);
    await notifyActiveTab(settings);
    // Reflect translation updates and flags
    await loadLocale(nextLanguage);
    renderAndBindToggles();
    localizeUI(nextLanguage);
    updateLanguageFlag(nextLanguage);
  });

  const inventoryQuickUpdateAutoPriceMode = byId<HTMLSelectElement>("inventoryQuickUpdateAutoPriceMode");
  inventoryQuickUpdateAutoPriceMode.value = settings.inventoryQuickUpdateAutoPriceMode;
  inventoryQuickUpdateAutoPriceMode.addEventListener("change", async () => {
    const value = inventoryQuickUpdateAutoPriceMode.value;
    const next = value === "none" || value === "match" || value === "suggested" ? value : "match";
    settings = { ...settings, inventoryQuickUpdateAutoPriceMode: next };
    await saveSettings(settings);
    await notifyActiveTab(settings);
  });

}

void bootstrap();
