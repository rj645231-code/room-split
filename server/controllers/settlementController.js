const db = require('../config/db');
const { newId, parseUser, parseSettlement } = require('../utils/helpers');
const { computeGroupBalances } = require('./splitHelper');

exports.getSettlements = async (req, res) => {
  try {
    const { groupId, status } = req.query;
    let query = 'SELECT * FROM settlements WHERE 1=1';
    const args = [];
    if (groupId) { query += ' AND group_id = ?'; args.push(groupId); }
    if (status)  { query += ' AND status = ?';   args.push(status); }
    query += ' ORDER BY created_at DESC';

    const rows = await db.prepare(query).all(...args);
    const result = await Promise.all(rows.map(async s => {
      const fromUser = parseUser(await db.prepare('SELECT * FROM users WHERE id = ?').get(s.from_user));
      const toUser   = parseUser(await db.prepare('SELECT * FROM users WHERE id = ?').get(s.to_user));
      return parseSettlement(s, fromUser, toUser);
    }));
    res.json({ success: true, data: result });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

exports.getSuggestedSettlements = async (req, res) => {
  try {
    const { groupId } = req.params;
    const memberRows = await db.prepare(`
      SELECT u.* FROM users u
      JOIN group_members gm ON gm.user_id = u.id
      WHERE gm.group_id = ?
    `).all(groupId);
    const members = memberRows.map(parseUser);

    const { balances, settlements } = await computeGroupBalances(groupId, members, 'all');
    const { balances: regularBalances, settlements: regularSettlements } = await computeGroupBalances(groupId, members, 'regular');
    const { balances: recurringBalances, settlements: recurringSettlements } = await computeGroupBalances(groupId, members, 'recurring');

    const enrich = (settlementsArr) => settlementsArr.map(s => {
      const fromUser = members.find(m => m._id === s.from);
      const toUser   = members.find(m => m._id === s.to);
      return { ...s, fromUser, toUser };
    });

    res.json({ 
      success: true, 
      data: { 
        settlements: enrich(settlements), balances,
        regularSettlements: enrich(regularSettlements), regularBalances,
        recurringSettlements: enrich(recurringSettlements), recurringBalances
      } 
    });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

exports.createSettlement = async (req, res) => {
  try {
    const { group, from, to, amount, note = '', type = 'all' } = req.body;
    if (!group || !from || !to || !amount) {
      return res.status(400).json({ success: false, message: 'group, from, to, amount required' });
    }

    if (from !== req.user.id) {
      return res.status(403).json({ success: false, message: 'You can only record payments for yourself' });
    }

    const id = newId();
    await db.prepare(`
      INSERT INTO settlements (id, group_id, from_user, to_user, amount, note, status, settlement_type)
      VALUES (?, ?, ?, ?, ?, ?, 'pending_confirmation', ?)
    `).run(id, group, from, to, amount, note, type);

    const s = await db.prepare('SELECT * FROM settlements WHERE id = ?').get(id);
    const fromUser = parseUser(await db.prepare('SELECT * FROM users WHERE id = ?').get(from));
    const toUser   = parseUser(await db.prepare('SELECT * FROM users WHERE id = ?').get(to));
    res.status(201).json({ success: true, data: parseSettlement(s, fromUser, toUser) });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

exports.confirmSettlement = async (req, res) => {
  try {
    const settlement = await db.prepare('SELECT * FROM settlements WHERE id = ?').get(req.params.id);
    if (!settlement) return res.status(404).json({ success: false, message: 'Settlement not found' });

    if (settlement.to_user !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Only the payment receiver can confirm this settlement' });
    }

    if (settlement.status !== 'pending_confirmation') {
      return res.status(400).json({ success: false, message: `Settlement is already ${settlement.status}` });
    }

    await db.prepare(`
      UPDATE settlements SET status = 'completed', completed_at = ? WHERE id = ?
    `).run(new Date().toISOString(), req.params.id);

    let expenseQuery = 'SELECT id FROM expenses WHERE group_id = ? AND is_settled = 0';
    if (settlement.settlement_type === 'regular') expenseQuery += ' AND is_recurring = 0';
    else if (settlement.settlement_type === 'recurring') expenseQuery += ' AND is_recurring = 1';
    
    const expenses = await db.prepare(expenseQuery).all(settlement.group_id);
    const markPaid = await db.prepare('UPDATE splits SET is_paid = 1 WHERE expense_id = ? AND user_id = ?');
    for (const e of expenses) {
      await markPaid.run(e.id, settlement.from_user);
    }

    const updated  = await db.prepare('SELECT * FROM settlements WHERE id = ?').get(req.params.id);
    const fromUser = parseUser(await db.prepare('SELECT * FROM users WHERE id = ?').get(updated.from_user));
    const toUser   = parseUser(await db.prepare('SELECT * FROM users WHERE id = ?').get(updated.to_user));
    res.json({ success: true, data: parseSettlement(updated, fromUser, toUser) });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

exports.cancelSettlement = async (req, res) => {
  try {
    const settlement = await db.prepare('SELECT * FROM settlements WHERE id = ?').get(req.params.id);
    if (!settlement) return res.status(404).json({ success: false, message: 'Settlement not found' });

    if (settlement.from_user !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Only the payer can cancel' });
    }
    if (settlement.status !== 'pending_confirmation') {
      return res.status(400).json({ success: false, message: 'Only pending settlements can be cancelled' });
    }

    await db.prepare(`UPDATE settlements SET status = 'cancelled' WHERE id = ?`).run(req.params.id);
    res.json({ success: true, message: 'Settlement cancelled' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

const Razorpay = require('razorpay');
let razorpayClient;
if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
  razorpayClient = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
}

exports.generatePaymentLink = async (req, res) => {
  try {
    if (!razorpayClient) return res.status(500).json({ success: false, message: 'Razorpay is not configured on the server. Please add API Keys.' });
    const { group, from, to, amount, note = 'Debt Settlement' } = req.body;
    if (!group || !from || !to || !amount) {
      return res.status(400).json({ success: false, message: 'group, from, to, amount required' });
    }

    if (from !== req.user.id) {
       return res.status(403).json({ success: false, message: 'You can only record payments for yourself' });
    }

    const fromUser = await db.prepare('SELECT * FROM users WHERE id = ?').get(from);
    if (!fromUser) return res.status(404).json({ success: false, message: 'User not found' });
    
    const amountInPaise = Math.round(parseFloat(amount) * 100);

    const paymentLinkRequest = {
      amount: amountInPaise,
      currency: "INR",
      accept_partial: false,
      description: `Room Split Settlement - ${note}`,
      customer: {
        name: fromUser.name,
        email: fromUser.email,
        contact: "+919000000000" // Adding a dummy contact since Razorpay sometimes requires it depending on config
      },
      notify: { sms: false, email: false },
      reminder_enable: false,
      notes: { group_id: group, from_user: from, to_user: to }
    };

    const paymentLink = await razorpayClient.paymentLink.create(paymentLinkRequest);

    const id = newId();
    const sType = req.body.type || 'all';
    await db.prepare(`
      INSERT INTO settlements (id, group_id, from_user, to_user, amount, note, status, razorpay_link_id, razorpay_url, settlement_type)
      VALUES (?, ?, ?, ?, ?, ?, 'pending_payment', ?, ?, ?)
    `).run(id, group, from, to, amount, note, paymentLink.id, paymentLink.short_url, sType);

    res.json({ success: true, url: paymentLink.short_url });
  } catch (error) {
    console.error('Razorpay Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.verifyPaymentLink = async (req, res) => {
  try {
    if (!razorpayClient) return res.status(500).json({ success: false, message: 'Razorpay is not configured' });
    const settlement = await db.prepare('SELECT * FROM settlements WHERE id = ?').get(req.params.id);
    if (!settlement) return res.status(404).json({ success: false, message: 'Settlement not found' });
    
    if (!settlement.razorpay_link_id) return res.status(400).json({ success: false, message: 'Not a Razorpay settlement' });

    const razorpayData = await razorpayClient.paymentLink.fetch(settlement.razorpay_link_id);
    
    if (razorpayData.status === 'paid') {
        const currentDate = new Date().toISOString();
        await db.prepare(`UPDATE settlements SET status = 'completed', completed_at = ? WHERE id = ?`).run(currentDate, settlement.id);
        
        let expenseQuery = 'SELECT id FROM expenses WHERE group_id = ? AND is_settled = 0';
        if (settlement.settlement_type === 'regular') expenseQuery += ' AND is_recurring = 0';
        else if (settlement.settlement_type === 'recurring') expenseQuery += ' AND is_recurring = 1';

        const expenses = await db.prepare(expenseQuery).all(settlement.group_id);
        const markPaid = await db.prepare('UPDATE splits SET is_paid = 1 WHERE expense_id = ? AND user_id = ?');
        for (const e of expenses) {
          await markPaid.run(e.id, settlement.from_user);
        }
        
        return res.json({ success: true, message: 'Payment confirmed & marked as completed', status: 'completed' });
    }
    
    res.json({ success: true, message: 'Payment pending', status: razorpayData.status });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
