/**
 * Agent 6: Algorithm Engineer
 * Smart expense splitting + settlement minimization
 */

/**
 * Compute splits for an expense with per-item consumer tracking
 * @param {Array} items - [{name, totalCost, consumers:[userId]}]
 * @param {string} paidById - who paid
 * @returns {Array} splits - [{userId, amount}]
 */
const computeSplits = (items, paidById) => {
  const owedMap = {}; // userId -> amount owed

  items.forEach(item => {
    const { totalCost, consumers } = item;
    if (!consumers || consumers.length === 0) return;

    const share = totalCost / consumers.length;
    consumers.forEach(userId => {
      const id = userId.toString();
      if (id === paidById.toString()) return; // payer's own share
      owedMap[id] = (owedMap[id] || 0) + share;
    });
  });

  return Object.entries(owedMap).map(([userId, amount]) => ({
    user: userId,
    amount: parseFloat(amount.toFixed(2)),
    isPaid: false,
  }));
};

/**
 * Agent 6: Minimize settlements using net balance algorithm
 * Given a list of balances [{userId, balance}] (+ = owed money, - = owes money)
 * Returns minimum number of transactions to settle all debts
 * @param {Array} balances - [{userId, name, balance}]
 * @returns {Array} transactions - [{from, to, amount}]
 */
const minimizeSettlements = (balances) => {
  // Separate into creditors (positive) and debtors (negative)
  const creditors = balances.filter(b => b.balance > 0.01).map(b => ({ ...b }));
  const debtors = balances.filter(b => b.balance < -0.01).map(b => ({ ...b }));

  const transactions = [];

  let i = 0, j = 0;
  while (i < creditors.length && j < debtors.length) {
    const creditor = creditors[i];
    const debtor = debtors[j];

    const amount = Math.min(creditor.balance, Math.abs(debtor.balance));
    const amount_rounded = parseFloat(amount.toFixed(2));

    if (amount_rounded > 0) {
      transactions.push({
        from: debtor.userId,
        fromName: debtor.name,
        to: creditor.userId,
        toName: creditor.name,
        amount: amount_rounded,
      });
    }

    creditor.balance -= amount;
    debtor.balance += amount;

    if (Math.abs(creditor.balance) < 0.01) i++;
    if (Math.abs(debtor.balance) < 0.01) j++;
  }

  return transactions;
};

/**
 * Compute net balances for all members in a group
 * @param {Array} expenses - populated expense documents
 * @param {Array} memberIds - all group member IDs
 * @returns {Object} balances - {userId: {name, balance}}
 */
const computeGroupBalances = (expenses, members) => {
  const balances = {};

  // Initialize all members
  members.forEach(m => {
    balances[m._id.toString()] = { userId: m._id.toString(), name: m.name, balance: 0 };
  });

  expenses.forEach(expense => {
    if (expense.isSettled) return;

    const paidById = expense.paidBy._id ? expense.paidBy._id.toString() : expense.paidBy.toString();

    // Credit the payer
    if (balances[paidById]) {
      balances[paidById].balance += expense.totalAmount;
    }

    // Debit each split participant
    expense.splits.forEach(split => {
      if (!split.isPaid) {
        const uid = split.user._id ? split.user._id.toString() : split.user.toString();
        if (balances[uid]) {
          balances[uid].balance -= split.amount;
        }
      }
    });
  });

  return Object.values(balances);
};

/**
 * Agent 7: Smart suggestion engine
 * Detect patterns: "User X never consumes milk"
 * @param {Array} expenses - historical expenses
 * @param {Array} members - group members
 * @returns {Object} suggestions - {itemName: [suggestedConsumerIds]}
 */
const generateSmartSuggestions = (expenses, members) => {
  const itemConsumptionMap = {}; // itemName -> {userId: count}

  expenses.forEach(expense => {
    expense.items.forEach(item => {
      const key = item.name.toLowerCase().trim();
      if (!itemConsumptionMap[key]) {
        itemConsumptionMap[key] = {};
      }
      item.consumers.forEach(userId => {
        const uid = userId.toString();
        itemConsumptionMap[key][uid] = (itemConsumptionMap[key][uid] || 0) + 1;
      });
    });
  });

  const suggestions = {};
  const memberIds = members.map(m => m._id.toString());

  Object.entries(itemConsumptionMap).forEach(([item, consumptionMap]) => {
    const totalOccurrences = Object.values(consumptionMap).reduce((a, b) => a + b, 0);
    if (totalOccurrences < 2) return; // not enough data

    // Suggest users who consumed this item >60% of the time
    const suggested = memberIds.filter(uid => {
      const userCount = consumptionMap[uid] || 0;
      const frequency = userCount / (totalOccurrences / Object.keys(consumptionMap).length || 1);
      return frequency >= 0.6;
    });

    // Never-consumers: users who never consumed this item (at least 3 times available)
    const neverConsumers = memberIds.filter(uid => !consumptionMap[uid] && totalOccurrences >= 3);

    suggestions[item] = {
      suggested,
      neverConsumers,
      frequency: consumptionMap,
    };
  });

  return suggestions;
};

module.exports = {
  computeSplits,
  minimizeSettlements,
  computeGroupBalances,
  generateSmartSuggestions,
};
