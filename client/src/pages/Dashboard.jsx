import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Wallet, TrendingDown, TrendingUp, Receipt, Plus, Sparkles, ArrowRight } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getGroup, getSuggestedSettlements, getExpenses, getStats } from '../services/api';
import { MOCK_DATA } from '../services/mockData';
import StatCard from '../components/StatCard';
import TopBar from '../components/TopBar';
import AddExpenseModal from '../components/AddExpenseModal';
import BillDownloadBtn from '../components/BillDownloadBtn';

const CATEGORY_COLORS = {
  grocery: '#10b981', meal: '#f59e0b', utility: '#6366f1',
  transport: '#3b82f6', entertainment: '#ec4899', other: '#94a3b8',
};
const CATEGORY_ICONS = {
  grocery: '🛒', meal: '🍽️', utility: '💡', transport: '🚗', entertainment: '🎮', other: '📦',
};

export default function Dashboard() {
  const { activeGroup, users, isOfflineMode, currentUser } = useApp();
  const [groupData, setGroupData] = useState(null);
  const [allExpenses, setAllExpenses] = useState([]);
  const [recentExpenses, setRecentExpenses] = useState([]);
  const [settlements, setSettlements] = useState([]);
  const [totalExpenseCount, setTotalExpenseCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  const fetchData = async () => {
    if (!activeGroup?._id) return;
    setLoading(true);
    try {
      if (isOfflineMode) {
        setGroupData(MOCK_DATA.groupDetail);
        setRecentExpenses(MOCK_DATA.expenses.slice(0, 5));
        setSettlements(MOCK_DATA.settlements);
        setTotalExpenseCount(MOCK_DATA.expenses.length);
      } else {
        const [groupRes, expRes, settleRes, statsRes] = await Promise.all([
          getGroup(activeGroup._id),
          getExpenses(activeGroup._id),
          getSuggestedSettlements(activeGroup._id),
          getStats(activeGroup._id),
        ]);
        setGroupData(groupRes.data.data);
        const fetchedExpenses = expRes.data.data || [];
        setAllExpenses(fetchedExpenses);
        setRecentExpenses(fetchedExpenses.slice(0, 5));
        setTotalExpenseCount(statsRes.data.data?.count ?? fetchedExpenses.length);
        setSettlements(settleRes.data.data?.settlements || []);
      }
    } catch (err) {
      // Fallback to mock even if individual call fails
      setGroupData(MOCK_DATA.groupDetail);
      setAllExpenses(MOCK_DATA.expenses);
      setRecentExpenses(MOCK_DATA.expenses.slice(0, 5));
      setSettlements(MOCK_DATA.settlements);
      setTotalExpenseCount(MOCK_DATA.expenses.length);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [activeGroup?._id, isOfflineMode]);

  const totalSpent = groupData?.group?.totalSpent || 0;
  const myBalance  = groupData?.balances?.find(b => b.userId === currentUser?._id || b.userId === currentUser?.id);
  const iOwe      = myBalance?.balance < 0 ? Math.abs(myBalance.balance) : 0;
  const iGetBack  = myBalance?.balance > 0 ? myBalance.balance : 0;

  if (loading) {
    return (
      <div>
        <div style={{ marginBottom: '2rem' }}>
          <div className="shimmer" style={{ height: 32, width: 200, borderRadius: 8 }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          {[0,1,2,3].map(i => <div key={i} className="shimmer" style={{ height: 120, borderRadius: 20 }} />)}
        </div>
        <div className="shimmer" style={{ height: 300, borderRadius: 20 }} />
      </div>
    );
  }

  return (
    <div>
      {/* Offline mode badge */}
      {isOfflineMode && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: 10, marginBottom: '1rem',
            background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', width: 'fit-content' }}>
          <span style={{ fontSize: '0.75rem', color: '#fbbf24', fontWeight: 600 }}>⚡ Demo mode — start the backend for live data</span>
        </motion.div>
      )}

      <TopBar
        title="Dashboard"
        subtitle={activeGroup ? `${activeGroup.members?.length} members · ${activeGroup.currency || 'INR'}` : 'No group selected'}
        actions={
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <BillDownloadBtn 
              group={groupData?.group} 
              expenses={allExpenses} 
              settlements={settlements} 
              balances={groupData?.balances} 
            />
            <button className="btn-primary" onClick={() => setModalOpen(true)}>
              <Plus size={15} /> Add Expense
            </button>
          </div>
        }
      />

      {/* Stats Grid */}
      <div className="dashboard-stats">
        <StatCard icon={Wallet}       label="Total Group Spend"  value={totalSpent}         color="purple" delay={0}    />
        <StatCard icon={TrendingDown} label="You Owe"            value={iOwe}               color="red"    delay={0.07} />
        <StatCard icon={TrendingUp}   label="You Get Back"       value={iGetBack}           color="green"  delay={0.14} />
        <StatCard icon={Receipt}      label="Total Expenses"     value={totalExpenseCount}  color="amber"  prefix="" delay={0.21} />
      </div>

      <div className="dashboard-main">
        {/* Recent Expenses */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <div className="card-glass" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <h2 style={{ fontFamily: 'Poppins', fontWeight: 700, fontSize: '1.1rem' }}>Recent Expenses</h2>
              <Link to="/expenses" style={{ fontSize: '0.8rem', color: '#818cf8', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                View all <ArrowRight size={13} />
              </Link>
            </div>

            {recentExpenses.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🧾</div>
                <p>No expenses yet. Add your first one!</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {recentExpenses.map((exp, idx) => (
                  <motion.div key={exp._id}
                    initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.05 }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap',
                      padding: '12px', borderRadius: 12,
                      background: 'var(--bg-glass)', border: '1px solid var(--border-glass)',
                    }}
                    whileHover={{ background: 'var(--bg-glass)', filter: 'brightness(1.1)', x: 2 }}
                  >
                    <div style={{
                      width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                      background: (CATEGORY_COLORS[exp.category] || '#6366f1') + '22',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem',
                    }}>
                      {CATEGORY_ICONS[exp.category] || '📦'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {exp.title}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        Paid by {exp.paidBy?.name} · {exp.items?.length} item{exp.items?.length !== 1 ? 's' : ''}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>₹{exp.totalAmount?.toFixed(2)}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>
                        {new Date(exp.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </motion.div>

        {/* Right column */}
        <div className="dashboard-right">
          {/* Balances */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <div className="card-glass" style={{ padding: '1.25rem' }}>
              <h3 style={{ fontFamily: 'Poppins', fontWeight: 700, fontSize: '0.95rem', marginBottom: '1rem' }}>Member Balances</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {(groupData?.balances || []).map(b => {
                  const member = (activeGroup?.members || []).find(m => m._id === b.userId);
                  return (
                    <div key={b.userId} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div className="avatar avatar-sm" style={{
                        background: (member?.color || '#6366f1') + '22',
                        color: member?.color || '#6366f1',
                        fontSize: '0.65rem', fontWeight: 700,
                      }}>{b.name?.[0]}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100px' }}>{b.name}</div>
                      </div>
                      <div style={{
                        fontSize: '0.85rem', fontWeight: 700, flexShrink: 0,
                        color: b.balance > 0 ? '#34d399' : b.balance < 0 ? '#f87171' : 'var(--text-muted)',
                      }}>
                        {b.balance > 0 ? '+' : ''}₹{Math.abs(b.balance).toFixed(0)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>

          {/* Quick settlements */}
          {settlements.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
              <div className="card-glass" style={{ padding: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
                  <Sparkles size={14} color="#fbbf24" />
                  <h3 style={{ fontFamily: 'Poppins', fontWeight: 700, fontSize: '0.95rem' }}>Settle Up</h3>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {settlements.slice(0, 3).map((s, idx) => (
                    <div key={idx} className="settlement-card">
                      <div className="avatar avatar-sm" style={{ background: '#ef444422', color: '#f87171', flexShrink: 0 }}>{s.fromName?.[0]}</div>
                      <div style={{ flex: 1, minWidth: 0, fontSize: '0.8rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        <span style={{ color: '#f87171', fontWeight: 600 }}>{s.fromName}</span>
                        <span style={{ color: 'var(--text-muted)' }}> pays </span>
                        <span style={{ color: '#34d399', fontWeight: 600 }}>{s.toName}</span>
                      </div>
                      <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9rem' }}>₹{s.amount}</span>
                    </div>
                  ))}
                </div>
                <Link to="/settlement" style={{ display: 'block', textAlign: 'center', marginTop: '0.75rem',
                  fontSize: '0.8rem', color: '#818cf8', textDecoration: 'none', padding: '8px',
                  borderRadius: 8, background: 'rgba(99,102,241,0.08)' }}>
                  View full settlement plan →
                </Link>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* FAB */}
      <motion.button
        className="fab"
        onClick={() => setModalOpen(true)}
        whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }}
        title="Add Expense"
      >+</motion.button>

      <AddExpenseModal open={modalOpen} onClose={() => setModalOpen(false)} onSuccess={fetchData} />
    </div>
  );
}
