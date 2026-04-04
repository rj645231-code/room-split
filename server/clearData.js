const db = require('./config/db');

console.log('Clearing all data for a fresh start...');

try {
  db.prepare('DELETE FROM item_consumers').run();
  db.prepare('DELETE FROM splits').run();
  db.prepare('DELETE FROM settlements').run();
  db.prepare('DELETE FROM expense_items').run();
  db.prepare('DELETE FROM expenses').run();
  db.prepare('DELETE FROM group_members').run();
  db.prepare('DELETE FROM groups_t').run();
  db.prepare('DELETE FROM users').run();
  
  console.log('✅ All data removed successfully. You now have a fresh start!');
} catch (err) {
  console.error('❌ Error clearing data:', err);
}
