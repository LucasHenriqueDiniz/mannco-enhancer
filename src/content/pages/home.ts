import type { ContentModule } from "../types";

const BADGE_ID = "mannco-enhancer-home-badge";
const HOME_STYLE_ID = "mannco-enhancer-home-style";

function syncHomeStyle(hideBanner: boolean, hideFaq: boolean): void {
  const existing = document.getElementById(HOME_STYLE_ID);
  if (!hideBanner && !hideFaq) {
    existing?.remove();
    return;
  }

  const rules: string[] = [];
  if (hideBanner) {
    rules.push("main#main > .glide.glide__home { display: none !important; }");
  }

  if (hideFaq) {
    rules.push("main#main .home-seo { display: none !important; }");
    rules.push("main#main .home-seo + .container-fluid { display: none !important; }");
    rules.push("main#main .textpage { display: none !important; }");
  }

  const css = rules.join("\n");
  const style = existing ?? document.createElement("style");
  style.id = HOME_STYLE_ID;
  if (style.textContent !== css) style.textContent = css;
  if (!existing) document.head.appendChild(style);
}

export const homeModule: ContentModule = {
  id: "home-module",
  routes: ["home", "other"],
  apply(context, settings) {
    syncHomeStyle(settings.enabled && settings.homeHideBanner, settings.enabled && settings.homeHideFaq);

    const existing = document.getElementById(BADGE_ID);
    if (!settings.enabled || !settings.globalHeaderSummary) {
      existing?.remove();
      return;
    }

    const anchor = document.querySelector<HTMLElement>("header") || document.body;
    if (!anchor) return;

    const badge = existing ?? document.createElement("div");
    badge.id = BADGE_ID;
    badge.textContent = context.username
      ? `Mannco Enhancer active - ${context.username}`
      : "Mannco Enhancer active";
    badge.dataset.i18nKey = "content.active";
    badge.setAttribute(
      "style",
      "margin:8px 12px;padding:6px 8px;border:1px solid #5a7388;border-radius:6px;color:#cfe4f5;font-size:12px;"
    );

    if (!existing) anchor.appendChild(badge);
  }
};
