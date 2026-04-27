import type { ContentModule } from "../types";
import type { Settings } from "../../lib/types";
import { canRunWithCooldown } from "../shared/safety";

const TOOLBAR_STATUS_ID = "mannco-enhancer-profile-tools-status";
const MONEY_ATTR = "data-mannco-enhancer-profile-money-original";
const PROFILE_MONEY_STYLE_ID = "mannco-enhancer-profile-money-style";
const PROFILE_MONEY_WRAP_CLASS = "mannco-enhancer-profile-money-wrap";
const PROFILE_MONEY_TARGET_CLASS = "mannco-enhancer-profile-money-target";
const PROFILE_MONEY_HIDDEN_CLASS = "is-hidden";
const PROFILE_MONEY_TOGGLE_CLASS = "mannco-enhancer-profile-money-toggle";
const PROFILE_MONEY_LEGACY_INLINE_HEAD_CLASS = "mannco-enhancer-profile-inline-card-head";
const PROFILE_MONEY_ID_ATTR = "data-mannco-enhancer-profile-money-id";
const PROFILE_MONEY_WRAP_WIRED_ATTR = "data-mannco-enhancer-profile-money-wrap-wired";
let profileMoneyIdSeq = 0;
const profileMoneyHiddenById = new Map<string, boolean>();

const PROFILE_MONEY_SELECTORS = [
  ".important-text.ecurrency",
  ".important-text .ecurrency",
  ".currency",
  ".user-info dd.ecurrency",
  ".user-info dd[class*='currency']",
] as const;
const PROFILE_ACTION_BTN_CLASS = "mannco-enhancer-profile-action-btn";
const PROFILE_ACTION_WRAP_CLASS = "mannco-enhancer-profile-action-wrap";
const PROFILE_ACTION_INLINE_HEAD_CLASS = "mannco-enhancer-profile-inline-head";
const PROFILE_ACTION_STYLE_ID = "mannco-enhancer-profile-action-style";
const PROFILE_EXPORT_MODAL_ID = "mannco-enhancer-export-modal";
const PROFILE_EXPORT_MODAL_BACKDROP_ID = "mannco-enhancer-export-modal-backdrop";
const PROFILE_EXPORT_PROGRESS_MODAL_ID = "mannco-enhancer-export-progress-modal";
const PROFILE_EXPORT_PROGRESS_BACKDROP_ID = "mannco-enhancer-export-progress-backdrop";
const PROFILE_ARIA_HELPER_CLASS = "ui-helper-hidden-accessible";
let profileAriaLiveObserver: MutationObserver | null = null;
let profileAriaLiveCleanupPending = false;

type StatusTone = "idle" | "ok" | "warn";

type PaginationApi = {
  createPagination: (perPage: number, page: number, paginationId: string, query: string, maxPages: number) => void;
};

type ProfileApi = {
  loadStats?: (type: number, page?: number) => void;
};

type TransactionExportScope =
  | { kind: "pages"; pages: number }
  | { kind: "days"; days: number; cutoffTimestamp: number };

type TransactionExportResult = {
  exportedRows: number;
  exportedPages: number;
  visitedPages: number;
  targetPages: number;
  maxPages: number;
  canceled: boolean;
  partial: boolean;
  scope: TransactionExportScope;
};

type ExportProgressModal = {
  update: (state: { currentPage: number; visitedPages: number; collectedRows: number; etaMs: number | null; note: string }) => void;
  close: () => void;
  isCanceled: () => boolean;
};

