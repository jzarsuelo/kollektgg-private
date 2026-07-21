/**
 * Export and Import for Spending & Inventory Tracker.
 * Reusable: uses CONFIG, operates on active spreadsheet only.
 * REQUIREMENTS: §10.2 Data migratability — Date YYYY-MM-DD, UTF-8, column order.
 */

/**
 * Exports Transactions sheet to CSV string (UTF-8). Header row + data.
 * Total column exported as value (number), not formula, for portability.
 */
function exportTransactionsToCsv() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) return '';
  var sh = ss.getSheetByName(CONFIG.SHEETS.TRANSACTIONS);
  if (!sh) return '';
  var lastRow = Math.max(sh.getLastRow(), 1);
  var lastCol = CONFIG.TRANS_COLS;
  var range = sh.getRange(1, 1, lastRow, lastCol);
  var values = range.getValues();
  var displayValues = range.getDisplayValues();
  var rows = [];
  for (var r = 0; r < displayValues.length; r++) {
    var row = displayValues[r];
    if (r > 0 && row[CONFIG.TRANS.DATE - 1] === '' && row[CONFIG.TRANS.ITEM - 1] === '') continue;
    var out = [];
    for (var c = 0; c < row.length; c++) {
      var cell = displayValues[r][c];
      if (c === CONFIG.TRANS.DATE - 1 && values[r][c] instanceof Date) {
        cell = _formatDateIso(values[r][c]);
      }
      out.push(_csvEscape(cell));
    }
    rows.push(out.join(','));
  }
  return rows.join('\r\n');
}

/** Format date as YYYY-MM-DD for export. */
function _formatDateIso(date) {
  var y = date.getFullYear();
  var m = date.getMonth() + 1;
  var d = date.getDate();
  return y + '-' + (m < 10 ? '0' : '') + m + '-' + (d < 10 ? '0' : '') + d;
}

function _csvEscape(val) {
  if (val === null || val === undefined) return '';
  var s = String(val);
  if (s.indexOf(',') !== -1 || s.indexOf('"') !== -1 || s.indexOf('\n') !== -1 || s.indexOf('\r') !== -1) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

/**
 * Builds a 2D table for sheet backup: row 1 = CONFIG.TRANS_HEADERS, then data rows.
 * One spreadsheet row = one transaction (newlines inside Notes/Item are safe). Mirrors
 * exportTransactionsToCsv row filtering (skips blank Date+Item data rows).
 */
function _buildTransactionsBackupTable(transactionsSheet) {
  var lastRow = Math.max(transactionsSheet.getLastRow(), 1);
  var lastCol = CONFIG.TRANS_COLS;
  var range = transactionsSheet.getRange(1, 1, lastRow, lastCol);
  var values = range.getValues();
  var displayValues = range.getDisplayValues();
  var rows = [CONFIG.TRANS_HEADERS.slice()];
  for (var r = 1; r < displayValues.length; r++) {
    var dRow = displayValues[r];
    if (dRow[CONFIG.TRANS.DATE - 1] === '' && dRow[CONFIG.TRANS.ITEM - 1] === '') continue;
    var out = [];
    for (var c = 0; c < lastCol; c++) {
      var vRaw = values[r][c];
      var vDisp = displayValues[r][c];
      if (c === CONFIG.TRANS.DATE - 1 && vRaw instanceof Date) {
        out.push(_formatDateIso(vRaw));
      } else if (c === CONFIG.TRANS.TOTAL - 1 || c === CONFIG.TRANS.ID - 1) {
        out.push(vDisp);
      } else if (typeof vRaw === 'number' && !isNaN(vRaw)) {
        out.push(vRaw);
      } else if (vRaw instanceof Date) {
        out.push(_formatDateIso(vRaw));
      } else {
        out.push(vRaw === null || vRaw === undefined ? '' : vRaw);
      }
    }
    rows.push(out);
  }
  return rows;
}

/**
 * True if backup sheet is tabular (A1=Date, B1=Item), not legacy one-CSV-line-per-row in column A.
 */
function _isTransactionsBackupTabular(sh) {
  if (sh.getLastColumn() < 2) return false;
  var a1 = String(sh.getRange(1, 1).getValue()).trim();
  var b1 = String(sh.getRange(1, 2).getValue()).trim();
  return a1 === CONFIG.TRANS_HEADERS[0] && b1 === CONFIG.TRANS_HEADERS[1];
}

/**
 * Reads tabular Backup_Transactions / Export_CSV (columns A–L). Same logical shape as _readCsvFromSheet.
 */
function _readTransactionsTabularFromSheet(sh) {
  var lastRow = sh.getLastRow();
  if (lastRow < 1) return [];
  var block = sh.getRange(1, 1, lastRow, CONFIG.TRANS_COLS).getValues();
  var rows = [];
  for (var r = 0; r < block.length; r++) {
    var row = block[r];
    var padded = [];
    for (var c = 0; c < CONFIG.TRANS_COLS; c++) {
      padded.push(c < row.length ? row[c] : '');
    }
    if (r === 0) {
      rows.push(padded.map(function(cell) { return String(cell).trim(); }));
      continue;
    }
    var d = padded[CONFIG.TRANS.DATE - 1];
    var item = padded[CONFIG.TRANS.ITEM - 1];
    var dateEmpty = d === '' || d === null;
    var itemEmpty = item === '' || item === null;
    if (dateEmpty && itemEmpty) continue;
    rows.push(padded);
  }
  return rows;
}

/**
 * Reads Transactions backup from sheet: tabular A–L (preferred) or legacy column-A CSV lines.
 */
function _readTransactionsFromBackupSheet(sh) {
  if (_isTransactionsBackupTabular(sh)) {
    return _readTransactionsTabularFromSheet(sh);
  }
  return _readCsvFromSheet(sh);
}

/**
 * Writes Transactions to sheet "Export_CSV" as tabular A–L (same layout as Backup_Transactions).
 * Preserves newlines inside cells; File > Download as CSV still produces valid RFC-style CSV.
 */
function exportTransactionsToSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) return;
  var name = 'Export_CSV';
  var sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  sh.clear();
  var trans = ss.getSheetByName(CONFIG.SHEETS.TRANSACTIONS);
  if (!trans) {
    SpreadsheetApp.getUi().alert('Transactions sheet not found.');
    return;
  }
  var table = _buildTransactionsBackupTable(trans);
  if (table.length > 0) {
    sh.getRange(1, 1, table.length, CONFIG.TRANS_COLS).setValues(table);
    sh.autoResizeColumns(1, CONFIG.TRANS_COLS);
  }
  var dataRows = Math.max(table.length - 1, 0);
  SpreadsheetApp.getUi().alert('Exported ' + dataRows + ' data rows to sheet "' + name + '" (columns A–L). Use File > Download, or copy the range for a CSV tool. Multiline text in cells is preserved.');
}

