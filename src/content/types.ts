import type { Settings } from "../lib/types";

export type RouteKind = "home" | "inventory" | "profile" | "item" | "giveaways" | "bundles" | "auctions" | "other";

export type PageContext = {
  url: URL;
  route: RouteKind;
  appId: number | null;
  username: string | null;
  availableBalance: number | null;
  itemName: string | null;
};

export type ContentModule = {
  id: string;
  routes: RouteKind[] | "all";
  apply: (context: PageContext, settings: Settings) => void;
};
