const db = require('../config/db');
const { newId, parseUser, parseExpense } = require('../utils/helpers');
const { computeSplits } = require('../utils/splitAlgorithm');

const getFullExpense = (expenseId) => {
  const exp = db.prepare('SELECT * FROM expenses WHERE id = ?').get(expenseId);
  if (!exp) return null;

  const paidByUser = db.prepare('SELECT * FROM users WHERE id = ?').get(exp.paid_by);

  const itemRows = db.prepare('SELECT * FROM expense_items WHERE expense_id = ?').all(expenseId);
  const items = itemRows.map(item => {
    const consumerRows = db.prepare(`
      SELECT u.* FROM users u
      JOIN item_consumers ic ON ic.user_id = u.id
      WHERE ic.item_id = ?
    `).all(item.id);
    return {
      ...item,
      _id: item.id,
      totalCost: item.total_cost,
      costPerConsumer: item.cost_per_consumer,
      consumers: consumerRows.map(parseUser),
    };
  });

  const splitRows = db.prepare('SELECT * FROM splits WHERE expense_id = ?').all(expenseId);
  const splits = splitRows.map(s => {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(s.user_id);
    return {
      ...s,
      _id: s.id,
      user: parseUser(user),
      amount: s.amount,
      isPaid: !!s.is_paid,
    };
  });

  return parseExpense(
    { ...exp, paid_by_user: parseUser(paidByUser) },
    items,
    splits,
  );
};

exports.getExpenses = (req, res) => {
  try {
    const { groupId } = req.query;
    const rows = groupId
      ? db.prepare('SELECT id FROM expenses WHERE group_id = ? ORDER BY date DESC, created_at DESC').all(groupId)
      : db.prepare('SELECT id FROM expenses ORDER BY date DESC, created_at DESC').all();

    const expenses = rows.map(r => getFullExpense(r.id)).filter(Boolean);
    res.json({ success: true, data: expenses });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

exports.getExpense = (req, res) => {
  try {
    const expense = getFullExpense(req.params.id);
    if (!expense) return res.status(404).json({ success: false, message: 'Expense not found' });
    res.json({ success: true, data: expense });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

exports.getStats = (req, res) => {
  try {
    const { groupId } = req.query;
    const filter = groupId ? 'WHERE group_id = ?' : '';
    const args = groupId ? [groupId] : [];

    const rows = db.prepare(`SELECT category, total_amount FROM expenses ${filter}`).all(...args);
    const total = rows.reduce((s, r) => s + r.total_amount, 0);
    const byCategory = {};
    rows.forEach(r => { byCategory[r.category] = (byCategory[r.category] || 0) + r.total_amount; });

    res.json({ success: true, data: { total, count: rows.length, byCategory } });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

exports.createExpense = (req, res) => {
  try {
    const { group, paidBy, title, description = '', category = 'grocery', totalAmount, items = [] } = req.body;
    if (!group || !paidBy || !items.length) {
      return res.status(400).json({ success: false, message: 'group, paidBy and items are required' });
    }

    const expId = newId();
    const computedTotal = totalAmount || items.reduce((s, i) => s + (parseFloat(i.totalCost) || 0), 0);
    const createdBy = req.user.id; // Track who entered this expense

    // Insert expense
    db.prepare(`
      INSERT INTO expenses (id, group_id, paid_by, created_by, title, description, total_amount, category, date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(expId, group, paidBy, createdBy, title || items[0]?.name || 'Expense',
        description, computedTotal, category,
        new Date().toISOString());

    // Insert items + consumers
    items.forEach(item => {
      const itemId = newId();
      const consumers = item.consumers || [];
      const costPerConsumer = consumers.length ? (parseFloat(item.totalCost) / consumers.length) : 0;

      db.prepare(`
        INSERT INTO expense_items (id, expense_id, name, total_cost, cost_per_consumer, category)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(itemId, expId, item.name, parseFloat(item.totalCost), costPerConsumer, category);

      const insConsumer = db.prepare('INSERT OR IGNORE INTO item_consumers (item_id, user_id) VALUES (?, ?)');
      consumers.forEach(uid => insConsumer.run(itemId, uid));
    });

    // Compute and insert splits
    const splits = computeSplits(items, paidBy);
    const insSplit = db.prepare('INSERT INTO splits (id, expense_id, user_id, amount) VALUES (?, ?, ?, ?)');
    splits.forEach(s => insSplit.run(newId(), expId, s.user, s.amount));

    // Update group totalSpent
    db.prepare('UPDATE groups_t SET total_spent = total_spent + ? WHERE id = ?').run(computedTotal, group);

    res.status(201).json({ success: true, data: getFullExpense(expId) });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

exports.updateExpense = (req, res) => {
  try {
    const { title, description, category } = req.body;
    const existing = db.prepare('SELECT * FROM expenses WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ success: false, message: 'Not found' });

    db.prepare(`
      UPDATE expenses SET title = ?, description = ?, category = ? WHERE id = ?
    `).run(
      title       || existing.title,
      description ?? existing.description,
      category    || existing.category,
      req.params.id,
    );

    res.json({ success: true, data: getFullExpense(req.params.id) });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

exports.deleteExpense = (req, res) => {
  try {
    const exp = db.prepare('SELECT * FROM expenses WHERE id = ?').get(req.params.id);
    if (!exp) return res.status(404).json({ success: false, message: 'Not found' });

    // Only the creator OR a group admin can delete
    const isCreator = exp.created_by === req.user.id;
    const memberRow = db.prepare('SELECT role FROM group_members WHERE group_id = ? AND user_id = ?').get(exp.group_id, req.user.id);
    const isAdmin = memberRow?.role === 'admin';

    if (!isCreator && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Only the expense creator or a group admin can delete this expense' });
    }

    // Cascade delete items, consumers, splits
    const items = db.prepare('SELECT id FROM expense_items WHERE expense_id = ?').all(req.params.id);
    items.forEach(item => {
      db.prepare('DELETE FROM item_consumers WHERE item_id = ?').run(item.id);
    });
    db.prepare('DELETE FROM expense_items WHERE expense_id = ?').run(req.params.id);
    db.prepare('DELETE FROM splits WHERE expense_id = ?').run(req.params.id);
    db.prepare('DELETE FROM expenses WHERE id = ?').run(req.params.id);

    // Deduct from group totalSpent
    db.prepare('UPDATE groups_t SET total_spent = total_spent - ? WHERE id = ?').run(exp.total_amount, exp.group_id);

    res.json({ success: true, message: 'Expense deleted' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};
