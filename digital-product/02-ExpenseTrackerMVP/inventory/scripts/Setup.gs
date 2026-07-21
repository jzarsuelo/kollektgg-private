/**
 * Call from trigger: set menu when spreadsheet opens.
 * Auto-upgrades sheet structure when TEMPLATE_VERSION is newer than stored marker.
 */
function onOpen() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (ss) {
    try {
      _maybeAutoUpgrade(ss);
    } catch (e) {
      Logger.log('onOpen upgrade: ' + e);
    }
  }
  SpreadsheetApp.getUi()
    .createMenu('Tracker')
    .addItem('Run setup (create/reset sheets)', 'runSetup')
    .addItem('Apply fixes (keep data)', 'applyFixes')
    .addSeparator()
    .addItem('Reset Transactions (clear data only)', 'resetTransactionsData')
    .addItem('Reset all (recreate sheets — confirm)', 'resetAllWithConfirm')
    .addSeparator()
    .addItem('Export Transactions to CSV sheet', 'exportTransactionsToSheet')
    .addItem('Export Settings to sheet', 'exportSettingsToSheet')
    .addItem('Export full backup (Transactions + Settings)', 'exportFullBackupToSheets')
    .addSeparator()
    .addItem('Import Transactions from backup sheet', 'importTransactionsFromSheet')
    .addItem('Import Settings from backup sheet', 'importSettingsFromSheet')
    .addItem('Import full backup (Transactions + Settings)', 'importFullBackupFromSheets')
    .addSeparator()
    .addItem('Run tests', 'runAllTests')
    .addToUi();
}

/** Writes current CONFIG.TEMPLATE_VERSION to document properties (after successful setup/fix/upgrade). */
function _setTrackerVersionMarker(ss) {
  PropertiesService.getDocumentProperties().setProperty('tracker_script_version', CONFIG.TEMPLATE_VERSION);
}

/**
 * Appends any missing default transaction types to Settings column C (does not remove or reorder existing).
 */
function _ensureSettingsTransactionTypes(ss) {
  var sh = ss.getSheetByName(CONFIG.SHEETS.SETTINGS);
  if (!sh) return;
  var c = CONFIG.SETTINGS;
  var defaults = CONFIG.DEFAULTS.TRANSACTION_TYPES;
  var existing = [];
  for (var row = c.TYPE_FIRST_ROW; row <= c.TYPE_LAST_ROW; row++) {
    var v = sh.getRange(row, c.TYPE_COL).getValue();
    var str = v === '' || v === null ? '' : String(v).trim();
    if (str === '') break;
    existing.push(str);
  }
  var toAdd = [];
  for (var i = 0; i < defaults.length; i++) {
    if (existing.indexOf(defaults[i]) === -1) {
      toAdd.push(defaults[i]);
    }
  }
  if (toAdd.length === 0) return;
  var nextRow = c.TYPE_FIRST_ROW + existing.length;
  for (var j = 0; j < toAdd.length && nextRow <= c.TYPE_LAST_ROW; j++) {
    sh.getRange(nextRow, c.TYPE_COL).setValue(toAdd[j]);
    nextRow++;
  }
}

/**
 * If document version differs from CONFIG.TEMPLATE_VERSION, merge Settings types and rebuild sheets/formulas.
 */
function _maybeAutoUpgrade(ss) {
  var props = PropertiesService.getDocumentProperties();
  var key = 'tracker_script_version';
  var target = CONFIG.TEMPLATE_VERSION;
  if (props.getProperty(key) === target) return;

  var tsh = ss.getSheetByName(CONFIG.SHEETS.TRANSACTIONS);
  if (!tsh) return;
  var headerOk = String(tsh.getRange(1, 1).getValue()).trim() === CONFIG.TRANS_HEADERS[0];
  if (!headerOk) return;

  _ensureSheets(ss);
  _ensureSettingsTransactionTypes(ss);
  _patchTransactions(ss);
  _setupDashboard(ss);
  _setupGuide(ss);
  _setTrackerVersionMarker(ss);
  try {
    ss.toast('Spending & Inventory Tracker updated to v' + target + '.', 'Tracker', 6);
  } catch (e) {
    Logger.log(e);
  }
}

