const initSqlJs = require('sql.js');
const fs        = require('fs');
const path      = require('path');

const DB_PATH = path.join(__dirname, 'shopmate.db');

let db;          // Global db instance
let _saveTimer;  // Debounce handle for saveDB

async function initDB() {
  const SQL = await initSqlJs();

  // Load existing DB from file, or create fresh one
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  db.run('PRAGMA foreign_keys = ON;');
  db.run('CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON sale_items(sale_id);');

  // ─── Create Tables ──────────────────────────────────────────────────────────
  db.run(`
    CREATE TABLE IF NOT EXISTS products (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      name          TEXT NOT NULL,
      category      TEXT NOT NULL DEFAULT 'General',
      buying_price  REAL NOT NULL DEFAULT 0,
      selling_price REAL NOT NULL DEFAULT 0,
      stock         INTEGER NOT NULL DEFAULT 0,
      created_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS customers (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      name         TEXT NOT NULL,
      phone        TEXT DEFAULT '',
      credit_limit REAL NOT NULL DEFAULT 15000,
      created_at   TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS sales (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      total_amount  REAL NOT NULL DEFAULT 0,
      total_profit  REAL NOT NULL DEFAULT 0,
      payment_type  TEXT NOT NULL DEFAULT 'cash',
      customer_id   INTEGER,
      created_at    TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL
    );
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS sale_items (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_id      INTEGER NOT NULL,
      product_id   INTEGER,
      product_name TEXT NOT NULL,
      quantity     INTEGER NOT NULL DEFAULT 1,
      unit_price   REAL NOT NULL DEFAULT 0,
      unit_profit  REAL NOT NULL DEFAULT 0,
      buying_price REAL NOT NULL DEFAULT 0,
      FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
    );
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS udhaar (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL,
      amount      REAL NOT NULL DEFAULT 0,
      type        TEXT NOT NULL DEFAULT 'debit',
      note        TEXT DEFAULT '',
      sale_id     INTEGER,
      created_at  TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
      FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE
    );
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS expenses (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      amount        REAL NOT NULL DEFAULT 0,
      category      TEXT NOT NULL DEFAULT 'Miscellaneous',
      description   TEXT NOT NULL,
      created_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  try {
    db.run("SELECT category FROM expenses LIMIT 1");
  } catch (e) {
    db.run("ALTER TABLE expenses ADD COLUMN category TEXT NOT NULL DEFAULT 'Miscellaneous'");
    saveDB();
  }

  try {
    db.run("SELECT credit_limit FROM customers LIMIT 1");
  } catch (e) {
    db.run("ALTER TABLE customers ADD COLUMN credit_limit REAL NOT NULL DEFAULT 15000");
    saveDB();
  }

  try {
    db.run("SELECT sale_id FROM udhaar LIMIT 1");
  } catch (e) {
    db.run("ALTER TABLE udhaar ADD COLUMN sale_id INTEGER REFERENCES sales(id) ON DELETE CASCADE");
    saveDB();
  }

  try {
    db.run("SELECT buying_price FROM sale_items LIMIT 1");
  } catch (e) {
    db.run("ALTER TABLE sale_items ADD COLUMN buying_price REAL NOT NULL DEFAULT 0");
    saveDB();
  }

  try {
    db.run("SELECT unit_profit FROM sale_items LIMIT 1");
  } catch (e) {
    db.run("ALTER TABLE sale_items ADD COLUMN unit_profit REAL NOT NULL DEFAULT 0");
    saveDB();
  }

  // ─── Seed sample data ───────────────────────────────────────────────────────
  const countResult = db.exec('SELECT COUNT(*) as cnt FROM products');
  const count = countResult[0]?.values[0][0] || 0;

  if (count === 0) {
    const products = [
      ['Milk (1L)',        'Dairy',      180, 220, 50],
      ['Sugar (1kg)',      'Grocery',    120, 150, 40],
      ['Cooking Oil (1L)', 'Grocery',    360, 420, 25],
      ['Rice (1kg)',       'Grocery',    150, 200, 60],
      ['Bread',           'Bakery',       60,  80, 30],
      ['Tea (Lipton)',    'Beverages',   250, 320, 20],
      ['Salt (1kg)',      'Grocery',      35,  50, 45],
      ['Flour (1kg)',     'Grocery',     110, 140, 35],
      ['Soap (Lifebuoy)', 'Household',   60,  85, 40],
      ['Matchbox',        'Household',    8,  15, 100],
    ];
    products.forEach(([name, cat, buy, sell, stock]) => {
      db.run(
        'INSERT INTO products (name, category, buying_price, selling_price, stock) VALUES (?,?,?,?,?)',
        [name, cat, buy, sell, stock]
      );
    });
    db.run("INSERT INTO customers (name, phone) VALUES ('Ali Khan',    '0333-1234567')");
    db.run("INSERT INTO customers (name, phone) VALUES ('Hassan Bhai', '0312-9876543')");
    db.run("INSERT INTO customers (name, phone) VALUES ('Zara Begum',  '0301-5556789')");
    db.run("INSERT INTO udhaar (customer_id, amount, type, note) VALUES (1, 5000, 'debit',   'Monthly groceries')");
    db.run("INSERT INTO udhaar (customer_id, amount, type, note) VALUES (1, 2000, 'payment', 'Cash payment')");
    db.run("INSERT INTO udhaar (customer_id, amount, type, note) VALUES (2, 3500, 'debit',   'Weekly supplies')");
    saveDB();
    console.log('✅ Database seeded with sample data');
  }

  console.log('📦 SQLite (sql.js) database ready');
  return db;
}

let inTransaction = false;

// ─── Save DB to disk (debounced + safe + atomic) ──────────────────────────────────────
function saveDB() {
  if (!db || inTransaction) return;
  clearTimeout(_saveTimer);
  _saveTimer = setTimeout(() => {
    try {
      const data = db.export();
      const TEMP_PATH = DB_PATH + '.tmp';
      fs.writeFileSync(TEMP_PATH, Buffer.from(data));
      fs.renameSync(TEMP_PATH, DB_PATH);
    } catch (err) {
      console.error('❌ Failed to persist database:', err.message);
    }
  }, 300);
}

// ─── Query helpers ────────────────────────────────────────────────────────────

/** Run a SELECT and return an array of row objects */
function query(sql, params = []) {
  const stmt    = db.prepare(sql);
  const results = [];
  stmt.bind(params);
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

/** Run a SELECT and return the first row object (or undefined) */
function queryOne(sql, params = []) {
  return query(sql, params)[0];
}

/** Run INSERT / UPDATE / DELETE. Returns { lastInsertRowid, changes } */
function run(sql, params = []) {
  db.run(sql, params);
  const meta = db.exec('SELECT last_insert_rowid() as id, changes() as changes')[0];
  const lastInsertRowid = meta?.values[0][0] ?? null;
  const changes         = meta?.values[0][1] ?? 0;
  if (!inTransaction) {
    saveDB();
  }
  return { lastInsertRowid, changes };
}

/** Execute a callback inside an atomic SQLite transaction */
function transaction(fn) {
  if (inTransaction) {
    return fn();
  }
  db.run('BEGIN TRANSACTION;');
  inTransaction = true;
  try {
    const result = fn();
    db.run('COMMIT;');
    inTransaction = false;
    saveDB();
    return result;
  } catch (err) {
    db.run('ROLLBACK;');
    inTransaction = false;
    throw err;
  }
}

module.exports = { initDB, query, queryOne, run, saveDB, transaction };
