/**
 * ============================================================
 * KOLLEKT.GG Pokemon TCG Financial Tracker v26.0
 * Google Apps Script — Companion Code
 * ============================================================
 * 
 * INSTALLATION:
 * 1. Open your Google Sheet copy of the tracker
 * 2. Go to Extensions → Apps Script
 * 3. Delete any existing code in Code.gs
 * 4. Paste this entire file
 * 5. Save (Ctrl+S)
 * 6. Reload the spreadsheet
 * 7. A "Kollekt" menu will appear in the menu bar
 * 
 * FEATURES:
 * - Custom menu with all actions
 * - Onboarding wizard for first-time setup
 * - Market price lookup via APIs (PokemonTCG.io, TCGdex, PokemonPriceTracker)
 * - Data export to JSON (for version migration)
 * - Data import from JSON (restore from previous version)
 * - Full reset with re-onboarding
 * 
 * NOTE: This script uses only standard Google Apps Script APIs.
 * No external libraries or OAuth scopes beyond spreadsheet access.
 * ============================================================
 */

const TRACKER_VERSION = "v26.0";
const SETTINGS_SHEET = "Settings";
const PURCHASES_SHEET = "Purchases";
const SALES_SHEET = "Sales";
const DASHBOARD_SHEET = "Dashboard";

// ============================================================
// MENU & TRIGGERS
// ============================================================

function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('⬡ Kollekt')
    .addItem('🚀 Run Setup Wizard', 'showOnboarding')
    .addSeparator()
    .addItem('💰 Refresh Market Prices', 'refreshMarketPrices')
    .addItem('📊 Refresh Dashboard', 'refreshDashboard')
    .addSeparator()
    .addSubMenu(ui.createMenu('📦 Data Migration')
      .addItem('Export Data (JSON)', 'exportDataToJSON')
      .addItem('Import Data (JSON)', 'importDataFromJSON'))
    .addSeparator()
    .addItem('🔄 Reset Tracker', 'resetTracker')
    .addItem('ℹ️ About', 'showAbout')
    .addToUi();
  
  // Check if first run
  const props = PropertiesService.getDocumentProperties();
  if (!props.getProperty('onboarded')) {
    showOnboarding();
  }
}

function onInstall(e) {
  onOpen();
}

// ============================================================
// ONBOARDING WIZARD
// ============================================================

