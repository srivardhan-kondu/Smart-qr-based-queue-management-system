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

