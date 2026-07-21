# MVP Requirements: Spending & Inventory Tracker with Dashboard

## 1. Goal & Scope

**Goal:** A single spreadsheet for a small starting business that tracks **spending** and **inventory**, with one **Dashboard** tab giving an overview of both. Inventory on the dashboard must be **dynamic**: when a new item is added to the data, it appears as a new row with its total quantity.

**MVP scope:**
- One place to log purchases/expenses (source for both spending and inventory).
- One dashboard showing spending overview + inventory overview.
- No separate “sales” or “stock-out” in MVP (inventory = what was bought / what you have; adjustments can be manual if needed).

- Design for **reusability** (same template for different businesses/periods) and **data migratability** (export/import, backup, move to another workbook); see §10.

**Out of scope for MVP:** Multi-user, multi-currency, barcodes, reorder alerts, historical inventory snapshots.

---

## 2. User Stories (MVP)

(Export/import and reuse user needs are detailed in §10.)

| # | As a… | I want to… | So that… |
|---|--------|-------------|-----------|
| 1 | Owner | Log each purchase (date, item, qty, cost) | I have one source of truth for spending and stock |
| 2 | Owner | See total spending and spending breakdown (e.g. by category, by month) on the dashboard | I can control costs and spot trends |
| 3 | Owner | See a list of all items and their current quantity on the dashboard | I know what I have in stock at a glance |
| 4 | Owner | Have new items appear automatically as new rows in the inventory overview when I add them to the log | I don’t have to manually add rows for new products |

---

## 3. Sheet Structure

**Canonical names (do not rename for reuse/migration):** Sheet tabs must be exactly **Transactions**, **Dashboard**, **Settings**. Formulas and any scripts reference these names. Changing them breaks references and migration.

| Tab | Purpose | Editable |
|-----|---------|----------|
| **Transactions** | Every purchase: date, item, category, qty, unit price, total, payment, notes. Single source for spending and inventory. | Yes (user data entry) |
| **Dashboard** | Read-only overview: spending KPIs + spending breakdown + **dynamic inventory table** (item name + quantity). | No (formulas only) |
| **Settings** | Budget, category list, payment methods (and any other dropdowns). | Yes (config) |

Optional later: separate **Inventory** tab for manual adjustments (e.g. stock count corrections); for MVP, inventory can be 100% derived from Transactions.

---

## 4. Data Model

### 4.0 Canonical layout (reuse and migration contract)

**Template version:** Scripts expose `CONFIG.TEMPLATE_VERSION` as a **year-based** string **YY.minor** (e.g. **26.1** = 2026, first release). Document properties key `tracker_script_version` tracks the last applied version for automatic upgrades on open.

**Sheet names:** Exactly `Transactions`, `Dashboard`, `Settings`, `Guide`. Do not rename; formulas and scripts depend on these.

**Transactions sheet:** Row 1 = header row; data starts row 2. Column order (fixed): A=Date, B=Item, C=Category, D=Qty, E=Unit Price, F=Total (formula), G=Payment, H=Notes, I=Type, J=ID (formula), K=Up-front amount, L=Linked deposit ID. **Total:** For Type `Deposit` or `Pre-order paid`, equals numeric K; else Qty × Unit price. **Types:** `Purchase`, `Income`, `Deposit`, `Pre-order paid`; blank Type behaves as Purchase. **Date format:** ISO 8601 `YYYY-MM-DD`. **Currency:** Single currency; store as number. **Empty rows:** Blank Date treated as no data for export. **Settings:** Budget, currency, lists in documented cells; default transaction types are merged by script if missing.

### 4.1 Transactions (main log)

| Column | Type | Required | Notes |
|--------|------|----------|--------|
| Date | Date | Yes | Purchase date (YYYY-MM-DD or date format). |
| Item | Text | Yes | Product/sku name. **This drives “new row” in inventory** — each unique value = one row on dashboard. |
| Category | List (dropdown) | Yes | From Settings (e.g. Raw materials, Packaging, Office, Other). |
| Qty | Number | Yes | Units bought (integer). Summed per item for inventory. |
| Unit Price | Currency | Yes | Price per unit. |
| Total | Formula | — | Deposit / Pre-order paid: numeric **Up-front amount** (K); else Qty × Unit price. |
| Payment | List (dropdown) | Optional | From Settings. |
| Notes | Text | Optional | Supplier, PO#, etc. |
| Type | List | Optional | Purchase, Income, Deposit, Pre-order paid; blank = Purchase. |
| ID | Formula | — | Row id (e.g. T&ROW). |
| Up-front amount | Number | Optional | Required for Total when Type is Deposit or Pre-order paid. |
| Linked deposit ID | Text | Optional | Balance row: paste deposit row’s ID (J). |