/** Clears Transactions data (rows 2+) but keeps headers, formulas, and validation. */
function resetTransactionsData() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) return;
  var sh = ss.getSheetByName(CONFIG.SHEETS.TRANSACTIONS);
  if (!sh) {
    SpreadsheetApp.getUi().alert('Transactions sheet not found. Run setup first.');
    return;
  }
  var lastRow = sh.getLastRow();
  if (lastRow < 2) {
    SpreadsheetApp.getUi().alert('Transactions already empty.');
    return;
  }
  var numRows = lastRow - 1;
  // Clear user-editable columns only; preserve Total (F) and ID (J) formulas.
  sh.getRange(2, 1, numRows, 5).clearContent();  // A–E: Date, Item, Category, Qty, Unit Price
  sh.getRange(2, 7, numRows, 3).clearContent();   // G–I: Payment, Notes, Type
  sh.getRange(2, CONFIG.TRANS.UP_FRONT, numRows, 2).clearContent(); // K–L
  SpreadsheetApp.getUi().alert('Transactions data cleared (rows 2–' + lastRow + '). Headers, formulas, and validation kept.');
}

/** Asks for confirmation then runs full setup (recreates all three sheets). */
function resetAllWithConfirm() {
  var ui = SpreadsheetApp.getUi();
  var response = ui.alert('Reset all', 'This will recreate Transactions, Dashboard, Settings, and Guide. All data in those sheets will be lost. Continue?', ui.ButtonSet.YES_NO);
  if (response === ui.Button.YES) {
    runSetup();
  }
}

/**
 * Apply fixes to an existing spreadsheet without losing data.
 * Rebuilds Dashboard and Guide (no user data). Merges missing default transaction
 * types in Settings (column C only). Re-applies Transactions headers, formulas, validation.
 */
function applyFixes() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    throw new Error('No active spreadsheet.');
  }
  _ensureSheets(ss);
  _ensureSettingsTransactionTypes(ss);
  _patchTransactions(ss);
  _setupDashboard(ss);
  _setupGuide(ss);
  _setTrackerVersionMarker(ss);
  SpreadsheetApp.getUi().alert(
    'Fixes applied (template v' + CONFIG.TEMPLATE_VERSION + ').\n\n' +
    '• Dashboard — rebuilt.\n' +
    '• Transactions — headers, Total/ID formulas, validation refreshed.\n' +
    '• Settings — transaction types (column C) completed if any defaults were missing.\n' +
    '• Guide — refreshed.'
  );
}

/**
 * Re-applies Transactions headers, formulas (Total, ID), data validation,
 * and freeze without clearing user data. Also cleans up any stale content
 * or validation in columns beyond the canonical layout (from old spill bugs).
 */
