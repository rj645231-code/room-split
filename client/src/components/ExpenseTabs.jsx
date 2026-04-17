import { useNavigate } from 'react-router-dom';

export default function ExpenseTabs({ active, onTabChange }) {
  const navigate = useNavigate();

  const handleTabClick = (tabId) => {
    if (tabId === 'all') {
      if (active === 'all' || active === 'recurring') {
        if (onTabChange) onTabChange('all');
      } else {
        navigate('/expenses');
      }
    } else if (tabId === 'recurring') {
      if (active === 'all' || active === 'recurring') {
        if (onTabChange) onTabChange('recurring');
      } else {
        navigate('/expenses?tab=recurring');
      }
    } else if (tabId === 'daily') {
      navigate('/daily-items');
    } else if (tabId === 'history') {
      navigate('/transactions');
    }
  };

  return (
    <div style={{ display: 'flex', gap: '8px', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-glass)', paddingBottom: '0.5rem', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
      <button 
        className={`chip ${active === 'all' ? 'selected' : ''}`} 
        style={{ borderRadius: 8, padding: '8px 16px', background: active === 'all' ? 'var(--text-primary)' : 'transparent', color: active === 'all' ? '#ffffff' : 'var(--text-secondary)', whiteSpace: 'nowrap' }}
        onClick={() => handleTabClick('all')}
      >
        Regular Expenses
      </button>
      <button 
        className={`chip ${active === 'recurring' ? 'selected' : ''}`} 
        style={{ borderRadius: 8, padding: '8px 16px', background: active === 'recurring' ? 'var(--text-primary)' : 'transparent', color: active === 'recurring' ? '#ffffff' : 'var(--text-secondary)', whiteSpace: 'nowrap' }}
        onClick={() => handleTabClick('recurring')}
      >
        Recurring / Monthly Bills
      </button>
      <button 
        className={`chip ${active === 'daily' ? 'selected' : ''}`} 
        style={{ borderRadius: 8, padding: '8px 16px', background: active === 'daily' ? 'var(--text-primary)' : 'transparent', color: active === 'daily' ? '#ffffff' : 'var(--text-secondary)', whiteSpace: 'nowrap' }}
        onClick={() => handleTabClick('daily')}
      >
        Daily Checklist
      </button>
      <button 
        className={`chip ${active === 'history' ? 'selected' : ''}`} 
        style={{ borderRadius: 8, padding: '8px 16px', background: active === 'history' ? 'var(--text-primary)' : 'transparent', color: active === 'history' ? '#ffffff' : 'var(--text-secondary)', whiteSpace: 'nowrap' }}
        onClick={() => handleTabClick('history')}
      >
        History
      </button>
    </div>
  );
}
