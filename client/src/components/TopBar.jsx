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

  const handleProfile = () => {
    setMenuOpen(false);
    navigate('/profile');
  };

  const handleLogout = () => {
    setMenuOpen(false);
    logout();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: '12px', marginBottom: '1.75rem', flexWrap: 'wrap',
      }}
    >
      {/* Left: hamburger + title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
        {/* Hamburger — mobile only via CSS */}
        <button
          id="hamburger-btn"
          onClick={() => setSidebarOpen(true)}
          style={{
            display: 'none',
            background: 'var(--bg-glass)',
            border: '1px solid var(--border-glass)',
            borderRadius: 10, padding: '8px',
            color: 'var(--text-secondary)', cursor: 'pointer',
            alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Menu size={18} />
        </button>

        <div style={{ minWidth: 0 }}>
          <h1 style={{
            fontFamily: 'Poppins', fontWeight: 800,
            fontSize: 'clamp(1.1rem, 4vw, 1.5rem)',
            color: 'var(--text-primary)',
            letterSpacing: '-0.5px', lineHeight: 1.1,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {title}
          </h1>
          {subtitle && (
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '3px' }}>
              {subtitle}
              {isOfflineMode && (
                <span style={{ marginLeft: '8px', color: '#fbbf24', fontWeight: 600 }}>
                  ⚡ Demo
                </span>
              )}
            </p>
          )}
        </div>
      </div>

      {/* Right: actions + mobile user menu */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
        {actions && (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }} className="topbar-actions">
            {actions}
          </div>
        )}

        {/* User avatar dropdown — mobile-only via CSS (#topbar-user-menu hidden on desktop) */}
        {currentUser && (
          <div id="topbar-user-menu" ref={menuRef} style={{ position: 'relative', flexShrink: 0 }}>
            <button
              onClick={() => setMenuOpen(o => !o)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: 'var(--bg-glass)',
                border: '1px solid var(--border-glass)',
                borderRadius: 10, padding: '6px 10px',
                cursor: 'pointer', color: 'var(--text-primary)',
              }}
            >
              <div style={{
                width: 26, height: 26, borderRadius: '50%',
                background: currentUser.color ? `${currentUser.color}22` : 'rgba(99,102,241,0.2)',
                color: currentUser.color || '#4f46e5',
                border: `2px solid ${currentUser.color ? `${currentUser.color}44` : 'rgba(99,102,241,0.3)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.75rem', fontWeight: 800, flexShrink: 0,
              }}>
                {currentUser.name?.[0]?.toUpperCase() || '?'}
              </div>
              <ChevronDown size={13} style={{ color: 'var(--text-muted)', transition: 'transform 0.2s', transform: menuOpen ? 'rotate(180deg)' : 'none' }} />
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
                    borderRadius: 12, minWidth: 190, zIndex: 200,
                    boxShadow: '0 12px 40px rgba(0,0,0,0.35)', overflow: 'hidden',
                  }}
                >
                  {/* User info header */}
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-glass)' }}>
                    <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)' }}>{currentUser.name}</div>
                    {currentUser.username && (
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>@{currentUser.username}</div>
                    )}
                    {currentUser.email && (
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{currentUser.email}</div>
                    )}
                  </div>

                  {/* Menu items */}
                  <div style={{ padding: '6px' }}>
                    <button onClick={handleProfile} style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                      padding: '10px 12px', borderRadius: 8, border: 'none',
                      background: 'transparent', cursor: 'pointer',
                      color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: 500,
                      transition: 'background 0.15s', textAlign: 'left',
                    }}
                    onMouseOver={e => e.currentTarget.style.background = 'var(--bg-glass)'}
                    onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                      <User size={15} color="#818cf8" />
                      My Profile & Settings
                    </button>

                    <div style={{ height: 1, background: 'var(--border-glass)', margin: '4px 8px' }} />

                    <button onClick={handleLogout} style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                      padding: '10px 12px', borderRadius: 8, border: 'none',
                      background: 'transparent', cursor: 'pointer',
                      color: '#f87171', fontSize: '0.85rem', fontWeight: 500,
                      transition: 'background 0.15s', textAlign: 'left',
                    }}
                    onMouseOver={e => e.currentTarget.style.background = 'rgba(239,68,68,0.08)'}
                    onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                      <LogOut size={15} />
                      Logout
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </motion.div>
  );
}
