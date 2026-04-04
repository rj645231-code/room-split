import { motion } from 'framer-motion';

const COLOR_MAP = {
  purple: { bg: 'rgba(99,102,241,0.12)',  border: 'rgba(99,102,241,0.2)',  text: '#a5b4fc', glow: 'rgba(99,102,241,0.3)'  },
  red:    { bg: 'rgba(239,68,68,0.10)',   border: 'rgba(239,68,68,0.2)',   text: '#f87171', glow: 'rgba(239,68,68,0.3)'   },
  green:  { bg: 'rgba(16,185,129,0.10)',  border: 'rgba(16,185,129,0.2)',  text: '#34d399', glow: 'rgba(16,185,129,0.3)'  },
  amber:  { bg: 'rgba(245,158,11,0.10)',  border: 'rgba(245,158,11,0.2)',  text: '#fbbf24', glow: 'rgba(245,158,11,0.3)'  },
  blue:   { bg: 'rgba(59,130,246,0.10)',  border: 'rgba(59,130,246,0.2)',  text: '#60a5fa', glow: 'rgba(59,130,246,0.3)'  },
};

export default function StatCard({ icon: Icon, label, value, color = 'purple', prefix = '₹', delay = 0, suffix = '' }) {
  const c = COLOR_MAP[color] || COLOR_MAP.purple;
  const displayValue = typeof value === 'number'
    ? (prefix === '₹' ? value.toLocaleString('en-IN', { maximumFractionDigits: 0 }) : value.toString())
    : String(value ?? 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
      whileHover={{ y: -4, transition: { duration: 0.15 } }}
      className="stat-card card-glass"
      style={{ border: `1px solid ${c.border}` }}
    >
      {/* Icon */}
      <div style={{
        width: 42, height: 42, borderRadius: 12,
        background: c.bg, border: `1px solid ${c.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: '1rem',
        boxShadow: `0 4px 16px ${c.glow}`,
      }}>
        <Icon size={18} color={c.text} />
      </div>

      {/* Value */}
      <div style={{
        fontFamily: 'Poppins', fontWeight: 800,
        fontSize: '1.65rem', lineHeight: 1, color: 'var(--text-primary)',
        marginBottom: '0.4rem', letterSpacing: '-0.5px',
      }}>
        {prefix}{displayValue}{suffix}
      </div>

      {/* Label */}
      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 500 }}>
        {label}
      </div>

      {/* Subtle glow bg */}
      <div className="stat-card-glow" style={{ background: c.bg, opacity: 0.5 }} />
    </motion.div>
  );
}