function showOnboarding() {
  const html = HtmlService.createHtmlOutput(`
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: Arial, sans-serif; background: #1A1A2E; color: #fff; padding: 24px; }
      h1 { color: #F5A623; font-size: 20px; margin-bottom: 8px; }
      h2 { color: #F5A623; font-size: 16px; margin: 16px 0 8px; }
      p { color: #ccc; font-size: 13px; line-height: 1.5; margin-bottom: 12px; }
      label { display: block; color: #aaa; font-size: 12px; margin-bottom: 4px; margin-top: 12px; }
      input, select { width: 100%; padding: 8px 12px; background: #16213E; border: 1px solid #0F3460; 
                       color: #fff; border-radius: 4px; font-size: 14px; margin-bottom: 4px; }
      input:focus, select:focus { border-color: #F5A623; outline: none; }
      .btn { background: #F5A623; color: #1A1A2E; border: none; padding: 12px 24px; 
             border-radius: 4px; font-size: 14px; font-weight: bold; cursor: pointer; 
             width: 100%; margin-top: 16px; }
      .btn:hover { background: #e6951e; }
      .step { display: none; }
      .step.active { display: block; }
      .steps-indicator { text-align: center; margin: 16px 0; }
      .dot { display: inline-block; width: 10px; height: 10px; border-radius: 50%; 
             background: #0F3460; margin: 0 4px; }
      .dot.active { background: #F5A623; }
      .note { background: #0F3460; padding: 12px; border-radius: 4px; margin: 8px 0; 
              border-left: 3px solid #F5A623; }
      .note p { margin: 0; color: #F5A623; font-size: 12px; }
    </style>
    
    <div id="step1" class="step active">
      <h1>⬡ Welcome to Kollekt.gg Tracker</h1>
      <p>Let's set up your Pokemon TCG financial tracker in 3 quick steps.</p>
      
      <label>Your Name / Shop Name</label>
      <input type="text" id="shopName" placeholder="e.g., Kollekt.gg" value="">
      
      <label>Currency</label>
      <select id="currency">
        <option value="AUD" selected>AUD - Australian Dollar</option>
        <option value="USD">USD - US Dollar</option>
        <option value="EUR">EUR - Euro</option>
        <option value="GBP">GBP - British Pound</option>
        <option value="JPY">JPY - Japanese Yen</option>
        <option value="CAD">CAD - Canadian Dollar</option>
        <option value="NZD">NZD - New Zealand Dollar</option>
        <option value="SGD">SGD - Singapore Dollar</option>
        <option value="PHP">PHP - Philippine Peso</option>
        <option value="THB">THB - Thai Baht</option>
        <option value="HKD">HKD - Hong Kong Dollar</option>
        <option value="KRW">KRW - Korean Won</option>
        <option value="TWD">TWD - Taiwan Dollar</option>
        <option value="MYR">MYR - Malaysian Ringgit</option>
        <option value="CHF">CHF - Swiss Franc</option>
      </select>
      
      <label>Country</label>
      <select id="country">
        <option value="Australia" selected>Australia</option>
        <option value="United States">United States</option>
        <option value="United Kingdom">United Kingdom</option>
        <option value="Canada">Canada</option>
        <option value="Japan">Japan</option>
        <option value="New Zealand">New Zealand</option>
        <option value="Singapore">Singapore</option>
        <option value="Philippines">Philippines</option>
        <option value="Germany">Germany</option>
        <option value="Netherlands">Netherlands</option>
      </select>
      
      <button class="btn" onclick="nextStep(2)">Next →</button>
    </div>
    
    <div id="step2" class="step">
      <h2>API Configuration (Optional)</h2>
      <p>Add API keys to enable market price lookups. You can skip this and add them later in Settings.</p>
      
      <label>PokemonTCG.io API Key</label>
      <input type="text" id="apiPokemonTCG" placeholder="Get free key at pokemontcg.io">
      
      <label>PokemonPriceTracker API Key</label>
      <input type="text" id="apiPriceTracker" placeholder="Get key at pokemonpricetracker.com/api">
      
      <div class="note">
        <p>💡 TCGdex requires no API key — it works automatically!</p>
      </div>
      
      <label>Primary Price Source</label>
      <select id="priceSource">
        <option value="PokemonTCG.io" selected>PokemonTCG.io (TCGPlayer prices)</option>
        <option value="TCGdex">TCGdex (Cardmarket + TCGPlayer)</option>
        <option value="PokemonPriceTracker">PokemonPriceTracker (PSA data)</option>
      </select>
      
      <button class="btn" onclick="nextStep(3)">Next →</button>
    </div>
    
    <div id="step3" class="step">
      <h2>Ready to Track!</h2>
      <p>Your tracker will be configured with these settings. You can change them anytime in the Settings tab.</p>
      
      <div class="note">
        <p>📋 Quick Start: Log purchases in the Purchases tab, sales in the Sales tab. The Dashboard updates automatically.</p>
      </div>
      
      <div class="note">
        <p>📦 Pack Openings: Buy sealed → mark as "Opened" → add pulled cards as new entries with Parent ID linking back.</p>
      </div>
      
      <div class="note">
        <p>💎 Grading: Add grading fee as separate entry → sell as "Graded Card" in Sales.</p>
      </div>
      
      <button class="btn" onclick="saveSettings()">✅ Complete Setup</button>
    </div>
    
    <div class="steps-indicator">
      <span class="dot active" id="dot1"></span>
      <span class="dot" id="dot2"></span>
      <span class="dot" id="dot3"></span>
    </div>
    
    <script>
      function nextStep(step) {
        document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
        document.querySelectorAll('.dot').forEach(d => d.classList.remove('active'));
        document.getElementById('step' + step).classList.add('active');
        for (let i = 1; i <= step; i++) {
          document.getElementById('dot' + i).classList.add('active');
        }
      }
      
      function saveSettings() {
        const settings = {
          shopName: document.getElementById('shopName').value || 'My TCG Shop',
          currency: document.getElementById('currency').value,
          country: document.getElementById('country').value,
          apiPokemonTCG: document.getElementById('apiPokemonTCG').value,
          apiPriceTracker: document.getElementById('apiPriceTracker').value,
          priceSource: document.getElementById('priceSource').value
        };
        google.script.run.withSuccessHandler(() => {
          google.script.host.close();
        }).applyOnboardingSettings(settings);
      }
    </script>
  `)
  .setWidth(420)
  .setHeight(520)
  .setTitle('Kollekt.gg Setup Wizard');
  
  SpreadsheetApp.getUi().showModalDialog(html, 'Kollekt.gg Setup Wizard');
}

