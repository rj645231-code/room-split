const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { parseUser } = require('../utils/helpers');

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey_roomsplitter_2024';
const JWT_EXPIRES_IN = '30d';

exports.register = async (req, res) => {
  const { name, email, password, username, avatar, color, dietary, dislikes, allergies } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ success: false, message: 'Name, email, and password are required' });
  }

  // Auto-generate username if not provided
  const rawUsername = (username || name).toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20) || 'user';

  try {
    // Check email uniqueness
    const existing = await db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    // Check username uniqueness — generate a unique one if taken
    let finalUsername = rawUsername;
    let suffix = 1;
    while (await db.prepare('SELECT id FROM users WHERE username = ?').get(finalUsername)) {
      finalUsername = `${rawUsername}${suffix++}`;
    }

    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(password, salt);
    const newId = uuidv4();

    await db.prepare(`
      INSERT INTO users (id, username, name, email, password, color, avatar, dietary, dislikes, allergies)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      newId, finalUsername, name, email, hashedPassword,
      color || '#6366f1', avatar || '',
      JSON.stringify(dietary || []),
      JSON.stringify(dislikes || []),
      JSON.stringify(allergies || [])
    );

    const userRow = await db.prepare('SELECT * FROM users WHERE id = ?').get(newId);
    const user = parseUser(userRow);

    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    res.status(201).json({ success: true, token, data: user });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required' });
  }

  try {
    const userRow = await db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!userRow) {
      return res.status(400).json({ success: false, message: 'Invalid credentials' });
    }

    const isMatch = bcrypt.compareSync(password, userRow.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Invalid credentials' });
    }

    const user = parseUser(userRow);
    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    res.json({ success: true, token, data: user });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getMe = async (req, res) => {
  try {
    const userRow = await db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    if (!userRow) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({ success: true, data: parseUser(userRow) });
  } catch (error) {
    console.error('GetMe error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.updateProfile = async (req, res) => {
  const { name, username, color, avatar, dietary, dislikes, allergies } = req.body;
  try {
    const userRow = await db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    if (!userRow) return res.status(404).json({ success: false, message: 'User not found' });

    // Check username uniqueness if changing
    if (username && username !== userRow.username) {
      const taken = await db.prepare('SELECT id FROM users WHERE username = ? AND id != ?').get(username, req.user.id);
      if (taken) return res.status(400).json({ success: false, message: 'Username already taken' });
    }

    await db.prepare(`
      UPDATE users
      SET name = ?, username = ?, color = ?, avatar = ?, dietary = ?, dislikes = ?, allergies = ?
      WHERE id = ?
    `).run(
      name || userRow.name,
      username || userRow.username,
      color || userRow.color,
      avatar || userRow.avatar,
      dietary ? JSON.stringify(dietary) : userRow.dietary,
      dislikes ? JSON.stringify(dislikes) : userRow.dislikes,
      allergies ? JSON.stringify(allergies) : userRow.allergies,
      req.user.id
    );

    const updatedRow = await db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    res.json({ success: true, data: parseUser(updatedRow) });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
