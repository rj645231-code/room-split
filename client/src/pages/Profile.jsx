import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Save, User, Mail, Palette, Info } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { updateProfile } from '../services/api';
import TopBar from '../components/TopBar';
import toast from 'react-hot-toast';

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#14b8a6'];
const DIETARY = [
  { value: 'veg',     label: '🥦 Vegetarian' },
  { value: 'vegan',   label: '🌱 Vegan' },
  { value: 'non-veg', label: '🍗 Non-Veg' },
  { value: 'halal',   label: '☪️ Halal' },
];

export default function Profile() {
  const { currentUser, setCurrentUser, isOfflineMode } = useApp();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '',
    color: '#6366f1',
    avatar: '',
    dietary: [],
    dislikes: '',
    allergies: '',
    budgetStartDay: 1,
  });

  useEffect(() => {
    if (currentUser) {
      setForm({
        name: currentUser.name || '',
        color: currentUser.color || '#6366f1',
        avatar: currentUser.avatar || '',
        dietary: currentUser.dietary || [],
        dislikes: (currentUser.dislikes || []).join(', '),
        allergies: (currentUser.allergies || []).join(', '),
        budgetStartDay: currentUser.budget_start_day || 1,
      });
    }
  }, [currentUser]);

  const handleSubmit = async () => {
    if (isOfflineMode) return toast.error('Cannot save profile in Demo Mode');
    if (!form.name) return toast.error('Name is required');

    setLoading(true);
    try {
      const payload = {
        name: form.name,
        color: form.color,
        avatar: form.avatar,
        dietary: form.dietary,
        dislikes: form.dislikes.split(',').map(s => s.trim()).filter(Boolean),
        allergies: form.allergies.split(',').map(s => s.trim()).filter(Boolean),
        budget_start_day: parseInt(form.budgetStartDay) || 1,
      };

      const res = await updateProfile(payload);
      setCurrentUser(res.data.data);
      toast.success('Profile updated successfully! 🎉');
    } catch (err) {
      toast.error('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <TopBar title="My Profile" subtitle="Manage your personal details and preferences" />

      <div style={{ maxWidth: 800 }}>
        {/* Info card */}
        <div className="card-glass" style={{ padding: '1.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div className="avatar avatar-lg" style={{ background: form.color + '22', color: form.color, fontSize: '1.8rem', border: `2px solid ${form.color}55` }}>
            {form.avatar || form.name[0] || '👤'}
          </div>
          <div>
            <h2 style={{ fontFamily: 'Poppins', fontWeight: 700, fontSize: '1.25rem', color: 'var(--text-primary)' }}>
              {currentUser?.name}
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '4px' }}>
              <Mail size={14} /> {currentUser?.email}
            </div>
          </div>
        </div>

        {/* Edit form */}
        <div className="card-glass" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            
            {/* Basic Info */}
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500, display: 'block', marginBottom: '6px' }}>Display Name</label>
                <div style={{ position: 'relative' }}>
                  <User size={16} color="var(--text-muted)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
                  <input className="input-glass" style={{ paddingLeft: '2.25rem' }} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                </div>
              </div>
              <div style={{ flex: 1, minWidth: 200 }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500, display: 'block', marginBottom: '6px' }}>Avatar Emoji</label>
                <input className="input-glass" placeholder="e.g. 👨‍💻" value={form.avatar} onChange={e => setForm(f => ({ ...f, avatar: e.target.value }))} />
              </div>
            </div>

            {/* Color */}
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <Palette size={14} /> Profile Color
              </label>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {COLORS.map(c => (
                  <div key={c} onClick={() => setForm(f => ({ ...f, color: c }))}
                    style={{ width: 32, height: 32, borderRadius: 12, background: c, cursor: 'pointer',
                      border: form.color === c ? '3px solid white' : '1px solid transparent', 
                      boxShadow: form.color === c ? `0 0 10px ${c}88` : 'none',
                      transition: 'all 0.15s' 
                    }} 
                  />
                ))}
              </div>
            </div>

            <div className="divider" />

            {/* Budget Cycle */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
                <span style={{ fontSize: '1.1rem' }}>📅</span>
                <div>
                  <h3 style={{ fontFamily: 'Poppins', fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)' }}>Budget Cycle</h3>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Personalise your "My Month" start date for the analytics dashboard</p>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>My month starts on day</label>
                <select className="input-glass" style={{ width: 80 }}
                  value={form.budgetStartDay}
                  onChange={e => setForm(f => ({ ...f, budgetStartDay: parseInt(e.target.value) }))}>
                  {Array.from({ length: 28 }, (_, i) => i + 1).map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>of each month</span>
              </div>
              <div style={{ marginTop: '8px', padding: '8px 12px', background: 'rgba(99,102,241,0.07)', borderRadius: 8, border: '1px solid rgba(99,102,241,0.2)', fontSize: '0.75rem', color: '#a5b4fc' }}>
                💡 Useful if your stipend / salary / rent cycle starts mid-month (e.g. 25th)
              </div>
            </div>

            <div className="divider" />

            {/* Smart Preferences */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
                <Info size={16} color="#818cf8" />
                <div>
                  <h3 style={{ fontFamily: 'Poppins', fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)' }}>Food Preferences</h3>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>This helps the Smart Split algorithm suggest accurate consumers</p>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500, display: 'block', marginBottom: '8px' }}>Dietary</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {DIETARY.map(d => (
                      <div key={d.value}
                        className={`chip ${form.dietary.includes(d.value) ? 'selected' : ''}`}
                        onClick={() => {
                          const curr = form.dietary;
                          const next = curr.includes(d.value) ? curr.filter(x => x !== d.value) : [...curr, d.value];
                          setForm(f => ({ ...f, dietary: next }));
                        }}>
                        {d.label}
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500, display: 'block', marginBottom: '6px' }}>Dislikes / Never eats</label>
                    <input className="input-glass" placeholder="e.g. chicken, mushrooms" value={form.dislikes} onChange={e => setForm(f => ({ ...f, dislikes: e.target.value }))} />
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Comma separated list</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500, display: 'block', marginBottom: '6px' }}>Allergies</label>
                    <input className="input-glass" placeholder="e.g. peanuts, dairy" value={form.allergies} onChange={e => setForm(f => ({ ...f, allergies: e.target.value }))} />
                  </div>
                </div>
              </div>
            </div>

            <button className="btn-primary" onClick={handleSubmit} disabled={loading} style={{ alignSelf: 'flex-start', padding: '0.75rem 2rem', marginTop: '1rem' }}>
              {loading ? 'Saving...' : <><Save size={16} /> Save Changes</>}
            </button>
            
          </div>
        </div>
      </div>
    </motion.div>
  );
}
