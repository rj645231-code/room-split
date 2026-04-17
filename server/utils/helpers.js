const { v4: uuidv4 } = require('uuid');

const newId = () => uuidv4();

// Parse JSON fields stored as TEXT in SQLite
const parseUser = (u) => {
  if (!u) return null;
  const parsed = {
    ...u,
    _id: u.id,
    username: u.username || null,
    upiId: u.upi_id || '',
    dietary:   JSON.parse(u.dietary   || '[]'),
    dislikes:  JSON.parse(u.dislikes  || '[]'),
    allergies: JSON.parse(u.allergies || '[]'),
    preferences: {
      dietary:   JSON.parse(u.dietary   || '[]'),
      dislikes:  JSON.parse(u.dislikes  || '[]'),
      allergies: JSON.parse(u.allergies || '[]'),
    },
    createdAt: u.created_at,
  };
  delete parsed.password;
  return parsed;
};

const parseGroup = (g, members = []) => {
  if (!g) return null;
  return {
    ...g,
    _id: g.id,
    members,
    totalSpent: g.total_spent,
    createdBy: g.created_by,
    isActive: !!g.is_active,
    createdAt: g.created_at,
  };
};

const parseExpense = (e, items = [], splits = []) => {
  if (!e) return null;
  return {
    ...e,
    _id: e.id,
    group: e.group_id,
    paidBy: e.paid_by_user || { _id: e.paid_by, id: e.paid_by },
    createdBy: e.created_by,
    totalAmount: e.total_amount,
    isSettled: !!e.is_settled,
    isRecurring: !!e.is_recurring,
    recurringMonth: e.recurring_month,
    items,
    splits,
    createdAt: e.created_at,
  };
};

const parseSettlement = (s, fromUser, toUser) => {
  if (!s) return null;
  return {
    ...s,
    _id: s.id,
    from: s.from_user,
    to: s.to_user,
    fromName: fromUser?.name || '',
    toName: toUser?.name || '',
    fromUser,
    toUser,
    createdAt: s.created_at,
  };
};

const parseJoinRequest = (r, user, group) => {
  if (!r) return null;
  return {
    ...r,
    _id: r.id,
    user: user ? parseUser(user) : null,
    group: group ? { _id: group.id, name: group.name } : null,
    createdAt: r.created_at,
  };
};

module.exports = { newId, parseUser, parseGroup, parseExpense, parseSettlement, parseJoinRequest };