function _patchTransactions(ss) {
  var sh = ss.getSheetByName(CONFIG.SHEETS.TRANSACTIONS);
  if (!sh) return;
  var numCols = CONFIG.TRANS_COLS;

  // Clean up columns beyond canonical layout (leftover from spill bugs)
  if (sh.getMaxColumns() > numCols) {
    var extraCols = sh.getMaxColumns() - numCols;
    var totalRows = sh.getMaxRows();
    sh.getRange(1, numCols + 1, totalRows, extraCols).clearContent();
    if (totalRows > 1) {
      sh.getRange(2, numCols + 1, totalRows - 1, extraCols).clearDataValidations();
    }
  }

  // Re-apply headers
  sh.getRange(1, 1, 1, numCols).setValues([CONFIG.TRANS_HEADERS]).setFontWeight('bold');

  // Total: Deposit / Pre-order paid use Up-front amount (K); else Qty*Unit price
  sh.getRange(2, CONFIG.TRANS.TOTAL, 1000, 1)
    .setFormulaR1C1('=IF(OR(RC[3]="Deposit",RC[3]="Pre-order paid"),IF(ISNUMBER(RC[5]),RC[5],""),IF(AND(ISNUMBER(RC[-2]),ISNUMBER(RC[-1])),RC[-2]*RC[-1],""))');

  // Re-apply ID formula (col J)
  sh.getRange(2, CONFIG.TRANS.ID, 1000, 1)
    .setFormulaR1C1('=IF(RC[-9]="","","T"&ROW())');

  // Re-apply data validation (requires Settings)
  var settingsSh = ss.getSheetByName(CONFIG.SHEETS.SETTINGS);
  if (settingsSh) {
    sh.getRange(2, CONFIG.TRANS.DATE, 1000, 1)
      .setDataValidation(SpreadsheetApp.newDataValidation().requireDate().setAllowInvalid(false).build());

    var catRange = settingsSh.getRange(CONFIG.SETTINGS.CATEGORIES_FIRST_ROW, CONFIG.SETTINGS.CATEGORIES_COL, CONFIG.SETTINGS.CATEGORIES_LAST_ROW - CONFIG.SETTINGS.CATEGORIES_FIRST_ROW + 1, 1);
    sh.getRange(2, CONFIG.TRANS.CATEGORY, 1000, 1)
      .setDataValidation(SpreadsheetApp.newDataValidation().requireValueInRange(catRange, true).setAllowInvalid(false).build());

    var payRange = settingsSh.getRange(CONFIG.SETTINGS.PAYMENT_FIRST_ROW, CONFIG.SETTINGS.PAYMENT_COL, CONFIG.SETTINGS.PAYMENT_LAST_ROW - CONFIG.SETTINGS.PAYMENT_FIRST_ROW + 1, 1);
    sh.getRange(2, CONFIG.TRANS.PAYMENT, 1000, 1)
      .setDataValidation(SpreadsheetApp.newDataValidation().requireValueInRange(payRange, true).setAllowInvalid(true).build());

    var typeRange = settingsSh.getRange(CONFIG.SETTINGS.TYPE_FIRST_ROW, CONFIG.SETTINGS.TYPE_COL, CONFIG.SETTINGS.TYPE_LAST_ROW - CONFIG.SETTINGS.TYPE_FIRST_ROW + 1, 1);
    sh.getRange(2, CONFIG.TRANS.TYPE, 1000, 1)
      .setDataValidation(SpreadsheetApp.newDataValidation().requireValueInRange(typeRange, true).setAllowInvalid(true).build());
  }

  sh.setFrozenRows(1);
  sh.setFrozenColumns(1);
  sh.autoResizeColumns(1, numCols);
}

/**
 * One-time setup: creates Transactions, Dashboard, Settings with headers,
 * data validation, and formulas. Safe to run on a blank spreadsheet.
 * Uses CONFIG (Config.gs). Only operates on active spreadsheet (reusable).
 */
function runSetup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    throw new Error('No active spreadsheet. Open the sheet and run from Extensions > Apps Script.');
  }
  _ensureSheets(ss);
  _setupSettings(ss);   // Before Transactions so dropdown ranges exist
  _setupTransactions(ss);
  _setupDashboard(ss);
  _setupGuide(ss);
  _setTrackerVersionMarker(ss);
  SpreadsheetApp.getUi().alert('Setup complete (template v' + CONFIG.TEMPLATE_VERSION + '). Check Transactions, Dashboard, Settings, and Guide.');
}

