export function queryFirst(selectors: readonly string[], root: ParentNode = document): HTMLElement | null {
  for (const selector of selectors) {
    const node = root.querySelector<HTMLElement>(selector);
    if (node) return node;
  }

  return null;
}

export function ensureNode(id: string, className: string, parent: HTMLElement): HTMLDivElement {
  const existing = document.getElementById(id);
  if (existing instanceof HTMLDivElement) return existing;

  const node = document.createElement("div");
  node.id = id;
  node.className = className;
  parent.appendChild(node);
  return node;
}

export function debounce<T extends (...args: never[]) => void>(fn: T, waitMs: number): T {
  let timeout: number | null = null;

  return ((...args: Parameters<T>) => {
    if (timeout !== null) window.clearTimeout(timeout);
    timeout = window.setTimeout(() => fn(...args), waitMs);
  }) as T;
}
