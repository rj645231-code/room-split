import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, ArrowRight, Sparkles, RefreshCw, Info, Clock, XCircle, AlertCircle, Zap, Smartphone } from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  getSuggestedSettlements, createSettlement, getSettlements,
  confirmSettlement, cancelSettlement, createPaymentLink, verifyPaymentLink
} from '../services/api';
import { MOCK_DATA } from '../services/mockData';
import TopBar from '../components/TopBar';
import toast from 'react-hot-toast';

const STATUS_CONFIG = {
  pending_confirmation: { label: '⏳ Awaiting Confirmation', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.25)' },
  pending_payment:      { label: '🔗 Razorpay Link Active',  color: '#818cf8', bg: 'rgba(99,102,241,0.1)', border: 'rgba(99,102,241,0.25)' },
  completed:            { label: '✅ Settled',              color: '#34d399', bg: 'rgba(16,185,129,0.08)',  border: 'rgba(16,185,129,0.2)' },
  cancelled:            { label: '❌ Cancelled',            color: '#f87171', bg: 'rgba(239,68,68,0.07)',   border: 'rgba(239,68,68,0.2)' },
};

export default function Settlement() {
  const { activeGroup, currentUser, isOfflineMode } = useApp();
  const [suggested, setSuggested] = useState([]);
  const [balances, setBalances]   = useState([]);
  const [history, setHistory]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [tab, setTab]             = useState('suggested');
  const [actioning, setActioning] = useState(null);

  // Settlements where the current user is the receiver and confirmation is needed
  const awaitingMyConfirmation = history.filter(
    h => h.to === currentUser?._id && h.status === 'pending_confirmation'
  );

  const fetchData = async () => {
    setLoading(true);
    try {
      if (isOfflineMode) {
        setSuggested(MOCK_DATA.settlements);
        setBalances(MOCK_DATA.balances);
        setHistory([]);
      } else {
        if (!activeGroup?._id) return;
        const [sugRes, histRes] = await Promise.all([
          getSuggestedSettlements(activeGroup._id),
          getSettlements(activeGroup._id),
        ]);
        setSuggested(sugRes.data.data?.settlements || []);
        setBalances(sugRes.data.data?.balances || []);
        setHistory(histRes.data.data || []);
      }
    } catch {
      setSuggested(MOCK_DATA.settlements);
      setBalances(MOCK_DATA.balances);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [activeGroup?._id, isOfflineMode]);

  // Step 1: Payer marks as paid → pending_confirmation
  const handleMarkPaid = async (s) => {
    if (isOfflineMode) return toast.error('Start the backend to record settlements');
    if (!s.fromUser?._id || !s.toUser?._id) return;
    if (s.fromUser._id !== currentUser?._id) return toast.error('You can only record your own payments');
    setActioning(`pay-${s.from}`);
    try {
      await createSettlement({
        group: activeGroup._id,
        from: s.fromUser._id, to: s.toUser._id,
        amount: s.amount, note: 'Marked as paid via Room Split',
      });
      toast.success('💸 Payment marked! Waiting for receiver to confirm.');
      setTab('history');
      fetchData();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to record settlement'); }
    finally { setActioning(null); }
  };

  // Step 2: Receiver confirms → completed
  const handleConfirm = async (id) => {
    setActioning(`confirm-${id}`);
    try {
      await confirmSettlement(id);
      toast.success('✅ Payment confirmed! Settlement complete.');
      fetchData();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to confirm'); }
    finally { setActioning(null); }
  };

  // Payer cancels pending settlement
  const handleCancel = async (id) => {
    setActioning(`cancel-${id}`);
    try {
      await cancelSettlement(id);
      toast.success('Settlement cancelled');
      fetchData();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to cancel'); }
    finally { setActioning(null); }
  };

  const handleRazorpay = async (s) => {
    if (isOfflineMode) return toast.error('Start the backend to use Razorpay');
    if (!s.fromUser?._id || !s.toUser?._id) return;
    if (s.fromUser._id !== currentUser?._id) return toast.error('You can only record your own payments');
    setActioning(`rzp-${s.from}`);
    try {
      const res = await createPaymentLink({
        group: activeGroup._id,
        from: s.fromUser._id, 
        to: s.toUser._id,
        amount: s.amount, 
        note: 'Razorpay UPI link generated',
      });
      if (res.data.url) {
        window.open(res.data.url, '_blank');
        toast.success('Razorpay link generated! Check history to sync.');
        setTab('history');
        fetchData();
      }
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to generate link'); }
    finally { setActioning(null); }
  };

  const handleVerifyRazorpay = async (id) => {
    setActioning(`verify-${id}`);
    try {
      const res = await verifyPaymentLink(id);
      if (res.data.status === 'completed') {
        toast.success('Payment verified & completed successfully!');
      } else {
        toast.info(`Payment is still ${res.data.status}`);
      }
      fetchData();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to verify'); }
    finally { setActioning(null); }
  };

  const allSettled = suggested.length === 0;

  return (
    <div>
      <TopBar
        title="Settle Up"
        subtitle="Two-step verified payment system"
        actions={<button className="btn-ghost" onClick={fetchData}><RefreshCw size={14} /> Refresh</button>}
      />

      {/* 🔔 Awaiting MY Confirmation banner */}
      <AnimatePresence>
        {awaitingMyConfirmation.length > 0 && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{ marginBottom: '1.5rem', padding: '14px 18px', borderRadius: 14,
              background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)',
              display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <AlertCircle size={18} color="#fbbf24" style={{ flexShrink: 0, marginTop: 2 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, color: '#fbbf24', marginBottom: '10px' }}>
                🔔 {awaitingMyConfirmation.length} payment{awaitingMyConfirmation.length > 1 ? 's' : ''} awaiting your confirmation
              </div>
              {awaitingMyConfirmation.map(h => (
                <div key={h._id} style={{ display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '8px 12px', borderRadius: 10,
                  background: 'rgba(255,255,255,0.04)', marginBottom: '6px', flexWrap: 'wrap' }}>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                    <strong style={{ color: '#f87171' }}>{h.fromName}</strong> says they paid you <strong style={{ color: '#34d399' }}>₹{h.amount}</strong>
                  </span>
                  <div style={{ marginLeft: 'auto', display: 'flex', gap: '6px' }}>
                    <motion.button whileTap={{ scale: 0.95 }} className="btn-primary"
                      style={{ padding: '5px 14px', fontSize: '0.78rem', height: 'auto', gap: '5px' }}
                      disabled={actioning === `confirm-${h._id}`}
                      onClick={() => handleConfirm(h._id)}>
                      <CheckCircle size={13} /> Confirm Receipt
                    </motion.button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Balance overview */}
      {balances.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
          className="card-glass" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
            <Info size={14} color="#818cf8" />
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Net Balances</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '8px' }}>
            {balances.map(b => {
              const member = (activeGroup?.members || []).find(m => m._id === b.userId);
              return (
                <div key={b.userId} style={{
                  padding: '10px 14px', borderRadius: 12,
                  background: b.balance > 0 ? 'rgba(16,185,129,0.08)' : b.balance < 0 ? 'rgba(239,68,68,0.08)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${b.balance > 0 ? 'rgba(16,185,129,0.2)' : b.balance < 0 ? 'rgba(239,68,68,0.2)' : 'var(--border-glass)'}`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <div className="avatar avatar-sm" style={{ background: (member?.color || '#6366f1') + '22', color: member?.color || '#6366f1', fontSize: '0.65rem' }}>
                      {b.name?.[0]}
                    </div>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>{b.name}</span>
                  </div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 800,
                    color: b.balance > 0 ? '#34d399' : b.balance < 0 ? '#f87171' : 'var(--text-muted)' }}>
                    {b.balance > 0 ? '+' : ''}₹{Math.abs(b.balance).toFixed(0)}
                  </div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {b.balance > 0 ? 'gets back' : b.balance < 0 ? 'owes' : 'settled'}
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '1.5rem', background: 'rgba(255,255,255,0.04)', padding: '4px', borderRadius: 12, width: 'fit-content' }}>
        {[['suggested', '✨ Suggested'], ['history', '📜 History']].map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)}
            style={{ padding: '8px 20px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', transition: 'all 0.2s',
              background: tab === t ? 'rgba(99,102,241,0.2)' : 'transparent',
              color: tab === t ? '#a5b4fc' : 'var(--text-muted)' }}>
            {label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* ── Suggested Tab ─────────────────────────────────────────────────── */}
        {tab === 'suggested' && (
          <motion.div key="suggested" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {[1,2,3].map(i => <div key={i} className="shimmer" style={{ height: 110, borderRadius: 20 }} />)}
              </div>
            ) : allSettled ? (
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                style={{ textAlign: 'center', padding: '4rem 2rem' }}>
                <motion.div animate={{ rotate: [0, 10, -10, 0] }} transition={{ repeat: Infinity, duration: 3 }}
                  style={{ fontSize: '4rem', marginBottom: '1rem' }}>🎉</motion.div>
                <h2 style={{ fontFamily: 'Poppins', fontWeight: 800, fontSize: '1.5rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                  All Settled Up!
                </h2>
                <p style={{ color: 'var(--text-muted)' }}>No outstanding balances. Everyone's even!</p>
              </motion.div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* Info about two-step system */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '12px 16px',
                  background: 'rgba(99,102,241,0.07)', borderRadius: 12, border: '1px solid rgba(99,102,241,0.2)' }}>
                  <Info size={15} color="#818cf8" style={{ flexShrink: 0, marginTop: 2 }} />
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                    <strong style={{ color: '#a5b4fc' }}>Two-step verification:</strong> When you mark a payment as paid,
                    the receiver must confirm they received it before it's marked as fully settled.
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px',
                  background: 'rgba(245,158,11,0.08)', borderRadius: 10, border: '1px solid rgba(245,158,11,0.2)' }}>
                  <Sparkles size={14} color="#fbbf24" />
                  <span style={{ fontSize: '0.8rem', color: '#fbbf24', fontWeight: 500 }}>
                    Optimized: {suggested.length} payment{suggested.length !== 1 ? 's' : ''} to settle all debts
                  </span>
                </div>

                {suggested.map((s, idx) => {
                  const fromUser = (activeGroup?.members || []).find(m => m._id === s.from) || s.fromUser;
                  const toUser   = (activeGroup?.members || []).find(m => m._id === s.to)   || s.toUser;
                  const isMyPayment = fromUser?._id === currentUser?._id;

                  return (
                    <motion.div key={idx}
                      initial={{ opacity: 0, x: -15 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.08 }}
                      className="card-glass" style={{ padding: '1.25rem 1.5rem' }}
                      whileHover={{ y: -2 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 100 }}>
                          <div className="avatar" style={{ background: (fromUser?.color || '#ef4444') + '22', color: fromUser?.color || '#f87171' }}>
                            {s.fromName?.[0]}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: isMyPayment ? '#f87171' : 'var(--text-primary)', fontSize: '0.95rem' }}>
                              {isMyPayment ? 'You' : s.fromName}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>sends money</div>
                          </div>
                        </div>

                        <div style={{ textAlign: 'center', padding: '8px 16px',
                          background: 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(139,92,246,0.1))',
                          borderRadius: 12, border: '1px solid rgba(99,102,241,0.2)' }}>
                          <div style={{ fontSize: '1.2rem', fontWeight: 900, fontFamily: 'Poppins', color: 'var(--text-primary)' }}>
                            ₹{s.amount}
                          </div>
                          <ArrowRight size={14} color="#818cf8" style={{ display: 'block', margin: '0 auto' }} />
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 100, justifyContent: 'flex-end' }}>
                          <div>
                            <div style={{ fontWeight: 700, color: '#34d399', fontSize: '0.95rem', textAlign: 'right' }}>{s.toName}</div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textAlign: 'right' }}>receives money</div>
                          </div>
                          <div className="avatar" style={{ background: (toUser?.color || '#10b981') + '22', color: toUser?.color || '#34d399' }}>
                            {s.toName?.[0]}
                          </div>
                        </div>
                      </div>

                      <div style={{ marginTop: '1rem', display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center' }}>
                        {isMyPayment ? (
                          <>
                            <motion.button className="btn-ghost" whileTap={{ scale: 0.96 }}
                              onClick={() => handleMarkPaid({ ...s, fromUser, toUser })}
                              disabled={!!actioning || isOfflineMode}
                              style={{ padding: '8px 16px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                              💸 Mark manually
                            </motion.button>
                            
                            <motion.button className="btn-primary" whileTap={{ scale: 0.96 }}
                              style={{ padding: '8px 16px', fontSize: '0.8rem', background: '#10b981', borderColor: '#059669', color: '#fff', gap: '6px' }}
                              onClick={() => {
                                if (window.innerWidth > 768) {
                                  return toast('Open on a mobile phone to use native UPI apps like GPay or PhonePe.', { icon: '📱' });
                                }
                                let upiId = toUser?.upiId;
                                if (!upiId) {
                                  upiId = window.prompt(`Enter ${s.toName}'s valid UPI ID to send ₹${s.amount}:`, '');
                                  if (!upiId || upiId.trim() === '') return;
                                }
                                const link = `upi://pay?pa=${upiId.trim()}&pn=${encodeURIComponent(s.toName)}&am=${s.amount}&cu=INR&tn=RoomSplit`;
                                window.location.href = link;
                                setTimeout(() => handleMarkPaid({ ...s, fromUser, toUser }), 2000);
                              }}>
                              <Smartphone size={14} /> Direct UPI
                            </motion.button>

                            <motion.button className="btn-primary" whileTap={{ scale: 0.96 }}
                              onClick={() => handleRazorpay({ ...s, fromUser, toUser })}
                              disabled={!!actioning || isOfflineMode}
                              style={{ padding: '8px 16px', fontSize: '0.8rem', background: '#3b82f6', borderColor: '#2563eb' }}>
                              <Zap size={14} />
                              {actioning === `rzp-${s.from}` ? 'Generating...' : isOfflineMode ? '🔒 Backend Required' : 'Razorpay'}
                            </motion.button>
                          </>
                        ) : (
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                            Waiting for {s.fromName} to pay
                          </span>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}

        {/* ── History Tab ──────────────────────────────────────────────────── */}
        {tab === 'history' && (
          <motion.div key="history" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            {history.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📜</div>
                <p>{isOfflineMode ? 'Connect backend to view settlement history' : 'No settlement history yet'}</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {history.map((h, idx) => {
                  const st = STATUS_CONFIG[h.status] || STATUS_CONFIG.pending_confirmation;
                  const isMyPayment  = h.from === currentUser?._id;
                  const isMyReceipt  = h.to   === currentUser?._id;
                  return (
                    <motion.div key={h._id}
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.04 }}
                      className="card-glass" style={{ padding: '1rem 1.25rem',
                        border: h.status === 'pending_confirmation' && isMyReceipt
                          ? '1px solid rgba(245,158,11,0.35)' : undefined }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                        <div className="avatar avatar-sm" style={{ background: '#ef444422', color: '#f87171' }}>
                          {h.fromName?.[0]}
                        </div>
                        <div style={{ flex: 1 }}>
                          <span style={{ color: '#f87171', fontWeight: 600 }}>{isMyPayment ? 'You' : h.fromName}</span>
                          <span style={{ color: 'var(--text-muted)', margin: '0 6px', fontSize: '0.85rem' }}>paid</span>
                          <span style={{ color: '#34d399', fontWeight: 600 }}>{isMyReceipt ? 'You' : h.toName}</span>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                            {new Date(h.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                            {h.note && <span style={{ marginLeft: 6, fontStyle: 'italic' }}>· {h.note}</span>}
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)' }}>₹{h.amount}</span>
                          <span style={{
                            fontSize: '0.7rem', fontWeight: 700, padding: '3px 10px', borderRadius: 8,
                            background: st.bg, color: st.color, border: `1px solid ${st.border}`,
                          }}>{st.label}</span>
                        </div>
                      </div>

                      {/* Actions for pending_confirmation & pending_payment */}
                      {(h.status === 'pending_confirmation' || h.status === 'pending_payment') && (
                        <div style={{ marginTop: '10px', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          {h.status === 'pending_payment' && (
                            <>
                              {h.razorpay_url && (
                                <motion.a href={h.razorpay_url} target="_blank" className="btn-primary"
                                  style={{ padding: '6px 16px', fontSize: '0.78rem', height: 'auto', gap: '6px', background: '#3b82f6', borderColor: '#2563eb', textDecoration: 'none' }}>
                                  🔗 Open Link
                                </motion.a>
                              )}
                              <motion.button whileTap={{ scale: 0.95 }} className="btn-primary"
                                style={{ padding: '6px 16px', fontSize: '0.78rem', height: 'auto', gap: '6px' }}
                                disabled={actioning === `verify-${h._id}`}
                                onClick={() => handleVerifyRazorpay(h._id)}>
                                <RefreshCw size={13} className={actioning === `verify-${h._id}` ? 'spin' : ''} /> Sync Status
                              </motion.button>
                            </>
                          )}
                          
                          {h.status === 'pending_confirmation' && isMyReceipt && (
                            <motion.button whileTap={{ scale: 0.95 }} className="btn-primary"
                              style={{ padding: '6px 16px', fontSize: '0.78rem', height: 'auto', gap: '6px' }}
                              disabled={actioning === `confirm-${h._id}`}
                              onClick={() => handleConfirm(h._id)}>
                              <CheckCircle size={13} /> Confirm Receipt
                            </motion.button>
                          )}
                          {isMyPayment && (
                            <motion.button whileTap={{ scale: 0.95 }} className="btn-ghost"
                              style={{ padding: '6px 14px', fontSize: '0.78rem', height: 'auto', color: '#f87171', gap: '6px' }}
                              disabled={actioning === `cancel-${h._id}`}
                              onClick={() => handleCancel(h._id)}>
                              <XCircle size={13} /> Cancel
                            </motion.button>
                          )}
                          {!isMyReceipt && !isMyPayment && (
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                              <Clock size={11} style={{ marginRight: 4 }} />Awaiting receiver confirmation
                            </span>
                          )}
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
