const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_DIR = path.join(__dirname, '../data');
if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });

const db = new Database(path.join(DB_DIR, 'roomsplit.db'));

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ─── Core tables ────────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id         TEXT PRIMARY KEY,
    username   TEXT UNIQUE,
    name       TEXT NOT NULL,
    email      TEXT UNIQUE NOT NULL,
    password   TEXT,
    avatar     TEXT DEFAULT '',
    color      TEXT DEFAULT '#6366f1',
    dietary    TEXT DEFAULT '[]',
    dislikes   TEXT DEFAULT '[]',
    allergies  TEXT DEFAULT '[]',
    created_at TEXT DEFAULT (datetime('now'))
  );

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

  CREATE TABLE IF NOT EXISTS group_members (
    group_id  TEXT,
    user_id   TEXT,
    role      TEXT DEFAULT 'member',
    joined_at TEXT DEFAULT (datetime('now')),
    PRIMARY KEY (group_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS group_join_requests (
    id         TEXT PRIMARY KEY,
    group_id   TEXT NOT NULL,
    user_id    TEXT NOT NULL,
    type       TEXT DEFAULT 'request',
    status     TEXT DEFAULT 'pending',
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(group_id, user_id)
  );

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

  CREATE TABLE IF NOT EXISTS expense_items (
    id                TEXT PRIMARY KEY,
    expense_id        TEXT NOT NULL,
    name              TEXT NOT NULL,
    total_cost        REAL NOT NULL,
    cost_per_consumer REAL DEFAULT 0,
    category          TEXT DEFAULT 'grocery'
  );

  CREATE TABLE IF NOT EXISTS item_consumers (
    item_id TEXT,
    user_id TEXT,
    PRIMARY KEY (item_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS splits (
    id         TEXT PRIMARY KEY,
    expense_id TEXT NOT NULL,
    user_id    TEXT NOT NULL,
    amount     REAL NOT NULL,
    is_paid    INTEGER DEFAULT 0
  );

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

// ─── Safe migrations for existing databases ──────────────────────────────────
const safeAlter = (sql) => {
  try { db.exec(sql); } catch (_) { /* column already exists */ }
};

safeAlter(`ALTER TABLE users ADD COLUMN username TEXT`);
safeAlter(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username)`);
safeAlter(`ALTER TABLE group_members ADD COLUMN role TEXT DEFAULT 'member'`);
safeAlter(`ALTER TABLE group_members ADD COLUMN joined_at TEXT DEFAULT (datetime('now'))`);
safeAlter(`ALTER TABLE expenses ADD COLUMN created_by TEXT`);

// Back-fill role for existing group creators
try {
  db.exec(`
    UPDATE group_members SET role = 'admin'
    WHERE group_id IN (SELECT id FROM groups_t)
    AND user_id IN (SELECT created_by FROM groups_t WHERE groups_t.id = group_members.group_id)
    AND role = 'member'
  `);
} catch (_) {}

// Back-fill created_by for existing expenses (set to paid_by as best guess)
try {
  db.exec(`UPDATE expenses SET created_by = paid_by WHERE created_by IS NULL`);
} catch (_) {}

console.log('✅ SQLite ready:', path.join(DB_DIR, 'roomsplit.db'));
module.exports = db;
