/* =========================================================
   DEMO CONTROLS — simulates the Seller app (outside the phone UI)
   ========================================================= */
const DEMO = { orderId: 'HF-1002', listingId: 'L4', stockN: 5, price: '', reason: 'stock', open: false };
const DECLINE_REASONS = {
  stock: { km: 'អស់ស្តុក', en: 'Out of stock' },
  quality: { km: 'គុណភាពមិនល្អគ្រប់គ្រាន់', en: 'Quality not good enough' },
  delivery: { km: 'មិនអាចដឹកជញ្ជូនទៅតំបន់នេះ', en: 'Cannot deliver to this area' },
};

function renderDemo() {
  const el = document.getElementById('demo-panel');
  if (!el) return;
  if (!order(DEMO.orderId)) DEMO.orderId = DB.orders[0].id;
  const simListings = DB.listings.filter((x) => !x.linked);
  if (!listing(DEMO.listingId) || listing(DEMO.listingId).linked) DEMO.listingId = simListings[0].id;
  const o = order(DEMO.orderId);
  const l = listing(DEMO.listingId);
  const act = (a, label, ic) => `<button class="dbtn" data-action="demoOrder" data-a="${a}" ${SellerSim.can(o, a) ? '' : 'disabled'}>${icon(ic, 15)} ${label}</button>`;
  el.innerHTML = `<div class="demo-inner">
    <div class="demo-h"><b>Demo controls</b><small>Simulates the other cooperatives. ${Link.enabled() ? `<b>${esc(shop(LINK_SHOP).name.en)}</b> is real — use the Seller app.` : ''}</small>
      <button class="demo-x" data-action="demoToggle" aria-label="close">${icon('close', 18)}</button></div>

    <section><h4>1 · Order status</h4>
      <select data-bind="orderId" data-scope="demo">${DB.orders.map((x) => `<option value="${x.id}" ${x.id === DEMO.orderId ? 'selected' : ''}>#${x.id} · ${esc(shop(x.shopId).name.en)} · ${x.status}</option>`).join('')}</select>
      <div class="demo-status">Now: <b>${o.status}</b> ${o.status === 'pending' ? '→ next: Accept' : o.status === 'accepted' ? '→ next: Mark Preparing' : o.status === 'preparing' ? '→ next: Mark Dispatched' : o.status === 'dispatched' ? '→ next: Mark Delivered' : o.status === 'delivered' ? '✓ finished — shows in History' : ''}</div>
      ${o.linked ? `<div class="demo-linked">This order went to the linked Seller app. Move it there: Accept → checklist → Start delivery → Complete.</div>` : ''}
      <div class="dgrid">${act('accept', 'Accept', 'check')}${act('preparing', 'Mark Preparing', 'box')}${act('dispatch', 'Mark Dispatched', 'truck')}${act('deliver', 'Mark Delivered', 'bell')}${act('expire', 'Expire', 'clock')}</div>
      <div class="drow"><select data-bind="reason" data-scope="demo">${Object.keys(DECLINE_REASONS).map((k) => `<option value="${k}" ${DEMO.reason === k ? 'selected' : ''}>${DECLINE_REASONS[k].en}</option>`).join('')}</select>
        ${act('decline', 'Decline', 'close')}</div>
    </section>

    <section><h4>2 · Stock &amp; price</h4>
      <select data-bind="listingId" data-scope="demo">${simListings.map((x) => `<option value="${x.id}" ${x.id === DEMO.listingId ? 'selected' : ''}>${x.id} · ${esc(product(x.product).name.en)} · ${esc(shop(x.shopId).name.en)} (${x.stock} kg, $${x.price.toFixed(2)}${x.available ? '' : ', unavailable'})</option>`).join('')}</select>
      <div class="drow"><label>Stock to <input type="number" min="0" value="${DEMO.stockN}" data-bind="stockN" data-scope="demo"> kg</label><button class="dbtn" data-action="demoStock">Reduce stock</button></div>
      <div class="drow"><label>Price $ <input type="number" min="0" step="0.05" value="${DEMO.price === '' ? l.price.toFixed(2) : DEMO.price}" data-bind="price" data-scope="demo"></label><button class="dbtn" data-action="demoPrice">Change price</button></div>
      <button class="dbtn wide" data-action="demoAvail">${l.available ? 'Make listing unavailable' : 'Make listing available again'}</button>
    </section>

    <section><h4>3 · Errors &amp; session</h4>
      <label class="dsw"><input type="checkbox" data-action="demoSwitch" data-k="networkError" ${S.demo.networkError ? 'checked' : ''}> Simulate network error</label>
      <label class="dsw"><input type="checkbox" data-action="demoSwitch" data-k="paymentFail" ${S.demo.paymentFail ? 'checked' : ''}> Simulate payment failure</label>
      <div class="dgrid"><button class="dbtn" data-action="demoExpireSession" ${S.session ? '' : 'disabled'}>Expire session</button><button class="dbtn warn" data-action="demoReset">Reset demo (both apps)</button></div>
    </section>
    <p class="demo-foot">Linked demo: open the Seller app in a second window (same browser). Order tomatoes from <b>${Link.enabled() ? esc(shop(LINK_SHOP).name.en) : 'the linked co-op'}</b> here → accept and deliver it in the Seller app → it updates here live. Other shops are moved with the buttons above.</p>
  </div>`;
}

/** Tell the buyer when an item in the basket changed. */
function notifyBasketChange(l, kind) {
  const inCart = S.cart.some((c) => c.listingId === l.id);
  if (!inCart) return;
  const p = product(l.product);
  if (kind === 'stock') notify('stock', null, { km: `${p.name.km} ក្នុងកន្ត្រក៖ នៅសល់តែ ${l.stock} kg`, en: `${p.name.en} in your basket: only ${l.stock} kg left` });
  if (kind === 'unavailable') notify('stock', null, { km: `${p.name.km} ក្នុងកន្ត្រកលែងមានហើយ`, en: `${p.name.en} in your basket is no longer available` });
  if (kind === 'price') notify('price', null, { km: `តម្លៃ ${p.name.km} បានប្តូរទៅ $${l.price.toFixed(2)}/kg`, en: `${p.name.en} price changed to $${l.price.toFixed(2)}/kg` });
}
