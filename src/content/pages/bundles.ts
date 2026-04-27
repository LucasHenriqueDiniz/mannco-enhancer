import type { ContentModule } from "../types";

const BUNDLES_HINT_CLASS = "mannco-enhancer-bundle-hint";

export const bundlesModule: ContentModule = {
  id: "bundles-module",
  routes: ["bundles"],
  apply(_context, settings) {
    document.querySelectorAll<HTMLElement>(`.${BUNDLES_HINT_CLASS}`).forEach((n) => n.remove());

    if (!settings.enabled || !settings.bundlesValueHints) return;

    const cards = document.querySelectorAll<HTMLElement>("[data-bundle-id], .bundle-card, .item-card");
    cards.forEach((card) => {
      const hint = document.createElement("div");
      hint.className = BUNDLES_HINT_CLASS;
      hint.textContent = "Value hint: review bundle items before purchase.";
      hint.setAttribute("style", "margin-top:6px;font-size:11px;color:#acc7dc;");
      card.appendChild(hint);
    });
  }
};