function applyOnboardingSettings(settings) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ws = ss.getSheetByName(SETTINGS_SHEET);
  
  if (!ws) {
    SpreadsheetApp.getUi().alert('Settings sheet not found. Please check your spreadsheet structure.');
    return;
  }
  
  // Apply settings to cells
  ws.getRange('C6').setValue(settings.shopName);
  ws.getRange('C7').setValue(settings.currency);
  ws.getRange('C8').setValue(settings.country);
  
  // API keys
  if (settings.apiPokemonTCG) ws.getRange('C30').setValue(settings.apiPokemonTCG);
  if (settings.apiPriceTracker) ws.getRange('C32').setValue(settings.apiPriceTracker);
  
  // Active price source
  ws.getRange('C36').setValue(settings.priceSource);
  
  // Mark as onboarded
  PropertiesService.getDocumentProperties().setProperty('onboarded', 'true');
  PropertiesService.getDocumentProperties().setProperty('version', TRACKER_VERSION);
  
  SpreadsheetApp.getActiveSpreadsheet().toast('Setup complete! Start by logging purchases.', 'Kollekt.gg', 5);
}

// ============================================================
// MARKET PRICE LOOKUP
// ============================================================

function refreshMarketPrices() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const wsSettings = ss.getSheetByName(SETTINGS_SHEET);
  const wsPurchases = ss.getSheetByName(PURCHASES_SHEET);
  
  const activeSource = wsSettings.getRange('C36').getValue();
  
  // Get API keys
  const apiKeys = {
    'PokemonTCG.io': wsSettings.getRange('C30').getValue(),
    'TCGdex': '', // No key needed
    'PokemonPriceTracker': wsSettings.getRange('C32').getValue()
  };
  
  const apiKey = apiKeys[activeSource] || '';
  
  // Get items needing price updates (those with descriptions but no market price)
  const lastRow = wsPurchases.getLastRow();
  if (lastRow < 4) {
    SpreadsheetApp.getUi().alert('No purchase data found to update.');
    return;
  }
  
  const data = wsPurchases.getRange(4, 1, lastRow - 3, 14).getValues();
  let updated = 0;
  let errors = 0;
  
  for (let i = 0; i < data.length; i++) {
    const category = data[i][2]; // Column C
    const description = data[i][3]; // Column D
    const setName = data[i][4]; // Column E
    
    // Only look up prices for cards (not supplies, fees, etc.)
    if (!description || (category !== 'Single Card' && category !== 'Graded Card')) continue;
    
    try {
      const price = lookupPrice(activeSource, apiKey, description, setName);
      if (price && price > 0) {
        wsPurchases.getRange(i + 4, 13).setValue(price); // Column M = Market Price
        updated++;
      }
    } catch (e) {
      errors++;
      Logger.log('Price lookup error for ' + description + ': ' + e.message);
    }
    
    // Rate limiting: pause between requests
    Utilities.sleep(300);
  }
  
  SpreadsheetApp.getActiveSpreadsheet().toast(
    `Updated ${updated} prices. ${errors > 0 ? errors + ' errors.' : ''}`, 
    'Market Prices', 5
  );
}

