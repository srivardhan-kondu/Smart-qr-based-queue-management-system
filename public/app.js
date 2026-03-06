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

