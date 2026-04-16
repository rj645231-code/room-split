import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getGroups, getUsers, login as apiLogin, register as apiRegister, getMe, getPendingInvites } from '../services/api';
import { MOCK_DATA } from '../services/mockData';
import toast from 'react-hot-toast';

const AppContext = createContext(null);

export const AppProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('rs-token') || null);
  const [authLoading, setAuthLoading] = useState(true);

  const [groups, setGroups] = useState([]);
  const [users, setUsers] = useState([]);
  const [activeGroup, setActiveGroupState] = useState(null);
  const [_pendingActiveGroupId] = useState(() => localStorage.getItem('rs-active-group') || null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem('rs-theme') || 'dark');
  const [pendingInvites, setPendingInvites] = useState([]);

  // Theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('rs-theme', theme);
  }, [theme]);
  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');

  // Auth flow
  useEffect(() => {
    const fetchUser = async () => {
      if (!token) { setAuthLoading(false); return; }
      if (token === 'demo-token') {
        setCurrentUser(MOCK_DATA.users[0]);
        setIsOfflineMode(true);
        setAuthLoading(false);
        return;
      }
      try {
        const res = await getMe();
        setCurrentUser(res.data.data);
      } catch {
        setToken(null);
        localStorage.removeItem('rs-token');
      } finally {
        setAuthLoading(false);
      }
    };
    fetchUser();
  }, [token]);

  const login = async (email, password) => {
    const res = await apiLogin({ email, password });
    const { token: newToken, data } = res.data;
    localStorage.setItem('rs-token', newToken);
    setToken(newToken);
    setCurrentUser(data);
  };

  const register = async (name, email, password, username) => {
    const res = await apiRegister({ name, email, password, username });
    const { token: newToken, data } = res.data;
    localStorage.setItem('rs-token', newToken);
    setToken(newToken);
    setCurrentUser(data);
  };

  const startDemo = () => {
    localStorage.setItem('rs-token', 'demo-token');
    setToken('demo-token');
    setCurrentUser(MOCK_DATA.users[0]);
    setIsOfflineMode(true);
    toast.success('Welcome to Demo Mode! 🎉');
  };

  const logout = () => {
    localStorage.removeItem('rs-token');
    localStorage.removeItem('rs-active-group');
    setToken(null);
    setCurrentUser(null);
    setActiveGroupState(null);
    setGroups([]);
    setUsers([]);
    setPendingInvites([]);
    toast.success('Logged out successfully');
  };

  // Preload app data if authenticated
  const fetchAll = useCallback(async () => {
    if (!currentUser) return;
    try {
      setLoading(true);
      if (token === 'demo-token') throw new Error('demo mode');
      
      const [groupsRes, usersRes] = await Promise.all([getGroups(), getUsers()]);
      const groupList = groupsRes.data.data || [];
      const userList  = usersRes.data.data  || [];

      setGroups(groupList);
      setUsers(userList);
      setIsOfflineMode(false);

      setActiveGroupState(prev => {
        if (groupList.length === 0) return null;
        // Prefer: 1) currently active, 2) last persisted in localStorage, 3) first in list
        const savedId = localStorage.getItem('rs-active-group');
        const existing = groupList.find(g => g._id === prev?._id)
          || groupList.find(g => g._id === savedId);
        const resolved = existing || groupList[0];
        localStorage.setItem('rs-active-group', resolved._id);
        return resolved;
      });

      // Fetch pending invites for current user
      try {
        const invRes = await getPendingInvites();
        setPendingInvites(invRes.data.data || []);
      } catch { /* non-fatal */ }

    } catch (err) {
      console.warn('⚡ Backend unavailable — running in demo mode:', err.message);
      setGroups(MOCK_DATA.groups);
      setUsers(MOCK_DATA.users);
      setActiveGroupState(MOCK_DATA.groups[0]);
      setIsOfflineMode(true);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) fetchAll();
  }, [fetchAll, currentUser]);

  const switchGroup = async (group) => {
    setActiveGroupState(group);
    if (group?._id) localStorage.setItem('rs-active-group', group._id);
    if (!group || isOfflineMode) return;
    try {
      const res = await getGroups();
      const list = res.data.data || [];
      const fresh = list.find(g => g._id === group._id);
      if (fresh) setActiveGroupState(fresh);
    } catch {}
  };

  const refreshGroups = async () => {
    if (isOfflineMode) return;
    try {
      const res = await getGroups();
      const list = res.data.data || [];
      setGroups(list);
      if (list.length > 0) {
        setActiveGroupState(prev => {
          const updated = list.find(g => g._id === prev?._id);
          const resolved = updated || list[0];
          localStorage.setItem('rs-active-group', resolved._id);
          return resolved;
        });
      }
    } catch {}
  };

  // Computed helpers — role of currentUser in the activeGroup
  const currentUserRole = activeGroup?.members?.find(m => m._id === currentUser?._id)?.role || 'member';
  const isAdmin = currentUserRole === 'admin';

  return (
    <AppContext.Provider value={{
      currentUser, token, authLoading, login, register, logout, setCurrentUser, startDemo,
      groups, users,
      activeGroup, setActiveGroup: switchGroup,
      loading, fetchAll, refreshGroups,
      sidebarOpen, setSidebarOpen,
      isOfflineMode,
      theme, toggleTheme,
      pendingInvites, setPendingInvites,
      currentUserRole, isAdmin,
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};
