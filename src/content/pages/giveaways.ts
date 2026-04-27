import type { ContentModule } from "../types";
import { normalizeLocalizedPath } from "../shared/page-context";
import { canRunWithCooldown, parseMoney } from "../shared/safety";

const ROOT_CLASS = "mannco-enhancer-giveaways-on";
const STYLE_ID = "mannco-enhancer-giveaways-style";
const LIST_ENHANCED_CLASS = "mannco-enhancer-giveaways-list-item";
const LIST_BUTTON_CLASS = "mannco-enhancer-giveaways-quick-btn";
const LIST_BUTTON_WRAP_CLASS = "mannco-enhancer-giveaways-quick-wrap";
const LIST_BADGE_CLASS = "mannco-enhancer-giveaways-joined-badge";
const LIST_JOINED_CLASS = "mannco-enhancer-giveaways-joined";
const LIST_MISSING_CLASS = "mannco-enhancer-giveaways-missing";
const DETAIL_QUICK_ROW_ID = "mannco-enhancer-giveaways-detail-quick-row";
const DETAIL_CHANCE_ROW_ID = "mannco-enhancer-giveaways-detail-chance-row";

type JsonRecord = Record<string, unknown>;

type GiveawayDetailsData = {
  entries: number | null;
  maxEntries: number | null;
  winners: number;
};

let joinedRafflesCache: Set<string> | null = null;
let joinedRafflesInflight: Promise<Set<string>> | null = null;
let detailsInflightById = new Map<string, Promise<GiveawayDetailsData | null>>();

function cleanupUi(): void {
  document.documentElement.classList.remove(ROOT_CLASS);
  document.getElementById(STYLE_ID)?.remove();

  const listButtons = document.querySelectorAll<HTMLElement>(`.${LIST_BUTTON_CLASS}`);
  Array.from(listButtons).forEach((button) => button.remove());

  const listWraps = document.querySelectorAll<HTMLElement>(`.${LIST_BUTTON_WRAP_CLASS}`);
  Array.from(listWraps).forEach((wrap) => wrap.remove());

  const listBadges = document.querySelectorAll<HTMLElement>(`.${LIST_BADGE_CLASS}`);
  Array.from(listBadges).forEach((badge) => badge.remove());

  const cards = document.querySelectorAll<HTMLElement>("a.raffle-list__item");
  for (const card of Array.from(cards)) {
    card.classList.remove(LIST_ENHANCED_CLASS, LIST_JOINED_CLASS, LIST_MISSING_CLASS);
    delete card.dataset.manncoEnhancerJoined;
    delete card.dataset.manncoEnhancerGiveawayId;
  }

  document.getElementById(DETAIL_QUICK_ROW_ID)?.remove();
  document.getElementById(DETAIL_CHANCE_ROW_ID)?.remove();
}