/**
 * Exports Settings sheet to CSV string (budget, currency, categories, payment, types).
 */
function exportSettingsToCsv() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) return '';
  var sh = ss.getSheetByName(CONFIG.SHEETS.SETTINGS);
  if (!sh) return '';
  var lastRow = Math.max(sh.getLastRow(), 1);
  var lastCol = 5;
  var range = sh.getRange(1, 1, lastRow, lastCol);
  var values = range.getValues();
  var rows = [];
  for (var r = 0; r < values.length; r++) {
    var out = [];
    for (var c = 0; c < values[r].length; c++) {
      var cell = values[r][c];
      if (cell instanceof Date) cell = _formatDateIso(cell);
      out.push(_csvEscape(cell));
    }
    rows.push(out.join(','));
  }
  return rows.join('\r\n');
}

/**
 * Writes Settings to sheet "Export_Settings" as raw values (columns A–E), matching Backup_Settings.
 * Avoids splitting on newlines inside cells (legacy single-column CSV lines could corrupt that).
 */
function exportSettingsToSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) return;
  var setSh = ss.getSheetByName(CONFIG.SHEETS.SETTINGS);
  if (!setSh) {
    SpreadsheetApp.getUi().alert('Settings sheet not found.');
    return;
  }
  var name = 'Export_Settings';
  var sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  sh.clear();
  var lastRow = Math.max(setSh.getLastRow(), 1);
  var lastCol = 5;
  var vals = setSh.getRange(1, 1, lastRow, lastCol).getValues();
  sh.getRange(1, 1, lastRow, lastCol).setValues(vals);
  sh.autoResizeColumns(1, lastCol);
  SpreadsheetApp.getUi().alert('Exported Settings to sheet "' + name + '" (columns A–E). Download the sheet as CSV or copy the range if you need a file.');
}

/**
 * Writes full backup: Transactions as tabular rows (A–L) on "Backup_Transactions", Settings on "Backup_Settings".
 * Tabular format keeps newlines inside cells from splitting into fake rows (legacy column-A CSV could not).
 */
