import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, User, LogOut, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';

export default function TopBar({ title, subtitle, actions }) {
  const { setSidebarOpen, isOfflineMode, currentUser, logout } = useApp();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const navigate = useNavigate();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleProfile = () => { setMenuOpen(false); navigate('/profile'); };
  const handleLogout  = () => { setMenuOpen(false); logout(); };

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      style={{ marginBottom: '1.5rem' }}
    >
      {/* ── Row 1: hamburger · title · avatar ───────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center',
        gap: 10, marginBottom: actions ? '0.75rem' : 0,
      }}>
        {/* Hamburger — mobile only */}
        <button
          id="hamburger-btn"
          onClick={() => setSidebarOpen(true)}
          style={{
            display: 'none',           /* shown via CSS */
            flexShrink: 0,
            background: 'var(--bg-glass)',
            border: '1px solid var(--border-glass)',
            borderRadius: 10, padding: '7px',
            color: 'var(--text-secondary)', cursor: 'pointer',
            alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Menu size={18} />
        </button>

        {/* Title block */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{
            fontFamily: 'Poppins', fontWeight: 800,
            fontSize: 'clamp(1rem, 5vw, 1.5rem)',
            color: 'var(--text-primary)',
            letterSpacing: '-0.3px', lineHeight: 1.15,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            margin: 0,
          }}>
            {title}
          </h1>
          {subtitle && (
            <p style={{
              fontSize: 'clamp(0.65rem, 2.5vw, 0.8rem)',
              color: 'var(--text-muted)', marginTop: 2,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {subtitle}
              {isOfflineMode && (
                <span style={{ marginLeft: 6, color: '#fbbf24', fontWeight: 600 }}>⚡ Demo</span>
              )}
            </p>
          )}
        </div>

        {/* User avatar — mobile only (desktop uses sidebar) */}
        {currentUser && (
          <div id="topbar-user-menu" ref={menuRef} style={{ position: 'relative', flexShrink: 0 }}>
            <button
              onClick={() => setMenuOpen(o => !o)}
              title={currentUser.name}
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                background: 'var(--bg-glass)',
                border: '1px solid var(--border-glass)',
                borderRadius: 10, padding: '5px 8px',
                cursor: 'pointer',
              }}
            >
              <div style={{
                width: 26, height: 26, borderRadius: '50%',
                background: currentUser.color ? `${currentUser.color}22` : 'rgba(99,102,241,0.2)',
                color: currentUser.color || '#4f46e5',
                border: `2px solid ${currentUser.color ? `${currentUser.color}44` : 'rgba(99,102,241,0.3)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.75rem', fontWeight: 800,
              }}>
                {currentUser.name?.[0]?.toUpperCase() || '?'}
              </div>
              <ChevronDown size={12} style={{ color: 'var(--text-muted)', transform: menuOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
            </button>

            <AnimatePresence>
              {menuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.96 }}
                  transition={{ duration: 0.15 }}
                  style={{
                    position: 'absolute', right: 0, top: 'calc(100% + 8px)',
                    background: 'var(--bg-card)', border: '1px solid var(--border-glass)',
                    borderRadius: 12, minWidth: 185, zIndex: 300,
                    boxShadow: '0 12px 40px rgba(0,0,0,0.35)', overflow: 'hidden',
                  }}
                >
                  <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border-glass)' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>{currentUser.name}</div>
                    {currentUser.username && <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>@{currentUser.username}</div>}
                  </div>
                  <div style={{ padding: '6px' }}>
                    <button onClick={handleProfile} style={menuItemStyle('#6366f1')}>
                      <User size={14} /> My Profile
                    </button>
                    <button onClick={handleLogout} style={{ ...menuItemStyle('#ef4444'), color: '#f87171' }}>
                      <LogOut size={14} /> Logout
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* ── Row 2: action buttons (wraps on mobile) ──────────────────────── */}
      {actions && (
        <div className="topbar-actions" style={{
          display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center',
        }}>
          {actions}
        </div>
      )}
    </motion.div>
  );
}

const menuItemStyle = (accent) => ({
  width: '100%', display: 'flex', alignItems: 'center', gap: 9,
  padding: '9px 12px', borderRadius: 8, border: 'none',
  background: 'transparent', cursor: 'pointer',
  color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: 500,
  transition: 'background 0.15s', textAlign: 'left',
});
