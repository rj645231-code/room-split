import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import {
  TrendingUp, TrendingDown, RefreshCw, Calendar,
  ShoppingCart, Utensils, Zap, Car, Music, Plus,
  Wifi, Package, AlertTriangle, Download,
} from 'lucide-react';
import { getPersonalAnalytics } from '../services/api';
import { useApp } from '../context/AppContext';
import TopBar from '../components/TopBar';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import toast from 'react-hot-toast';

const CATEGORY_META = {
  grocery:       { label: 'Groceries',      icon: ShoppingCart, color: '#10b981' },
  meal:          { label: 'Food & Dining',   icon: Utensils,     color: '#f59e0b' },
  utility:       { label: 'Utilities',       icon: Zap,          color: '#3b82f6' },
  transport:     { label: 'Transport',       icon: Car,          color: '#8b5cf6' },
  entertainment: { label: 'Entertainment',   icon: Music,        color: '#ec4899' },
  wifi:          { label: 'Wi-Fi/Internet',  icon: Wifi,         color: '#06b6d4' },
  shopping:      { label: 'Shopping',        icon: Package,      color: '#f97316' },
  other:         { label: 'Others',          icon: Plus,         color: '#6366f1' },
};

const BUDGET_DEFAULTS = {
  grocery: 3000, meal: 2500, utility: 1500,
  transport: 1000, entertainment: 1000, other: 2000,
};

const PIE_COLORS = ['#6366f1','#10b981','#f59e0b','#3b82f6','#ec4899','#8b5cf6','#06b6d4','#f97316'];