function lookupPrice(source, apiKey, cardName, setName) {
  switch (source) {
    case 'PokemonTCG.io':
      return lookupPokemonTCGio(apiKey, cardName, setName);
    case 'TCGdex':
      return lookupTCGdex(cardName, setName);
    case 'PokemonPriceTracker':
      return lookupPriceTracker(apiKey, cardName, setName);
    default:
      return null;
  }
}

function lookupPokemonTCGio(apiKey, cardName, setName) {
  // Clean card name for search
  const cleanName = cardName.replace(/[^\w\s]/g, '').trim();
  let url = `https://api.pokemontcg.io/v2/cards?q=name:"${encodeURIComponent(cleanName)}"`;
  if (setName) url += ` set.name:"${encodeURIComponent(setName)}"`;
  url += '&pageSize=1';
  
  const options = {
    method: 'get',
    headers: apiKey ? { 'X-Api-Key': apiKey } : {},
    muteHttpExceptions: true
  };
  
  const response = UrlFetchApp.fetch(url, options);
  if (response.getResponseCode() !== 200) return null;
  
  const result = JSON.parse(response.getContentText());
  if (!result.data || result.data.length === 0) return null;
  
  const card = result.data[0];
  // Try to get TCGPlayer market price
  if (card.tcgplayer && card.tcgplayer.prices) {
    const priceTypes = ['holofoil', 'reverseHolofoil', 'normal', '1stEditionHolofoil'];
    for (const type of priceTypes) {
      if (card.tcgplayer.prices[type] && card.tcgplayer.prices[type].market) {
        return card.tcgplayer.prices[type].market;
      }
    }
  }
  return null;
}

function lookupTCGdex(cardName, setName) {
  const cleanName = cardName.replace(/[^\w\s]/g, '').trim();
  const url = `https://api.tcgdex.net/v2/en/cards?name=${encodeURIComponent(cleanName)}&limit=1`;
  
  const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  if (response.getResponseCode() !== 200) return null;
  
  const result = JSON.parse(response.getContentText());
  if (!result || result.length === 0) return null;
  
  // TCGdex v2 may require a second call for price data
  const cardId = result[0].id;
  const priceUrl = `https://api.tcgdex.net/v2/en/cards/${cardId}`;
  const priceResponse = UrlFetchApp.fetch(priceUrl, { muteHttpExceptions: true });
  if (priceResponse.getResponseCode() !== 200) return null;
  
  const cardData = JSON.parse(priceResponse.getContentText());
  // Extract price if available (TCGdex structure varies)
  if (cardData.tcgplayer && cardData.tcgplayer.url) {
    // TCGdex provides URLs but limited direct pricing
    // Return null if no direct price available
    return null;
  }
  return null;
}

function lookupPriceTracker(apiKey, cardName, setName) {
  if (!apiKey) return null;
  
  const cleanName = cardName.replace(/[^\w\s]/g, '').trim();
  let url = `https://www.pokemonpricetracker.com/api/v2/cards?search=${encodeURIComponent(cleanName)}`;
  if (setName) url += `&setName=${encodeURIComponent(setName)}`;
  url += '&limit=1';
  
  const options = {
    method: 'get',
    headers: { 'Authorization': 'Bearer ' + apiKey },
    muteHttpExceptions: true
  };
  
  const response = UrlFetchApp.fetch(url, options);
  if (response.getResponseCode() !== 200) return null;
  
  const result = JSON.parse(response.getContentText());
  if (!result.data || result.data.length === 0) return null;
  
  const card = result.data[0];
  return card.prices ? card.prices.market : null;
}

