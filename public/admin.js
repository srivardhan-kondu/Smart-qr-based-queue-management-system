/* ════════════════════════════════════════════
   Smart Canteen — Admin Dashboard JS
════════════════════════════════════════════ */
const state = {
  user: null,
  orders: [],
  currentFilter: 'ALL',
  currentQrToken: '',
  autoRefreshTimer: null
};

const $ = (id) => document.getElementById(id);

/* ── Toast ── */
function toast(msg, type = 'info') {
  const t = $('toast');
  t.textContent = msg;
  t.style.background =
    type === 'error'   ? '#ef4444' :
    type === 'success' ? '#10b981' : '#1e293b';
  t.style.display = 'block';
  clearTimeout(t._t);
  t._t = setTimeout(() => { t.style.display = 'none'; }, 2600);
}

/* ── API helper ── */
async function api(path, method = 'GET', body) {
  const res = await fetch(path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

/* ── Tab switching ── */
function switchTab(name) {
  document.querySelectorAll('.tab-content').forEach((el) => el.classList.remove('active'));
  document.querySelectorAll('.nav-btn[data-tab]').forEach((btn) => btn.classList.remove('active'));
  $('tab-' + name).classList.add('active');
  document.querySelector(`.nav-btn[data-tab="${name}"]`).classList.add('active');
  if (name === 'dashboard') loadDashboard();
  else if (name === 'orders') loadOrders();
  else if (name === 'menu') loadMenu();
  else if (name === 'analytics') loadAnalytics();
}

/* ── Relative time helper ── */
function timeAgo(iso) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (diff < 1) return 'just now';
  if (diff < 60) return diff + 'm ago';
  if (diff < 1440) return Math.floor(diff / 60) + 'h ago';
  return Math.floor(diff / 1440) + 'd ago';
}

/* ════ DASHBOARD ════ */
async function loadDashboard() {
  try {
    const [stats, analytics] = await Promise.all([
      api('/api/admin/stats'),
      api('/api/admin/analytics')
    ]);

    $('statTodayOrders').textContent = stats.todayStats.today_orders;
    $('statAllOrders').textContent   = analytics.sales.total_orders;
    $('statTodayRev').textContent    = '₹' + Number(stats.todayStats.today_revenue).toFixed(0);
    $('statTotalRev').textContent    = '₹' + Number(analytics.sales.gross_sales).toFixed(0);
    $('statActive').textContent      = stats.activeOrders.length;
    $('statRating').textContent      = analytics.ratings.avg_rating || '–';
    $('statRatingCount').textContent = analytics.ratings.total_ratings;

    /* sidebar badge */
    const badge = $('badgeActive');
    if (stats.activeOrders.length > 0) {
      badge.textContent = stats.activeOrders.length;
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }

    /* action orders list */
    const wrap = $('actionOrdersWrap');
    if (stats.activeOrders.length === 0) {
      wrap.innerHTML = '<p style="text-align:center;padding:24px 0;color:#94a3b8;font-size:.85rem">🎉 No active orders right now!</p>';
    } else {
      wrap.innerHTML = stats.activeOrders.map((o) => `
        <div class="act-order">
          <div>
            <div class="act-order-code">${o.order_code}</div>
            <div class="act-order-info">${o.name} &middot; ₹${Number(o.total_amount).toFixed(0)} &middot; ${o.pickup_slot}</div>
          </div>
          <div class="act-order-right">
            <span class="badge b-${o.order_status}">${o.order_status}</span>
            <select class="status-sel" onchange="quickStatus(this, ${o.id})">
              <option value="">Update →</option>
              <option value="PREPARING">→ PREPARING</option>
              <option value="READY">→ READY</option>
              <option value="COLLECTED">→ COLLECTED</option>
              <option value="CANCELLED">→ CANCELLED</option>
            </select>
          </div>
        </div>
      `).join('');
    }
  } catch (e) {
    toast('Dashboard error: ' + e.message, 'error');
  }
}

async function quickStatus(select, orderId) {
  if (!select.value) return;
  try {
    await api(`/api/admin/orders/${orderId}/status`, 'PATCH', { status: select.value });
    toast('Status → ' + select.value, 'success');
    loadDashboard();
  } catch (e) {
    toast(e.message, 'error');
    select.value = '';
  }
}

/* ════ ORDERS ════ */
async function loadOrders() {
  try {
    const data = await api('/api/admin/orders');
    state.orders = data.orders;
    renderOrders();
  } catch (e) {
    toast('Orders error: ' + e.message, 'error');
  }
}

function renderOrders() {
  const list =
    state.currentFilter === 'ALL'
      ? state.orders
      : state.orders.filter((o) => o.order_status === state.currentFilter);

  const tbody = $('ordersBody');
  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:32px;color:#94a3b8">No orders${state.currentFilter !== 'ALL' ? ' with status ' + state.currentFilter : ''}.</td></tr>`;
    return;
  }

  tbody.innerHTML = list.map((o) => `
    <tr>
      <td style="color:#94a3b8;font-size:.75rem">#${o.id}</td>
      <td>
        <strong style="font-size:.85rem">${o.order_code}</strong>
        <div style="font-size:.72rem;color:#94a3b8">${timeAgo(o.created_at)}</div>
      </td>
      <td>
        <div style="font-weight:600">${o.name}</div>
        <div style="font-size:.72rem;color:#94a3b8">${o.mobile}</div>
      </td>
      <td><strong>₹${Number(o.total_amount).toFixed(0)}</strong></td>
      <td>
        <span class="badge b-${o.payment_method}">${o.payment_method.replace(/_/g, ' ')}</span>
        <div style="margin-top:3px"><span class="badge b-${o.payment_status}" style="font-size:.62rem">${o.payment_status}</span></div>
      </td>
      <td><span class="badge b-${o.order_status}">${o.order_status}</span></td>
      <td style="font-size:.78rem;white-space:nowrap">${o.pickup_slot}</td>
      <td>
        <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center">
          <select class="status-sel" onchange="updateStatus(this, ${o.id})">
            <option value="">Status…</option>
            <option value="RECEIVED">RECEIVED</option>
            <option value="PREPARING">PREPARING</option>
            <option value="READY">READY</option>
            <option value="COLLECTED">COLLECTED</option>
            <option value="CANCELLED">CANCELLED</option>
          </select>
          ${o.payment_status === 'PENDING' ? `<button class="btn btn-warning btn-xs" onclick="confirmPay(${o.id})">Confirm Pay</button>` : ''}
        </div>
      </td>
    </tr>
  `).join('');
}

