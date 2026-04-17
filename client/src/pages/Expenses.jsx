import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Search, Lock } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getExpenses, deleteExpense, getRecurringItems, createExpense } from '../services/api';
import { MOCK_DATA } from '../services/mockData';
import TopBar from '../components/TopBar';
import AddExpenseModal from '../components/AddExpenseModal';
import AddRecurringItemModal from '../components/AddRecurringItemModal';
import toast from 'react-hot-toast';
import ExpenseTabs from '../components/ExpenseTabs';
import { useLocation, useNavigate } from 'react-router-dom';

const CATEGORY_META = {
  grocery:       { icon: '🛒', color: '#10b981', label: 'Grocery'   },
  meal:          { icon: '🍽️', color: '#f59e0b', label: 'Meal'      },
  utility:       { icon: '💡', color: '#6366f1', label: 'Utility'   },
  transport:     { icon: '🚗', color: '#3b82f6', label: 'Transport' },
  entertainment: { icon: '🎮', color: '#ec4899', label: 'Fun'       },
  other:         { icon: '📦', color: '#94a3b8', label: 'Other'     },
};

export default function Expenses() {
  const { activeGroup, currentUser, isAdmin, isOfflineMode } = useApp();
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);
  const initialTab = searchParams.get('tab') === 'recurring' ? 'recurring' : 'all';
  
  const [activeTab, setActiveTab] = useState(initialTab); // 'all' | 'recurring'
  const [expenses, setExpenses] = useState([]);
  const [recurringItems, setRecurringItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [recurringModalOpen, setRecurringModalOpen] = useState(false);
  const [recurringSaves, setRecurringSaves] = useState({});
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('all');
  const [expanded, setExpanded] = useState(null);

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      if (isOfflineMode) {
        setExpenses(MOCK_DATA.expenses);
        setRecurringItems([]);
      } else {
        if (!activeGroup?._id) return;
        const [res, recRes] = await Promise.all([
          getExpenses(activeGroup._id),
          getRecurringItems(activeGroup._id).catch(() => ({ data: { data: [] } }))
        ]);
        setExpenses(res.data.data || []);
        
        const recList = recRes.data?.data || [];
        setRecurringItems(recList);
        
        const saves = {};
        recList.forEach(r => saves[r._id] = r.defaultConsumers);
        setRecurringSaves(saves);
      }
    } catch { setExpenses(MOCK_DATA.expenses); }
    finally { setLoading(false); }
  };

  // Sync state if URL changes directly
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const tabParam = searchParams.get('tab') === 'recurring' ? 'recurring' : 'all';
    if (tabParam !== activeTab) {
      setActiveTab(tabParam);
    }
  }, [location.search]);

  // Handle tab change from ExpenseTabs
  const handleTabChange = (newTab) => {
    setActiveTab(newTab);
    if (newTab === 'recurring') {
      navigate('/expenses?tab=recurring', { replace: true });
    } else {
      navigate('/expenses', { replace: true });
    }
  };

  useEffect(() => { fetchExpenses(); }, [activeGroup?._id, isOfflineMode]);

  const todayPrefix = new Date().toISOString().split('T')[0];
  const dueRecurringItems = recurringItems.filter(item => {
    const alreadyLogged = expenses.some(e => e.recurring_item_id === item._id && e.date?.startsWith(todayPrefix));
    return !alreadyLogged;
  });

  const handleSaveRecurring = async (item) => {
    if (isOfflineMode) return toast.error('Connect backend to save recurring items');
    const consumers = recurringSaves[item._id] || item.defaultConsumers;
    if (!consumers.length) return toast.error('Select at least one consumer');
    const title = `${item.title} - ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`;
    try {
      await createExpense({
        group: activeGroup._id,
        paidBy: currentUser._id,
        title,
        category: item.category,
        totalAmount: item.amount,
        recurringItemId: item._id,
        items: [{
          name: item.title,
          totalCost: item.amount,
          consumers,
          category: item.category
        }]
      });
      toast.success(`${item.title} added!`);
      fetchExpenses();
    } catch {
      toast.error('Failed to add recurring item');
    }
  };

  const filtered = expenses.filter(e => {
    const matchSearch = e.title?.toLowerCase().includes(search.toLowerCase()) ||
      e.items?.some(i => i.name?.toLowerCase().includes(search.toLowerCase()));
    const matchCat = filterCat === 'all' || e.category === filterCat;
    const matchTab = activeTab === 'all' ? !e.isRecurring : e.isRecurring;
    return matchSearch && matchCat && matchTab;
  });

  const handleDelete = async (id) => {
    if (isOfflineMode) return toast.error('Connect backend to delete expenses');
    if (!confirm('Delete this expense?')) return;
    try {
      await deleteExpense(id);
      setExpenses(prev => prev.filter(e => e._id !== id));
      toast.success('Expense deleted');
    } catch { toast.error('Failed to delete'); }
  };

  return (
    <div>
      <TopBar
        title="Expenses"
        subtitle={`${filtered.length} expense${filtered.length !== 1 ? 's' : ''}`}
        actions={
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <button className="btn-ghost" onClick={() => setRecurringModalOpen(true)} style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
              <Plus size={14} /> Add Recurring
            </button>
            <button className="btn-primary" onClick={() => setModalOpen(true)}>
              <Plus size={15} /> Add
            </button>
          </div>
        }
      />

      {/* Search + filter */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input className="input-glass" placeholder="Search expenses or items..."
            value={search} onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: '2.25rem' }} />
        </div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {['all', ...Object.keys(CATEGORY_META)].map(cat => (
            <button key={cat} className={`chip ${filterCat === cat ? 'selected' : ''}`}
              onClick={() => setFilterCat(cat)}>
              {cat === 'all' ? 'All' : CATEGORY_META[cat]?.icon + ' ' + CATEGORY_META[cat]?.label}
            </button>
          ))}
        </div>
      </div>

      <ExpenseTabs active={activeTab} onTabChange={handleTabChange} />

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {[1,2,3].map(i => <div key={i} className="shimmer" style={{ height: 80, borderRadius: 16 }} />)}
        </div>
      ) : filtered.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🧾</div>
          <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>No expenses found</p>
          <p style={{ fontSize: '0.85rem' }}>Add your first expense to get started</p>
        </motion.div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {filtered.map((exp, idx) => {
            const meta = CATEGORY_META[exp.category] || CATEGORY_META.other;
            const isOpen = expanded === exp._id;
            return (
              <motion.div key={exp._id}
                initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04 }}
                layout
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border-glass)', borderRadius: 16, overflow: 'hidden' }}
              >
                {/* Main row */}
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '1rem 1.25rem', cursor: 'pointer', flexWrap: 'wrap' }}
                  onClick={() => setExpanded(isOpen ? null : exp._id)}
                >
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: meta.color + '22',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0 }}>
                    {meta.icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.95rem' }}>{exp.title}</span>
                      <span className="badge badge-purple" style={{ fontSize: '0.65rem' }}>{meta.label}</span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '3px' }}>
                      {exp.paidBy?.name} paid · {exp.items?.length} item{exp.items?.length !== 1 ? 's' : ''} ·{' '}
                      {new Date(exp.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '12px', marginLeft: 'auto' }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)' }}>₹{exp.totalAmount?.toFixed(2)}</div>
                      <div style={{ fontSize: '0.7rem', color: meta.color, marginTop: 2 }}>
                        {exp.splits?.length} owe{exp.splits?.length !== 1 ? '' : 's'}
                      </div>
                    </div>
                    {/* Delete: only creator or admin */}
                    {!isOfflineMode && (() => {
                      const canDelete = isAdmin || exp.createdBy === currentUser?._id;
                      return canDelete ? (
                        <motion.button whileTap={{ scale: 0.9 }} className="btn-ghost" style={{ padding: '6px' }}
                          onClick={e => { e.stopPropagation(); handleDelete(exp._id); }}>
                          <Trash2 size={13} style={{ color: '#f87171' }} />
                        </motion.button>
                      ) : (
                        <div style={{ padding: '6px', opacity: 0.3 }} title="Only the creator or admin can delete">
                          <Lock size={13} style={{ color: 'var(--text-muted)' }} />
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* Expanded item details */}
                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }}
                      style={{ borderTop: '1px solid var(--border-glass)', overflow: 'hidden' }}
                    >
                      <div style={{ padding: '1rem 1.25rem' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          Item Breakdown
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {exp.items?.map((item, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px',
                              padding: '8px 12px', background: 'var(--bg-glass)', borderRadius: 10 }}>
                              <span style={{ flex: 1, fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-primary)' }}>{item.name}</span>
                              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                                {(item.consumers || []).map((c, ci) => (
                                  <span key={ci} style={{ fontSize: '0.7rem', padding: '2px 6px', borderRadius: 99,
                                    background: (c.color || '#6366f1') + '22',
                                    color: c.color || '#818cf8',
                                    border: `1px solid ${c.color || '#6366f1'}44` }}>
                                    {c.name || c}
                                  </span>
                                ))}
                              </div>
                              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: meta.color, flexShrink: 0 }}>
                                ₹{item.totalCost?.toFixed(2)}
                              </span>
                              {(item.consumers?.length > 0) && (
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                  (÷{item.consumers.length})
                                </span>
                              )}
                            </div>
                          ))}
                        </div>

                        {exp.splits?.length > 0 && (
                          <div style={{ marginTop: '1rem' }}>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                              Who Owes
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                              {exp.splits.map((s, si) => (
                                <div key={si} style={{ display: 'flex', alignItems: 'center', gap: '6px',
                                  padding: '4px 12px', borderRadius: 99,
                                  background: s.isPaid ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                                  border: `1px solid ${s.isPaid ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}` }}>
                                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: s.isPaid ? '#34d399' : '#f87171' }}>
                                    {s.user?.name || s.user}
                                  </span>
                                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>₹{s.amount?.toFixed(2)}</span>
                                  {s.isPaid && <span style={{ fontSize: '0.65rem', color: '#34d399' }}>✓</span>}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}

      <motion.button className="fab" onClick={() => setModalOpen(true)} whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }}>+</motion.button>
      <AddExpenseModal open={modalOpen} onClose={() => setModalOpen(false)} onSuccess={fetchExpenses} />
      <AddRecurringItemModal open={recurringModalOpen} onClose={() => setRecurringModalOpen(false)} onSuccess={fetchExpenses} />
    </div>
  );
}
