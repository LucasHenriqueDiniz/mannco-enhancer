# AGENTS

Guidelines for contributors and coding agents working in this repository.

## Goal

Build and maintain a Mannco Store extension with safe defaults, optional toggles, and resilient DOM handling.

---

## Product Rules

1. Keep every feature optional and controlled by settings.
2. Do not automate destructive marketplace actions without explicit user action.
3. Use conservative defaults (`off`) for any feature that can alter trading, listing, or pricing flow.
4. Prefer data attributes and stable semantic selectors over visual class names.
5. Keep UI text simple and future-ready for i18n.

---

## Architecture Rules

1. TypeScript only in `src/`.
2. Use strict typing and avoid `any`.
3. Keep content script idempotent (safe if run more than once).
4. Prefer `MutationObserver` over polling for DOM updates.
5. Put reusable data flow in `src/lib/`.

---

## Safety Rules for Marketplace Logic

1. Any sell/buy/list action must require a clear user click.
2. Never auto-confirm dialogs silently.
3. Validate price and quantity before dispatching action requests.
4. Add visible feedback for failed actions.
5. Throttle repeated actions to avoid accidental spam.

---

## Permission Discipline

1. Request only necessary permissions in `manifest.json`.
2. Any new permission must be justified in `README.md`.
3. Keep host permissions scoped to `mannco.store` unless a feature requires more.

---

## Verification Checklist

Before finishing a change:

- `npm run typecheck`
- `npm run build`
- Load extension in `chrome://extensions`
- Validate popup save + apply flow
- Validate content script does not throw errors on page transitions

---

## Common Pitfalls

- Site updates break fragile selectors -> maintain fallback selector sets.
- Duplicate injections -> gate custom nodes with ids/classes.
- Heavy observers -> debounce expensive DOM scans.
- Risky automation -> keep user consent and explicit click flow.