type PageScopePromptOptions = {
  intro: string;
  optionTitle: string;
  startLabel: string;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function cleanCellText(raw: string): string {
  return raw.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}

function csvEscape(value: string): string {
  const safe = value.replace(/"/g, '""');
  return `"${safe}"`;
}

function clampInteger(value: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  const asInt = Math.trunc(value);
  return Math.max(min, Math.min(max, asInt));
}

function wireNumberInputBounds(input: HTMLInputElement | null, min: number, max: number, fallback: number): void {
  if (!input) return;
  input.min = String(min);
  input.max = String(max);
  input.inputMode = "numeric";
  input.pattern = "[0-9]*";

  const normalize = (): void => {
    const value = Number(input.value);
    const next = clampInteger(value, min, max, fallback);
    input.value = String(next);
  };

  input.addEventListener("keydown", (event) => {
    if (event.key === "e" || event.key === "E" || event.key === "+" || event.key === "-") {
      event.preventDefault();
    }
  });

  input.addEventListener("input", () => {
    const raw = input.value.trim();
    if (raw.length === 0) return;
    const value = Number(raw);
    if (!Number.isFinite(value)) {
      input.value = String(fallback);
      return;
    }
    if (value < min || value > max) {
      input.value = String(clampInteger(value, min, max, fallback));
    }
  });

  input.addEventListener("blur", normalize);
}

function asCsv(rows: string[][]): string {
  return rows.map((row) => row.map((cell) => csvEscape(cell)).join(",")).join("\n");
}

function getNowToken(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${d}_${hh}${mm}`;
}

function downloadCsv(filenameBase: string, rows: string[][]): void {
  const blob = new Blob([`\uFEFF${asCsv(rows)}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filenameBase}-${getNowToken()}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function getTableRows(tbodyId: string): string[][] {
  const tbody = document.getElementById(tbodyId);
  if (!(tbody instanceof HTMLTableSectionElement)) return [];

  const table = tbody.closest("table");
  const headerCells = table?.querySelectorAll<HTMLTableCellElement>("tr th");
  const header = headerCells ? Array.from(headerCells).map((cell) => cleanCellText(cell.textContent ?? "")) : [];

  const bodyRows = Array.from(tbody.querySelectorAll<HTMLTableRowElement>("tr"))
    .map((row) => Array.from(row.querySelectorAll<HTMLTableCellElement>("td,th")).map((cell) => cleanCellText(cell.textContent ?? "")))
    .filter((row) => row.some((cell) => cell.length > 0));

  if (header.length === 0) return bodyRows;
  return [header, ...bodyRows];
}

function getPaginationApi(): PaginationApi | null {
  const scope = window as Window & { Type?: { createPagination?: PaginationApi["createPagination"] } };
  const fn = scope.Type?.createPagination;
  if (typeof fn !== "function") return null;
  return { createPagination: fn };
}

function getProfileApi(): ProfileApi | null {
  const scope = window as Window & { Profile?: ProfileApi };
  if (!scope.Profile) return null;
  return scope.Profile;
}

function parseCreatePaginationArgs(onclickText: string): { perPage: number; page: number; maxPages: number } | null {
  const match = onclickText.match(/createPagination\(\s*(\d+)\s*,\s*(\d+)\s*,\s*['"][^'"]+['"]\s*,\s*['"][^'"]*['"]\s*,\s*(\d+)\s*\)/i);
  if (!match) return null;

  const perPage = Number(match[1]);
  const page = Number(match[2]);
  const maxPages = Number(match[3]);
  if (!Number.isFinite(perPage) || !Number.isFinite(page) || !Number.isFinite(maxPages)) return null;
  return { perPage, page, maxPages };
}

function getPaginationConfig(paginationId: string): { perPage: number; maxPages: number; currentPage: number } {
  const pagination = document.getElementById(paginationId);
  if (!(pagination instanceof HTMLElement)) {
    return { perPage: 10, maxPages: 1, currentPage: 1 };
  }

  const links = Array.from(pagination.querySelectorAll<HTMLAnchorElement>("a.page-link"));
  let perPage = 10;
  let maxPages = 1;

  for (const link of links) {
    const numericText = Number(link.textContent?.trim() ?? "");
    if (Number.isFinite(numericText) && numericText > maxPages) {
      maxPages = numericText;
    }

    const parsed = parseCreatePaginationArgs(link.getAttribute("onclick") ?? "");
    if (!parsed) continue;
    if (parsed.perPage > 0) perPage = parsed.perPage;
    if (parsed.maxPages > maxPages) maxPages = parsed.maxPages;
    if (parsed.page > maxPages) maxPages = parsed.page;
  }

  const active = pagination.querySelector<HTMLElement>("li.page-item.active > a.page-link");
  const currentPage = Number(active?.textContent?.trim() ?? "1");

  return {
    perPage,
    maxPages,
    currentPage: Number.isFinite(currentPage) && currentPage > 0 ? currentPage : 1,
  };
}

function getTbodySignature(tbody: HTMLTableSectionElement): string {
  const rows = Array.from(tbody.querySelectorAll<HTMLTableRowElement>("tr")).slice(0, 3);
  const compactRows = rows
    .map((row) => {
      const sortId = row.getAttribute("data-sortid") ?? "-";
      const classes = row.className;
      return `${sortId}:${classes}:${cleanCellText(row.textContent ?? "")}`;
    })
    .join("|");
  return `${rows.length}:${compactRows}`;
}

function getLiveTbody(tbodyId: string): HTMLTableSectionElement | null {
  const tbody = document.getElementById(tbodyId);
  return tbody instanceof HTMLTableSectionElement ? tbody : null;
}

function waitForPaginationRefresh(tbodyId: string, previousSignature: string, readySelector = "tr"): Promise<boolean> {
  return new Promise((resolve) => {
    const startedAt = Date.now();
    const timeoutMs = 20000;

    const check = (): boolean => {
      const tbody = getLiveTbody(tbodyId);
      if (!tbody) return false;
      const nextSignature = getTbodySignature(tbody);
      const signatureChanged = nextSignature !== previousSignature;
      if (!signatureChanged) return false;

      const hasSpinner = !!tbody.querySelector(".spinner-border");
      const hasReadyContent = !!tbody.querySelector(readySelector);
      if (hasSpinner || !hasReadyContent) return false;

      return Date.now() - startedAt >= 220;
    };

    const intervalId = window.setInterval(() => {
      if (check()) {
        window.clearInterval(intervalId);
        window.clearTimeout(timeoutId);
        resolve(true);
      }
    }, 120);

    const timeoutId = window.setTimeout(() => {
      window.clearInterval(intervalId);
      resolve(false);
    }, timeoutMs);

    if (check()) {
      window.clearInterval(intervalId);
      window.clearTimeout(timeoutId);
      resolve(true);
    }
  });
}

function clickPaginationAnchor(anchor: HTMLAnchorElement): void {
  anchor.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
}

async function moveToPaginationPage(
  tbodyId: string,
  paginationId: string,
  page: number,
  perPage: number,
  maxPages: number,
  readySelector = "tr",
): Promise<boolean> {
  const api = getPaginationApi();

  const tbody = getLiveTbody(tbodyId);
  if (!tbody) return false;
  const previousSignature = getTbodySignature(tbody);

  if (api) {
    api.createPagination(perPage, page, paginationId, "", maxPages);
    const movedWithApi = await waitForPaginationRefresh(tbodyId, previousSignature, readySelector);
    if (movedWithApi) return true;
  }

  const pageAnchors = Array.from(document.querySelectorAll<HTMLAnchorElement>(`#${paginationId} a.page-link`));
  const pageAnchor = pageAnchors.find((anchor) => {
    const onclickText = anchor.getAttribute("onclick") ?? "";
    return onclickText.includes(`'${paginationId}'`) && onclickText.includes(`, ${page},`) && !onclickText.includes("prompt('Page ?'");
  });

  if (!pageAnchor) return false;
  clickPaginationAnchor(pageAnchor);
  return waitForPaginationRefresh(tbodyId, previousSignature, readySelector);
}

async function moveToProfileStatsPage(tbodyId: string, statsType: 4 | 8, page: number, readySelector = "tr"): Promise<boolean> {
  const profileApi = getProfileApi();
  if (!profileApi || typeof profileApi.loadStats !== "function") return false;
  const tbody = getLiveTbody(tbodyId);
  if (!tbody) return false;
  const previousSignature = getTbodySignature(tbody);
  profileApi.loadStats(statsType, page);
  return waitForPaginationRefresh(tbodyId, previousSignature, readySelector);
}

async function moveToTransactionsPage(page: number, perPage: number, maxPages: number): Promise<boolean> {
  const livePage = getPaginationConfig("TransacPagination").currentPage;
  if (livePage === page) return true;

  const movedWithProfile = await moveToProfileStatsPage("transacContent", 4, page, "td.date");
  if (movedWithProfile) return true;

  return moveToPaginationPage("transacContent", "TransacPagination", page, perPage, maxPages, "td.date");
}

async function moveToBuyOrdersPage(page: number, perPage: number, maxPages: number): Promise<boolean> {
  const livePage = getPaginationConfig("bosPagination").currentPage;
  if (livePage === page) return true;
  const movedWithProfile = await moveToProfileStatsPage("bosContent", 8, page, "tr[data-itemid]");
  if (movedWithProfile) return true;
  return moveToPaginationPage("bosContent", "bosPagination", page, perPage, maxPages, "tr[data-itemid]");
}

async function exportPaginatedTransactions(
  tbodyId: string,
  paginationId: string,
  filenameBase: string,
  statusPrefix: string,
): Promise<TransactionExportResult> {
  const initialTbody = getLiveTbody(tbodyId);
  if (!initialTbody) {
    return {
      exportedRows: 0,
      exportedPages: 0,
      visitedPages: 0,
      targetPages: 0,
      maxPages: 0,
      canceled: false,
      partial: false,
      scope: { kind: "pages", pages: 1 },
    };
  }

  const table = initialTbody.closest("table");
  const headerCells = table?.querySelectorAll<HTMLTableCellElement>("tr th");
  const header = headerCells ? Array.from(headerCells).map((cell) => cleanCellText(cell.textContent ?? "")) : [];

  const { perPage, maxPages, currentPage } = getPaginationConfig(paginationId);
  const scope = await promptTransactionExportScope(maxPages);
  if (!scope) {
    return {
      exportedRows: 0,
      exportedPages: 0,
      visitedPages: 0,
      targetPages: 0,
      maxPages,
      canceled: true,
      partial: false,
      scope: { kind: "pages", pages: 1 },
    };
  }

  const targetPages = scope.kind === "pages" ? Math.max(1, Math.min(maxPages, scope.pages)) : maxPages;

  if (maxPages <= 1) {
    const liveTbody = getLiveTbody(tbodyId);
    if (!liveTbody) {
      return {
        exportedRows: 0,
        exportedPages: 0,
        visitedPages: 0,
        targetPages: 1,
        maxPages: 1,
        canceled: false,
        partial: true,
        scope,
      };
    }
    const singlePage = getTransactionPageRows(liveTbody, scope);
    const bodyRows = singlePage.rows;
    const rows = header.length > 0 ? [header, ...bodyRows] : bodyRows;
    if (rows.length > 0) downloadCsv(filenameBase, rows);
    return {
      exportedRows: bodyRows.length,
      exportedPages: bodyRows.length > 0 ? 1 : 0,
      visitedPages: 1,
      targetPages: 1,
      maxPages: 1,
      canceled: false,
      partial: false,
      scope,
    };
  }

  const allRows: string[][] = [];
  let exportedPages = 0;
  let visitedPages = 0;
  let partial = false;
  let canceled = false;
  let reachedStartPage = currentPage === 1;
  const startedAt = Date.now();
  const progressModal = createExportProgressModal(statusPrefix, scope, targetPages, maxPages);
  let latestOldestTimestamp: number | null = null;

  const computeEtaMs = (): number | null => {
    const elapsed = Date.now() - startedAt;
    if (visitedPages <= 0) return null;
    const averageMs = elapsed / visitedPages;

    if (scope.kind === "pages") {
      return averageMs * Math.max(0, targetPages - visitedPages);
    }

    if (latestOldestTimestamp === null) {
      return averageMs * 3;
    }

    const coveredSpan = Math.max(1, Date.now() - latestOldestTimestamp);
    const targetSpan = Math.max(1, scope.days * 24 * 60 * 60 * 1000);
    const completionRatio = Math.min(1, Math.max(0.08, coveredSpan / targetSpan));
    const estimatedTotalPages = Math.max(visitedPages, visitedPages / completionRatio);
    return averageMs * Math.max(0, estimatedTotalPages - visitedPages);
  };

  const updateProgress = (currentPage: number, note: string): void => {
    const etaMs = computeEtaMs();
    progressModal.update({ currentPage, visitedPages, collectedRows: allRows.length, etaMs, note });
  };

  try {
    if (!reachedStartPage) {
      const prepText = `${statusPrefix}: preparing page 1/${targetPages}...`;
      setStatus(prepText);
      updateProgress(1, "Preparing first page...");
      reachedStartPage = await moveToTransactionsPage(1, perPage, maxPages);
    }

    if (!reachedStartPage) {
      setStatus(`${statusPrefix}: failed to load page 1.`, "warn");
      updateProgress(1, "Failed to load first page.");
      return {
        exportedRows: 0,
        exportedPages: 0,
        visitedPages: 0,
        targetPages,
        maxPages,
        canceled: false,
        partial: true,
        scope,
      };
    }

    for (let page = 1; page <= targetPages; page += 1) {
      if (progressModal.isCanceled()) {
        canceled = true;
        updateProgress(Math.max(1, page - 1), "Canceled by user.");
        break;
      }

      if (page > 1) {
        updateProgress(page, `Loading page ${page}...`);
        let moved = await moveToTransactionsPage(page, perPage, maxPages);
        if (!moved) {
          moved = await moveToTransactionsPage(page, perPage, maxPages);
        }
        if (!moved) {
          partial = true;
          setStatus(`${statusPrefix}: stopped at page ${page - 1}/${targetPages}.`, "warn");
          updateProgress(page - 1, `Stopped at page ${page - 1}.`);
          break;
        }
      }

      visitedPages += 1;
      const liveTbody = getLiveTbody(tbodyId);
      if (!liveTbody) {
        partial = true;
        setStatus(`${statusPrefix}: transaction table not found during export.`, "warn");
        updateProgress(page, "Table disappeared during export.");
        break;
      }
      const pageRows = getTransactionPageRows(liveTbody, scope);
      latestOldestTimestamp = pageRows.oldestTimestamp;
      if (pageRows.rows.length > 0) {
        allRows.push(...pageRows.rows);
        exportedPages += 1;
      }

      setStatus(`${statusPrefix}: exporting page ${page}/${targetPages}...`);
      updateProgress(page, `Exporting page ${page}/${targetPages}...`);

      if (progressModal.isCanceled()) {
        canceled = true;
        updateProgress(page, "Canceled by user.");
        break;
      }

      if (scope.kind === "days" && pageRows.hasDateRows && pageRows.allDateRowsOlderThanCutoff) {
        setStatus(`${statusPrefix}: reached rows older than ${scope.days} days at page ${page}.`);
        updateProgress(page, `Reached rows older than ${scope.days} days.`);
        break;
      }
    }

    if (currentPage !== 1 && currentPage <= maxPages) {
      updateProgress(currentPage, `Restoring page ${currentPage}...`);
      await moveToTransactionsPage(currentPage, perPage, maxPages);
    }
  } finally {
    progressModal.close();
  }

  const csvRows = header.length > 0 ? [header, ...allRows] : allRows;
  if (csvRows.length > 0) {
    downloadCsv(filenameBase, csvRows);
  }

  return {
    exportedRows: allRows.length,
    exportedPages,
    visitedPages,
    targetPages,
    maxPages,
    canceled,
    partial,
    scope,
  };
}

function getProfileMoneyNodes(): HTMLElement[] {
  const profileRoot = document.querySelector<HTMLElement>("main") ?? document.body;
  const nodes: HTMLElement[] = [];

  for (const selector of PROFILE_MONEY_SELECTORS) {
    profileRoot.querySelectorAll<HTMLElement>(selector).forEach((node) => {
      if (!nodes.includes(node)) nodes.push(node);
    });
  }

  return nodes;
}

function ensureMoneyNodeId(node: HTMLElement): string {
  const existing = node.getAttribute(PROFILE_MONEY_ID_ATTR);
  if (existing) return existing;

  profileMoneyIdSeq += 1;
  const id = `money-${profileMoneyIdSeq}`;
  node.setAttribute(PROFILE_MONEY_ID_ATTR, id);
  return id;
}

function ensureProfileMoneyStyles(): void {
  if (document.getElementById(PROFILE_MONEY_STYLE_ID)) return;

  const style = document.createElement("style");
  style.id = PROFILE_MONEY_STYLE_ID;
  style.textContent = `
    .${PROFILE_MONEY_WRAP_CLASS} {
      position: relative;
      display: inline-flex;
      align-items: center;
      vertical-align: middle;
      cursor: pointer;
    }

    .${PROFILE_MONEY_WRAP_CLASS}:focus-visible {
      outline: 2px solid rgba(120, 185, 235, 0.9);
      outline-offset: 2px;
      border-radius: 8px;
    }

    .${PROFILE_MONEY_WRAP_CLASS} .${PROFILE_MONEY_TARGET_CLASS} {
      transition: filter .2s ease;
    }

    .${PROFILE_MONEY_WRAP_CLASS}.${PROFILE_MONEY_HIDDEN_CLASS} .${PROFILE_MONEY_TARGET_CLASS} {
      filter: blur(4px);
      user-select: none;
      pointer-events: none;
    }

    .${PROFILE_MONEY_WRAP_CLASS}.${PROFILE_MONEY_HIDDEN_CLASS}::before {
      content: "";
      position: absolute;
      inset: -2px;
      border-radius: 8px;
      background: rgba(17, 28, 38, 0.28);
      z-index: 1;
      pointer-events: none;
    }

    .${PROFILE_MONEY_TOGGLE_CLASS} {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 26px;
      height: 26px;
      margin-left: 0;
      border: 1px solid rgba(130, 154, 173, 0.55);
      border-radius: 8px;
      background: rgba(35, 48, 59, 0.95);
      color: #d8e4ef;
      cursor: pointer;
      line-height: 1;
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      z-index: 2;
      transition: background-color .2s ease, border-color .2s ease;
    }

    .${PROFILE_MONEY_TOGGLE_CLASS}:hover {
      background: rgba(51, 67, 81, 0.98);
      border-color: rgba(168, 189, 206, 0.84);
    }

    .${PROFILE_MONEY_TOGGLE_CLASS} i {
      font-size: 12px;
    }

    .${PROFILE_MONEY_WRAP_CLASS}:not(.${PROFILE_MONEY_HIDDEN_CLASS}) .${PROFILE_MONEY_TOGGLE_CLASS} {
      left: auto;
      right: -16px;
      transform: translate(100%, -50%);
      opacity: 0.85;
    }

  `;

  document.head.appendChild(style);
}

function ensureProfileActionStyles(): void {
  if (document.getElementById(PROFILE_ACTION_STYLE_ID)) return;

  const style = document.createElement("style");
  style.id = PROFILE_ACTION_STYLE_ID;
  style.textContent = `
    .${PROFILE_ACTION_WRAP_CLASS} {
      display: inline-flex;
      flex-direction: row;
      align-items: center;
      gap: 8px;
      margin-right: 8px;
      flex-wrap: nowrap;
      flex: 0 0 auto;
    }

    .card .card-body > .${PROFILE_ACTION_WRAP_CLASS} {
      margin-top: 10px;
      margin-bottom: 12px;
    }

    .${PROFILE_ACTION_BTN_CLASS} {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      white-space: nowrap;
    }

    .${PROFILE_ACTION_BTN_CLASS} .mannco-enhancer-btn-icon {
      width: 14px;
      height: 14px;
      flex: 0 0 auto;
      color: currentColor;
    }

    .${PROFILE_ACTION_INLINE_HEAD_CLASS} {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      margin-bottom: 10px;
      flex-wrap: wrap;
    }

    .${PROFILE_ACTION_INLINE_HEAD_CLASS} > h3 {
      margin: 0;
    }

    .card .card-head > .ms-auto {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: nowrap;
    }

    #${PROFILE_EXPORT_MODAL_BACKDROP_ID},
    #${PROFILE_EXPORT_PROGRESS_BACKDROP_ID} {
      position: fixed;
      inset: 0;
      background: rgba(8, 13, 20, 0.62);
      backdrop-filter: blur(3px);
      z-index: 2147483600;
    }

    #${PROFILE_EXPORT_MODAL_ID},
    #${PROFILE_EXPORT_PROGRESS_MODAL_ID} {
      position: fixed;
      inset: 0;
      z-index: 2147483601;
      display: flex !important;
      align-items: center;
      justify-content: center;
      padding: 16px;
      overflow-y: auto;
      font-family: Poppins, "Segoe UI", Tahoma, sans-serif;
    }

    #${PROFILE_EXPORT_MODAL_ID} .me-modal-dialog,
    #${PROFILE_EXPORT_PROGRESS_MODAL_ID} .me-modal-dialog {
      width: min(760px, 100%);
      margin: 0 auto;
      pointer-events: auto;
    }

    #${PROFILE_EXPORT_MODAL_ID} .me-modal-content,
    #${PROFILE_EXPORT_PROGRESS_MODAL_ID} .me-modal-content {
      background: linear-gradient(170deg, #fefefe 0%, #f3f9ff 100%);
      border: 1px solid #c9d9eb;
      box-shadow: 0 20px 70px rgba(13, 21, 33, 0.34);
      border-radius: 16px;
      overflow: hidden;
    }

    #${PROFILE_EXPORT_MODAL_ID} .me-modal-header,
    #${PROFILE_EXPORT_PROGRESS_MODAL_ID} .me-modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 16px 18px;
      border-bottom: 1px solid #d6e5f5;
      background: linear-gradient(135deg, #1f4d78 0%, #25608f 100%);
      color: #f2f7fc;
    }

    #${PROFILE_EXPORT_MODAL_ID} .me-modal-title,
    #${PROFILE_EXPORT_PROGRESS_MODAL_ID} .me-modal-title {
      margin: 0;
      font-size: 20px;
      font-weight: 700;
      line-height: 1.2;
      letter-spacing: 0.01em;
    }

    #${PROFILE_EXPORT_MODAL_ID} .me-modal-close,
    #${PROFILE_EXPORT_PROGRESS_MODAL_ID} .me-modal-close {
      border: 1px solid rgba(216, 231, 245, 0.48);
      background: rgba(14, 30, 44, 0.28);
      color: #ebf5ff;
      width: 34px;
      height: 34px;
      border-radius: 10px;
      font-size: 22px;
      line-height: 1;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }

    #${PROFILE_EXPORT_MODAL_ID} .me-modal-close:hover,
    #${PROFILE_EXPORT_PROGRESS_MODAL_ID} .me-modal-close:hover {
      background: rgba(8, 19, 30, 0.45);
    }

    #${PROFILE_EXPORT_MODAL_ID} .me-modal-body,
    #${PROFILE_EXPORT_PROGRESS_MODAL_ID} .me-modal-body {
      padding: 18px;
      color: #17344f;
    }

    #${PROFILE_EXPORT_MODAL_ID} .me-modal-body *:not(.btn):not(.btn *),
    #${PROFILE_EXPORT_PROGRESS_MODAL_ID} .me-modal-body *:not(.btn):not(.btn *) {
      color: inherit;
    }

    #${PROFILE_EXPORT_MODAL_ID} .me-export-intro,
    #${PROFILE_EXPORT_PROGRESS_MODAL_ID} .me-export-progress-note {
      margin: 0 0 14px;
      color: #36556f;
      line-height: 1.5;
      font-size: 14px;
    }

    #${PROFILE_EXPORT_MODAL_ID} .me-export-option {
      border: 1px solid #cfdeed;
      border-radius: 12px;
      padding: 12px 14px;
      margin-bottom: 10px;
      background: rgba(255, 255, 255, 0.84);
      transition: border-color .2s ease, box-shadow .2s ease;
    }

    #${PROFILE_EXPORT_MODAL_ID} .me-export-option:focus-within {
      border-color: #2a6ca3;
      box-shadow: 0 0 0 3px rgba(42, 108, 163, 0.18);
    }

    #${PROFILE_EXPORT_MODAL_ID} .me-export-option-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 700;
      margin-bottom: 6px;
      color: #174367;
    }

    #${PROFILE_EXPORT_MODAL_ID} .me-export-option input[type='number'] {
      width: 130px;
      margin: 0 6px;
      border-radius: 10px;
      border: 1px solid #c6d8e8;
      color: #17344f !important;
      background: #ffffff !important;
    }

    #${PROFILE_EXPORT_MODAL_ID} .me-export-option input[type='number']:focus {
      border-color: #2a6ca3;
      box-shadow: 0 0 0 3px rgba(42, 108, 163, 0.18);
    }

    #${PROFILE_EXPORT_MODAL_ID} .btn.btn-secondary {
      background: #e8f0f8;
      border-color: #bfd2e4;
      color: #1b3e5d;
    }

    #${PROFILE_EXPORT_MODAL_ID} .btn.btn-secondary:hover {
      background: #dce9f5;
      border-color: #a9c3db;
      color: #14334d;
    }

    #${PROFILE_EXPORT_MODAL_ID} .btn.btn-primary {
      background: #2a6ca3;
      border-color: #255f90;
      color: #f7fbff;
    }

    #${PROFILE_EXPORT_MODAL_ID} .btn.btn-primary:hover {
      background: #235e8f;
      border-color: #1f567f;
      color: #f7fbff;
    }

    #${PROFILE_EXPORT_MODAL_ID} .me-export-option-note {
      margin-top: 6px;
      color: #52708b;
      font-size: 12px;
      line-height: 1.35;
    }

    #${PROFILE_EXPORT_MODAL_ID} .me-modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      padding: 0 18px 18px;
    }

    #${PROFILE_EXPORT_PROGRESS_MODAL_ID} .me-modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      padding: 0 18px 18px;
    }

    #${PROFILE_EXPORT_MODAL_ID} .me-export-progress-grid,
    #${PROFILE_EXPORT_PROGRESS_MODAL_ID} .me-export-progress-grid {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 8px 14px;
      font-size: 14px;
      padding: 12px;
      border: 1px solid #cfdeed;
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.84);
    }

    #${PROFILE_EXPORT_MODAL_ID} .me-export-progress-grid .me-label,
    #${PROFILE_EXPORT_PROGRESS_MODAL_ID} .me-export-progress-grid .me-label {
      color: #567490;
    }

    #${PROFILE_EXPORT_MODAL_ID} .me-export-progress-grid .me-value,
    #${PROFILE_EXPORT_PROGRESS_MODAL_ID} .me-export-progress-grid .me-value {
      color: #17344f;
      font-weight: 700;
      text-align: right;
    }

    @media (max-width: 640px) {
      #${PROFILE_EXPORT_MODAL_ID},
      #${PROFILE_EXPORT_PROGRESS_MODAL_ID} {
        padding: 10px;
      }

      #${PROFILE_EXPORT_MODAL_ID} .me-modal-header,
      #${PROFILE_EXPORT_PROGRESS_MODAL_ID} .me-modal-header,
      #${PROFILE_EXPORT_MODAL_ID} .me-modal-body,
      #${PROFILE_EXPORT_PROGRESS_MODAL_ID} .me-modal-body,
      #${PROFILE_EXPORT_MODAL_ID} .me-modal-footer {
        padding-left: 12px;
        padding-right: 12px;
      }

      #${PROFILE_EXPORT_MODAL_ID} .me-modal-title,
      #${PROFILE_EXPORT_PROGRESS_MODAL_ID} .me-modal-title {
        font-size: 17px;
      }
    }
  `;

  document.head.appendChild(style);
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes <= 0) return `${seconds}s`;
  if (minutes < 60) return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
  const hours = Math.floor(minutes / 60);
  const remMinutes = minutes % 60;
  return `${hours}h ${String(remMinutes).padStart(2, "0")}m`;
}

function createExportProgressModal(
  statusPrefix: string,
  scope: TransactionExportScope,
  targetPages: number,
  maxPages: number,
  options?: { operationLabel?: string; valueLabel?: string; introText?: string; cancelLabel?: string },
): ExportProgressModal {
  ensureProfileActionStyles();
  document.getElementById(PROFILE_EXPORT_PROGRESS_MODAL_ID)?.remove();
  document.getElementById(PROFILE_EXPORT_PROGRESS_BACKDROP_ID)?.remove();

  const modal = document.createElement("div");
  modal.className = "modal fade show";
  modal.id = PROFILE_EXPORT_PROGRESS_MODAL_ID;
  modal.tabIndex = -1;
  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-modal", "true");
  modal.setAttribute("aria-labelledby", "mannco-enhancer-export-progress-title");
  modal.style.display = "block";

  const scopeText = scope.kind === "pages" ? `${scope.pages} pages` : `last ${scope.days} days`;
  const operationLabel = options?.operationLabel ?? "export";
  const valueLabel = options?.valueLabel ?? "Collected rows";
  const introText = options?.introText ?? "Please wait while the extension navigates pages automatically. Keep this tab open until the operation completes.";
  const cancelLabel = options?.cancelLabel ?? "Cancel and keep partial";
  let canceled = false;
  modal.innerHTML = `
    <div class="me-modal-dialog" role="document">
      <div class="me-modal-content">
        <div class="me-modal-header">
          <h3 class="me-modal-title" id="mannco-enhancer-export-progress-title">${statusPrefix} ${operationLabel} in progress</h3>
        </div>
        <div class="me-modal-body">
          <p class="me-export-progress-note">${introText}</p>
          <div class="me-export-progress-grid">
            <span class="me-label">Scope</span><span class="me-value" data-field="scope">${scopeText}</span>
            <span class="me-label">Current page</span><span class="me-value" data-field="page">1</span>
            <span class="me-label">Visited pages</span><span class="me-value" data-field="visited">0 / ${targetPages}</span>
            <span class="me-label">${valueLabel}</span><span class="me-value" data-field="rows">0</span>
            <span class="me-label">Estimated remaining</span><span class="me-value" data-field="eta">calculating...</span>
            <span class="me-label">Status</span><span class="me-value" data-field="note">Starting...</span>
          </div>
        </div>
        <div class="me-modal-footer">
          <button type="button" class="btn btn-warning" data-action="cancel-progress">${cancelLabel}</button>
        </div>
      </div>
    </div>
  `;

  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop fade show";
  backdrop.id = PROFILE_EXPORT_PROGRESS_BACKDROP_ID;

  document.body.append(backdrop);
  document.body.append(modal);

  const pageNode = modal.querySelector<HTMLElement>("[data-field='page']");
  const visitedNode = modal.querySelector<HTMLElement>("[data-field='visited']");
  const rowsNode = modal.querySelector<HTMLElement>("[data-field='rows']");
  const etaNode = modal.querySelector<HTMLElement>("[data-field='eta']");
  const noteNode = modal.querySelector<HTMLElement>("[data-field='note']");
  const cancelButton = modal.querySelector<HTMLButtonElement>("button[data-action='cancel-progress']");

  cancelButton?.addEventListener("click", () => {
    canceled = true;
    cancelButton.disabled = true;
    if (noteNode) {
      noteNode.textContent = "Cancel requested. Finishing current step...";
      noteNode.dataset.i18nKey = "content.canceled";
    }
  });

  return {
    update: ({ currentPage, visitedPages, collectedRows, etaMs, note }) => {
      if (pageNode) pageNode.textContent = String(currentPage);
      if (visitedNode) {
        const totalText = scope.kind === "pages" ? `${targetPages}` : `${visitedPages} (limit ${maxPages})`;
        visitedNode.textContent = scope.kind === "pages" ? `${visitedPages} / ${totalText}` : totalText;
      }
      if (rowsNode) rowsNode.textContent = String(collectedRows);
      if (etaNode) {
        etaNode.textContent = etaMs === null
          ? "calculating..."
          : scope.kind === "days"
            ? `up to ${formatDuration(etaMs)}`
            : formatDuration(etaMs);
      }
      if (noteNode) noteNode.textContent = note;
    },
    close: () => {
      modal.remove();
      backdrop.remove();
    },
    isCanceled: () => canceled,
  };
}

function parseTransactionDateToTimestamp(raw: string): number | null {
  const trimmed = raw.trim();
  const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})$/);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6]);

  const timestamp = new Date(year, month - 1, day, hour, minute, second).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
}

