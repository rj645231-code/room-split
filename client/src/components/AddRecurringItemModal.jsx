import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShoppingCart, Utensils, Zap, Car, Music, Plus } from 'lucide-react';
import { createRecurringItem } from '../services/api';
import { useApp } from '../context/AppContext';
import toast from 'react-hot-toast';

const CATEGORIES = [
  { value: 'grocery',       label: 'Grocery',   icon: ShoppingCart },
  { value: 'meal',          label: 'Meal',       icon: Utensils },
  { value: 'utility',       label: 'Utility',    icon: Zap },
  { value: 'transport',     label: 'Transport',  icon: Car },
  { value: 'entertainment', label: 'Fun',        icon: Music },
  { value: 'other',         label: 'Other',      icon: Plus },
];

export default function AddRecurringItemModal({ open, onClose, onSuccess }) {
  const { activeGroup, isOfflineMode } = useApp();
  const members = activeGroup?.members || [];

  const [form, setForm] = useState({
    title: '',
    amount: '',
    category: 'meal',
    defaultConsumers: members.map(m => m._id)
  });
  const [loading, setLoading] = useState(false);

  // Initialize defaults when modal opens
  useState(() => {
    if (open) {
      setForm(prev => ({ ...prev, defaultConsumers: members.map(m => m._id) }));
    }
  }, [open, members]);

  const toggleConsumer = (userId) => {
    setForm(prev => {
      const has = prev.defaultConsumers.includes(userId);
      return {
        ...prev,
        defaultConsumers: has 
          ? prev.defaultConsumers.filter(id => id !== userId)
          : [...prev.defaultConsumers, userId]
      };
    });
  };

  const handleSubmit = async () => {
    if (!form.title.trim()) return toast.error('Enter a title (e.g. Tiffin)');
    if (!form.amount || parseFloat(form.amount) <= 0) return toast.error('Enter a valid amount');
    if (form.defaultConsumers.length === 0) return toast.error('Select at least one default consumer');
    if (isOfflineMode) return toast.error('Start backend to add recurring items');

    setLoading(true);
    try {
      await createRecurringItem({
        groupId: activeGroup._id,
        title: form.title.trim(),
        amount: parseFloat(form.amount),
        category: form.category,
        defaultConsumers: form.defaultConsumers
      });
      toast.success('Recurring item template created! 🎉');
      onSuccess?.();
      onClose();
      // Reset form
      setForm({ title: '', amount: '', category: 'meal', defaultConsumers: members.map(m => m._id) });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create item');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={e => e.target === e.currentTarget && onClose()}>
          <motion.div
            className="modal-content"
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          >
            <div style={{ padding: '1.5rem 1.5rem 1rem', borderBottom: '1px solid var(--border-glass)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <h2 style={{ fontFamily: 'Poppins', fontWeight: 700, fontSize: '1.25rem', color: 'var(--text-primary)' }}>
                    Add Recurring Item
                  </h2>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>
                    Setup daily templates (e.g. Milk, Tiffin, Maid)
                  </p>
                </div>
                <button className="btn-ghost" style={{ padding: '8px' }} onClick={onClose}>
                  <X size={18} />
                </button>
              </div>
            </div>

            <div style={{ padding: '1.25rem 1.5rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500, marginBottom: '6px', display: 'block' }}>Item Name</label>
                <input className="input-glass" placeholder="e.g. Daily Tiffin" value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))} autoFocus />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500, marginBottom: '6px', display: 'block' }}>Fixed Price (₹)</label>
                <input className="input-glass" type="number" placeholder="120" value={form.amount}
                  onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500, marginBottom: '6px', display: 'block' }}>Category</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {CATEGORIES.map(({ value, label, icon: Icon }) => (
                    <div key={value} className={`chip ${form.category === value ? 'selected' : ''}`}
                      onClick={() => setForm(f => ({ ...f, category: value }))}>
                      <Icon size={12} /> {label}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500, marginBottom: '6px', display: 'block' }}>
                  Default Consumers (Equal Split)
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {members.map(m => {
                    const selected = form.defaultConsumers.includes(m._id);
                    return (
                      <motion.button key={m._id}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => toggleConsumer(m._id)}
                        style={{
                          padding: '6px 14px', borderRadius: 99, fontSize: '0.8rem', fontWeight: 500,
                          cursor: 'pointer', transition: 'all 0.15s', border: '1px solid',
                          background: selected ? m.color + '22' : 'transparent',
                          borderColor: selected ? m.color + '66' : 'var(--border-glass)',
                          color: selected ? m.color : 'var(--text-muted)'
                        }}>
                        {m.name}
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              <div style={{ marginTop: '1rem' }}>
                <button className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '0.875rem' }}
                  onClick={handleSubmit} disabled={loading}>
                  {loading ? '⏳ Saving...' : 'Save Template'}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