async function updateStatus(select, orderId) {
  if (!select.value) return;
  try {
    await api(`/api/admin/orders/${orderId}/status`, 'PATCH', { status: select.value });
    toast('Status updated to ' + select.value, 'success');
    loadOrders();
  } catch (e) {
    toast(e.message, 'error');
    select.value = '';
  }
}

async function confirmPay(orderId) {
  try {
    await api(`/api/admin/orders/${orderId}/confirm-payment`, 'POST');
    toast('Payment confirmed ✓', 'success');
    loadOrders();
  } catch (e) {
    toast(e.message, 'error');
  }
}

/* ════ QR SCAN ════ */
function showQrResult(order) {
  state.currentQrToken = order.qr_token;
  $('qrEmptyPanel').style.display = 'none';
  $('qrResultPanel').style.display = 'block';

  const needsPay = order.payment_method === 'PAY_AT_PICKUP' && order.payment_status !== 'PAID';
  $('paymentConfirmed').checked = !needsPay;

  $('qrResultDetails').innerHTML = [
    ['Order Code', order.order_code],
    ['Student',    order.name + ' (' + order.mobile + ')'],
    ['Amount',     '₹' + Number(order.total_amount).toFixed(2)],
    ['Payment',    `<span class="badge b-${order.payment_method}">${order.payment_method.replace(/_/g,' ')}</span> <span class="badge b-${order.payment_status}" style="margin-left:4px">${order.payment_status}</span>`],
    ['Status',     `<span class="badge b-${order.order_status}">${order.order_status}</span>`],
    ['Pickup Slot', order.pickup_slot]
  ].map(([lbl, val]) => `
    <div class="qr-row">
      <span class="qr-lbl">${lbl}</span>
      <span class="qr-val">${val}</span>
    </div>
  `).join('');

  if (needsPay) toast('⚠️ Collect cash before marking collected', 'error');
}