Same row feeds **spending** (Total, Category, Date) for all cash-out types; **inventory** (Item, Qty) only for Purchase / blank Type.

### 4.2 Dashboard — Spending section

- **Total spent (all time)**  
  e.g. `=SUM(Transactions!F2:F)` or `SUMPRODUCT` over Total column (ignore blanks).
- **This month**  
  Filter by `MONTH(Date)=MONTH(TODAY())`, `YEAR(Date)=YEAR(TODAY())`, sum Total.
- **Budget left**  
  `= Budget (Settings) - This month spent`.
- **Spending by category**  
  One row per category; sum Total where Category = that category.
- **Monthly trend (e.g. last 6 months)**  
  One row per month; sum Total for that month.

(You can reuse the same formula patterns you have in the current Pokemon TCG dashboard.)

### 4.3 Dashboard — Inventory section (dynamic)

- **Requirement:** Every **unique** `Item` in Transactions must appear as **one row** in the overview, with **total quantity** (sum of `Qty` for that item) and **total value** (sum of `Total` spent on that item). When a new item is added in Transactions, it must show up as a **new row** without manual editing of the dashboard.

**Recommended approach (Google Sheets):**

1. **Unique items**  
   Use `UNIQUE(FILTER(Transactions!B2:B, Transactions!B2:B<>""))` (if Item is column B). This returns one row per distinct item; new items appear automatically.
2. **Quantity per item**  
   For each unique item, sum qty: `SUMIF(Transactions!B2:B, <this row’s item>, Transactions!D2:D)` (if Qty is column D).
3. **Total value per item**  
   For each unique item, sum total spent: `SUMIFS(Transactions!F:F, Transactions!B:B, <this row's item>, ...)`. Shows how much capital is tied up in each inventory item.
4. **Layout**  
   - Column 1: unique item names (from UNIQUE).  
   - Column 2: quantity (SUMIF per row, or one formula that spills: e.g. `BYROW(UNIQUE(...), LAMBDA(item, SUMIF(..., item, ...)))`).  
   - Column 3: total value (SUMIFS on Total column, same spill pattern as quantity).

So the inventory block is **fully formula-driven and dynamic**: new item in Transactions → new row in the inventory overview with correct quantity and total value.

**Optional columns later:** Category, last purchase date (all derivable from Transactions).

---

## 5. Dashboard Layout (Suggested)

- **Top:** Title, e.g. “Spending & Inventory Overview”.
- **Row 1–2:** KPI cards: Total Spent | This Month | Budget Left (and optionally Total Items / Total Units).
- **Next:** “Spending by Category” table (fixed categories from Settings or dynamic from data).
- **Next:** “Monthly Trend” (e.g. last 6 months).
- **Below or beside:** “Inventory” section:
  - Header: **Item** | **Quantity** | **Total Value**
  - Data: dynamic list (UNIQUE + SUMIF or equivalent). No fixed number of rows — as many as there are distinct items. Total Value = sum of Total (spending) per item.

Use borders/formatting so the inventory block is clearly one section. Optionally protect the Dashboard so only formulas are present and users don’t accidentally type in the wrong place.

---

## 6. Behaviour Summary

| Requirement | How it’s met |
|-------------|------------------|
| Track spending | Transactions sheet with Date, Category, Qty, Unit Price, Total; Dashboard sums and breaks down by category/month. |
| Track inventory | Same Transactions: Item + Qty; Dashboard sums Qty by Item. |
| Dashboard shows both | One tab with “Spending” and “Inventory” sections. |
| New item = new row | Inventory section built from `UNIQUE(Item)` + `SUMIF(Qty)` + `SUMIFS(Total)` (or BYROW/LAMBDA). No manual row insertion. |
| Quantity in overview | Quantity column = sum of Qty for that item. |
| Value in overview | Total Value column = sum of Total (spending) for that item. Shows capital tied up in stock. |
| Edits/deletes in Transactions | Dashboard and inventory update automatically (formula-driven). |

---

## 7. Edge Cases & Conventions

- **Empty item:** Rows with blank Item should be excluded from inventory (already handled by `FILTER(..., <> "")` in UNIQUE).
- **Same item, different spelling:** “Widget A” and “widget A” = two rows. For MVP, encourage consistent naming (or later add normalization).
- **Negative qty:** MVP can disallow or treat as returns; if allowed, clarify that “inventory” = net sum (can go negative).
- **Very long lists:** UNIQUE + SUMIF scales to hundreds of items; for thousands, consider limiting display (e.g. top N or “show items with qty &gt; 0”).

---

## 8. Implementation Notes