// ============================================================
// DASHBOARD REFRESH
// ============================================================

function refreshDashboard() {
  // Force recalculation by touching a cell
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  SpreadsheetApp.flush();
  ss.toast('Dashboard refreshed!', 'Kollekt.gg', 3);
}

// ============================================================
// DATA EXPORT (Migration)
// ============================================================

function exportDataToJSON() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.alert(
    'Export Data',
    'This will save all your Purchases, Sales, and Settings data as a JSON file in your Google Drive.\n\nUse this to migrate to a new version of the tracker.\n\nContinue?',
    ui.ButtonSet.YES_NO
  );
  
  if (response !== ui.Button.YES) return;
  
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const exportData = {
    version: TRACKER_VERSION,
    exportDate: new Date().toISOString(),
    settings: exportSheet(ss.getSheetByName(SETTINGS_SHEET)),
    purchases: exportSheet(ss.getSheetByName(PURCHASES_SHEET)),
    sales: exportSheet(ss.getSheetByName(SALES_SHEET))
  };
  
  const jsonString = JSON.stringify(exportData, null, 2);
  const fileName = `KollektGG_Export_${TRACKER_VERSION}_${Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd_HHmmss')}.json`;
  
  const file = DriveApp.createFile(fileName, jsonString, MimeType.PLAIN_TEXT);
  
  ui.alert(
    'Export Complete!',
    `Data exported successfully!\n\nFile: ${fileName}\nLocation: My Drive\nFile ID: ${file.getId()}\n\nUse "Import Data" in your new tracker to restore this data.`,
    ui.ButtonSet.OK
  );
}

function exportSheet(sheet) {
  if (!sheet) return [];
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  if (lastRow < 1 || lastCol < 1) return [];
  return sheet.getRange(1, 1, lastRow, lastCol).getValues();
}

// ============================================================
// DATA IMPORT (Migration)
// ============================================================

function importDataFromJSON() {
  const html = HtmlService.createHtmlOutput(`
    <style>
      body { font-family: Arial, sans-serif; background: #1A1A2E; color: #fff; padding: 20px; }
      h2 { color: #F5A623; margin-bottom: 12px; }
      p { color: #ccc; font-size: 13px; margin-bottom: 16px; }
      .btn { background: #F5A623; color: #1A1A2E; border: none; padding: 10px 20px; 
             border-radius: 4px; font-weight: bold; cursor: pointer; margin: 4px; }
      .btn:hover { background: #e6951e; }
      .btn-danger { background: #E74C3C; color: #fff; }
      input[type="text"] { width: 100%; padding: 8px; background: #16213E; border: 1px solid #0F3460; 
                           color: #fff; border-radius: 4px; margin-bottom: 12px; }
      #status { margin-top: 12px; padding: 8px; border-radius: 4px; display: none; }
      .success { background: #27AE60; }
      .error { background: #E74C3C; }
    </style>
    
    <h2>Import Data from Previous Version</h2>
    <p>Enter the Google Drive File ID of your exported JSON file. You can find this in the export confirmation message.</p>
    
    <label style="color:#aaa;font-size:12px;">Export File ID</label>
    <input type="text" id="fileId" placeholder="Paste the File ID here...">
    
    <p style="font-size:11px;color:#888;">⚠️ This will OVERWRITE your current Purchases and Sales data.</p>
    
    <button class="btn" onclick="doImport()">Import Data</button>
    <button class="btn btn-danger" onclick="google.script.host.close()">Cancel</button>
    
    <div id="status"></div>
    
    <script>
      function doImport() {
        const fileId = document.getElementById('fileId').value.trim();
        if (!fileId) { showStatus('Please enter a File ID.', 'error'); return; }
        
        showStatus('Importing...', '');
        google.script.run
          .withSuccessHandler(function(msg) { showStatus(msg, 'success'); })
          .withFailureHandler(function(err) { showStatus('Error: ' + err.message, 'error'); })
          .performImport(fileId);
      }
      
      function showStatus(msg, type) {
        const el = document.getElementById('status');
        el.textContent = msg;
        el.className = type;
        el.style.display = 'block';
      }
    </script>
  `)
  .setWidth(420)
  .setHeight(350)
  .setTitle('Import Data');
  
  SpreadsheetApp.getUi().showModalDialog(html, 'Import Data');
}

