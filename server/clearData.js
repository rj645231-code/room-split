const db = require('./config/db');

console.log('Clearing all data for a fresh start...');

try {
  await db.prepare('DELETE FROM item_consumers').run();
  await db.prepare('DELETE FROM splits').run();
  await db.prepare('DELETE FROM settlements').run();
  await db.prepare('DELETE FROM expense_items').run();
  await db.prepare('DELETE FROM expenses').run();
  await db.prepare('DELETE FROM group_members').run();
  await db.prepare('DELETE FROM groups_t').run();
  await db.prepare('DELETE FROM users').run();
  
  console.log('✅ All data removed successfully. You now have a fresh start!');
} catch (err) {
  console.error('❌ Error clearing data:', err);
}
