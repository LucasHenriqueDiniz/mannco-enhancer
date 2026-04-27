import type { PageContext, RouteKind } from "../types";
import { HEADER_BALANCE_SELECTORS, HEADER_USERNAME_SELECTORS } from "./constants";
import { queryFirst } from "./dom";
import { parseMoney } from "./safety";

function detectRoute(pathname: string): RouteKind {
  if (pathname === "/") return "home";
  if (pathname.startsWith("/inventory")) return "inventory";
  if (pathname.startsWith("/profile")) return "profile";
  if (pathname.startsWith("/item/")) return "item";
  if (pathname.startsWith("/giveaways")) return "giveaways";
  if (pathname.startsWith("/bundles")) return "bundles";
  if (pathname.startsWith("/auctions")) return "auctions";
  return "other";
}

const KNOWN_ROUTE_PREFIXES = ["/", "/inventory", "/profile", "/item/", "/giveaways", "/bundles", "/auctions"] as const;

function isKnownRoutePrefix(pathname: string): boolean {
  return KNOWN_ROUTE_PREFIXES.some((prefix) => (prefix === "/" ? pathname === "/" : pathname.startsWith(prefix)));
}

export function normalizeLocalizedPath(pathname: string): string {
  if (isKnownRoutePrefix(pathname)) return pathname;

  const normalized = pathname.startsWith("/") ? pathname : `/${pathname}`;
  const segments = normalized.split("/").filter((segment) => segment.length > 0);
  if (segments.length < 2) return normalized;

  const firstSegment = segments[0] ?? "";
  const looksLikeLocale = /^[a-z]{2,3}(?:[-_][a-z]{2,4})?$/i.test(firstSegment);
  if (!looksLikeLocale) return normalized;

  const withoutLocale = `/${segments.slice(1).join("/")}`;
  return withoutLocale.length > 0 ? withoutLocale : "/";
}

function parseAppIdFromPath(pathname: string): number | null {
  const match = pathname.match(/^\/item\/(\d+)-/);
  if (!match) return null;
  const id = Number(match[1]);
  return Number.isFinite(id) ? id : null;
}

export function buildPageContext(url = new URL(window.location.href)): PageContext {
  const normalizedPathname = normalizeLocalizedPath(url.pathname);
  const usernameNode = queryFirst(HEADER_USERNAME_SELECTORS);
  const balanceNode = queryFirst(HEADER_BALANCE_SELECTORS);
  const itemNameNode = document.querySelector<HTMLElement>("h1");

  return {
    url,
    route: detectRoute(normalizedPathname),
    appId: parseAppIdFromPath(normalizedPathname),
    username: usernameNode?.textContent?.trim() || null,
    availableBalance: balanceNode?.textContent ? parseMoney(balanceNode.textContent) : null,
    itemName: itemNameNode?.textContent?.trim() || null
  };
}