function fmt(n) { return `₹${Number(n || 0).toLocaleString('en-IN')}`; }
function fmtDate(str) {
  return new Date(str).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export default function Analytics() {
  const { currentUser, isOfflineMode } = useApp();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('all');

  const fetchData = async (currentType = typeFilter) => {
    if (isOfflineMode) { setLoading(false); return; }
    setLoading(true);
    try {
      const res = await getPersonalAnalytics(currentType);
      setData(res.data.data);
    } catch (e) {
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(typeFilter); }, [typeFilter]);

  const exportPDF = () => {
    if (!data) return;
    const doc = new jsPDF();
    const pw = doc.internal.pageSize.getWidth();
    doc.setFontSize(20); doc.setTextColor(99, 102, 241);
    doc.text('My Budget Report', 14, 20);
    doc.setFontSize(10); doc.setTextColor(100, 116, 139);
    doc.text(`${fmtDate(data.cycleStart)} — ${fmtDate(data.cycleEnd)}`, 14, 27);
    doc.text(`Generated for: ${currentUser?.name}`, pw - 14, 27, { align: 'right' });
    doc.setDrawColor(226, 232, 240); doc.line(14, 32, pw - 14, 32);

    autoTable(doc, {
      startY: 38,
      head: [['Metric', 'Value']],
      body: [
        ['Total Spent', fmt(data.totalThisCycle)],
        ['Daily Average', fmt(data.dailyAvg)],
        ['Projected Total', fmt(data.projected)],
        ['Days Remaining', `${data.daysRemaining} days`],
        ['vs Last Month', `${data.pctChange > 0 ? '+' : ''}${data.pctChange}%`],
        ['I Owe', fmt(data.iOwe)],
        ['Owed to Me', fmt(data.owedToMe)],
      ],
      theme: 'grid',
      headStyles: { fillColor: [99, 102, 241] },
    });

    const catBody = Object.entries(data.byCategory || {}).map(([k, v]) => [
      CATEGORY_META[k]?.label || k, fmt(v),
      `${data.totalThisCycle > 0 ? Math.round((v / data.totalThisCycle) * 100) : 0}%`,
    ]);
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 10,
      head: [['Category', 'Amount', '% of Total']],
      body: catBody,
      theme: 'striped',
      headStyles: { fillColor: [16, 185, 129] },
    });

    doc.save(`BudgetReport_${currentUser?.name?.replace(/\s+/g, '_')}.pdf`);
    toast.success('PDF exported!');
  };

  if (loading) return (
    <div>
      <TopBar title="My Budget" subtitle="Personal spending analytics" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {[1,2,3,4].map(i => <div key={i} className="shimmer" style={{ height: 120, borderRadius: 16 }} />)}
      </div>
    </div>
  );

  if (isOfflineMode || !data) return (
    <div>
      <TopBar title="My Budget" subtitle="Personal spending analytics" />
      <div style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-muted)' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📊</div>
        <h2 style={{ fontFamily: 'Poppins', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
          Connect to backend to view analytics
        </h2>
        <p>Your personal spending insights will appear here once you log in with the server running.</p>
      </div>
    </div>
  );

  const pieData = Object.entries(data.byCategory || {}).map(([k, v], i) => ({
    name: CATEGORY_META[k]?.label || k,
    value: Math.round(v),
    color: PIE_COLORS[i % PIE_COLORS.length],
    category: k,
  }));

  const barData = Object.entries(data.byCategory || {}).map(([k, v]) => ({
    name: CATEGORY_META[k]?.label?.slice(0, 8) || k,
    amount: Math.round(v),
    prev: Math.round(data.prevByCategory?.[k] || 0),
  }));

  // Build a calendar heatmap for current cycle
  const heatDays = [];
  let cur = new Date(data.cycleStart);
  const end = new Date(data.cycleEnd);
  const maxSpend = Math.max(...Object.values(data.dailyMap || {}), 1);
  while (cur <= end) {
    const key = cur.toISOString().slice(0, 10);
    heatDays.push({ date: key, amount: data.dailyMap?.[key] || 0 });
    cur = new Date(cur.getTime() + 86400000);
  }

  const progressPct = data.totalDaysInCycle > 0
    ? Math.round((data.daysElapsed / data.totalDaysInCycle) * 100)
    : 0;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <TopBar
        title="My Budget"
        subtitle={`${fmtDate(data.cycleStart)} — ${fmtDate(data.cycleEnd)}`}
        actions={
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <select className="input-glass" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} style={{ padding: '0.4rem 2rem 0.4rem 1rem', fontSize: '0.8rem', minHeight: '34px', width: 'auto' }}>
              <option value="all">All Expenses</option>
              <option value="group">Group Only</option>
              <option value="personal">Personal Only</option>
            </select>
            <button className="btn-ghost" onClick={() => fetchData(typeFilter)} style={{ padding: '0.4rem 0.75rem' }}><RefreshCw size={14} /> <span className="hidden sm:inline">Refresh</span></button>
            <button className="btn-ghost" onClick={exportPDF} style={{ padding: '0.4rem 0.75rem' }}><Download size={14} /> <span className="hidden sm:inline">PDF</span></button>
          </div>
        }
      />

      {/* ── KPI Row ─────────────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12, marginBottom: '1.5rem' }}>
        {[
          { label: 'Total Spent',    value: fmt(data.totalThisCycle),  color: '#6366f1', emoji: '💸' },
          { label: 'Daily Avg',      value: fmt(data.dailyAvg),         color: '#f59e0b', emoji: '📅' },
          { label: 'Projected',      value: fmt(data.projected),        color: '#ef4444', emoji: '📈' },
          { label: 'Days Left',      value: `${data.daysRemaining}d`,   color: '#10b981', emoji: '⏳' },
        ].map((kpi, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }} className="card-glass"
            style={{ padding: '1rem', textAlign: 'center' }}>
            <div style={{ fontSize: '1.4rem', marginBottom: 4 }}>{kpi.emoji}</div>
            <div style={{ fontFamily: 'Poppins', fontWeight: 800, fontSize: '1.1rem', color: kpi.color }}>{kpi.value}</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>{kpi.label}</div>
          </motion.div>
        ))}
      </div>

      {/* ── Cycle Progress ──────────────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="card-glass" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap', gap: 4 }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Budget Cycle Progress</span>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Day {data.daysElapsed} of {data.totalDaysInCycle}
            {data.pctChange !== 0 && (
              <span style={{ marginLeft: 10, color: data.pctChange > 0 ? '#f87171' : '#34d399', fontWeight: 700 }}>
                {data.pctChange > 0 ? <TrendingUp size={12} style={{ display: 'inline', marginRight: 3 }} /> : <TrendingDown size={12} style={{ display: 'inline', marginRight: 3 }} />}
                {Math.abs(data.pctChange)}% vs last month
              </span>
            )}
          </span>
        </div>
        <div style={{ height: 10, background: 'rgba(255,255,255,0.06)', borderRadius: 99, overflow: 'hidden' }}>
          <motion.div initial={{ width: 0 }} animate={{ width: `${progressPct}%` }} transition={{ duration: 1, ease: 'easeOut' }}
            style={{ height: '100%', background: 'linear-gradient(90deg, #6366f1, #8b5cf6)', borderRadius: 99 }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
          <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{fmtDate(data.cycleStart)}</span>
          <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{fmtDate(data.cycleEnd)}</span>
        </div>
      </motion.div>

      {/* ── Pie + Category List ─────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1.4fr)', gap: 12, marginBottom: '1.5rem' }}>
        {/* Pie */}
        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }}
          className="card-glass" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>Spending Mix</div>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={pieData} dataKey="value" cx="50%" cy="50%" outerRadius={70} innerRadius={40} paddingAngle={2}>
                  {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip formatter={(v) => fmt(v)} contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-glass)', borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>No data this cycle</div>}
        </motion.div>

        {/* Category list */}
        <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.18 }}
          className="card-glass" style={{ padding: '1.25rem', overflowY: 'auto', maxHeight: 280 }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>By Category</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {Object.entries(data.byCategory || {}).sort((a, b) => b[1] - a[1]).map(([cat, amt], i) => {
              const meta  = CATEGORY_META[cat] || CATEGORY_META.other;
              const Icon  = meta.icon;
              const pct   = data.totalThisCycle > 0 ? Math.round((amt / data.totalThisCycle) * 100) : 0;
              const budget = BUDGET_DEFAULTS[cat] || 2000;
              const budgetPct = Math.min(100, Math.round((amt / budget) * 100));
              const overBudget = budgetPct >= 80;
              return (
                <div key={cat}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: meta.color + '22', color: meta.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon size={13} />
                    </div>
                    <span style={{ flex: 1, fontSize: '0.8rem', color: 'var(--text-primary)', fontWeight: 500 }}>{meta.label}</span>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>{fmt(amt)}</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', minWidth: 30, textAlign: 'right' }}>{pct}%</span>
                    {overBudget && <AlertTriangle size={12} color="#f59e0b" title="Over 80% of budget" />}
                  </div>
                  <div style={{ height: 5, background: 'rgba(255,255,255,0.06)', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${budgetPct}%`, background: overBudget ? '#f59e0b' : meta.color, borderRadius: 99, transition: 'width 0.8s ease' }} />
                  </div>
                  {overBudget && <div style={{ fontSize: '0.65rem', color: '#f59e0b', marginTop: 2 }}>⚠️ {budgetPct}% of ₹{budget.toLocaleString('en-IN')} budget</div>}
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>

      {/* ── Bar Chart (This vs Last Month) ─────────────────────────────────── */}
      {barData.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="card-glass" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>This vs Last Month</div>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={barData} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} tickFormatter={v => `₹${v}`} />
              <Tooltip formatter={v => fmt(v)} contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-glass)', borderRadius: 8 }} />
              <Bar dataKey="prev"   fill="rgba(99,102,241,0.25)" radius={[4,4,0,0]} name="Last Month" />
              <Bar dataKey="amount" fill="#6366f1"               radius={[4,4,0,0]} name="This Month" />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      )}

      {/* ── Spending Heatmap ────────────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }}
        className="card-glass" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '0.75rem' }}>
          <Calendar size={15} color="#818cf8" />
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Spending Heatmap</span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {heatDays.map(({ date, amount }) => {
            const intensity = amount > 0 ? 0.15 + 0.85 * (amount / maxSpend) : 0;
            const isToday = date === new Date().toISOString().slice(0, 10);
            return (
              <div key={date} title={`${date}: ${fmt(amount)}`} style={{
                width: 28, height: 28, borderRadius: 6,
                background: amount > 0 ? `rgba(249, 115, 22, ${intensity})` : 'rgba(255,255,255,0.04)',
                border: isToday ? '2px solid #6366f1' : '1px solid transparent',
                cursor: 'default', transition: 'all 0.2s',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.55rem', color: 'rgba(255,255,255,0.5)',
              }}>
                {new Date(date + 'T00:00:00').getDate()}
              </div>
            );
          })}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Less</span>
          {[0.1, 0.3, 0.55, 0.75, 1].map(o => (
            <div key={o} style={{ width: 12, height: 12, borderRadius: 3, background: `rgba(249,115,22,${o})` }} />
          ))}
          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>More</span>
        </div>
      </motion.div>

      {/* ── Bottom Row ──────────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12, marginBottom: '1.5rem' }}>
        {/* Top 5 Items */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.24 }}
          className="card-glass" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>🏆 Top 5 Items</div>
          {(data.topItems || []).length === 0
            ? <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No expenses this cycle</p>
            : (data.topItems || []).map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <div style={{ width: 22, height: 22, borderRadius: 6, background: `rgba(99,102,241,${0.3 - i * 0.05})`, color: '#a5b4fc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 800 }}>{i + 1}</div>
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.title}</div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{fmtDate(item.date)}</div>
                </div>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#a5b4fc' }}>{fmt(item.amount)}</span>
              </div>
            ))
          }
        </motion.div>

        {/* Balances */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.26 }}
          className="card-glass" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>⚖️ Balance Summary</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ padding: '10px 14px', borderRadius: 12, background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>You owe</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#f87171' }}>{fmt(data.iOwe)}</div>
            </div>
            <div style={{ padding: '10px 14px', borderRadius: 12, background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.2)' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Owed to you</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#34d399' }}>{fmt(data.owedToMe)}</div>
            </div>
          </div>
        </motion.div>

        {/* Group vs Personal */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }}
          className="card-glass" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>🏠 Group vs Personal</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[{ label: 'Group Expenses', pct: data.groupPct, color: '#6366f1' }, { label: 'Personal Spending', pct: data.personalPct, color: '#10b981' }].map(b => (
              <div key={b.label}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{b.label}</span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: b.color }}>{b.pct}%</span>
                </div>
                <div style={{ height: 8, background: 'rgba(255,255,255,0.06)', borderRadius: 99 }}>
                  <div style={{ height: '100%', width: `${b.pct}%`, background: b.color, borderRadius: 99 }} />
                </div>
              </div>
            ))}
          </div>
          {data.biggest && (
            <div style={{ marginTop: '0.875rem', padding: '8px 12px', borderRadius: 10, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Biggest Expense</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fbbf24' }}>{data.biggest.title}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-primary)', fontWeight: 800 }}>{fmt(data.biggest.amount)}</div>
            </div>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}
