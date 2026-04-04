import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, User, AtSign, ArrowRight, Zap } from 'lucide-react';
import { useApp } from '../context/AppContext';
import toast from 'react-hot-toast';
import Logo from './Logo';

export default function Auth() {
  const { login, register, isOfflineMode } = useApp();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading]  = useState(false);

  const [form, setForm] = useState({
    name: '', username: '', email: '', password: '',
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isOfflineMode) {
      toast.error('Cannot authenticate in Demo Mode. Start the backend server.');
      return;
    }
    setLoading(true);
    try {
      if (isLogin) {
        await login(form.email, form.password);
        toast.success('Welcome back! 👋');
      } else {
        if (!form.name) return toast.error('Name is required');
        await register(form.name, form.email, form.password, form.username || undefined);
        toast.success('Account created! 🎉');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', position: 'relative' }}>
      <div className="bg-mesh" />

      <motion.div
        className="card-glass"
        style={{ width: '100%', maxWidth: 420, padding: '2.5rem 2rem', position: 'relative', zIndex: 10 }}
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '2rem' }}>
          <Logo size={48} />
          <h1 style={{ fontFamily: 'Poppins', fontWeight: 800, fontSize: '1.75rem', marginTop: '1rem', color: 'var(--text-primary)' }}>
            Room Split
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            {isLogin ? 'Sign in to manage shared expenses' : 'Create your account to start splitting'}
          </p>
        </div>

        {isOfflineMode && (
          <div style={{ padding: '12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 12, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Zap size={16} color="#ef4444" />
            <span style={{ fontSize: '0.8rem', color: '#fca5a5', fontWeight: 500 }}>
              Backend is offline. You cannot log in right now.
            </span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <AnimatePresence mode="popLayout">
            {!isLogin && (
              <motion.div
                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                {/* Full name */}
                <div style={{ position: 'relative' }}>
                  <User size={18} color="var(--text-muted)" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    className="input-glass"
                    placeholder="Full Name *"
                    style={{ paddingLeft: '2.5rem' }}
                    value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  />
                </div>

                {/* Username (optional — auto-generated if blank) */}
                <div style={{ position: 'relative' }}>
                  <AtSign size={18} color="var(--text-muted)" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    className="input-glass"
                    placeholder="Username (optional — auto-generated)"
                    style={{ paddingLeft: '2.5rem' }}
                    value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') }))}
                  />
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '-8px', paddingLeft: '4px' }}>
                  Used to search & invite you. Lowercase letters, numbers, _ only.
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div style={{ position: 'relative' }}>
            <Mail size={18} color="var(--text-muted)" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
            <input
              className="input-glass"
              type="email"
              placeholder="Email address"
              required
              style={{ paddingLeft: '2.5rem' }}
              value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            />
          </div>

          <div style={{ position: 'relative' }}>
            <Lock size={18} color="var(--text-muted)" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
            <input
              className="input-glass"
              type="password"
              placeholder="Password"
              required
              style={{ paddingLeft: '2.5rem' }}
              value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
            />
          </div>

          <button className="btn-primary" type="submit" disabled={loading}
            style={{ width: '100%', justifyContent: 'center', padding: '0.875rem', marginTop: '0.5rem', fontSize: '0.95rem' }}>
            {loading ? 'Please wait...' : isLogin ? 'Sign In' : 'Create Account'}
            {!loading && <ArrowRight size={16} />}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          {isLogin ? "Don't have an account? " : 'Already have an account? '}
          <button
            type="button"
            onClick={() => { setIsLogin(!isLogin); setForm({ name: '', username: '', email: '', password: '' }); }}
            style={{ background: 'none', border: 'none', color: '#818cf8', fontWeight: 600, cursor: 'pointer', outline: 'none' }}>
            {isLogin ? 'Sign up' : 'Sign in'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
