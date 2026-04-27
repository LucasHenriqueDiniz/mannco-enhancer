# Privacy Policy

**Last updated: 2026-04-27**

Mannco Enhancer is a browser extension designed to provide interface and workflow improvements for users of `mannco.store`. We prioritize user privacy and security above all else.

## 1. Data Collection

Mannco Enhancer follows a strict **Zero-Collection** policy:
- **No Personal Data**: We do not collect, store, or transmit any personal information, account details, or trading history.
- **No Analytics**: The extension does not use external tracking or analytics services (e.g., Google Analytics).
- **No Third-Party Sharing**: We do not sell, trade, or share any user data with third parties.

## 2. Data Storage

All data handled by the extension is stored locally on your device:
- **Local Settings**: Your preferences (e.g., enabled features, language) are stored using the `chrome.storage.sync` API. This allows your settings to synchronize across your Chromium profile but never leaves the Google ecosystem.
- **Temporary State**: Any runtime data used to enhance the page (e.g., cached price references) is stored in-memory and is wiped when the tab is closed or refreshed.

## 3. Permissions & Access

The extension requests the following permissions to function:
- `storage`: Used exclusively to save and retrieve your personal configuration.
- `tabs`: Used to ensure settings are applied correctly to the active `mannco.store` tab.
- `Host Permissions (mannco.store)`: Required to inject content scripts that modify the interface of the target site.
- `External Price References`: When enabled, the extension fetches read-only data from `steamcommunity.com` and `backpack.tf` to provide price comparisons. No user-specific data is sent to these services.

## 4. Marketplace Safety

Mannco Enhancer does not have access to your account credentials or API keys. It interacts with the website solely by modifying the DOM and simulating user clicks based on your explicit interaction. We will never automate a financial transaction without your direct confirmation.

## 5. Contact

For any questions regarding this policy or the extension, please open an issue on the official GitHub repository.
