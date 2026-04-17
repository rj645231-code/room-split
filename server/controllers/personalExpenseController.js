const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');

// GET /api/personal-expenses
exports.getAll = async (req, res) => {
  try {
    const userId = req.user.id;
    const { month } = req.query; // optional: YYYY-MM

    let sql = `SELECT * FROM personal_expenses WHERE user_id = ?`;
    const args = [userId];

    if (month) {
      sql += ` AND strftime('%Y-%m', date) = ?`;
      args.push(month);
    }

    sql += ` ORDER BY date DESC`;
    const rows = await db.prepare(sql).all(...args);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/personal-expenses
exports.create = async (req, res) => {
  try {
    const userId = req.user.id;
    const { title, amount, category = 'other', date, note = '' } = req.body;

    if (!title || !amount) {
      return res.status(400).json({ success: false, message: 'Title and amount are required' });
    }

    const id = uuidv4();
    const expDate = date || new Date().toISOString();

    await db.prepare(
      `INSERT INTO personal_expenses (id, user_id, title, amount, category, date, note)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(id, userId, title.trim(), parseFloat(amount), category, expDate, note.trim());

    const row = await db.prepare(`SELECT * FROM personal_expenses WHERE id = ?`).get(id);
    res.status(201).json({ success: true, data: row });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/personal-expenses/:id
exports.update = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { title, amount, category, date, note } = req.body;

    const existing = await db.prepare(`SELECT * FROM personal_expenses WHERE id = ? AND user_id = ?`).get(id, userId);
    if (!existing) return res.status(404).json({ success: false, message: 'Not found' });

    await db.prepare(
      `UPDATE personal_expenses SET title = ?, amount = ?, category = ?, date = ?, note = ? WHERE id = ?`
    ).run(
      title ?? existing.title,
      amount != null ? parseFloat(amount) : existing.amount,
      category ?? existing.category,
      date ?? existing.date,
      note ?? existing.note,
      id
    );

    const row = await db.prepare(`SELECT * FROM personal_expenses WHERE id = ?`).get(id);
    res.json({ success: true, data: row });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/personal-expenses/:id
exports.remove = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const existing = await db.prepare(`SELECT * FROM personal_expenses WHERE id = ? AND user_id = ?`).get(id, userId);
    if (!existing) return res.status(404).json({ success: false, message: 'Not found' });

    await db.prepare(`DELETE FROM personal_expenses WHERE id = ?`).run(id);
    res.json({ success: true, message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/personal-expenses/summary  — for analytics integration
exports.getSummary = async (req, res) => {
  try {
    const userId = req.user.id;
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const rows = await db.prepare(
      `SELECT * FROM personal_expenses WHERE user_id = ? AND strftime('%Y-%m', date) = ? ORDER BY date DESC`
    ).all(userId, month);

    const total = rows.reduce((s, r) => s + r.amount, 0);
    const byCategory = {};
    rows.forEach(r => { byCategory[r.category] = (byCategory[r.category] || 0) + r.amount; });

    res.json({ success: true, data: { total: Math.round(total), byCategory, expenses: rows, month } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
