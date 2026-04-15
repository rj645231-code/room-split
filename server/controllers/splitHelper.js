const db = require('../config/db');
const { minimizeSettlements } = require('../utils/splitAlgorithm');

/**
 * Compute balances and settlements for a group using SQLite data
 */
const computeGroupBalances = async (groupId, members) => {
  const expenses = await db.prepare(`
    SELECT e.*, u.name as payer_name, u.color as payer_color
    FROM expenses e
    JOIN users u ON u.id = e.paid_by
    WHERE e.group_id = ? AND e.is_settled = 0
  `).all(groupId);

  const balanceMap = {};
  members.forEach(m => {
    balanceMap[m._id] = { userId: m._id, name: m.name, color: m.color, balance: 0 };
  });

  for (const exp of expenses) {
    // Fetch unpaid splits first — payer is credited only with what others owe them,
    // NOT the full total_amount. This implicitly deducts the payer's own share,
    // which is never stored as a split record by computeSplits().
    const splits = await db.prepare('SELECT * FROM splits WHERE expense_id = ? AND is_paid = 0').all(exp.id);

    const totalOwedByOthers = splits.reduce((sum, s) => sum + s.amount, 0);
    if (balanceMap[exp.paid_by]) {
      balanceMap[exp.paid_by].balance += totalOwedByOthers;
    }

    for (const s of splits) {
      if (balanceMap[s.user_id]) {
        balanceMap[s.user_id].balance -= s.amount;
      }
    }
  }

  const balances = Object.values(balanceMap).map(b => ({
    ...b,
    balance: parseFloat(b.balance.toFixed(2)),
  }));

  const settlements = minimizeSettlements([...balances]);
  return { balances, settlements };
};

/**
 * Generate smart suggestions from expense history
 */
const generateSmartSuggestions = async (groupId, members) => {
  const items = await db.prepare(`
    SELECT ei.id, ei.name, ic.user_id
    FROM expense_items ei
    JOIN expenses e ON e.id = ei.expense_id
    JOIN item_consumers ic ON ic.item_id = ei.id
    WHERE e.group_id = ?
  `).all(groupId);

  const itemConsumptionMap = {};
  items.forEach(row => {
    const key = row.name.toLowerCase().trim();
    if (!itemConsumptionMap[key]) itemConsumptionMap[key] = {};
    itemConsumptionMap[key][row.user_id] = (itemConsumptionMap[key][row.user_id] || 0) + 1;
  });

  const suggestions = {};
  const memberIds = members.map(m => m._id);

  Object.entries(itemConsumptionMap).forEach(([item, consumptionMap]) => {
    const totalOccurrences = Object.values(consumptionMap).reduce((a, b) => a + b, 0);
    if (totalOccurrences < 2) return;

    const suggested = memberIds.filter(uid => {
      const userCount = consumptionMap[uid] || 0;
      const freq = userCount / (totalOccurrences / Object.keys(consumptionMap).length || 1);
      return freq >= 0.6;
    });

    const neverConsumers = memberIds.filter(uid => !consumptionMap[uid] && totalOccurrences >= 3);

    suggestions[item] = { suggested, neverConsumers, frequency: consumptionMap };
  });

  return suggestions;
};

module.exports = { computeGroupBalances, generateSmartSuggestions };
