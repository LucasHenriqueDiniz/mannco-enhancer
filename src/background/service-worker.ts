import { DEFAULT_SETTINGS } from "../lib/storage";
import { getProviderMeta, type ExternalPriceEntry, type ExternalPriceProviderId } from "../lib/external-prices";
import type { FetchExternalPriceProviderResponse, FetchExternalPricesResponse, Message } from "../lib/types";

const LOG = "[Mannco Enhancer]";
const CORS_BLOCKED_PROVIDER_IDS = new Set<ExternalPriceProviderId>(["shadowpay", "waxpeer", "skinbaron", "tradeit", "bitskins", "csfloat", "skinport"]);

chrome.runtime.onInstalled.addListener(async () => {
  const existing = await chrome.storage.sync.get(DEFAULT_SETTINGS);
  const merged = { ...DEFAULT_SETTINGS, ...existing };
  await chrome.storage.sync.set(merged);
  console.log(`${LOG} settings initialized`);
});

chrome.runtime.onMessage.addListener((message: Message, _sender, sendResponse) => {
  if (message.type === "FETCH_EXTERNAL_PRICES") {
    void (async () => {
      const itemName = message.itemName.trim();
      if (!itemName) {
        const response: FetchExternalPricesResponse = { ok: false, error: "Missing item name" };
        sendResponse(response);
        return;
      }

      try {
        const prices = await fetchExternalPrices(itemName);
        const response: FetchExternalPricesResponse = { ok: true, prices };
        sendResponse(response);
      } catch (error) {
        const response: FetchExternalPricesResponse = {
          ok: false,
          error: error instanceof Error ? error.message : "Failed to fetch external prices"
        };
        sendResponse(response);
      }
    })();
    return true;
  }

  if (message.type === "FETCH_EXTERNAL_PRICE_PROVIDER") {
    void (async () => {
      const itemName = message.itemName.trim();
      if (!itemName) {
        const response: FetchExternalPriceProviderResponse = { ok: false, error: "Missing item name" };
        sendResponse(response);
        return;
      }

      try {
        const price = await fetchExternalPriceByProvider(itemName, message.providerId);
        const response: FetchExternalPriceProviderResponse = { ok: true, price };
        sendResponse(response);
      } catch (error) {
        const response: FetchExternalPriceProviderResponse = {
          ok: false,
          error: error instanceof Error ? error.message : "Failed to fetch provider price"
        };
        sendResponse(response);
      }
    })();
    return true;
  }

  if (message.type === "PING") {
    sendResponse({ ok: true, from: "background" });
    return;
  }
});

function now(): number {
  return Date.now();
}

function providerHttpNote(status: number): string {
  if (status === 403) return "HTTP 403 (blocked by anti-bot)";
  if (status === 429) return "HTTP 429 (rate limited)";
  return `HTTP ${status}`;
}

function normalizeSearchName(name: string): string {
  return name.replace(/\s*\([^)]*\)\s*$/, "").replace(/\s+/g, " ").trim();
}

async function fetchSteamCommunitySearchPrice(itemName: string): Promise<{ priceText: string; note?: string } | null> {
  const query = normalizeSearchName(itemName);
  if (!query) return null;

  const url = `https://steamcommunity.com/market/search/render/?appid=440&norender=1&count=20&query=${encodeURIComponent(query)}`;
  const response = await fetch(url, { method: "GET", credentials: "omit" });
  if (!response.ok) return null;

  const data = (await response.json()) as {
    success?: boolean;
    results?: Array<{ hash_name?: string; sell_price_text?: string; sale_price_text?: string }>;
  };
  if (!data.success || !Array.isArray(data.results) || data.results.length === 0) return null;

  const normalizedQuery = query.toLowerCase();
  const exact = data.results.find((row) => (row.hash_name || "").trim().toLowerCase() === normalizedQuery);
  const fuzzy = data.results.find((row) => (row.hash_name || "").toLowerCase().includes(normalizedQuery));
  const best = exact || fuzzy || data.results[0];
  const price = best?.sell_price_text?.trim() || best?.sale_price_text?.trim() || "";
  if (!price) return null;

  const matchedName = (best?.hash_name || "").trim();
  const note = matchedName && matchedName.toLowerCase() !== normalizedQuery ? `Matched ${matchedName}` : "Search fallback";
  return { priceText: price, note };
}

async function fetchExternalPrices(itemName: string): Promise<ExternalPriceEntry[]> {
  const [steam, backpack, dmarket, skinport, csfloat, tradeit, bitskins, shadowpay, waxpeer, skinbaron] = await Promise.all([
    fetchSteamCommunityPrice(itemName),
    fetchBackpackPrice(itemName),
    fetchDmarketPrice(itemName),
    fetchGenericMarketplacePrice("skinport", itemName),
    fetchGenericMarketplacePrice("csfloat", itemName),
    fetchGenericMarketplacePrice("tradeit", itemName),
    fetchGenericMarketplacePrice("bitskins", itemName),
    fetchGenericMarketplacePrice("shadowpay", itemName),
    fetchGenericMarketplacePrice("waxpeer", itemName),
    fetchGenericMarketplacePrice("skinbaron", itemName)
  ]);
  return [steam, backpack, dmarket, skinport, csfloat, tradeit, bitskins, shadowpay, waxpeer, skinbaron];
}

