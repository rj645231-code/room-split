import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, User, AtSign, ArrowRight, Zap, Calculator, PieChart, ShieldCheck, MessageSquare, Star, SplitSquareHorizontal, CheckCircle2, IndianRupee, Smartphone, Focus } from 'lucide-react';
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

  const handleTryDemo = () => {
    // A quick fake action or just scroll to login if demo isn't natively supported yet
    toast('Demo mode unlocking soon! Create a free account to test.', { icon: '🍿' });
    scrollToAuth();
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

      {/* ── Navbar ── */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, padding: '1rem', background: '#1E2937', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Logo size={32} />
            <span style={{ fontFamily: 'Poppins', fontWeight: 700, fontSize: '1.25rem', color: '#ffffff' }}>Room Split</span>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button className="btn-ghost" onClick={handleTryDemo} style={{ display: window.innerWidth > 600 ? 'block' : 'none', padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
              Try Demo
            </button>
            <button className="btn-primary" onClick={scrollToAuth} style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
              Sign In
            </button>
          </div>
        </div>
      </nav>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 1.5rem', paddingTop: '7rem' }}>
        
        {/* ── Hero Section ────────────────────────────────────────────────────── */}
        <section style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '4rem', minHeight: '75vh', paddingBottom: '5rem' }}>
          {/* Left Text */}
          <motion.div style={{ flex: '1 1 500px', zIndex: 10 }} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 99, color: '#818cf8', fontSize: '0.75rem', fontWeight: 700, marginBottom: '1.5rem' }}>
              🇮🇳 Built for Indian Roommates
            </div>
            
            <h1 style={{ fontFamily: 'Poppins', fontWeight: 800, fontSize: 'clamp(2.5rem, 5vw, 4.2rem)', lineHeight: 1.1, color: 'var(--text-primary)', marginBottom: '1.5rem', letterSpacing: '-0.02em' }}>
              No more awkward calculations. 
              <br /><span style={{ color: '#818cf8' }}>Split fairly in seconds.</span>
            </h1>
            
            <p style={{ fontSize: '1.1rem', color: 'var(--text-muted)', marginBottom: '2rem', maxWidth: 520, lineHeight: 1.6 }}>
              Roommates in India love this: Smart splits, instant Razorpay UPI links, and automated math so you never have to remind anyone for money again.
            </p>
            
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
              <button className="btn-primary" onClick={scrollToAuth} style={{ padding: '1.1rem 2.2rem', fontSize: '1.05rem', borderRadius: 12, boxShadow: '0 10px 25px rgba(99,102,241,0.3)' }}>
                Try Room Split Free <ArrowRight size={18} style={{ marginLeft: 8 }} />
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#fbbf24', fontSize: '0.85rem', fontWeight: 600 }}>
              {[1,2,3,4,5].map(v => <Star key={v} size={14} fill="currentColor" />)}
              <span style={{ color: 'var(--text-secondary)', marginLeft: 6 }}>Trusted by roommates in Ahmedabad, Bangalore, Delhi & more.</span>
            </div>
          </motion.div>

          {/* Right Visual Dashboard Mock */}
          <motion.div style={{ flex: '1 1 450px', position: 'relative', display: 'flex', justifyContent: 'center' }} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8, delay: 0.2 }}>
            <div className="card-glass" style={{ width: '100%', maxWidth: 500, padding: '1.5rem', position: 'relative', background: 'var(--bg-card)', border: '1px solid var(--border-glass)' }}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Members Balance</div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)' }}>₹4,250 <span style={{fontSize:'0.85rem', color:'#34d399'}}>+12%</span></div>
                </div>
                <div style={{ width: 45, height: 45, borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', border: '2px solid rgba(255,255,255,0.2)' }} />
              </div>

              {/* Mock Settlement Item */}
              <div style={{ background: 'var(--bg-glass)', padding: '14px', borderRadius: 14, marginBottom: '12px', border: '1px solid var(--border-glass)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                    <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(239,68,68,0.2)', color: '#f87171', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><User size={20} /></div>
                    <div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>Suri owes You</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>For Groceries & Wi-Fi</div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f87171' }}>₹850</div>
                    <div style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: 600, marginTop: 4 }}>Pay via UPI →</div>
                  </div>
                </div>
              </div>

              {/* Mock Expense Item 1 */}
              <div style={{ background: 'var(--bg-glass)', padding: '12px', borderRadius: 12, marginBottom: '10px', border: '1px solid var(--border-glass)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(52,211,153,0.2)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Zap size={16} /></div>
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>Electricity Bill</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Paid by You · Split 3 ways</div>
                    </div>
                  </div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)' }}>₹2,400</div>
                </div>
              </div>

              {/* Mock Expense Item 2 */}
              <div style={{ background: 'var(--bg-glass)', padding: '12px', borderRadius: 12, border: '1px solid var(--border-glass)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(245,158,11,0.2)', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><SplitSquareHorizontal size={16} /></div>
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>Zomato Order</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Item-wise split (3 items)</div>
                    </div>
                  </div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)' }}>₹450</div>
                </div>
              </div>

              {/* Mock Floating Widget */}
              <motion.div animate={{ y: [0, -8, 0] }} transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }} style={{ position: 'absolute', right: -25, bottom: -20, background: '#10b981', padding: '12px 18px', borderRadius: 16, boxShadow: '0 10px 25px rgba(16,185,129,0.3)', display: 'flex', gap: 8, alignItems: 'center', zIndex: 20 }}>
                 <ShieldCheck color="#fff" size={20} />
                 <span style={{ color: '#fff', fontSize: '0.85rem', fontWeight: 700 }}>Razorpay Verified</span>
              </motion.div>
            </div>
          </motion.div>
        </section>

        {/* ── VS Splitwise (Why Choose Us) ────────────────────────────────────── */}
        <section style={{ padding: '3rem 0', display: 'flex', justifyContent: 'center' }}>
          <div style={{ width: '100%', maxWidth: 900, background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 24, padding: '3rem 2rem', textAlign: 'center' }}>
             <h2 style={{ fontFamily: 'Poppins', fontWeight: 700, fontSize: '1.75rem', color: 'var(--text-primary)', marginBottom: '2rem' }}>Why choose Room Split?</h2>
             <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', textAlign: 'left' }}>
               <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                 <CheckCircle2 color="#818cf8" size={24} style={{ flexShrink: 0 }} />
                 <div>
                   <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Instant UPI Payments</div>
                   <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 4 }}>Generate Razorpay links. No copying UPI IDs manually.</div>
                 </div>
               </div>
               <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                 <CheckCircle2 color="#818cf8" size={24} style={{ flexShrink: 0 }} />
                 <div>
                   <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Item-wise Splits</div>
                   <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 4 }}>Perfect for Zomato/Swiggy. Pay exactly for what you ate.</div>
                 </div>
               </div>
               <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                 <CheckCircle2 color="#818cf8" size={24} style={{ flexShrink: 0 }} />
                 <div>
                   <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Completely Free</div>
                   <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 4 }}>No annoying ads, no premium limits. Built for real roommates.</div>
                 </div>
               </div>
               <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                 <CheckCircle2 color="#818cf8" size={24} style={{ flexShrink: 0 }} />
                 <div>
                   <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Simpler & Cleaner</div>
                   <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 4 }}>A beautiful, modern interface that works flawlessly on mobile.</div>
                 </div>
               </div>
             </div>
          </div>
        </section>

        {/* ── Features Section ────────────────────────────────────────────────── */}
        <section style={{ padding: '5rem 0' }}>
          <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
            <h2 style={{ fontFamily: 'Poppins', fontWeight: 700, fontSize: '2.25rem', color: 'var(--text-primary)' }}>Everything you need to manage shared living</h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem' }}>
            {[
              { title: 'Smart Settlements', desc: 'Our algorithm reduces the total number of transactions needed to settle debts across your entire group.', icon: Calculator, color: '#f59e0b' },
              { title: 'Any Split Type', desc: 'Split equally, by exact amounts, or by custom percentages. Perfect for couples or unmatched roommates.', icon: SplitSquareHorizontal, color: '#10b981' },
              { title: 'Personal Analytics', desc: 'Track your own personal budget cycles. See where your money goes every month with visual charts.', icon: PieChart, color: '#ec4899' },
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

        {/* ── How It Works ── */}
        <section style={{ padding: '3rem 0' }}>
          <div style={{ background: '#F8FAFC', borderRadius: 24, padding: '4rem 2rem', border: '1px solid var(--border-glass)' }}>
            <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
              <h2 style={{ fontFamily: 'Poppins', fontWeight: 700, fontSize: '2rem', color: 'var(--text-primary)' }}>How it works</h2>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '2rem', position: 'relative' }}>
              {[
                { step: '1', title: 'Create a Group', desc: 'Sign up and create a group for your apartment, trip, or event. Invite members via link.' },
                { step: '2', title: 'Add Expenses', desc: 'Add bills manually or via photo. Split unequally, by percentage, or item-wise.' },
                { step: '3', title: 'Settle Up Securely', desc: 'When you are ready, check balances and settle up instantly via Razorpay UPI links.' },
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
        <section style={{ padding: '6rem 0 4rem 0' }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h2 style={{ fontFamily: 'Poppins', fontWeight: 700, fontSize: '2rem', color: 'var(--text-primary)' }}>Loved by Indian roommates</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
            {[
              { quote: "Finally no more Excel sheets for our PG rent! It calculates exactly who needs to pay who.", author: "Priya, Ahmedabad" },
              { quote: "UPI links made settling super easy. I just click 'Settle Up', and the app automatically marks the debt as paid.", author: "Rahul, Bangalore" },
              { quote: "Being able to do unequal item-wise splits for Swiggy when someone is vegan changed our lives.", author: "Arjun, Delhi" }
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

        {/* ── CTA / Auth Form ── */}
        <section id="auth-section" ref={authRef} style={{ padding: '4rem 0 6rem 0', display: 'flex', justifyContent: 'center' }}>
          <motion.div
            className="card-glass"
            style={{ width: '100%', maxWidth: 450, padding: '2.5rem 2rem', position: 'relative', zIndex: 10, background: '#1E2937', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.3)' }}
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-100px" }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '2rem' }}>
              <Logo size={42} />
              <h2 style={{ fontFamily: 'Poppins', fontWeight: 800, fontSize: '1.5rem', marginTop: '1rem', color: '#ffffff' }}>
                Ready to split?
              </h2>
              <p style={{ color: '#94a3b8', fontSize: '0.85rem', textAlign: 'center', marginTop: '0.5rem' }}>
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
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    
                    <div style={{ position: 'relative' }}>
                      <User size={18} color="#94a3b8" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
                      <input className="input-glass" placeholder="Full Name *" style={{ paddingLeft: '2.5rem', background: 'rgba(255,255,255,0.05)', color: '#ffffff', border: '1px solid rgba(255,255,255,0.1)' }} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                    </div>

                    <div style={{ position: 'relative' }}>
                      <AtSign size={18} color="#94a3b8" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
                      <input className="input-glass" placeholder="Username (optional)" style={{ paddingLeft: '2.5rem', background: 'rgba(255,255,255,0.05)', color: '#ffffff', border: '1px solid rgba(255,255,255,0.1)' }} value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') }))} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div style={{ position: 'relative' }}>
                <Mail size={18} color="#94a3b8" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
                <input className="input-glass" type="email" placeholder="Email address" required style={{ paddingLeft: '2.5rem', background: 'rgba(255,255,255,0.05)', color: '#ffffff', border: '1px solid rgba(255,255,255,0.1)' }} value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              </div>

              <div style={{ position: 'relative' }}>
                <Lock size={18} color="#94a3b8" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
                <input className="input-glass" type="password" placeholder="Password" required style={{ paddingLeft: '2.5rem', background: 'rgba(255,255,255,0.05)', color: '#ffffff', border: '1px solid rgba(255,255,255,0.1)' }} value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
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

      {/* ── Footer ── */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.1)', padding: '2rem 0', background: '#1E2937' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 1.5rem', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Logo size={24} />
            <span style={{ fontFamily: 'Poppins', fontWeight: 700, color: '#ffffff' }}>Room Split</span>
          </div>
          <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.85rem', color: '#94a3b8' }}>
            <span style={{ cursor: 'pointer', color: '#e2e8f0' }}>Features</span>
            <span style={{ cursor: 'pointer', color: '#e2e8f0' }}>Privacy</span>
            <span style={{ cursor: 'pointer', color: '#e2e8f0' }}>Contact</span>
          </div>
          <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
            Made with ❤️ in India
          </div>
        </div>
      </footer>

    </div>
  );
}