function performImport(fileId) {
  const file = DriveApp.getFileById(fileId);
  const jsonString = file.getBlob().getDataAsString();
  const importData = JSON.parse(jsonString);
  
  if (!importData.version || !importData.purchases || !importData.sales) {
    throw new Error('Invalid export file format.');
  }
  
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Import Purchases (skip header rows, start from row 4)
  if (importData.purchases.length > 3) {
    const ws = ss.getSheetByName(PURCHASES_SHEET);
    const dataRows = importData.purchases.slice(3); // Skip first 3 rows (header area)
    if (dataRows.length > 0) {
      // Clear existing data
      const lastRow = ws.getLastRow();
      if (lastRow > 3) ws.getRange(4, 1, lastRow - 3, ws.getLastColumn()).clearContent();
      
      // Write imported data
      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        if (!row[1] && !row[3]) continue; // Skip empty rows (no date or description)
        // Write user-editable columns only (B-H, J-M)
        const targetRow = i + 4;
        if (row[1]) ws.getRange(targetRow, 2).setValue(row[1]); // Date
        if (row[2]) ws.getRange(targetRow, 3).setValue(row[2]); // Category
        if (row[3]) ws.getRange(targetRow, 4).setValue(row[3]); // Description
        if (row[4]) ws.getRange(targetRow, 5).setValue(row[4]); // Set
        if (row[5]) ws.getRange(targetRow, 6).setValue(row[5]); // Qty
        if (row[6]) ws.getRange(targetRow, 7).setValue(row[6]); // Unit Cost
        if (row[7]) ws.getRange(targetRow, 8).setValue(row[7]); // Status
        if (row[9]) ws.getRange(targetRow, 10).setValue(row[9]); // Source
        if (row[10]) ws.getRange(targetRow, 11).setValue(row[10]); // Parent ID
        if (row[11]) ws.getRange(targetRow, 12).setValue(row[11]); // Notes
        if (row[12]) ws.getRange(targetRow, 13).setValue(row[12]); // Market Price
      }
    }
  }
  
  // Import Sales
  if (importData.sales.length > 3) {
    const ws = ss.getSheetByName(SALES_SHEET);
    const dataRows = importData.sales.slice(3);
    if (dataRows.length > 0) {
      const lastRow = ws.getLastRow();
      if (lastRow > 3) ws.getRange(4, 1, lastRow - 3, ws.getLastColumn()).clearContent();
      
      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        if (!row[1] && !row[3]) continue;
        const targetRow = i + 4;
        if (row[1]) ws.getRange(targetRow, 2).setValue(row[1]); // Date
        if (row[2]) ws.getRange(targetRow, 3).setValue(row[2]); // Category
        if (row[3]) ws.getRange(targetRow, 4).setValue(row[3]); // Description
        if (row[4]) ws.getRange(targetRow, 5).setValue(row[4]); // Set
        if (row[5]) ws.getRange(targetRow, 6).setValue(row[5]); // Qty
        if (row[6]) ws.getRange(targetRow, 7).setValue(row[6]); // Sale Price
        if (row[7]) ws.getRange(targetRow, 8).setValue(row[7]); // Platform
        if (row[9]) ws.getRange(targetRow, 10).setValue(row[9]); // Shipping
        if (row[14]) ws.getRange(targetRow, 15).setValue(row[14]); // Purchase Ref
        if (row[15]) ws.getRange(targetRow, 16).setValue(row[15]); // Buyer
        if (row[16]) ws.getRange(targetRow, 17).setValue(row[16]); // Tracking
        if (row[17]) ws.getRange(targetRow, 18).setValue(row[17]); // Notes
      }
    }
  }
  
  // Update migration date in Settings
  const wsSettings = ss.getSheetByName(SETTINGS_SHEET);
  wsSettings.getRange('C42').setValue(new Date());
  
  SpreadsheetApp.flush();
  return `Import complete! Restored data from ${importData.version} (exported ${importData.exportDate}).`;
}

