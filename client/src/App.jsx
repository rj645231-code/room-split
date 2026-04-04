import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Toaster } from 'react-hot-toast';
import { AppProvider, useApp } from './context/AppContext';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Expenses from './pages/Expenses';
import Transactions from './pages/Transactions';
import Settlement from './pages/Settlement';
import Members from './pages/Members';
import Profile from './pages/Profile';
import Auth from './components/Auth';

const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] } },
  exit:    { opacity: 0, y: -8, transition: { duration: 0.2 } },
};

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <motion.div key={location.pathname} variants={pageVariants} initial="initial" animate="animate" exit="exit">
        <Routes location={location}>
          <Route path="/"             element={<Dashboard />}   />
          <Route path="/expenses"     element={<Expenses />}    />
          <Route path="/transactions" element={<Transactions />}/>
          <Route path="/settlement"   element={<Settlement />}  />
          <Route path="/members"      element={<Members />}     />
          <Route path="/profile"      element={<Profile />}     />
          <Route path="*"             element={<Navigate to="/" />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
}

function MainLayout() {
  const { currentUser, authLoading } = useApp();

  if (authLoading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="shimmer" style={{ width: 120, height: 120, borderRadius: '50%' }} />
      </div>
    );
  }

  if (!currentUser) {
    return <Auth />;
  }

  return (
    <>
      <div className="bg-mesh" />
      <div className="app-layout">
        <Sidebar />
        <main className="main-content">
          <AnimatedRoutes />
        </main>
      </div>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <MainLayout />
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: 'var(--bg-card)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-glass)',
              borderRadius: '12px',
              fontSize: '0.875rem',
              fontFamily: 'Inter, sans-serif',
            },
            success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
            error:   { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
          }}
        />
      </AppProvider>
    </BrowserRouter>
  );
}