function exportFullBackupToSheets() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) return;
  var transSrc = ss.getSheetByName(CONFIG.SHEETS.TRANSACTIONS);
  var transSh = ss.getSheetByName('Backup_Transactions');
  if (!transSh) transSh = ss.insertSheet('Backup_Transactions');
  transSh.clear();
  if (transSrc) {
    var transTable = _buildTransactionsBackupTable(transSrc);
    if (transTable.length > 0) {
      transSh.getRange(1, 1, transTable.length, CONFIG.TRANS_COLS).setValues(transTable);
      transSh.autoResizeColumns(1, CONFIG.TRANS_COLS);
    }
  }
  var setSh = ss.getSheetByName(CONFIG.SHEETS.SETTINGS);
  var backupSetSh = ss.getSheetByName('Backup_Settings');
  if (!backupSetSh) backupSetSh = ss.insertSheet('Backup_Settings');
  backupSetSh.clear();
  if (setSh) {
    var lastRow = Math.max(setSh.getLastRow(), 1);
    var lastCol = 5;
    var setRange = setSh.getRange(1, 1, lastRow, lastCol);
    backupSetSh.getRange(1, 1, lastRow, lastCol).setValues(setRange.getValues());
    backupSetSh.autoResizeColumns(1, lastCol);
  }
  SpreadsheetApp.getUi().alert('Full backup written to sheets "Backup_Transactions" and "Backup_Settings". Download or copy as needed.');
}

// ---------------------------------------------------------------------------
// Import
// ---------------------------------------------------------------------------

/**
 * Parses a CSV line into an array of field values.
 * Handles quoted fields with commas, escaped quotes (""), and empty fields.
 */
function _parseCsvLine(line) {
  var fields = [];
  var i = 0;
  var len = line.length;
  while (i <= len) {
    if (i === len) { fields.push(''); break; }
    if (line[i] === '"') {
      var val = '';
      i++;
      while (i < len) {
        if (line[i] === '"') {
          if (i + 1 < len && line[i + 1] === '"') {
            val += '"';
            i += 2;
          } else {
            i++;
            break;
          }
        } else {
          val += line[i];
          i++;
        }
      }
      fields.push(val);
      if (i < len && line[i] === ',') i++;
    } else {
      var next = line.indexOf(',', i);
      if (next === -1) {
        fields.push(line.substring(i));
        break;
      } else {
        fields.push(line.substring(i, next));
        i = next + 1;
      }
    }
  }
  return fields;
}

/**
 * Finds the backup sheet to import Transactions from.
 * Tries Backup_Transactions first, then Export_CSV.
 */
function _findTransactionsBackupSheet(ss) {
  var sh = ss.getSheetByName('Backup_Transactions');
  if (sh) return sh;
  return ss.getSheetByName('Export_CSV');
}

/**
 * Reads CSV lines from a sheet where each row in column A is one CSV line.
 * Returns a 2D array of parsed field values (strings). Skips empty rows.
 */
function _readCsvFromSheet(sh) {
  var lastRow = sh.getLastRow();
  if (lastRow < 1) return [];
  var raw = sh.getRange(1, 1, lastRow, 1).getValues();
  var rows = [];
  for (var r = 0; r < raw.length; r++) {
    var line = String(raw[r][0]).trim();
    if (line === '') continue;
    rows.push(_parseCsvLine(line));
  }
  return rows;
}

/**
 * Validates that a parsed header row matches the canonical Transactions headers.
 * Checks at least the first 5 required columns (Date, Item, Category, Qty, Unit Price).
 * Returns an error message string, or '' if valid.
 */
function _validateTransactionsHeader(headerFields) {
  var expected = CONFIG.TRANS_HEADERS;
  var minCols = 5;
  if (headerFields.length < minCols) {
    return 'Header has only ' + headerFields.length + ' columns, need at least ' + minCols + '.';
  }
  for (var i = 0; i < minCols; i++) {
    if (headerFields[i].trim() !== expected[i]) {
      return 'Column ' + (i + 1) + ' expected "' + expected[i] + '", got "' + headerFields[i].trim() + '".';
    }
  }
  return '';
}

/**
 * Imports Transactions from a backup sheet (Backup_Transactions or Export_CSV).
 * Replaces existing Transactions data. Preserves Total and ID formulas.
 * Menu entry point.
 */
function importTransactionsFromSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) return;
  var ui = SpreadsheetApp.getUi();

  var srcSh = _findTransactionsBackupSheet(ss);
  if (!srcSh) {
    ui.alert('No backup sheet found.\n\nLooking for "Backup_Transactions" or "Export_CSV". Export first, or copy a backup sheet into this workbook.');
    return;
  }

  var parsed = _readTransactionsFromBackupSheet(srcSh);
  if (parsed.length < 1) {
    ui.alert('Backup sheet "' + srcSh.getName() + '" is empty.');
    return;
  }

  var headerErr = _validateTransactionsHeader(parsed[0]);
  if (headerErr) {
    ui.alert('Header mismatch in "' + srcSh.getName() + '".\n\n' + headerErr + '\n\nExpected: ' + CONFIG.TRANS_HEADERS.slice(0, 5).join(', ') + ', ...');
    return;
  }

  var dataRows = parsed.slice(1);
  if (dataRows.length === 0) {
    ui.alert('Backup has a header but no data rows. Nothing to import.');
    return;
  }

  var confirm = ui.alert('Import Transactions',
    'Import ' + dataRows.length + ' rows from "' + srcSh.getName() + '"?\n\nThis will replace existing Transactions data.',
    ui.ButtonSet.YES_NO);
  if (confirm !== ui.Button.YES) return;

  _writeTransactionsData(ss, dataRows);
  _patchTransactions(ss);
  _setTrackerVersionMarker(ss);

  ui.alert('Imported ' + dataRows.length + ' rows into Transactions from "' + srcSh.getName() + '".');
}

/**
 * Writes parsed CSV data rows into the Transactions sheet.
 * Only writes user-editable columns (A–E, G–I, K–L); skips F (Total) and J (ID)
 * so the existing formulas recalculate. Clears old data first.
 */
function _writeTransactionsData(ss, dataRows) {
  var sh = ss.getSheetByName(CONFIG.SHEETS.TRANSACTIONS);
  if (!sh) return;

  var lastRow = sh.getLastRow();
  if (lastRow > 1) {
    var numRows = lastRow - 1;
    sh.getRange(2, 1, numRows, 5).clearContent();
    sh.getRange(2, 7, numRows, 3).clearContent();
    sh.getRange(2, CONFIG.TRANS.UP_FRONT, numRows, 2).clearContent();
  }

  // Drop validations on written rows so CSV values (e.g. odd date text) do not throw; _patchTransactions restores them.
  var prevLen = lastRow > 1 ? lastRow - 1 : 0;
  var stripRows = Math.max(dataRows.length, prevLen);
  if (stripRows > 0) {
    sh.getRange(2, 1, stripRows, CONFIG.TRANS.TYPE).clearDataValidations();
  }

  // CSV: 0–4 A–E, 5 Total skip, 6–8 G–I, 9 ID skip, 10–11 K–L
  var userCols = [0, 1, 2, 3, 4];
  var userTargets = [1, 2, 3, 4, 5];
  var optCols = [6, 7, 8];
  var optTargets = [7, 8, 9];
  var extraCols = [10, 11];
  var extraTargets = [CONFIG.TRANS.UP_FRONT, CONFIG.TRANS.LINKED_DEPOSIT_ID];

  for (var r = 0; r < dataRows.length; r++) {
    var row = dataRows[r];
    var sheetRow = r + 2;

    for (var u = 0; u < userCols.length; u++) {
      var csvIdx = userCols[u];
      var colIdx = userTargets[u];
      var val = csvIdx < row.length ? row[csvIdx] : '';
      if (csvIdx === 0 && val !== '') {
        var d = new Date(val);
        if (!isNaN(d.getTime())) val = d;
        else val = '';
      }
      if ((csvIdx === 3 || csvIdx === 4) && val !== '') {
        var num = Number(val);
        if (!isNaN(num)) val = num;
      }
      sh.getRange(sheetRow, colIdx).setValue(val);
    }

    for (var o = 0; o < optCols.length; o++) {
      var oCsvIdx = optCols[o];
      var oColIdx = optTargets[o];
      var oVal = oCsvIdx < row.length ? row[oCsvIdx] : '';
      sh.getRange(sheetRow, oColIdx).setValue(oVal);
    }

    for (var e = 0; e < extraCols.length; e++) {
      var xCsv = extraCols[e];
      var xCol = extraTargets[e];
      var xVal = xCsv < row.length ? row[xCsv] : '';
      if (xCol === CONFIG.TRANS.UP_FRONT && xVal !== '') {
        var xn = Number(xVal);
        if (!isNaN(xn)) xVal = xn;
      }
      sh.getRange(sheetRow, xCol).setValue(xVal);
    }
  }
}

