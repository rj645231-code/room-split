import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Trash2, Edit2, X, Camera, ShoppingCart, Utensils,
  Zap, Car, Music, Package, Wifi, Heart, Coffee, Search, Filter
} from 'lucide-react';
import TopBar from '../components/TopBar';
import { useApp } from '../context/AppContext';
import {
  getPersonalExpenses, createPersonalExpense,
  updatePersonalExpense, deletePersonalExpense, scanReceipt
} from '../services/api';
import toast from 'react-hot-toast';

const CATEGORIES = [
  { key: 'food',          label: 'Food & Dining',   icon: Utensils,     color: '#f59e0b' },
  { key: 'grocery',       label: 'Groceries',        icon: ShoppingCart, color: '#10b981' },
  { key: 'transport',     label: 'Transport',        icon: Car,          color: '#8b5cf6' },
  { key: 'medical',       label: 'Medical',          icon: Heart,        color: '#ef4444' },
  { key: 'shopping',      label: 'Shopping',         icon: Package,      color: '#f97316' },
  { key: 'entertainment', label: 'Entertainment',    icon: Music,        color: '#ec4899' },
  { key: 'utility',       label: 'Utilities',        icon: Zap,          color: '#3b82f6' },
  { key: 'coffee',        label: 'Coffee & Snacks',  icon: Coffee,       color: '#92400e' },
  { key: 'wifi',          label: 'Wi-Fi/Internet',   icon: Wifi,         color: '#06b6d4' },
  { key: 'other',         label: 'Others',           icon: Package,      color: '#6366f1' },
];

const getCat = (key) => CATEGORIES.find(c => c.key === key) || CATEGORIES[CATEGORIES.length - 1];

function fmt(n) { return `₹${Number(n || 0).toLocaleString('en-IN')}`; }

const BLANK = { title: '', amount: '', category: 'food', date: new Date().toISOString().slice(0, 10), note: '' };

