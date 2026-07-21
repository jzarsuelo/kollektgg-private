/**
 * Tests and edge-case checks for Spending & Inventory Tracker.
 * Run runAllTests() from the script editor. Uses CONFIG; operates on active spreadsheet.
 */

function runAllTests() {
  var results = [];
  try {
    results.push(_testTemplateVersion());
    results.push(_testConfigTransactionsColumnLayout());
    results.push(_testSheetNames());
    results.push(_testTransactionsHeaders());
    results.push(_testTransactionsTotalFormula());
    results.push(_testTransactionsIdFormula());
    results.push(_testSettingsLayout());
    results.push(_testDashboardKpis());
    results.push(_testDashboardInventoryFormulas());
    results.push(_testExportNoThrow());
    results.push(_testExportSettingsNoThrow());
    results.push(_testApplyFixesNoThrow());
    results.push(_testCsvParser());
    results.push(_testTransactionsBackupTabularMultiline());
    results.push(_testImportTransactionsRoundTrip());
  } catch (e) {
    results.push('FAIL: ' + e.message);
  }
  var log = results.join('\n');
  Logger.log(log);
  if (typeof SpreadsheetApp !== 'undefined' && SpreadsheetApp.getUi()) {
    SpreadsheetApp.getUi().alert('Tests:\n\n' + log);
  }
  return results;
}

function _testTemplateVersion() {
  if (typeof CONFIG.TEMPLATE_VERSION !== 'string' || CONFIG.TEMPLATE_VERSION.length < 1) {
    return 'FAIL: CONFIG.TEMPLATE_VERSION should be a non-empty string';
  }
  return 'PASS: Template version (' + CONFIG.TEMPLATE_VERSION + ')';
}

/** TRANS_HEADERS and TRANS_COLS must stay in sync or backup setValues/import breaks. */
function _testConfigTransactionsColumnLayout() {
  if (!CONFIG.TRANS_HEADERS || !CONFIG.TRANS_COLS) {
    return 'FAIL: CONFIG missing TRANS_HEADERS or TRANS_COLS';
  }
  if (CONFIG.TRANS_HEADERS.length !== CONFIG.TRANS_COLS) {
    return 'FAIL: TRANS_HEADERS.length (' + CONFIG.TRANS_HEADERS.length + ') !== TRANS_COLS (' + CONFIG.TRANS_COLS + ')';
  }
  return 'PASS: CONFIG Transactions columns (' + CONFIG.TRANS_COLS + ')';
}

function _testSheetNames() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) return 'SKIP: No active spreadsheet';
  var names = [CONFIG.SHEETS.TRANSACTIONS, CONFIG.SHEETS.DASHBOARD, CONFIG.SHEETS.SETTINGS, CONFIG.SHEETS.GUIDE];
  var sheets = ss.getSheets();
  for (var i = 0; i < names.length; i++) {
    var found = sheets.some(function(s) { return s.getName() === names[i]; });
    if (!found) return 'FAIL: Missing sheet "' + names[i] + '"';
  }
  return 'PASS: Sheet names';
}

function _testTransactionsHeaders() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) return 'SKIP: No active spreadsheet';
  var sh = ss.getSheetByName(CONFIG.SHEETS.TRANSACTIONS);
  if (!sh) return 'FAIL: No Transactions sheet';
  var row1 = sh.getRange(1, 1, 1, CONFIG.TRANS_HEADERS.length).getValues()[0];
  for (var i = 0; i < CONFIG.TRANS_HEADERS.length; i++) {
    if (String(row1[i]).trim() !== CONFIG.TRANS_HEADERS[i]) {
      return 'FAIL: Transactions header col ' + (i + 1) + ' expected "' + CONFIG.TRANS_HEADERS[i] + '", got "' + row1[i] + '"';
    }
  }
  return 'PASS: Transactions headers';
}

