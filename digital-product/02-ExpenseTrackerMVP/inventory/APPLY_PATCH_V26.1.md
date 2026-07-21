# Apply spreadsheet update to template version 26.1

Version numbers are **year-based**: **26.1** = first release track for **2026** (YY.minor). Bump **26.2** for another 2026 release, or **27.1** when the annual track advances.

This guide is for anyone who already uses the Spending & Inventory Tracker and is updating the Apps Script from an **older template version** (e.g. legacy **1.0** / **1.1** or any prior `CONFIG.TEMPLATE_VERSION`) to **26.1**.

## What 26.1 includes

- **Transactions:** Columns **K** (Up-front amount) and **L** (Linked deposit ID); types **Deposit** and **Pre-order paid**; **Total** uses column **K** for those types.
- **Settings:** Default transaction types are **merged automatically** if they are missing (nothing to type by hand).
- **Dashboard:** **Spending breakdown** (Purchases / Deposits / Prepaid), and KPIs include all cash-out types.
- **No manual Settings edit** is required for the new types after you deploy the script (see below).

## Prerequisites

- Google account and edit access to the spreadsheet.
- The workbook should already have been set up once (**Transactions** row 1 header **Date** in column A). If this is a brand-new blank sheet, use **Tracker → Run setup** instead of relying only on open.

## Steps (recommended)

1. **Open the spreadsheet** in the browser.
2. Go to **Extensions → Apps Script**.
3. Replace the project files with the current repo versions:
   - `Config.gs`
   - `Setup.gs`
   - `ExportImport.gs`
   - `Tests.gs`
   - `appsscript.json` (keep the `spreadsheets` scope)
4. Click **Save** (disk icon).
5. **Close the Apps Script tab** and **reload the spreadsheet** (refresh the page), or close and reopen the file.

On reload, the script runs **`onOpen`**. If the stored version is older than **26.1**, it will automatically:

- Ensure tabs exist,
- Append missing default transaction types in **Settings** column **C**,
- Refresh **Transactions** formulas and validation,
- Rebuild **Dashboard** and **Guide**,

and show a short **toast**: updated to v26.1.

6. **Optional check:** Open **Guide** — line 2 should show **Template version 26.1**. **Dashboard** should show **Template version 26.1** under the title.
7. **Optional:** **Tracker → Run tests** — all lines should report PASS (run from a spreadsheet that already has the four tabs).

## If automatic update does not run

- Use **Tracker → Apply fixes (keep data)** once. That performs the same merge and rebuilds, and sets the internal version marker to **26.1**.

## After importing an old backup

- **Import full backup** or **Import Settings** already re-merges types and refreshes **Transactions** validation where applicable; full import also rebuilds **Dashboard** and **Guide** and sets the version marker.

## Version marker (technical)

The script stores `tracker_script_version` in **Document properties** (per spreadsheet). It equals **`CONFIG.TEMPLATE_VERSION`** in `Config.gs` (currently **26.1**). When you ship a newer release, change that constant (e.g. **26.2** or **27.1**); the next open or **Apply fixes** will migrate again.

## Troubleshooting

| Issue | What to do |
|--------|------------|
| **Tracker** menu missing | Reload the sheet; open **Extensions → Apps Script** and run **`onOpen`** once from the editor (not usually needed). |
| Type dropdown still wrong | **Tracker → Apply fixes** once. |
| Authorization prompt | Approve **spreadsheets** access for the script (see **GOOGLE_COMPLIANCE_GUIDE.md** if you hit verification warnings). |
| Blank workbook, never ran setup | **Tracker → Run setup** — do not expect auto-upgrade until **Date** is in **Transactions!A1**. |

For day-to-day usage after the patch, see **README.md**.
