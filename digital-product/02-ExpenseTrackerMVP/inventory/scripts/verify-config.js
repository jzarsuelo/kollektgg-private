/**
 * Local pre-deploy check (no Google APIs). Run from repo root:
 *   node scripts/verify-config.js
 */
'use strict';

var fs = require('fs');
var path = require('path');
var configPath = path.join(__dirname, 'Config.gs');
var c = fs.readFileSync(configPath, 'utf8');

var colsMatch = c.match(/TRANS_COLS:\s*(\d+)/);
if (!colsMatch) {
  console.error('Could not find TRANS_COLS in Config.gs');
  process.exit(1);
}
var TRANS_COLS = parseInt(colsMatch[1], 10);

var headerMatch = c.match(/TRANS_HEADERS:\s*\[([\s\S]*?)\]\s*,/);
if (!headerMatch) {
  console.error('Could not find TRANS_HEADERS array in Config.gs');
  process.exit(1);
}
var headerBody = headerMatch[1];
var strings = headerBody.match(/'([^']|\\')*'/g) || [];
if (strings.length !== TRANS_COLS) {
  console.error(
    'Mismatch: TRANS_COLS is',
    TRANS_COLS,
    'but counted',
    strings.length,
    'header string literals in TRANS_HEADERS'
  );
  process.exit(1);
}

console.log('OK: TRANS_COLS and TRANS_HEADERS count both', TRANS_COLS);
