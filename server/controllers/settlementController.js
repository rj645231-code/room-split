const db = require('../config/db');
const { newId, parseUser, parseSettlement } = require('../utils/helpers');
const { computeGroupBalances } = require('./splitHelper');

exports.getSettlements = (req, res) => {
  try {
    const { groupId, status } = req.query;
    let query = 'SELECT * FROM settlements WHERE 1=1';
    const args = [];
    if (groupId) { query += ' AND group_id = ?'; args.push(groupId); }
    if (status)  { query += ' AND status = ?';   args.push(status); }
    query += ' ORDER BY created_at DESC';

    const rows = db.prepare(query).all(...args);
    const result = rows.map(s => {
      const fromUser = parseUser(db.prepare('SELECT * FROM users WHERE id = ?').get(s.from_user));
      const toUser   = parseUser(db.prepare('SELECT * FROM users WHERE id = ?').get(s.to_user));
      return parseSettlement(s, fromUser, toUser);
    });
    res.json({ success: true, data: result });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

exports.getSuggestedSettlements = (req, res) => {
  try {
    const { groupId } = req.params;
    const memberRows = db.prepare(`
      SELECT u.* FROM users u
      JOIN group_members gm ON gm.user_id = u.id
      WHERE gm.group_id = ?
    `).all(groupId);
    const members = memberRows.map(parseUser);

    const { balances, settlements } = computeGroupBalances(groupId, members);

    const enriched = settlements.map(s => {
      const fromUser = members.find(m => m._id === s.from);
      const toUser   = members.find(m => m._id === s.to);
      return { ...s, fromUser, toUser };
    });

    res.json({ success: true, data: { settlements: enriched, balances } });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

// Step 1: Payer creates settlement → status = 'pending_confirmation'
exports.createSettlement = (req, res) => {
  try {
    const { group, from, to, amount, note = '' } = req.body;
    if (!group || !from || !to || !amount) {
      return res.status(400).json({ success: false, message: 'group, from, to, amount required' });
    }

    // Must be the payer themselves initiating
    if (from !== req.user.id) {
      return res.status(403).json({ success: false, message: 'You can only record payments for yourself' });
    }

    const id = newId();
    db.prepare(`
      INSERT INTO settlements (id, group_id, from_user, to_user, amount, note, status)
      VALUES (?, ?, ?, ?, ?, ?, 'pending_confirmation')
    `).run(id, group, from, to, amount, note);

    const s = db.prepare('SELECT * FROM settlements WHERE id = ?').get(id);
    const fromUser = parseUser(db.prepare('SELECT * FROM users WHERE id = ?').get(from));
    const toUser   = parseUser(db.prepare('SELECT * FROM users WHERE id = ?').get(to));
    res.status(201).json({ success: true, data: parseSettlement(s, fromUser, toUser) });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

// Step 2: Receiver confirms they got the money → status = 'completed'
exports.confirmSettlement = (req, res) => {
  try {
    const settlement = db.prepare('SELECT * FROM settlements WHERE id = ?').get(req.params.id);
    if (!settlement) return res.status(404).json({ success: false, message: 'Settlement not found' });

    // Only the receiver (to_user) can confirm
    if (settlement.to_user !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Only the payment receiver can confirm this settlement' });
    }

    if (settlement.status !== 'pending_confirmation') {
      return res.status(400).json({ success: false, message: `Settlement is already ${settlement.status}` });
    }

    db.prepare(`
      UPDATE settlements SET status = 'completed', completed_at = ? WHERE id = ?
    `).run(new Date().toISOString(), req.params.id);

    // Mark that user's splits as paid in this group
    const expenses = db.prepare('SELECT id FROM expenses WHERE group_id = ? AND is_settled = 0').all(settlement.group_id);
    const markPaid = db.prepare('UPDATE splits SET is_paid = 1 WHERE expense_id = ? AND user_id = ?');
    expenses.forEach(e => markPaid.run(e.id, settlement.from_user));

    const updated  = db.prepare('SELECT * FROM settlements WHERE id = ?').get(req.params.id);
    const fromUser = parseUser(db.prepare('SELECT * FROM users WHERE id = ?').get(updated.from_user));
    const toUser   = parseUser(db.prepare('SELECT * FROM users WHERE id = ?').get(updated.to_user));
    res.json({ success: true, data: parseSettlement(updated, fromUser, toUser) });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

// Payer can cancel a pending_confirmation settlement (in case of mistake)
exports.cancelSettlement = (req, res) => {
  try {
    const settlement = db.prepare('SELECT * FROM settlements WHERE id = ?').get(req.params.id);
    if (!settlement) return res.status(404).json({ success: false, message: 'Settlement not found' });

    if (settlement.from_user !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Only the payer can cancel' });
    }
    if (settlement.status !== 'pending_confirmation') {
      return res.status(400).json({ success: false, message: 'Only pending settlements can be cancelled' });
    }

    db.prepare(`UPDATE settlements SET status = 'cancelled' WHERE id = ?`).run(req.params.id);
    res.json({ success: true, message: 'Settlement cancelled' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};
