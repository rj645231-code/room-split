const db = require('../config/db');

function getBudgetCycleDates(startDay) {
  const today = new Date();
  const year  = today.getFullYear();
  const month = today.getMonth();
  const day   = today.getDate();

  let cycleStart, cycleEnd, prevStart, prevEnd;

  if (day >= startDay) {
    cycleStart = new Date(year, month, startDay);
    cycleEnd   = new Date(year, month + 1, startDay - 1, 23, 59, 59);
    prevStart  = new Date(year, month - 1, startDay);
    prevEnd    = new Date(year, month, startDay - 1, 23, 59, 59);
  } else {
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

    const userRow = await db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    if (!userRow) return res.status(404).json({ success: false, message: 'User not found' });

    const startDay = parseInt(userRow.budget_start_day) || 1;
    const { cycleStart, cycleEnd, prevStart, prevEnd } = getBudgetCycleDates(startDay);

    const csISO = cycleStart.toISOString();
    const ceISO = cycleEnd.toISOString();
    const psISO = prevStart.toISOString();
    const peISO = prevEnd.toISOString();

    // ── My consumption splits: what THIS user consumed (no redundant join) ──
    const allMySplits = await db.prepare(`
      SELECT s.amount, e.category, e.date, e.title, e.paid_by, e.group_id
      FROM splits s
      JOIN expenses e ON e.id = s.expense_id
      WHERE s.user_id = ?
      ORDER BY e.date ASC
    `).all(userId);

    const currentSplits = allMySplits.filter(s => s.date >= csISO && s.date <= ceISO);
    const prevSplits     = allMySplits.filter(s => s.date >= psISO && s.date <= peISO);

    // ── Totals ──────────────────────────────────────────────────────────────
    const totalThisCycle = currentSplits.reduce((sum, s) => sum + s.amount, 0);
    const totalPrevCycle = prevSplits.reduce((sum, s) => sum + s.amount, 0);
    const pctChange = totalPrevCycle > 0
      ? ((totalThisCycle - totalPrevCycle) / totalPrevCycle) * 100
      : 0;

    // ── By Category ─────────────────────────────────────────────────────────
    const byCategory   = {};
    const prevByCategory = {};
    currentSplits.forEach(s => { byCategory[s.category]    = (byCategory[s.category]    || 0) + s.amount; });
    prevSplits.forEach(s =>    { prevByCategory[s.category] = (prevByCategory[s.category] || 0) + s.amount; });

    // ── Daily map ───────────────────────────────────────────────────────────
    const dailyMap = {};
    currentSplits.forEach(s => {
      const key = s.date.slice(0, 10);
      dailyMap[key] = (dailyMap[key] || 0) + s.amount;
    });

    // ── Projection ──────────────────────────────────────────────────────────
    const today = new Date();
    const daysElapsed       = Math.max(1, Math.round((today - cycleStart) / 86400000));
    const totalDaysInCycle  = Math.round((cycleEnd - cycleStart) / 86400000) + 1;
    const daysRemaining     = Math.max(0, totalDaysInCycle - daysElapsed);
    const dailyAvg          = totalThisCycle / daysElapsed;
    const projected         = dailyAvg * totalDaysInCycle;

    // ── Top 5 items (by MY share) ────────────────────────────────────────────
    const topItems = [...currentSplits]
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5)
      .map(s => ({ title: s.title, amount: s.amount, category: s.category, date: s.date }));

    const biggest = topItems[0] || null;

    // ── I Owe: my unpaid splits where someone else paid ──────────────────────
    const iOweRow = await db.prepare(`
      SELECT COALESCE(SUM(s.amount), 0) as total
      FROM splits s
      JOIN expenses e ON e.id = s.expense_id
      WHERE s.user_id = ? AND s.is_paid = 0 AND e.paid_by != ?
    `).get(userId, userId);
    const iOwe = parseFloat(iOweRow?.total || 0);

    // ── Owed to me: others' unpaid splits on expenses I paid ─────────────────
    const owedToMeRow = await db.prepare(`
      SELECT COALESCE(SUM(s.amount), 0) as total
      FROM splits s
      JOIN expenses e ON e.id = s.expense_id
      WHERE e.paid_by = ? AND s.user_id != ? AND s.is_paid = 0
    `).get(userId, userId);
    const owedToMe = parseFloat(owedToMeRow?.total || 0);

    // ── Group vs Personal ────────────────────────────────────────────────────
    // Group: expenses from shared groups (>1 member consuming)
    // Personal: expenses where I'm the sole consumer
    const groupSplitAmt = currentSplits
      .filter(s => s.paid_by !== userId) // shared — someone else paid
      .reduce((sum, s) => sum + s.amount, 0);
    const paidByMeAmt = currentSplits
      .filter(s => s.paid_by === userId) // I paid but split with others
      .reduce((sum, s) => sum + s.amount, 0);
    const grandTotal = groupSplitAmt + paidByMeAmt;
    const groupPct    = grandTotal > 0 ? Math.round((groupSplitAmt / grandTotal) * 100) : 50;

    res.json({
      success: true,
      data: {
        userId,
        cycleStart:       csISO,
        cycleEnd:         ceISO,
        budgetStartDay:   startDay,
        totalThisCycle:   Math.round(totalThisCycle),
        totalPrevCycle:   Math.round(totalPrevCycle),
        pctChange:        Math.round(pctChange * 10) / 10,
        byCategory,
        prevByCategory,
        dailyMap,
        dailyAvg:         Math.round(dailyAvg),
        projected:        Math.round(projected),
        daysRemaining,
        totalDaysInCycle,
        daysElapsed,
        topItems,
        biggest,
        iOwe:             Math.round(iOwe),
        owedToMe:         Math.round(owedToMe),
        groupPct,
        personalPct:      100 - groupPct,
      }
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
