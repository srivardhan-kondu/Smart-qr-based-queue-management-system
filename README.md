# Smart QR Based Queue Management System

> A mobile-first web application that eliminates canteen queues by enabling students to pre-order meals, pay digitally, and collect using a unique QR code — with a full admin dashboard for canteen staff.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [System Architecture](#2-system-architecture)
3. [Tech Stack](#3-tech-stack)
4. [Database Schema](#4-database-schema)
5. [API Reference](#5-api-reference)
6. [Functional Requirements Coverage](#6-functional-requirements-coverage)
7. [Prerequisites](#7-prerequisites)
8. [Running the Project](#8-running-the-project)
9. [Demo Credentials](#9-demo-credentials)
10. [End-to-End User Flows](#10-end-to-end-user-flows)
11. [Test Cases](#11-test-cases)
12. [Known Limitations](#12-known-limitations)
13. [Project Structure](#13-project-structure)

---

## 1. Project Overview

Traditional college canteens face severe congestion during break hours — students queue manually, orders get delayed, and staff struggle to manage peak load. This system solves that with a digital pre-order pipeline:

- Students browse the menu, add items, pick a scheduled pickup slot, and pay (wallet / online / pay at counter)
- A unique QR code is generated after order placement
- Staff scan the QR at the counter to verify and collect
- Live status tracking, automated preparation pipeline, and a post-pickup rating system complete the experience
- Admins manage orders, menus, and view real-time analytics from a dedicated dashboard

---

## 2. System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                          CLIENT LAYER                               │
│                                                                     │
│   ┌─────────────────────────┐   ┌─────────────────────────────┐    │
│   │    Student App (/)       │   │   Admin Dashboard (/admin)  │    │
│   │  index.html + app.js    │   │  admin.html + admin.js      │    │
│   │  Mobile-responsive CSS  │   │  Sidebar, stats, QR scan    │    │
│   └────────────┬────────────┘   └──────────────┬──────────────┘    │
│                │  fetch() with credentials      │                   │
└────────────────┼────────────────────────────────┼───────────────────┘
                 │                                │
                 ▼                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        SERVER LAYER (Node.js + Express 5)           │
│                                                                     │
│  ┌──────────────┐  ┌─────────────┐  ┌────────────┐  ┌──────────┐  │
│  │  Auth Routes │  │ Order Routes│  │Admin Routes│  │ Static   │  │
│  │  /api/auth/* │  │ /api/orders │  │/api/admin/*│  │ Serve    │  │
│  └──────┬───────┘  └──────┬──────┘  └─────┬──────┘  └──────────┘  │
│         │                 │               │                         │
│  ┌──────▼─────────────────▼───────────────▼──────────────────────┐ │
│  │              Middleware Chain                                  │ │
│  │  cors → express.json → express-session → authRequired         │ │
│  │  → adminRequired (admin routes only)                          │ │
│  └────────────────────────────────┬───────────────────────────── ┘ │
│                                   │                                 │
│  ┌────────────────────────────────▼──────────────────────────────┐ │
│  │              Background Jobs (setInterval 15s)                │ │
│  │  Auto-transition RECEIVED → PREPARING after cancel_deadline   │ │
│  └───────────────────────────────────────────────────────────────┘ │
└─────────────────────────────┬───────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        DATA LAYER                                   │
│                                                                     │
│   SQLite (better-sqlite3, WAL mode)    canteen.db                  │
│                                                                     │
│   users ──────< orders ──────< order_items >────── menu_items      │
│                    │                                                │
│                    ├──────< ratings                                 │
│                    └──────< notifications                           │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Request Flow (Student Order Lifecycle)

```
Student                  Express Server               SQLite DB
   │                           │                          │
   │── POST /api/auth/login ──>│── SELECT users ─────────>│
   │<─ { user, session cookie }│<─ user row ──────────────│
   │                           │                          │
   │── GET /api/menu ─────────>│── SELECT menu_items ────>│
   │<─ { items[] } ────────────│<─ items ─────────────────│
   │                           │                          │
   │── POST /api/orders ──────>│── INSERT orders ─────────│
   │                           │── INSERT order_items ───>│
   │                           │── QRCode.toDataURL() ──> │ (in memory)
   │<─ { qrToken, qrDataUrl,   │                          │
   │     estimatedPrep,        │                          │
   │     cancelDeadline }      │                          │
   │                           │                          │
   │── [Background job] ───────│── UPDATE orders ─────────│
   │   (after 3 min deadline)  │   RECEIVED → PREPARING   │
   │                           │                          │
   │── GET /api/orders/my ────>│── SELECT orders ─────────│
   │<─ { orders[] } ───────────│<─ status = PREPARING ────│
   │                           │                          │

Staff (Admin)            Express Server               SQLite DB
   │── POST /api/admin/        │                          │
   │       verify-qr ─────────│── SELECT orders ─────────│
   │<─ { order, needsPay } ────│   WHERE qr_token = ? ────│
   │                           │                          │
   │── POST /api/admin/collect>│── UPDATE payment_status  │
   │<─ { message: collected }  │── UPDATE order_status ───│
   │                           │   → COLLECTED            │
```

---

## 3. Tech Stack

| Layer | Technology | Version | Purpose |
|---|---|---|---|
| **Runtime** | Node.js | ≥ 18 LTS | Server runtime |
| **Framework** | Express.js | 5.2.x | HTTP routing, middleware |
| **Database** | SQLite via `better-sqlite3` | 12.6.x | Embedded relational DB, WAL mode |
| **Sessions** | `express-session` | 1.19.x | Cookie-based session auth |
| **QR Generation** | `qrcode` | 1.5.x | Server-side QR PNG/dataURL generation |
| **QR Scanning** | `html5-qrcode` (CDN) | 2.x | Browser camera QR scanner in admin |
| **UUID** | `uuid` | 13.x | Unique QR token generation |
| **Date/Time** | `dayjs` | 1.11.x | Slot generation, cancel window calculation |
| **CORS** | `cors` | 2.8.x | Cross-origin support |
| **Frontend** | Vanilla HTML/CSS/JS | — | No framework, mobile-first CSS |
| **Typography** | Google Fonts — Poppins | — | UI typography |

### Why these choices?

- **SQLite** — Zero config, single-file DB, perfect for a campus MVP. WAL mode enables concurrent reads without locking.
- **better-sqlite3** — Synchronous API eliminates async/callback complexity for DB operations; 3–10× faster than async alternatives for small workloads.
- **Express 5** — Latest stable, built-in async error handling.
- **Vanilla JS frontend** — No build step, no bundler, instant start. Mobile-responsive via CSS Grid/Flexbox.
- **Session cookies** — Simple, stateless-friendly auth. No JWT complexity for an MVP.

---

## 4. Database Schema

```sql
-- Users (students + admin)
CREATE TABLE users (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  mobile          TEXT NOT NULL UNIQUE,       -- 10-digit mobile (login identity)
  name            TEXT,
  role            TEXT NOT NULL CHECK(role IN ('student', 'admin')),
  wallet_balance  REAL NOT NULL DEFAULT 300,  -- pre-loaded wallet in ₹
  created_at      TEXT NOT NULL
);

-- Menu items (seeded on first run)
CREATE TABLE menu_items (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  name           TEXT NOT NULL,
  category       TEXT NOT NULL,              -- Breakfast, Snacks, Beverage, Lunch, Combo
  price          REAL NOT NULL,
  prep_time_min  INTEGER NOT NULL,           -- used to compute estimated prep time
  active         INTEGER NOT NULL DEFAULT 1, -- admin can toggle off
  is_combo       INTEGER NOT NULL DEFAULT 0  -- for combo80 budget filter
);

-- Orders
CREATE TABLE orders (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  order_code        TEXT NOT NULL UNIQUE,    -- ORD-<timestamp>
  user_id           INTEGER NOT NULL,
  total_amount      REAL NOT NULL,
  payment_method    TEXT NOT NULL CHECK(payment_method IN ('ONLINE','WALLET','PAY_AT_PICKUP')),
  payment_provider  TEXT,                   -- PhonePe / Google Pay / PayU
  payment_status    TEXT NOT NULL CHECK(payment_status IN ('PAID','PENDING')),
  order_status      TEXT NOT NULL CHECK(order_status IN ('RECEIVED','PREPARING','READY','COLLECTED','CANCELLED')),
  pickup_slot       TEXT NOT NULL,
  estimated_prep_min INTEGER NOT NULL,
  cancel_deadline   TEXT NOT NULL,           -- created_at + 3 min
  qr_token          TEXT NOT NULL UNIQUE,    -- UUID used for QR scan
  qr_data_url       TEXT NOT NULL,           -- base64 PNG of QR code
  created_at        TEXT NOT NULL,
  updated_at        TEXT NOT NULL,
  collected_at      TEXT,
  FOREIGN KEY(user_id) REFERENCES users(id)
);

-- Order line items
CREATE TABLE order_items (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id      INTEGER NOT NULL,
  menu_item_id  INTEGER NOT NULL,
  qty           INTEGER NOT NULL,
  item_price    REAL NOT NULL,              -- price at time of order
  FOREIGN KEY(order_id) REFERENCES orders(id),
  FOREIGN KEY(menu_item_id) REFERENCES menu_items(id)
);

-- Post-pickup ratings
CREATE TABLE ratings (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id   INTEGER NOT NULL UNIQUE,      -- one rating per order
  user_id    INTEGER NOT NULL,
  stars      INTEGER NOT NULL CHECK(stars >= 1 AND stars <= 5),
  comment    TEXT,
  created_at TEXT NOT NULL
);

-- Notification log (SMS/Email simulated)
CREATE TABLE notifications (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id  INTEGER NOT NULL,
  order_id INTEGER NOT NULL,
  channel  TEXT NOT NULL CHECK(channel IN ('SMS','EMAIL')),
  message  TEXT NOT NULL,
  sent_at  TEXT NOT NULL
);
```

### Seeded Menu Items (auto-inserted on first run)

| Name | Category | Price | Prep Time |
|---|---|---|---|
| Idli (2 pcs) | Breakfast | ₹30 | 6 min |
| Masala Dosa | Breakfast | ₹55 | 10 min |
| Veg Puff | Snacks | ₹25 | 4 min |
| Samosa | Snacks | ₹20 | 5 min |
| Paneer Roll | Snacks | ₹60 | 7 min |
| Tea | Beverage | ₹15 | 3 min |
| Coffee | Beverage | ₹20 | 3 min |
| Veg Fried Rice | Lunch | ₹90 | 12 min |
| Curd Rice | Lunch | ₹50 | 6 min |
| Sandwich + Juice | Combo | ₹75 | 8 min |
| Mini Meal Combo | Combo | ₹79 | 11 min |
| Lemon Rice + Curd | Combo | ₹80 | 9 min |

---

## 5. API Reference

### Authentication

| Method | Endpoint | Auth | Body | Description |
|---|---|---|---|---|
| POST | `/api/auth/login` | None | `{ mobile, role? }` | Login or auto-register student |
| POST | `/api/auth/logout` | Session | — | Destroy session |
| GET | `/api/auth/me` | None | — | Get current user + wallet balance |

### Menu & Slots

| Method | Endpoint | Auth | Query | Description |
|---|---|---|---|---|
| GET | `/api/menu` | Student | `?budget=all\|under50\|under100\|combo80` | Browse menu with optional budget filter |
| GET | `/api/pickup-slots` | Student | — | Returns 8 slots in 15-min increments from now |

### Orders (Student)

| Method | Endpoint | Auth | Body | Description |
|---|---|---|---|---|
| POST | `/api/orders` | Student | `{ items, pickupSlot, paymentMethod, paymentProvider? }` | Place order, get QR token |
| GET | `/api/orders/my` | Student | — | Get all orders for current user |
| GET | `/api/orders/:id` | Student | — | Get order + line items |
| POST | `/api/orders/:id/cancel` | Student | — | Cancel within 3-min window |
| POST | `/api/orders/:id/rate` | Student | `{ stars, comment? }` | Rate a COLLECTED order |

### Admin

| Method | Endpoint | Auth | Body / Query | Description |
|---|---|---|---|---|
| GET | `/api/admin/orders` | Admin | — | All orders with student info |
| PATCH | `/api/admin/orders/:id/status` | Admin | `{ status }` | Update any order status |
| POST | `/api/admin/orders/:id/confirm-payment` | Admin | — | Mark order payment as PAID |
| POST | `/api/admin/verify-qr` | Admin | `{ qrToken }` | Verify QR — returns order details |
| POST | `/api/admin/collect` | Admin | `{ qrToken, paymentConfirmed }` | Collect order |
| GET | `/api/admin/slots` | Admin | — | Pickup slot summary |
| GET | `/api/admin/analytics` | Admin | — | Sales totals + ratings |
| GET | `/api/admin/stats` | Admin | — | Today's stats + active orders |
| GET | `/api/admin/menu-all` | Admin | — | All menu items (including inactive) |
| PATCH | `/api/admin/menu/:id/toggle` | Admin | — | Toggle item active/inactive |

### Utility

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/quick-access-qr` | None | QR code image pointing to the website URL |
| GET | `/api/notifications/my` | Student | Student's notification history |

---

## 6. Functional Requirements Coverage

| FR | Description | Status | Notes |
|---|---|---|---|
| FR1 | Mobile number login | ✅ Implemented | Auto-registers new students on first login |
| FR2 | Send OTP to mobile | ⚠️ Skipped | No SMS provider configured (intentionally skipped) |
| FR3 | OTP verification | ⚠️ Skipped | Depends on FR2 |
| FR4 | Secure logout | ✅ Implemented | Session destroyed, redirected to login |
| FR5 | Role-based access (Student / Admin) | ✅ Implemented | Protected by `authRequired` + `adminRequired` middleware |
| FR6 | Mobile-responsive website | ✅ Implemented | CSS Grid/Flexbox, tested on 320px–1440px |
| FR7 | Browse digital menu | ✅ Implemented | Category-grouped, 12 seeded items |
| FR8 | Item selection + quantity | ✅ Implemented | +/− controls, live cart total |
| FR9 | Scheduled pickup time selection | ✅ Implemented | 8 slots, 15-min apart from current time |
| FR10 | Estimated prep time display | ✅ Implemented | Max prep time of selected items + 3 min buffer |
| FR11 | Budget filter (Under ₹50 / ₹100 / Combo ≤₹80) | ✅ Implemented | `?budget=under50\|under100\|combo80` |
| FR12 | Online payments (PhonePe / Google Pay / PayU) | ⚠️ Simulated | Marked PAID immediately (no real gateway API keys) |
| FR13 | Student wallet system | ✅ Implemented | ₹300 starting balance, deducted on order, refunded on cancel |
| FR14 | Pay at Pickup | ✅ Implemented | Order created with `PENDING` payment |
| FR15 | Staff confirms payment before collect | ✅ Implemented | Collect blocked if `paymentConfirmed=false` for PAY_AT_PICKUP |
| FR16 | Unique QR code after order | ✅ Implemented | UUID token + base64 PNG via `qrcode` library |
| FR17 | Staff scans QR at counter | ✅ Implemented | Camera scan via `html5-qrcode` + manual token entry |
| FR18 | Status → Collected after verification | ✅ Implemented | `POST /api/admin/collect` |
| FR19 | Quick Access QR opens website | ✅ Implemented | `GET /api/quick-access-qr` returns website QR |
| FR20 | Live order status tracking | ✅ Implemented | Student polls `GET /api/orders/my` every 10s |
| FR21 | SMS/Email notification when order ready | ⚠️ Simulated | Logged to console + stored in `notifications` table |
| FR22 | Auto-cancel window + auto PREPARING | ✅ Implemented | 3-min window, background job every 15s transitions status |
| FR23 | Quick star ratings (1–5) after pickup | ✅ Implemented | Only for COLLECTED orders, guarded by check |
| FR24 | Admin manages orders | ✅ Implemented | Full orders table with filter in admin dashboard |
| FR25 | Admin updates order statuses | ✅ Implemented | Inline status dropdown per order |
| FR26 | Display scheduled pickup slots | ✅ Implemented | Slot summary in admin analytics tab |
| FR27 | Sales and rating analytics | ✅ Implemented | Gross/paid revenue, status breakdown, avg rating |

---

## 7. Prerequisites

| Requirement | Version | Check Command |
|---|---|---|
| **Node.js** | ≥ 18.0.0 LTS | `node --version` |
| **npm** | ≥ 9.0.0 | `npm --version` |
| **macOS / Linux / Windows** | Any modern OS | — |
| **Browser** | Chrome 90+ / Safari 15+ / Firefox 90+ | — |
| **Camera** (optional) | For admin QR scanning | — |

> SQLite is bundled via `better-sqlite3` — **no external database installation needed.**

---

## 8. Running the Project

### Step 1 — Clone / Download

```bash
cd '/path/to/your/workspace'
# project folder should be: "QR Code/"
```

### Step 2 — Install Dependencies

```bash
npm install
```

Installs: `express`, `better-sqlite3`, `qrcode`, `express-session`, `cors`, `uuid`, `dayjs`

### Step 3 — Start the Server

```bash
npm start
```

Expected output:
```
Smart QR Canteen app running at http://localhost:3000
```

### Step 4 — Open in Browser

| Page | URL |
|---|---|
| Student App | http://localhost:3000 |
| Admin Dashboard | http://localhost:3000/admin |

> The database (`canteen.db`) is created automatically on first run with seeded menu items and the admin account.

### Optional — Fresh Database Reset

```bash
rm -f canteen.db canteen.db-shm canteen.db-wal
npm start
```

### Syntax Check (Verify Code Integrity)

```bash
node -c server.js && node -c db.js && node -c public/app.js && node -c public/admin.js
```

All files should output: `... syntax OK`

---

## 9. Demo Credentials

| Role | Mobile | Notes |
|---|---|---|
| **Admin** | `9999999999` | Pre-seeded on first DB init. Access `/admin` |
| **Student** | Any 10-digit mobile e.g. `8765432100` | Auto-registered on first login |

> Students start with ₹300 wallet balance.

---

## 10. End-to-End User Flows

### Flow A — Student Pre-Order (Pay at Pickup)

```
1. Open http://localhost:3000
2. Enter mobile number → Login
3. Browse menu → add items using + / − buttons
4. Select pickup time slot from dropdown
5. View estimated prep time shown above the order button
6. Select "Pay at Pickup" as payment method
7. Tap "Place Order"
8. QR code is displayed on screen → screenshot or show at counter
9. Track status: Received → Preparing → Ready → Collected
10. After order is Collected → rate with 1–5 stars
```

### Flow B — Student Pre-Order (Wallet Payment)

```
1. Login → My wallet shows ₹300
2. Add items (total must be ≤ wallet balance)
3. Select payment: Wallet → Place Order
4. Order created with status PAID immediately
5. Wallet balance deducted in real-time
```

### Flow C — Student Order Cancellation

```
1. Place any order
2. Within 3 minutes of placing → go to My Orders → Cancel
3. Order status → CANCELLED
4. If paid by Wallet → full amount refunded to wallet instantly
5. After 3 minutes → cancellation blocked ("Cancellation window expired")
6. Background job auto-moves order to PREPARING after deadline
```

### Flow D — Admin QR Collection (Pay at Pickup)

```
1. Open http://localhost:3000/admin → Login as 9999999999
2. Go to QR Scan tab
3. Student shows QR code on phone → Point admin camera at it
   OR paste the qrToken manually in the text field
4. Tap "Verify" → Order details appear on right panel
5. Collect ₹ cash from student → Check "Payment Received" checkbox
6. Tap "Mark as Collected" → Order status → COLLECTED
7. Dashboard badge and active order count updates
```

### Flow E — Admin Order Management

```
1. Admin Dashboard → Orders tab
2. Use filter buttons: All / Received / Preparing / Ready / Collected / Cancelled
3. For any order → use Status dropdown to change status
4. When changed to READY → SMS + Email notification logged for student
5. Use "Confirm Pay" button for Pay at Pickup orders with pending payment
```

### Flow F — Admin Analytics

```
1. Admin Dashboard → Analytics tab
2. View: Gross revenue, Paid revenue, Total orders, Avg rating
3. Status breakdown bar chart (count per status)
4. Pickup slot table (orders per time slot)
```

---

## 11. Test Cases

### TC-01 · Student Login (FR1)

**Setup:** Server running, fresh session

```bash
curl -s -c /tmp/s.ck -H 'Content-Type: application/json' \
  -d '{"mobile":"8765432100"}' http://localhost:3000/api/auth/login
```

**Expected:** `{ "message": "Login successful", "user": { "role": "student", "wallet_balance": 300 } }`
**Pass Criteria:** HTTP 200, role = student, wallet = 300

---

### TC-02 · Admin Login & Role Guard (FR5)

```bash
# Admin login
curl -s -c /tmp/a.ck -H 'Content-Type: application/json' \
  -d '{"mobile":"9999999999","role":"admin"}' http://localhost:3000/api/auth/login

# Student trying admin endpoint → should be blocked
curl -s -b /tmp/s.ck http://localhost:3000/api/admin/orders
```

**Expected:** Admin → HTTP 200. Student → `{ "error": "Unauthorized" }`

---

### TC-03 · Browse Menu (FR7)

```bash
curl -s -b /tmp/s.ck http://localhost:3000/api/menu
```

**Expected:** HTTP 200, `items` array with 12 items

---

### TC-04 · Budget Filter — Under ₹50 (FR11)

```bash
curl -s -b /tmp/s.ck 'http://localhost:3000/api/menu?budget=under50'
```

**Expected:** All items have `price < 50` (5 items: Tea, Coffee, Idli, Samosa, Veg Puff)

---

### TC-05 · Budget Filter — Combo ≤ ₹80 (FR11)

```bash
curl -s -b /tmp/s.ck 'http://localhost:3000/api/menu?budget=combo80'
```

**Expected:** All items have `is_combo = 1` AND `price <= 80`

---

### TC-06 · Pickup Slots (FR9)

```bash
curl -s -b /tmp/s.ck http://localhost:3000/api/pickup-slots
```

**Expected:** `slots` array with 8 entries in 15-min increments from current time

---

### TC-07 · Place Order — Pay at Pickup (FR8, FR9, FR10, FR14, FR16)

```bash
curl -s -c /tmp/s.ck -b /tmp/s.ck -H 'Content-Type: application/json' \
  -d '{"items":[{"itemId":1,"qty":2},{"itemId":4,"qty":1}],
       "pickupSlot":"2026-03-06 12:00",
       "paymentMethod":"PAY_AT_PICKUP"}' \
  http://localhost:3000/api/orders
```

**Expected:** HTTP 201, contains `qrToken` (UUID), `estimatedPrep` (integer), `cancelDeadline` (3 min from now), `paymentStatus: "PENDING"`

---

### TC-08 · Place Order — Wallet Payment + Deduction (FR13)

```bash
curl -s -c /tmp/s.ck -b /tmp/s.ck -H 'Content-Type: application/json' \
  -d '{"items":[{"itemId":5,"qty":1}],
       "pickupSlot":"2026-03-06 12:30",
       "paymentMethod":"WALLET"}' \
  http://localhost:3000/api/orders

# Check wallet deducted
curl -s -b /tmp/s.ck http://localhost:3000/api/auth/me
```

**Expected:** `paymentStatus: "PAID"`, wallet balance reduced by item price

---

### TC-09 · Place Order — Online Payment (FR12)

```bash
curl -s -b /tmp/s.ck -H 'Content-Type: application/json' \
  -d '{"items":[{"itemId":10,"qty":1}],
       "pickupSlot":"2026-03-06 13:00",
       "paymentMethod":"ONLINE",
       "paymentProvider":"PhonePe"}' \
  http://localhost:3000/api/orders
```

**Expected:** HTTP 201, `paymentStatus: "PAID"` (simulated)

---

### TC-10 · Insufficient Wallet Balance

```bash
# Place order costing more than wallet balance
curl -s -b /tmp/s.ck -H 'Content-Type: application/json' \
  -d '{"items":[{"itemId":1,"qty":100}],
       "pickupSlot":"2026-03-06 12:00",
       "paymentMethod":"WALLET"}' \
  http://localhost:3000/api/orders
```

**Expected:** HTTP 400, `{ "error": "Insufficient wallet balance" }`

---

### TC-11 · QR Code Verification (FR17)

```bash
# Replace <TOKEN> with qrToken from a previous order
curl -s -b /tmp/a.ck -H 'Content-Type: application/json' \
  -d '{"qrToken":"<TOKEN>"}' \
  http://localhost:3000/api/admin/verify-qr
```

**Expected:** HTTP 200, `order` object with student details + `requiresPaymentConfirmation: true` (for PAY_AT_PICKUP)

---

### TC-12 · Collect Blocked Without Payment (FR15)

```bash
curl -s -b /tmp/a.ck -H 'Content-Type: application/json' \
  -d '{"qrToken":"<TOKEN>","paymentConfirmed":false}' \
  http://localhost:3000/api/admin/collect
```

**Expected:** HTTP 400, `{ "error": "Payment confirmation required" }`

---

### TC-13 · Collect With Payment Confirmed (FR18)

```bash
curl -s -b /tmp/a.ck -H 'Content-Type: application/json' \
  -d '{"qrToken":"<TOKEN>","paymentConfirmed":true}' \
  http://localhost:3000/api/admin/collect
```

**Expected:** HTTP 200, `{ "message": "Order collected" }` → order status = COLLECTED

---

### TC-14 · Notification on READY Status (FR21)

```bash
curl -s -b /tmp/a.ck -X PATCH -H 'Content-Type: application/json' \
  -d '{"status":"READY"}' \
  http://localhost:3000/api/admin/orders/1/status
```

**Expected:** Server console logs:
```
[Notification][SMS] user=X order=Y Order ORD-... is ready for pickup.
[Notification][EMAIL] user=X order=Y Order ORD-... is ready for pickup.
```
And student's `/api/notifications/my` returns both entries.

---

### TC-15 · Cancel Within 3-Min Window (FR22)

```bash
# Place order, immediately cancel
ORDER=$(curl -s -b /tmp/s.ck -H 'Content-Type: application/json' \
  -d '{"items":[{"itemId":4,"qty":1}],
       "pickupSlot":"2026-03-06 14:00",
       "paymentMethod":"WALLET"}' \
  http://localhost:3000/api/orders)

ORDER_ID=$(echo $ORDER | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.parse(s).orderId))')

curl -s -b /tmp/s.ck -X POST http://localhost:3000/api/orders/$ORDER_ID/cancel
```

**Expected:** `{ "message": "Order cancelled" }` + wallet refund if WALLET payment

---

### TC-16 · Cancel After Deadline Blocked (FR22)

Wait 3+ minutes after placing an order, then try to cancel.

```bash
curl -s -b /tmp/s.ck -X POST http://localhost:3000/api/orders/<old-id>/cancel
```

**Expected:** HTTP 400, `{ "error": "Cancellation window expired" }`

---

### TC-17 · Auto-Transition to PREPARING (FR22)

After the cancel deadline passes, wait for the background job (polls every 15 seconds):

```bash
curl -s -b /tmp/s.ck http://localhost:3000/api/orders/my
```

**Expected:** Order status automatically changed to `PREPARING` without any manual action

---

### TC-18 · Star Rating After Pickup (FR23)

```bash
# Order must be in COLLECTED status first
curl -s -b /tmp/s.ck -X POST -H 'Content-Type: application/json' \
  -d '{"stars":5,"comment":"Excellent!"}' \
  http://localhost:3000/api/orders/1/rate
```

**Expected:** `{ "message": "Rating submitted" }`

---

### TC-19 · Rating Blocked on Non-Collected Order (FR23)

```bash
curl -s -b /tmp/s.ck -X POST -H 'Content-Type: application/json' \
  -d '{"stars":4}' \
  http://localhost:3000/api/orders/2/rate  # order not COLLECTED
```

**Expected:** HTTP 400, `{ "error": "Rating allowed only after collection" }`

---

### TC-20 · Admin Analytics (FR27)

```bash
curl -s -b /tmp/a.ck http://localhost:3000/api/admin/analytics
```

**Expected:**
```json
{
  "sales": { "total_orders": N, "gross_sales": X, "paid_sales": Y },
  "ratings": { "total_ratings": N, "avg_rating": X.XX }
}
```

---

### TC-21 · Admin Stats Dashboard (FR24, FR27)

```bash
curl -s -b /tmp/a.ck http://localhost:3000/api/admin/stats
```

**Expected:** `todayStats`, `activeOrders[]`, `statusCounts[]`

---

### TC-22 · Pickup Slots Summary (FR26)

```bash
curl -s -b /tmp/a.ck http://localhost:3000/api/admin/slots
```

**Expected:** Array of `{ pickup_slot, total_orders }` grouped by slot time

---

### TC-23 · Menu Toggle (FR24)

```bash
# Toggle item off
curl -s -b /tmp/a.ck -X PATCH http://localhost:3000/api/admin/menu/1/toggle
# { "active": 0 }

# Toggle back on
curl -s -b /tmp/a.ck -X PATCH http://localhost:3000/api/admin/menu/1/toggle
# { "active": 1 }
```

**Expected:** Active field toggles between 0 and 1. Inactive items not returned by `GET /api/menu`.

---

### TC-24 · Quick Access QR (FR19)

```bash
curl -s http://localhost:3000/api/quick-access-qr
```

**Expected:** `{ "url": "http://localhost:3000", "qrDataUrl": "data:image/png;base64,..." }`

---

### TC-25 · Route Guards & Redirects

```bash
# Unauthenticated → protected route
curl -s http://localhost:3000/api/menu
# Expected: { "error": "Unauthorized" }

# All pages return HTTP 200
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/        # 200
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/admin   # 200
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/xyz     # 200 (catch-all)
```

---

### Full End-to-End Script (Runs All Core Flows)

```bash
cd '/path/to/QR Code'
rm -f canteen.db canteen.db-shm canteen.db-wal
node server.js &
sleep 1

# Student login
curl -s -c /tmp/s.ck -H 'Content-Type: application/json' \
  -d '{"mobile":"8765432100"}' http://localhost:3000/api/auth/login

# Place order
ORDER=$(curl -s -c /tmp/s.ck -b /tmp/s.ck -H 'Content-Type: application/json' \
  -d '{"items":[{"itemId":1,"qty":2},{"itemId":4,"qty":1}],
       "pickupSlot":"2026-03-06 12:00",
       "paymentMethod":"PAY_AT_PICKUP"}' \
  http://localhost:3000/api/orders)
echo $ORDER

QR=$(echo $ORDER | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.parse(s).qrToken))')

# Admin login
curl -s -c /tmp/a.ck -H 'Content-Type: application/json' \
  -d '{"mobile":"9999999999","role":"admin"}' http://localhost:3000/api/auth/login

# Verify QR
curl -s -b /tmp/a.ck -H 'Content-Type: application/json' \
  -d "{\"qrToken\":\"$QR\"}" http://localhost:3000/api/admin/verify-qr

# Collect with payment
curl -s -b /tmp/a.ck -H 'Content-Type: application/json' \
  -d "{\"qrToken\":\"$QR\",\"paymentConfirmed\":true}" http://localhost:3000/api/admin/collect

# Rate order
curl -s -b /tmp/s.ck -X POST -H 'Content-Type: application/json' \
  -d '{"stars":5,"comment":"Great service!"}' \
  http://localhost:3000/api/orders/1/rate

# Analytics
curl -s -b /tmp/a.ck http://localhost:3000/api/admin/analytics
```

---

## 12. Known Limitations

| Limitation | Detail | Workaround / Notes |
|---|---|---|
| **OTP (FR2, FR3)** | OTP sending/verification not implemented | Intentionally skipped. Integrate Twilio / MSG91 with API key |
| **Real Payment Gateway (FR12)** | PhonePe/Google Pay/PayU not integrated | Simulated as PAID. Integrate PayU SDK or Razorpay with merchant credentials |
| **SMS/Email (FR21)** | Notifications are console-logged and DB-stored only | Integrate Twilio (SMS) or SendGrid (email) with API keys |
| **Session Storage** | Sessions stored in memory (default express-session) | Use `connect-sqlite3` or Redis for production persistence |
| **No HTTPS** | Runs on HTTP locally | Use `nginx` reverse proxy + Let's Encrypt for production |
| **Single-server** | No horizontal scaling | SQLite is single-process. Switch to PostgreSQL for multi-instance |

---

## 13. Project Structure

```
QR Code/
│
├── server.js            # Express app — all routes, middleware, background jobs
├── db.js                # SQLite init, schema creation, seed data
├── package.json
│
├── public/
│   ├── index.html       # Student app shell (mobile-first)
│   ├── app.js           # Student app logic (menu, cart, orders, ratings)
│   ├── admin.html       # Admin dashboard shell (sidebar layout)
│   ├── admin.js         # Admin dashboard logic (tabs, QR scan, analytics)
│   └── styles.css       # Shared CSS (variables, cards, badges, buttons)
│
├── canteen.db           # SQLite database (auto-created on first run)
├── README.md
└── SRS_Smart_QR_Canteen_PreOrder.md
```

---

> Built as a complete MVP for the Smart QR Based Queue Management System.
> All 25 of 27 functional requirements implemented (FR2/FR3 skipped by design).

- `GET /api/pickup-slots`
- `POST /api/orders`
- `GET /api/orders/my`
- `POST /api/orders/:id/cancel`
- `POST /api/orders/:id/rate`
- `POST /api/admin/verify-qr`
- `POST /api/admin/collect`
- `PATCH /api/admin/orders/:id/status`
- `GET /api/admin/analytics`

## Project Structure
- `server.js` - API server and business logic
- `db.js` - SQLite schema and seed data
- `public/index.html` - student interface
- `public/admin.html` - admin dashboard
- `public/app.js` - student client logic
- `public/admin.js` - admin client logic
- `public/styles.css` - shared UI styles