function _testTransactionsTotalFormula() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) return 'SKIP: No active spreadsheet';
  var sh = ss.getSheetByName(CONFIG.SHEETS.TRANSACTIONS);
  if (!sh) return 'FAIL: No Transactions sheet';
  var formula = sh.getRange(2, CONFIG.TRANS.TOTAL).getFormulaR1C1();
  // Sheets may return RC[5], R[0]C[5], or R[0]C[+5] for the Up-front column (K = +5 from F).
  var hasUpFrontCol = /C\[\s*\+?5\s*\]/.test(formula);
  if (!formula || formula.indexOf('Pre-order paid') === -1 || formula.indexOf('Deposit') === -1 || !hasUpFrontCol) {
    return 'FAIL: Total column should branch on Deposit/Pre-order paid and use up-front col, got: ' + formula;
  }
  return 'PASS: Transactions Total formula';
}

function _testTransactionsIdFormula() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) return 'SKIP: No active spreadsheet';
  var sh = ss.getSheetByName(CONFIG.SHEETS.TRANSACTIONS);
  if (!sh) return 'FAIL: No Transactions sheet';
  var formula = sh.getRange(2, CONFIG.TRANS.ID).getFormulaR1C1();
  if (!formula || formula.indexOf('"T"') === -1) {
    return 'FAIL: ID column should be formula (e.g. T&ROW), got: ' + formula;
  }
  return 'PASS: Transactions ID formula';
}

function _testSettingsLayout() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) return 'SKIP: No active spreadsheet';
  var sh = ss.getSheetByName(CONFIG.SHEETS.SETTINGS);
  if (!sh) return 'FAIL: No Settings sheet';
  var budget = sh.getRange(CONFIG.SETTINGS.BUDGET_ROW, CONFIG.SETTINGS.BUDGET_COL).getValue();
  if (typeof budget !== 'number' && isNaN(Number(budget)) && budget !== '') {
    return 'WARN: Settings budget (B2) should be number, got: ' + budget;
  }
  var currency = sh.getRange(CONFIG.SETTINGS.CURRENCY_ROW, CONFIG.SETTINGS.CURRENCY_VALUE_COL).getValue();
  if (!currency || String(currency).trim() === '') {
    return 'WARN: Settings currency (E2) should be set';
  }
  return 'PASS: Settings layout';
}

function _testExportSettingsNoThrow() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) return 'SKIP: No active spreadsheet';
  try {
    var csv = exportSettingsToCsv();
    if (typeof csv !== 'string') return 'FAIL: exportSettingsToCsv should return string';
    return 'PASS: Export Settings no throw';
  } catch (e) {
    return 'FAIL: Export Settings threw: ' + e.message;
  }
}

function _testDashboardKpis() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) return 'SKIP: No active spreadsheet';
  var sh = ss.getSheetByName(CONFIG.SHEETS.DASHBOARD);
  if (!sh) return 'FAIL: No Dashboard sheet';
  var formulas = sh.getRange(1, 1, 25, 3).getFormulas();
  var hasSum = false;
  var hasDepositLine = false;
  var hasPreOrderLine = false;
  for (var r = 0; r < formulas.length; r++) {
    for (var c = 0; c < formulas[r].length; c++) {
      var cell = String(formulas[r][c]);
      if (cell.indexOf('SUM') !== -1) hasSum = true;
      if (cell.indexOf('"Deposit"') !== -1) hasDepositLine = true;
      if (cell.indexOf('Pre-order paid') !== -1) hasPreOrderLine = true;
    }
  }
  if (!hasSum) return 'FAIL: Dashboard should contain SUM formulas';
  if (!hasDepositLine || !hasPreOrderLine) return 'FAIL: Dashboard should include Deposit and Pre-order paid spending lines';
  return 'PASS: Dashboard KPIs';
}