function getTransactionPageRows(
  tbody: HTMLTableSectionElement,
  scope: TransactionExportScope,
): { rows: string[][]; allDateRowsOlderThanCutoff: boolean; hasDateRows: boolean; oldestTimestamp: number | null } {
  const resultRows: string[][] = [];
  let allDateRowsOlderThanCutoff = true;
  let hasDateRows = false;
  let oldestTimestamp: number | null = null;

  const rows = Array.from(tbody.querySelectorAll<HTMLTableRowElement>("tr"));
  for (const row of rows) {
    const cells = Array.from(row.querySelectorAll<HTMLTableCellElement>("td,th")).map((cell) => cleanCellText(cell.textContent ?? ""));
    if (!cells.some((cell) => cell.length > 0)) continue;

    if (scope.kind === "pages") {
      resultRows.push(cells);
      continue;
    }

    const dateCell = row.querySelector<HTMLTableCellElement>("td.date") ?? row.querySelector<HTMLTableCellElement>("td");
    const timestamp = parseTransactionDateToTimestamp(cleanCellText(dateCell?.textContent ?? ""));

    if (timestamp === null) {
      resultRows.push(cells);
      allDateRowsOlderThanCutoff = false;
      continue;
    }

    hasDateRows = true;
    oldestTimestamp = oldestTimestamp === null ? timestamp : Math.min(oldestTimestamp, timestamp);
    if (timestamp >= scope.cutoffTimestamp) {
      resultRows.push(cells);
      allDateRowsOlderThanCutoff = false;
    }
  }

  if (scope.kind === "pages") {
    allDateRowsOlderThanCutoff = false;
  }

  return { rows: resultRows, allDateRowsOlderThanCutoff, hasDateRows, oldestTimestamp };
}