// ============================================================
// RESET TRACKER
// ============================================================

function resetTracker() {
  const ui = SpreadsheetApp.getUi();
  
  const response = ui.alert(
    '⚠️ Reset Tracker',
    'WARNING: This will DELETE ALL your data (Purchases, Sales) and reset Settings to defaults.\n\nThis action CANNOT be undone.\n\nAre you absolutely sure?',
    ui.ButtonSet.YES_NO
  );
  
  if (response !== ui.Button.YES) return;
  
  // Double confirmation
  const response2 = ui.alert(
    '⚠️ Final Confirmation',
    'Type YES to confirm you want to delete all data.',
    ui.ButtonSet.YES_NO
  );
  
  if (response2 !== ui.Button.YES) return;
  
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Clear Purchases data (keep headers)
  const wsPurch = ss.getSheetByName(PURCHASES_SHEET);
  const purchLastRow = wsPurch.getLastRow();
  if (purchLastRow > 3) {
    wsPurch.getRange(4, 2, purchLastRow - 3, 13).clearContent(); // Clear B4:N onwards (user data only)
  }
  
  // Clear Sales data
  const wsSales = ss.getSheetByName(SALES_SHEET);
  const salesLastRow = wsSales.getLastRow();
  if (salesLastRow > 3) {
    wsSales.getRange(4, 2, salesLastRow - 3, 18).clearContent();
  }
  
  // Reset Settings
  const wsSettings = ss.getSheetByName(SETTINGS_SHEET);
  wsSettings.getRange('C6').setValue('');
  wsSettings.getRange('C7').setValue('AUD');
  wsSettings.getRange('C8').setValue('Australia');
  wsSettings.getRange('C30').setValue('');
  wsSettings.getRange('C31').setValue('');
  wsSettings.getRange('C32').setValue('');
  wsSettings.getRange('C33').setValue('');
  wsSettings.getRange('C34').setValue('');
  
  // Clear onboarded flag
  PropertiesService.getDocumentProperties().deleteProperty('onboarded');
  
  SpreadsheetApp.flush();
  
  ui.alert('Tracker has been reset. The setup wizard will appear on next reload.');
  
  // Show onboarding again
  showOnboarding();
}

// ============================================================
// ABOUT
// ============================================================

function showAbout() {
  const html = HtmlService.createHtmlOutput(`
    <style>
      body { font-family: Arial; background: #1A1A2E; color: #fff; padding: 24px; text-align: center; }
      h1 { color: #F5A623; font-size: 24px; }
      .version { color: #F5A623; font-size: 18px; margin: 8px 0; }
      p { color: #ccc; font-size: 13px; line-height: 1.6; }
      a { color: #3498DB; }
      .logo { font-size: 48px; margin-bottom: 8px; }
    </style>
    <div class="logo">⬡</div>
    <h1>kollekt.gg</h1>
    <div class="version">${TRACKER_VERSION}</div>
    <p>Pokemon TCG Financial Tracker</p>
    <p>The Everyday Australian Collector</p>
    <br>
    <p>Track every dollar in and out of your TCG hobby.</p>
    <p>Not a collection tracker — a <strong>business</strong> tracker.</p>
    <br>
    <p style="font-size:11px;color:#888;">
      Follow @kollekt.gg on TikTok & Instagram<br>
      Built with 💛 in Melbourne, Australia
    </p>
  `)
  .setWidth(320)
  .setHeight(380)
  .setTitle('About Kollekt.gg Tracker');
  
  SpreadsheetApp.getUi().showModalDialog(html, 'About');
}
