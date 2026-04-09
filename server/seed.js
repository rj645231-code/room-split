require('dotenv').config();
const db = require('./config/db');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { computeSplits } = require('./utils/splitAlgorithm');

const main = async () => {
  console.log('🌱 Seeding SQLite database...');

  // Clear existing data
  await db.prepare('DELETE FROM item_consumers').run();
  await db.prepare('DELETE FROM splits').run();
  await db.prepare('DELETE FROM expense_items').run();
  await db.prepare('DELETE FROM expenses').run();
  await db.prepare('DELETE FROM group_members').run();
  await db.prepare('DELETE FROM groups_t').run();
  await db.prepare('DELETE FROM users').run();

  // ── Create Users ────────────────────────────────────────────────────────────────
  const defaultPasswordHash = bcrypt.hashSync('password123', 10);

  const insertUser = await db.prepare(`
    INSERT INTO users (id, name, email, password, color, avatar, dietary, dislikes, allergies)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const users = [
    { id: uuidv4(), name: 'Arjun', email: 'arjun@flat.com', color: '#6366f1', avatar: '👨‍💻',
      dietary: ['veg'],     dislikes: ['chicken','fish'], allergies: [] },
    { id: uuidv4(), name: 'Priya', email: 'priya@flat.com', color: '#8b5cf6', avatar: '👩‍🍳',
      dietary: ['vegan'],   dislikes: ['milk','cheese'],  allergies: ['nuts'] },
    { id: uuidv4(), name: 'Rahul', email: 'rahul@flat.com', color: '#ec4899', avatar: '🧑‍🎨',
      dietary: ['non-veg'], dislikes: [],                 allergies: [] },
    { id: uuidv4(), name: 'Sneha', email: 'sneha@flat.com', color: '#f59e0b', avatar: '👩‍💼',
      dietary: ['veg'],     dislikes: [],                 allergies: ['gluten'] },
  ];

  for (const u of users) {
    await insertUser.run(
      u.id, u.name, u.email, defaultPasswordHash, u.color, u.avatar,
      JSON.stringify(u.dietary),
      JSON.stringify(u.dislikes),
      JSON.stringify(u.allergies),
    );
  }

  // ── Create Group ────────────────────────────────────────────────────────────────
  const groupId = uuidv4();
  await db.prepare(`
    INSERT INTO groups_t (id, name, description, currency, created_by, total_spent)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(groupId, 'FlatMates 404', 'The best flat in Bangalore 🏠', 'INR', users[0].id, 2539);

  const insMember = await db.prepare('INSERT INTO group_members (group_id, user_id) VALUES (?, ?)');
  for (const u of users) {
    await insMember.run(groupId, u.id);
  }

  // ── Helper: create expense ──────────────────────────────────────────────────────
  const createExp = async (title, paidByIdx, itemDefs, category = 'grocery', daysAgo = 0) => {
    const paidBy = users[paidByIdx].id;
    const expId  = uuidv4();
    const date   = new Date(Date.now() - daysAgo * 86_400_000).toISOString();

    const items = itemDefs.map(i => ({
      ...i,
      consumers: i.consumers.map(idx => users[idx].id),
    }));
    const totalAmount = items.reduce((s, i) => s + i.totalCost, 0);

    await db.prepare(`
      INSERT INTO expenses (id, group_id, paid_by, title, total_amount, category, date)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(expId, groupId, paidBy, title, totalAmount, category, date);

    for (const item of items) {
      const itemId = uuidv4();
      const costPerConsumer = item.consumers.length ? item.totalCost / item.consumers.length : 0;
      await db.prepare(`
        INSERT INTO expense_items (id, expense_id, name, total_cost, cost_per_consumer, category)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(itemId, expId, item.name, item.totalCost, costPerConsumer, category);

      const insC = await db.prepare('INSERT OR IGNORE INTO item_consumers (item_id, user_id) VALUES (?, ?)');
      for (const uid of item.consumers) {
        await insC.run(itemId, uid);
      }
    }

    const splits = computeSplits(items, paidBy);
    const insSplit = await db.prepare('INSERT INTO splits (id, expense_id, user_id, amount) VALUES (?, ?, ?, ?)');
    for (const s of splits) {
      await insSplit.run(uuidv4(), expId, s.user, s.amount);
    }
  };

  // ── Seed Expenses ───────────────────────────────────────────────────────────────
  await createExp('Weekly Grocery Run', 0, [
    { name: 'Rice (5kg)',  totalCost: 280, consumers: [0,1,2,3] },
    { name: 'Chicken 1kg',totalCost: 250, consumers: [2]       },
    { name: 'Milk 2L',    totalCost: 80,  consumers: [0,2,3]   },
    { name: 'Vegetables', totalCost: 180, consumers: [0,1,2,3] },
    { name: 'Bread',       totalCost: 60, consumers: [0,2]     },
  ], 'grocery', 0);

  await createExp('Dinner at home', 1, [
    { name: 'Paneer 500g', totalCost: 140, consumers: [0,1,3] },
    { name: 'Dal 1kg',     totalCost: 110, consumers: [0,1,2,3] },
    { name: 'Curd',        totalCost: 50,  consumers: [0,2,3] },
  ], 'meal', 1);

  await createExp('Internet Bill', 2, [
    { name: 'Broadband March', totalCost: 799, consumers: [0,1,2,3] },
  ], 'utility', 3);

  await createExp('Breakfast supplies', 3, [
    { name: 'Oats',          totalCost: 120, consumers: [1,3] },
    { name: 'Eggs 12pc',     totalCost: 90,  consumers: [2]   },
    { name: 'Coffee powder', totalCost: 200, consumers: [0,2,3] },
    { name: 'Almond milk',   totalCost: 180, consumers: [1]   },
  ], 'grocery', 5);

  console.log('✅ Seed complete!');
  console.log(`👥 Users: ${users.map(u => u.name).join(', ')}`);
  console.log(`🏠 Group: FlatMates 404 (ID: ${groupId})`);
  console.log('');
  console.log('▶  Now run: node server.js');
};

main().catch(console.error);