- **Sheets:** Implement as **Google Sheets** with formulas (no Apps Script required for the dynamic inventory). Script can be used for setup (create tabs, headers, validation, KPI formulas) and optional extras (sample data, formatting).
- **Existing workbook:** This design can replace or extend the current Pokemon TCG tracker: rename “Expenses” → “Transactions”, add the Inventory section to the Dashboard using UNIQUE + SUMIF on Item and Qty, and adjust categories/settings to be business-agnostic (or keep domain-specific labels in Settings).
- **Reuse:** Spending formulas (Total Spent, This Month, by Category, Monthly Trend) can mirror your current Dashboard; the only new block is the dynamic **Inventory** table.

---

## 9. Acceptance Criteria (MVP)

- [x] All purchases are logged in one Transactions sheet with at least: Date, Item, Category, Qty, Unit Price, Total.
- [x] Dashboard shows Total Spent, This Month, and Budget Left (or equivalent).
- [x] Dashboard shows spending by category and a simple monthly trend.
- [x] Dashboard has an Inventory section: one row per distinct Item, with total Quantity and Total Value (sum of spending per item).
- [x] Adding a new row in Transactions with a new Item name causes a new row to appear in the Inventory section and the correct quantity to show.
- [x] Settings (or equivalent) holds budget and dropdown lists (categories, payment).
- [x] Data is exportable (e.g. Transactions + Settings to CSV or downloadable copy) and can be re-imported or pasted into a fresh template without breaking structure.
- [x] Reusing the template for another business only requires changing Settings (categories, budget) and clearing or replacing Transactions data.

**MVP iteration 1 complete.** All acceptance criteria met.

---

## 10. Reusability and Data Migratability

**User needs (migration):** As owner I want to (5) export or copy my data (transactions + settings) in a standard format so I can back up, move to another workbook, or reuse the template for another business; (6) import or paste existing transaction data into the template so I can switch from another system or restore from backup without rebuilding the sheet.

### 10.1 Reusability (template approach)

- **One template, many instances:** The same workbook structure (sheet names, column order, formulas) can be used for different businesses or periods. Reuse = copy the workbook (or "Make a copy" in Google Sheets), then:
  - **Customize:** Update **Settings** only (budget, category list, payment methods). No formula or structural change.
  - **Data:** Either clear **Transactions** for a fresh start or paste/import existing data that matches the canonical column order (see §4.0).
- **Configuration in one place:** All domain-specific choices (categories, payment methods, budget) live in **Settings**. The rest (Transactions columns, Dashboard formulas) stays fixed so that formulas and any scripts keep working across copies.
- **Naming contract:** Do not rename sheets **Transactions**, **Dashboard**, **Settings**. Do not reorder or rename columns in Transactions. Refer to §4.0 for the canonical layout.

### 10.2 Data migratability

**Export (backup / move / analyse elsewhere):**

- **What to export:** At minimum, the **Transactions** sheet (all rows from header row 1 through last data row) and the **Settings** sheet (or at least budget and list ranges used for dropdowns).
- **Format:** CSV is preferred for portability (one file per sheet, or one CSV for Transactions with headers in row 1). Use the **canonical column order** through **Linked deposit ID** (see §4.0). Total can be exported as value (number) when exporting to CSV so the recipient does not need the formula.
- **Date:** Export dates in ISO 8601 `YYYY-MM-DD` so they import correctly into other sheets or tools.
- **Encoding:** UTF-8 for CSV so special characters in Item or Notes are preserved.

**Import (restore / migrate from another system):**

- **Target:** A workbook that already has the template structure (Transactions sheet with correct headers in row 1 and same column order). Paste or import data starting at **row 2**; do not overwrite the header row.
- **Required columns (minimum):** Date (A), Item (B), Category (C), Qty (D), Unit Price (E). Total (F) and ID (J) are formulas after patch. Payment (G), Notes (H), Type (I), Up-front amount (K), Linked deposit ID (L) optional; older CSVs with fewer columns still import with trailing fields blank.
- **Date format:** Use `YYYY-MM-DD`. If source data uses another format, convert before import (or document the expected format so a one-time script/tool can normalize).
- **Decimal/currency:** Use period for decimal separator; no currency symbols in the number cells (e.g. `12.99` not `$12.99`).
- **Categories and payment:** Imported values should exist in Settings dropdown lists, or add them to Settings first; otherwise validation may flag or drop values.

**Backup / restore:**

- **Full backup:** Copy the entire workbook (or download as Excel/Google Sheets). Restore = open the copy or re-upload. No schema change required.
- **Data-only backup:** Export Transactions (and optionally Settings) to CSV. Restore = open a **fresh template** and import/paste the CSV into Transactions starting at row 2, then re-apply Settings if needed.

### 10.3 Optional: transaction ID (future-proofing)

- For deduplication, merging two exports, or audit trails, consider adding an optional **Transaction ID** column (e.g. column I or a dedicated column). Each row gets a unique ID (e.g. UUID or `ROW()`-based). Not required for MVP, but if added later, keep it in the canonical layout and export/import so data remains migratable.
