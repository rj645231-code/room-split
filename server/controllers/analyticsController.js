const db = require('../config/db');
const { computeGroupBalances } = require('./splitHelper');
const { parseUser } = require('../utils/helpers');

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

    // ────────────────────────────────────────────────────────────────────────
    // KEY FIX: The payer's own share is NEVER stored in the splits table
    // (computeSplits skips the payer). So we must compute:
    //   A) Splits from expenses where OTHERS paid (standard split records)
    //   B) My own consumption from expenses I PAID (via item_consumers)
    // ────────────────────────────────────────────────────────────────────────

    // A) What I consumed from expenses others paid (normal splits)
    const othersExpenseSplits = await db.prepare(`
      SELECT s.amount, e.category, e.date, e.title, e.paid_by
      FROM splits s
      JOIN expenses e ON e.id = s.expense_id
      WHERE s.user_id = ? AND e.paid_by != ?
      ORDER BY e.date ASC
    `).all(userId, userId);

    // B) My own consumption from expenses I PAID (via item_consumers + expense_items)
    const selfPaidConsumption = await db.prepare(`
      SELECT
        SUM(ei.cost_per_consumer) as amount,
        e.category,
        e.date,
        e.title,
        e.paid_by,
        e.id as expense_id
      FROM expense_items ei
      JOIN item_consumers ic ON ic.item_id = ei.id
      JOIN expenses e ON e.id = ei.expense_id
      WHERE ic.user_id = ? AND e.paid_by = ?
      GROUP BY e.id
      ORDER BY e.date ASC
    `).all(userId, userId);

    // Merge both into unified consumption records
    const allConsumption = [...othersExpenseSplits, ...selfPaidConsumption];

    // Filter by cycle
    const currentConsumption = allConsumption.filter(s => s.date >= csISO && s.date <= ceISO);
    const prevConsumption    = allConsumption.filter(s => s.date >= psISO && s.date <= peISO);

    // ── Totals ───────────────────────────────────────────────────────────────
    const totalThisCycle = currentConsumption.reduce((sum, s) => sum + (s.amount || 0), 0);
    const totalPrevCycle = prevConsumption.reduce((sum, s) => sum + (s.amount || 0), 0);
    const pctChange = totalPrevCycle > 0 ? ((totalThisCycle - totalPrevCycle) / totalPrevCycle) * 100 : 0;

    // ── By Category ──────────────────────────────────────────────────────────
    const byCategory     = {};
    const prevByCategory = {};
    currentConsumption.forEach(s => { byCategory[s.category]     = (byCategory[s.category]     || 0) + s.amount; });
    prevConsumption.forEach(s =>    { prevByCategory[s.category]  = (prevByCategory[s.category]  || 0) + s.amount; });

    // ── Daily map ────────────────────────────────────────────────────────────
    const dailyMap = {};
    currentConsumption.forEach(s => {
      const key = s.date.slice(0, 10);
      dailyMap[key] = (dailyMap[key] || 0) + s.amount;
    });

    // ── Projection ───────────────────────────────────────────────────────────
    const today           = new Date();
    const daysElapsed     = Math.max(1, Math.round((today - cycleStart) / 86400000));
    const totalDaysInCycle = Math.round((cycleEnd - cycleStart) / 86400000) + 1;
    const daysRemaining   = Math.max(0, totalDaysInCycle - daysElapsed);
    const dailyAvg        = totalThisCycle / daysElapsed;
    const projected       = dailyAvg * totalDaysInCycle;

    // ── Top 5 items ──────────────────────────────────────────────────────────
    const topItems = [...currentConsumption]
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5)
      .map(s => ({ title: s.title, amount: s.amount, category: s.category, date: s.date }));

    const biggest = topItems[0] || null;

    // ── Balance (I owe / owed to me) — use SAME logic as Settlement page ─────
    // Fetch all groups user is in
    const myGroups = await db.prepare(`
      SELECT g.id FROM groups_t g
      JOIN group_members gm ON gm.group_id = g.id
      WHERE gm.user_id = ?
    `).all(userId);

    let iOwe = 0;
    let owedToMe = 0;

    for (const group of myGroups) {
      const memberRows = await db.prepare(`
        SELECT u.* FROM users u
        JOIN group_members gm ON gm.user_id = u.id
        WHERE gm.group_id = ?
      `).all(group.id);
      const members = memberRows.map(parseUser);
      const { balances } = await computeGroupBalances(group.id, members);
      const myBalance = balances.find(b => b.userId === userId);
      if (myBalance) {
        if (myBalance.balance < 0) iOwe    += Math.abs(myBalance.balance);
        if (myBalance.balance > 0) owedToMe += myBalance.balance;
      }
    }

    // ── Group vs Personal ────────────────────────────────────────────────────
    const fromOthers  = currentConsumption.filter(s => s.paid_by !== userId).reduce((s, x) => s + x.amount, 0);
    const fromSelf    = currentConsumption.filter(s => s.paid_by === userId).reduce((s, x) => s + x.amount, 0);
    const grandTotal  = fromOthers + fromSelf;
    const groupPct    = grandTotal > 0 ? Math.round((fromOthers / grandTotal) * 100) : 50;

    res.json({
      success: true,
      data: {
        userId,
        cycleStart:      csISO,
        cycleEnd:        ceISO,
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
