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

app.post('/api/orders', authRequired, async (req, res) => {
  const { items, pickupSlot, paymentMethod, paymentProvider } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Add at least one item' });
  }
  if (!pickupSlot) {
    return res.status(400).json({ error: 'Pickup slot is required' });
  }

  const method = String(paymentMethod || 'PAY_AT_PICKUP');
  if (!['ONLINE', 'WALLET', 'PAY_AT_PICKUP'].includes(method)) {
    return res.status(400).json({ error: 'Invalid payment method' });
  }

  const menuStmt = db.prepare('SELECT * FROM menu_items WHERE id = ? AND active = 1');
  let total = 0;
  let prepMax = 0;
  const orderItems = [];

  for (const item of items) {
    const menu = menuStmt.get(item.itemId);
    const qty = Number(item.qty || 0);
    if (!menu || qty <= 0) continue;
    total += menu.price * qty;
    prepMax = Math.max(prepMax, menu.prep_time_min);
    orderItems.push({ menu, qty });
  }

  if (orderItems.length === 0) {
    return res.status(400).json({ error: 'No valid items selected' });
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.user.id);
  let paymentStatus = 'PENDING';

  if (method === 'WALLET') {
    if (user.wallet_balance < total) {
      return res.status(400).json({ error: 'Insufficient wallet balance' });
    }
    db.prepare('UPDATE users SET wallet_balance = wallet_balance - ? WHERE id = ?').run(total, user.id);
    paymentStatus = 'PAID';
  }

  if (method === 'ONLINE') {
    if (!['PhonePe', 'Google Pay', 'PayU'].includes(paymentProvider)) {
      return res.status(400).json({ error: 'Choose payment provider: PhonePe, Google Pay, or PayU' });
    }
    paymentStatus = 'PAID';
  }

  const orderCode = `ORD-${Date.now()}`;
  const qrToken = uuidv4();
  const cancelDeadline = dayjs().add(CANCELLATION_WINDOW_MIN, 'minute').toISOString();
  const estimatedPrep = prepMax + 3;

  const qrPayload = JSON.stringify({ orderCode, qrToken });
  const qrDataUrl = await QRCode.toDataURL(qrPayload);

  const nowIso = new Date().toISOString();

  const tx = db.transaction(() => {
    const orderResult = db
      .prepare(
        `INSERT INTO orders (
          order_code, user_id, total_amount, payment_method, payment_provider, payment_status,
          order_status, pickup_slot, estimated_prep_min, cancel_deadline, qr_token, qr_data_url,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        orderCode,
        user.id,
        total,
        method,
        paymentProvider || null,
        paymentStatus,
        'RECEIVED',
        pickupSlot,
        estimatedPrep,
        cancelDeadline,
        qrToken,
        qrDataUrl,
        nowIso,
        nowIso
      );

    const orderId = orderResult.lastInsertRowid;
    const itemStmt = db.prepare(
      'INSERT INTO order_items (order_id, menu_item_id, qty, item_price) VALUES (?, ?, ?, ?)'
    );
    for (const row of orderItems) {
      itemStmt.run(orderId, row.menu.id, row.qty, row.menu.price);
    }

    return orderId;
  });

  const orderId = tx();

  return res.status(201).json({
    message: 'Order placed successfully',
    estimatedPrep,
    orderId,
    orderCode,
    qrToken,
    cancelDeadline,
    paymentStatus
  });
});

app.get('/api/orders/my', authRequired, (req, res) => {
  const orders = db
    .prepare(
      `SELECT o.*, COALESCE(r.stars, 0) AS rating_stars
       FROM orders o
       LEFT JOIN ratings r ON r.order_id = o.id
       WHERE o.user_id = ?
       ORDER BY o.created_at DESC`
    )
    .all(req.session.user.id);
  res.json({ orders });
});

app.get('/api/orders/:id', authRequired, (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?').get(req.params.id, req.session.user.id);
  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }

  const items = db
    .prepare(
      `SELECT oi.*, mi.name
       FROM order_items oi
       JOIN menu_items mi ON mi.id = oi.menu_item_id
       WHERE oi.order_id = ?`
    )
    .all(order.id);

  return res.json({ order, items });
});

app.post('/api/orders/:id/cancel', authRequired, (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?').get(req.params.id, req.session.user.id);
  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }
  if (order.order_status !== 'RECEIVED') {
    return res.status(400).json({ error: 'Cancellation allowed only before preparation starts' });
  }
  if (dayjs().isAfter(dayjs(order.cancel_deadline))) {
    return res.status(400).json({ error: 'Cancellation window expired' });
  }

  db.prepare('UPDATE orders SET order_status = ?, updated_at = ? WHERE id = ?').run('CANCELLED', new Date().toISOString(), order.id);

  if (order.payment_method === 'WALLET' && order.payment_status === 'PAID') {
    db.prepare('UPDATE users SET wallet_balance = wallet_balance + ? WHERE id = ?').run(order.total_amount, req.session.user.id);
  }

  res.json({ message: 'Order cancelled' });
});

app.post('/api/orders/:id/rate', authRequired, (req, res) => {
  const stars = Number(req.body.stars);
  const comment = String(req.body.comment || '').slice(0, 250);

  if (![1, 2, 3, 4, 5].includes(stars)) {
    return res.status(400).json({ error: 'Rating must be 1-5' });
  }

  const order = db.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?').get(req.params.id, req.session.user.id);
  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }
  if (order.order_status !== 'COLLECTED') {
    return res.status(400).json({ error: 'Rating allowed only after collection' });
  }

  const existing = db.prepare('SELECT * FROM ratings WHERE order_id = ?').get(order.id);
  if (existing) {
    db.prepare('UPDATE ratings SET stars = ?, comment = ?, created_at = ? WHERE order_id = ?').run(
      stars,
      comment,
      new Date().toISOString(),
      order.id
    );
  } else {
    db.prepare('INSERT INTO ratings (order_id, user_id, stars, comment, created_at) VALUES (?, ?, ?, ?, ?)').run(
      order.id,
      req.session.user.id,
      stars,
      comment,
      new Date().toISOString()
    );
  }

  res.json({ message: 'Rating submitted' });
});

