export type ExternalPriceProviderId =
  | "steamCommunity"
  | "backpackTf"
  | "dmarket"
  | "skinport"
  | "csfloat"
  | "tradeit"
  | "bitskins"
  | "shadowpay"
  | "waxpeer"
  | "skinbaron";

export type ExternalPriceProviderMeta = {
  id: ExternalPriceProviderId;
  label: string;
  buildUrl: (itemName: string) => string;
};

export type ExternalPriceEntry = {
  providerId: ExternalPriceProviderId;
  label: string;
  url: string;
  state: "ok" | "unavailable" | "error";
  priceText: string;
  note?: string;
  updatedAt: number;
};

export const EXTERNAL_PRICE_PROVIDERS: readonly ExternalPriceProviderMeta[] = [
  {
    id: "steamCommunity",
    label: "Steam Community",
    buildUrl: (itemName) => `https://steamcommunity.com/market/listings/440/${encodeURIComponent(itemName)}`
  },
  {
    id: "backpackTf",
    label: "Backpack.tf",
    buildUrl: (itemName) => `https://backpack.tf/classifieds?item=${encodeURIComponent(itemName)}`
  },
  {
    id: "dmarket",
    label: "DMarket",
    buildUrl: (itemName) => `https://dmarket.com/ingame-items/item-list/tf2-skins?title=${encodeURIComponent(itemName)}`
  },
  {
    id: "skinport",
    label: "Skinport",
    buildUrl: (itemName) => `https://skinport.com/market?cat=TF2&query=${encodeURIComponent(itemName)}`
  },
  {
    id: "csfloat",
    label: "CSFloat",
    buildUrl: (itemName) => `https://csfloat.com/search?query=${encodeURIComponent(itemName)}`
  },
  {
    id: "tradeit",
    label: "Tradeit",
    buildUrl: (itemName) => `https://tradeit.gg/tf2/store?search=${encodeURIComponent(itemName)}`
  },
  {
    id: "bitskins",
    label: "BitSkins",
    buildUrl: (itemName) => `https://bitskins.com/market?app_id=440&search_item=${encodeURIComponent(itemName)}`
  },
  {
    id: "shadowpay",
    label: "ShadowPay",
    buildUrl: (itemName) => `https://shadowpay.com/tf2-items?search=${encodeURIComponent(itemName)}`
  },
  {
    id: "waxpeer",
    label: "Waxpeer",
    buildUrl: (itemName) => `https://waxpeer.com/market?game=tf2&search=${encodeURIComponent(itemName)}`
  },
  {
    id: "skinbaron",
    label: "SkinBaron",
    buildUrl: (itemName) => `https://skinbaron.de/en/search?search=${encodeURIComponent(itemName)}`
  }
];

export function getProviderMeta(id: ExternalPriceProviderId): ExternalPriceProviderMeta {
  const match = EXTERNAL_PRICE_PROVIDERS.find((provider) => provider.id === id);
  if (!match) {
    throw new Error(`Unknown provider: ${id}`);
  }
  return match;
}
