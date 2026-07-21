# Testing Guide — Spending & Inventory Tracker

Run tests from **Extensions → Apps Script**: open the script project, run `runAllTests`, and check the execution log (or alert). Use this checklist for manual and edge-case testing.

**Local (before pasting into Apps Script):** from the repo folder run `node scripts/verify-config.js` — confirms `TRANS_COLS` matches the number of `TRANS_HEADERS` entries in `Config.gs`.

---

## 1. Automated tests (Apps Script)

- **runAllTests()** checks:
  - CONFIG: `TRANS_HEADERS.length` equals `TRANS_COLS`.
  - Sheet names: Transactions, Dashboard, Settings, Guide exist.
  - Transactions: header row matches canonical order (12 columns incl. Type, ID, Up-front amount, Linked deposit ID); Total formula (Deposit / Pre-order paid branch); ID formula.
  - Settings: budget (B2) and currency (E2) present.
  - Dashboard: SUM formulas; spending breakdown includes Deposit and Pre-order paid; inventory UNIQUE + SUMIF (qty) + SUMIFS (total value).
  - Export: `exportTransactionsToCsv()` and `exportSettingsToCsv()` run without throwing.
  - Apply fixes: `_patchTransactions()` runs without throwing; Total formula restored.
  - CSV parser: `_parseCsvLine()` handles simple, quoted, empty-field, and single-field cases.
  - Tabular backup: `_readTransactionsFromBackupSheet()` keeps newlines inside Notes on a scratch sheet.
  - Import round-trip: full backup export → parse → import → Total and ID formulas still present.

Run after **runSetup()** on a new sheet; all should **PASS** or **SKIP** (no **FAIL**).

**Template 26.1 (year-based):** Reloading the sheet (or **Apply fixes**) sets document property `tracker_script_version` and merges missing default transaction types in Settings column C. See **APPLY_PATCH_V26.1.md** for upgrade steps.

---

## 2. Manual test checklist

| # | Step | Expected |
|---|------|----------|
| 1 | New sheet → Run **runSetup** | Four tabs: Transactions, Dashboard, Settings, Guide. Headers (incl. Type, ID), formulas, date validation, frozen row/col. |
| 2 | Add one transaction: Date, Item, Category, Qty, Unit Price, Type=Purchase | Total and ID auto-fill; Dashboard shows Data as of, Total Spent, Earned, Profit, This month, Earned this month, Budget Left; Inventory shows 1 item with Quantity and Total Value. |
| 3 | Add an **Income** row (Type=Income, Total amount) | Dashboard Total Earned and Profit update; Inventory unchanged. |
| 4 | Add second Purchase, **same Item** | Inventory still 1 row; Quantity = sum of both Qtys; Total Value = sum of both Totals. |
| 5 | Add third transaction, **new Item** | Inventory has 2 rows; new item appears automatically. |
| 6 | Change Settings: budget (B2), currency (E2) | Dashboard Budget Left and exports reflect currency. |
| 7 | Tracker → **Export Transactions** / **Export Settings** / **Export full backup** | **Export_CSV** / **Backup_Transactions**: tabular **A–L**; **Export_Settings** / **Backup_Settings**: **A–E**; dates YYYY-MM-DD where applicable. |
| 8 | Run **runAllTests** | All PASS (or SKIP). |
| 9 | With existing data → Tracker → **Apply fixes (keep data)** | Dashboard and Guide rebuilt; Transactions data intact; Total/ID formulas and validation refreshed; **Settings column C** gains any missing default types (Deposit, Pre-order paid). Extra columns beyond L cleared. |
| 10 | After Apply fixes → verify Dashboard | KPIs, Spending by Category, Monthly Trend, Inventory all show correct values from existing data. |
| 11 | Add 3 transactions → **Export full backup** → **Reset Transactions** → **Import Transactions from backup sheet** | Confirm dialog; 3 rows imported; Dashboard shows correct totals; Inventory shows items; Total and ID are formulas (not values). |
| 12 | After Import Transactions → verify data matches original | Dates, items, categories, quantities, prices, payment, notes, type all match the pre-export data. |
| 13 | **Export full backup** → **Reset all** → **Import full backup** | Settings restored (budget, categories); Transactions restored; Dashboard rebuilt and correct. |
| 14 | Import with no backup sheet present | Delete Backup_Transactions and Export_CSV → Tracker → Import Transactions → alert "No backup sheet found". |
| 15 | Import with empty backup (header only) | Export when Transactions empty → Import → alert "No data rows to import". |

