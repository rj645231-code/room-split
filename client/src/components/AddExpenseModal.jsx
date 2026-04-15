import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Trash2, Sparkles, ShoppingCart, Utensils, Zap, Car, Music, WifiOff, Camera } from 'lucide-react';
import { createExpense, getSmartSuggestions, scanReceipt } from '../services/api';
import { useApp } from '../context/AppContext';
import toast from 'react-hot-toast';
import { useRef } from 'react';

const CATEGORIES = [
  { value: 'grocery',       label: 'Grocery',   icon: ShoppingCart },
  { value: 'meal',          label: 'Meal',       icon: Utensils },
  { value: 'utility',       label: 'Utility',    icon: Zap },
  { value: 'transport',     label: 'Transport',  icon: Car },
  { value: 'entertainment', label: 'Fun',        icon: Music },
  { value: 'other',         label: 'Other',      icon: Plus },
];

const emptyItem = () => ({ name: '', totalCost: '', consumers: [] });

export default function AddExpenseModal({ open, onClose, onSuccess }) {
  const { activeGroup, isOfflineMode } = useApp();
  const members = activeGroup?.members || [];

  const [form, setForm] = useState({
    title: '',
    category: 'grocery',
    paidBy: '',
    description: '',
  });
  const [items, setItems] = useState([emptyItem()]);
  const [loading, setLoading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [suggestions, setSuggestions] = useState({});
  const [step, setStep] = useState(1); // 1=details, 2=items, 3=review
  const fileInputRef = useRef(null);

  // Load smart suggestions
  useEffect(() => {
    if (open && activeGroup?._id && !isOfflineMode) {
      getSmartSuggestions(activeGroup._id)
        .then(res => setSuggestions(res.data.data || {}))
        .catch(() => {});
    }
    if (open) {
      setStep(1);
      setForm({ title: '', category: 'grocery', paidBy: members[0]?._id || '', description: '' });
      setItems([emptyItem()]);
    }
  }, [open, activeGroup?._id]);

  const totalAmount = items.reduce((s, i) => s + (parseFloat(i.totalCost) || 0), 0);

  const addItem    = () => setItems(prev => [...prev, emptyItem()]);
  const removeItem = (idx) => setItems(prev => prev.filter((_, i) => i !== idx));

  const updateItem = (idx, field, value) => {
    setItems(prev => prev.map((item, i) => {
      if (i !== idx) return item;
      const updated = { ...item, [field]: value };
      // Smart suggestion: auto-select consumers based on history
      if (field === 'name' && value.length > 2) {
        const key = value.toLowerCase().trim();
        const suggestion = suggestions[key];
        if (suggestion?.suggested?.length > 0 && updated.consumers.length === 0) {
          updated.consumers = suggestion.suggested;
        }
      }
      return updated;
    }));
  };

  const toggleConsumer = (itemIdx, userId) => {
    setItems(prev => prev.map((item, i) => {
      if (i !== itemIdx) return item;
      const has = item.consumers.includes(userId);
      return { ...item, consumers: has ? item.consumers.filter(c => c !== userId) : [...item.consumers, userId] };
    }));
  };

  const selectAllConsumers = (itemIdx) => {
    setItems(prev => prev.map((item, i) =>
      i === itemIdx ? { ...item, consumers: members.map(m => m._id) } : item
    ));
  };

  const handleScanReceipt = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (isOfflineMode) {
      toast.error('Start the backend to use Receipt Scanner');
      return;
    }

    setIsScanning(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const base64Data = reader.result;
        const res = await scanReceipt(base64Data);
        if (res.data.success && res.data.data) {
          const parsed = res.data.data;
          
          setForm(f => ({ ...f, title: parsed.merchant || 'Receipt Scan' }));
          
          if (parsed.items && parsed.items.length > 0) {
            setItems(parsed.items.map(i => ({
              name: i.name,
              totalCost: i.price,
              consumers: []
            })));
          }
          
          toast.success('Receipt scanned successfully!');
          setStep(2); // Auto jump to items view
        }
      } catch (err) {
         toast.error(err.response?.data?.message || 'Failed to scan receipt');
      } finally {
        setIsScanning(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.onerror = () => {
      setIsScanning(false);
      toast.error('Failed to read image file');
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!form.paidBy) return toast.error('Select who paid');
    if (items.some(i => !i.name || !i.totalCost)) return toast.error('Fill all item fields');
    if (items.some(i => i.consumers.length === 0)) return toast.error('Select consumers for each item');

    setLoading(true);
    try {
      await createExpense({
        group: activeGroup._id,
        paidBy: form.paidBy,
        title: form.title || items[0].name,
        description: form.description,
        category: form.category,
        totalAmount,
        items: items.map(item => ({
          name: item.name,
          totalCost: parseFloat(item.totalCost),
          consumers: item.consumers,
          category: form.category,
        })),
      });
      toast.success('Expense added! 🎉');
      onSuccess?.();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add expense');
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
            {/* Header */}
            <div style={{ padding: '1.5rem 1.5rem 1rem', position: 'sticky', top: 0, background: 'var(--bg-card)', zIndex: 10, borderBottom: '1px solid var(--border-glass)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <h2 style={{ fontFamily: 'Poppins', fontWeight: 700, fontSize: '1.25rem', color: 'var(--text-primary)' }}>
                    Add Expense
                  </h2>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>
                    Split costs by actual consumption
                  </p>
                </div>
                <button className="btn-ghost" style={{ padding: '8px' }} onClick={onClose}>
                  <X size={18} />
                </button>
              </div>

              {/* Offline warning */}
              {isOfflineMode && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '0.75rem',
                  padding: '8px 12px', background: 'rgba(239,68,68,0.08)', borderRadius: 8, border: '1px solid rgba(239,68,68,0.2)' }}>
                  <WifiOff size={13} color="#f87171" />
                  <span style={{ fontSize: '0.75rem', color: '#f87171', fontWeight: 500 }}>
                    Demo mode — expenses won't be saved. Start the backend first.
                  </span>
                </div>
              )}

              {/* Step indicator */}
              <div style={{ display: 'flex', gap: '8px', marginTop: '0.75rem' }}>
                {['Details', 'Items', 'Review'].map((s, i) => (
                  <div key={s} style={{
                    flex: 1, padding: '4px', borderRadius: 6, textAlign: 'center',
                    fontSize: '0.72rem', fontWeight: 600,
                    background: step === i + 1 ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.03)',
                    color: step === i + 1 ? '#a5b4fc' : step > i + 1 ? 'var(--success)' : 'var(--text-muted)',
                    border: `1px solid ${step === i + 1 ? 'rgba(99,102,241,0.3)' : 'var(--border-glass)'}`,
                    cursor: 'pointer',
                  }} onClick={() => step > i && setStep(i + 1)}>
                    {step > i + 1 ? '✓ ' : ''}{s}
                  </div>
                ))}
              </div>
            </div>

            <div style={{ padding: '1.25rem 1.5rem 1.5rem' }}>
              <AnimatePresence mode="wait">
                {/* Step 1: Details */}
                {step === 1 && (
                  <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      <div style={{ padding: '1rem', background: 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(139,92,246,0.1))', borderRadius: '12px', border: '1px dashed rgba(99,102,241,0.4)', textAlign: 'center' }}>
                        <input type="file" accept="image/*" capture="environment" hidden ref={fileInputRef} onChange={handleScanReceipt} />
                        <button className="btn-primary" style={{ margin: '0 auto' }} onClick={() => fileInputRef.current.click()} disabled={isScanning}>
                          <Camera size={16} /> {isScanning ? 'Analyzing Receipt...' : 'Scan Receipt'}
                        </button>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '8px' }}>Auto-extract items with AI 🪄</p>
                      </div>
                      <div className="divider" />
                      <div>
                        <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500, marginBottom: '6px', display: 'block' }}>Title (optional)</label>
                        <input className="input-glass" placeholder="e.g. Weekly grocery run" value={form.title}
                          onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
                      </div>

                      <div>
                        <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500, marginBottom: '8px', display: 'block' }}>Category</label>
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
                        <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500, marginBottom: '6px', display: 'block' }}>Paid by</label>
                        <select className="input-glass" value={form.paidBy}
                          onChange={e => setForm(f => ({ ...f, paidBy: e.target.value }))}>
                          <option value="">Select person...</option>
                          {members.map(m => (
                            <option key={m._id} value={m._id}>{m.name}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500, marginBottom: '6px', display: 'block' }}>Note (optional)</label>
                        <input className="input-glass" placeholder="Additional notes..." value={form.description}
                          onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                      </div>

                      <button className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '0.875rem' }}
                        onClick={() => { if (!form.paidBy) return toast.error('Select who paid'); setStep(2); }}>
                        Next: Add Items →
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* Step 2: Items */}
                {step === 2 && (
                  <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {items.map((item, idx) => (
                        <motion.div key={idx}
                          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-glass)', borderRadius: 14, padding: '1rem' }}>
                          <div style={{ display: 'flex', gap: '8px', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                            <input className="input-glass" placeholder="Item name" value={item.name} style={{ flex: '1 1 120px' }}
                              onChange={e => updateItem(idx, 'name', e.target.value)} />
                            <input className="input-glass" placeholder="₹ Cost" type="number" value={item.totalCost} style={{ flex: '1 1 80px' }}
                              onChange={e => updateItem(idx, 'totalCost', e.target.value)} />
                            {items.length > 1 && (
                              <button className="btn-ghost" style={{ padding: '8px', flexShrink: 0 }} onClick={() => removeItem(idx)}>
                                <Trash2 size={14} style={{ color: '#f87171' }} />
                              </button>
                            )}
                          </div>

                          {/* Smart suggestion badge */}
                          {item.name.length > 2 && suggestions[item.name.toLowerCase()] && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '0.5rem',
                              padding: '4px 10px', background: 'rgba(245,158,11,0.08)', borderRadius: 8, border: '1px solid rgba(245,158,11,0.2)' }}>
                              <Sparkles size={11} color="#fbbf24" />
                              <span style={{ fontSize: '0.72rem', color: '#fbbf24' }}>Smart suggestion applied from history</span>
                            </div>
                          )}

                          {/* Consumer selector */}
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>Who consumes this?</span>
                              <button style={{ fontSize: '0.7rem', color: '#818cf8', cursor: 'pointer', background: 'none', border: 'none' }}
                                onClick={() => selectAllConsumers(idx)}>Select all</button>
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                              {members.map(m => {
                                const selected = item.consumers.includes(m._id);
                                const isNeverConsumer = suggestions[item.name?.toLowerCase()]?.neverConsumers?.includes(m._id);
                                return (
                                  <motion.button key={m._id}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => toggleConsumer(idx, m._id)}
                                    style={{
                                      padding: '4px 12px', borderRadius: 99, fontSize: '0.77rem', fontWeight: 500,
                                      cursor: 'pointer', transition: 'all 0.15s', border: '1px solid',
                                      background: selected ? m.color + '22' : 'transparent',
                                      borderColor: selected ? m.color + '66' : 'var(--border-glass)',
                                      color: selected ? m.color : 'var(--text-muted)',
                                      opacity: isNeverConsumer && !selected ? 0.4 : 1,
                                      textDecoration: isNeverConsumer && !selected ? 'line-through' : 'none',
                                    }}>
                                    {m.name[0]} {m.name}
                                    {isNeverConsumer && !selected && ' 🚫'}
                                  </motion.button>
                                );
                              })}
                            </div>
                            {item.consumers.length > 0 && item.totalCost && (
                              <div style={{ marginTop: '6px', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                ₹{(parseFloat(item.totalCost) / item.consumers.length).toFixed(2)} per person
                              </div>
                            )}
                          </div>
                        </motion.div>
                      ))}

                      <button className="btn-ghost" onClick={addItem} style={{ justifyContent: 'center' }}>
                        <Plus size={14} /> Add Item
                      </button>

                      <div className="divider" />
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Total</span>
                        <span style={{ fontWeight: 800, fontFamily: 'Poppins', fontSize: '1.25rem', color: 'var(--text-primary)' }}>
                          ₹{totalAmount.toFixed(2)}
                        </span>
                      </div>

                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="btn-ghost" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setStep(1)}>← Back</button>
                        <button className="btn-primary" style={{ flex: 2, justifyContent: 'center', padding: '0.875rem' }}
                          onClick={() => { if (items.some(i => !i.name || !i.totalCost)) return toast.error('Fill all items'); setStep(3); }}>
                          Review →
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Step 3: Review */}
                {step === 3 && (
                  <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      <div style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 14, padding: '1rem' }}>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Paid by</div>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                          {members.find(m => m._id === form.paidBy)?.name || '—'}
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {items.map((item, idx) => {
                          const consumers = members.filter(m => item.consumers.includes(m._id));
                          const share = consumers.length > 0 ? (parseFloat(item.totalCost || 0) / consumers.length).toFixed(2) : 0;
                          return (
                            <div key={idx} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-glass)', borderRadius: 12, padding: '0.875rem' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{item.name}</span>
                                <span style={{ color: '#a5b4fc', fontWeight: 700 }}>₹{parseFloat(item.totalCost || 0).toFixed(2)}</span>
                              </div>
                              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                {consumers.map(m => (
                                  <span key={m._id} style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: 99,
                                    background: m.color + '22', color: m.color, border: `1px solid ${m.color}44` }}>
                                    {m.name}: ₹{share}
                                  </span>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(139,92,246,0.1))', borderRadius: 12, padding: '1rem', display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Total Amount</span>
                        <span style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--text-primary)' }}>₹{totalAmount.toFixed(2)}</span>
                      </div>

                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="btn-ghost" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setStep(2)} disabled={loading}>← Back</button>
                        <button className="btn-primary" style={{ flex: 2, justifyContent: 'center', padding: '0.875rem' }}
                          onClick={isOfflineMode ? () => toast.error('Start the backend to save expenses') : handleSubmit}
                          disabled={loading}>
                          {loading ? '⏳ Saving...' : isOfflineMode ? '🔒 Backend Required' : '✅ Confirm & Split'}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
