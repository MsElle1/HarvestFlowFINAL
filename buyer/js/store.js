/* =========================================================
   STORE — central state + business logic.
   Saved in this browser (key hf_buyer_v1) so a refresh keeps the
   basket, orders and login. Fresh demo data every new day.
   ========================================================= */

let DB = buildSeed();

const S = {
  session: null,          // { phone, verified }
  cart: [],               // [{ key, listingId, dealId, qty, priceAtAdd, notice }]
  shopNotes: {},          // shopId → note to the cooperative
  shopTicked: {},         // shopId → ticked in basket
  buyNow: null,           // single line used by Buy Now (basket untouched)
  checkout: null,         // current checkout draft
  lastSubmitted: null,    // result shown on Order Submitted
  route: { name: 'splash', params: {} },
  stack: [],
  returnTo: null,         // route to return to after session expiry
  demo: { networkError: false, paymentFail: false },
  ui: {
    browseCat: 'all', browseQuery: '',
    dealFilter: 'all',
    ordersTab: 'active', ordersFilter: null,
    sort: 'relevance',        // Relevance | Price | Rating | Discount (search results + browse)
    searchText: '',
    notifOn: true,
  },
};

/* ---------------- saving (this browser only) ---------------- */
const Saved = {
  load() {
    try {
      const raw = localStorage.getItem('hf_buyer_v1');
      if (!raw) return false;
      const x = JSON.parse(raw);
      if (!x || x.v !== 1 || x.day !== localDay(0) || !x.DB) return false;
      DB = x.DB; S.cart = x.cart || []; S.shopNotes = x.shopNotes || {}; S.shopTicked = x.shopTicked || {}; S.session = x.session || null;
      return true;
    } catch (e) { console.warn('Saved buyer data unreadable, using demo data', e); return false; }
  },
  save() {
    try {
      localStorage.setItem('hf_buyer_v1', JSON.stringify({ v: 1, day: localDay(0), DB, cart: S.cart, shopNotes: S.shopNotes, shopTicked: S.shopTicked, session: S.session }));
    } catch (e) { /* storage full or blocked — the app still works in memory */ }
  },
};

/* ---------------- selectors ---------------- */
const byId = (arr, id) => arr.find((x) => x.id === id);
const shop = (id) => byId(DB.shops, id);
const listing = (id) => byId(DB.listings, id);
const deal = (id) => byId(DB.deals, id);
const order = (id) => byId(DB.orders, id);
const product = (key) => DB.products[key];
const address = (id) => byId(DB.addresses, id);
const r2 = (v) => Math.round(v * 100) / 100;