export default function PersonalExpenses() {
  const { isOfflineMode } = useApp();
  const [expenses, setExpenses]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [modalOpen, setModalOpen]   = useState(false);
  const [editing, setEditing]       = useState(null);   // null = add, object = edit
  const [form, setForm]             = useState(BLANK);
  const [saving, setSaving]         = useState(false);
  const [scanning, setScanning]     = useState(false);
  const [search, setSearch]         = useState('');
  const [filterCat, setFilterCat]   = useState('all');
  const [deleteId, setDeleteId]     = useState(null);
  const fileInputRef = useRef(null);

  const fetchData = async () => {
    if (isOfflineMode) { setLoading(false); return; }
    setLoading(true);
    try {
      const res = await getPersonalExpenses();
      setExpenses(res.data.data || []);
    } catch { toast.error('Failed to load personal expenses'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  // ── derived ────────────────────────────────────────────────────────────────
  const thisMonth = new Date().toISOString().slice(0, 7);
  const monthTotal = expenses
    .filter(e => e.date?.slice(0, 7) === thisMonth)
    .reduce((s, e) => s + e.amount, 0);

  const filtered = expenses.filter(e => {
    const matchCat = filterCat === 'all' || e.category === filterCat;
    const matchSearch = e.title.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  // By category totals (this month)
  const catTotals = {};
  expenses
    .filter(e => e.date?.slice(0, 7) === thisMonth)
    .forEach(e => { catTotals[e.category] = (catTotals[e.category] || 0) + e.amount; });

  // ── modal helpers ──────────────────────────────────────────────────────────
  const openAdd = () => {
    setEditing(null);
    setForm(BLANK);
    setModalOpen(true);
  };

  const openEdit = (exp) => {
    setEditing(exp);
    setForm({
      title: exp.title,
      amount: String(exp.amount),
      category: exp.category,
      date: exp.date?.slice(0, 10) || new Date().toISOString().slice(0, 10),
      note: exp.note || '',
    });
    setModalOpen(true);
  };

  const closeModal = () => { setModalOpen(false); setScanning(false); };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.amount) return toast.error('Title and amount are required');
    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        amount: parseFloat(form.amount),
        category: form.category,
        date: new Date(form.date).toISOString(),
        note: form.note.trim(),
      };
      if (editing) {
        await updatePersonalExpense(editing.id, payload);
        toast.success('Expense updated');
      } else {
        await createPersonalExpense(payload);
        toast.success('Expense added ✓');
      }
      closeModal();
      fetchData();
    } catch { toast.error('Failed to save expense'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    try {
      await deletePersonalExpense(id);
      setExpenses(prev => prev.filter(e => e.id !== id));
      toast.success('Deleted');
    } catch { toast.error('Failed to delete'); }
    setDeleteId(null);
  };

  const handleScanReceipt = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setScanning(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result.split(',')[1];
        try {
          const res = await scanReceipt(base64);
          const d = res.data.data;
          if (d?.title) setForm(f => ({ ...f, title: d.title }));
          if (d?.totalAmount) setForm(f => ({ ...f, amount: String(d.totalAmount) }));
          if (d?.category) setForm(f => ({ ...f, category: d.category }));
          toast.success('Receipt scanned!');
        } catch { toast.error('Scan failed — fill manually'); }
        setScanning(false);
      };
      reader.readAsDataURL(file);
    } catch { setScanning(false); }
  };

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <div>
      <TopBar
        title="Personal Expenses"
        subtitle="Track your private daily spends"
        actions={
          <button className="btn-primary" onClick={openAdd}>
            <Plus size={15} /> Add Expense
          </button>
        }
      />

      {/* ── Summary Cards ──────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12, marginBottom: '1.5rem' }}>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="card-glass" style={{ padding: '1rem', textAlign: 'center' }}>
          <div style={{ fontSize: '1.5rem', marginBottom: 4 }}>💸</div>
          <div style={{ fontFamily: 'Poppins', fontWeight: 800, fontSize: '1.1rem', color: '#6366f1' }}>{fmt(monthTotal)}</div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>This Month</div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="card-glass" style={{ padding: '1rem', textAlign: 'center' }}>
          <div style={{ fontSize: '1.5rem', marginBottom: 4 }}>📋</div>
          <div style={{ fontFamily: 'Poppins', fontWeight: 800, fontSize: '1.1rem', color: '#10b981' }}>
            {expenses.filter(e => e.date?.slice(0, 7) === thisMonth).length}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>Entries</div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="card-glass" style={{ padding: '1rem', textAlign: 'center' }}>
          <div style={{ fontSize: '1.5rem', marginBottom: 4 }}>📈</div>
          <div style={{ fontFamily: 'Poppins', fontWeight: 800, fontSize: '1.1rem', color: '#f59e0b' }}>
            {fmt(monthTotal > 0 ? Math.round(monthTotal / new Date().getDate()) : 0)}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>Daily Avg</div>
        </motion.div>

        {/* Top category */}
        {Object.keys(catTotals).length > 0 && (() => {
          const topKey = Object.entries(catTotals).sort((a, b) => b[1] - a[1])[0][0];
          const cat = getCat(topKey);
          const Icon = cat.icon;
          return (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
              className="card-glass" style={{ padding: '1rem', textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', marginBottom: 4 }}><Icon size={22} color={cat.color} /></div>
              <div style={{ fontFamily: 'Poppins', fontWeight: 700, fontSize: '0.85rem', color: cat.color }}>{cat.label}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>Top Category</div>
            </motion.div>
          );
        })()}
      </div>

      {/* ── Category breakdown bar ──────────────────────────────────────────── */}
      {Object.keys(catTotals).length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
          className="card-glass" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>This month by category</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {Object.entries(catTotals).sort((a, b) => b[1] - a[1]).map(([key, amt]) => {
              const cat = getCat(key);
              const Icon = cat.icon;
              const pct = monthTotal > 0 ? Math.round((amt / monthTotal) * 100) : 0;
              return (
                <div key={key}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <div style={{ width: 24, height: 24, borderRadius: 6, background: cat.color + '22', color: cat.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon size={12} />
                    </div>
                    <span style={{ flex: 1, fontSize: '0.8rem', color: 'var(--text-primary)', fontWeight: 500 }}>{cat.label}</span>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>{fmt(amt)}</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', minWidth: 32, textAlign: 'right' }}>{pct}%</span>
                  </div>
                  <div style={{ height: 5, background: 'var(--border-glass)', borderRadius: 99, overflow: 'hidden' }}>
                    <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.7 }}
                      style={{ height: '100%', background: cat.color, borderRadius: 99 }} />
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* ── Search + Filter ─────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 10, marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 180, position: 'relative' }}>
          <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input className="input-glass" placeholder="Search expenses…" value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: '2.25rem' }} />
        </div>
        <select className="input-glass" value={filterCat} onChange={e => setFilterCat(e.target.value)}
          style={{ width: 'auto', minWidth: 140 }}>
          <option value="all">All Categories</option>
          {CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
        </select>
      </div>

      {/* ── Expense List ────────────────────────────────────────────────────── */}
      {isOfflineMode ? (
        <div className="card-glass" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>👤</div>
          <h3 style={{ fontFamily: 'Poppins', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Connect to backend</h3>
          <p style={{ fontSize: '0.9rem' }}>Personal expenses are saved to your account and need the backend server.</p>
        </div>
      ) : loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1,2,3].map(i => <div key={i} className="shimmer" style={{ height: 72, borderRadius: 14 }} />)}
        </div>
      ) : filtered.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="card-glass" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🧾</div>
          <h3 style={{ fontFamily: 'Poppins', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
            {search || filterCat !== 'all' ? 'No matches found' : 'No personal expenses yet'}
          </h3>
          <p style={{ fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            {search || filterCat !== 'all' ? 'Try adjusting your filter' : 'Start tracking your private spends — coffee, metro, medicines, everything!'}
          </p>
          {!search && filterCat === 'all' && (
            <button className="btn-primary" onClick={openAdd}><Plus size={15} /> Add Your First Expense</button>
          )}
        </motion.div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <AnimatePresence mode="popLayout">
            {filtered.map((exp, idx) => {
              const cat = getCat(exp.category);
              const Icon = cat.icon;
              return (
                <motion.div key={exp.id}
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }}
                  transition={{ delay: idx * 0.03 }}
                  className="card-glass"
                  style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: 14 }}
                  whileHover={{ scale: 1.005 }}>

                  {/* Icon */}
                  <div style={{ width: 42, height: 42, borderRadius: 12, background: cat.color + '22', color: cat.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon size={18} />
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{exp.title}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ background: cat.color + '18', color: cat.color, padding: '1px 7px', borderRadius: 99, fontWeight: 600 }}>{cat.label}</span>
                      <span>{new Date(exp.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      {exp.note && <span>· {exp.note}</span>}
                    </div>
                  </div>

                  {/* Amount */}
                  <div style={{ fontFamily: 'Poppins', fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)', flexShrink: 0 }}>
                    {fmt(exp.amount)}
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button onClick={() => openEdit(exp)} style={{ background: 'rgba(99,102,241,0.1)', border: 'none', borderRadius: 8, color: '#818cf8', cursor: 'pointer', padding: '6px 8px', display: 'flex', alignItems: 'center' }}>
                      <Edit2 size={14} />
                    </button>
                    <button onClick={() => setDeleteId(exp.id)} style={{ background: 'rgba(239,68,68,0.1)', border: 'none', borderRadius: 8, color: '#f87171', cursor: 'pointer', padding: '6px 8px', display: 'flex', alignItems: 'center' }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* ── FAB ─────────────────────────────────────────────────────────────── */}
      <motion.button className="fab" onClick={openAdd} whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }} title="Add Personal Expense">+</motion.button>

      {/* ── Add/Edit Modal ──────────────────────────────────────────────────── */}
      <AnimatePresence>
        {modalOpen && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={e => e.target === e.currentTarget && closeModal()}>
            <motion.div className="modal-content" style={{ maxWidth: 480 }}
              initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 30, opacity: 0 }}>
              <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-glass)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h2 style={{ fontFamily: 'Poppins', fontWeight: 700, fontSize: '1.1rem' }}>
                  {editing ? 'Edit Expense' : '+ New Personal Expense'}
                </h2>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {/* AI Scan btn */}
                  <button onClick={() => fileInputRef.current?.click()}
                    style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 8, color: '#818cf8', cursor: 'pointer', padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.8rem', fontWeight: 600 }}>
                    {scanning ? '⏳' : <Camera size={14} />} {scanning ? 'Scanning…' : 'Scan Receipt'}
                  </button>
                  <input type="file" accept="image/*" capture="environment" hidden ref={fileInputRef} onChange={handleScanReceipt} />
                  <button onClick={closeModal} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}><X size={18} /></button>
                </div>
              </div>

              <form onSubmit={handleSave} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* Title */}
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Title *</label>
                  <input className="input-glass" placeholder="e.g. Swiggy Dinner, Metro Ticket…" required
                    value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
                </div>

                {/* Amount + Date row */}
                <div style={{ display: 'flex', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Amount (₹) *</label>
                    <input className="input-glass" type="number" min="0" step="0.01" placeholder="0.00" required
                      value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Date</label>
                    <input className="input-glass" type="date"
                      value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
                  </div>
                </div>

                {/* Category grid */}
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>Category</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: 8 }}>
                    {CATEGORIES.map(cat => {
                      const Icon = cat.icon;
                      const active = form.category === cat.key;
                      return (
                        <button type="button" key={cat.key} onClick={() => setForm(f => ({ ...f, category: cat.key }))}
                          style={{ padding: '8px 6px', borderRadius: 10, border: `2px solid ${active ? cat.color : 'var(--border-glass)'}`, background: active ? cat.color + '18' : 'transparent', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, cursor: 'pointer', transition: 'all 0.15s' }}>
                          <Icon size={16} color={active ? cat.color : 'var(--text-muted)'} />
                          <span style={{ fontSize: '0.65rem', fontWeight: 600, color: active ? cat.color : 'var(--text-muted)', lineHeight: 1.2, textAlign: 'center' }}>{cat.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Note */}
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Note <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(optional)</span></label>
                  <input className="input-glass" placeholder="Any extra details…"
                    value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} />
                </div>

                <button className="btn-primary" type="submit" disabled={saving} style={{ width: '100%', justifyContent: 'center', padding: '0.875rem', marginTop: '0.25rem' }}>
                  {saving ? 'Saving…' : editing ? 'Save Changes' : 'Add Expense'}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Delete Confirm ──────────────────────────────────────────────────── */}
      <AnimatePresence>
        {deleteId && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="modal-content" style={{ maxWidth: 360, padding: '2rem', textAlign: 'center', borderRadius: 20 }}
              initial={{ scale: 0.92 }} animate={{ scale: 1 }} exit={{ scale: 0.92 }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🗑️</div>
              <h3 style={{ fontFamily: 'Poppins', fontWeight: 700, marginBottom: '0.5rem' }}>Delete Expense?</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>This action cannot be undone.</p>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                <button className="btn-ghost" onClick={() => setDeleteId(null)}>Cancel</button>
                <button className="btn-primary" style={{ background: 'linear-gradient(135deg,#ef4444,#dc2626)' }} onClick={() => handleDelete(deleteId)}>Delete</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
