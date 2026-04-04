import { motion } from 'framer-motion';
import { Menu } from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function TopBar({ title, subtitle, actions }) {
  const { setSidebarOpen, isOfflineMode } = useApp();

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
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Hamburger — mobile only via CSS */}
        <button
          id="hamburger-btn"
          onClick={() => setSidebarOpen(true)}
          style={{
            display: 'none', // shown via CSS media query in index.css
            background: 'var(--bg-glass)',
            border: '1px solid var(--border-glass)',
            borderRadius: 10, padding: '8px',
            color: 'var(--text-secondary)', cursor: 'pointer',
            alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Menu size={18} />
        </button>

        <div>
          <h1 style={{
            fontFamily: 'Poppins', fontWeight: 800,
            fontSize: '1.5rem', color: 'var(--text-primary)',
            letterSpacing: '-0.5px', lineHeight: 1.1,
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

      {/* Right: action buttons */}
      {actions && (
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-start' }} className="topbar-actions">
          {actions}
        </div>
      )}
    </motion.div>
  );
}
