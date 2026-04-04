const db = require('../config/db');
const { newId, parseUser, parseJoinRequest } = require('../utils/helpers');

const getMemberRole = (groupId, userId) => {
  const row = db.prepare('SELECT role FROM group_members WHERE group_id = ? AND user_id = ?').get(groupId, userId);
  return row?.role || null;
};

// User sends a request to join a group
exports.sendJoinRequest = (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.id;

    // Group must exist
    const group = db.prepare('SELECT * FROM groups_t WHERE id = ? AND is_active = 1').get(groupId);
    if (!group) return res.status(404).json({ success: false, message: 'Group not found' });

    // Already a member?
    const already = db.prepare('SELECT 1 FROM group_members WHERE group_id = ? AND user_id = ?').get(groupId, userId);
    if (already) return res.status(400).json({ success: false, message: 'You are already a member' });

    // Already pending?
    const existing = db.prepare(
      `SELECT * FROM group_join_requests WHERE group_id = ? AND user_id = ? AND status = 'pending'`
    ).get(groupId, userId);
    if (existing) return res.status(400).json({ success: false, message: 'Request already pending' });

    db.prepare(`
      INSERT INTO group_join_requests (id, group_id, user_id, type, status)
      VALUES (?, ?, ?, 'request', 'pending')
      ON CONFLICT(group_id, user_id) DO UPDATE SET type = 'request', status = 'pending', created_at = datetime('now')
    `).run(newId(), groupId, userId);

    res.status(201).json({ success: true, message: 'Join request sent. Waiting for admin approval.' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

// Admin views all pending join requests for a group
exports.getJoinRequests = (req, res) => {
  try {
    const { groupId } = req.params;
    const role = getMemberRole(groupId, req.user.id);
    if (role !== 'admin') return res.status(403).json({ success: false, message: 'Admin only' });

    const rows = db.prepare(
      `SELECT * FROM group_join_requests WHERE group_id = ? AND status = 'pending' ORDER BY created_at DESC`
    ).all(groupId);

    const group = db.prepare('SELECT * FROM groups_t WHERE id = ?').get(groupId);
    const result = rows.map(r => {
      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(r.user_id);
      return parseJoinRequest(r, user, group);
    });

    res.json({ success: true, data: result });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

// Admin approves or rejects a join request
exports.respondToRequest = (req, res) => {
  try {
    const { requestId } = req.params;
    const { action } = req.body; // 'approve' | 'reject'

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ success: false, message: 'action must be approve or reject' });
    }

    const request = db.prepare('SELECT * FROM group_join_requests WHERE id = ?').get(requestId);
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });

    const role = getMemberRole(request.group_id, req.user.id);
    if (role !== 'admin') return res.status(403).json({ success: false, message: 'Admin only' });

    if (request.status !== 'pending') {
      return res.status(400).json({ success: false, message: `Request already ${request.status}` });
    }

    if (action === 'approve') {
      db.prepare(`
        INSERT OR IGNORE INTO group_members (group_id, user_id, role) VALUES (?, ?, 'member')
      `).run(request.group_id, request.user_id);
    }

    db.prepare(`UPDATE group_join_requests SET status = ? WHERE id = ?`).run(
      action === 'approve' ? 'approved' : 'rejected', requestId
    );

    res.json({ success: true, message: action === 'approve' ? 'Member approved and added' : 'Request rejected' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

// Current user sees pending invites sent to them by admins
exports.getPendingInvites = (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT gjr.*, g.name as group_name, g.description as group_desc, g.currency
      FROM group_join_requests gjr
      JOIN groups_t g ON g.id = gjr.group_id
      WHERE gjr.user_id = ? AND gjr.type = 'invite' AND gjr.status = 'pending'
      ORDER BY gjr.created_at DESC
    `).all(req.user.id);

    const result = rows.map(r => ({
      _id: r.id,
      id: r.id,
      groupId: r.group_id,
      group: { _id: r.group_id, name: r.group_name, description: r.group_desc, currency: r.currency },
      type: r.type,
      status: r.status,
      createdAt: r.created_at,
    }));

    res.json({ success: true, data: result });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

// User responds to their own invite (accept / decline)
exports.respondToInvite = (req, res) => {
  try {
    const { requestId } = req.params;
    const { action } = req.body; // 'accept' | 'decline'

    if (!['accept', 'decline'].includes(action)) {
      return res.status(400).json({ success: false, message: 'action must be accept or decline' });
    }

    const request = db.prepare('SELECT * FROM group_join_requests WHERE id = ?').get(requestId);
    if (!request) return res.status(404).json({ success: false, message: 'Invite not found' });
    if (request.user_id !== req.user.id) return res.status(403).json({ success: false, message: 'Not your invite' });
    if (request.type !== 'invite') return res.status(400).json({ success: false, message: 'Not an invite' });
    if (request.status !== 'pending') return res.status(400).json({ success: false, message: `Invite already ${request.status}` });

    if (action === 'accept') {
      db.prepare(`INSERT OR IGNORE INTO group_members (group_id, user_id, role) VALUES (?, ?, 'member')`).run(
        request.group_id, request.user_id
      );
    }

    db.prepare(`UPDATE group_join_requests SET status = ? WHERE id = ?`).run(
      action === 'accept' ? 'approved' : 'rejected', requestId
    );

    res.json({ success: true, message: action === 'accept' ? 'Joined the group!' : 'Invite declined' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

// Search users by username (for admin invite flow)
exports.searchUsers = (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) return res.json({ success: true, data: [] });

    const rows = db.prepare(`
      SELECT * FROM users
      WHERE (username LIKE ? OR name LIKE ? OR email LIKE ?)
      AND id != ?
      LIMIT 10
    `).all(`%${q}%`, `%${q}%`, `%${q}%`, req.user.id);

    res.json({ success: true, data: rows.map(r => {
      const u = require('../utils/helpers').parseUser(r);
      return u;
    })});
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};
