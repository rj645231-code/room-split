/**
 * Mock data for demo/offline mode
 * Used when the backend API is unavailable
 */

const MOCK_USERS = [
  { _id: 'u1', name: 'Arjun',  email: 'arjun@flat.com',  color: '#6366f1', avatar: '👨‍💻', preferences: { dietary: ['veg'],   dislikes: ['chicken'], allergies: [] }, createdAt: new Date().toISOString() },
  { _id: 'u2', name: 'Priya',  email: 'priya@flat.com',  color: '#8b5cf6', avatar: '👩‍🍳', preferences: { dietary: ['vegan'], dislikes: ['milk'],    allergies: ['nuts'] }, createdAt: new Date().toISOString() },
  { _id: 'u3', name: 'Rahul',  email: 'rahul@flat.com',  color: '#ec4899', avatar: '🧑‍🎨', preferences: { dietary: ['non-veg'], dislikes: [],         allergies: [] }, createdAt: new Date().toISOString() },
  { _id: 'u4', name: 'Sneha',  email: 'sneha@flat.com',  color: '#f59e0b', avatar: '👩‍💼', preferences: { dietary: ['veg'],   dislikes: [],          allergies: ['gluten'] }, createdAt: new Date().toISOString() },
];

const MOCK_GROUP = {
  _id: 'g1',
  name: 'FlatMates 404',
  description: 'The best flat in Bangalore 🏠',
  members: MOCK_USERS,
  currency: 'INR',
  totalSpent: 2539,
  createdBy: MOCK_USERS[0],
  createdAt: new Date().toISOString(),
};

const d = (daysAgo) => new Date(Date.now() - daysAgo * 86_400_000).toISOString();

const MOCK_EXPENSES = [
  {
    _id: 'e1',
    group: 'g1',
    title: 'Weekly Grocery Run',
    category: 'grocery',
    totalAmount: 790,
    date: d(0),
    paidBy: MOCK_USERS[0],
    items: [
      { name: 'Rice 5kg',    totalCost: 280, consumers: MOCK_USERS,           costPerConsumer: 70   },
      { name: 'Chicken 1kg', totalCost: 250, consumers: [MOCK_USERS[2]],      costPerConsumer: 250  },
      { name: 'Milk 2L',     totalCost: 80,  consumers: [MOCK_USERS[0], MOCK_USERS[2], MOCK_USERS[3]], costPerConsumer: 26.67 },
      { name: 'Vegetables',  totalCost: 180, consumers: MOCK_USERS,           costPerConsumer: 45   },
    ],
    splits: [
      { user: MOCK_USERS[1], amount: 115, isPaid: false },
      { user: MOCK_USERS[2], amount: 390, isPaid: false },
      { user: MOCK_USERS[3], amount: 115, isPaid: false },
    ],
    isSettled: false,
  },
  {
    _id: 'e2',
    group: 'g1',
    title: 'Dinner at home',
    category: 'meal',
    totalAmount: 300,
    date: d(1),
    paidBy: MOCK_USERS[1],
    items: [
      { name: 'Paneer 500g', totalCost: 140, consumers: [MOCK_USERS[0], MOCK_USERS[1], MOCK_USERS[3]], costPerConsumer: 46.67 },
      { name: 'Dal 1kg',     totalCost: 110, consumers: MOCK_USERS, costPerConsumer: 27.5 },
      { name: 'Curd',        totalCost: 50,  consumers: [MOCK_USERS[0], MOCK_USERS[2], MOCK_USERS[3]], costPerConsumer: 16.67 },
    ],
    splits: [
      { user: MOCK_USERS[0], amount: 90.84, isPaid: false },
      { user: MOCK_USERS[2], amount: 44.17, isPaid: false },
      { user: MOCK_USERS[3], amount: 90.84, isPaid: false },
    ],
    isSettled: false,
  },
  {
    _id: 'e3',
    group: 'g1',
    title: 'Internet Bill',
    category: 'utility',
    totalAmount: 799,
    date: d(3),
    paidBy: MOCK_USERS[2],
    items: [
      { name: 'Broadband March', totalCost: 799, consumers: MOCK_USERS, costPerConsumer: 199.75 },
    ],
    splits: [
      { user: MOCK_USERS[0], amount: 199.75, isPaid: false },
      { user: MOCK_USERS[1], amount: 199.75, isPaid: false },
      { user: MOCK_USERS[3], amount: 199.75, isPaid: false },
    ],
    isSettled: false,
  },
  {
    _id: 'e4',
    group: 'g1',
    title: 'Breakfast supplies',
    category: 'grocery',
    totalAmount: 590,
    date: d(5),
    paidBy: MOCK_USERS[3],
    items: [
      { name: 'Oats',          totalCost: 120, consumers: [MOCK_USERS[1], MOCK_USERS[3]], costPerConsumer: 60 },
      { name: 'Eggs 12pc',     totalCost: 90,  consumers: [MOCK_USERS[2]],               costPerConsumer: 90 },
      { name: 'Coffee powder', totalCost: 200, consumers: [MOCK_USERS[0], MOCK_USERS[2], MOCK_USERS[3]], costPerConsumer: 66.67 },
      { name: 'Almond milk',   totalCost: 180, consumers: [MOCK_USERS[1]],               costPerConsumer: 180 },
    ],
    splits: [
      { user: MOCK_USERS[0], amount: 66.67, isPaid: true  },
      { user: MOCK_USERS[1], amount: 240,   isPaid: false },
      { user: MOCK_USERS[2], amount: 156.67, isPaid: false },
    ],
    isSettled: false,
  },
];

// Net balance computation (mirrors backend algorithm)
const computeBalances = () => {
  const map = {};
  MOCK_USERS.forEach(u => { map[u._id] = { userId: u._id, name: u.name, balance: 0 }; });

  MOCK_EXPENSES.forEach(exp => {
    if (exp.isSettled) return;
    map[exp.paidBy._id].balance += exp.totalAmount;
    exp.splits.forEach(s => {
      if (!s.isPaid) map[s.user._id].balance -= s.amount;
    });
  });
  return Object.values(map);
};

// Minimize settlements
const minimizeSettlements = (balances) => {
  const creds = balances.filter(b => b.balance >  0.01).map(b => ({ ...b }));
  const debs  = balances.filter(b => b.balance < -0.01).map(b => ({ ...b }));
  const txns = [];
  let i = 0, j = 0;
  while (i < creds.length && j < debs.length) {
    const amt = Math.min(creds[i].balance, Math.abs(debs[j].balance));
    const rounded = parseFloat(amt.toFixed(2));
    if (rounded > 0) {
      const fromUser = MOCK_USERS.find(u => u._id === debs[j].userId);
      const toUser   = MOCK_USERS.find(u => u._id === creds[i].userId);
      txns.push({ from: debs[j].userId, fromName: debs[j].name, fromUser,
                  to: creds[i].userId,  toName:   creds[i].name, toUser, amount: rounded });
    }
    creds[i].balance -= amt;
    debs[j].balance  += amt;
    if (Math.abs(creds[i].balance) < 0.01) i++;
    if (Math.abs(debs[j].balance)  < 0.01) j++;
  }
  return txns;
};

const balances = computeBalances();
const settlements = minimizeSettlements([...balances]);

export const MOCK_DATA = {
  users: MOCK_USERS,
  groups: [MOCK_GROUP],
  expenses: MOCK_EXPENSES,
  balances,
  settlements,
  groupDetail: {
    group: MOCK_GROUP,
    balances,
    settlements,
    totalExpenses: MOCK_EXPENSES.length,
  },
};
