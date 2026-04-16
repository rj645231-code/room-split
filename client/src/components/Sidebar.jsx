import { NavLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutDashboard, Receipt, CreditCard, Users, Zap, Sun, Moon, BarChart2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import Logo from './Logo';

const navItems = [
  { path: '/',             icon: LayoutDashboard, label: 'Dashboard'  },
  { path: '/expenses',     icon: Receipt,         label: 'Expenses'   },
  { path: '/transactions', icon: CreditCard,      label: 'History'    },
  { path: '/settlement',   icon: Zap,             label: 'Settle Up'  },
  { path: '/analytics',   icon: BarChart2,        label: 'My Budget'  },
  { path: '/members',      icon: Users,           label: 'Members'    },
];

export default function Sidebar() {
  const {
    activeGroup, groups, setActiveGroup,
    sidebarOpen, setSidebarOpen,
    isOfflineMode, theme, toggleTheme,
  } = useApp();

  return (
    <>
      {/* Mobile backdrop */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
              zIndex: 39, backdropFilter: 'blur(4px)',
            }}
          />
        )}
      </AnimatePresence>

      {/* Sidebar panel */}
      <motion.div
        className={`sidebar${sidebarOpen ? ' open' : ''}`}
        style={sidebarOpen ? { transform: 'translateX(0)' } : {}}
      >
        {/* Logo + brand */}
        <div style={{ padding: '1.25rem 1.25rem 1rem', borderBottom: '1px solid var(--border-glass)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '0.75rem' }}>
            <Logo size={36} />
            <div style={{ flex: 1 }}>
              <div style={{
                fontFamily: 'Poppins', fontWeight: 800, fontSize: '1rem',
                color: 'var(--text-primary)', letterSpacing: '-0.3px', lineHeight: 1.1,
              }}>
                Room Split
              </div>
              <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', letterSpacing: '0.6px', marginTop: '1px' }}>
                EXPENSE AI
              </div>
            </div>

            {/* Mobile close */}
            <button
              onClick={() => setSidebarOpen(false)}
              id="sidebar-close"
              style={{
                background: 'none', border: 'none', color: 'var(--text-muted)',
                cursor: 'pointer', padding: 4, borderRadius: 6,
                display: 'none', fontSize: '1.1rem',
              }}>✕</button>
          </div>

          {/* Demo badge */}
          {isOfflineMode && (
            <div style={{
              padding: '4px 10px', borderRadius: 8,
              background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)',
              fontSize: '0.65rem', color: '#fbbf24', fontWeight: 600, letterSpacing: '0.3px',
              marginBottom: '0.75rem',
            }}>
              ⚡ DEMO MODE
            </div>
          )}

          {/* Group selector */}
          {groups.length > 0 && (
            <select
              className="input-glass"
              style={{ fontSize: '0.8rem', padding: '0.5rem 2rem 0.5rem 0.875rem' }}
              value={activeGroup?._id || ''}
              onChange={e => {
                const g = groups.find(gr => gr._id === e.target.value);
                if (g) setActiveGroup(g);
              }}
            >
              {groups.map(g => (
                <option key={g._id} value={g._id}>{g.name}</option>
              ))}
            </select>
          )}
        </div>

        {/* Nav links */}
        <nav style={{ padding: '0.875rem 0.75rem', flex: 1 }}>
          <div style={{
            fontSize: '0.6rem', color: 'var(--text-muted)',
            padding: '0 0.5rem 0.75rem', fontWeight: 700,
            letterSpacing: '1.2px', textTransform: 'uppercase',
          }}>
            Menu
          </div>
          {navItems.map(({ path, icon: Icon, label }) => (
            <NavLink
              key={path}
              to={path}
              end={path === '/'}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              style={{ marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '10px' }}
              onClick={() => setSidebarOpen(false)}
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Members preview */}
        {activeGroup?.members?.length > 0 && (
          <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid var(--border-glass)' }}>
            <div style={{
              fontSize: '0.6rem', color: 'var(--text-muted)',
              marginBottom: '0.75rem', fontWeight: 700,
              letterSpacing: '1px', textTransform: 'uppercase',
            }}>
              Members · {activeGroup.name}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {activeGroup.members.slice(0, 6).map(m => (
                <div
                  key={m._id || m}
                  className="avatar avatar-sm"
                  style={{
                    background: (m.color || '#6366f1') + '22',
                    color: m.color || '#6366f1',
                    border: `2px solid ${m.color || '#6366f1'}44`,
                    fontSize: '0.68rem', fontWeight: 700,
                  }}
                  title={m.name}
                >
                  {m.name?.[0]}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* User Profile & Logout */}
        <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid var(--border-glass)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <NavLink to="/profile" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }} onClick={() => setSidebarOpen(false)}>
            <div className="avatar avatar-sm" style={{ background: 'rgba(99,102,241,0.2)', color: '#a5b4fc', fontSize: '0.7rem' }}>
              👤
            </div>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              Profile
            </div>
          </NavLink>
          <button onClick={useApp().logout} style={{ background: 'none', border: 'none', color: '#f87171', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>
            Logout
          </button>
        </div>
      </motion.div>
    </>
  );
}