function _ensureSheets(ss) {
  var names = [
    CONFIG.SHEETS.TRANSACTIONS,
    CONFIG.SHEETS.DASHBOARD,
    CONFIG.SHEETS.SETTINGS,
    CONFIG.SHEETS.GUIDE
  ];
  var existing = ss.getSheets().map(function(s) { return s.getName(); });
  for (var i = 0; i < names.length; i++) {
    if (existing.indexOf(names[i]) === -1) {
      ss.insertSheet(names[i]);
    }
  }
  // Order: Transactions, Dashboard, Settings, Guide
  var t = ss.getSheetByName(CONFIG.SHEETS.TRANSACTIONS);
  var d = ss.getSheetByName(CONFIG.SHEETS.DASHBOARD);
  var s = ss.getSheetByName(CONFIG.SHEETS.SETTINGS);
  var g = ss.getSheetByName(CONFIG.SHEETS.GUIDE);
  if (t.getIndex() !== 1) { ss.setActiveSheet(t); ss.moveActiveSheet(1); }
  if (d.getIndex() !== 2) { ss.setActiveSheet(d); ss.moveActiveSheet(2); }
  if (s.getIndex() !== 3) { ss.setActiveSheet(s); ss.moveActiveSheet(3); }
  if (g.getIndex() !== 4) { ss.setActiveSheet(g); ss.moveActiveSheet(4); }
}

function _setupTransactions(ss) {
  var sh = ss.getSheetByName(CONFIG.SHEETS.TRANSACTIONS);
  sh.activate();
  sh.clear();
  var numCols = CONFIG.TRANS_COLS;
  var headers = CONFIG.TRANS_HEADERS;
  if (sh.getMaxColumns() > numCols) {
    sh.deleteColumns(numCols + 1, sh.getMaxColumns() - numCols);
  }
  sh.getRange(1, 1, 1, numCols).setValues([headers]).setFontWeight('bold');
  sh.getRange(2, CONFIG.TRANS.TOTAL, 1000, 1)
    .setFormulaR1C1('=IF(OR(RC[3]="Deposit",RC[3]="Pre-order paid"),IF(ISNUMBER(RC[5]),RC[5],""),IF(AND(ISNUMBER(RC[-2]),ISNUMBER(RC[-1])),RC[-2]*RC[-1],""))');
  sh.getRange(2, CONFIG.TRANS.ID, 1000, 1)
    .setFormulaR1C1('=IF(RC[-9]="","","T"&ROW())');
  var settingsSh = ss.getSheetByName(CONFIG.SHEETS.SETTINGS);
  var dateValidation = SpreadsheetApp.newDataValidation().requireDate().setAllowInvalid(false).build();
  sh.getRange(2, CONFIG.TRANS.DATE, 1000, 1).setDataValidation(dateValidation);
  var catRange = settingsSh.getRange(CONFIG.SETTINGS.CATEGORIES_FIRST_ROW, CONFIG.SETTINGS.CATEGORIES_COL, CONFIG.SETTINGS.CATEGORIES_LAST_ROW - CONFIG.SETTINGS.CATEGORIES_FIRST_ROW + 1, 1);
  sh.getRange(2, CONFIG.TRANS.CATEGORY, 1000, 1)
    .setDataValidation(SpreadsheetApp.newDataValidation().requireValueInRange(catRange, true).setAllowInvalid(false).build());
  var payRange = settingsSh.getRange(CONFIG.SETTINGS.PAYMENT_FIRST_ROW, CONFIG.SETTINGS.PAYMENT_COL, CONFIG.SETTINGS.PAYMENT_LAST_ROW - CONFIG.SETTINGS.PAYMENT_FIRST_ROW + 1, 1);
  sh.getRange(2, CONFIG.TRANS.PAYMENT, 1000, 1)
    .setDataValidation(SpreadsheetApp.newDataValidation().requireValueInRange(payRange, true).setAllowInvalid(true).build());
  var typeRange = settingsSh.getRange(CONFIG.SETTINGS.TYPE_FIRST_ROW, CONFIG.SETTINGS.TYPE_COL, CONFIG.SETTINGS.TYPE_LAST_ROW - CONFIG.SETTINGS.TYPE_FIRST_ROW + 1, 1);
  sh.getRange(2, CONFIG.TRANS.TYPE, 1000, 1)
    .setDataValidation(SpreadsheetApp.newDataValidation().requireValueInRange(typeRange, true).setAllowInvalid(true).build());
  sh.setFrozenRows(1);
  sh.setFrozenColumns(1);
  sh.autoResizeColumns(1, numCols);
}

