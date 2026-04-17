import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, User, Users, AtSign, ArrowRight, Zap, Calculator, PieChart, ShieldCheck, MessageSquare, Star, SplitSquareHorizontal, CheckCircle2, IndianRupee, Smartphone, Focus } from 'lucide-react';
import { useApp } from '../context/AppContext';
import toast from 'react-hot-toast';
import Logo from './Logo';

export default function Auth() {
  const { login, register, isOfflineMode, startDemo } = useApp();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading]  = useState(false);
  const [form, setForm] = useState({ name: '', username: '', email: '', password: '' });
  
  const authRef = useRef(null);

  const scrollToAuth = () => {
    authRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleTryDemo = () => {
    startDemo();
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
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, padding: '1rem', background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Logo size={32} />
            <span style={{ fontFamily: 'Poppins', fontWeight: 700, fontSize: '1.25rem', color: '#0f172a' }}>Room Split</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <div className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
              <a href="#how-it-works" style={{ textDecoration: 'none', color: 'inherit', transition: 'color 0.2s' }} onMouseOver={e=>e.target.style.color='#0f172a'} onMouseOut={e=>e.target.style.color='inherit'}>How it Works</a>
              <a href="#features" style={{ textDecoration: 'none', color: 'inherit', transition: 'color 0.2s' }} onMouseOver={e=>e.target.style.color='#0f172a'} onMouseOut={e=>e.target.style.color='inherit'}>Features</a>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn-ghost hidden sm:block" onClick={handleTryDemo} style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
                Try Demo
              </button>
              <button className="btn-primary" onClick={scrollToAuth} style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
                Sign In
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 1.5rem', paddingTop: '7rem' }}>
        
        {/* ── Hero Section ────────────────────────────────────────────────────── */}
        <section className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16 min-h-[75vh] pb-12 pt-4">
          {/* Left Text */}
          <motion.div className="w-full lg:flex-1 z-10" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 99, color: '#818cf8', fontSize: '0.75rem', fontWeight: 700, marginBottom: '1.5rem' }}>
              ✨ Built for Indian Roommates
            </div>
            
            <h1 style={{ fontFamily: 'Poppins', fontWeight: 800, fontSize: 'clamp(2.5rem, 6.5vw, 4.8rem)', lineHeight: 1.1, color: 'var(--text-primary)', marginBottom: '1.5rem', letterSpacing: '-0.02em' }}>
              No more awkward calculations. 
              <br /><span style={{ color: '#6366f1' }}>Split fairly in seconds.</span>
            </h1>
            
            <p style={{ fontSize: '1.1rem', color: 'var(--text-muted)', marginBottom: '1.5rem', maxWidth: 540, lineHeight: 1.6 }}>
              Stop arguing over rent, groceries, Zomato orders, electricity, and WiFi bills. Create groups, scan bills with AI, split item-wise or unequally, and settle instantly with Razorpay UPI links. No more reminders or Excel sheets.
            </p>

            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 2rem 0', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
              <li style={{ display: 'flex', alignItems: 'center', gap: 8 }}><CheckCircle2 size={16} color="#10b981" /> AI Receipt Scanner</li>
              <li style={{ display: 'flex', alignItems: 'center', gap: 8 }}><CheckCircle2 size={16} color="#10b981" /> Item-wise Splits (Zomato/Swiggy)</li>
              <li style={{ display: 'flex', alignItems: 'center', gap: 8 }}><CheckCircle2 size={16} color="#10b981" /> Instant Razorpay UPI + Two-way Confirmation</li>
            </ul>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem', alignItems: 'flex-start' }}>
              <button className="btn-primary" onClick={scrollToAuth} style={{ padding: '1.1rem 2.2rem', fontSize: '1.05rem', borderRadius: 12, boxShadow: '0 10px 25px rgba(99,102,241,0.3)' }}>
                Try Room Split Free <ArrowRight size={18} style={{ marginLeft: 8 }} />
              </button>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <ShieldCheck size={14} /> No credit card required • Takes 30 seconds
              </div>
            </div>
          </motion.div>

          {/* Right Visual Dashboard Mock */}
          <motion.div className="w-full lg:flex-1 relative flex justify-center" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8, delay: 0.2 }}>
            <div className="card-glass w-full max-w-[500px]" style={{ padding: '1.5rem', position: 'relative', background: 'var(--bg-card)', border: '1px solid var(--border-glass)' }}>
              
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

        {/* ── Trust Bar ────────────────────────────────────── */}
        <section style={{ padding: '2rem 0 4rem 0', borderBottom: '1px solid var(--border-glass)' }}>
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, color: '#fbbf24', fontSize: '0.9rem', fontWeight: 600, marginBottom: '8px' }}>
              {[1,2,3,4,5].map(v => <Star key={v} size={16} fill="currentColor" />)}
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>Trusted by roommates in Ahmedabad, Bangalore, Delhi, Mumbai & more</p>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '2rem', color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 600 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><ShieldCheck size={18} color="#10b981" /> Razorpay Verified</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><CheckCircle2 size={18} color="#6366f1" /> 100% Free for roommates</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Smartphone size={18} color="#f59e0b" /> Secure UPI Payments</div>
          </div>
        </section>

        {/* ── VS Splitwise (Why Choose Us) ────────────────────────────────────── */}
        <section style={{ padding: '4rem 0', display: 'flex', justifyContent: 'center' }}>
          <div style={{ width: '100%', maxWidth: 900, background: '#ffffff', border: '1px solid #e2e8f0', boxShadow: '0 10px 20px -5px rgba(0,0,0,0.03)', borderRadius: 24, padding: '3rem 2rem', textAlign: 'center' }}>
             <h2 style={{ fontFamily: 'Poppins', fontWeight: 700, fontSize: '1.75rem', color: 'var(--text-primary)', marginBottom: '2rem' }}>Why roommates in India choose Room Split</h2>
             <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', textAlign: 'left' }}>
               <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                 <CheckCircle2 color="#818cf8" size={24} style={{ flexShrink: 0 }} />
                 <div>
                   <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Built for India</div>
                   <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 4 }}>Supports ₹ and native Razorpay UPI integration out of the box.</div>
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
                   <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Personal analytics</div>
                   <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 4 }}>Track your spending with visual charts & heatmaps.</div>
                 </div>
               </div>
               <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                 <CheckCircle2 color="#818cf8" size={24} style={{ flexShrink: 0 }} />
                 <div>
                   <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Two-way verification</div>
                   <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 4 }}>Mutual confirmation for payments ensures complete trust.</div>
                 </div>
               </div>
             </div>
          </div>
        </section>

        {/* ── Features Section ────────────────────────────────────────────────── */}
        <section id="features" style={{ padding: '5rem 0' }}>
          <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
            <h2 style={{ fontFamily: 'Poppins', fontWeight: 700, fontSize: '2.25rem', color: 'var(--text-primary)' }}>Everything you need for fair roommate living</h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
            {[
              { title: 'AI Receipt Scanner', desc: 'Scan any grocery or restaurant bill. Our AI auto-detects items, prices, and quantities instantly.', icon: Focus, color: '#ec4899' },
              { title: 'Item-wise & Unequal Splits', desc: 'Split perfectly. Assign exactly who ate what, use custom percentages, or split unequally with ease.', icon: SplitSquareHorizontal, color: '#10b981' },
              { title: 'Smart Minimum Settlements', desc: 'Our algorithm automatically restructures group debts to reduce the total number of transactions needed.', icon: Calculator, color: '#f59e0b' },
              { title: 'Two-way Payment Confirmation', desc: 'Mark debts as paid and have the recipient confirm them to prevent disputes and keep histories accurate.', icon: ShieldCheck, color: '#6366f1' },
              { title: 'Personal My Budget', desc: 'A private space to view spending charts, heatmaps, top categories, and monthly projections.', icon: PieChart, color: '#8b5cf6' },
              { title: 'Group Dashboard & History', desc: 'A unified ledger where everyone can seamlessly track expense history, balances, and group members.', icon: Users, color: '#3b82f6' },
            ].map((feature, i) => (
              <div key={i} className="card-glass" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem', background: '#ffffff', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
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
        <section id="how-it-works" style={{ padding: '3rem 0' }}>
          <div style={{ background: '#F8FAFC', borderRadius: 24, padding: '4rem 0' }}>
            <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
              <h2 style={{ fontFamily: 'Poppins', fontWeight: 700, fontSize: '2.25rem', color: 'var(--text-primary)' }}>How Room Split Works</h2>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '3rem', position: 'relative', padding: '0 2rem' }}>
              {[
                { step: '1', title: 'Create a Group', desc: 'Sign up with email, create a group for your flat, PG, trip or event. Invite members via link. Switch groups easily with dropdown.' },
                { step: '2', title: 'Add Expenses', desc: 'Scan receipt with AI (auto-detects items) or add manually. Add title, category, paid by, note, then split item-wise, by percentage, or unequally.' },
                { step: '3', title: 'Settle Up Securely', desc: 'See clear balances. Mark as paid → other person confirms receipt → transaction marked settled. Instant Razorpay UPI links.' },
              ].map((step, i) => (
                <div key={i} style={{ textAlign: 'center', position: 'relative', zIndex: 2 }}>
                  <div style={{ width: 72, height: 72, background: '#7C3AED', color: '#fff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.75rem', fontWeight: 800, margin: '0 auto 1.5rem', boxShadow: '0 0 0 8px rgba(124,58,237,0.1)' }}>
                    {step.step}
                  </div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.75rem' }}>{step.title}</h3>
                  <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Visuals Section ────────────────────────────────────────────────── */}
        <section style={{ padding: '4rem 0' }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h2 style={{ fontFamily: 'Poppins', fontWeight: 700, fontSize: '2.25rem', color: 'var(--text-primary)' }}>See Room Split in Action</h2>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '2rem' }}>
            
            {/* Mock Screen 1 */}
            <div style={{ flex: '1 1 260px', maxWidth: 300, background: '#ffffff', borderRadius: 24, border: '6px solid #f1f5f9', boxShadow: '0 20px 40px -10px rgba(0,0,0,0.1)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '16px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', fontWeight: 700, fontSize: '0.9rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Focus size={16} color="#6366f1" /> AI Scan
              </div>
              <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ height: 120, background: '#e0e7ff', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4f46e5', fontSize: '0.8rem', fontWeight: 600 }}>Scanning Swiggy Bill...</div>
                <div style={{ height: 16, background: '#f1f5f9', borderRadius: 6, width: '80%' }} />
                <div style={{ height: 16, background: '#f1f5f9', borderRadius: 6, width: '60%' }} />
                <div style={{ height: 16, background: '#f1f5f9', borderRadius: 6, width: '40%' }} />
              </div>
            </div>

            {/* Mock Screen 2 */}
            <div style={{ flex: '1 1 260px', maxWidth: 300, background: '#ffffff', borderRadius: 24, border: '6px solid #f1f5f9', boxShadow: '0 20px 40px -10px rgba(0,0,0,0.1)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '16px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', fontWeight: 700, fontSize: '0.9rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Zap size={16} color="#10b981" /> Settle Up
              </div>
              <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Total Balance</div>
                <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#f87171' }}>- ₹1,250</div>
                <div style={{ width: '100%', padding: '12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#0f172a' }}>Rahul</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#f87171' }}>₹850</div>
                </div>
                <div style={{ width: '100%', padding: '10px', background: '#6366f1', color: '#fff', textAlign: 'center', borderRadius: 10, fontSize: '0.85rem', fontWeight: 600, marginTop: 8 }}>Pay via Razorpay</div>
              </div>
            </div>

            {/* Mock Screen 3 */}
            <div style={{ flex: '1 1 260px', maxWidth: 300, background: '#ffffff', borderRadius: 24, border: '6px solid #f1f5f9', boxShadow: '0 20px 40px -10px rgba(0,0,0,0.1)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '16px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', fontWeight: 700, fontSize: '0.9rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
                <PieChart size={16} color="#f59e0b" /> My Budget
              </div>
              <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center', flex: 1, justifyContent: 'center' }}>
                <div style={{ width: 100, height: 100, borderRadius: '50%', border: '16px solid #e2e8f0', borderTopColor: '#f59e0b', borderRightColor: '#6366f1', borderBottomColor: '#10b981' }} />
                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 600 }}><span style={{ color: '#f59e0b' }}>Grocery</span><span style={{ color: '#0f172a'}}>₹4,200</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 600 }}><span style={{ color: '#6366f1' }}>Rent</span><span style={{ color: '#0f172a'}}>₹12,000</span></div>
                </div>
              </div>
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
              { quote: "AI scan + item-wise split for Swiggy is a game changer.", author: "Arjun, Bangalore" },
              { quote: "Two-way confirmation removed all payment fights.", author: "Rahul, Delhi" }
            ].map((t, i) => (
              <div key={i} className="card-glass" style={{ padding: '2rem', position: 'relative', background: '#ffffff', border: '1px solid #e2e8f0' }}>
                <MessageSquare size={32} color="rgba(99,102,241,0.1)" style={{ position: 'absolute', top: 20, right: 20 }} />
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
            style={{ width: '100%', maxWidth: 460, padding: '3rem 2.5rem', position: 'relative', zIndex: 10, background: '#ffffff', border: '1px solid #e2e8f0', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.1)' }}
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-100px" }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '2.5rem' }}>
              <Logo size={48} />
              <h2 style={{ fontFamily: 'Poppins', fontWeight: 800, fontSize: '1.6rem', marginTop: '1.25rem', color: '#0f172a', textAlign: 'center' }}>
                Ready to stop arguing over money?
              </h2>
              <p style={{ color: '#64748b', fontSize: '0.9rem', textAlign: 'center', marginTop: '0.5rem' }}>
                Join thousands of roommates splitting expenses fairly.
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
                      <input className="input-glass" placeholder="Full Name *" style={{ paddingLeft: '2.5rem', background: '#ffffff', color: '#0f172a', border: '1px solid #cbd5e1' }} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                    </div>

                    <div style={{ position: 'relative' }}>
                      <AtSign size={18} color="#94a3b8" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
                      <input className="input-glass" placeholder="Username (optional)" style={{ paddingLeft: '2.5rem', background: '#ffffff', color: '#0f172a', border: '1px solid #cbd5e1' }} value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') }))} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div style={{ position: 'relative' }}>
                <Mail size={18} color="#94a3b8" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
                <input className="input-glass" type="email" placeholder="Email address" required style={{ paddingLeft: '2.5rem', background: '#ffffff', color: '#0f172a', border: '1px solid #cbd5e1' }} value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              </div>

              <div style={{ position: 'relative' }}>
                <Lock size={18} color="#94a3b8" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
                <input className="input-glass" type="password" placeholder="Password" required style={{ paddingLeft: '2.5rem', background: '#ffffff', color: '#0f172a', border: '1px solid #cbd5e1' }} value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
              </div>

              <button className="btn-primary" type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center', padding: '0.875rem', marginTop: '0.5rem', fontSize: '0.95rem' }}>
                {loading ? 'Please wait...' : isLogin ? 'Sign In' : 'Create Free Account'}
                {!loading && <ArrowRight size={16} />}
              </button>
            </form>

            <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.85rem', color: '#475569' }}>
              {isLogin ? "Don't have an account? " : 'Already have an account? '}
              <button type="button" onClick={() => { setIsLogin(!isLogin); setForm({ name: '', username: '', email: '', password: '' }); }} style={{ background: 'none', border: 'none', color: '#6366f1', fontWeight: 600, cursor: 'pointer', outline: 'none' }}>
                {isLogin ? 'Sign up' : 'Sign in'}
              </button>
            </div>
          </motion.div>
        </section>

      </div>

      {/* ── Footer ── */}
      <footer style={{ borderTop: '1px solid rgba(0,0,0,0.05)', padding: '2rem 0', background: '#F8FAFC' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 1.5rem', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Logo size={24} />
            <span style={{ fontFamily: 'Poppins', fontWeight: 700, color: '#0f172a' }}>Room Split</span>
          </div>
          <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.85rem', color: '#475569' }}>
            <a href="#features" style={{ textDecoration: 'none', color: 'inherit', transition: 'color 0.2s' }} onMouseOver={e=>e.target.style.color='#0f172a'} onMouseOut={e=>e.target.style.color='inherit'}>Features</a>
            <span style={{ cursor: 'pointer', color: '#475569', transition: 'color 0.2s' }} onMouseOver={e=>e.target.style.color='#0f172a'} onMouseOut={e=>e.target.style.color='inherit'}>Privacy</span>
            <span style={{ cursor: 'pointer', color: '#475569', transition: 'color 0.2s' }} onMouseOver={e=>e.target.style.color='#0f172a'} onMouseOut={e=>e.target.style.color='inherit'}>Terms</span>
            <span style={{ cursor: 'pointer', color: '#475569', transition: 'color 0.2s' }} onMouseOver={e=>e.target.style.color='#0f172a'} onMouseOut={e=>e.target.style.color='inherit'}>Contact</span>
          </div>
          <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
            Made with ❤️ in India
          </div>
        </div>
      </footer>

    </div>
  );
}
