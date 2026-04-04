import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, X, WifiOff, Shield, User, UserMinus, ChevronUp, ChevronDown,
  Search, Check, XCircle, Clock, Bell, Mail, Crown
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  createGroup, removeMember, promoteMember, demoteMember,
  inviteUser, sendJoinRequest, getJoinRequests, respondToRequest,
  getPendingInvites, respondToInvite, searchUsers, searchGroups,
} from '../services/api';
import TopBar from '../components/TopBar';
import toast from 'react-hot-toast';

const COLORS = ['#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981','#3b82f6','#ef4444','#14b8a6'];

export default function Members() {
  const { activeGroup, currentUser, isAdmin, fetchAll, isOfflineMode, pendingInvites, setPendingInvites } = useApp();
  const members = activeGroup?.members || [];

  const [showCreateGroup, setShowCreateGroup]   = useState(false);
  const [showInviteModal, setShowInviteModal]   = useState(false);
  const [showInvitesPanel, setShowInvitesPanel] = useState(false);
  const [newGroup, setNewGroup]   = useState({ name: '', description: '', currency: 'INR' });
  const [loading, setLoading]     = useState(false);
  const [actionLoading, setActionLoading] = useState(null);

  // Admin: pending join requests
  const [joinRequests, setJoinRequests] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(false);

  // Invite search
  const [searchQuery, setSearchQuery]   = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // Group search (Find Group)
  const [showFindGroupModal, setShowFindGroupModal] = useState(false);
  const [groupSearchQuery, setGroupSearchQuery] = useState('');
  const [groupSearchResults, setGroupSearchResults] = useState([]);
  const [groupSearchLoading, setGroupSearchLoading] = useState(false);

  const isMember = members.some(m => m._id === currentUser?._id);

  // Fetch join requests when admin + group changes
  useEffect(() => {
    if (!activeGroup || !isAdmin || isOfflineMode) return;
    setRequestsLoading(true);
    getJoinRequests(activeGroup._id)
      .then(r => setJoinRequests(r.data.data || []))
      .catch(() => {})
      .finally(() => setRequestsLoading(false));
  }, [activeGroup?._id, isAdmin, isOfflineMode]);

  // Invite search
  useEffect(() => {
    if (!searchQuery || searchQuery.length < 2) { setSearchResults([]); return; }
    const t = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await searchUsers(searchQuery);
        // Filter out existing members
        const memberIds = new Set(members.map(m => m._id));
        setSearchResults((res.data.data || []).filter(u => !memberIds.has(u._id)));
      } catch {} finally { setSearchLoading(false); }
    }, 350);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // Group search
  useEffect(() => {
    if (!groupSearchQuery || groupSearchQuery.length < 2) { setGroupSearchResults([]); return; }
    const t = setTimeout(async () => {
      setGroupSearchLoading(true);
      try {
        const res = await searchGroups(groupSearchQuery);
        setGroupSearchResults(res.data.data || []);
      } catch {} finally { setGroupSearchLoading(false); }
    }, 350);
    return () => clearTimeout(t);
  }, [groupSearchQuery]);

  // ── Actions ──────────────────────────────────────────────────────────────────

  const handleCreateGroup = async () => {
    if (isOfflineMode) return toast.error('Start backend to create groups');
    if (!newGroup.name) return toast.error('Group name required');
    setLoading(true);
    try {
      await createGroup(newGroup);
      await fetchAll();
      toast.success('Group created! You are now the admin 👑');
      setShowCreateGroup(false);
      setNewGroup({ name: '', description: '', currency: 'INR' });
    } catch { toast.error('Failed to create group'); }
    finally { setLoading(false); }
  };

  const handleSendJoinRequest = async (groupId) => {
    if (!groupId) return;
    setActionLoading(groupId);
    try {
      await sendJoinRequest(groupId);
      toast.success('Join request sent! Waiting for admin approval 🕐');
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to send request'); }
    finally { setActionLoading(null); }
  };

  const handleRespondToRequest = async (reqId, action) => {
    setActionLoading(reqId);
    try {
      await respondToRequest(reqId, action);
      toast.success(action === 'approve' ? '✅ Member approved!' : '❌ Request rejected');
      setJoinRequests(p => p.filter(r => r._id !== reqId));
      if (action === 'approve') await fetchAll();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setActionLoading(null); }
  };

  const handleRespondToInvite = async (invId, action) => {
    setActionLoading(invId);
    try {
      await respondToInvite(invId, action);
      toast.success(action === 'accept' ? '🎉 Joined the group!' : 'Invite declined');
      setPendingInvites(p => p.filter(i => i._id !== invId));
      if (action === 'accept') await fetchAll();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setActionLoading(null); }
  };

  const handleInviteUser = async (userId) => {
    if (!activeGroup) return;
    setActionLoading(userId);
    try {
      await inviteUser(activeGroup._id, userId);
      toast.success('📨 Invite sent!');
      setSearchResults(p => p.filter(u => u._id !== userId));
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to invite'); }
    finally { setActionLoading(null); }
  };

  const handleRemoveMember = async (userId, name) => {
    if (!window.confirm(`Remove ${name} from the group?`)) return;
    setActionLoading(userId);
    try {
      await removeMember(activeGroup._id, userId);
      toast.success(`${name} removed`);
      await fetchAll();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setActionLoading(null); }
  };

  const handlePromote = async (userId, name) => {
    setActionLoading(userId);
    try {
      await promoteMember(activeGroup._id, userId);
      toast.success(`${name} is now an Admin 👑`);
      await fetchAll();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setActionLoading(null); }
  };

  const handleDemote = async (userId, name) => {
    setActionLoading(userId);
    try {
      await demoteMember(activeGroup._id, userId);
      toast.success(`${name} demoted to Member`);
      await fetchAll();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setActionLoading(null); }
  };

  return (
    <div>
      <TopBar
        title="Members"
        subtitle={`${members.length} member${members.length !== 1 ? 's' : ''} in this flat`}
        actions={
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {pendingInvites.length > 0 && (
              <button className="btn-ghost" style={{ position: 'relative', padding: '8px 14px' }}
                onClick={() => setShowInvitesPanel(true)}>
                <Bell size={14} />
                <span style={{
                  position: 'absolute', top: -4, right: -4,
                  background: '#ef4444', color: '#fff', borderRadius: '50%',
                  width: 16, height: 16, fontSize: '0.65rem', fontWeight: 800,
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>{pendingInvites.length}</span>
              </button>
            )}
            {!isOfflineMode && (
              <button className="btn-ghost" onClick={() => setShowCreateGroup(true)}>
                <Plus size={14} /> New Group
              </button>
            )}
            {isAdmin && !isOfflineMode && (
              <button className="btn-primary" onClick={() => setShowInviteModal(true)}>
                <Mail size={14} /> Invite Member
              </button>
            )}
            {!isOfflineMode && (
              <button className="btn-primary" onClick={() => setShowFindGroupModal(true)}>
                <Search size={14} /> Find Group
              </button>
            )}
          </div>
        }
      />

      {/* Offline Banner */}
      {isOfflineMode && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px',
            borderRadius: 12, marginBottom: '1.5rem',
            background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)' }}>
          <WifiOff size={14} color="#fbbf24" />
          <div>
            <div style={{ fontSize: '0.8rem', color: '#fbbf24', fontWeight: 600 }}>Demo Mode — Members shown from demo data</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>Start the backend server to manage members</div>
          </div>
        </motion.div>
      )}

      {/* Admin: Join Requests Panel */}
      {isAdmin && !isOfflineMode && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          className="card-glass" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
            <Clock size={15} color="#818cf8" />
            <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
              Pending Join Requests
            </span>
            {joinRequests.length > 0 && (
              <span style={{ background: '#ef4444', color: '#fff', borderRadius: '50%',
                width: 20, height: 20, fontSize: '0.7rem', fontWeight: 800,
                display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {joinRequests.length}
              </span>
            )}
          </div>
          {requestsLoading ? (
            <div className="shimmer" style={{ height: 48, borderRadius: 10 }} />
          ) : joinRequests.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', textAlign: 'center', padding: '0.75rem' }}>
              No pending requests ✨
            </p>
          ) : joinRequests.map(req => (
            <motion.div key={req._id} layout
              style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap',
                padding: '10px 14px', borderRadius: 10,
                background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)',
                marginBottom: '8px' }}>
              <div className="avatar avatar-sm"
                style={{ background: (req.user?.color || '#6366f1') + '22', color: req.user?.color || '#6366f1' }}>
                {req.user?.name?.[0] || '?'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)' }}>{req.user?.name}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>@{req.user?.username} · {req.user?.email}</div>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <motion.button whileTap={{ scale: 0.95 }}
                  className="btn-primary"
                  style={{ padding: '5px 12px', fontSize: '0.75rem', height: 'auto', gap: '5px' }}
                  disabled={actionLoading === req._id}
                  onClick={() => handleRespondToRequest(req._id, 'approve')}>
                  <Check size={12} /> Approve
                </motion.button>
                <motion.button whileTap={{ scale: 0.95 }}
                  className="btn-ghost"
                  style={{ padding: '5px 12px', fontSize: '0.75rem', height: 'auto', gap: '5px', color: '#f87171' }}
                  disabled={actionLoading === req._id}
                  onClick={() => handleRespondToRequest(req._id, 'reject')}>
                  <XCircle size={12} /> Reject
                </motion.button>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Members Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {members.map((m, idx) => {
          const isMe = m._id === currentUser?._id;
          const memberIsAdmin = m.role === 'admin';
          return (
            <motion.div key={m._id}
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.06 }}
              className="card-glass" style={{ padding: '1.5rem' }}
              whileHover={{ y: -3 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '1rem' }}>
                <div style={{ position: 'relative' }}>
                  <div className="avatar avatar-lg"
                    style={{ background: m.color + '22', color: m.color, fontSize: '1.5rem', border: `2px solid ${m.color}44` }}>
                    {m.avatar || m.name[0]}
                  </div>
                  {memberIsAdmin && (
                    <div style={{ position: 'absolute', bottom: -2, right: -2,
                      background: '#f59e0b', borderRadius: '50%', width: 18, height: 18,
                      display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Crown size={10} color="#fff" />
                    </div>
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary)' }}>{m.name}</div>
                    {isMe && <span style={{ fontSize: '0.65rem', background: 'rgba(99,102,241,0.2)', color: '#a5b4fc', padding: '2px 6px', borderRadius: 6, fontWeight: 700 }}>You</span>}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 1 }}>@{m.username || m.email}</div>
                  <div style={{ marginTop: '4px' }}>
                    <span style={{
                      fontSize: '0.65rem', fontWeight: 700, padding: '2px 8px', borderRadius: 6,
                      background: memberIsAdmin ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.06)',
                      color: memberIsAdmin ? '#fbbf24' : 'var(--text-muted)',
                    }}>
                      {memberIsAdmin ? '👑 Admin' : '👤 Member'}
                    </span>
                  </div>
                </div>
              </div>

              {(m.preferences?.dietary?.length > 0 || m.preferences?.allergies?.length > 0 || m.preferences?.dislikes?.length > 0) && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '0.75rem' }}>
                  {m.preferences?.dietary?.map(d => <span key={d} className="badge badge-green">{d}</span>)}
                  {m.preferences?.dislikes?.slice(0, 2).map(d => <span key={d} className="badge badge-red">🚫 {d}</span>)}
                  {m.preferences?.allergies?.slice(0, 2).map(a => <span key={a} className="badge badge-amber">⚠️ {a}</span>)}
                </div>
              )}

              <div style={{ marginTop: '0.5rem', padding: '8px 12px', background: m.color + '11', borderRadius: 8, border: `1px solid ${m.color}22` }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 2 }}>Member since</div>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: m.color }}>
                  {new Date(m.createdAt || m.joined_at || Date.now()).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
              </div>

              {/* Admin controls — shown to admins for other members */}
              {isAdmin && !isMe && !isOfflineMode && (
                <div style={{ marginTop: '0.75rem', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {memberIsAdmin ? (
                    <motion.button whileTap={{ scale: 0.95 }} className="btn-ghost"
                      style={{ fontSize: '0.72rem', padding: '4px 10px', height: 'auto', color: '#fbbf24' }}
                      disabled={actionLoading === m._id}
                      onClick={() => handleDemote(m._id, m.name)}>
                      <ChevronDown size={11} /> Demote
                    </motion.button>
                  ) : (
                    <motion.button whileTap={{ scale: 0.95 }} className="btn-ghost"
                      style={{ fontSize: '0.72rem', padding: '4px 10px', height: 'auto', color: '#a5b4fc' }}
                      disabled={actionLoading === m._id}
                      onClick={() => handlePromote(m._id, m.name)}>
                      <ChevronUp size={11} /> Make Admin
                    </motion.button>
                  )}
                  <motion.button whileTap={{ scale: 0.95 }} className="btn-ghost"
                    style={{ fontSize: '0.72rem', padding: '4px 10px', height: 'auto', color: '#f87171' }}
                    disabled={actionLoading === m._id}
                    onClick={() => handleRemoveMember(m._id, m.name)}>
                    <UserMinus size={11} /> Remove
                  </motion.button>
                </div>
              )}
            </motion.div>
          );
        })}

        {/* Add-member card (admins only) */}
        {isAdmin && !isOfflineMode && (
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: members.length * 0.06 }}
            whileHover={{ y: -3 }}
            onClick={() => setShowInviteModal(true)}
            style={{
              border: '2px dashed var(--border-glass)', borderRadius: 20, padding: '1.5rem',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              gap: '0.75rem', cursor: 'pointer', minHeight: 160, color: 'var(--text-muted)',
            }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(99,102,241,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Mail size={20} color="#818cf8" />
            </div>
            <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Invite Member</span>
          </motion.div>
        )}
      </div>

      {/* ── My Pending Invites Panel (modal) ─────────────────────────────────── */}
      <AnimatePresence>
        {showInvitesPanel && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={e => e.target === e.currentTarget && setShowInvitesPanel(false)}>
            <motion.div className="modal-content"
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}>
              <div style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                  <div>
                    <h2 style={{ fontFamily: 'Poppins', fontWeight: 700, fontSize: '1.2rem' }}>📨 Pending Invites</h2>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>Groups that want you to join</p>
                  </div>
                  <button className="btn-ghost" style={{ padding: '8px' }} onClick={() => setShowInvitesPanel(false)}><X size={18} /></button>
                </div>
                {pendingInvites.length === 0 ? (
                  <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>No pending invites</p>
                ) : pendingInvites.map(inv => (
                  <div key={inv._id} style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap',
                    padding: '12px 14px', borderRadius: 12, marginBottom: '8px',
                    background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.2)' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{inv.group?.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{inv.group?.description}</div>
                    </div>
                    <motion.button whileTap={{ scale: 0.95 }} className="btn-primary"
                      style={{ padding: '5px 12px', fontSize: '0.75rem', height: 'auto', gap: '5px' }}
                      disabled={actionLoading === inv._id}
                      onClick={() => handleRespondToInvite(inv._id, 'accept')}>
                      <Check size={12} /> Accept
                    </motion.button>
                    <motion.button whileTap={{ scale: 0.95 }} className="btn-ghost"
                      style={{ padding: '5px 10px', fontSize: '0.75rem', height: 'auto', color: '#f87171' }}
                      disabled={actionLoading === inv._id}
                      onClick={() => handleRespondToInvite(inv._id, 'decline')}>
                      <X size={12} />
                    </motion.button>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Invite Member Modal ───────────────────────────────────────────────── */}
      <AnimatePresence>
        {showInviteModal && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={e => e.target === e.currentTarget && setShowInviteModal(false)}>
            <motion.div className="modal-content"
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}>
              <div style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                  <div>
                    <h2 style={{ fontFamily: 'Poppins', fontWeight: 700, fontSize: '1.2rem' }}>📨 Invite Member</h2>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>Search by name, username or email</p>
                  </div>
                  <button className="btn-ghost" style={{ padding: '8px' }} onClick={() => setShowInviteModal(false)}><X size={18} /></button>
                </div>

                <div style={{ position: 'relative', marginBottom: '1rem' }}>
                  <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input className="input-glass" placeholder="Search users..."
                    value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                    style={{ paddingLeft: 36 }} />
                </div>

                {searchLoading && <div className="shimmer" style={{ height: 48, borderRadius: 10 }} />}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: 300, overflowY: 'auto' }}>
                  {searchResults.map(u => (
                    <div key={u._id} style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap',
                      padding: '10px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-glass)' }}>
                      <div className="avatar avatar-sm" style={{ background: (u.color || '#6366f1') + '22', color: u.color || '#6366f1' }}>
                        {u.name?.[0]}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)' }}>{u.name}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>@{u.username} · {u.email}</div>
                      </div>
                      <motion.button whileTap={{ scale: 0.95 }} className="btn-primary"
                        style={{ padding: '5px 14px', fontSize: '0.75rem', height: 'auto' }}
                        disabled={actionLoading === u._id}
                        onClick={() => handleInviteUser(u._id)}>
                        <Mail size={12} /> {actionLoading === u._id ? 'Sending...' : 'Invite'}
                      </motion.button>
                    </div>
                  ))}
                  {!searchLoading && searchQuery.length >= 2 && searchResults.length === 0 && (
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '1rem' }}>
                      No users found matching "{searchQuery}"
                    </p>
                  )}
                  {searchQuery.length < 2 && (
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', textAlign: 'center', padding: '1rem' }}>
                      Type at least 2 characters to search
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Create Group Modal ─────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showCreateGroup && !isOfflineMode && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={e => e.target === e.currentTarget && setShowCreateGroup(false)}>
            <motion.div className="modal-content"
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}>
              <div style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                  <div>
                    <h2 style={{ fontFamily: 'Poppins', fontWeight: 700, fontSize: '1.2rem' }}>Create Group</h2>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>You'll become the Admin automatically</p>
                  </div>
                  <button className="btn-ghost" style={{ padding: '8px' }} onClick={() => setShowCreateGroup(false)}><X size={18} /></button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500, display: 'block', marginBottom: '6px' }}>Group Name *</label>
                    <input className="input-glass" placeholder="e.g. FlatMates Koramangala"
                      value={newGroup.name} onChange={e => setNewGroup(p => ({ ...p, name: e.target.value }))} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500, display: 'block', marginBottom: '6px' }}>Description</label>
                    <input className="input-glass" placeholder="3BHK in Koramangala..."
                      value={newGroup.description} onChange={e => setNewGroup(p => ({ ...p, description: e.target.value }))} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500, display: 'block', marginBottom: '6px' }}>Currency</label>
                    <select className="input-glass" value={newGroup.currency} onChange={e => setNewGroup(p => ({ ...p, currency: e.target.value }))}>
                      <option value="INR">₹ INR</option>
                      <option value="USD">$ USD</option>
                      <option value="EUR">€ EUR</option>
                    </select>
                  </div>
                  <button className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '0.875rem', marginTop: '0.5rem' }}
                    onClick={handleCreateGroup} disabled={loading}>
                    {loading ? '⏳ Creating...' : '✅ Create Group'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Find Group Modal ─────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showFindGroupModal && !isOfflineMode && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={e => e.target === e.currentTarget && setShowFindGroupModal(false)}>
            <motion.div className="modal-content"
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}>
              <div style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                  <div>
                    <h2 style={{ fontFamily: 'Poppins', fontWeight: 700, fontSize: '1.2rem' }}>🔍 Find Group</h2>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>Search group names to join</p>
                  </div>
                  <button className="btn-ghost" style={{ padding: '8px' }} onClick={() => setShowFindGroupModal(false)}><X size={18} /></button>
                </div>

                <div style={{ position: 'relative', marginBottom: '1rem' }}>
                  <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input className="input-glass" placeholder="Search groups..."
                    value={groupSearchQuery} onChange={e => setGroupSearchQuery(e.target.value)}
                    style={{ paddingLeft: 36 }} />
                </div>

                {groupSearchLoading && <div className="shimmer" style={{ height: 48, borderRadius: 10 }} />}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: 300, overflowY: 'auto' }}>
                  {groupSearchResults.map(g => {
                    const groupId = g._id || g.id;
                    return (
                    <div key={groupId} style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap',
                      padding: '10px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-glass)' }}>
                      <div className="avatar avatar-sm" style={{ background: '#818cf822', color: '#818cf8' }}>
                        {g.name?.[0]}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)' }}>{g.name}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{g.description || 'No description'}</div>
                      </div>
                      <motion.button whileTap={{ scale: 0.95 }} className="btn-primary"
                        style={{ padding: '5px 14px', fontSize: '0.75rem', height: 'auto' }}
                        disabled={actionLoading === groupId}
                        onClick={() => handleSendJoinRequest(groupId)}>
                        <Plus size={12} /> {actionLoading === groupId ? 'Sending...' : 'Request'}
                      </motion.button>
                    </div>
                  )})}
                  {!groupSearchLoading && groupSearchQuery.length >= 2 && groupSearchResults.length === 0 && (
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '1rem' }}>
                      No groups found matching "{groupSearchQuery}"
                    </p>
                  )}
                  {groupSearchQuery.length < 2 && (
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', textAlign: 'center', padding: '1rem' }}>
                      Type at least 2 characters to search
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