function promptTransactionExportScope(maxPages: number): Promise<TransactionExportScope | null> {
  ensureProfileActionStyles();

  const defaultPages = Math.max(1, Math.min(maxPages, 50));

  return new Promise((resolve) => {
    const modal = document.createElement("div");
    modal.className = "modal fade show";
    modal.id = PROFILE_EXPORT_MODAL_ID;
    modal.tabIndex = -1;
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-labelledby", "mannco-enhancer-export-modal-title");
    modal.style.display = "block";

    modal.innerHTML = `
      <div class="me-modal-dialog" role="document">
        <div class="me-modal-content">
          <div class="me-modal-header">
            <h3 class="me-modal-title" id="mannco-enhancer-export-modal-title">Export transaction history</h3>
            <button type="button" class="me-modal-close" aria-label="Close" data-action="close">&times;</button>
          </div>
          <div class="me-modal-body">
            <p class="me-export-intro">Choose how much history to export. The extension navigates pages automatically, shows progress, and returns to your current page after finishing.</p>
            <label class="me-export-option">
              <span class="me-export-option-title">
                <input type="radio" name="me-export-mode" value="pages" checked>
                Export by number of pages
              </span>
              <div>
                <input type="number" class="form-control form-control-sm d-inline-block" min="1" max="${maxPages}" value="${defaultPages}" data-field="pages"> pages (max ${maxPages})
              </div>
              <div class="me-export-option-note">Good when you already know the amount you need.</div>
            </label>
            <label class="me-export-option">
              <span class="me-export-option-title">
                <input type="radio" name="me-export-mode" value="days">
                Export recent days only
              </span>
              <div>
                Last <input type="number" class="form-control form-control-sm d-inline-block" min="1" max="3650" value="7" data-field="days"> days
              </div>
              <div class="me-export-option-note">Stops once all rows in a page are older than this period.</div>
            </label>
          </div>
          <div class="me-modal-footer">
            <button type="button" class="btn btn-secondary" data-action="cancel">Cancel</button>
            <button type="button" class="btn btn-primary" data-action="start">Start export</button>
          </div>
        </div>
      </div>
    `;

    const backdrop = document.createElement("div");
    backdrop.className = "modal-backdrop fade show";
    backdrop.id = PROFILE_EXPORT_MODAL_BACKDROP_ID;

    document.body.append(backdrop);
    document.body.append(modal);

    const pagesInput = modal.querySelector<HTMLInputElement>("input[data-field='pages']");
    const daysInput = modal.querySelector<HTMLInputElement>("input[data-field='days']");
    const startButton = modal.querySelector<HTMLButtonElement>("button[data-action='start']");
    const cancelButton = modal.querySelector<HTMLButtonElement>("button[data-action='cancel']");
    const closeButton = modal.querySelector<HTMLButtonElement>("button[data-action='close']");

    wireNumberInputBounds(pagesInput, 1, maxPages, defaultPages);
    wireNumberInputBounds(daysInput, 1, 3650, 7);

    const close = (value: TransactionExportScope | null): void => {
      document.removeEventListener("keydown", keydownHandler);
      modal.remove();
      backdrop.remove();
      resolve(value);
    };

    const keydownHandler = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        event.preventDefault();
        close(null);
      }
    };
    document.addEventListener("keydown", keydownHandler);

    cancelButton?.addEventListener("click", () => close(null));
    closeButton?.addEventListener("click", () => close(null));
    backdrop.addEventListener("click", () => close(null));

    startButton?.addEventListener("click", () => {
      const selected = modal.querySelector<HTMLInputElement>("input[name='me-export-mode']:checked")?.value ?? "pages";
      if (selected === "days") {
        const rawDays = Number(daysInput?.value ?? "7");
        const days = clampInteger(rawDays, 1, 3650, 7);
        if (daysInput) daysInput.value = String(days);
        const cutoffTimestamp = Date.now() - days * 24 * 60 * 60 * 1000;
        close({ kind: "days", days, cutoffTimestamp });
        return;
      }

      const rawPages = Number(pagesInput?.value ?? defaultPages);
      const pages = clampInteger(rawPages, 1, maxPages, defaultPages);
      if (pagesInput) pagesInput.value = String(pages);
      close({ kind: "pages", pages });
    });
  });
}