async function fetchExternalPriceByProvider(itemName: string, providerId: ExternalPriceProviderId): Promise<ExternalPriceEntry> {
  switch (providerId) {
    case "steamCommunity":
      return fetchSteamCommunityPrice(itemName);
    case "backpackTf":
      return fetchBackpackPrice(itemName);
    case "dmarket":
      return fetchDmarketPrice(itemName);
    case "skinport":
    case "csfloat":
    case "tradeit":
    case "bitskins":
    case "shadowpay":
    case "waxpeer":
    case "skinbaron":
      return fetchGenericMarketplacePrice(providerId, itemName);
    default:
      return {
        providerId,
        label: providerId,
        url: "",
        state: "error",
        priceText: "Error",
        note: "Unsupported provider",
        updatedAt: now()
      };
  }
}

function parseHeuristicPriceFromHtml(html: string): string | null {
  const candidates = [
    /"lowest_price"\s*[:=]\s*"?\$?\s*([0-9]+(?:[\.,][0-9]{2})?)"?/i,
    /"price"\s*[:=]\s*"?\$?\s*([0-9]+(?:[\.,][0-9]{2})?)"?/i,
    /data-price\s*=\s*"\$?\s*([0-9]+(?:[\.,][0-9]{2})?)"/i,
    /\$\s*([0-9]+(?:[\.,][0-9]{2})?)/i
  ];

  for (const pattern of candidates) {
    const match = html.match(pattern);
    const raw = match?.[1]?.replace(/,/g, ".").trim();
    const value = Number(raw);
    if (!Number.isFinite(value) || value <= 0) continue;
    if (value > 100000) continue;
    return `$${value.toFixed(2)}`;
  }

  return null;
}

async function fetchGenericMarketplacePrice(providerId: ExternalPriceProviderId, itemName: string): Promise<ExternalPriceEntry> {
  const meta = getProviderMeta(providerId);
  const url = meta.buildUrl(itemName);

  if (CORS_BLOCKED_PROVIDER_IDS.has(providerId)) {
    return {
      providerId: meta.id,
      label: meta.label,
      url,
      state: "unavailable",
      priceText: "Unavailable",
      note: "Blocked by CORS on direct extension fetch",
      updatedAt: now()
    };
  }

  try {
    const response = await fetch(url, {
      method: "GET",
      credentials: "omit",
      headers: {
        "accept-language": "en-US,en;q=0.9"
      }
    });

    if (!response.ok) {
      return {
        providerId: meta.id,
        label: meta.label,
        url,
        state: "unavailable",
        priceText: "Unavailable",
        note: providerHttpNote(response.status),
        updatedAt: now()
      };
    }

    const html = await response.text();
    const parsed = parseHeuristicPriceFromHtml(html);
    if (!parsed) {
      return {
        providerId: meta.id,
        label: meta.label,
        url,
        state: "unavailable",
        priceText: "No price",
        note: "No parseable price on public page",
        updatedAt: now()
      };
    }

    return {
      providerId: meta.id,
      label: meta.label,
      url,
      state: "ok",
      priceText: parsed,
      note: "Heuristic page parse",
      updatedAt: now()
    };
  } catch (error) {
    return {
      providerId: meta.id,
      label: meta.label,
      url,
      state: "error",
      priceText: "Error",
      note: error instanceof Error ? error.message : "Request failed",
      updatedAt: now()
    };
  }
}

