import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

api.interceptors.request.use(config => {
  const token = localStorage.getItem('rs-token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Auth ─────────────────────────────────────────────────────────────────────
export const login          = (data) => api.post('/auth/login', data);
export const register       = (data) => api.post('/auth/register', data);
export const getMe          = ()     => api.get('/auth/me');
export const updateProfile  = (data) => api.put('/auth/profile', data);

// ── Users ─────────────────────────────────────────────────────────────────────
export const getUsers       = ()         => api.get('/users');
export const createUser     = (data)     => api.post('/users', data);
export const updateUser     = (id, data) => api.put(`/users/${id}`, data);
export const deleteUser     = (id)       => api.delete(`/users/${id}`);

// ── Groups ────────────────────────────────────────────────────────────────────
export const getGroups         = ()           => api.get('/groups');
export const getGroup          = (id)         => api.get(`/groups/${id}`);
export const createGroup       = (data)       => api.post('/groups', data);
export const updateGroup       = (id, data)   => api.put(`/groups/${id}`, data);
export const deleteGroup       = (id)         => api.delete(`/groups/${id}`);
export const getSmartSuggestions = (groupId)  => api.get(`/groups/${groupId}/suggestions`);
export const searchGroups      = (q)          => api.get(`/groups/search?q=${encodeURIComponent(q)}`);

// Admin controls
export const removeMember   = (groupId, userId) => api.delete(`/groups/${groupId}/members/${userId}`);
export const promoteMember  = (groupId, userId) => api.put(`/groups/${groupId}/members/${userId}/promote`);
export const demoteMember   = (groupId, userId) => api.put(`/groups/${groupId}/members/${userId}/demote`);
export const inviteUser     = (groupId, userId) => api.post(`/groups/${groupId}/invite/${userId}`);

// Join requests (group-scoped)
export const sendJoinRequest   = (groupId)  => api.post(`/groups/${groupId}/join`);
export const getJoinRequests   = (groupId)  => api.get(`/groups/${groupId}/requests`);
export const respondToRequest  = (id, action) => api.put(`/join-requests/requests/${id}`, { action });

// Invites (user-scoped)
export const getPendingInvites = ()              => api.get('/join-requests/invites/mine');
export const respondToInvite   = (id, action)   => api.put(`/join-requests/invites/${id}`, { action });

// User search (for admin invite flow)
export const searchUsers = (q) => api.get(`/join-requests/users/search?q=${encodeURIComponent(q)}`);

// ── Expenses ──────────────────────────────────────────────────────────────────
export const getExpenses    = (groupId) => api.get(`/expenses?groupId=${groupId}`);
export const getExpense     = (id)      => api.get(`/expenses/${id}`);
export const createExpense  = (data)    => api.post('/expenses', data);
export const updateExpense  = (id, data)=> api.put(`/expenses/${id}`, data);
export const deleteExpense  = (id)      => api.delete(`/expenses/${id}`);
export const getStats            = (groupId) => api.get(`/expenses/stats?groupId=${groupId}`);
export const scanReceipt         = (imageBase64) => api.post('/vision/receipt', { imageBase64 });
export const getPersonalAnalytics = (type = 'all') => api.get(`/analytics/personal?type=${type}`);

export const getPersonalExpenses        = (month) => api.get(`/personal-expenses${month ? `?month=${month}` : ''}`);
export const getPersonalExpensesSummary = ()       => api.get('/personal-expenses/summary');
export const createPersonalExpense      = (data)   => api.post('/personal-expenses', data);
export const updatePersonalExpense      = (id, data) => api.put(`/personal-expenses/${id}`, data);
export const deletePersonalExpense      = (id)     => api.delete(`/personal-expenses/${id}`);

export const getRecurringItems    = (groupId) => api.get(`/recurring-items?groupId=${groupId}`);
export const createRecurringItem  = (data)    => api.post('/recurring-items', data);
export const deleteRecurringItem  = (id)      => api.delete(`/recurring-items/${id}`);
export const logConsumption       = (data)    => api.post('/recurring-items/consume', data);
export const getMonthlySummary    = (groupId, month) => api.get(`/recurring-items/month-summary?groupId=${groupId}&month=${month}`);

// ── Settlements ───────────────────────────────────────────────────────────────
export const getSettlements        = (groupId, status) =>
  api.get(`/settlements?groupId=${groupId}${status ? `&status=${status}` : ''}`);
export const getSuggestedSettlements = (groupId) =>
  api.get(`/settlements/suggest/${groupId}`);
export const createSettlement      = (data)  => api.post('/settlements', data);
export const confirmSettlement     = (id)    => api.put(`/settlements/${id}/confirm`);
export const cancelSettlement      = (id)    => api.put(`/settlements/${id}/cancel`);
export const createPaymentLink     = (data)  => api.post('/settlements/pay-link', data);
export const verifyPaymentLink     = (id)    => api.get(`/settlements/verify-link/${id}`);

export default api;