function promptPageExportScope(
  title: string,
  maxPages: number,
  defaultPages = 50,
  options?: Partial<PageScopePromptOptions>,
): Promise<{ pages: number } | null> {
  ensureProfileActionStyles();

  const initialPages = Math.max(1, Math.min(maxPages, defaultPages));
  const intro = options?.intro ?? "Choose how many pages to process. The extension will navigate page by page and return to your current page at the end.";
  const optionTitle = options?.optionTitle ?? "Process by number of pages";
  const startLabel = options?.startLabel ?? "Start";

  return new Promise((resolve) => {
    const modal = document.createElement("div");
    modal.className = "modal fade show";
    modal.id = PROFILE_EXPORT_MODAL_ID;
    modal.tabIndex = -1;
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-labelledby", "mannco-enhancer-export-modal-title");
    modal.style.display = "block";

    modal.innerHTML = `
      <div class="me-modal-dialog" role="document">
        <div class="me-modal-content">
          <div class="me-modal-header">
            <h3 class="me-modal-title" id="mannco-enhancer-export-modal-title">${title}</h3>
            <button type="button" class="me-modal-close" aria-label="Close" data-action="close">&times;</button>
          </div>
          <div class="me-modal-body">
            <p class="me-export-intro">${intro}</p>
            <label class="me-export-option">
              <span class="me-export-option-title">${optionTitle}</span>
              <div>
                <input type="number" class="form-control form-control-sm d-inline-block" min="1" max="${maxPages}" value="${initialPages}" data-field="pages"> pages (max ${maxPages})
              </div>
            </label>
          </div>
          <div class="me-modal-footer">
            <button type="button" class="btn btn-secondary" data-action="cancel">Cancel</button>
            <button type="button" class="btn btn-primary" data-action="start">${startLabel}</button>
          </div>
        </div>
      </div>
    `;

    const backdrop = document.createElement("div");
    backdrop.className = "modal-backdrop fade show";
    backdrop.id = PROFILE_EXPORT_MODAL_BACKDROP_ID;

    document.body.append(backdrop);
    document.body.append(modal);

    const pagesInput = modal.querySelector<HTMLInputElement>("input[data-field='pages']");
    const startButton = modal.querySelector<HTMLButtonElement>("button[data-action='start']");
    const cancelButton = modal.querySelector<HTMLButtonElement>("button[data-action='cancel']");
    const closeButton = modal.querySelector<HTMLButtonElement>("button[data-action='close']");

    wireNumberInputBounds(pagesInput, 1, maxPages, initialPages);

    const close = (value: { pages: number } | null): void => {
      document.removeEventListener("keydown", keydownHandler);
      modal.remove();
      backdrop.remove();
      resolve(value);
    };

    const keydownHandler = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        event.preventDefault();
        close(null);
      }
    };
    document.addEventListener("keydown", keydownHandler);

    cancelButton?.addEventListener("click", () => close(null));
    closeButton?.addEventListener("click", () => close(null));
    backdrop.addEventListener("click", () => close(null));

    startButton?.addEventListener("click", () => {
      const value = Number(pagesInput?.value ?? initialPages);
      const pages = clampInteger(value, 1, maxPages, initialPages);
      if (pagesInput) pagesInput.value = String(pages);
      close({ pages });
    });
  });
}

function getRowCells(row: HTMLTableRowElement): string[] {
  return Array.from(row.querySelectorAll<HTMLTableCellElement>("td,th")).map((cell) => cleanCellText(cell.textContent ?? ""));
}

function getRowsSnapshotSignature(rows: HTMLTableRowElement[]): string {
  return rows
    .map((row) => {
      const itemId = row.getAttribute("data-itemid") ?? "";
      const sortId = row.getAttribute("data-sortid") ?? "";
      const cells = getRowCells(row).join("|");
      return `${itemId}::${sortId}::${cells}`;
    })
    .join("||");
}

function getBuyOrderRowKey(row: HTMLTableRowElement): string {
  const removeBtn = row.querySelector<HTMLButtonElement>("button[data-id][data-idd], button[onclick*='removeBO']");
  const itemId = row.getAttribute("data-itemid") ?? removeBtn?.getAttribute("data-idd") ?? "";
  const orderId = removeBtn?.getAttribute("data-id") ?? "";
  const price = removeBtn?.getAttribute("data-price") ?? "";
  const amount = removeBtn?.getAttribute("data-nb") ?? "";
  const cells = getRowCells(row).join("|");
  return `${itemId}::${orderId}::${price}::${amount}::${cells}`;
}

function getTableHeader(table: HTMLTableElement): string[] {
  return Array.from(table.querySelectorAll<HTMLTableCellElement>("tr th")).map((cell) => cleanCellText(cell.textContent ?? ""));
}

async function exportPaginatedBuyOrders(): Promise<{ canceled: boolean; partial: boolean; rows: number; pages: number; targetPages: number }> {
  const tbody = getLiveTbody("bosContent");
  if (!tbody) return { canceled: false, partial: false, rows: 0, pages: 0, targetPages: 0 };

  const table = tbody.closest("table");
  if (!(table instanceof HTMLTableElement)) return { canceled: false, partial: false, rows: 0, pages: 0, targetPages: 0 };

  const { perPage, maxPages, currentPage } = getPaginationConfig("bosPagination");
  const scope = await promptPageExportScope("Export buy orders", maxPages, 50, {
    intro: "Choose how many buy-order pages to export. The extension traverses each page and restores your original page at the end.",
    optionTitle: "Export by number of pages",
    startLabel: "Start export",
  });
  if (!scope) return { canceled: true, partial: false, rows: 0, pages: 0, targetPages: 0 };

  const targetPages = scope.pages;
  const allRows: string[][] = [];
  const seenRowKeys = new Set<string>();
  const seenPageSnapshots = new Set<string>();
  let pages = 0;
  let partial = false;
  let canceled = false;

  const progressModal = createExportProgressModal("Buy orders", { kind: "pages", pages: targetPages }, targetPages, maxPages);
  const startedAt = Date.now();

  const updateProgress = (currentPage: number, note: string): void => {
    const avgMs = pages > 0 ? (Date.now() - startedAt) / pages : null;
    const etaMs = avgMs === null ? null : avgMs * Math.max(0, targetPages - pages);
    progressModal.update({ currentPage, visitedPages: pages, collectedRows: allRows.length, etaMs, note });
  };

  try {
    if (currentPage !== 1) {
      updateProgress(1, "Preparing first page...");
      const started = await moveToBuyOrdersPage(1, perPage, maxPages);
      if (!started) {
        return { canceled: false, partial: true, rows: 0, pages: 0, targetPages };
      }
    }

    for (let page = 1; page <= targetPages; page += 1) {
      if (progressModal.isCanceled()) {
        canceled = true;
        updateProgress(Math.max(1, page - 1), "Canceled by user.");
        break;
      }

      if (page > 1) {
        updateProgress(page, `Loading page ${page}...`);
        const moved = await moveToBuyOrdersPage(page, perPage, maxPages);
        if (!moved) {
          partial = true;
          break;
        }
      }

      const liveTbody = getLiveTbody("bosContent");
      if (!liveTbody) {
        partial = true;
        break;
      }

      const pageRows = Array.from(liveTbody.querySelectorAll<HTMLTableRowElement>("tr[data-itemid], tr.bosContent"));
      let snapshot = getRowsSnapshotSignature(pageRows);
      if (snapshot.length > 0) {
        if (seenPageSnapshots.has(snapshot)) {
          if (page > 1) {
            updateProgress(page, `Page ${page} repeated data. Retrying...`);
            const retried = await moveToBuyOrdersPage(page, perPage, maxPages);
            if (!retried) {
              partial = true;
              break;
            }
            const retriedTbody = getLiveTbody("bosContent");
            if (!retriedTbody) {
              partial = true;
              break;
            }
            const retriedRows = Array.from(retriedTbody.querySelectorAll<HTMLTableRowElement>("tr[data-itemid], tr.bosContent"));
            snapshot = getRowsSnapshotSignature(retriedRows);
            if (snapshot.length > 0 && seenPageSnapshots.has(snapshot)) {
              partial = true;
              updateProgress(page, `Page ${page} repeated previous data. Stopping to avoid duplicates.`);
              break;
            }
            pageRows.length = 0;
            pageRows.push(...retriedRows);
          } else {
            partial = true;
            updateProgress(page, `Page ${page} repeated previous data. Stopping to avoid duplicates.`);
            break;
          }
        }
        seenPageSnapshots.add(snapshot);
      }

      for (const row of pageRows) {
        const cells = getRowCells(row);
        if (!cells.some((cell) => cell.length > 0)) continue;
        const key = getBuyOrderRowKey(row);
        if (seenRowKeys.has(key)) continue;
        seenRowKeys.add(key);
        allRows.push(cells);
      }
      pages += 1;
      setStatus(`Buy orders: exporting page ${page}/${targetPages}...`);
      updateProgress(page, `Exporting page ${page}/${targetPages}...`);

      if (progressModal.isCanceled()) {
        canceled = true;
        updateProgress(page, "Canceled by user.");
        break;
      }
    }

    const liveCurrentPage = getPaginationConfig("bosPagination").currentPage;
    if (currentPage > 0 && currentPage <= maxPages && currentPage !== liveCurrentPage) {
      updateProgress(currentPage, `Restoring page ${currentPage}...`);
      await moveToBuyOrdersPage(currentPage, perPage, maxPages);
    }
  } finally {
    progressModal.close();
  }

  const header = getTableHeader(table);
  const csvRows = header.length > 0 ? [header, ...allRows] : allRows;
  if (csvRows.length > 0) {
    downloadCsv("mannco-profile-buy-orders", csvRows);
  }

  return { canceled, partial, rows: allRows.length, pages, targetPages };
}