function ensureStyles(): void {
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    .${ROOT_CLASS} .container-xxxl .raffle-list.list-group.rfl {
      border-radius: 16px;
      overflow: hidden;
      border: 1px solid rgba(109, 130, 144, 0.28);
      box-shadow: 0 18px 34px rgba(4, 8, 14, 0.34);
    }

    .${ROOT_CLASS} .container-xxxl .raffle-list.list-group.rfl > a.raffle-list__item.${LIST_ENHANCED_CLASS} {
      position: relative;
      transition: background-color .2s ease, box-shadow .2s ease, border-color .2s ease;
      border-left: none !important;
      border-color: rgba(109, 130, 144, 0.24);
      display: grid;
      grid-template-columns: minmax(280px, 1fr) auto auto;
      align-items: center;
      column-gap: 12px;
      padding-right: 14px;
    }

    .${ROOT_CLASS} .container-xxxl .raffle-list.list-group.rfl > a.raffle-list__item.${LIST_ENHANCED_CLASS}:hover {
      background: rgba(51, 66, 76, 0.72);
      box-shadow: inset 0 0 0 1px rgba(112, 138, 156, 0.26);
    }

    .${ROOT_CLASS} .container-xxxl .raffle-list.list-group.rfl > a.raffle-list__item .raffle-time,
    .${ROOT_CLASS} .container-xxxl .raffle-list.list-group.rfl > a.raffle-list__item .raffle-author {
      opacity: 0.95;
    }

    .${ROOT_CLASS} .container-xxxl .raffle-list.list-group.rfl > a.raffle-list__item.${LIST_ENHANCED_CLASS} .raffle-list__item-info {
      min-width: 0;
    }

    .${ROOT_CLASS} .container-xxxl .raffle-list.list-group.rfl > a.raffle-list__item.${LIST_ENHANCED_CLASS} .raffle-list__item-goods {
      justify-content: flex-end;
      flex-wrap: nowrap;
      min-width: 160px;
      max-width: 520px;
      overflow: hidden;
      margin-right: 0;
    }

    .${ROOT_CLASS} .container-xxxl .raffle-list.list-group.rfl > a.raffle-list__item.${LIST_ENHANCED_CLASS} .raffle-name {
      max-width: 100%;
      padding-right: 8px;
      line-height: 1.2;
    }

    .${ROOT_CLASS} .container-xxxl .raffle-list.list-group.rfl > a.raffle-list__item.${LIST_ENHANCED_CLASS}.${LIST_JOINED_CLASS} {
      background: linear-gradient(90deg, rgba(70, 104, 85, 0.28) 0%, rgba(49, 60, 67, 0.72) 58%);
      box-shadow: inset 4px 0 0 #5abb79;
    }

    .${ROOT_CLASS} .container-xxxl .raffle-list.list-group.rfl > a.raffle-list__item.${LIST_ENHANCED_CLASS}.${LIST_MISSING_CLASS} {
      box-shadow: inset 4px 0 0 #73879b;
    }

    .${LIST_BUTTON_WRAP_CLASS} {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      width: 154px;
      min-height: 64px;
      padding-left: 10px;
      border-left: 1px solid rgba(99, 120, 135, 0.22);
    }

    .${LIST_BUTTON_CLASS} {
      position: static;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 132px;
      min-height: 40px;
      border: 1px solid var(--bs-btn-border-color);
      background: var(--bs-btn-bg);
      color: var(--bs-btn-color, #fff);
      border-radius: 12px;
      font-size: 13px;
      font-weight: 700;
      line-height: 1.1;
      letter-spacing: .01em;
      padding: 10px 14px;
      text-align: center;
      white-space: nowrap;
      cursor: pointer;
      box-shadow: 0 10px 18px rgba(7, 13, 18, 0.34);
      transition: transform .18s ease, box-shadow .18s ease, background-color .18s ease, border-color .18s ease, color .18s ease;
    }

    .${ROOT_CLASS} .${LIST_BUTTON_CLASS}.btn.btn-primary,
    .${ROOT_CLASS} .${LIST_BUTTON_CLASS}.btn.btn-secondary,
    .${LIST_BUTTON_CLASS}.btn.btn-primary,
    .${LIST_BUTTON_CLASS}.btn.btn-secondary {
      display: flex !important;
      justify-content: center !important;
      align-items: center !important;
      text-align: center !important;
      padding-left: 0 !important;
      padding-right: 0 !important;
      line-height: 1 !important;
    }

    .${ROOT_CLASS} .${LIST_BUTTON_CLASS}.btn.btn-primary > *,
    .${ROOT_CLASS} .${LIST_BUTTON_CLASS}.btn.btn-secondary > * {
      margin: 0 auto !important;
    }

    .mannco-enhancer-giveaways-quick-btn {
      display: flex !important;
      justify-content: center !important;
    }

    .${ROOT_CLASS} .${LIST_BUTTON_CLASS}.btn-primary {
      --bs-btn-border-color: var(--bs-primary-400);
      --bs-btn-bg: var(--bs-primary-500);
      --bs-btn-disabled-bg: var(--bs-primary-800);
      --bs-btn-disabled-border-color: var(--bs-primary-700);
      --bs-btn-disabled-color: var(--bs-primary-200);
    }

    .${ROOT_CLASS} .${LIST_BUTTON_CLASS}.btn-secondary {
      --bs-btn-bg: #42486b;
      --bs-btn-border-color: #555e8b;
      --bs-btn-active-bg: #495b7e;
      --bs-btn-active-border-color: var(--bs-primary);
      --bs-btn-active-color: var(--bs-primary);
      --bs-btn-hover-bg: #4c537b;
      --bs-btn-hover-border-color: #5f689b;
    }

    .${LIST_BUTTON_CLASS}:hover {
      transform: translateY(-2px);
      background: var(--bs-btn-hover-bg, var(--bs-btn-bg));
      border-color: var(--bs-btn-hover-border-color, var(--bs-btn-border-color));
      color: var(--bs-btn-hover-color, var(--bs-btn-color, #fff));
      box-shadow: 0 14px 24px rgba(7, 13, 18, 0.4);
    }

    .${LIST_BUTTON_CLASS}:active {
      transform: translateY(0);
      background: var(--bs-btn-active-bg, var(--bs-btn-bg));
      border-color: var(--bs-btn-active-border-color, var(--bs-btn-border-color));
      color: var(--bs-btn-active-color, var(--bs-btn-color, #fff));
      box-shadow: 0 7px 14px rgba(7, 13, 18, 0.32);
    }

    .${LIST_BUTTON_CLASS}:disabled {
      background: var(--bs-btn-disabled-bg, var(--bs-btn-bg));
      border-color: var(--bs-btn-disabled-border-color, var(--bs-btn-border-color));
      color: var(--bs-btn-disabled-color, var(--bs-btn-color, #fff));
    }

    .${LIST_BUTTON_CLASS}[data-pending="true"] {
      opacity: 0.7;
      cursor: wait;
    }

    .${LIST_BADGE_CLASS} {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 9px;
      height: 9px;
      border-radius: 999px;
      margin-left: 8px;
      background: #6e7e8e;
      vertical-align: middle;
      box-shadow: 0 0 0 2px rgba(15, 26, 36, 0.65);
    }

    .${LIST_BADGE_CLASS}[data-state="joined"] {
      background: #58c77a;
    }

    #${DETAIL_QUICK_ROW_ID} button {
      width: 132px;
      min-height: 40px;
      border: 1px solid var(--bs-btn-border-color);
      background: var(--bs-btn-bg);
      color: var(--bs-btn-color, #fff);
      border-radius: 12px;
      font-size: 13px;
      font-weight: 700;
      line-height: 1.1;
      letter-spacing: .01em;
      padding: 10px 14px;
      cursor: pointer;
      box-shadow: 0 10px 18px rgba(7, 13, 18, 0.34);
      transition: transform .18s ease, box-shadow .18s ease, background-color .18s ease, border-color .18s ease, color .18s ease;
    }

    #${DETAIL_QUICK_ROW_ID} button:hover {
      transform: translateY(-2px);
      background: var(--bs-btn-hover-bg, var(--bs-btn-bg));
      border-color: var(--bs-btn-hover-border-color, var(--bs-btn-border-color));
      color: var(--bs-btn-hover-color, var(--bs-btn-color, #fff));
      box-shadow: 0 14px 24px rgba(7, 13, 18, 0.4);
    }

    #${DETAIL_QUICK_ROW_ID} button:active {
      transform: translateY(0);
      background: var(--bs-btn-active-bg, var(--bs-btn-bg));
      border-color: var(--bs-btn-active-border-color, var(--bs-btn-border-color));
      color: var(--bs-btn-active-color, var(--bs-btn-color, #fff));
      box-shadow: 0 7px 14px rgba(7, 13, 18, 0.32);
    }

    #${DETAIL_QUICK_ROW_ID} button:disabled {
      background: var(--bs-btn-disabled-bg, var(--bs-btn-bg));
      border-color: var(--bs-btn-disabled-border-color, var(--bs-btn-border-color));
      color: var(--bs-btn-disabled-color, var(--bs-btn-color, #fff));
    }

    #${DETAIL_QUICK_ROW_ID} button[data-pending="true"] {
      opacity: 0.7;
      cursor: wait;
    }

    .${ROOT_CLASS} .card {
      border-color: rgba(114, 128, 151, 0.28);
      box-shadow: 0 12px 26px rgba(6, 9, 15, 0.24);
    }

    .${ROOT_CLASS} .table.table-crop-value tbody tr th,
    .${ROOT_CLASS} .table.table-crop-value tbody tr td {
      border: none;
      background: rgba(56, 53, 71, 0.32);
      padding-top: 11px;
      padding-bottom: 11px;
    }

    .${ROOT_CLASS} .table.table-crop-value tbody tr th {
      border-top-left-radius: 10px;
      border-bottom-left-radius: 10px;
      color: #f2be8a;
      font-weight: 700;
    }

    .${ROOT_CLASS} .table.table-crop-value tbody tr td {
      border-top-right-radius: 10px;
      border-bottom-right-radius: 10px;
      color: #dbe6ef;
      font-weight: 600;
    }

    .${ROOT_CLASS} #${DETAIL_CHANCE_ROW_ID} td {
      font-variant-numeric: tabular-nums;
    }

    @media (max-width: 991px) {
      .${ROOT_CLASS} .container-xxxl .raffle-list.list-group.rfl > a.raffle-list__item.${LIST_ENHANCED_CLASS} {
        grid-template-columns: minmax(180px, 1fr) auto;
        row-gap: 8px;
      }

      .${ROOT_CLASS} .container-xxxl .raffle-list.list-group.rfl > a.raffle-list__item.${LIST_ENHANCED_CLASS} .raffle-list__item-goods {
        grid-column: 1 / -1;
        max-width: 100%;
        justify-content: flex-start;
      }

      .${LIST_BUTTON_WRAP_CLASS} {
        width: auto;
        min-height: 0;
        border-left: none;
        padding-left: 0;
      }

      .${LIST_BUTTON_CLASS} {
        width: 116px;
        min-height: 36px;
        font-size: 12px;
        padding: 8px 10px;
      }

      #${DETAIL_QUICK_ROW_ID} button {
        width: 116px;
        min-height: 36px;
        font-size: 12px;
        padding: 8px 10px;
      }
    }
  `;

  document.head.appendChild(style);
}

function asRecord(value: unknown): JsonRecord | null {
  if (!value || typeof value !== "object") return null;
  return value as JsonRecord;
}

function parsePositiveNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) return value;
  if (typeof value === "string") {
    const parsedMoney = parseMoney(value);
    if (typeof parsedMoney === "number" && Number.isFinite(parsedMoney) && parsedMoney > 0) return parsedMoney;

    const digitsOnly = value.replace(/[^\d]/g, "");
    if (!digitsOnly) return null;
    const parsedInt = Number(digitsOnly);
    return Number.isFinite(parsedInt) && parsedInt > 0 ? parsedInt : null;
  }
  return null;
}

function getRaffleIdFromHref(href: string): string | null {
  const match = href.match(/\/giveaways\/details\/([^/?#]+)/i);
  return match?.[1] ?? null;
}

function getCurrentDetailRaffleId(): string | null {
  const fromPath = getRaffleIdFromHref(window.location.href);
  if (fromPath) return fromPath;

  const fromCell = document.querySelector<HTMLElement>(".raffleurl")?.textContent?.trim() || "";
  return fromCell || null;
}

function isDetailPage(): boolean {
  if (/\/giveaways\/details\//i.test(normalizeLocalizedPath(window.location.pathname))) return true;
  return Boolean(document.querySelector(".raffleurl") && document.querySelector(".rafflenumber"));
}

function listCards(): HTMLAnchorElement[] {
  const cards = Array.from(document.querySelectorAll<HTMLAnchorElement>("a.raffle-list__item"));
  return cards.filter((card) => Boolean(getRaffleIdFromHref(card.href)));
}

async function fetchJoinedRaffles(): Promise<Set<string>> {
  if (joinedRafflesCache) return joinedRafflesCache;
  if (joinedRafflesInflight) return joinedRafflesInflight;

  joinedRafflesInflight = fetch("/requests/raffle.php?mode=getJoined", { credentials: "include" })
    .then((response) => response.text())
    .then((raw) => {
      const ids = raw
        .split(",")
        .map((part) => part.trim())
        .filter((part) => part.length > 0);
      joinedRafflesCache = new Set(ids);
      return joinedRafflesCache;
    })
    .catch(() => {
      if (!joinedRafflesCache) joinedRafflesCache = new Set<string>();
      return joinedRafflesCache;
    })
    .finally(() => {
      joinedRafflesInflight = null;
    });

  return joinedRafflesInflight;
}

async function raffleAction(mode: "join" | "leave", raffleId: string): Promise<boolean> {
  const response = await fetch(`/requests/raffle.php?mode=${mode}&url=${encodeURIComponent(raffleId)}`, {
    method: "GET",
    credentials: "include"
  });
  const text = await response.text();
  return text.toLowerCase().includes("ok");
}

function updateCardJoinedState(card: HTMLElement, isJoined: boolean): void {
  card.dataset.manncoEnhancerJoined = isJoined ? "1" : "0";
  card.classList.toggle(LIST_JOINED_CLASS, isJoined);
  card.classList.toggle(LIST_MISSING_CLASS, !isJoined);

  let badge = card.querySelector<HTMLElement>(`.${LIST_BADGE_CLASS}`);
  const titleNode = card.querySelector<HTMLElement>("h5.raffle-name, .raffle-list__title");
  if (!badge) {
    badge = document.createElement("span");
    badge.className = LIST_BADGE_CLASS;
    badge.title = "Joined status";
    if (titleNode) titleNode.appendChild(badge);
  }
  if (badge) badge.dataset.state = isJoined ? "joined" : "not-joined";

  const quickButton = card.querySelector<HTMLButtonElement>(`.${LIST_BUTTON_CLASS}`);
  if (quickButton) {
    applyQuickButtonState(quickButton, isJoined);
    quickButton.setAttribute("aria-label", isJoined ? "Leave giveaway" : "Join giveaway");
  }
}

function applyQuickButtonState(button: HTMLButtonElement, isJoined: boolean): void {
  button.style.setProperty("display", "flex", "important");
  button.style.setProperty("justify-content", "center", "important");
  button.style.setProperty("align-items", "center", "important");
  button.textContent = isJoined ? "Quick Leave" : "Quick Join";
  button.dataset.state = isJoined ? "joined" : "not-joined";
  button.classList.toggle("btn-primary", !isJoined);
  button.classList.toggle("btn-secondary", isJoined);
}

function ensureQuickButton(card: HTMLAnchorElement, raffleId: string): HTMLButtonElement {
  card.classList.add(LIST_ENHANCED_CLASS);

  let button = card.querySelector<HTMLButtonElement>(`.${LIST_BUTTON_CLASS}`);
  if (button) return button;

  let wrap = card.querySelector<HTMLElement>(`.${LIST_BUTTON_WRAP_CLASS}`);
  if (!wrap) {
    wrap = document.createElement("div");
    wrap.className = LIST_BUTTON_WRAP_CLASS;
    card.appendChild(wrap);
  }

  button = document.createElement("button");
  button.type = "button";
  button.className = `${LIST_BUTTON_CLASS} btn btn-primary`;
  button.dataset.raffleId = raffleId;
  applyQuickButtonState(button, false);
  button.addEventListener("click", async (event) => {
    event.preventDefault();
    event.stopPropagation();

    const target = event.currentTarget;
    if (!(target instanceof HTMLButtonElement)) return;
    if (target.dataset.pending === "true") return;

    const id = target.dataset.raffleId || "";
    if (!id) return;

    if (!canRunWithCooldown(`giveaways-action-${id}`, 900)) return;

    const parentCard = target.closest<HTMLAnchorElement>("a.raffle-list__item");
    if (!parentCard) return;

    const currentlyJoined = parentCard.dataset.manncoEnhancerJoined === "1";
    const nextMode = currentlyJoined ? "leave" : "join";

    target.dataset.pending = "true";
    target.disabled = true;

    const optimisticJoined = nextMode === "join";
    updateCardJoinedState(parentCard, optimisticJoined);

    try {
      const ok = await raffleAction(nextMode, id);
      if (!ok) {
        updateCardJoinedState(parentCard, currentlyJoined);
      } else {
        const joined = joinedRafflesCache ?? new Set<string>();
        if (optimisticJoined) joined.add(id);
        else joined.delete(id);
        joinedRafflesCache = joined;
      }
    } catch {
      updateCardJoinedState(parentCard, currentlyJoined);
    } finally {
      target.disabled = false;
      target.dataset.pending = "false";
      void refreshDetailRows();
    }
  });

  wrap.appendChild(button);
  return button;
}

function parseEntriesFromTableText(text: string): { entries: number | null; maxEntries: number | null } {
  const match = text.match(/([\d.,]+)\s*\/\s*([\d.,]+)/);
  if (!match) return { entries: null, maxEntries: null };

  const entries = parsePositiveNumber(match[1]);
  const maxEntries = parsePositiveNumber(match[2]);
  return {
    entries: entries ? Math.floor(entries) : null,
    maxEntries: maxEntries ? Math.floor(maxEntries) : null
  };
}

function winnersFromDom(): number {
  const distribution = (document.querySelector<HTMLElement>(".distres")?.textContent || "").toLowerCase();
  if (!distribution.includes("multiple")) return 1;

  const itemCount = document.querySelectorAll(".raffleitems > li").length;
  return itemCount > 1 ? itemCount : 1;
}

async function fetchDetailsForRaffle(raffleId: string): Promise<GiveawayDetailsData | null> {
  const existing = detailsInflightById.get(raffleId);
  if (existing) return existing;

  const inflight = fetch(`/requests/raffle.php?mode=details&url=${encodeURIComponent(raffleId)}`, {
    method: "GET",
    credentials: "include"
  })
    .then((response) => response.text())
    .then((raw) => {
      const parsed = JSON.parse(raw) as unknown;
      const data = asRecord(parsed);
      if (!data) return null;

      const entriesDirect = parsePositiveNumber(data.nbusers) ?? parsePositiveNumber(data.entriesNow);
      const maxEntriesDirect = parsePositiveNumber(data.entries);
      const winnersDirect = parsePositiveNumber(data.winners) ?? parsePositiveNumber(data.nbWinners);
      const winners = winnersDirect ? Math.max(1, Math.floor(winnersDirect)) : winnersFromDom();

      return {
        entries: entriesDirect ? Math.floor(entriesDirect) : null,
        maxEntries: maxEntriesDirect ? Math.floor(maxEntriesDirect) : null,
        winners
      };
    })
    .catch(() => null)
    .finally(() => {
      detailsInflightById.delete(raffleId);
    });

  detailsInflightById.set(raffleId, inflight);
  return inflight;
}

function ensureInfoRow(rowId: string, label: string): HTMLTableRowElement | null {
  const tableBody = document.querySelector<HTMLTableSectionElement>(".table.table-crop-value tbody, table.table-crop-value tbody");
  if (!tableBody) return null;

  const existing = document.getElementById(rowId);
  if (existing instanceof HTMLTableRowElement) return existing;

  const row = document.createElement("tr");
  row.id = rowId;

  const th = document.createElement("th");
  th.scope = "row";
  th.textContent = label;

  const td = document.createElement("td");
  row.appendChild(th);
  row.appendChild(td);
  tableBody.appendChild(row);
  return row;
}

async function refreshDetailRows(): Promise<void> {
  if (!isDetailPage()) return;

  const raffleId = getCurrentDetailRaffleId();
  if (!raffleId) return;

  const quickRow = ensureInfoRow(DETAIL_QUICK_ROW_ID, "Quick Join");
  const chanceRow = ensureInfoRow(DETAIL_CHANCE_ROW_ID, "Win chance");
  if (!quickRow || !chanceRow) return;

  const quickCell = quickRow.querySelector("td");
  const chanceCell = chanceRow.querySelector("td");
  if (!quickCell || !chanceCell) return;

  let quickButton = quickCell.querySelector<HTMLButtonElement>("button");
  if (!quickButton) {
      quickButton = document.createElement("button");
      quickButton.type = "button";
      quickButton.className = `${LIST_BUTTON_CLASS} btn btn-primary`;
      quickButton.addEventListener("click", async () => {
      if (!quickButton) return;
      if (quickButton.dataset.pending === "true") return;
      if (!canRunWithCooldown(`giveaways-detail-action-${raffleId}`, 900)) return;

      const currentlyJoined = quickButton.dataset.state === "joined";
      const nextMode = currentlyJoined ? "leave" : "join";

        quickButton.dataset.pending = "true";
        quickButton.disabled = true;

        const optimisticJoined = nextMode === "join";
        applyQuickButtonState(quickButton, optimisticJoined);

        try {
          const ok = await raffleAction(nextMode, raffleId);
          if (!ok) {
            applyQuickButtonState(quickButton, currentlyJoined);
          } else {
          const joined = joinedRafflesCache ?? new Set<string>();
          if (optimisticJoined) joined.add(raffleId);
          else joined.delete(raffleId);
          joinedRafflesCache = joined;
        }
        } catch {
          applyQuickButtonState(quickButton, currentlyJoined);
        } finally {
        quickButton.disabled = false;
        quickButton.dataset.pending = "false";
        void refreshDetailRows();
      }
    });
    quickCell.appendChild(quickButton);
  }

  const entriesFromDomText = document.querySelector<HTMLElement>(".rafflenumber")?.textContent || "";
  const entriesFromDom = parseEntriesFromTableText(entriesFromDomText);
  const joinedSet = await fetchJoinedRaffles();
  const details = await fetchDetailsForRaffle(raffleId);

  const isJoined = joinedSet.has(raffleId);
  applyQuickButtonState(quickButton, isJoined);

  const entriesNow = entriesFromDom.entries ?? details?.entries ?? null;
  const maxEntries = entriesFromDom.maxEntries ?? details?.maxEntries ?? null;
  const winners = details?.winners ?? winnersFromDom();

  if (entriesNow === null || entriesNow <= 0) {
    chanceCell.textContent = "Unavailable";
    return;
  }

  const denominator = Math.max(1, entriesNow + (isJoined ? 0 : 1));
  let chancePercent = (winners / denominator) * 100;
  if (!Number.isFinite(chancePercent) || chancePercent < 0) chancePercent = 0;
  if (chancePercent > 100) chancePercent = 100;

  const chanceText = `${chancePercent.toFixed(2)}%`;
  const capText = maxEntries ? ` (${entriesNow}/${maxEntries})` : "";
  chanceCell.textContent = `${chanceText}${capText}`;
}

async function applyListQuickActions(): Promise<void> {
  const cards = listCards();
  if (cards.length === 0) return;

  for (const card of cards) {
    const raffleId = getRaffleIdFromHref(card.href);
    if (!raffleId) continue;
    card.dataset.manncoEnhancerGiveawayId = raffleId;
    ensureQuickButton(card, raffleId);
  }

  const joined = await fetchJoinedRaffles();
  for (const card of cards) {
    const raffleId = card.dataset.manncoEnhancerGiveawayId || "";
    if (!raffleId) continue;
    updateCardJoinedState(card, joined.has(raffleId));
  }
}

export const giveawaysModule: ContentModule = {
  id: "giveaways-module",
  routes: ["giveaways"],
  apply(_context, settings) {
    if (!settings.enabled || !settings.giveawaysHelpers) {
      cleanupUi();
      return;
    }

    document.documentElement.classList.add(ROOT_CLASS);
    ensureStyles();

    void applyListQuickActions();
    void refreshDetailRows();
  }
};
