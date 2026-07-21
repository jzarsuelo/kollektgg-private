# Spending & Inventory Tracker — Usage Guide

**Template version 26.1** (year-based: **26** = 2026, **.1** = first release in that year) — Single spreadsheet to track **spending** and **inventory** with one **Dashboard** tab. Inventory is dynamic: new items in the log appear automatically as new rows with total quantity.

Updating from an older copy? See **[APPLY_PATCH_V26.1.md](APPLY_PATCH_V26.1.md)** (paste new script, reload; types and formulas update automatically when possible).

---

## Quick start

1. **Create the spreadsheet**  
   - Open [Google Sheets](https://sheets.google.com) and create a new blank spreadsheet.  
   - Run the setup script once (see [Scripts](#scripts) below) to create the **Transactions**, **Dashboard**, **Settings**, and **Guide** tabs with headers, validation, and formulas.  
   - Or use a pre-made copy of the template if provided.

2. **Configure**  
   - Open the **Settings** tab.  
   - Set **Budget** (B2) and **Currency** (E2, e.g. USD).  
   - Edit **Categories** (column A), **Payment methods** (column B), and **Transaction types** (column C). These feed the dropdowns in **Transactions**.  
   - Default types are **Purchase**, **Income**, **Deposit**, **Pre-order paid**; missing defaults are added automatically when you open the workbook or run **Apply fixes** (you do not need to type them by hand).

3. **Log purchases and pre-orders**  
   - Use the **Transactions** tab.  
   - Normal buy: **Type** **Purchase** (or leave blank); **Qty** × **Unit Price** drives **Total**.  
   - **Deposit** (partial pre-order): set **Type** to **Deposit**, enter the amount in **Up-front amount** (K); leave **Qty** / **Unit price** blank; optional **Linked deposit ID** (L) on a later **Purchase** row points to the deposit row’s **ID** (J).  
   - **Pre-order paid** (paid in full before stock arrives): set **Type** to **Pre-order paid** and **Up-front amount** (K); when you receive stock, change to **Purchase**, enter **Qty** and **Unit price**, clear **K**.  
   - **Payment** and **Notes** are optional. Use the Category and Payment dropdowns from Settings.

4. **View overview**  
   - Open the **Dashboard** tab (subtitle shows **Template version 26.1**).  
   - KPIs include **Total Spent** (all cash-out types), **Spending breakdown** (Purchases / Deposits / Prepaid), Total Earned, Profit, this month, budget, Spending by Category, Monthly Trend, and **Inventory** (only **Purchase** / blank **Type**). **Income** counts as earnings only.  
   - Do not type in the Dashboard; it is formula-only.

5. **Need help?**  
   - Open the **Guide** tab for a short “How to use” summary.

6. **Opening sealed product (before MVP3 transform)**  
   - See **[TEMPORARY_WORKFLOW_OPEN_SEALED_BEFORE_MVP3.md](TEMPORARY_WORKFLOW_OPEN_SEALED_BEFORE_MVP3.md)** — **MVP3-only** interim steps (net‑$0 Purchase batch). No other workflows in that file.

---

## Tabs (do not rename)

| Tab            | Purpose                                                                 | Editable |
|----------------|--------------------------------------------------------------------------|----------|
| **Transactions** | Log purchases/income/pre-orders: through column **L** (see Transactions sheet below). | Yes      |
| **Dashboard**    | KPIs, spending breakdown, by category, monthly trend, inventory. | No       |
| **Settings**     | Budget (B2), currency (E2), categories, payment methods, transaction types. | Yes      |
| **Guide**        | Short “How to use” instructions.                                       | Read-only |

Renaming these tabs will break formulas and any scripts.

---

## Transactions sheet

- **Row 1:** Header (do not change column order).  
- **Columns:** A=Date, B=Item, C=Category, D=Qty, E=Unit Price, F=Total (formula), G=Payment, H=Notes, I=Type, J=ID (formula), **K=Up-front amount**, **L=Linked deposit ID**.  
- **Type:** **Purchase** or blank = normal spending + inventory; **Income** = earnings only; **Deposit** / **Pre-order paid** use **Up-front amount** (K) for **Total** and do not affect inventory.  
- **Date:** Use `YYYY-MM-DD`; column has date validation. Row 1 and column A are frozen.  
- **Total:** If **Deposit** or **Pre-order paid**, equals **K** when numeric; else **Qty × Unit price**.  
- **Empty rows:** Blank **Date** ignored for export. Blank **Item** excluded from Inventory.

**Tips:**  
- Use consistent **Item** names (e.g. “Widget A” vs “widget A” are two different inventory rows).  
- For MVP, avoid negative Qty unless you accept negative inventory (net sum).

---

## Dashboard

- **Top:** Title, **template version**, **Data as of**, KPIs (**Total Spent**, **Spending breakdown** by purchase/deposit/prepaid, earned, profit, this month, budget).  
- **Spending by Category:** Totals include Purchase, blank, Deposit, and Pre-order paid.  
- **Monthly Trend:** Last 6 months, same cash-out types.  
- **Inventory:** Purchase / blank **Type** only; one row per **Item** with quantity and value.

Do not type in the Dashboard; it is read-only (formulas only).

---

## Settings sheet

- **Budget:** B2 = monthly budget (used for “Budget left” = Budget − This month spent).  
- **Currency:** E2 = label only (e.g. USD, PHP) for exports and reports.  
- **Categories:** Column A from row 4; used for the Category dropdown.  
- **Payment methods:** Column B from row 4; used for the Payment dropdown.  
- **Transaction types:** Column C from row 4 (defaults: Purchase, Income, Deposit, Pre-order paid). Missing defaults are merged by the script on open or **Apply fixes**.  

When importing data, add any new categories or payment methods here first so validation accepts them.

---

## Reusing for another business

1. **Make a copy** of the workbook (File → Make a copy).  
2. **Settings:** Update Budget, Categories, and Payment methods only.  
3. **Transactions:** Clear or import data matching the **12** column headers (see Transactions sheet above); **Total** and **ID** are formulas.  
4. Do not rename sheets or reorder columns.

---

## Export / backup

- **Full backup:** File → Make a copy, or use **Tracker → Export full backup** to write **Backup_Transactions** (transactions as **columns A–L**, one row per transaction) and **Backup_Settings** (columns **A–E**).  
- **Transactions only:** **Tracker → Export Transactions to CSV sheet** creates **Export_CSV** with the same **A–L** tabular layout (safe for multiline Notes/Item; use **File → Download** if you need a `.csv` file).  
- **Settings only:** **Tracker → Export Settings to sheet** creates **Export_Settings** as **A–E** values (same idea as backup).  
- Use UTF-8 and dates in `YYYY-MM-DD` when saving as CSV.

---

## Import / restore

**Using the Tracker menu (recommended):**

- **Tracker → Import Transactions from backup sheet** — reads from `Backup_Transactions` (or `Export_CSV`), writes user columns, reapplies **Total**/**ID** formulas, and sets the version marker.  
- **Tracker → Import Settings from backup sheet** — restores **Backup_Settings**, merges missing transaction types, refreshes **Transactions** validation.  
- **Tracker → Import full backup** — imports Settings and Transactions, merges types, rebuilds Dashboard and Guide, sets version marker.

**Steps for restore / migration:**

1. In the **source** workbook: **Tracker → Export full backup** (creates `Backup_Transactions` + `Backup_Settings` sheets).  
2. Copy those two sheets into the **target** workbook (right-click sheet tab → Copy to → select target workbook).  
3. In the **target** workbook: **Tracker → Import full backup (Transactions + Settings)**.

**Manual paste (alternative):**

1. Ensure **Settings** has the lists you need.  
2. Paste into **Transactions** from **row 2**; keep all **12** headers in row 1.  
3. User columns: A–E, G–I, K–L; **F** and **J** are formulas — run **Tracker → Apply fixes** if needed.  
4. Use `YYYY-MM-DD` for dates and a period for decimals (e.g. `12.99`).

---

## Scripts

Script files live in the **scripts/** folder: `Config.gs`, `Setup.gs`, `ExportImport.gs`, `Tests.gs`, and `appsscript.json`.

**Install in Google Sheets:**

1. Create a new Google Sheet (or open the one you want to use).  
2. **Extensions → Apps Script.**  
3. Replace the default `Code.gs` with the contents of **Config.gs**, **Setup.gs**, **ExportImport.gs**, and **Tests.gs** (one file per tab, or combine as you prefer).  
4. **View → Show manifest file**, then set **appsscript.json** to match the project’s `appsscript.json` (especially `oauthScopes`).  
5. Save. Run **runSetup** once (from the script editor or from the **Tracker** menu after refresh). Authorize when prompted.

**Using the Tracker menu:**

After the first run (or on next open), a **Tracker** menu appears: **Run setup**, **Apply fixes (keep data)**, **Reset Transactions**, **Reset all**, **Export Transactions to CSV sheet**, **Export Settings to sheet**, **Export full backup (Transactions + Settings)**, **Run tests**.

- **Apply fixes:** Updates Dashboard formulas, Transactions structure (formulas, validation, headers), and Guide — without losing your data or Settings. Use this after updating the script code to pick up bug fixes or new features.
- **Export:** Transactions → **Export_CSV** (tabular A–L); Settings → **Export_Settings** (A–E); full backup → **Backup_Transactions** (A–L) and **Backup_Settings** (A–E). Import still accepts **legacy** Transactions backups that store one CSV text line per row in column A only.  
- Do not rename the sheets **Transactions**, **Dashboard**, **Settings**, or **Guide**; the scripts depend on these names.

**Updating an existing spreadsheet (v26.1):**

1. Paste the updated script files and save (see **APPLY_PATCH_V26.1.md**).  
2. Reload the spreadsheet — **onOpen** runs an automatic upgrade when the version marker is behind **26.1** (requires **Transactions!A1** = `Date`).  
3. If anything looks stale: **Tracker → Apply fixes (keep data)** once.

For avoiding Google approval warnings, see **GOOGLE_COMPLIANCE_GUIDE.md**. For tests and edge cases, see **TESTING.md**. For opening sealed items before MVP3, see **TEMPORARY_WORKFLOW_OPEN_SEALED_BEFORE_MVP3.md**.