async function exportCashouts(): Promise<{ canceled: boolean; partial: boolean; rows: number; pages: number; targetPages: number }> {
  const table = getTableByPaginationId("cashoutPagination");
  if (!(table instanceof HTMLTableElement)) return { canceled: false, partial: false, rows: 0, pages: 0, targetPages: 0 };

  const tbody = table.querySelector<HTMLTableSectionElement>("tbody:last-of-type") ?? table.querySelector<HTMLTableSectionElement>("tbody");
  if (!(tbody instanceof HTMLTableSectionElement)) return { canceled: false, partial: false, rows: 0, pages: 0, targetPages: 0 };

  const tbodyId = tbody.id || "mannco-enhancer-cashout-content";
  if (!tbody.id) tbody.id = tbodyId;

  const { perPage, maxPages, currentPage } = getPaginationConfig("cashoutPagination");
  const scope = await promptPageExportScope("Export cashouts", Math.max(1, maxPages), 30, {
    intro: "Choose how many cashout pages to export. The extension traverses each page and restores your original page at the end.",
    optionTitle: "Export by number of pages",
    startLabel: "Start export",
  });
  if (!scope) return { canceled: true, partial: false, rows: 0, pages: 0, targetPages: 0 };

  const targetPages = scope.pages;
  const allRows: string[][] = [];
  const seenRowKeys = new Set<string>();
  const seenPageSnapshots = new Set<string>();
  let pages = 0;
  let partial = false;
  let canceled = false;

  const progressModal = createExportProgressModal("Cashouts", { kind: "pages", pages: targetPages }, targetPages, maxPages);
  const startedAt = Date.now();
  const updateProgress = (currentPageNumber: number, note: string): void => {
    const avgMs = pages > 0 ? (Date.now() - startedAt) / pages : null;
    const etaMs = avgMs === null ? null : avgMs * Math.max(0, targetPages - pages);
    progressModal.update({ currentPage: currentPageNumber, visitedPages: pages, collectedRows: allRows.length, etaMs, note });
  };

  try {
    for (let page = 1; page <= targetPages; page += 1) {
      if (progressModal.isCanceled()) {
        canceled = true;
        updateProgress(Math.max(1, page - 1), "Canceled by user.");
        break;
      }

      if (page > 1 || currentPage !== page) {
        updateProgress(page, `Loading page ${page}...`);
        const moved = await moveToPaginationPage(tbodyId, "cashoutPagination", page, perPage, maxPages, "tr.cashoutPagination");
        if (!moved) {
          partial = true;
          break;
        }
      }

      const liveTbody = getLiveTbody(tbodyId);
      if (!liveTbody) {
        partial = true;
        break;
      }

      const pageRows = Array.from(liveTbody.querySelectorAll<HTMLTableRowElement>("tr.cashoutPagination.isv"));
      let snapshot = getRowsSnapshotSignature(pageRows);
      if (snapshot.length > 0) {
        if (seenPageSnapshots.has(snapshot)) {
          if (page > 1) {
            updateProgress(page, `Page ${page} repeated data. Retrying...`);
            const retriedMove = await moveToPaginationPage(tbodyId, "cashoutPagination", page, perPage, maxPages, "tr.cashoutPagination");
            if (!retriedMove) {
              partial = true;
              break;
            }
            const retriedTbody = getLiveTbody(tbodyId);
            if (!retriedTbody) {
              partial = true;
              break;
            }
            const retriedRows = Array.from(retriedTbody.querySelectorAll<HTMLTableRowElement>("tr.cashoutPagination.isv"));
            snapshot = getRowsSnapshotSignature(retriedRows);
            if (snapshot.length > 0 && seenPageSnapshots.has(snapshot)) {
              partial = true;
              updateProgress(page, `Page ${page} repeated previous data. Stopping to avoid duplicates.`);
              break;
            }
            pageRows.length = 0;
            pageRows.push(...retriedRows);
          } else {
            partial = true;
            updateProgress(page, `Page ${page} repeated previous data. Stopping to avoid duplicates.`);
            break;
          }
        }
        seenPageSnapshots.add(snapshot);
      }

      for (const row of pageRows) {
        const cells = getRowCells(row);
        if (!cells.some((cell) => cell.length > 0)) continue;
        const key = cells.join("||");
        if (seenRowKeys.has(key)) continue;
        seenRowKeys.add(key);
        allRows.push(cells);
      }
      pages += 1;
      setStatus(`Cashouts: exporting page ${page}/${targetPages}...`);
      updateProgress(page, `Exporting page ${page}/${targetPages}...`);

      if (progressModal.isCanceled()) {
        canceled = true;
        updateProgress(page, "Canceled by user.");
        break;
      }
    }

    const liveCurrentPage = getPaginationConfig("cashoutPagination").currentPage;
    if (currentPage > 0 && currentPage <= maxPages && currentPage !== liveCurrentPage) {
      await moveToPaginationPage(tbodyId, "cashoutPagination", currentPage, perPage, maxPages, "tr.cashoutPagination");
    }
  } finally {
    progressModal.close();
  }

  const header = getTableHeader(table);
  const rows = header.length > 0 ? [header, ...allRows] : allRows;
  if (rows.length > 0) {
    downloadCsv("mannco-profile-cashouts", rows);
  }
  return { canceled, partial, rows: allRows.length, pages, targetPages };
}

async function removeAllBuyOrdersAcrossPages(targetPages: number, maxPages: number, originalPage: number): Promise<{ removed: number; partial: boolean; canceled: boolean }> {
  let removedTotal = 0;
  let partial = false;
  let canceled = false;
  const totalPages = Math.max(1, Math.min(targetPages, maxPages));
  const progressModal = createExportProgressModal(
    "Buy orders",
    { kind: "pages", pages: totalPages },
    totalPages,
    maxPages,
    {
      operationLabel: "removal",
      valueLabel: "Removed orders",
      introText: "Please wait while the extension opens each page and clicks remove on visible buy orders.",
    },
  );
  const startedAt = Date.now();

  const updateProgress = (page: number, visitedPages: number, note: string): void => {
    const avgMs = visitedPages > 0 ? (Date.now() - startedAt) / visitedPages : null;
    const etaMs = avgMs === null ? null : avgMs * Math.max(0, totalPages - visitedPages);
    progressModal.update({ currentPage: page, visitedPages, collectedRows: removedTotal, etaMs, note });
  };

  try {
    if (originalPage !== 1) {
      updateProgress(1, 0, "Preparing first page...");
      const moved = await moveToProfileStatsPage("bosContent", 8, 1, "tr[data-itemid]");
      if (!moved) return { removed: 0, partial: true, canceled: false };
    }

    for (let pass = 1; pass <= 6; pass += 1) {
      if (progressModal.isCanceled()) {
        canceled = true;
        updateProgress(1, 0, "Canceled by user.");
        break;
      }

      let removedInPass = 0;

      for (let page = 1; page <= totalPages; page += 1) {
        if (progressModal.isCanceled()) {
          canceled = true;
          updateProgress(page, page, "Canceled by user.");
          break;
        }

        setStatus(`Removing buy orders: pass ${pass}, page ${page}/${totalPages}...`);
        updateProgress(page, page, `Pass ${pass}: loading page ${page}/${totalPages}...`);

        const moved = await moveToProfileStatsPage("bosContent", 8, page, "tr[data-itemid]");
        if (!moved) {
          partial = true;
          continue;
        }

        const removeButtons = Array.from(
          document.querySelectorAll<HTMLButtonElement>("#bosContent button[onclick*='removeBO'], #bosContent button.text-danger[title='Remove']")
        );

        for (const removeBtn of removeButtons) {
          if (progressModal.isCanceled()) {
            canceled = true;
            updateProgress(page, page, "Canceled by user.");
            break;
          }
          if (!removeBtn.isConnected || removeBtn.disabled) continue;
          removeBtn.click();
          removedTotal += 1;
          removedInPass += 1;
          setStatus(`Removing buy orders (${removedTotal} removed)...`);
          updateProgress(page, page, `Pass ${pass}: removing from page ${page}/${totalPages}...`);
          await sleep(340);
        }

        if (canceled) break;
      }

      if (canceled) break;
      if (removedInPass === 0) break;
    }

    const liveCurrentPage = getPaginationConfig("bosPagination").currentPage;
    if (originalPage > 0 && originalPage <= maxPages && originalPage !== liveCurrentPage) {
      updateProgress(originalPage, totalPages, `Restoring page ${originalPage}...`);
      await moveToProfileStatsPage("bosContent", 8, originalPage, "tr[data-itemid]");
    }
  } finally {
    progressModal.close();
  }

  return { removed: removedTotal, partial, canceled };
}

function createProfileMoneyToggleButton(moneyId: string): HTMLButtonElement {
  const hidden = profileMoneyHiddenById.get(moneyId) !== false;
  const button = document.createElement("button");
  button.type = "button";
  button.className = PROFILE_MONEY_TOGGLE_CLASS;
  button.setAttribute(PROFILE_MONEY_ID_ATTR, moneyId);
  button.title = hidden ? "Show value" : "Hide value";
  button.setAttribute("aria-label", button.title);
  button.innerHTML = `<i class="fas ${hidden ? "fa-eye" : "fa-eye-slash"}" aria-hidden="true"></i>`;
  button.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    toggleProfileMoneyNode(moneyId);
  });
  return button;
}

function toggleProfileMoneyNode(moneyId: string): void {
  const currentHidden = profileMoneyHiddenById.get(moneyId) !== false;
  profileMoneyHiddenById.set(moneyId, !currentHidden);
  applyProfileMoneyMask(true);
}

function wireMoneyWrapToggle(wrap: HTMLSpanElement, moneyId: string): void {
  if (wrap.getAttribute(PROFILE_MONEY_WRAP_WIRED_ATTR) === "true") return;

  wrap.setAttribute(PROFILE_MONEY_WRAP_WIRED_ATTR, "true");
  wrap.setAttribute("tabindex", "0");
  wrap.setAttribute("role", "button");
  wrap.setAttribute("aria-label", "Toggle money visibility");

  wrap.addEventListener("click", (event) => {
    const target = event.target;
    if (target instanceof Element && target.closest(`.${PROFILE_MONEY_TOGGLE_CLASS}`)) return;
    event.preventDefault();
    event.stopPropagation();
    toggleProfileMoneyNode(moneyId);
  });

  wrap.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    event.stopPropagation();
    toggleProfileMoneyNode(moneyId);
  });
}

function ensureMoneyWrap(node: HTMLElement, moneyId: string): HTMLSpanElement {
  const wrapped = node.parentElement;
  if (wrapped instanceof HTMLSpanElement && wrapped.classList.contains(PROFILE_MONEY_WRAP_CLASS)) {
    return wrapped;
  }

  const wrap = document.createElement("span");
  wrap.className = PROFILE_MONEY_WRAP_CLASS;
  wrap.setAttribute(PROFILE_MONEY_ID_ATTR, moneyId);
  node.classList.add(PROFILE_MONEY_TARGET_CLASS);
  node.parentNode?.insertBefore(wrap, node);
  wrap.append(node);
  wrap.append(createProfileMoneyToggleButton(moneyId));
  wireMoneyWrapToggle(wrap, moneyId);
  return wrap;
}

