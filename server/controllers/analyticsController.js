const db = require('../config/db');

// Given a budget_start_day and today's date, return the current and previous cycle's [start, end]
function getBudgetCycleDates(startDay) {
  const today = new Date();
  const year  = today.getFullYear();
  const month = today.getMonth(); // 0-indexed
  const day   = today.getDate();

  let cycleStart, cycleEnd, prevStart, prevEnd;

  if (day >= startDay) {
    // We're in the current month's cycle
    cycleStart = new Date(year, month, startDay);
    cycleEnd   = new Date(year, month + 1, startDay - 1, 23, 59, 59);
    prevStart  = new Date(year, month - 1, startDay);
    prevEnd    = new Date(year, month, startDay - 1, 23, 59, 59);
  } else {
    // We're before the start day — cycle started last month
    cycleStart = new Date(year, month - 1, startDay);
    cycleEnd   = new Date(year, month, startDay - 1, 23, 59, 59);
    prevStart  = new Date(year, month - 2, startDay);
    prevEnd    = new Date(year, month - 1, startDay - 1, 23, 59, 59);
  }

  return { cycleStart, cycleEnd, prevStart, prevEnd };
}

exports.getPersonalAnalytics = async (req, res) => {
  try {
    const userId = req.user.id;

    // ── Load user ──────────────────────────────────────────────────────────────
    const userRow = await db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    if (!userRow) return res.status(404).json({ success: false, message: 'User not found' });

    const startDay = parseInt(userRow.budget_start_day) || 1;
    const { cycleStart, cycleEnd, prevStart, prevEnd } = getBudgetCycleDates(startDay);

    // ── Fetch ALL expenses across ALL groups the user is in ───────────────────
    const allExpenses = await db.prepare(`
      SELECT e.id, e.title, e.category, e.total_amount, e.date, e.group_id, e.paid_by
      FROM expenses e
      JOIN group_members gm ON gm.group_id = e.group_id AND gm.user_id = ?
      ORDER BY e.date ASC
    `).all(userId);

    // ── Fetch user's personal splits (what they consumed, not paid) ────────────
    const mySplits = await db.prepare(`
      SELECT s.expense_id, s.amount, e.category, e.date, e.title, e.total_amount, e.paid_by
      FROM splits s
      JOIN expenses e ON e.id = s.expense_id
      JOIN group_members gm ON gm.group_id = e.group_id AND gm.user_id = ?
      WHERE s.user_id = ?
      ORDER BY e.date ASC
    `).all(userId, userId);

    // ── Filter by current cycle ────────────────────────────────────────────────
    const inCycle = (dateStr) => {
      const d = new Date(dateStr);
      return d >= cycleStart && d <= cycleEnd;
    };
    const inPrevCycle = (dateStr) => {
      const d = new Date(dateStr);
      return d >= prevStart && d <= prevEnd;
    };

    const currentSplits = mySplits.filter(s => inCycle(s.date));
    const prevSplits     = mySplits.filter(s => inPrevCycle(s.date));

    // ── Total Spent ────────────────────────────────────────────────────────────
    const totalThisCycle = currentSplits.reduce((sum, s) => sum + s.amount, 0);
    const totalPrevCycle = prevSplits.reduce((sum, s) => sum + s.amount, 0);
    const pctChange = totalPrevCycle > 0
      ? ((totalThisCycle - totalPrevCycle) / totalPrevCycle) * 100
      : 0;

    // ── By Category ───────────────────────────────────────────────────────────
    const byCategory = {};
    const prevByCategory = {};
    currentSplits.forEach(s => {
      byCategory[s.category] = (byCategory[s.category] || 0) + s.amount;
    });
    prevSplits.forEach(s => {
      prevByCategory[s.category] = (prevByCategory[s.category] || 0) + s.amount;
    });

    // ── Daily Spending Map ────────────────────────────────────────────────────
    const dailyMap = {};
    currentSplits.forEach(s => {
      const dateKey = s.date.slice(0, 10);
      dailyMap[dateKey] = (dailyMap[dateKey] || 0) + s.amount;
    });

    // ── Daily Average + Projection ────────────────────────────────────────────
    const today    = new Date();
    const daysElapsed = Math.max(1, Math.round((today - cycleStart) / (1000 * 60 * 60 * 24)));
    const totalDaysInCycle = Math.round((cycleEnd - cycleStart) / (1000 * 60 * 60 * 24)) + 1;
    const daysRemaining = Math.max(0, totalDaysInCycle - daysElapsed);
    const dailyAvg  = totalThisCycle / daysElapsed;
    const projected = dailyAvg * totalDaysInCycle;

    // ── Top 5 Items ───────────────────────────────────────────────────────────
    const topItems = [...currentSplits]
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5)
      .map(s => ({ title: s.title, amount: s.amount, category: s.category, date: s.date }));

    // ── Biggest Single Expense ────────────────────────────────────────────────
    const biggest = topItems[0] || null;

    // ── Who I Owe / Owed to Me ────────────────────────────────────────────────
    const pendingSettlements = await db.prepare(`
      SELECT * FROM settlements
      WHERE (from_user = ? OR to_user = ?)
      AND status IN ('pending_confirmation', 'pending_payment')
    `).all(userId, userId);

    let iOwe = 0;
    let owedToMe = 0;
    pendingSettlements.forEach(s => {
      if (s.from_user === userId) iOwe += parseFloat(s.amount);
      else owedToMe += parseFloat(s.amount);
    });

    // Compute from unsettled splits too
    const unsettledSplits = await db.prepare(`
      SELECT s.amount, e.paid_by
      FROM splits s
      JOIN expenses e ON e.id = s.expense_id
      WHERE s.user_id = ? AND s.is_paid = 0 AND e.paid_by != ?
    `).all(userId, userId);
    iOwe += unsettledSplits.reduce((sum, s) => sum + s.amount, 0);

    const owedToMeSplits = await db.prepare(`
      SELECT s.amount
      FROM splits s
      JOIN expenses e ON e.id = s.expense_id
      WHERE e.paid_by = ? AND s.user_id != ? AND s.is_paid = 0
    `).all(userId, userId);
    owedToMe += owedToMeSplits.reduce((sum, s) => sum + s.amount, 0);

    // ── Group vs Personal Ratio ────────────────────────────────────────────────
    const groupExpenseTotal = currentSplits.reduce((sum, s) => sum + s.amount, 0);
    // "Personal" spending = expenses paid by user directly (not split) — approximate as paid_by=user
    const personalDirect = await db.prepare(`
      SELECT SUM(total_amount) as total FROM expenses
      WHERE paid_by = ? AND date >= ? AND date <= ?
    `).get(userId, cycleStart.toISOString(), cycleEnd.toISOString());
    const personalTotal = parseFloat(personalDirect?.total || 0);
    const grandTotal = groupExpenseTotal + personalTotal;
    const groupPct = grandTotal > 0 ? Math.round((groupExpenseTotal / grandTotal) * 100) : 0;

    res.json({
      success: true,
      data: {
        cycleStart:      cycleStart.toISOString(),
        cycleEnd:        cycleEnd.toISOString(),
        budgetStartDay:  startDay,
        totalThisCycle:  Math.round(totalThisCycle),
        totalPrevCycle:  Math.round(totalPrevCycle),
        pctChange:       Math.round(pctChange * 10) / 10,
        byCategory,
        prevByCategory,
        dailyMap,
        dailyAvg:        Math.round(dailyAvg),
        projected:       Math.round(projected),
        daysRemaining,
        totalDaysInCycle,
        daysElapsed,
        topItems,
        biggest,
        iOwe:            Math.round(iOwe),
        owedToMe:        Math.round(owedToMe),
        groupPct,
        personalPct:     100 - groupPct,
      }
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
