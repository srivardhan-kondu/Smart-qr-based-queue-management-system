const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'canteen.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');

function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      mobile TEXT NOT NULL UNIQUE,
      name TEXT,
      role TEXT NOT NULL CHECK(role IN ('student', 'admin')),
      wallet_balance REAL NOT NULL DEFAULT 300,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS menu_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      price REAL NOT NULL,
      prep_time_min INTEGER NOT NULL,
      active INTEGER NOT NULL DEFAULT 1,
      is_combo INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_code TEXT NOT NULL UNIQUE,
      user_id INTEGER NOT NULL,
      total_amount REAL NOT NULL,
      payment_method TEXT NOT NULL CHECK(payment_method IN ('ONLINE', 'WALLET', 'PAY_AT_PICKUP')),
      payment_provider TEXT,
      payment_status TEXT NOT NULL CHECK(payment_status IN ('PAID', 'PENDING')),
      order_status TEXT NOT NULL CHECK(order_status IN ('RECEIVED', 'PREPARING', 'READY', 'COLLECTED', 'CANCELLED')),
      pickup_slot TEXT NOT NULL,
      estimated_prep_min INTEGER NOT NULL,
      cancel_deadline TEXT NOT NULL,
      qr_token TEXT NOT NULL UNIQUE,
      qr_data_url TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      collected_at TEXT,
      FOREIGN KEY(user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      menu_item_id INTEGER NOT NULL,
      qty INTEGER NOT NULL,
      item_price REAL NOT NULL,
      FOREIGN KEY(order_id) REFERENCES orders(id),
      FOREIGN KEY(menu_item_id) REFERENCES menu_items(id)
    );

    CREATE TABLE IF NOT EXISTS ratings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL UNIQUE,
      user_id INTEGER NOT NULL,
      stars INTEGER NOT NULL CHECK(stars >= 1 AND stars <= 5),
      comment TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY(order_id) REFERENCES orders(id),
      FOREIGN KEY(user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      order_id INTEGER NOT NULL,
      channel TEXT NOT NULL CHECK(channel IN ('SMS', 'EMAIL')),
      message TEXT NOT NULL,
      sent_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id),
      FOREIGN KEY(order_id) REFERENCES orders(id)
    );
  `);

  const adminExists = db.prepare('SELECT id FROM users WHERE mobile = ?').get('9999999999');
  if (!adminExists) {
    db.prepare(
      'INSERT INTO users (mobile, name, role, wallet_balance, created_at) VALUES (?, ?, ?, ?, ?)'
    ).run('9999999999', 'Canteen Admin', 'admin', 0, new Date().toISOString());
  }

  const menuCount = db.prepare('SELECT COUNT(*) AS count FROM menu_items').get().count;
  if (menuCount === 0) {
    const seedItems = [
      ['Idli (2 pcs)', 'Breakfast', 30, 6, 0],
      ['Veg Puff', 'Snacks', 25, 4, 0],
      ['Samosa', 'Snacks', 20, 5, 0],
      ['Tea', 'Beverage', 15, 3, 0],
      ['Coffee', 'Beverage', 20, 3, 0],
      ['Masala Dosa', 'Breakfast', 55, 10, 0],
      ['Veg Fried Rice', 'Lunch', 90, 12, 0],
      ['Lemon Rice + Curd', 'Combo', 80, 9, 1],
      ['Mini Meal Combo', 'Combo', 79, 11, 1],
      ['Sandwich + Juice', 'Combo', 75, 8, 1],
      ['Paneer Roll', 'Snacks', 60, 7, 0],
      ['Curd Rice', 'Lunch', 50, 6, 0]
    ];

    const stmt = db.prepare(
      'INSERT INTO menu_items (name, category, price, prep_time_min, is_combo, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    );

    const insertMany = db.transaction((items) => {
      for (const item of items) {
        stmt.run(item[0], item[1], item[2], item[3], item[4], new Date().toISOString());
      }
    });

    insertMany(seedItems);
  }
}

module.exports = {
  db,
  initDb
};
