import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useApp } from '../context/AppContext';
import { getExpenses } from '../services/api';
import { MOCK_DATA } from '../services/mockData';
import TopBar from '../components/TopBar';

const CATEGORY_META = {
  grocery:       { icon: '🛒', color: '#10b981' },
  meal:          { icon: '🍽️', color: '#f59e0b' },
  utility:       { icon: '💡', color: '#6366f1' },
  transport:     { icon: '🚗', color: '#3b82f6' },
  entertainment: { icon: '🎮', color: '#ec4899' },
  other:         { icon: '📦', color: '#94a3b8' },
};

function groupByDate(expenses) {
  const groups = {};
  expenses.forEach(exp => {
    const date = new Date(exp.date).toDateString();
    if (!groups[date]) groups[date] = [];
    groups[date].push(exp);
  });
  return Object.entries(groups).sort((a, b) => new Date(b[0]) - new Date(a[0]));
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === today.toDateString())     return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
}

export default function Transactions() {
  const { activeGroup, isOfflineMode } = useApp();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    if (isOfflineMode) {
      setExpenses(MOCK_DATA.expenses);
      setLoading(false);
      return;
    }
    if (!activeGroup?._id) { setLoading(false); return; }
    getExpenses(activeGroup._id)
      .then(res => setExpenses(res.data.data || []))
      .catch(() => setExpenses(MOCK_DATA.expenses))
      .finally(() => setLoading(false));
  }, [activeGroup?._id, isOfflineMode]);

  const grouped = groupByDate(expenses);
  const totalAmount = expenses.reduce((s, e) => s + e.totalAmount, 0);

  return (
    <div>
      <TopBar
        title="Transaction History"
        subtitle={`${expenses.length} transactions · ₹${totalAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })} total`}
      />

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {[1,2,3,4].map(i => <div key={i} className="shimmer" style={{ height: 70, borderRadius: 14 }} />)}
        </div>
      ) : expenses.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📋</div>
          <p>No transactions yet</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {grouped.map(([dateStr, dayExpenses], gIdx) => (
            <motion.div key={dateStr}
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: gIdx * 0.07 }}>
              {/* Date header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '0.875rem' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                  {formatDate(dateStr)}
                </span>
                <div style={{ flex: 1, height: 1, background: 'var(--border-glass)' }} />
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                  ₹{dayExpenses.reduce((s, e) => s + e.totalAmount, 0).toFixed(0)}
                </span>
              </div>

              {/* Timeline items */}
              <div style={{ paddingLeft: '0.5rem' }}>
                {dayExpenses.map((exp, idx) => {
                  const meta = CATEGORY_META[exp.category] || CATEGORY_META.other;
                  // Get unique consumer names from items
                  const allConsumers = [...new Set(
                    (exp.items || []).flatMap(item =>
                      (item.consumers || []).map(c => c.name || c)
                    ).filter(Boolean)
                  )];

                  return (
                    <motion.div key={exp._id}
                      className="timeline-item"
                      initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: gIdx * 0.07 + idx * 0.04 }}
                      style={{ marginBottom: '1rem' }}
                    >
                      {/* Timeline dot */}
                      <div className="timeline-dot" style={{ background: meta.color }}>
                        <span style={{ fontSize: '0.6rem' }}>{meta.icon}</span>
                      </div>

                      {/* Card */}
                      <motion.div
                        className="card-glass"
                        whileHover={{ x: 4, transition: { duration: 0.15 } }}
                        style={{ padding: '1rem 1.25rem' }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                              <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{exp.title}</span>
                              <span style={{ fontSize: '0.65rem', padding: '1px 8px', borderRadius: 99,
                                background: meta.color + '22', color: meta.color, border: `1px solid ${meta.color}44`, fontWeight: 600 }}>
                                {exp.category}
                              </span>
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              {exp.paidBy?.name} paid · {exp.items?.length} item{exp.items?.length !== 1 ? 's' : ''}
                              {allConsumers.length > 0 && ` · consumed by ${allConsumers.join(', ')}`}
                            </div>
                          </div>
                          <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)' }}>
                              ₹{exp.totalAmount?.toFixed(2)}
                            </div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>
                              {new Date(exp.date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        </div>

                        {/* Per-person splits chips */}
                        {exp.splits?.length > 0 && (
                          <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginTop: '8px' }}>
                            {exp.splits.map((s, si) => (
                              <span key={si} style={{
                                fontSize: '0.68rem', padding: '2px 8px', borderRadius: 99,
                                background: s.isPaid ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.05)',
                                border: `1px solid ${s.isPaid ? 'rgba(16,185,129,0.25)' : 'var(--border-glass)'}`,
                                color: s.isPaid ? '#34d399' : 'var(--text-secondary)',
                              }}>
                                {s.user?.name || s.user} owes ₹{s.amount?.toFixed(2)} {s.isPaid ? '✓' : ''}
                              </span>
                            ))}
                          </div>
                        )}
                      </motion.div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