async function fetchSteamCommunityPrice(itemName: string): Promise<ExternalPriceEntry> {
  const meta = getProviderMeta("steamCommunity");
  const url = `https://steamcommunity.com/market/priceoverview/?appid=440&currency=1&market_hash_name=${encodeURIComponent(itemName)}`;

  try {
    const response = await fetch(url, { method: "GET", credentials: "omit" });
    if (!response.ok) {
      return {
        providerId: meta.id,
        label: meta.label,
        url: meta.buildUrl(itemName),
        state: "unavailable",
        priceText: "Unavailable",
        note: providerHttpNote(response.status),
        updatedAt: now()
      };
    }

    const data = (await response.json()) as {
      success?: boolean;
      lowest_price?: string;
      median_price?: string;
      volume?: string;
    };

    if (!data.success) {
      const fallback = await fetchSteamCommunitySearchPrice(itemName);
      if (fallback) {
        return {
          providerId: meta.id,
          label: meta.label,
          url: meta.buildUrl(itemName),
          state: "ok",
          priceText: fallback.priceText,
          note: fallback.note,
          updatedAt: now()
        };
      }

      return {
        providerId: meta.id,
        label: meta.label,
        url: meta.buildUrl(itemName),
        state: "unavailable",
        priceText: "No listing",
        note: "Steam market data not available for this item.",
        updatedAt: now()
      };
    }

    const lowest = data.lowest_price?.trim();
    const median = data.median_price?.trim();
    const volume = data.volume?.trim();
    const primary = lowest || median || "";
    if (!primary) {
      const fallback = await fetchSteamCommunitySearchPrice(itemName);
      if (fallback) {
        return {
          providerId: meta.id,
          label: meta.label,
          url: meta.buildUrl(itemName),
          state: "ok",
          priceText: fallback.priceText,
          note: fallback.note,
          updatedAt: now()
        };
      }

      return {
        providerId: meta.id,
        label: meta.label,
        url: meta.buildUrl(itemName),
        state: "unavailable",
        priceText: "No price",
        note: "No price available in Steam responses",
        updatedAt: now()
      };
    }

    const noteParts: string[] = [];
    if (median && median !== primary) noteParts.push(`Median ${median}`);
    if (volume) noteParts.push(`Volume ${volume}`);

    return {
      providerId: meta.id,
      label: meta.label,
      url: meta.buildUrl(itemName),
      state: "ok",
      priceText: primary,
      note: noteParts.join(" | ") || undefined,
      updatedAt: now()
    };
  } catch (error) {
    return {
      providerId: meta.id,
      label: meta.label,
      url: meta.buildUrl(itemName),
      state: "error",
      priceText: "Error",
      note: error instanceof Error ? error.message : "Request failed",
      updatedAt: now()
    };
  }
}

async function fetchBackpackPrice(itemName: string): Promise<ExternalPriceEntry> {
  const meta = getProviderMeta("backpackTf");
  const url = meta.buildUrl(itemName);

  try {
    const response = await fetch(url, { method: "GET", credentials: "omit" });
    if (!response.ok) {
      return {
        providerId: meta.id,
        label: meta.label,
        url,
        state: "unavailable",
        priceText: "Unavailable",
        note: providerHttpNote(response.status),
        updatedAt: now()
      };
    }

    const html = await response.text();
    const listingPriceMatch = html.match(/data-listing_price="([^"]+)"/i);
    const fallbackPriceMatch = html.match(/class="item-price"[^>]*>\s*([^<]+)\s*</i);
    const resolvedPrice = listingPriceMatch?.[1]?.trim() || fallbackPriceMatch?.[1]?.trim() || "";

    if (!resolvedPrice) {
      return {
        providerId: meta.id,
        label: meta.label,
        url,
        state: "unavailable",
        priceText: "Open listing",
        note: "Could not extract a direct price from classifieds.",
        updatedAt: now()
      };
    }

    return {
      providerId: meta.id,
      label: meta.label,
      url,
      state: "ok",
      priceText: resolvedPrice,
      note: "Top classified sample",
      updatedAt: now()
    };
  } catch (error) {
    return {
      providerId: meta.id,
      label: meta.label,
      url,
      state: "error",
      priceText: "Error",
      note: error instanceof Error ? error.message : "Request failed",
      updatedAt: now()
    };
  }
}

async function fetchDmarketPrice(itemName: string): Promise<ExternalPriceEntry> {
  const meta = getProviderMeta("dmarket");
  const url = `https://api.dmarket.com/exchange/v1/market/items?side=market&gameId=tf2&title=${encodeURIComponent(itemName)}&limit=1&orderBy=price&orderDir=asc&currency=USD`;

  try {
    const response = await fetch(url, { method: "GET", credentials: "omit" });
    if (!response.ok) {
      return {
        providerId: meta.id,
        label: meta.label,
        url: meta.buildUrl(itemName),
        state: "unavailable",
        priceText: "Unavailable",
        note: providerHttpNote(response.status),
        updatedAt: now()
      };
    }

    const data = (await response.json()) as {
      objects?: Array<{
        title?: string;
        price?: { USD?: string; amount?: string };
        amount?: string;
      }>;
    };

    const first = data.objects?.[0];
    const centsRaw = first?.price?.USD ?? first?.price?.amount ?? first?.amount;
    const cents = Number(centsRaw);
    if (!Number.isFinite(cents) || cents <= 0) {
      return {
        providerId: meta.id,
        label: meta.label,
        url: meta.buildUrl(itemName),
        state: "unavailable",
        priceText: "No price",
        note: "No matching listing returned by DMarket",
        updatedAt: now()
      };
    }

    const usd = cents / 100;
    return {
      providerId: meta.id,
      label: meta.label,
      url: meta.buildUrl(itemName),
      state: "ok",
      priceText: `$${usd.toFixed(2)}`,
      note: "Lowest listing sample",
      updatedAt: now()
    };
  } catch (error) {
    return {
      providerId: meta.id,
      label: meta.label,
      url: meta.buildUrl(itemName),
      state: "error",
      priceText: "Error",
      note: error instanceof Error ? error.message : "Request failed",
      updatedAt: now()
    };
  }
}