/* ════ MENU ════ */
async function loadMenu() {
  try {
    const data = await api('/api/admin/menu-all');
    renderMenu(data.items || []);
  } catch (e) {
    toast('Menu error: ' + e.message, 'error');
  }
}

function renderMenu(items) {
  if (items.length === 0) { $('menuGrid').innerHTML = '<p style="color:#94a3b8">No menu items.</p>'; return; }
  $('menuGrid').innerHTML = items.map((item) => `
    <div class="menu-card ${item.active ? '' : 'off'}">
      <button class="toggle-pill ${item.active ? 'on' : 'off'}" onclick="toggleItem(${item.id})">
        ${item.active ? 'Active' : 'Off'}
      </button>
      <div class="menu-name">${item.name}</div>
      <div class="menu-cat">${item.category}</div>
      <div class="menu-price">₹${item.price}</div>
      <div class="menu-meta">⏱ ${item.prep_time_min} min${item.is_combo ? ' · 🎁 Combo' : ''}</div>
    </div>
  `).join('');
}

async function toggleItem(id) {
  try {
    const data = await api(`/api/admin/menu/${id}/toggle`, 'PATCH');
    toast(data.active ? 'Item activated ✓' : 'Item deactivated', data.active ? 'success' : 'info');
    loadMenu();
  } catch (e) {
    toast(e.message, 'error');
  }
}

/* ════ ANALYTICS ════ */
async function loadAnalytics() {
  try {
    const [analytics, slots, stats] = await Promise.all([
      api('/api/admin/analytics'),
      api('/api/admin/slots'),
      api('/api/admin/stats')
    ]);

    $('anGross').textContent      = '₹' + Number(analytics.sales.gross_sales).toFixed(0);
    $('anPaid').textContent       = '₹' + Number(analytics.sales.paid_sales).toFixed(0);
    $('anOrders').textContent     = analytics.sales.total_orders;
    $('anRating').textContent     = analytics.ratings.avg_rating || '–';
    $('anRatingCount').textContent = analytics.ratings.total_ratings;

    /* status breakdown bars */
    const total = analytics.sales.total_orders || 1;
    const counts = {};
    (stats.statusCounts || []).forEach((s) => { counts[s.order_status] = s.count; });
    const colors = { RECEIVED: '#3b82f6', PREPARING: '#f97316', READY: '#22c55e', COLLECTED: '#10b981', CANCELLED: '#ef4444' };
    $('statusBreakdown').innerHTML = ['RECEIVED', 'PREPARING', 'READY', 'COLLECTED', 'CANCELLED'].map((s) => {
      const cnt = counts[s] || 0;
      const pct = Math.round((cnt / total) * 100);
      return `<div class="bar-row">
        <span class="bar-lbl">${s}</span>
        <div class="bar-track"><div class="bar-fill" style="width:${pct}%;background:${colors[s]}"></div></div>
        <span class="bar-cnt">${cnt}</span>
      </div>`;
    }).join('');

    /* slots */
    if (slots.slots.length === 0) {
      $('slotsBreakdown').innerHTML = '<p style="color:#94a3b8;font-size:.85rem">No slot data yet.</p>';
    } else {
      $('slotsBreakdown').innerHTML = slots.slots.slice(0, 12).map((s) => `
        <div class="slot-row"><span>${s.pickup_slot}</span><strong>${s.total_orders} orders</strong></div>
      `).join('');
    }
  } catch (e) {
    toast('Analytics error: ' + e.message, 'error');
  }
}