function _setupSettings(ss) {
  var sh = ss.getSheetByName(CONFIG.SHEETS.SETTINGS);
  sh.activate();
  sh.clear();
  var c = CONFIG.SETTINGS;
  sh.getRange(1, 1).setValue('Setting');
  sh.getRange(1, 2).setValue('Value');
  sh.getRange(2, 1).setValue('Monthly budget');
  sh.getRange(2, 2).setValue(0).setNumberFormat('#,##0.00');
  sh.getRange(c.CURRENCY_ROW, c.CURRENCY_LABEL_COL).setValue('Currency');
  sh.getRange(c.CURRENCY_ROW, c.CURRENCY_VALUE_COL).setValue(CONFIG.DEFAULTS.CURRENCY);
  sh.getRange(c.CATEGORIES_HEADER_ROW, c.CATEGORIES_COL).setValue('Categories').setFontWeight('bold');
  sh.getRange(c.PAYMENT_HEADER_ROW, c.PAYMENT_COL).setValue('Payment methods').setFontWeight('bold');
  sh.getRange(c.TYPE_HEADER_ROW, c.TYPE_COL).setValue('Transaction types').setFontWeight('bold');
  var cats = CONFIG.DEFAULTS.CATEGORIES;
  var pays = CONFIG.DEFAULTS.PAYMENT_METHODS;
  var types = CONFIG.DEFAULTS.TRANSACTION_TYPES;
  for (var i = 0; i < cats.length; i++) {
    sh.getRange(c.CATEGORIES_FIRST_ROW + i, c.CATEGORIES_COL).setValue(cats[i]);
  }
  for (var j = 0; j < pays.length; j++) {
    sh.getRange(c.PAYMENT_FIRST_ROW + j, c.PAYMENT_COL).setValue(pays[j]);
  }
  for (var k = 0; k < types.length; k++) {
    sh.getRange(c.TYPE_FIRST_ROW + k, c.TYPE_COL).setValue(types[k]);
  }
  sh.autoResizeColumns(1, 5);
}

function _setupGuide(ss) {
  var sh = ss.getSheetByName(CONFIG.SHEETS.GUIDE);
  if (!sh) return;
  sh.activate();
  sh.clear();
  var content = [
    ['How to use this tracker'],
    ['Template version ' + CONFIG.TEMPLATE_VERSION],
    [''],
    ['• Transactions — Fill Date, Item, Category; Total is calculated. Type: Purchase (or blank) = normal buy + inventory; Income = earning; Deposit = partial pre-order (Up-front amount col K); Pre-order paid = paid in full before receipt (K). When stock arrives for Pre-order paid, change to Purchase, enter Qty and Unit price, clear K.'],
    ['• Pre-order deposit + balance — Row 1: Deposit + Up-front amount; copy ID (J). Row 2: Purchase with balance as Qty×Unit price; Linked deposit ID (L) = that ID.'],
    ['• Updates — Reopen the workbook or use Tracker → Apply fixes after a script update; missing transaction types are added to Settings (column C) automatically.'],
    ['• Dashboard — Total Spent, Spending breakdown (Purchases / Deposits / Prepaid), Earned, Profit, This month, Budget, Spending by category, Monthly trend, Inventory. Do not type in the Dashboard.'],
    ['• Settings — Set Monthly budget (B2), Currency (E2), and the lists: Categories (A), Payment methods (B), Transaction types (C). These feed the dropdowns in Transactions.'],
    ['• Apply fixes — Tracker menu: "Apply fixes (keep data)" updates Dashboard formulas, Transactions structure, and Guide without losing your data or Settings. Use after updating the script code.'],
    ['• Reset — "Reset Transactions" clears user columns (including K–L) but keeps Total and ID formulas; "Reset all" recreates all sheets (confirm first).'],
    ['• Export — Tracker menu: Export Transactions or Settings to a sheet; "Export full backup" writes both for backup/restore.'],
    ['• Import — Tracker menu: Import Transactions, Settings, or full backup from the backup sheets. Replaces existing data; Total and ID formulas recalculate automatically.'],
    ['• Reuse — Make a copy of the workbook, then change only Settings and clear or replace Transactions data. Do not rename sheet tabs.'],
    [''],
    ['Data as of: (Dashboard shows snapshot when you open it.)']
  ];
  for (var r = 0; r < content.length; r++) {
    sh.getRange(r + 1, 1).setValue(content[r][0]);
    if (r === 0) sh.getRange(r + 1, 1).setFontSize(14).setFontWeight('bold');
    if (r === 1) sh.getRange(r + 1, 1).setFontSize(10).setFontColor('#5f6368');
  }
  sh.autoResizeColumn(1);
}