function cleanupProfileMoneyMask(): void {
  document.querySelectorAll<HTMLElement>(`.${PROFILE_MONEY_TOGGLE_CLASS}[data-card-id]`).forEach((node) => node.remove());
  document.querySelectorAll<HTMLElement>(`.${PROFILE_MONEY_LEGACY_INLINE_HEAD_CLASS}`).forEach((node) => node.remove());

  const wraps = document.querySelectorAll<HTMLElement>(`.${PROFILE_MONEY_WRAP_CLASS}`);
  wraps.forEach((wrap) => {
    const target = wrap.querySelector<HTMLElement>(`.${PROFILE_MONEY_TARGET_CLASS}`);
    if (!target) {
      wrap.remove();
      return;
    }

    target.classList.remove(PROFILE_MONEY_TARGET_CLASS);
    wrap.replaceWith(target);
  });
}

function hasNumericValue(text: string): boolean {
  return /\d/.test(text);
}

function applyMoneyNodeState(node: HTMLElement, shouldMask: boolean): void {
  const liveText = node.textContent ?? "";
  const storedText = node.getAttribute(MONEY_ATTR);
  const nextStored = !storedText || (!hasNumericValue(storedText) && hasNumericValue(liveText)) ? liveText : storedText;
  node.setAttribute(MONEY_ATTR, nextStored);

  const moneyId = ensureMoneyNodeId(node);
  const hidden = profileMoneyHiddenById.get(moneyId) !== false;
  if (!profileMoneyHiddenById.has(moneyId)) {
    profileMoneyHiddenById.set(moneyId, true);
  }

  const wrap = ensureMoneyWrap(node, moneyId);
  wireMoneyWrapToggle(wrap, moneyId);
  const existingButton = wrap.querySelector<HTMLButtonElement>(`.${PROFILE_MONEY_TOGGLE_CLASS}[${PROFILE_MONEY_ID_ATTR}='${moneyId}']`);
  const button = existingButton ?? createProfileMoneyToggleButton(moneyId);
  if (!existingButton) wrap.append(button);
  const isHidden = shouldMask ? hidden : false;
  wrap.classList.toggle(PROFILE_MONEY_HIDDEN_CLASS, isHidden);

  button.title = isHidden ? "Show value" : "Hide value";
  button.setAttribute("aria-label", button.title);
  button.innerHTML = `<i class="fas ${isHidden ? "fa-eye" : "fa-eye-slash"}" aria-hidden="true"></i>`;
}

function applyProfileMoneyMask(shouldMask: boolean): void {
  if (!shouldMask) {
    profileMoneyHiddenById.clear();
    cleanupProfileMoneyMask();
    return;
  }

  document.querySelectorAll<HTMLElement>(`.${PROFILE_MONEY_TOGGLE_CLASS}[data-card-id]`).forEach((node) => node.remove());
  document.querySelectorAll<HTMLElement>(`.${PROFILE_MONEY_LEGACY_INLINE_HEAD_CLASS}`).forEach((node) => node.remove());

  ensureProfileMoneyStyles();

  const nodes = getProfileMoneyNodes();
  for (const node of nodes) {
    applyMoneyNodeState(node, true);
  }
}

function ensureActionWrap(head: HTMLElement): HTMLElement {
  const msAuto = head.querySelector<HTMLElement>(":scope > .ms-auto");
  const host = msAuto ?? head;
  const existing = host.querySelector<HTMLElement>(`:scope > .${PROFILE_ACTION_WRAP_CLASS}`);
  if (existing) return existing;

  const wrap = document.createElement("div");
  wrap.className = PROFILE_ACTION_WRAP_CLASS;
  if (msAuto) {
    host.prepend(wrap);
  } else {
    host.append(wrap);
  }
  return wrap;
}

function ensureActionWrapInBody(body: HTMLElement): HTMLElement | null {
  const inlineHead = body.querySelector<HTMLElement>(`:scope > .${PROFILE_ACTION_INLINE_HEAD_CLASS}`);
  if (inlineHead) {
    const existingInHead = inlineHead.querySelector<HTMLElement>(`:scope > .${PROFILE_ACTION_WRAP_CLASS}`);
    if (existingInHead) return existingInHead;
    const wrap = document.createElement("div");
    wrap.className = PROFILE_ACTION_WRAP_CLASS;
    inlineHead.append(wrap);
    return wrap;
  }

  const existing = body.querySelector<HTMLElement>(`:scope > .${PROFILE_ACTION_WRAP_CLASS}`);
  if (existing) return existing;

  const title = body.querySelector<HTMLElement>(":scope > h3");
  if (!title) return null;

  const head = document.createElement("div");
  head.className = PROFILE_ACTION_INLINE_HEAD_CLASS;
  body.insertBefore(head, title);
  head.append(title);

  const wrap = document.createElement("div");
  wrap.className = PROFILE_ACTION_WRAP_CLASS;
  head.append(wrap);
  return wrap;
}

function ensureActionWrapByPaginationId(paginationId: string): HTMLElement | null {
  const pagination = document.getElementById(paginationId);
  if (!(pagination instanceof HTMLElement)) return null;

  const card = pagination.closest(".card");
  if (card instanceof HTMLElement) {
    const cardHead = card.querySelector<HTMLElement>(":scope > .card-body > .card-head");
    if (cardHead) return ensureActionWrap(cardHead);
    const body = card.querySelector<HTMLElement>(":scope > .card-body");
    if (body) return ensureActionWrapInBody(body);
  }

  const body = pagination.closest(".card-body");
  if (body instanceof HTMLElement) {
    return ensureActionWrapInBody(body);
  }

  return null;
}

function getTableByPaginationId(paginationId: string): HTMLTableElement | null {
  const pagination = document.getElementById(paginationId);
  if (!(pagination instanceof HTMLElement)) return null;

  const tableFromNav = pagination.closest(".table-responsive")?.querySelector("table");
  if (tableFromNav instanceof HTMLTableElement) return tableFromNav;

  const card = pagination.closest(".card");
  const tableFromCard = card?.querySelector(".card-body table");
  return tableFromCard instanceof HTMLTableElement ? tableFromCard : null;
}

function ensureActionButton(
  wrap: HTMLElement,
  action: "export-transactions" | "export-buy-orders" | "export-cashouts" | "remove-buy-orders",
  label: string,
  btnClass: string,
): HTMLButtonElement {
  const existing = wrap.querySelector<HTMLButtonElement>(`button.${PROFILE_ACTION_BTN_CLASS}[data-action='${action}']`);
  if (existing) return existing;

  const button = document.createElement("button");
  button.type = "button";
  button.className = `${PROFILE_ACTION_BTN_CLASS} ${btnClass}`;
  button.setAttribute("data-action", action);
  button.innerHTML = `${getActionButtonIconSvg(action)}<span>${label}</span>`;
  wrap.append(button);
  return button;
}

function getActionButtonIconSvg(action: "export-transactions" | "export-buy-orders" | "export-cashouts" | "remove-buy-orders"): string {
  if (action === "remove-buy-orders") {
    return `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" class="mannco-enhancer-btn-icon" aria-hidden="true"><g fill="currentColor"><path d="M19.5 7.5h-15v0c-.28 0-.5.22-.5.5v14 0c0 1.1.89 2 2 2h12v0c1.1 0 2-.9 2-2V8v0c0-.28-.23-.5-.5-.5Zm-9.25 13v0c0 .41-.34.75-.75.75 -.42 0-.75-.34-.75-.75v-9 0c0-.42.33-.75.75-.75 .41 0 .75.33.75.75Zm5 0v0c0 .41-.34.75-.75.75 -.42 0-.75-.34-.75-.75v-9 0c0-.42.33-.75.75-.75 .41 0 .75.33.75.75Z"></path><path d="M22 4h-4.75v0c-.14 0-.25-.12-.25-.25V2.5v0C17 1.11 15.88 0 14.5 0h-5v0C8.11 0 7 1.11 7 2.5v1.25 0c0 .13-.12.25-.25.25H2v0c-.56 0-1 .44-1 1 0 .55.44 1 1 1h20v0c.55 0 1-.45 1-1 0-.56-.45-1-1-1ZM9 3.75V2.5v0c0-.28.22-.5.5-.5h5v0c.27 0 .5.22.5.5v1.25 0c0 .13-.12.25-.25.25h-5.5v0C9.11 4 9 3.88 9 3.75Z"></path></g></svg>`;
  }

  return `<svg viewBox="0 0 24 17" xmlns="http://www.w3.org/2000/svg" class="mannco-enhancer-btn-icon" aria-hidden="true"><path d="m0 10.8976624c0-3.37022796 2.73516502-6.10233756 6.10916205-6.10233756h9.60011175c.2409998 0 .4363688-.19515068.4363688-.43588125v-3.05116879c-.0002401-.52885235.3184491-1.00578323.8074824-1.20842902.4890333-.20264578 1.0521192-.09110519 1.4267254.28261723l5.2364246 5.23057507c.2456865.24525482.383725.57798613.383725.92494002 0 .3469539-.1380385.67968521-.383725.92494003l-5.2364246 5.23057507c-.3743814.3734985-.9370444.4851501-1.4259195.2829514s-.8078229-.6784846-.8082883-1.2070197v-3.05116876c0-.24073057-.195369-.43588125-.4363688-.43588125h-9.60011175c-1.44599873 0-2.61821231 1.17090411-2.61821231 2.61528751s1.17221358 2.6152876 2.61821231 2.6152876c.96399915 0 1.74547487.7806027 1.74547487 1.743525s-.78147572 1.743525-1.74547487 1.743525c-3.37399703 0-6.10916205-2.7321096-6.10916205-6.1023376z" fill="currentColor"></path></svg>`;
}

function cleanupProfileActionButtons(): void {
  document.querySelectorAll<HTMLElement>(`.${PROFILE_ACTION_WRAP_CLASS}`).forEach((node) => node.remove());
  document.querySelectorAll<HTMLElement>(`.${PROFILE_ACTION_INLINE_HEAD_CLASS}`).forEach((head) => {
    const parent = head.parentElement;
    if (!(parent instanceof HTMLElement)) {
      head.remove();
      return;
    }

    while (head.firstChild) {
      parent.insertBefore(head.firstChild, head);
    }
    head.remove();
  });
  document.getElementById(PROFILE_EXPORT_MODAL_ID)?.remove();
  document.getElementById(PROFILE_EXPORT_MODAL_BACKDROP_ID)?.remove();
  document.getElementById(PROFILE_EXPORT_PROGRESS_MODAL_ID)?.remove();
  document.getElementById(PROFILE_EXPORT_PROGRESS_BACKDROP_ID)?.remove();
}

