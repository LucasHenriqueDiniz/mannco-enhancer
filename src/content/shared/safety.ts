const clickCooldownByKey = new Map<string, number>();

export function parseMoney(raw: string): number | null {
  const compact = (raw || "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, "")
    .replace(/[^\d,.-]/g, "");
  if (!compact) return null;

  let cleaned = compact.replace(/(?!^)-/g, "");
  const commaCount = (cleaned.match(/,/g) || []).length;
  const dotCount = (cleaned.match(/\./g) || []).length;

  if (commaCount > 0 && dotCount > 0) {
    const lastComma = cleaned.lastIndexOf(",");
    const lastDot = cleaned.lastIndexOf(".");
    if (lastComma > lastDot) {
      cleaned = cleaned.replace(/\./g, "").replace(/,/g, ".");
    } else {
      cleaned = cleaned.replace(/,/g, "");
    }
  } else if (commaCount > 0) {
    const lastComma = cleaned.lastIndexOf(",");
    const decimalsLen = cleaned.length - lastComma - 1;
    if (decimalsLen === 2) {
      cleaned = `${cleaned.slice(0, lastComma).replace(/,/g, "")}.${cleaned.slice(lastComma + 1)}`;
    } else {
      cleaned = cleaned.replace(/,/g, "");
    }
  } else if (dotCount > 1) {
    const lastDot = cleaned.lastIndexOf(".");
    const decimalsLen = cleaned.length - lastDot - 1;
    if (decimalsLen === 2) {
      cleaned = `${cleaned.slice(0, lastDot).replace(/\./g, "")}.${cleaned.slice(lastDot + 1)}`;
    } else {
      cleaned = cleaned.replace(/\./g, "");
    }
  }

  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

export function canRunWithCooldown(key: string, cooldownMs: number): boolean {
  const now = Date.now();
  const prev = clickCooldownByKey.get(key);
  if (typeof prev === "number" && now - prev < cooldownMs) return false;
  clickCooldownByKey.set(key, now);
  return true;
}

export function validatePrice(value: number): boolean {
  return Number.isFinite(value) && value > 0 && value <= 999999;
}