---

## 3. Edge cases (REQUIREMENTS §7)

| Edge case | How to test | Expected behavior |
|-----------|-------------|--------------------|
| **Empty Item** | Add row with Date/Category/Qty/Price but leave Item blank | Row excluded from Inventory (FILTER in formula). Dashboard spending still includes Total. |
| **Same item, different spelling** | Add "Widget A" and "widget A" | Two separate rows in Inventory (no normalization in MVP). |
| **Negative Qty** | Enter negative Qty (if you allow it) | Inventory shows net sum (can go negative). Total = Qty × Unit Price (negative). |
| **Blank Date** | Row with empty Date but filled Item/Qty | Treated as "no data" for date-based formulas; Item still in Inventory if present. |
| **Empty Transactions** | No data rows, only header | Dashboard: Total Spent = 0, This Month = 0, Budget Left = Settings B2; Spending by category and Inventory empty; no errors. |
| **Many categories / many items** | 20+ categories, 50+ items | UNIQUE + SUMIF/BYROW scale; Dashboard updates without manual rows. |
| **Export with no data** | Export when only header exists | CSV has one line (header). No throw. |
| **Export with dates** | Export with a few transactions | Dates in CSV are YYYY-MM-DD. |

---

## 4. Reuse and migration

| Test | Steps | Expected |
|------|--------|----------|
| **Reuse** | Make a copy → Change Settings (budget, categories) → Add new transactions | Formulas and Dashboard work; Inventory dynamic. |
| **Import** | Export CSV → New copy of template → Paste CSV into Transactions from row 2 | Data appears; Dashboard and Inventory correct. Do not overwrite row 1. |

---

## 5. Fixes applied (implementation)

- **Setup order:** Settings is built before Transactions so dropdown validation ranges exist.
- **Data validation:** Uses sheet range objects (Settings sheet) instead of string references.
- **Spending by category:** Both columns use spill formulas (UNIQUE + BYROW/SUMIF) so rows match.
- **Export:** Dates exported as ISO YYYY-MM-DD; Total as value; CSV escaping for commas/quotes/newlines.
- **Export without Drive:** Transactions/Settings/full backup write to sheets (spreadsheets scope only).
- **Empty Item:** Handled by `FILTER(..., <> "")` in UNIQUE in Dashboard formulas.
- **Transaction ID (column J):** Formula `T&ROW()` for dedup/merge/audit; exported in CSV.
- **Currency (Settings E2):** Label only; used in exports and docs.
- **Guide sheet:** Short “How to use” text; created by setup.
- **Date validation:** Transactions Date column uses `requireDate()`.
- **Freeze:** Transactions row 1 and column A frozen.
- **getRange numCols fix:** All `getRange(row, col, numRows, numCols)` calls use `1` for single-column ranges instead of accidentally reusing the column index as the width.
- **Dashboard spill gaps:** Spending by Category leaves 22 rows for spill; Monthly Trend leaves 8 rows. Prevents `#REF!` errors when spill formulas expand.
- **Reset Transactions preserves formulas:** Clears only user-editable columns (A–E, G–I), leaving Total (F) and ID (J) formula columns intact.
- **Inventory Total Value:** Dashboard inventory section includes Item, Quantity, and Total Value (sum of spending per item).
- **Apply fixes:** `applyFixes()` rebuilds Dashboard/Guide and patches Transactions formulas without data loss. Cleans up spill-bug columns beyond J.
- **Category formula paren fix:** Spending by Category BYROW formula extracted into `categoryFilter` variable (same pattern as `inventoryFilter`) to eliminate parse error from extra paren.
- **Import:** `importTransactionsFromSheet()`, `importSettingsFromSheet()`, `importFullBackupFromSheets()` read from backup sheets, parse CSV, validate header, write user-editable columns only (skip Total/ID formulas). CSV parser handles quoted fields, escaped quotes, empty fields.

If you find a failing case, run **runAllTests** and note which check fails; then verify sheet names, column order, and that Setup was run in a spreadsheet that has the script bound to it.
