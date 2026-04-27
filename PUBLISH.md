# Chrome Web Store Publication Guide

## 📦 Build for Upload

```bash
npm run build:zip
```

This generates `mannco-enhancer.zip` in the project root — ready for Chrome Web Store upload.

---

## 🔐 Permissions & Justifications

### Required Permissions

| Permission | Justification |
|------------|---------------|
| `storage` | Saves user preferences (enabled toggles, language, custom settings) locally. No data leaves the browser. |
| `tabs` | Sends settings updates to active `mannco.store` tabs when user changes options in the popup. |

### Host Permissions

| Host | Justification |
|------|---------------|
| `https://mannco.store/*` | **Primary target.** The extension only runs content scripts on this domain to enhance the marketplace interface. |
| `https://www.mannco.store/*` | Alternative subdomain for the same marketplace. |
| `https://steamcommunity.com/*` | Fetches Steam market price references for items when `itemExternalMarketPrices` is enabled. Read-only, no authentication. |
| `https://backpack.tf/*` | Fetches Backpack.tf price references for Team Fortress 2 items. Read-only, no authentication. |
| `https://api.dmarket.com/*` | Fetches DMarket price references. Read-only. |
| `https://dmarket.com/*` | Fetches DMarket price references. Read-only. |
| `https://skinport.com/*` | Fetches Skinport price references. Read-only. |
| `https://api.skinport.com/*` | Fetches Skinport API price references. Read-only. |
| `https://csfloat.com/*` | Fetches CSFloat price references for CS2 items. Read-only. |
| `https://tradeit.gg/*` | Fetches Tradeit.gg price references. Read-only. |
| `https://bitskins.com/*` | Fetches Bitskins price references. Read-only. |
| `https://shadowpay.com/*` | Fetches Shadowpay price references. Read-only. |
| `https://waxpeer.com/*` | Fetches Waxpeer price references. Read-only. |
| `https://skinbaron.de/*` | Fetches Skinbaron price references. Read-only. |

**Note:** All external market fetches are **read-only** and **informational only**. The extension never sends user data, credentials, or performs trades on these sites.

---

## 📝 Store Listing Information

### Description (Short)
```
Quality-of-life improvements for mannco.store with user-controlled toggles for inventory management, pricing tools, and profile utilities.
```

### Description (Full)
```
Mannco Enhancer is a professional-grade browser extension designed to optimize your trading experience on mannco.store.

FEATURES:
• Inventory Highlights — Visual cues to identify items by value or condition
• Quick Undercut — One-click undercut button in your inventory
• Quick Update Modal — Update prices of multiple items with keyboard shortcuts
• Buy-Order Safety — Warnings for negative flips and prevention of negative inputs
• External Price References — Compare prices with Steam, Backpack.tf, and more
• Profile Exports — Export transactions, cashouts, and buy orders to CSV
• Accessibility Fix — Prevents ARIA spam that causes profile page lag

All features are optional and controlled via the extension popup. No silent automation — every action requires explicit user consent.

SAFETY:
• Never auto-submits buy/sell/list actions
• No external data collection or analytics
• Settings stored locally in your browser
```

### Category
`Productivity` or `Shopping`

### Language
English (primary), with UI translations for Portuguese (BR), Spanish, and Russian.

### Screenshots Needed
1. **Popup General Tab** — Show the main settings interface
2. **Popup Inventory Tab** — Show inventory-specific options
3. **Item Page** — Show external price references or buy-order profit columns
4. **Profile Page** — Show export buttons or money mask toggle
5. **Inventory Page** — Show highlights or undercut button

### Promo Images (Optional but recommended)
- **Small promo tile:** 440×280px
- **Large promo tile:** 920×680px
- **Marquee promo tile:** 1400×560px

---

## ✅ Pre-Upload Checklist

- [ ] Run `npm run typecheck` — no TypeScript errors
- [ ] Run `npm run build:zip` — zip generated successfully
- [ ] Verify `manifest.json` version is incremented
- [ ] Test extension in fresh Chrome profile (no dev mode)
- [ ] Verify all toggles work on `mannco.store`
- [ ] Check that popup renders correctly in 340px width
- [ ] Confirm no console errors on page transitions
- [ ] Verify external price fetching works (Steam, Backpack.tf)
- [ ] Test CSV exports on profile pages
- [ ] Check localization in all 4 languages
- [ ] Privacy Policy link is accessible (`PRIVACY_POLICY.md`)
- [ ] Support contact is valid (GitHub issues or email)

---

## 🚀 Upload Steps

1. Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole/)
2. Click **New Item**
3. Upload `mannco-enhancer.zip`
4. Fill in store listing information (see above)
5. Add screenshots (minimum 1, recommended 3-5)
6. Select category and language
7. Fill **Privacy practices**:
   - Data collection: **No data collected**
   - Data usage: **Data is not sold to third parties**
   - Remote code: **No**
8. Submit for review

---

## 📋 Post-Submission

- Review typically takes **1-3 business days**
- You'll receive email notifications for approval or rejection
- If rejected, fix the issues and resubmit with incremented version

## 🔄 Version Management

Before each release:
1. Update version in `manifest.json`
2. Update `CHANGELOG.md`
3. Run `npm run build:zip`
4. Upload new zip to Chrome Web Store
