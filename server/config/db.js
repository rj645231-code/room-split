const { createClient } = require('@libsql/client');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Determine connection URL (fallback to local if TURSO_DATABASE_URL is missing)
let url = process.env.TURSO_DATABASE_URL;
let authToken = process.env.TURSO_AUTH_TOKEN;

if (!url) {
  const DB_DIR = path.join(__dirname, '../data');
  if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });
  url = `file:${path.join(DB_DIR, 'roomsplit.db')}`;
  console.log('⚠️ TURSO_DATABASE_URL not found, using local fallback:', url);
}

const client = createClient({
  url,
  authToken: authToken || undefined,
});

async function initDB() {
  try {
    await client.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id         TEXT PRIMARY KEY,
        username   TEXT UNIQUE,
        name       TEXT NOT NULL,
        email      TEXT UNIQUE NOT NULL,
        password   TEXT,
        avatar     TEXT DEFAULT '',
        color      TEXT DEFAULT '#6366f1',
        upi_id     TEXT DEFAULT '',
        dietary    TEXT DEFAULT '[]',
        dislikes   TEXT DEFAULT '[]',
        allergies  TEXT DEFAULT '[]',
        created_at TEXT DEFAULT (datetime('now'))
      );
    `);
    
    // Auto-migrate: Add upi_id if it doesn't exist (fails silently if already exists)
    try { await client.execute("ALTER TABLE users ADD COLUMN upi_id TEXT DEFAULT '';"); } catch(e) {}
    
    await client.execute(`
      CREATE TABLE IF NOT EXISTS groups_t (
        id          TEXT PRIMARY KEY,
        name        TEXT NOT NULL,
        description TEXT DEFAULT '',
        currency    TEXT DEFAULT 'INR',
        created_by  TEXT,
        total_spent REAL DEFAULT 0,
        is_active   INTEGER DEFAULT 1,
        created_at  TEXT DEFAULT (datetime('now'))
      );
    `);
    
    await client.execute(`
      CREATE TABLE IF NOT EXISTS group_members (
        group_id  TEXT,
        user_id   TEXT,
        role      TEXT DEFAULT 'member',
        joined_at TEXT DEFAULT (datetime('now')),
        PRIMARY KEY (group_id, user_id)
      );
    `);
    
    await client.execute(`
      CREATE TABLE IF NOT EXISTS group_join_requests (
        id         TEXT PRIMARY KEY,
        group_id   TEXT NOT NULL,
        user_id    TEXT NOT NULL,
        type       TEXT DEFAULT 'request',
        status     TEXT DEFAULT 'pending',
        created_at TEXT DEFAULT (datetime('now')),
        UNIQUE(group_id, user_id)
      );
    `);

    await client.execute(`
      CREATE TABLE IF NOT EXISTS recurring_items (
        id                TEXT PRIMARY KEY,
        group_id          TEXT NOT NULL,
        title             TEXT NOT NULL,
        amount            REAL NOT NULL,
        category          TEXT DEFAULT 'grocery',
        default_consumers TEXT DEFAULT '[]',
        created_by        TEXT NOT NULL,
        created_at        TEXT DEFAULT (datetime('now'))
      );
    `);

    await client.execute(`
      CREATE TABLE IF NOT EXISTS expenses (
        id           TEXT PRIMARY KEY,
        group_id     TEXT NOT NULL,
        paid_by      TEXT NOT NULL,
        created_by   TEXT,
        title        TEXT NOT NULL,
        description  TEXT DEFAULT '',
        total_amount REAL NOT NULL,
        category     TEXT DEFAULT 'grocery',
        date         TEXT DEFAULT (datetime('now')),
        is_settled   INTEGER DEFAULT 0,
        created_at   TEXT DEFAULT (datetime('now'))
      );
    `);
    
    await client.execute(`
      CREATE TABLE IF NOT EXISTS expense_items (
        id                TEXT PRIMARY KEY,
        expense_id        TEXT NOT NULL,
        name              TEXT NOT NULL,
        total_cost        REAL NOT NULL,
        cost_per_consumer REAL DEFAULT 0,
        category          TEXT DEFAULT 'grocery'
      );
    `);
    
    await client.execute(`
      CREATE TABLE IF NOT EXISTS item_consumers (
        item_id TEXT,
        user_id TEXT,
        PRIMARY KEY (item_id, user_id)
      );
    `);
    
    await client.execute(`
      CREATE TABLE IF NOT EXISTS splits (
        id         TEXT PRIMARY KEY,
        expense_id TEXT NOT NULL,
        user_id    TEXT NOT NULL,
        amount     REAL NOT NULL,
        is_paid    INTEGER DEFAULT 0
      );
    `);
    
    await client.execute(`
      CREATE TABLE IF NOT EXISTS settlements (
        id           TEXT PRIMARY KEY,
        group_id     TEXT NOT NULL,
        from_user    TEXT NOT NULL,
        to_user      TEXT NOT NULL,
        amount       REAL NOT NULL,
        note         TEXT DEFAULT '',
        status       TEXT DEFAULT 'pending_confirmation',
        completed_at TEXT,
        created_at   TEXT DEFAULT (datetime('now'))
      );
    `);

    await client.execute(`
      CREATE TABLE IF NOT EXISTS daily_consumptions (
        id                TEXT PRIMARY KEY,
        recurring_item_id TEXT NOT NULL,
        group_id          TEXT NOT NULL,
        date              TEXT NOT NULL,
        consumer_ids      TEXT DEFAULT '[]',
        created_at        TEXT DEFAULT (datetime('now')),
        UNIQUE(recurring_item_id, date)
      );
    `);

    await client.execute(`
      CREATE TABLE IF NOT EXISTS personal_expenses (
        id          TEXT PRIMARY KEY,
        user_id     TEXT NOT NULL,
        title       TEXT NOT NULL,
        amount      REAL NOT NULL,
        category    TEXT DEFAULT 'other',
        date        TEXT DEFAULT (datetime('now')),
        note        TEXT DEFAULT '',
        created_at  TEXT DEFAULT (datetime('now'))
      );
    `);

    // safeAlter equivalents
    const safeAlter = async (sql) => {
      try { await client.execute(sql); } catch (_) {}
    };

    await safeAlter(`ALTER TABLE users ADD COLUMN username TEXT`);
    await safeAlter(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username)`);
    await safeAlter(`ALTER TABLE group_members ADD COLUMN role TEXT DEFAULT 'member'`);
    await safeAlter(`ALTER TABLE group_members ADD COLUMN joined_at TEXT DEFAULT (datetime('now'))`);
    await safeAlter(`ALTER TABLE expenses ADD COLUMN created_by TEXT`);
    await safeAlter(`ALTER TABLE expenses ADD COLUMN recurring_item_id TEXT`);
    await safeAlter(`ALTER TABLE expenses ADD COLUMN is_recurring INTEGER DEFAULT 0`);
    await safeAlter(`ALTER TABLE expenses ADD COLUMN recurring_month TEXT DEFAULT ''`);
    await safeAlter(`ALTER TABLE settlements ADD COLUMN razorpay_link_id TEXT`);
    await safeAlter(`ALTER TABLE settlements ADD COLUMN razorpay_url TEXT`);
    await safeAlter(`ALTER TABLE settlements ADD COLUMN settlement_type TEXT DEFAULT 'all'`);
    await safeAlter(`ALTER TABLE users ADD COLUMN budget_start_day INTEGER DEFAULT 1`);

    try {
      await client.execute(`
        UPDATE group_members SET role = 'admin'
        WHERE group_id IN (SELECT id FROM groups_t)
        AND user_id IN (SELECT created_by FROM groups_t WHERE groups_t.id = group_members.group_id)
        AND role = 'member'
      `);
    } catch (_) {}

    try {
      await client.execute(`UPDATE expenses SET created_by = paid_by WHERE created_by IS NULL`);
    } catch (_) {}

    console.log('✅ Database connected & synced');
  } catch (error) {
    console.error('❌ Database init error:', error);
  }
}

// Ensure DB is initialized when required
initDB();

// Build an async wrapper that matches db.prepare(x).get/all/run
const db = {
  prepare: (sql) => {
    return {
      get: async (...args) => {
        const res = await client.execute({ sql, args });
        return res.rows[0];
      },
      all: async (...args) => {
        const res = await client.execute({ sql, args });
        return res.rows;
      },
      run: async (...args) => {
        const res = await client.execute({ sql, args });
        return res;
      }
    };
  },
  client
};

module.exports = db;
