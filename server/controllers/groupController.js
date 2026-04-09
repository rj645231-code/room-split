const db = require('../config/db');
const { newId, parseUser, parseGroup } = require('../utils/helpers');
const { computeGroupBalances, generateSmartSuggestions } = require('./splitHelper');

const getGroupWithMembers = async (groupId) => {
  const group = await db.prepare('SELECT * FROM groups_t WHERE id = ?').get(groupId);
  if (!group) return null;
  const memberRows = await db.prepare(`
    SELECT u.*, gm.role FROM users u
    JOIN group_members gm ON gm.user_id = u.id
    WHERE gm.group_id = ?
  `).all(groupId);
  const members = memberRows.map(r => ({ ...parseUser(r), role: r.role || 'member' }));
  return parseGroup(group, members);
};

const getMemberRole = async (groupId, userId) => {
  const row = await db.prepare('SELECT role FROM group_members WHERE group_id = ? AND user_id = ?').get(groupId, userId);
  return row?.role || null;
};

const requireAdmin = async (groupId, userId, res) => {
  const role = await getMemberRole(groupId, userId);
  if (role !== 'admin') {
    res.status(403).json({ success: false, message: 'Admin privileges required' });
    return false;
  }
  return true;
};

exports.getGroups = async (req, res) => {
  try {
    const groups = await db.prepare(`
      SELECT g.* FROM groups_t g
      JOIN group_members gm ON gm.group_id = g.id
      WHERE g.is_active = 1 AND gm.user_id = ?
      ORDER BY g.created_at DESC
    `).all(req.user.id);
    const result = (await Promise.all(groups.map(g => getGroupWithMembers(g.id)))).filter(Boolean);
    res.json({ success: true, data: result });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

exports.searchGroups = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) return res.json({ success: true, data: [] });
    const groups = await db.prepare(`
      SELECT * FROM groups_t 
      WHERE is_active = 1 AND name LIKE ? 
      AND id NOT IN (SELECT group_id FROM group_members WHERE user_id = ?)
      LIMIT 10
    `).all(`%${q}%`, req.user.id);
    res.json({ success: true, data: groups });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

exports.getGroup = async (req, res) => {
  try {
    const group = await getGroupWithMembers(req.params.id);
    if (!group) return res.status(404).json({ success: false, message: 'Group not found' });

    const { balances, settlements } = await computeGroupBalances(req.params.id, group.members);
    const totalExpenses = (await db.prepare('SELECT COUNT(*) as c FROM expenses WHERE group_id = ?').get(req.params.id)).c;

    res.json({ success: true, data: { group, balances, settlements, totalExpenses } });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

exports.getSmartSuggestions = async (req, res) => {
  try {
    const group = await getGroupWithMembers(req.params.id);
    if (!group) return res.status(404).json({ success: false, message: 'Group not found' });

    const suggestions = await generateSmartSuggestions(req.params.id, group.members);

    group.members.forEach(m => {
      (m.preferences?.dislikes || []).forEach(dislike => {
        const key = dislike.toLowerCase().trim();
        if (!suggestions[key]) suggestions[key] = { suggested: [], neverConsumers: [], frequency: {} };
        if (!suggestions[key].neverConsumers.includes(m._id)) {
          suggestions[key].neverConsumers.push(m._id);
        }
      });
    });

    res.json({ success: true, data: suggestions });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

exports.createGroup = async (req, res) => {
  try {
    const { name, description = '', currency = 'INR' } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Name required' });

    const id = newId();
    await db.prepare(`
      INSERT INTO groups_t (id, name, description, currency, created_by)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, name, description, currency, req.user.id);

    await db.prepare(`
      INSERT OR IGNORE INTO group_members (group_id, user_id, role) VALUES (?, ?, 'admin')
    `).run(id, req.user.id);

    const groupResult = await getGroupWithMembers(id);
    res.status(201).json({ success: true, data: groupResult });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

exports.updateGroup = async (req, res) => {
  try {
    const { name, description, currency } = req.body;
    const existing = await db.prepare('SELECT * FROM groups_t WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ success: false, message: 'Group not found' });

    if (!(await requireAdmin(req.params.id, req.user.id, res))) return;

    await db.prepare(`
      UPDATE groups_t SET name = ?, description = ?, currency = ? WHERE id = ?
    `).run(
      name        || existing.name,
      description ?? existing.description,
      currency    || existing.currency,
      req.params.id,
    );

    const groupResult = await getGroupWithMembers(req.params.id);
    res.json({ success: true, data: groupResult });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

exports.deleteGroup = async (req, res) => {
  try {
    if (!(await requireAdmin(req.params.id, req.user.id, res))) return;
    await db.prepare('UPDATE groups_t SET is_active = 0 WHERE id = ?').run(req.params.id);
    res.json({ success: true, message: 'Group archived' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

exports.removeMember = async (req, res) => {
  try {
    const { id: groupId, userId } = req.params;
    if (!(await requireAdmin(groupId, req.user.id, res))) return;

    const adminCount = (await db.prepare(
      `SELECT COUNT(*) as c FROM group_members WHERE group_id = ? AND role = 'admin'`
    ).get(groupId)).c;
    const targetRole = await getMemberRole(groupId, userId);
    if (targetRole === 'admin' && adminCount <= 1) {
      return res.status(400).json({ success: false, message: 'Cannot remove the only admin. Promote another member first.' });
    }

    await db.prepare('DELETE FROM group_members WHERE group_id = ? AND user_id = ?').run(groupId, userId);
    const groupResult = await getGroupWithMembers(groupId);
    res.json({ success: true, message: 'Member removed', data: groupResult });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

exports.promoteMember = async (req, res) => {
  try {
    const { id: groupId, userId } = req.params;
    if (!(await requireAdmin(groupId, req.user.id, res))) return;

    const member = await db.prepare('SELECT * FROM group_members WHERE group_id = ? AND user_id = ?').get(groupId, userId);
    if (!member) return res.status(404).json({ success: false, message: 'User is not a member' });

    await db.prepare(`UPDATE group_members SET role = 'admin' WHERE group_id = ? AND user_id = ?`).run(groupId, userId);
    const groupResult = await getGroupWithMembers(groupId);
    res.json({ success: true, message: 'Member promoted to admin', data: groupResult });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

exports.demoteMember = async (req, res) => {
  try {
    const { id: groupId, userId } = req.params;
    if (!(await requireAdmin(groupId, req.user.id, res))) return;

    const adminCount = (await db.prepare(
      `SELECT COUNT(*) as c FROM group_members WHERE group_id = ? AND role = 'admin'`
    ).get(groupId)).c;
    if (adminCount <= 1) {
      return res.status(400).json({ success: false, message: 'Cannot demote the only admin' });
    }

    await db.prepare(`UPDATE group_members SET role = 'member' WHERE group_id = ? AND user_id = ?`).run(groupId, userId);
    const groupResult = await getGroupWithMembers(groupId);
    res.json({ success: true, message: 'Admin demoted to member', data: groupResult });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

exports.inviteUser = async (req, res) => {
  try {
    const { id: groupId, userId } = req.params;
    if (!(await requireAdmin(groupId, req.user.id, res))) return;

    const user = await db.prepare('SELECT id FROM users WHERE id = ?').get(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const already = await db.prepare('SELECT 1 FROM group_members WHERE group_id = ? AND user_id = ?').get(groupId, userId);
    if (already) return res.status(400).json({ success: false, message: 'User is already a member' });

    await db.prepare(`
      INSERT INTO group_join_requests (id, group_id, user_id, type, status)
      VALUES (?, ?, ?, 'invite', 'pending')
      ON CONFLICT(group_id, user_id) DO UPDATE SET type = 'invite', status = 'pending'
    `).run(newId(), groupId, userId);

    res.json({ success: true, message: 'Invite sent' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};