/**
 * Imports Settings from the Backup_Settings sheet.
 * Backup_Settings stores raw cell values (not CSV), so this is a direct copy.
 * Menu entry point.
 */
function importSettingsFromSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) return;
  var ui = SpreadsheetApp.getUi();

  var srcSh = ss.getSheetByName('Backup_Settings');
  if (!srcSh) {
    ui.alert('No "Backup_Settings" sheet found.\n\nRun "Export full backup" first, or copy a Backup_Settings sheet into this workbook.');
    return;
  }

  var lastRow = srcSh.getLastRow();
  if (lastRow < 1) {
    ui.alert('"Backup_Settings" is empty. Nothing to import.');
    return;
  }

  var confirm = ui.alert('Import Settings',
    'Replace current Settings (budget, currency, categories, payment methods) from "Backup_Settings"?',
    ui.ButtonSet.YES_NO);
  if (confirm !== ui.Button.YES) return;

  var tgtSh = ss.getSheetByName(CONFIG.SHEETS.SETTINGS);
  if (!tgtSh) {
    ui.alert('Settings sheet not found. Run setup first.');
    return;
  }

  var lastCol = Math.max(srcSh.getLastColumn(), 1);
  var srcData = srcSh.getRange(1, 1, lastRow, lastCol).getValues();
  tgtSh.clear();
  tgtSh.getRange(1, 1, lastRow, lastCol).setValues(srcData);
  tgtSh.autoResizeColumns(1, lastCol);

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  _ensureSettingsTransactionTypes(ss);
  _patchTransactions(ss);

  ui.alert('Settings restored from "Backup_Settings". Transaction types were merged if needed; Transactions validation refreshed.');
}

/**
 * Imports full backup: Settings from Backup_Settings, then Transactions
 * from Backup_Transactions. Rebuilds Dashboard afterwards.
 * Menu entry point.
 */
function importFullBackupFromSheets() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) return;
  var ui = SpreadsheetApp.getUi();

  var transSrc = _findTransactionsBackupSheet(ss);
  var setSrc = ss.getSheetByName('Backup_Settings');
  var missing = [];
  if (!transSrc) missing.push('Backup_Transactions (or Export_CSV)');
  if (!setSrc) missing.push('Backup_Settings');
  if (missing.length > 0) {
    ui.alert('Missing backup sheets:\n\n• ' + missing.join('\n• ') + '\n\nRun "Export full backup" first, or copy the backup sheets into this workbook.');
    return;
  }

  var parsed = _readTransactionsFromBackupSheet(transSrc);
  var headerErr = (parsed.length > 0) ? _validateTransactionsHeader(parsed[0]) : 'Empty backup.';
  if (headerErr) {
    ui.alert('Transactions backup invalid.\n\n' + headerErr);
    return;
  }
  var dataRows = parsed.slice(1);

  var confirm = ui.alert('Import Full Backup',
    'This will replace ALL Transactions data (' + dataRows.length + ' rows) and Settings.\n\nContinue?',
    ui.ButtonSet.YES_NO);
  if (confirm !== ui.Button.YES) return;

  // Import Settings first so dropdown validation ranges have values
  var setLastRow = setSrc.getLastRow();
  var setLastCol = Math.max(setSrc.getLastColumn(), 1);
  var tgtSh = ss.getSheetByName(CONFIG.SHEETS.SETTINGS);
  if (tgtSh && setLastRow > 0) {
    var setData = setSrc.getRange(1, 1, setLastRow, setLastCol).getValues();
    tgtSh.clear();
    tgtSh.getRange(1, 1, setLastRow, setLastCol).setValues(setData);
    tgtSh.autoResizeColumns(1, setLastCol);
  }

  _ensureSettingsTransactionTypes(ss);

  // Import Transactions
  if (dataRows.length > 0) {
    _writeTransactionsData(ss, dataRows);
  }

  _patchTransactions(ss);
  _setupDashboard(ss);
  _setupGuide(ss);
  _setTrackerVersionMarker(ss);

  ui.alert('Full backup restored (template v' + CONFIG.TEMPLATE_VERSION + ').\n\n• Settings restored and types merged if needed.\n• ' + dataRows.length + ' transaction rows imported.\n• Dashboard and Guide rebuilt.');
}
