# KOLLEKT.GG Pokemon TCG Financial Tracker v26.0
## The Everyday Australian Collector

### What's Included

| File | Purpose |
|------|---------|
| `KollektGG_Tracker_v26_MASTER.xlsx` | Fully editable version — all formulas and structure unlocked. For you (the developer) to modify and iterate. |
| `KollektGG_Tracker_v26_PRODUCTION.xlsx` | Protected buyer version — only input cells are editable, formulas locked, structure protected. Password: `kollekt26` |
| `Kollekt_AppsScript_v26.gs` | Google Apps Script code — paste into Extensions → Apps Script for API integration, migration, onboarding wizard. |

### Setup Instructions (for Google Sheets)

1. Upload the PRODUCTION .xlsx to Google Drive
2. Open with Google Sheets
3. Go to Extensions → Apps Script
4. Delete any existing code, paste the contents of `Kollekt_AppsScript_v26.gs`
5. Save and close Apps Script editor
6. Reload the spreadsheet
7. The "⬡ Kollekt" menu appears — run the Setup Wizard

### Tab Structure

- **Dashboard** — Auto-updating P&L, spending breakdown, platform sales, monthly trends
- **Purchases** — Every dollar spent (sealed, singles, supplies, grading, shipping)
- **Sales** — Every dollar earned with auto-calculated fees, COGS, profit, margin
- **Settings** — Platform fees, currency, API keys, migration tools
- **Guide** — Step-by-step instructions for all workflows

### Key Workflows

**Pack Opening:** Buy sealed → mark "Opened" → add pulled cards as new rows with Parent ID

**Grading:** Card in Purchases → add grading fee entry → sell as "Graded Card" in Sales

**Selling:** Enter sale → select platform (fee auto-calculates) → link Purchase Ref ID → profit shows instantly

**Migration:** Kollekt menu → Export Data → JSON saved to Drive → Import in new version

### Supported APIs (via Apps Script)

1. **PokemonTCG.io** — Free, TCGPlayer prices, great card metadata
2. **TCGdex** — Free, no API key needed, Cardmarket + TCGPlayer
3. **PokemonPriceTracker** — Pricing specialist + PSA grading data
4. **PriceCharting** — Historical pricing, sealed products
5. **Custom API** — User-defined endpoint

### Supported Selling Platforms

eBay AU (13.25%), eBay US (13.25%), Whatnot (10.9%), Facebook Marketplace (0%), TCGPlayer (10.89%), Gumtree (0%), Mercari (10%), CardMarket (5%), Direct/Local (0%), Shopify (2.9%), Payhip (5%)

### Currencies Supported

AUD, USD, EUR, GBP, JPY, CAD, NZD, SGD, PHP, THB, HKD, KRW, TWD, MYR, CHF

### Google Apps Script Approval Note

The script uses only standard Google Apps Script services (SpreadsheetApp, DriveApp, UrlFetchApp, PropertiesService, HtmlService). These are all within Google's standard OAuth scopes and will not trigger a "dangerous app" warning once deployed properly. Users will see a standard Google authorization prompt on first run, which is normal for any Apps Script.

### Version History

- **v26.0** — Initial MVP release. Financial tracking, platform fee integration, API market price lookups, data migration system, onboarding wizard.