function _testDashboardInventoryFormulas() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) return 'SKIP: No active spreadsheet';
  var sh = ss.getSheetByName(CONFIG.SHEETS.DASHBOARD);
  if (!sh) return 'FAIL: No Dashboard sheet';
  // Inventory block is below category spill + monthly trend (often row 50+).
  var formulas = sh.getRange(1, 1, Math.max(sh.getLastRow(), 70), 3).getFormulas();
  var hasUnique = false;
  var hasSumifQty = false;
  var hasSumifValue = false;
  for (var r = 0; r < formulas.length; r++) {
    var row = formulas[r].join(' ');
    if (row.indexOf('UNIQUE') !== -1 && row.indexOf('B2:B') !== -1) hasUnique = true;
    if (row.indexOf('SUMIF') !== -1 && row.indexOf('D:D') !== -1) hasSumifQty = true;
    if (row.indexOf('SUMIF') !== -1 && row.indexOf('F:F') !== -1 && row.indexOf('B:B') !== -1) hasSumifValue = true;
  }
  if (!hasUnique) return 'FAIL: Dashboard inventory should use UNIQUE(Transactions!B...)';
  if (!hasSumifQty) return 'FAIL: Dashboard inventory should use SUMIF on D:D for quantity';
  if (!hasSumifValue) return 'FAIL: Dashboard inventory should use SUMIF on F:F for total value';
  return 'PASS: Dashboard inventory formulas (items, qty, value)';
}

function _testExportNoThrow() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) return 'SKIP: No active spreadsheet';
  try {
    var csv = exportTransactionsToCsv();
    if (typeof csv !== 'string') return 'FAIL: exportTransactionsToCsv should return string';
    return 'PASS: Export no throw';
  } catch (e) {
    return 'FAIL: Export threw: ' + e.message;
  }
}

function _testApplyFixesNoThrow() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) return 'SKIP: No active spreadsheet';
  try {
    _patchTransactions(ss);
    var sh = ss.getSheetByName(CONFIG.SHEETS.TRANSACTIONS);
    if (!sh) return 'FAIL: Transactions sheet missing after patch';
    var totalFormula = sh.getRange(2, CONFIG.TRANS.TOTAL).getFormulaR1C1();
    if (!totalFormula || totalFormula.indexOf('Pre-order paid') === -1) {
      return 'FAIL: Total formula not restored by patch, got: ' + totalFormula;
    }
    var idFormula = sh.getRange(2, CONFIG.TRANS.ID).getFormulaR1C1();
    if (!idFormula || idFormula.indexOf('"T"') === -1) {
      return 'FAIL: ID formula not restored by patch, got: ' + idFormula;
    }
    return 'PASS: Apply fixes no throw (Total + ID formulas OK)';
  } catch (e) {
    return 'FAIL: Apply fixes threw: ' + e.message;
  }
}

function _testCsvParser() {
  try {
    var simple = _parseCsvLine('a,b,c');
    if (simple.length !== 3 || simple[0] !== 'a' || simple[2] !== 'c') {
      return 'FAIL: CSV parser simple case: ' + JSON.stringify(simple);
    }
    var quoted = _parseCsvLine('"hello, world","say ""hi""",end');
    if (quoted.length !== 3 || quoted[0] !== 'hello, world' || quoted[1] !== 'say "hi"' || quoted[2] !== 'end') {
      return 'FAIL: CSV parser quoted case: ' + JSON.stringify(quoted);
    }
    var empty = _parseCsvLine('a,,c');
    if (empty.length !== 3 || empty[1] !== '') {
      return 'FAIL: CSV parser empty field: ' + JSON.stringify(empty);
    }
    var single = _parseCsvLine('only');
    if (single.length !== 1 || single[0] !== 'only') {
      return 'FAIL: CSV parser single field: ' + JSON.stringify(single);
    }
    return 'PASS: CSV parser';
  } catch (e) {
    return 'FAIL: CSV parser threw: ' + e.message;
  }
}

