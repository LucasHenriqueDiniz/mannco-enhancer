export const APP_ID_TF2 = 440;

export const MANNCO_ROOTS = ["https://mannco.store/", "https://www.mannco.store/"] as const;

export const INJECTED_ATTR = "data-mannco-enhancer";

export const HEADER_USERNAME_SELECTORS = [
  "[data-username]",
  "a[href*='/profile'] .username",
  "header .username",
  "header [class*='user']"
] as const;

export const HEADER_BALANCE_SELECTORS = [
  "#account-dropdown .account-balance",
  ".account-balance.ecurrency",
  "[data-balance]",
  "[data-wallet]",
  "header .balance",
  "header [class*='balance']",
  "header [class*='wallet']"
] as const;
