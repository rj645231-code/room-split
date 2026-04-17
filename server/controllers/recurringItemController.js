const db = require('../config/db');
const { newId } = require('../utils/helpers');

exports.getRecurringItems = async (req, res) => {
  try {
    const { groupId } = req.query;
    if (!groupId) return res.status(400).json({ success: false, message: 'groupId is required' });

    const rows = await db.prepare('SELECT * FROM recurring_items WHERE group_id = ? ORDER BY created_at DESC').all(groupId);
    
    const items = rows.map(r => ({
      ...r,
      _id: r.id,
      defaultConsumers: JSON.parse(r.default_consumers || '[]')
    }));

    res.json({ success: true, data: items });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

exports.createRecurringItem = async (req, res) => {
  try {
    const { groupId, title, amount, category = 'grocery', defaultConsumers = [] } = req.body;
    
    if (!groupId || !title || !amount) {
      return res.status(400).json({ success: false, message: 'groupId, title, and amount are required' });
    }

    const itemId = newId();
    const createdBy = req.user.id;

    await db.prepare(`
      INSERT INTO recurring_items (id, group_id, title, amount, category, default_consumers, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      itemId,
      groupId,
      title,
      parseFloat(amount),
      category,
      JSON.stringify(defaultConsumers),
      createdBy
    );

    const newItemRow = await db.prepare('SELECT * FROM recurring_items WHERE id = ?').get(itemId);
    const newItem = {
      ...newItemRow,
      _id: newItemRow.id,
      defaultConsumers: JSON.parse(newItemRow.default_consumers || '[]')
    };

    res.status(201).json({ success: true, data: newItem });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

exports.deleteRecurringItem = async (req, res) => {
  try {
    const item = await db.prepare('SELECT * FROM recurring_items WHERE id = ?').get(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: 'Not found' });

    const isCreator = item.created_by === req.user.id;
    const memberRow = await db.prepare('SELECT role FROM group_members WHERE group_id = ? AND user_id = ?').get(item.group_id, req.user.id);
    const isAdmin = memberRow?.role === 'admin';

    if (!isCreator && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Only creator or admin can delete this' });
    }

    await db.prepare('DELETE FROM recurring_items WHERE id = ?').run(req.params.id);
    res.json({ success: true, message: 'Recurring item deleted' });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

exports.logConsumption = async (req, res) => {
  try {
    const { recurringItemId, groupId, date, consumerIds = [] } = req.body;
    if (!recurringItemId || !groupId || !date) {
      return res.status(400).json({ success: false, message: 'Missing fields' });
    }

    const existing = await db.prepare('SELECT id FROM daily_consumptions WHERE recurring_item_id = ? AND date = ?').get(recurringItemId, date);
    if (existing) {
      await db.prepare('UPDATE daily_consumptions SET consumer_ids = ? WHERE id = ?').run(JSON.stringify(consumerIds), existing.id);
    } else {
      await db.prepare(`
        INSERT INTO daily_consumptions (id, recurring_item_id, group_id, date, consumer_ids)
        VALUES (?, ?, ?, ?, ?)
      `).run(newId(), recurringItemId, groupId, date, JSON.stringify(consumerIds));
    }
    
    res.json({ success: true, message: 'Consumption logged' });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

exports.getMonthlySummary = async (req, res) => {
  try {
    const { groupId, month } = req.query;
    if (!groupId || !month) return res.status(400).json({ success: false, message: 'groupId and month required' });

    const rows = await db.prepare(`SELECT * FROM daily_consumptions WHERE group_id = ? AND date LIKE ?`).all(groupId, `${month}-%`);
    const templates = await db.prepare(`SELECT * FROM recurring_items WHERE group_id = ?`).all(groupId);
    
    const consumptions = rows.map(r => ({
      ...r,
      _id: r.id,
      consumerIds: JSON.parse(r.consumer_ids || '[]')
    }));

    const parsedTemplates = templates.map(t => ({
      ...t,
      _id: t.id,
      defaultConsumers: JSON.parse(t.default_consumers || '[]')
    }));

    res.json({ success: true, data: { consumptions, templates: parsedTemplates } });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};