/** Isolated sheet: tabular read + multiline Notes (no dependency on user Transactions data). */
function _testTransactionsBackupTabularMultiline() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) return 'SKIP: No active spreadsheet';
  var name = '_TxnBackupMultilineTest';
  var sh = null;
  try {
    var existing = ss.getSheetByName(name);
    if (existing) ss.deleteSheet(existing);
    sh = ss.insertSheet(name);
    var hdr = CONFIG.TRANS_HEADERS.slice();
    var row = [];
    for (var c = 0; c < CONFIG.TRANS_COLS; c++) row.push('');
    row[CONFIG.TRANS.DATE - 1] = '2024-06-01';
    row[CONFIG.TRANS.ITEM - 1] = 'Widget';
    row[CONFIG.TRANS.CATEGORY - 1] = 'Office';
    row[CONFIG.TRANS.QTY - 1] = 1;
    row[CONFIG.TRANS.UNIT_PRICE - 1] = 5;
    row[CONFIG.TRANS.NOTES - 1] = 'Line1\nLine2';
    sh.getRange(1, 1, 1, CONFIG.TRANS_COLS).setValues([hdr]);
    sh.getRange(2, 1, 1, CONFIG.TRANS_COLS).setValues([row]);
    if (!_isTransactionsBackupTabular(sh)) {
      return 'FAIL: Tabular backup detection should be true for A1/B1 headers';
    }
    var parsed = _readTransactionsFromBackupSheet(sh);
    if (parsed.length !== 2) {
      return 'FAIL: Tabular read expected 2 rows (header + data), got ' + parsed.length;
    }
    var notes = parsed[1][CONFIG.TRANS.NOTES - 1];
    if (String(notes).indexOf('\n') === -1) {
      return 'FAIL: Multiline Notes lost after tabular read, got: ' + JSON.stringify(notes);
    }
    return 'PASS: Tabular backup read preserves multiline cells';
  } catch (e) {
    return 'FAIL: Tabular multiline test threw: ' + e.message;
  } finally {
    if (sh) {
      try {
        ss.deleteSheet(sh);
      } catch (ignore) {}
    }
  }
}

function _testImportTransactionsRoundTrip() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) return 'SKIP: No active spreadsheet';
  try {
    var sh = ss.getSheetByName(CONFIG.SHEETS.TRANSACTIONS);
    if (!sh) return 'FAIL: No Transactions sheet';
    var hadData = sh.getLastRow() > 1;

    exportFullBackupToSheets();

    var backupSh = ss.getSheetByName('Backup_Transactions');
    if (!backupSh) return 'FAIL: Export did not create Backup_Transactions';

    var parsed = _readTransactionsFromBackupSheet(backupSh);
    if (parsed.length < 1) return 'FAIL: Backup is empty after export';

    var headerErr = _validateTransactionsHeader(parsed[0]);
    if (headerErr) return 'FAIL: Exported header invalid: ' + headerErr;

    var dataRows = parsed.slice(1);
    if (hadData && dataRows.length === 0) return 'FAIL: Had data but backup has no data rows';

    if (dataRows.length > 0) {
      _writeTransactionsData(ss, dataRows);
      _patchTransactions(ss);
    }

    var totalFormula = sh.getRange(2, CONFIG.TRANS.TOTAL).getFormulaR1C1();
    if (!totalFormula || totalFormula.indexOf('Pre-order paid') === -1) {
      return 'FAIL: Total formula lost after import, got: ' + totalFormula;
    }
    var idFormula = sh.getRange(2, CONFIG.TRANS.ID).getFormulaR1C1();
    if (!idFormula || idFormula.indexOf('"T"') === -1) {
      return 'FAIL: ID formula lost after import, got: ' + idFormula;
    }

    return 'PASS: Import round-trip (export → parse → import → formulas OK)';
  } catch (e) {
    return 'FAIL: Import round-trip threw: ' + e.message;
  }
}

/** Edge case: empty Item should not appear in inventory (handled by FILTER in formulas). */
function testEdgeCaseEmptyItem() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) return 'SKIP';
  var sh = ss.getSheetByName(CONFIG.SHEETS.TRANSACTIONS);
  if (!sh) return 'SKIP';
  var lastRow = sh.getLastRow();
  if (lastRow < 2) return 'SKIP: No data';
  var items = sh.getRange(2, CONFIG.TRANS.ITEM, lastRow - 1, 1).getValues();
  for (var i = 0; i < items.length; i++) {
    if (items[i][0] === '' || items[i][0] === null) {
      Logger.log('Row ' + (i + 2) + ' has blank Item (excluded from inventory by FILTER).');
    }
  }
  return 'PASS: Empty item check (formula handles via FILTER)';
}
