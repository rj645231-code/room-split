require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const helmet  = require('helmet');
const morgan  = require('morgan');
const path    = require('path');

// Catch startup crashes clearly in Render logs
process.on('uncaughtException',  (err) => { console.error('❌ CRASH:', err); process.exit(1); });
process.on('unhandledRejection', (err) => { console.error('❌ UNHANDLED:', err); process.exit(1); });

// Initialize SQLite (creates DB file automatically)
require('./config/db');

const app = express();

// ── Middleware ──────────────────────────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));
const isDev = process.env.NODE_ENV !== 'production';
app.use(cors({
  origin: isDev
    ? ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173']
    : true,           // Allow all origins in production (Render serves everything from same domain)
  credentials: true,
}));
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── API Routes ──────────────────────────────────────────────────────────────────
app.use('/api/auth',          require('./routes/auth'));
app.use('/api/users',         require('./routes/users'));
app.use('/api/groups',        require('./routes/groups'));
app.use('/api/expenses',      require('./routes/expenses'));
app.use('/api/settlements',   require('./routes/settlements'));
app.use('/api/join-requests', require('./routes/joinRequests'));
app.use('/api/vision',        require('./routes/vision'));

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', db: 'SQLite', timestamp: new Date().toISOString() });
});

// ── Serve React build (production) ─────────────────────────────────────────────
// __dirname = e:/Room_split/server  →  ../client/dist always works
const distPath = path.join(__dirname, '../client/dist');
app.use(express.static(distPath));

// FIX: Express v5 requires (.*) not * for wildcard
app.use((req, res) =>  {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ success: false, message: `Route not found: ${req.originalUrl}` });
  }
  res.sendFile(path.join(distPath, 'index.html'));
});

// ── Error Handler ───────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ success: false, message: err.message || 'Server Error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log('');
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║  🏠  Room Split  ·  Smart Expense Splitter  ║');
  console.log('╠══════════════════════════════════════════════╣');
  console.log(`║  🚀  http://localhost:${PORT}                   ║`);
  console.log('║  💾  Database: SQLite (offline, zero setup)  ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log('');
});

module.exports = app;
