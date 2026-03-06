const state = {
  user: null,
  menu: [],
  cart: new Map(),
  slots: []
};

const el = (id) => document.getElementById(id);

function toast(msg) {
  const t = el('toast');
  t.textContent = msg;
  t.style.display = 'block';
  setTimeout(() => {
    t.style.display = 'none';
  }, 2300);
}

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

function renderProfile() {
  const loggedIn = !!state.user;
  el('loginCard').classList.toggle('hidden', loggedIn);
  el('profileCard').classList.toggle('hidden', !loggedIn);
  el('menuCard').classList.toggle('hidden', !loggedIn);
  el('ordersCard').classList.toggle('hidden', !loggedIn);
  el('notificationsCard').classList.toggle('hidden', !loggedIn);
  el('quickQrCard').classList.toggle('hidden', !loggedIn);

  if (loggedIn) {
    el('userInfo').textContent = `${state.user.name} (${state.user.mobile}) | Wallet: Rs.${Number(
      state.user.wallet_balance || 0
    ).toFixed(2)}`;
  }
}

function computeTotals() {
  let total = 0;
  let prep = 0;
  for (const item of state.menu) {
    const qty = state.cart.get(item.id) || 0;
    total += qty * item.price;
    if (qty > 0) prep = Math.max(prep, item.prep_time_min);
  }
  el('totalAmount').textContent = total.toFixed(2);
  el('estPrep').textContent = total > 0 ? prep + 3 : 0;
}

function renderMenu() {
  const body = el('menuBody');
  body.innerHTML = '';

  for (const item of state.menu) {
    const tr = document.createElement('tr');
    const qty = state.cart.get(item.id) || 0;
    tr.innerHTML = `
      <td>${item.name}</td>
      <td>${item.category}</td>
      <td>Rs.${item.price}</td>
      <td>${item.prep_time_min}</td>
      <td><input type="number" min="0" value="${qty}" style="width: 70px" data-item-id="${item.id}" /></td>
    `;
    body.appendChild(tr);
  }

  body.querySelectorAll('input[data-item-id]').forEach((input) => {
    input.addEventListener('change', () => {
      const id = Number(input.dataset.itemId);
      const qty = Math.max(0, Number(input.value || 0));
      state.cart.set(id, qty);
      computeTotals();
    });
  });

  computeTotals();
}

function renderSlots() {
  el('pickupSlot').innerHTML = state.slots.map((s) => `<option>${s}</option>`).join('');
}

function orderCard(order) {
  const now = Date.now();
  const canCancel =
    order.order_status === 'RECEIVED' && new Date(order.cancel_deadline).getTime() > now;

  const canRate = order.order_status === 'COLLECTED';

  return `
    <div class="card" style="margin-bottom: 10px">
      <p><b>${order.order_code}</b> | <span class="badge status-${order.order_status}">${order.order_status}</span></p>
      <p>Amount: Rs.${Number(order.total_amount).toFixed(2)} | Payment: ${order.payment_method} (${order.payment_status})</p>
      <p>Pickup: ${order.pickup_slot} | Est Prep: ${order.estimated_prep_min} min</p>
      <img class="qr-img" src="${order.qr_data_url}" alt="Order QR" />
      <div class="row" style="margin-top: 8px">
        <button data-cancel-id="${order.id}" class="danger" ${canCancel ? '' : 'disabled'}>Cancel</button>
        <select data-rate-id="${order.id}" ${canRate ? '' : 'disabled'}>
          <option value="">Rate</option>
          <option value="1">1</option>
          <option value="2">2</option>
          <option value="3">3</option>
          <option value="4">4</option>
          <option value="5">5</option>
        </select>
      </div>
    </div>
  `;
}

async function loadOrders() {
  const data = await api('/api/orders/my');
  el('ordersWrap').innerHTML = data.orders.map(orderCard).join('') || '<p>No orders yet.</p>';

  document.querySelectorAll('[data-cancel-id]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      try {
        await api(`/api/orders/${btn.dataset.cancelId}/cancel`, 'POST');
        toast('Order cancelled');
        await refreshAll();
      } catch (e) {
        toast(e.message);
      }
    });
  });

  document.querySelectorAll('[data-rate-id]').forEach((select) => {
    select.addEventListener('change', async () => {
      if (!select.value) return;
      try {
        await api(`/api/orders/${select.dataset.rateId}/rate`, 'POST', { stars: Number(select.value) });
        toast('Rating saved');
        await loadOrders();
      } catch (e) {
        toast(e.message);
      }
    });
  });
}

async function loadNotifications() {
  const data = await api('/api/notifications/my');
  const list = data.notifications
    .map((n) => `<li>[${n.channel}] ${n.message} (${new Date(n.sent_at).toLocaleString()})</li>`)
    .join('');
  el('notificationList').innerHTML = list || '<li>No notifications yet.</li>';
}

async function loadQuickQr() {
  const data = await api('/api/quick-access-qr');
  el('quickQr').src = data.qrDataUrl;
}

async function refreshAll() {
  const me = await api('/api/auth/me');
  state.user = me.user;
  renderProfile();
  if (!state.user) return;

  const budget = el('budgetFilter').value;
  const menu = await api(`/api/menu?budget=${budget}`);
  state.menu = menu.items;

  const slots = await api('/api/pickup-slots');
  state.slots = slots.slots;

  renderMenu();
  renderSlots();
  await loadOrders();
  await loadNotifications();
  await loadQuickQr();
}

el('loginBtn').addEventListener('click', async () => {
  try {
    const data = await api('/api/auth/login', 'POST', { mobile: el('mobile').value, role: 'student' });
    // If this number is an admin account, redirect to admin panel automatically
    if (data.user && data.user.role === 'admin') {
      window.location.href = '/admin';
      return;
    }
    toast('Logged in');
    await refreshAll();
  } catch (e) {
    toast(e.message);
  }
});

el('logoutBtn').addEventListener('click', async () => {
  await api('/api/auth/logout', 'POST');
  state.user = null;
  state.menu = [];
  state.cart.clear();
  renderProfile();
  toast('Logged out');
});

el('budgetFilter').addEventListener('change', refreshAll);

el('paymentMethod').addEventListener('change', () => {
  const method = el('paymentMethod').value;
  el('providerWrap').classList.toggle('hidden', method !== 'ONLINE');
});

el('placeOrderBtn').addEventListener('click', async () => {
  try {
    const items = [];
    state.cart.forEach((qty, itemId) => {
      if (qty > 0) items.push({ itemId, qty });
    });

    if (items.length === 0) {
      toast('Choose at least one item');
      return;
    }

    const payload = {
      items,
      pickupSlot: el('pickupSlot').value,
      paymentMethod: el('paymentMethod').value,
      paymentProvider: el('paymentMethod').value === 'ONLINE' ? el('paymentProvider').value : null
    };

    const result = await api('/api/orders', 'POST', payload);
    toast(`Order placed: ${result.orderCode}`);
    state.cart.clear();
    await refreshAll();
  } catch (e) {
    toast(e.message);
  }
});

// On page load: if already logged in as admin, redirect to admin panel
refreshAll().catch(() => {
  renderProfile();
});

(async () => {
  try {
    const me = await api('/api/auth/me');
    if (me.user && me.user.role === 'admin') {
      window.location.href = '/admin';
    }
  } catch (_) {}
})();

setInterval(() => {
  if (state.user) {
    loadOrders().catch(() => {});
  }
}, 10000);
