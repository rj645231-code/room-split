import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../context/AppContext';
import { getMonthlySummary, logConsumption, createExpense, deleteRecurringItem } from '../services/api';
import AddRecurringItemModal from '../components/AddRecurringItemModal';
import TopBar from '../components/TopBar';
import { Plus, CheckCircle, Save, ChevronRight, X, Calendar, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

const CATEGORY_META = {
  grocery:       { icon: '🛒', color: '#10b981', label: 'Grocery'   },
  meal:          { icon: '🍽️', color: '#f59e0b', label: 'Meal'      },
  utility:       { icon: '💡', color: '#6366f1', label: 'Utility'   },
  transport:     { icon: '🚗', color: '#3b82f6', label: 'Transport' },
  entertainment: { icon: '🎮', color: '#ec4899', label: 'Fun'       },
  other:         { icon: '📦', color: '#94a3b8', label: 'Other'     },
};

export default function DailyItems() {
  const { activeGroup, currentUser, isOfflineMode, isAdmin } = useApp();
  const [data, setData] = useState({ consumptions: [], templates: [] });
  const [loading, setLoading] = useState(true);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [summaryModal, setSummaryModal] = useState(null); // the selected template for summary
  
  // Local state for today's checkboxes 
  // { recurringItemId: [userId1, userId2] }
  const [todaySaves, setTodaySaves] = useState({});

  const today = new Date().toISOString().split('T')[0];
  const currentMonth = today.slice(0, 7); // e.g. 2026-04

  const fetchData = async () => {
    if (isOfflineMode) { setLoading(false); return; }
    if (!activeGroup?._id) return;
    setLoading(true);
    try {
      const res = await getMonthlySummary(activeGroup._id, currentMonth);
      setData(res.data.data);

      // Initialize today's checkboxes from DB if logged, else from default
      const saves = {};
      const { consumptions, templates } = res.data.data;
      
      templates.forEach(t => {
        const loggedToday = consumptions.find(c => c.recurring_item_id === t._id && c.date === today);
        saves[t._id] = loggedToday ? loggedToday.consumerIds : t.defaultConsumers;
      });
      setTodaySaves(saves);
    } catch {
      toast.error('Failed to load daily items');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [activeGroup?._id, isOfflineMode]);

  const handleToggle = (itemId, userId) => {
    setTodaySaves(prev => {
      const arr = prev[itemId] || [];
      return { ...prev, [itemId]: arr.includes(userId) ? arr.filter(id => id !== userId) : [...arr, userId] };
    });
  };

  const handleSaveDaily = async (itemId) => {
    if (isOfflineMode) return toast.error('Backend required');
    const consumerIds = todaySaves[itemId] || [];
    try {
      await logConsumption({ recurringItemId: itemId, groupId: activeGroup._id, date: today, consumerIds });
      toast.success('Consumption logged for today! ✅');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    }
  };

  const handleDeleteItem = async (id) => {
    if (isOfflineMode) return;
    if (!confirm('Delete this template? Note: Past monthly generated expenses will remain.')) return;
    try {
      await deleteRecurringItem(id);
      fetchData();
      if (summaryModal?._id === id) setSummaryModal(null);
    } catch { toast.error('Failed to delete template'); }
  };

  return (
    <div>
      <TopBar
        title="Daily Items"
        subtitle="Track daily consumptions like Tiffin, Milk"
        actions={<button className="btn-primary" onClick={() => setAddModalOpen(true)}><Plus size={15} /> Add Item</button>}
      />

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1,2].map(i => <div key={i} className="shimmer" style={{ height: 140, borderRadius: 16 }} />)}
        </div>
      ) : data.templates.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🥛</div>
          <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>No daily items setup.</p>
          <p style={{ fontSize: '0.85rem' }}>Add a template (like Tiffin) to start ticking it off daily!</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Today's Checklist */}
          <div>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Calendar size={14} color="#f59e0b" /> Today's Checklist
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
              {data.templates.map(item => {
                const meta = CATEGORY_META[item.category] || CATEGORY_META.other;
                const selectedConsumers = todaySaves[item._id] || [];
                const loggedToday = data.consumptions.find(c => c.recurring_item_id === item._id && c.date === today);

                return (
                  <div key={item._id} className="card-glass" style={{ padding: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: meta.color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', flexShrink: 0 }}>
                          {meta.icon}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{item.title}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>₹{item.amount.toFixed(2)} / unit</div>
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', gap: '4px' }}>
                        {(!isOfflineMode && (isAdmin || item.created_by === currentUser?._id)) && (
                          <button className="btn-ghost" style={{ padding: '6px' }} onClick={(e) => { e.stopPropagation(); handleDeleteItem(item._id); }}>
                            <Trash2 size={16} color="#f87171" />
                          </button>
                        )}
                        <button className="btn-ghost" style={{ padding: '6px' }} onClick={() => setSummaryModal(item)}>
                          <ChevronRight size={18} color="var(--text-muted)" />
                        </button>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '1rem' }}>
                      {activeGroup?.members?.map(m => {
                        const isSelected = selectedConsumers.includes(m._id);
                        return (
                          <div key={m._id} onClick={() => handleToggle(item._id, m._id)} 
                            style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', padding: '6px 12px', borderRadius: 99, border: `1px solid ${isSelected ? m.color : 'var(--border-glass)'}`, background: isSelected ? m.color + '22' : 'var(--bg-glass)', opacity: isSelected ? 1 : 0.6, flex: 1, minWidth: 80, justifyContent: 'center' }}>
                            {isSelected && <CheckCircle size={12} color={m.color} />}
                            <span style={{ fontSize: '0.75rem', color: isSelected ? m.color : 'var(--text-muted)', fontWeight: isSelected ? 600 : 400 }}>{m.name}</span>
                          </div>
                        );
                      })}
                    </div>

                    <button 
                      className="btn-primary" 
                      style={{ width: '100%', justifyContent: 'center', height: '36px', background: loggedToday ? 'transparent' : 'var(--text-primary)', border: loggedToday ? '1px solid #10b981' : 'none', color: loggedToday ? '#10b981' : '#fff' }} 
                      onClick={() => handleSaveDaily(item._id)}
                    >
                      {loggedToday ? "✓ Update Today's Log" : 'Save Today'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      )}

      {/* Monthly Summary Modal */}
      <MonthlySummaryModal 
        open={!!summaryModal} 
        onClose={() => setSummaryModal(null)} 
        item={summaryModal} 
        data={data}
        onGenerate={() => { setSummaryModal(null); fetchData(); }}
      />

      <AddRecurringItemModal open={addModalOpen} onClose={() => setAddModalOpen(false)} onSuccess={fetchData} />
    </div>
  );
}

// ── Sub-component: Monthly Summary Modal ──────────────────────────────────────
function MonthlySummaryModal({ open, onClose, item, data, onGenerate }) {
  const { activeGroup, currentUser, isOfflineMode, isAdmin } = useApp();
  const [totalAmount, setTotalAmount] = useState('');
  const [paidBy, setPaidBy] = useState('');
  const [splitMethod, setSplitMethod] = useState('actual'); // actual or equal
  const [loading, setLoading] = useState(false);

  // Filter consumptions for this item only
  const consumptions = data.consumptions.filter(c => c.recurring_item_id === item?._id);

  // Calculate per person days
  const consumptionCount = {}; // userId -> number of days consumed
  let totalUnits = 0;

  consumptions.forEach(c => {
    c.consumerIds.forEach(uid => {
      consumptionCount[uid] = (consumptionCount[uid] || 0) + 1;
      totalUnits++;
    });
  });

  useEffect(() => {
    if (item && open) {
      setTotalAmount(item.amount * totalUnits);
      setPaidBy(currentUser?._id || '');
      setSplitMethod('actual');
    }
  }, [item, open, totalUnits, currentUser]);

  if (!item || !open) return null;

  const handleGenerate = async () => {
    if (!totalAmount || Number(totalAmount) <= 0) return toast.error('Enter valid amount');
    if (!paidBy) return toast.error('Select who paid');
    if (totalUnits === 0 && splitMethod === 'actual') return toast.error('Nobody consumed anything! Cannot split by actual use.');

    setLoading(true);
    try {
      const amt = Number(totalAmount);
      
      // Compute the splits ourselves
      let consumersArray = [];
      
      if (splitMethod === 'actual') {
        const perUnitCost = amt / totalUnits;
        Object.entries(consumptionCount).forEach(([uid, days]) => {
          if (days > 0) {
            // we fake it by putting them in the 'consumers' array 'days' times
            // wait, expense items logic: 'cost_per_consumer' = totalCost / consumers.length
            // A better way is: add an item for each person specifically? 
            // Or just add 1 expense item per group member that consumed.
            activeGroup.members.forEach(m => {
              if (m._id === uid) {
                // To force the exact split via our existing splitAlgorithm, 
                // we can pass exact consumers arrays. 
              }
            });
          }
        });
        
        // Simpler: Just map each user's consumption to a discrete item.
        const itemsPayload = Object.entries(consumptionCount).map(([uid, days]) => ({
          name: `${item.title} (${days} days)`,
          totalCost: parseFloat((days * perUnitCost).toFixed(2)),
          consumers: [uid],
          category: item.category
        })).filter(i => i.totalCost > 0);

        await createExpense({
          group: activeGroup._id,
          paidBy: paidBy,
          title: `${item.title} - ${new Date().toLocaleDateString('en-US', {month: 'long', year: 'numeric'})}`,
          category: item.category,
          totalAmount: amt,
          isRecurring: true,
          recurringMonth: new Date().toISOString().slice(0, 7),
          items: itemsPayload
        });
      } else {
        // Equal split
        await createExpense({
          group: activeGroup._id,
          paidBy: paidBy,
          title: `${item.title} - ${new Date().toLocaleDateString('en-US', {month: 'long', year: 'numeric'})}`,
          category: item.category,
          totalAmount: amt,
          isRecurring: true,
          recurringMonth: new Date().toISOString().slice(0, 7),
          items: [{
            name: `${item.title} (Monthly Equal)`,
            totalCost: amt,
            consumers: activeGroup.members.map(m => m._id),
            category: item.category
          }]
        });
      }

      toast.success('Generated recurring monthly expense! 🎉');
      onGenerate();
    } catch (err) {
      toast.error('Failed to generate expense');
    } finally {
      setLoading(false);
    }
  };

  const isCreatorOrAdmin = isAdmin || item.created_by === currentUser?._id;

  return (
    <AnimatePresence>
      <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={e => e.target === e.currentTarget && onClose()}>
        <motion.div className="modal-content" initial={{ y: '100%', opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: '100%', opacity: 0 }} transition={{ type: 'spring', damping: 30, stiffness: 300 }}>
          <div style={{ padding: '1.5rem 1.5rem 1rem', borderBottom: '1px solid var(--border-glass)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h2 style={{ fontFamily: 'Poppins', fontWeight: 700, fontSize: '1.25rem', color: 'var(--text-primary)' }}>
                {item.title} Summary
              </h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>
                Month of {new Date().toLocaleDateString('en-US', {month: 'long', year: 'numeric'})}
              </p>
            </div>
            <button className="btn-ghost" style={{ padding: '8px' }} onClick={onClose}><X size={18} /></button>
          </div>

          <div style={{ padding: '1.25rem 1.5rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--bg-glass)', borderRadius: 12 }}>
              <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Total Units Consumed</span>
              <span style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>{totalUnits}</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '6px' }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Per Person Breakdown (Days)</label>
              <div style={{ border: '1px solid var(--border-glass)', borderRadius: 12, overflow: 'hidden' }}>
                {activeGroup?.members?.map(m => {
                  const days = consumptionCount[m._id] || 0;
                  return (
                    <div key={m._id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', borderBottom: '1px solid var(--border-glass)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: m.color }} />
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>{m.name}</span>
                      </div>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: days > 0 ? '#34d399' : 'var(--text-muted)' }}>{days} days</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500, marginBottom: '6px', display: 'block' }}>Total Amount to Pay (₹)</label>
              <input className="input-glass" type="number" value={totalAmount} onChange={e => setTotalAmount(e.target.value)} />
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500, marginBottom: '6px', display: 'block' }}>Who actually paid the bill?</label>
              <select className="input-glass" value={paidBy} onChange={e => setPaidBy(e.target.value)}>
                <option value="" disabled>Select Payer</option>
                {activeGroup?.members?.map(m => (
                  <option key={m._id} value={m._id}>{m.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500, marginBottom: '6px', display: 'block' }}>Split Method</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className={`chip ${splitMethod === 'actual' ? 'selected' : ''}`} onClick={() => setSplitMethod('actual')} style={{ flex: 1 }}>By Actual Uses</button>
                <button className={`chip ${splitMethod === 'equal' ? 'selected' : ''}`} onClick={() => setSplitMethod('equal')} style={{ flex: 1 }}>Equal Among All</button>
              </div>
            </div>

            <div style={{ marginTop: '1rem' }}>
              <button className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '0.875rem' }}
                onClick={handleGenerate} disabled={loading}>
                {loading ? '⏳ Generating...' : 'Generate Monthly Expense'}
              </button>
            </div>

          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
