# Changelog

All notable changes to this project will be documented in this file.

## [0.1.1] - 2026-04-27

### Added
- **i18n System**: Full internationalization support with locales for English, Portuguese (BR), Spanish, and Russian.
- **Language Selector**: New popup language selector with SVG flag icons instead of emojis.
- **Custom Scrollbar**: Styled popup scrollbar for better UX.
- **Build Scripts**: Added `build-changelog.mjs` to auto-generate `CHANGE_LOG.html` from `CHANGE_LOG.md`.

### Changed
- **UI Text**: Improved clarity of toggle labels and descriptions (e.g., "Fix Profile Accessibility" instead of "Fix X error").
- **Documentation**: Rewrote `README.md` and `PRIVACY_POLICY.md` with professional, detailed content.
- **Options Config**: Updated default labels in `options-config.ts` to be more descriptive.

### Removed
- **Unused Assets**: Cleaned up 260 unused files including `app-icons`, `fam-flags.png`, and extra flag SVGs.
- **Unused Provider Logos**: Removed 15 unused marketplace provider images.

### Fixed
- **Accessibility**: Fixed ARIA spam in profile pages that caused browser lag.
- **UI Alignment**: Corrected label spacing and alignment in the language selector.

## [0.1.0] - 2026-04-20

### Added
- Initial Mannco Enhancer starter base using Manifest V3.
- Popup-driven settings flow with typed storage synchronization.
- Background service worker and content script infrastructure.
- Core feature set: Inventory highlights, Quick Update modal, and Buy-order safety tools.
- Support for multiple locales (EN, PT-BR, ES, RU).
