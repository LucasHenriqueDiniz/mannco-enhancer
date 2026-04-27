# Mannco Enhancer

Mannco Enhancer is a professional-grade browser extension designed to optimize the trading and browsing experience on `mannco.store`. It provides a suite of quality-of-life improvements, automation safety tools, and interface enhancements to help traders manage their inventory and market interactions more efficiently.

## 🚀 Features

### 📦 Inventory Management
- **Inventory Highlights**: Visual cues to quickly identify items by value or condition.
- **Quick Undercut**: One-click button to undercut current listings directly from your inventory.
- **Painted Tagging**: Automatic detection and tagging of painted items for easier identification.

### ⚡ Fast Workflow
- **Quick Update Modal**: A streamlined overlay for updating prices of multiple items with keyboard shortcuts, reducing repetitive clicks.
- **Smart Confirmation**: Optional settings to auto-skip discount warnings and auto-fill quantities during bulk updates.

### 🔍 Item Intelligence
- **External Market References**: View real-time price references from Steam and Backpack.tf without leaving the page.
- **Advanced Item List**: Added columns for Float, Killstreaker, Sheen, Spells, and Stickers.
- **Integrated Search**: Filter through the items list by specific attributes (e.g., specific sheen or effect).

### 🛡️ Safety & Utility
- **Buy-Order Protection**: Warnings for negative flips and prevention of negative quantity/price inputs.
- **Profit Calculator**: Net profit/loss columns added to buy-order tables for instant evaluation.
- **Profile Helpers**: Quality-of-life shortcuts and performance fixes (e.g., ARIA spam reduction) for profile pages.

## 🛠️ Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/mannco-enhancer.git
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Build the extension:
   ```bash
   npm run build
   ```
4. Open Chrome and navigate to `chrome://extensions`.
5. Enable **Developer mode** (toggle in the top right).
6. Click **Load unpacked** and select the project root folder.

## ⚙️ Configuration

All features are optional. You can enable or disable them via the extension popup:
- **Global**: Master toggle, tracker blocking, and UI cleaning.
- **Inventory**: Highlights, Undercut tools, and Quick Update settings.
- **Item**: Buy-order safety, external prices, and table customizations.
- **Profile**: Performance fixes and helper shortcuts.

## 🔒 Safety Model

Mannco Enhancer follows a strict **Non-Destructive** philosophy:
- **No Silent Automation**: The extension will never auto-submit a buy, sell, or list action.
- **Explicit Consent**: Every marketplace action requires a clear, intentional user click.
- **Safe Defaults**: High-impact features are disabled by default.

## 🔮 Planned Features

- **Keyboard Shortcuts**: Customizable hotkeys for quick buy, list, and price-update actions without reaching for the mouse.
- **Trade Offer Enhancer**: Overlay trade-offer pages with total value summaries and estimated profit/loss at a glance.
- **Bundle Page Enhancer**: Extra sorting, filtering, and value insights on bundle listings for faster deal evaluation.

## 🤝 Contributing

Contributions are welcome! Please follow these guidelines:
1. Maintain strict TypeScript typing (avoid `any`).
2. Use the `src/lib/options-config.ts` for any new feature toggles.
3. Ensure all new UI elements are localized via `locales/*.json`.
4. Run `npm run typecheck` and `npm run build` before submitting a PR.

## 📜 License

This project is licensed under the MIT License - see the LICENSE file for details.