/* ════ AUTH ════ */
async function refreshAdmin() {
  const me = await api('/api/auth/me');
  state.user = me.user;
  if (!state.user) {
    showLogin();
    return;
  }
  if (state.user.role !== 'admin') {
    // Student visiting /admin — send them to student app
    window.location.href = '/';
    return;
  }
  showApp();
  $('adminInfoSidebar').textContent = state.user.name + ' (' + state.user.mobile + ')';
  loadDashboard();
}

function showLogin() {
  $('loginScreen').classList.remove('hidden');
  $('appShell').classList.add('hidden');
  if (state.autoRefreshTimer) clearInterval(state.autoRefreshTimer);
}

function showApp() {
  $('loginScreen').classList.add('hidden');
  $('appShell').classList.remove('hidden');
  if (!state.autoRefreshTimer) {
    state.autoRefreshTimer = setInterval(() => {
      if ($('tab-dashboard').classList.contains('active')) loadDashboard();
    }, 30000);
  }
}

/* ════ EVENT LISTENERS ════ */
$('adminLoginBtn').addEventListener('click', async () => {
  try {
    await api('/api/auth/login', 'POST', { mobile: $('adminMobile').value.trim(), role: 'admin' });
    toast('Welcome back, Admin! 👋', 'success');
    await refreshAdmin();
  } catch (e) {
    toast(e.message, 'error');
  }
});

$('adminMobile').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('adminLoginBtn').click(); });

$('logoutBtn').addEventListener('click', async () => {
  await api('/api/auth/logout', 'POST').catch(() => {});
  state.user = null;
  toast('Logged out');
  setTimeout(() => { window.location.href = '/'; }, 800);
});

document.querySelectorAll('.nav-btn[data-tab]').forEach((btn) => {
  btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});

$('refreshDashBtn').addEventListener('click', loadDashboard);
$('refreshOrdersBtn').addEventListener('click', loadOrders);
$('refreshMenuBtn').addEventListener('click', loadMenu);
$('refreshAnalyticsBtn').addEventListener('click', loadAnalytics);

/* filter buttons */
document.querySelectorAll('.fbtn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.fbtn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    state.currentFilter = btn.dataset.filter;
    renderOrders();
  });
});

/* QR verify */
$('verifyQrBtn').addEventListener('click', async () => {
  const token = $('qrTokenInput').value.trim();
  if (!token) { toast('Enter a QR token first', 'error'); return; }
  try {
    const data = await api('/api/admin/verify-qr', 'POST', { qrToken: token });
    showQrResult(data.order);
    toast('QR verified ✓', 'success');
  } catch (e) {
    toast(e.message, 'error');
  }
});

$('qrTokenInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('verifyQrBtn').click(); });

/* collect */
$('collectBtn').addEventListener('click', async () => {
  if (!state.currentQrToken) { toast('No order verified yet', 'error'); return; }
  try {
    await api('/api/admin/collect', 'POST', {
      qrToken: state.currentQrToken,
      paymentConfirmed: $('paymentConfirmed').checked
    });
    toast('Order collected! ✓', 'success');
    $('qrResultPanel').style.display = 'none';
    $('qrEmptyPanel').style.display = 'block';
    $('qrTokenInput').value = '';
    state.currentQrToken = '';
    loadDashboard();
  } catch (e) {
    toast(e.message, 'error');
  }
});

/* ════ INIT ════ */
window.addEventListener('load', async () => {
  await refreshAdmin().catch(() => {});

  /* QR camera scanner */
  if (window.Html5Qrcode) {
    const scanner = new window.Html5Qrcode('reader');
    scanner
      .start(
        { facingMode: 'environment' },
        { fps: 8, qrbox: 200 },
        (decoded) => {
          try {
            const payload = JSON.parse(decoded);
            if (payload.qrToken) {
              $('qrTokenInput').value = payload.qrToken;
              $('verifyQrBtn').click();
            }
          } catch (_) {
            $('qrTokenInput').value = decoded;
          }
        },
        () => {}
      )
      .catch(() => {});
  }
});