function _setupDashboard(ss) {
  var sh = ss.getSheetByName(CONFIG.SHEETS.DASHBOARD);
  sh.activate();
  sh.clear();
  var t = CONFIG.SHEETS.TRANSACTIONS;
  var s = CONFIG.SHEETS.SETTINGS;
  var row = 1;
  sh.getRange(row, 1).setValue('Spending & Inventory Overview').setFontSize(14).setFontWeight('bold');
  row++;
  sh.getRange(row, 1)
    .setValue('Template version ' + CONFIG.TEMPLATE_VERSION)
    .setFontSize(10)
    .setFontColor('#5f6368');
  row++;
  sh.getRange(row, 1).setValue('Data as of:').setFontStyle('italic');
  sh.getRange(row, 2).setFormula('=TODAY()').setNumberFormat('yyyy-mm-dd');
  row += 2;
  var spendAll =
    'SUMIF(' + t + '!I:I,"Purchase",' + t + '!F:F)+SUMIF(' + t + '!I:I,"",' + t + '!F:F)+SUMIF(' + t + '!I:I,"Deposit",' + t + '!F:F)+SUMIF(' + t + '!I:I,"Pre-order paid",' + t + '!F:F)';
  var spendMonth =
    'SUMIFS(' + t + '!F:F,' + t + '!I:I,"Purchase",' + t + '!A:A,">="&DATE(YEAR(TODAY()),MONTH(TODAY()),1),' + t + '!A:A,"<="&EOMONTH(TODAY(),0))' +
    '+SUMIFS(' + t + '!F:F,' + t + '!I:I,"",' + t + '!A:A,">="&DATE(YEAR(TODAY()),MONTH(TODAY()),1),' + t + '!A:A,"<="&EOMONTH(TODAY(),0))' +
    '+SUMIFS(' + t + '!F:F,' + t + '!I:I,"Deposit",' + t + '!A:A,">="&DATE(YEAR(TODAY()),MONTH(TODAY()),1),' + t + '!A:A,"<="&EOMONTH(TODAY(),0))' +
    '+SUMIFS(' + t + '!F:F,' + t + '!I:I,"Pre-order paid",' + t + '!A:A,">="&DATE(YEAR(TODAY()),MONTH(TODAY()),1),' + t + '!A:A,"<="&EOMONTH(TODAY(),0))';
  sh.getRange(row, 1).setValue('Total Spent');
  sh.getRange(row, 2).setFormula('=' + spendAll);
  row++;
  sh.getRange(row, 1).setValue('Total Earned');
  sh.getRange(row, 2).setFormula('=SUMIF(' + t + '!I:I,"Income",' + t + '!F:F)');
  row++;
  sh.getRange(row, 1).setValue('Profit');
  sh.getRange(row, 2).setFormula('=B' + (row - 1) + '-B' + (row - 2) + '');
  row++;
  var rowThisMonthSpent = row;
  sh.getRange(row, 1).setValue('This Month (spent)');
  sh.getRange(row, 2).setFormula('=' + spendMonth);
  row++;
  sh.getRange(row, 1).setValue('Earned this month');
  sh.getRange(row, 2).setFormula('=SUMIFS(' + t + '!F:F,' + t + '!I:I,"Income",' + t + '!A:A,">="&DATE(YEAR(TODAY()),MONTH(TODAY()),1),' + t + '!A:A,"<="&EOMONTH(TODAY(),0))');
  row++;
  sh.getRange(row, 1).setValue('Budget Left');
  sh.getRange(row, 2).setFormula('=' + s + '!B2-B' + rowThisMonthSpent + '');
  row++;
  row++;
  sh.getRange(row, 1).setValue('Spending breakdown').setFontWeight('bold');
  row++;
  sh.getRange(row, 2).setValue('All time');
  sh.getRange(row, 3).setValue('This month');
  row++;
  var brFirst = row;
  sh.getRange(row, 1).setValue('Purchases');
  sh.getRange(row, 2).setFormula('=SUMIF(' + t + '!I:I,"Purchase",' + t + '!F:F)+SUMIF(' + t + '!I:I,"",' + t + '!F:F)');
  sh.getRange(row, 3).setFormula(
    '=SUMIFS(' + t + '!F:F,' + t + '!I:I,"Purchase",' + t + '!A:A,">="&DATE(YEAR(TODAY()),MONTH(TODAY()),1),' + t + '!A:A,"<="&EOMONTH(TODAY(),0))' +
      '+SUMIFS(' + t + '!F:F,' + t + '!I:I,"",' + t + '!A:A,">="&DATE(YEAR(TODAY()),MONTH(TODAY()),1),' + t + '!A:A,"<="&EOMONTH(TODAY(),0))'
  );
  row++;
  sh.getRange(row, 1).setValue('Deposits');
  sh.getRange(row, 2).setFormula('=SUMIF(' + t + '!I:I,"Deposit",' + t + '!F:F)');
  sh.getRange(row, 3).setFormula(
    '=SUMIFS(' + t + '!F:F,' + t + '!I:I,"Deposit",' + t + '!A:A,">="&DATE(YEAR(TODAY()),MONTH(TODAY()),1),' + t + '!A:A,"<="&EOMONTH(TODAY(),0))'
  );
  row++;
  sh.getRange(row, 1).setValue('Prepaid (pre-order paid)');
  sh.getRange(row, 2).setFormula('=SUMIF(' + t + '!I:I,"Pre-order paid",' + t + '!F:F)');
  sh.getRange(row, 3).setFormula(
    '=SUMIFS(' + t + '!F:F,' + t + '!I:I,"Pre-order paid",' + t + '!A:A,">="&DATE(YEAR(TODAY()),MONTH(TODAY()),1),' + t + '!A:A,"<="&EOMONTH(TODAY(),0))'
  );
  row++;
  var brLast = row - 1;
  sh.getRange(row, 1).setValue('Sum (check vs Total Spent / This Month)');
  sh.getRange(row, 2).setFormula('=SUM(B' + brFirst + ':B' + brLast + ')');
  sh.getRange(row, 3).setFormula('=SUM(C' + brFirst + ':C' + brLast + ')');
  row++;
  row++;
  var typeSpend = '(' + t + '!I2:I="Purchase")+(' + t + '!I2:I="")+(' + t + '!I2:I="Deposit")+(' + t + '!I2:I="Pre-order paid")';
  var categoryFilter = 'FILTER(' + t + '!C2:C,(' + t + '!C2:C<>"")*(' + typeSpend + '))';
  sh.getRange(row, 1).setValue('Spending by Category').setFontWeight('bold');
  row++;
  sh.getRange(row, 1).setValue('Category');
  sh.getRange(row, 2).setValue('Total');
  row++;
  sh.getRange(row, 1).setFormula('=UNIQUE(' + categoryFilter + ')');
  sh.getRange(row, 2).setFormula(
    '=BYROW(UNIQUE(' + categoryFilter + '),LAMBDA(cat,' +
      'SUMIFS(' + t + '!F:F,' + t + '!C:C,cat,' + t + '!I:I,"Purchase")+SUMIFS(' + t + '!F:F,' + t + '!C:C,cat,' + t + '!I:I,"")+' +
      'SUMIFS(' + t + '!F:F,' + t + '!C:C,cat,' + t + '!I:I,"Deposit")+SUMIFS(' + t + '!F:F,' + t + '!C:C,cat,' + t + '!I:I,"Pre-order paid")' +
      '))'
  );
  row += 22;
  sh.getRange(row, 1).setValue('Monthly Trend (last 6 months)').setFontWeight('bold');
  row++;
  sh.getRange(row, 1).setValue('Month');
  sh.getRange(row, 2).setValue('Spent');
  row++;
  sh.getRange(row, 1).setFormula('=BYROW(SEQUENCE(6,1,0),LAMBDA(i,TEXT(DATE(YEAR(TODAY()),MONTH(TODAY())-i,1),"YYYY-MM")))');
  sh.getRange(row, 2).setFormula(
    '=BYROW(SEQUENCE(6,1,0),LAMBDA(i,' +
      'SUMIFS(' + t + '!F:F,' + t + '!I:I,"Purchase",' + t + '!A:A,">="&DATE(YEAR(TODAY()),MONTH(TODAY())-i,1),' + t + '!A:A,"<="&EOMONTH(DATE(YEAR(TODAY()),MONTH(TODAY())-i,1),0))+' +
      'SUMIFS(' + t + '!F:F,' + t + '!I:I,"",' + t + '!A:A,">="&DATE(YEAR(TODAY()),MONTH(TODAY())-i,1),' + t + '!A:A,"<="&EOMONTH(DATE(YEAR(TODAY()),MONTH(TODAY())-i,1),0))+' +
      'SUMIFS(' + t + '!F:F,' + t + '!I:I,"Deposit",' + t + '!A:A,">="&DATE(YEAR(TODAY()),MONTH(TODAY())-i,1),' + t + '!A:A,"<="&EOMONTH(DATE(YEAR(TODAY()),MONTH(TODAY())-i,1),0))+' +
      'SUMIFS(' + t + '!F:F,' + t + '!I:I,"Pre-order paid",' + t + '!A:A,">="&DATE(YEAR(TODAY()),MONTH(TODAY())-i,1),' + t + '!A:A,"<="&EOMONTH(DATE(YEAR(TODAY()),MONTH(TODAY())-i,1),0))' +
      '))'
  );
  row += 8;
  sh.getRange(row, 1).setValue('Inventory').setFontWeight('bold');
  row++;
  sh.getRange(row, 1).setValue('Item');
  sh.getRange(row, 2).setValue('Quantity');
  sh.getRange(row, 3).setValue('Total Value');
  row++;
  var inventoryFilter = 'FILTER(' + t + '!B2:B,(' + t + '!B2:B<>"")*((' + t + '!I2:I="Purchase")+(' + t + '!I2:I="")))';
  sh.getRange(row, 1).setFormula('=UNIQUE(' + inventoryFilter + ')');
  sh.getRange(row, 2).setFormula('=BYROW(UNIQUE(' + inventoryFilter + '),LAMBDA(item,SUMIFS(' + t + '!D:D,' + t + '!B:B,item,' + t + '!I:I,"Purchase")+SUMIFS(' + t + '!D:D,' + t + '!B:B,item,' + t + '!I:I,"")))');
  sh.getRange(row, 3).setFormula('=BYROW(UNIQUE(' + inventoryFilter + '),LAMBDA(item,SUMIFS(' + t + '!F:F,' + t + '!B:B,item,' + t + '!I:I,"Purchase")+SUMIFS(' + t + '!F:F,' + t + '!B:B,item,' + t + '!I:I,"")))');
  sh.getRange(row - 2, 1, 3, 3).setBorder(true, true, true, true, true, true);
  sh.autoResizeColumns(1, 3);
}
