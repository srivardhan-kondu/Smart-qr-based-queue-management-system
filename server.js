const express = require('express');
const session = require('express-session');
const cors = require('cors');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const dayjs = require('dayjs');
const QRCode = require('qrcode');
const { db, initDb } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
const CANCELLATION_WINDOW_MIN = 3;

initDb();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(
  session({
    secret: 'canteen-super-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 8 }
  })
);

app.use(express.static(path.join(__dirname, 'public')));

function authRequired(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  return next();
}

function adminRequired(req, res, next) {
  if (!req.session.user || req.session.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  return next();
}

function notify(userId, orderId, channel, message) {
  db.prepare(
    'INSERT INTO notifications (user_id, order_id, channel, message, sent_at) VALUES (?, ?, ?, ?, ?)'
  ).run(userId, orderId, channel, message, new Date().toISOString());
  console.log(`[Notification][${channel}] user=${userId} order=${orderId} ${message}`);
}

function sanitizeMobile(mobile) {
  return String(mobile || '').replace(/\D/g, '').slice(-10);
}

app.post('/api/auth/login', (req, res) => {
  const mobile = sanitizeMobile(req.body.mobile);
  const requestedRole = req.body.role === 'admin' ? 'admin' : 'student';

  if (mobile.length !== 10) {
    return res.status(400).json({ error: 'Valid 10-digit mobile number required' });
  }

  let user = db.prepare('SELECT * FROM users WHERE mobile = ?').get(mobile);

  if (!user) {
    user = {
      mobile,
      name: `Student-${mobile.slice(6)}`,
      role: requestedRole === 'admin' ? 'student' : 'student',
      wallet_balance: 300,
      created_at: new Date().toISOString()
    };

    const result = db
      .prepare(
        'INSERT INTO users (mobile, name, role, wallet_balance, created_at) VALUES (?, ?, ?, ?, ?)'
      )
      .run(user.mobile, user.name, user.role, user.wallet_balance, user.created_at);

    user.id = result.lastInsertRowid;
  }

  if (requestedRole === 'admin' && user.role !== 'admin') {
    return res.status(403).json({
      error: 'This mobile number is not registered as admin. Use 9999999999 for demo admin login.'
    });
  }

  req.session.user = {
    id: user.id,
    mobile: user.mobile,
    role: user.role,
    name: user.name
  };

  return res.json({
    message: 'Login successful',
    user: req.session.user
  });
});

app.post('/api/auth/logout', authRequired, (req, res) => {
  req.session.destroy(() => {
    res.json({ message: 'Logged out' });
  });
});

app.get('/api/auth/me', (req, res) => {
  if (!req.session.user) {
    return res.json({ user: null });
  }

  const wallet = db.prepare('SELECT wallet_balance FROM users WHERE id = ?').get(req.session.user.id);
  return res.json({ user: { ...req.session.user, wallet_balance: wallet ? wallet.wallet_balance : 0 } });
});

app.get('/api/menu', authRequired, (req, res) => {
  const budget = String(req.query.budget || 'all');
  let query = 'SELECT * FROM menu_items WHERE active = 1';

  if (budget === 'under50') query += ' AND price < 50';
  if (budget === 'under100') query += ' AND price < 100';
  if (budget === 'combo80') query += ' AND is_combo = 1 AND price <= 80';

  query += ' ORDER BY category, price';
  const items = db.prepare(query).all();
  return res.json({ items });
});

app.get('/api/pickup-slots', authRequired, (req, res) => {
  const slots = [];
  const now = dayjs();

  for (let i = 1; i <= 8; i += 1) {
    const slot = now.add(i * 15, 'minute');
    slots.push(slot.format('YYYY-MM-DD HH:mm'));
  }

  res.json({ slots });
});

