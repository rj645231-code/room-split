const db = require('../config/db');
const { newId, parseUser } = require('../utils/helpers');

exports.getUsers = async (req, res) => {
  try {
    const rows = await db.prepare('SELECT * FROM users ORDER BY created_at DESC').all();
    res.json({ success: true, data: rows.map(parseUser) });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

exports.getUser = async (req, res) => {
  try {
    const row = await db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, data: parseUser(row) });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

exports.createUser = async (req, res) => {
  try {
    const { name, email, color = '#6366f1', avatar = '', preferences = {} } = req.body;
    if (!name || !email) return res.status(400).json({ success: false, message: 'Name and email required' });

    const id = newId();
    await db.prepare(`
      INSERT INTO users (id, name, email, color, avatar, dietary, dislikes, allergies)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, name, email, color, avatar,
      JSON.stringify(preferences.dietary   || []),
      JSON.stringify(preferences.dislikes  || []),
      JSON.stringify(preferences.allergies || []),
    );

    const user = await db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    res.status(201).json({ success: true, data: parseUser(user) });
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(400).json({ success: false, message: 'Email already exists' });
    res.status(500).json({ success: false, message: e.message });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const { name, email, color, avatar, preferences = {} } = req.body;
    const existing = await db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ success: false, message: 'User not found' });

    await db.prepare(`
      UPDATE users SET
        name      = ?, email     = ?, color    = ?,
        avatar    = ?, dietary   = ?, dislikes = ?, allergies = ?
      WHERE id = ?
    `).run(
      name      || existing.name,
      email     || existing.email,
      color     || existing.color,
      avatar    || existing.avatar,
      JSON.stringify(preferences.dietary   || JSON.parse(existing.dietary)),
      JSON.stringify(preferences.dislikes  || JSON.parse(existing.dislikes)),
      JSON.stringify(preferences.allergies || JSON.parse(existing.allergies)),
      req.params.id,
    );

    const updated = await db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
    res.json({ success: true, data: parseUser(updated) });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

exports.deleteUser = async (req, res) => {
  try {
    await db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
    res.json({ success: true, message: 'User deleted' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};