function isAriaLiveSpamNode(node: Node | null): node is HTMLElement {
  if (!(node instanceof HTMLElement)) return false;
  if (!node.classList.contains(PROFILE_ARIA_HELPER_CLASS)) return false;

  const role = (node.getAttribute("role") || "").toLowerCase();
  const ariaLive = (node.getAttribute("aria-live") || "").toLowerCase();
  const ariaRelevant = (node.getAttribute("aria-relevant") || "").toLowerCase();

  return role === "log" && ariaLive === "assertive" && ariaRelevant === "additions";
}

function cleanupAriaLiveSpamNodes(root: ParentNode = document): void {
  const helpers = Array.from(root.querySelectorAll<HTMLElement>(`.${PROFILE_ARIA_HELPER_CLASS}[role='log'][aria-live='assertive'][aria-relevant='additions']`));
  if (helpers.length <= 1) return;

  for (let i = 1; i < helpers.length; i += 1) {
    helpers[i]?.remove();
  }
}

function scheduleAriaLiveSpamCleanup(): void {
  if (profileAriaLiveCleanupPending) return;
  profileAriaLiveCleanupPending = true;

  window.setTimeout(() => {
    profileAriaLiveCleanupPending = false;
    cleanupAriaLiveSpamNodes();
  }, 0);
}

function startAriaLiveSpamObserver(): void {
  if (profileAriaLiveObserver) return;

  profileAriaLiveObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (isAriaLiveSpamNode(mutation.target)) {
        scheduleAriaLiveSpamCleanup();
        return;
      }

      for (const addedNode of Array.from(mutation.addedNodes)) {
        if (!(addedNode instanceof Element)) continue;
        if (isAriaLiveSpamNode(addedNode)) {
          scheduleAriaLiveSpamCleanup();
          return;
        }
        if (addedNode.querySelector(`.${PROFILE_ARIA_HELPER_CLASS}[role='log'][aria-live='assertive'][aria-relevant='additions']`)) {
          scheduleAriaLiveSpamCleanup();
          return;
        }
      }
    }
  });

  profileAriaLiveObserver.observe(document.documentElement, {
    subtree: true,
    childList: true
  });
}

function stopAriaLiveSpamObserver(): void {
  profileAriaLiveObserver?.disconnect();
  profileAriaLiveObserver = null;
  profileAriaLiveCleanupPending = false;
}

function applyProfileAriaLiveSpamFix(enabled: boolean): void {
  if (!enabled) {
    stopAriaLiveSpamObserver();
    return;
  }

  cleanupAriaLiveSpamNodes();
  startAriaLiveSpamObserver();
}

function setStatus(text: string, tone: StatusTone = "idle"): void {
  const statusNode = document.getElementById(TOOLBAR_STATUS_ID);
  if (!(statusNode instanceof HTMLElement)) {
    if (tone === "warn") console.warn(`[Mannco Enhancer] ${text}`);
    return;
  }

  statusNode.textContent = text;
  if (tone === "ok") statusNode.style.color = "#7fdf9a";
  else if (tone === "warn") statusNode.style.color = "#f0b274";
  else statusNode.style.color = "#9eb2c7";
}

function wireActionButton(button: HTMLButtonElement): void {
  if (button.dataset.manncoEnhancerProfileWired === "true") return;
  const action = button.getAttribute("data-action");
  if (!action) return;

  if (action === "export-transactions") {
    button.addEventListener("click", async () => {
      if (button.disabled) return;

      button.disabled = true;
      const labelNode = button.querySelector<HTMLElement>("span");
      const originalLabel = labelNode?.textContent ?? "Export";
      if (labelNode) labelNode.textContent = "Exporting...";
      else button.textContent = "Exporting...";

      const result = await exportPaginatedTransactions("transacContent", "TransacPagination", "mannco-profile-transactions", "Transactions");

      button.disabled = false;
      if (labelNode) labelNode.textContent = originalLabel;
      else button.textContent = originalLabel;

      if (result.canceled) {
        if (result.exportedRows > 0) {
          setStatus(`Transactions export canceled. Saved partial file with ${result.exportedRows} rows.`, "warn");
          return;
        }
        setStatus("Transactions export canceled.");
        return;
      }

      if (result.exportedRows <= 0) {
        setStatus("No transaction rows available to export.", "warn");
        return;
      }

      if (result.partial) {
        setStatus(`Transactions partially exported (${result.exportedRows} rows, visited ${result.visitedPages}/${result.targetPages} pages).`, "warn");
        return;
      }

      if (result.scope.kind === "days") {
        setStatus(`Transactions exported (${result.exportedRows} rows from last ${result.scope.days} days, scanned ${result.visitedPages} pages).`, "ok");
        return;
      }

      setStatus(`Transactions exported (${result.exportedRows} rows from ${result.visitedPages}/${result.maxPages} pages).`, "ok");
    });
  }

  if (action === "export-buy-orders") {
    button.addEventListener("click", async () => {
      if (button.disabled) return;
      button.disabled = true;
      const labelNode = button.querySelector<HTMLElement>("span");
      const originalLabel = labelNode?.textContent ?? "Export";
      if (labelNode) labelNode.textContent = "Exporting...";
      else button.textContent = "Exporting...";

      const result = await exportPaginatedBuyOrders();

      button.disabled = false;
      if (labelNode) labelNode.textContent = originalLabel;
      else button.textContent = originalLabel;

      if (result.canceled) {
        if (result.rows > 0) {
          setStatus(`Buy orders export canceled. Saved partial file with ${result.rows} rows.`, "warn");
          return;
        }
        setStatus("Buy orders export canceled.");
        return;
      }

      if (result.rows <= 0) {
        setStatus("No buy-order rows available to export.", "warn");
        return;
      }

      if (result.partial) {
        setStatus(`Buy orders partially exported (${result.rows} rows from ${result.pages}/${result.targetPages} pages).`, "warn");
        return;
      }

      setStatus(`Buy orders exported (${result.rows} rows from ${result.pages} pages).`, "ok");
    });
  }

  if (action === "export-cashouts") {
    button.addEventListener("click", async () => {
      if (button.disabled) return;
      button.disabled = true;
      const labelNode = button.querySelector<HTMLElement>("span");
      const originalLabel = labelNode?.textContent ?? "Export";
      if (labelNode) labelNode.textContent = "Exporting...";
      else button.textContent = "Exporting...";

      const result = await exportCashouts();

      button.disabled = false;
      if (labelNode) labelNode.textContent = originalLabel;
      else button.textContent = originalLabel;

      if (result.canceled) {
        if (result.rows > 0) {
          setStatus(`Cashouts export canceled. Saved partial file with ${result.rows} rows.`, "warn");
          return;
        }
        setStatus("Cashouts export canceled.");
        return;
      }

      if (result.rows <= 0) {
        setStatus("No cashout rows available to export.", "warn");
        return;
      }

      if (result.partial) {
        setStatus(`Cashouts partially exported (${result.rows} rows from ${result.pages}/${result.targetPages} pages).`, "warn");
        return;
      }

      setStatus(`Cashouts exported (${result.rows} rows from ${result.pages} pages).`, "ok");
    });
  }

  if (action === "remove-buy-orders") {
    button.addEventListener("click", async () => {
      if (!canRunWithCooldown("profile-remove-buy-orders", 1500)) {
        setStatus("Please wait a moment before running this again.", "warn");
        return;
      }

      const { maxPages, currentPage } = getPaginationConfig("bosPagination");
      const scope = await promptPageExportScope("Remove buy orders", Math.max(1, maxPages), Math.max(1, maxPages), {
        intro: "Choose how many pages to scan for buy-order removals. This action cannot be undone.",
        optionTitle: "Remove across number of pages",
        startLabel: "Start removal",
      });
      if (!scope) {
        setStatus("Bulk removal canceled.");
        return;
      }

      button.disabled = true;
      setStatus("Removing buy orders across pages...");
      const result = await removeAllBuyOrdersAcrossPages(scope.pages, Math.max(1, maxPages), currentPage);

      button.disabled = false;
      if (result.canceled) {
        if (result.removed > 0) {
          setStatus(`Removal canceled. Removed ${result.removed} buy orders so far.`, "warn");
          return;
        }
        setStatus("Buy-order removal canceled.");
        return;
      }
      if (result.removed <= 0) {
        setStatus("No removable buy orders found.", "warn");
        return;
      }
      if (result.partial) {
        setStatus(`Finished with warnings (${result.removed} buy orders removed).`, "warn");
        return;
      }
      setStatus(`Finished removing buy orders (${result.removed} removed).`, "ok");
    });
  }

  button.dataset.manncoEnhancerProfileWired = "true";
}

function ensureProfileActionButtons(settings: Settings): void {
  ensureProfileActionStyles();

  const txWrap = ensureActionWrapByPaginationId("TransacPagination");
  if (txWrap && settings.profileExportTransactions) {
    wireActionButton(ensureActionButton(txWrap, "export-transactions", "Export", "btn btn-secondary btn-sm"));
  }

  const cashoutWrap = ensureActionWrapByPaginationId("cashoutPagination");
  if (cashoutWrap && settings.profileExportCashouts) {
    wireActionButton(ensureActionButton(cashoutWrap, "export-cashouts", "Export", "btn btn-secondary btn-sm"));
  }

  const boWrap = ensureActionWrapByPaginationId("bosPagination");
  if (boWrap) {
    if (settings.profileExportBuyOrders) {
      wireActionButton(ensureActionButton(boWrap, "export-buy-orders", "Export", "btn btn-secondary btn-sm"));
    }
    if (settings.profileRemoveAllBuyOrders) {
      wireActionButton(ensureActionButton(boWrap, "remove-buy-orders", "Remove all", "btn btn-danger btn-sm"));
    }
  }
}

export const profileModule: ContentModule = {
  id: "profile-module",
  routes: ["profile"],
  apply(_context, settings) {
    applyProfileMoneyMask(false);
    applyProfileAriaLiveSpamFix(settings.enabled && settings.profileFixXError);
    if (!settings.enabled) {
      cleanupProfileActionButtons();
      return;
    }

    ensureProfileActionButtons(settings);
  }
};
