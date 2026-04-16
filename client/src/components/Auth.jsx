import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, User, AtSign, ArrowRight, Zap, Calculator, PieChart, ShieldCheck, MessageSquare, Star, SplitSquareHorizontal, CheckCircle2, CheckSquare } from 'lucide-react';
import { useApp } from '../context/AppContext';
import toast from 'react-hot-toast';
import Logo from './Logo';

export default function Auth() {
  const { login, register, isOfflineMode } = useApp();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading]  = useState(false);
  const [form, setForm] = useState({ name: '', username: '', email: '', password: '' });
  
  const authRef = useRef(null);

  const scrollToAuth = () => {
    authRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

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
    <div style={{ minHeight: '100vh', position: 'relative', overflowX: 'hidden' }}>
      <div className="bg-mesh" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: -1 }} />

      {/* ── Navbar ──────────────────────────────────────────────────────────── */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, padding: '1rem', background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(12px)', borderBottom: '1px solid var(--border-glass)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Logo size={32} />
            <span style={{ fontFamily: 'Poppins', fontWeight: 700, fontSize: '1.25rem', color: 'var(--text-primary)' }}>Room Split</span>
          </div>
          <button className="btn-primary" onClick={scrollToAuth} style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
            Get Started
          </button>
        </div>
      </nav>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 1.5rem', paddingTop: '6rem' }}>
        
        {/* ── Hero Section ────────────────────────────────────────────────────── */}
        <section style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '3rem', minHeight: '75vh', paddingBottom: '4rem' }}>
          {/* Left Text */}
          <motion.div style={{ flex: '1 1 500px', zIndex: 10 }} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div style={{ display: 'inline-block', padding: '6px 12px', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 99, color: '#818cf8', fontSize: '0.75rem', fontWeight: 700, marginBottom: '1.5rem' }}>
              ✨ The smartest way to split expenses
            </div>
            <h1 style={{ fontFamily: 'Poppins', fontWeight: 800, fontSize: 'clamp(2.5rem, 5vw, 4rem)', lineHeight: 1.1, color: 'var(--text-primary)', marginBottom: '1.5rem' }}>
              Stop arguing over<br /><span style={{ color: '#818cf8' }}>who owes what.</span>
            </h1>
            <p style={{ fontSize: '1.1rem', color: 'var(--text-muted)', marginBottom: '2rem', maxWidth: 500, lineHeight: 1.6 }}>
              Split rent, groceries, and bills fairly in seconds. Let our algorithm track balances, compute minimum settlements, and generate instant UPI payment links.
            </p>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <button className="btn-primary" onClick={scrollToAuth} style={{ padding: '1rem 2rem', fontSize: '1rem', borderRadius: 12 }}>
                Try Room Split Free <ArrowRight size={18} style={{ marginLeft: 8 }} />
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600 }}>
                <CheckCircle2 color="#10b981" size={18} /> No credit card required
              </div>
            </div>
          </motion.div>

          {/* Right Visual Dashboard Mock */}
          <motion.div style={{ flex: '1 1 400px', position: 'relative', display: 'flex', justifyContent: 'center' }} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8, delay: 0.2 }}>
            <div className="card-glass" style={{ width: '100%', maxWidth: 450, padding: '1.5rem', position: 'relative', background: 'rgba(30,41,59,0.7)' }}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Members Balance</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>₹4,250 <span style={{fontSize:'0.8rem', color:'#34d399'}}>+12%</span></div>
                </div>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', border: '2px solid rgba(255,255,255,0.2)' }} />
              </div>

              {/* Mock Settlement Item */}
              <div style={{ background: 'rgba(15,23,42,0.6)', padding: '12px', borderRadius: 12, marginBottom: '12px', border: '1px solid var(--border-glass)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(239,68,68,0.2)', color: '#f87171', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><User size={18} /></div>
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>Suri owes You</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>For Groceries & Wi-Fi</div>
                    </div>
                  </div>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: '#f87171' }}>₹850</div>
                </div>
              </div>

              {/* Mock Expense Item */}
              <div style={{ background: 'rgba(15,23,42,0.6)', padding: '12px', borderRadius: 12, border: '1px solid var(--border-glass)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(52,211,153,0.2)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Zap size={18} /></div>
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>Electricity Bill</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Paid by You · Split 3 ways</div>
                    </div>
                  </div>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>₹2,400</div>
                </div>
              </div>

              {/* Mock Floating Widget */}
              <motion.div animate={{ y: [0, -10, 0] }} transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }} style={{ position: 'absolute', right: -20, bottom: -20, background: '#6366f1', padding: '12px 16px', borderRadius: 16, boxShadow: '0 10px 25px rgba(99,102,241,0.4)', display: 'flex', gap: 10, alignItems: 'center' }}>
                 <ShieldCheck color="#fff" size={20} />
                 <span style={{ color: '#fff', fontSize: '0.85rem', fontWeight: 600 }}>Razorpay Verified</span>
              </motion.div>

            </div>
          </motion.div>
        </section>

        {/* ── Features Section ────────────────────────────────────────────────── */}
        <section style={{ padding: '5rem 0', borderTop: '1px solid var(--border-glass)' }}>
          <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
            <h2 style={{ fontFamily: 'Poppins', fontWeight: 700, fontSize: '2.25rem', color: 'var(--text-primary)' }}>Everything you need to manage shared living</h2>
            <p style={{ color: 'var(--text-muted)', maxWidth: 600, margin: '1rem auto' }}>No more complex spreadsheets or awkward money conversations. We handle the math so you can focus on being good roommates.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem' }}>
            {[
              { title: 'Smart Settlements', desc: 'Our algorithm reduces the total number of transactions needed to settle debts across your entire group.', icon: Calculator, color: '#f59e0b' },
              { title: 'Any Split Type', desc: 'Split equally, by exact amounts, or by custom percentages. Perfect for couples or entirely unmatched roommates.', icon: SplitSquareHorizontal, color: '#10b981' },
              { title: 'Personal Analytics', desc: 'Track your own personal budget cycles. See where your money goes every month with beautiful visualizations.', icon: PieChart, color: '#ec4899' },
              { title: '1-Click UPI Payments', desc: 'Settle debts instantly via Razorpay payment links. Payments are automatically verified and synced.', icon: Zap, color: '#3b82f6' },
            ].map((feature, i) => (
              <div key={i} className="card-glass" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ width: 50, height: 50, borderRadius: 14, background: `${feature.color}22`, color: feature.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <feature.icon size={24} />
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>{feature.title}</h3>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>{feature.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── How It Works ────────────────────────────────────────────────────── */}
        <section style={{ padding: '5rem 0' }}>
          <div style={{ background: 'rgba(30,41,59,0.4)', borderRadius: 24, padding: '4rem 2rem', border: '1px solid var(--border-glass)' }}>
            <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
              <h2 style={{ fontFamily: 'Poppins', fontWeight: 700, fontSize: '2rem', color: 'var(--text-primary)' }}>How it works</h2>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '2rem', position: 'relative' }}>
              {[
                { step: '1', title: 'Create a Group', desc: 'Sign up and create a group for your apartment, trip, or event. Invite members via links.' },
                { step: '2', title: 'Add Expenses', desc: 'Log expenses on the go. Choose exactly who paid and who needs to be included in the split.' },
                { step: '3', title: 'Settle Up', desc: 'When you are ready, the app shows who owes who. Pay securely via generated Razorpay links.' },
              ].map((step, i) => (
                <div key={i} style={{ textAlign: 'center', position: 'relative', zIndex: 2 }}>
                  <div style={{ width: 64, height: 64, background: '#6366f1', color: '#fff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 800, margin: '0 auto 1.5rem', boxShadow: '0 0 0 10px rgba(99,102,241,0.1)' }}>
                    {step.step}
                  </div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>{step.title}</h3>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Testimonials ────────────────────────────────────────────────────── */}
        <section style={{ padding: '4rem 0 6rem 0' }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h2 style={{ fontFamily: 'Poppins', fontWeight: 700, fontSize: '2rem', color: 'var(--text-primary)' }}>Loved by roommates</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
            {[
              { quote: "Finally, no more Excel sheets! It calculates exactly who needs to pay who, so we only transfer money once at the end of the month.", author: "Rohan, Bangalore" },
              { quote: "The Razorpay integration is a lifesaver. I just click 'Settle Up', it opens UPI, and the app automatically marks the debt as paid.", author: "Priya, Mumbai" },
              { quote: "Being able to do unequal splits for groceries when someone is vegan and someone isn't changed our lives.", author: "Arjun, Delhi" }
            ].map((t, i) => (
              <div key={i} className="card-glass" style={{ padding: '2rem', position: 'relative' }}>
                <MessageSquare size={32} color="rgba(99,102,241,0.2)" style={{ position: 'absolute', top: 20, right: 20 }} />
                <div style={{ display: 'flex', gap: 4, marginBottom: '1rem', color: '#fbbf24' }}>
                  {[1,2,3,4,5].map(v => <Star key={v} size={16} fill="currentColor" />)}
                </div>
                <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: 1.6, fontStyle: 'italic', marginBottom: '1.5rem' }}>"{t.quote}"</p>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>— {t.author}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── CTA / Auth Form ────────────────────────────────────────────────── */}
        <section id="auth-section" ref={authRef} style={{ padding: '4rem 0 8rem 0', display: 'flex', justifyContent: 'center' }}>
          <motion.div
            className="card-glass"
            style={{ width: '100%', maxWidth: 450, padding: '2.5rem 2rem', position: 'relative', zIndex: 10, background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(99,102,241,0.3)', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-100px" }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '2rem' }}>
              <Logo size={42} />
              <h2 style={{ fontFamily: 'Poppins', fontWeight: 800, fontSize: '1.5rem', marginTop: '1rem', color: 'var(--text-primary)' }}>
                Ready to split?
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', marginTop: '0.5rem' }}>
                {isLogin ? 'Sign in to access your shared expenses.' : 'Create a free account and start tracking today.'}
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
                    
                    <div style={{ position: 'relative' }}>
                      <User size={18} color="var(--text-muted)" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
                      <input className="input-glass" placeholder="Full Name *" style={{ paddingLeft: '2.5rem' }} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                    </div>

                    <div style={{ position: 'relative' }}>
                      <AtSign size={18} color="var(--text-muted)" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
                      <input className="input-glass" placeholder="Username (optional)" style={{ paddingLeft: '2.5rem' }} value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') }))} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div style={{ position: 'relative' }}>
                <Mail size={18} color="var(--text-muted)" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
                <input className="input-glass" type="email" placeholder="Email address" required style={{ paddingLeft: '2.5rem' }} value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              </div>

              <div style={{ position: 'relative' }}>
                <Lock size={18} color="var(--text-muted)" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
                <input className="input-glass" type="password" placeholder="Password" required style={{ paddingLeft: '2.5rem' }} value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
              </div>

              <button className="btn-primary" type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center', padding: '0.875rem', marginTop: '0.5rem', fontSize: '0.95rem' }}>
                {loading ? 'Please wait...' : isLogin ? 'Sign In' : 'Create Free Account'}
                {!loading && <ArrowRight size={16} />}
              </button>
            </form>

            <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              {isLogin ? "Don't have an account? " : 'Already have an account? '}
              <button type="button" onClick={() => { setIsLogin(!isLogin); setForm({ name: '', username: '', email: '', password: '' }); }} style={{ background: 'none', border: 'none', color: '#818cf8', fontWeight: 600, cursor: 'pointer', outline: 'none' }}>
                {isLogin ? 'Sign up' : 'Sign in'}
              </button>
            </div>
          </motion.div>
        </section>

      </div>
    </div>
  );
}
