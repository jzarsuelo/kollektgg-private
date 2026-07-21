/**
 * Canonical configuration for Spending & Inventory Tracker.
 * Do not change sheet names or column indices when reusing or migrating.
 * REQUIREMENTS: §4.0 Canonical layout
 */

var CONFIG = {
  /** Template / script release: year-based YY.minor (e.g. 26.1 = 2026 first track). DocumentProperties stores applied version. */
  TEMPLATE_VERSION: '26.1',

  /** Sheet tab names (exact). Do not rename. */
  SHEETS: {
    TRANSACTIONS: 'Transactions',
    DASHBOARD: 'Dashboard',
    SETTINGS: 'Settings',
    GUIDE: 'Guide'
  },

  /** Transactions columns (A=1, B=2, ...). Data starts row 2; row 1 = header. */
  TRANS: {
    DATE: 1,        // A
    ITEM: 2,        // B
    CATEGORY: 3,    // C
    QTY: 4,         // D
    UNIT_PRICE: 5,  // E
    TOTAL: 6,       // F (formula)
    PAYMENT: 7,     // G
    NOTES: 8,       // H
    TYPE: 9,        // I: Purchase, Income, Deposit, Pre-order paid
    ID: 10,         // J: unique row ID (formula)
    UP_FRONT: 11,   // K: up-front amount for Deposit / Pre-order paid
    LINKED_DEPOSIT_ID: 12  // L: balance row — paste deposit row ID (J)
  },

  /** Number of Transactions columns (must match TRANS_HEADERS length). */
  TRANS_COLS: 12,

  /** Transactions header row (row 1). */
  TRANS_HEADERS: ['Date', 'Item', 'Category', 'Qty', 'Unit Price', 'Total', 'Payment', 'Notes', 'Type', 'ID', 'Up-front amount', 'Linked deposit ID'],

  /** Settings layout: budget cell, list ranges for dropdowns. */
  SETTINGS: {
    BUDGET_ROW: 2,
    BUDGET_COL: 2,           // B2 = monthly budget
    CURRENCY_ROW: 2,         // D2 = currency label, E2 = currency code (e.g. USD)
    CURRENCY_LABEL_COL: 4,
    CURRENCY_VALUE_COL: 5,
    CATEGORIES_HEADER_ROW: 3,
    CATEGORIES_COL: 1,       // A4:A = categories
    CATEGORIES_FIRST_ROW: 4,
    CATEGORIES_LAST_ROW: 50,
    PAYMENT_HEADER_ROW: 3,
    PAYMENT_COL: 2,          // B4:B = payment methods
    PAYMENT_FIRST_ROW: 4,
    PAYMENT_LAST_ROW: 50,
    TYPE_HEADER_ROW: 3,
    TYPE_COL: 3,             // C4:C = transaction types (Purchase, Income, Deposit, Pre-order paid)
    TYPE_FIRST_ROW: 4,
    TYPE_LAST_ROW: 20
  },

  /** Default categories, payment methods, transaction types, and currency. */
  DEFAULTS: {
    CATEGORIES: ['Raw materials', 'Packaging', 'Office', 'Other'],
    PAYMENT_METHODS: ['Cash', 'Card', 'Bank transfer', 'Other'],
    TRANSACTION_TYPES: ['Purchase', 'Income', 'Deposit', 'Pre-order paid'],
    CURRENCY: 'USD'
  }
};