function parseDay(iso) { const [y, m, d] = iso.slice(0, 10).split('-').map(Number); return new Date(y, m - 1, d); }
function addDays(iso, n) { const d = parseDay(iso); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
function dayDiff(a, b) { return Math.round((parseDay(a) - parseDay(b)) / 86400000); }
/** Clock: today's real date and time (Cambodia, UTC+7). */
function nowIso() {
  const d = new Date();
  return `${localDay(0)}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:00+07:00`;
}

function useBy(l) { return addDays(l.harvested, l.freshDays); }

/** A deal is visible only if its use-by date is on/after the delivery date. */
function visibleDeals() {
  return DB.deals.filter((d) => !CONFIG.dealUseByRule || d.useBy >= CONFIG.deliveryDate);
}
function dealForListing(listingId) { return visibleDeals().find((d) => d.listingId === listingId && d.kgLeft > 0); }

/** Everything a screen needs to know about a sellable thing (listing or deal). */
function info(listingId, dealId) {
  const l = listing(listingId);
  const dl = dealId ? deal(dealId) : null;
  const p = product(l.product);
  const s = shop(l.shopId);
  const price = dl ? dl.now : l.price;
  const stock = dl ? dl.kgLeft : l.stock;
  const available = l.available && stock > 0;
  return { l, dl, p, s, price, stock, min: l.min, grade: dl ? dl.grade : l.grade, available, key: dl ? dl.id : l.id };
}

function otherShopsCount(productKey) { return new Set(DB.listings.filter((x) => x.product === productKey).map((x) => x.shopId)).size; }

function lowestPrice(productKey) {
  const ps = DB.listings.filter((x) => x.product === productKey && x.available && x.stock > 0).map((x) => x.price);
  return ps.length ? Math.min(...ps) : null;
}

/* ---------------- quantity rules ---------------- */
/** Returns { qty, msg } — never below minimum, never above stock. */
function clampQty(q, min, stock) {
  q = Math.round(Number(q) || 0);
  if (stock < min) return { qty: 0, msg: 'belowMinStock' };
  if (q < min) return { qty: min, msg: 'minOrderMsg' };
  if (q > stock) return { qty: stock, msg: 'maxStockMsg' };
  return { qty: q, msg: null };
}

/* ---------------- cart ---------------- */
function cartLine(key) { return S.cart.find((c) => c.key === key); }

/** Inline +/− in lists: change a listing's basket quantity by one step.
 *  Going below the minimum order removes the line. */
function stepCart(listingId, d) {
  const l = listing(listingId);
  const line = cartLine(l.id);
  if (!line) { if (d > 0) return addToCart(l.id, null, l.min).ok ? 'added' : 'soldout'; return null; }
  const want = line.qty + d * CONFIG.qtyStep;
  if (want < l.min) { removeFromCart(l.id); return 'removed'; }
  if (want > l.stock) return 'max';
  line.qty = want; line.notice = null;
  return 'changed';
}
function cartCount() { return S.cart.length; }

function addToCart(listingId, dealId, qty) {
  const i = info(listingId, dealId);
  if (!i.available) return { ok: false, msg: 'soldOut' };
  const existing = cartLine(i.key);
  const want = (existing ? existing.qty : 0) + qty;
  const c = clampQty(want, i.min, i.stock);
  if (existing) { existing.qty = c.qty; existing.notice = null; }
  else S.cart.push({ key: i.key, listingId, dealId: dealId || null, qty: c.qty, priceAtAdd: i.price, notice: null });
  if (S.shopTicked[i.l.shopId] === undefined) S.shopTicked[i.l.shopId] = true;
  return { ok: true, qty: c.qty, capped: c.msg === 'maxStockMsg' };
}

function removeFromCart(key) {
  const idx = S.cart.findIndex((c) => c.key === key);
  if (idx < 0) return null;
  const [line] = S.cart.splice(idx, 1);
  return { line, idx };
}

/** Line status: warnings shown in the basket and checked at Place Order. */
function lineStatus(line) {
  const i = info(line.listingId, line.dealId);
  const w = { i, unavailable: false, priceChanged: false, lowered: false };
  if (!i.available || i.stock < i.min) w.unavailable = true;
  if (Math.abs(line.priceAtAdd - i.price) > 0.001) w.priceChanged = true;
  if (line.notice === 'lowered') w.lowered = true;
  return w;
}

/** Auto-lower quantities that are above the stock now left. */
function normalizeCart() {
  S.cart.forEach((line) => {
    const i = info(line.listingId, line.dealId);
    if (i.available && i.stock >= i.min && line.qty > i.stock) { line.qty = i.stock; line.notice = 'lowered'; }
  });
}

function cartGroups(lines = S.cart) {
  const groups = [];
  lines.forEach((line) => {
    const sid = listing(line.listingId).shopId;
    let g = groups.find((x) => x.shopId === sid);
    if (!g) { g = { shopId: sid, lines: [] }; groups.push(g); }
    g.lines.push(line);
  });
  groups.forEach((g) => {
    g.subtotal = r2(g.lines.reduce((s, l) => s + info(l.listingId, l.dealId).price * l.qty, 0));
    g.fee = CONFIG.deliveryFeePerShop;
    g.blocked = g.lines.some((l) => lineStatus(l).unavailable);
  });
  return groups;
}

function totals(groups) {
  const items = r2(groups.reduce((s, g) => s + g.subtotal, 0));
  const delivery = r2(groups.reduce((s, g) => s + g.fee, 0));
  return { items, delivery, grand: r2(items + delivery) };
}

function tickedGroups() { return cartGroups().filter((g) => S.shopTicked[g.shopId]); }

/* ---------------- checkout ---------------- */
function startCheckout(mode) {
  const lines = mode === 'buynow' ? [S.buyNow] : S.cart.filter((c) => S.shopTicked[listing(c.listingId).shopId]);
  const snapshot = {};
  lines.forEach((l) => { snapshot[l.key] = info(l.listingId, l.dealId).price; });
  S.checkout = { mode, windowId: CONFIG.defaultWindow, addressId: DB.addresses[0].id, snapshot, problems: {}, placing: false };
}

function checkoutLines() {
  if (!S.checkout) return [];
  return S.checkout.mode === 'buynow' ? (S.buyNow ? [S.buyNow] : []) : S.cart.filter((c) => S.shopTicked[listing(c.listingId).shopId]);
}

/** Final stock + price check. Returns problems per shop (nothing is charged if any). */
function finalCheck() {
  const problems = {};
  checkoutLines().forEach((line) => {
    const i = info(line.listingId, line.dealId);
    const sid = i.l.shopId;
    const add = (p) => { (problems[sid] = problems[sid] || []).push(p); };
    if (!i.available || i.stock < i.min) add({ type: 'unavailable', key: line.key });
    else if (line.qty > i.stock) add({ type: 'stock', key: line.key, left: i.stock });
    const snap = S.checkout.snapshot[line.key];
    if (snap !== undefined && Math.abs(snap - i.price) > 0.001) { add({ type: 'price', key: line.key, from: snap, to: i.price }); S.checkout.snapshot[line.key] = i.price; }
  });
  return problems;
}

/** Creates one order per shop, one payment for all. */
function placeOrders() {
  const groups = cartGroups(checkoutLines());
  const checkoutId = 'C-' + DB.nextCheckout++;
  const created = [];
  const t0 = nowIso();
  const sellerDb = Link.read();   // the linked cooperative's data (null if the Seller app is not on this site)
  groups.forEach((g) => {
    const linked = g.shopId === LINK_SHOP && sellerDb;
    // The Seller app handles one vegetable per order, so the linked co-op gets one order per line
    // (delivery fee charged once, on the first).
    const parts = linked ? g.lines.map((l, k) => ({ lines: [l], fee: k === 0 ? g.fee : 0 })) : [{ lines: g.lines, fee: g.fee }];
    parts.forEach((part) => {
      const id = Link.nextOrderId(sellerDb);
      const o = {
        id, checkoutId, shopId: g.shopId,
        items: part.lines.map((l) => ({ listingId: l.listingId, dealId: l.dealId, qty: l.qty, price: info(l.listingId, l.dealId).price })),
        note: S.shopNotes[g.shopId] || '', deliveryFee: part.fee, window: S.checkout.windowId, date: CONFIG.deliveryDate, addressId: S.checkout.addressId,
        status: 'pending', createdAt: t0, history: [{ status: 'pending', at: t0 }], payment: { method: 'khqr', paidAt: t0 },
      };
      if (linked) { o.linked = true; Link.sendOrder(sellerDb, o); }
      // reserve stock at the cooperative
      part.lines.forEach((l) => { const i = info(l.listingId, l.dealId); if (i.dl) i.dl.kgLeft = Math.max(0, i.dl.kgLeft - l.qty); else i.l.stock = Math.max(0, i.l.stock - l.qty); });
      DB.orders.unshift(o);
      created.push(o);
    });
  });
  if (sellerDb) Link.write(sellerDb);
  if (S.checkout.mode === 'basket') {
    const keys = new Set(checkoutLines().map((l) => l.key));
    S.cart = S.cart.filter((l) => !keys.has(l.key));
    groups.forEach((g) => { delete S.shopNotes[g.shopId]; delete S.shopTicked[g.shopId]; });
  } else S.buyNow = null;
  const t = totals(groups);   // same total: split linked orders keep one delivery fee
  S.lastSubmitted = { checkoutId, orderIds: created.map((o) => o.id), total: t.grand };
  notify('sent', created[0].id, { km: `បានផ្ញើការបញ្ជាទិញ ${created.length} (${created.map((o) => o.id).join(', ')})`, en: `${created.length} order(s) sent (${created.map((o) => o.id).join(', ')})` });
  S.checkout = null;
  return created;
}

/* ---------------- orders ---------------- */
// Delivered is the END of an order: it moves straight to History (no receipt confirmation step).
const ACTIVE = ['pending', 'accepted', 'preparing', 'dispatched'];
const HISTORY = ['delivered', 'completed', 'declined', 'cancelled', 'expired'];
const isDone = (o) => o.status === 'delivered' || o.status === 'completed';

function orderTotals(o) {
  const items = r2(o.items.reduce((s, i) => s + i.price * i.qty, 0));
  return { items, delivery: o.deliveryFee, grand: r2(items + o.deliveryFee) };
}
function hasStep(o, st) { return o.history.some((h) => h.status === st); }
function stepAt(o, st) { const h = o.history.find((x) => x.status === st); return h ? h.at : null; }
function pushStatus(o, st, extra = {}) { o.status = st; o.history.push({ status: st, at: nowIso() }); Object.assign(o, extra); }
function restoreStock(o) { o.items.forEach((i) => { const d = i.dealId && deal(i.dealId); if (d) d.kgLeft += i.qty; else listing(i.listingId).stock += i.qty; }); }

function notify(type, orderId, msg) {
  DB.notifications.unshift({ id: DB.nextNotif++, type, orderId, msg, at: nowIso(), read: false });
}

const DRIVERS = [
  { name: 'Vanna Chea', plate: '2A-4821', phone: '012 555 019' },
  { name: 'Sopheak Kim', plate: '1A-1234', phone: '085 999 888' },
  { name: 'Rithy Long', plate: '2B-7730', phone: '096 410 552' },
];

/** Seller-side actions (triggered from Demo Controls). Returns a toast message or null. */
const SellerSim = {
  can(o, action) {
    if (o.linked) return false;   // real orders from the linked co-op are moved in the Seller app
    return ({
      accept: o.status === 'pending',
      decline: ['pending', 'accepted'].includes(o.status),
      preparing: o.status === 'accepted',
      dispatch: o.status === 'preparing',
      deliver: o.status === 'dispatched',
      expire: o.status === 'pending',
    })[action];
  },
  run(o, action, reason) {
    if (!SellerSim.can(o, action)) return null;
    const w = CONFIG.timeWindows.find((x) => x.id === o.window) || CONFIG.timeWindows[0];
    if (action === 'accept') { pushStatus(o, 'accepted'); notify('accepted', o.id, { km: `${o.id} ត្រូវបានទទួលយក`, en: `${o.id} was accepted` }); }
    if (action === 'decline') {
      const rs = reason || { km: 'អស់ស្តុក', en: 'Out of stock' };
      pushStatus(o, 'declined', { reason: rs, refund: CONFIG.refundOnDecline }); restoreStock(o);
      notify('declined', o.id, { km: `${o.id} ត្រូវបានបដិសេធ · ${rs.km}`, en: `${o.id} was declined · ${rs.en}` });
    }
    if (action === 'preparing') { pushStatus(o, 'preparing'); notify('preparing', o.id, { km: `${o.id} កំពុងរៀបចំ`, en: `${o.id} is being prepared` }); }
    if (action === 'dispatch') {
      o.history.push({ status: 'qualityChecked', at: nowIso() });
      pushStatus(o, 'dispatched', { driver: DRIVERS[DB.orders.indexOf(o) % DRIVERS.length], eta: { km: `ស្អែក ${w.eta.km}`, en: `${w.eta.en} tomorrow` } });
      notify('dispatched', o.id, { km: `${o.id} កំពុងដឹកមក · មកដល់ ${o.eta.km}`, en: `${o.id} is on the way · ETA ${o.eta.en}` });
    }
    if (action === 'deliver') { pushStatus(o, 'delivered', { deliveredAt: nowIso() }); notify('delivered', o.id, { km: `${o.id} បានដឹកដល់ហើយ · មើលបង្កាន់ដៃ`, en: `${o.id} was delivered · view receipt` }); }
    if (action === 'expire') {
      pushStatus(o, 'expired', { reason: { km: 'សហករណ៍មិនបានឆ្លើយតបទាន់ពេល', en: 'The cooperative did not respond in time' }, refund: CONFIG.refundOnDecline }); restoreStock(o);
      notify('expired', o.id, { km: `${o.id} ផុតសុពលភាព`, en: `${o.id} expired` });
    }
    return DB.notifications[0].msg;
  },
};

const BuyerActions = {
  cancel(o) {
    if (o.status !== 'pending') return false;
    if (o.linked && !Link.cancel(o)) { Link.sync(); return false; }   // the co-op answered first
    pushStatus(o, 'cancelled', { reason: { km: 'អ្នកបានបោះបង់', en: 'Cancelled by you' }, cancelledBy: 'buyer', refund: 'pending' });
    if (!o.linked) restoreStock(o);
    notify('cancelled', o.id, { km: `${o.id} ត្រូវបានបោះបង់ · ការសងប្រាក់កំពុងដំណើរការ`, en: `${o.id} cancelled · refund pending` });
    return true;
  },
  /** Rate the cooperative; optional feedback and an optional problem report. */
  rate(o, stars, comment, report) {
    if (stars) { o.rating = stars; o.ratingComment = comment || ''; }
    if (report) {
      o.report = { ...report, at: nowIso() };
      notify('disputed', o.id, { km: `បានរាយការណ៍បញ្ហា ${o.id} ទៅសហករណ៍`, en: `Problem on ${o.id} reported to the cooperative` });
    }
    if (o.linked) Link.feedback(o);
  },
  reorder(o) {
    const skipped = [], added = [];
    o.items.forEach((it) => {
      const l = listing(it.listingId);
      const p = product(l.product);
      if (!l.available || l.stock < l.min) { skipped.push(p); return; }
      const res = addToCart(l.id, null, Math.max(it.qty, l.min));
      if (res.ok) added.push(p); else skipped.push(p);
    });
    return { added, skipped };
  },
};

/* ---------------- received amount (after checking the delivery) ---------------- */
function receivedTotals(o) {
  if (!o.received) return null;
  const items = r2(o.items.reduce((s, it, idx) => s + it.price * (o.received.items[idx] ? o.received.items[idx].qty : it.qty), 0));
  return { items, delivery: o.deliveryFee, grand: r2(items + o.deliveryFee) };
}

/** Reset: clears BOTH apps' saved data (buyer + linked seller) and starts from today's demo data. */
function resetDemo({ local = false } = {}) {
  if (!local) {
    try { localStorage.removeItem('hf_buyer_v1'); localStorage.removeItem(SELLER_KEY); } catch (e) { /* ignore */ }
  }
  DB = buildSeed();
  S.cart = []; S.shopNotes = {}; S.shopTicked = {}; S.buyNow = null; S.checkout = null; S.lastSubmitted = null;
  S.demo.networkError = false; S.demo.paymentFail = false;
}
