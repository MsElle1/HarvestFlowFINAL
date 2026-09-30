/* =========================================================
   STORE — central state, persistence and BUSINESS LOGIC

   `DB` holds the persisted data (swap `Persistence` for a REST /
   Firebase / Supabase / Laravel API later — every write already
   goes through the `Api` functions below).
   `appState` holds session + UI state.
   ========================================================= */

const STORAGE_KEY = 'hf_db_v5'; // v5: linked with the Buyer app (buyer/)
const BUYER_KEY = 'hf_buyer_v1';  // the Buyer app's saved data (cleared by "Reset demo")

/* ---------- Persistence layer (replace with API calls later) ---------- */
const Persistence = {
  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        // Fresh demo data every new day, so dates always look right on the day of the pitch.
        if (data && data.version === 1 && data.seededOn === isoDay(0)) return data;
      }
    } catch (e) { console.warn('Could not read saved data, using demo data', e); }
    return buildSeedData();
  },
  save(data) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch (e) { console.warn('Could not save', e); }
  },
  reset() {
    try { localStorage.removeItem(STORAGE_KEY); localStorage.removeItem(BUYER_KEY); } catch (e) { /* ignore */ }
    return buildSeedData();
  },
};

let DB = Persistence.load();

const appState = {
  // Login is kept per window (sessionStorage), so one window can be the Seller and another the Buyer.
  currentUser: (() => { try { return JSON.parse(sessionStorage.getItem('hf_session')); } catch (e) { return null; } })(),
  get currentLanguage() { return LANG; },
  route: { name: 'role', params: {} },
  stack: [],
  // UI-only state (not persisted)
  ui: {
    stockTab: 'batches',
    showArchived: false,
    search: '',
    filter: 'all',
    sort: 'shelf',
    ordersTab: 'new',
    historyFilter: 'all',
    marketFilter: 'all',
    highlightBatch: null,
    addForm: null,
  },
};

function persist() { Persistence.save(DB); }

/* =========================================================
   SELECTORS / HELPERS
   ========================================================= */
const byId = (arr, id) => arr.find((x) => String(x.id) === String(id));
const crop = (id) => byId(DB.crops, id);
const farmer = (id) => byId(DB.farmers, id);
const buyer = (id) => byId(DB.buyers, id);
const batch = (id) => byId(DB.stockBatches, id);
const order = (id) => byId(DB.orders, id);
const orderItem = (orderId) => DB.orderItems.find((i) => i.orderId === orderId);

function todayStart() { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }
function parseDay(iso) { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d); }
function dayDiff(a, b) { return Math.round((a - b) / 86400000); }

function expiryDate(b) { const d = parseDay(b.harvestDate); d.setDate(d.getDate() + Number(b.shelfLifeDays)); return d; }
function expiryIso(b) { const d = expiryDate(b); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
/** Days of freshness left (0 = last day, negative = expired). */
function daysLeft(b) { return dayDiff(expiryDate(b), todayStart()); }

const ACTIVE_ORDER = ['preparing', 'ready', 'delivering'];

/** Quantities of a batch — calculated from the stock ledger, never typed by hand. */
function batchQty(b) {
  const q = { original: 0, available: 0, reserved: 0, sold: 0, removed: 0, adjusted: 0 };
  DB.stockTransactions.forEach((tx) => {
    if (tx.batchId !== b.id) return;
    q.available += tx.qty;
    if (tx.type === 'in') q.original += tx.qty;
    else if (tx.type === 'adjust') q.adjusted += tx.qty;
    else if (tx.type === 'remove') q.removed += -tx.qty;
    else if (tx.type === 'order') {
      const o = order(tx.orderId);
      if (o && ACTIVE_ORDER.includes(o.status)) q.reserved += -tx.qty;
      else if (o && o.status === 'completed') q.sold += -tx.qty;
    }
  });
  q.available = Math.max(0, Math.round(q.available * 10) / 10);
  return q;
}
const avail = (b) => batchQty(b).available;

/** fresh | soon | expired | soldout */
function batchStatus(b) {
  if (avail(b) <= 0) return 'soldout';
  const d = daysLeft(b);
  if (d < 0) return 'expired';
  if (d <= SOON_DAYS) return 'soon';
  return 'fresh';
}

function activeBatches() { return DB.stockBatches.filter((b) => !b.archived && avail(b) > 0); }
function sellableBatches(cropId) {
  return activeBatches()
    .filter((b) => (!cropId || b.cropId === cropId) && daysLeft(b) >= 0)
    .sort((a, b) => expiryDate(a) - expiryDate(b) || parseDay(a.harvestDate) - parseDay(b.harvestDate));
}

/** Earliest-expiry-first: is this the batch that should be sold first for its crop? */
function isSellFirst(b) {
  const list = sellableBatches(b.cropId);
  return list.length > 1 && list[0].id === b.id;
}

/** Total sellable kg for a crop (non-expired, not archived). */
function cropAvailable(cropId) { return sellableBatches(cropId).reduce((s, b) => s + avail(b), 0); }

/** Allocate an order quantity over batches, earliest expiry first. */
function planAllocation(cropId, qty) {
  let need = qty;
  const allocations = [];
  sellableBatches(cropId).forEach((b) => {
    if (need <= 0) return;
    const take = Math.min(avail(b), need);
    if (take > 0) { allocations.push({ batchId: b.id, qty: take }); need -= take; }
  });
  const available = cropAvailable(cropId);
  return { allocations, available, shortage: Math.max(0, Math.round(need * 10) / 10), ok: need <= 0 };
}

function orderTotal(o) { const i = orderItem(o.id); return i ? i.subtotal : 0; }

function dashboardSummary() {
  let fresh = 0, atRisk = 0, reserved = 0, expired = 0;
  DB.stockBatches.forEach((b) => {
    if (b.archived) return;
    const q = batchQty(b);
    reserved += q.reserved;
    if (q.available <= 0) return;
    const st = batchStatus(b);
    if (st === 'fresh') fresh += q.available;
    else if (st === 'soon') atRisk += q.available;
    else if (st === 'expired') expired += q.available;
  });
  return { total: fresh + atRisk + reserved, fresh, atRisk, reserved, expired };
}

function urgentBatches() {
  return DB.stockBatches
    .filter((b) => !b.archived && avail(b) > 0 && ['soon', 'expired'].includes(batchStatus(b)))
    .sort((a, b) => daysLeft(a) - daysLeft(b));
}

function ordersByStatus(st) { return DB.orders.filter((o) => o.status === st); }
function unreadCount() { return DB.notifications.filter((x) => !x.read).length; }

/* =========================================================
   API — all writes (business logic). Each returns {ok, error?, ...}
   ========================================================= */
function nextId(kind) { DB.nextIds[kind] = (DB.nextIds[kind] || 100) + 1; return DB.nextIds[kind]; }

function addTx(tx) {
  const rec = { id: nextId('tx'), at: new Date().toISOString(), ...tx };
  DB.stockTransactions.push(rec);
  return rec;
}

function notify(type, key, msgKey, vars, link) {
  if (key && DB.notifications.some((x) => x.key === key)) return;
  DB.notifications.unshift({ id: nextId('notif'), type, key, msg: { k: msgKey, v: vars }, link, read: false, at: new Date().toISOString() });
}

/** Low-stock / expiry alerts are generated from the live stock state. */
function refreshAlerts() {
  const day = isoDay(0);
  DB.stockBatches.forEach((b) => {
    if (b.archived) return;
    const a = avail(b);
    if (a <= 0) return;
    const d = daysLeft(b);
    if (d < 0) notify('urgent', `expired-${b.id}`, 'nmExpired', { crop: b.cropId, kg: kgFmt(a) }, { screen: 'stockDetail', id: b.id });
    else if (d <= 1) notify('urgent', `exp-${b.id}-${day}`, 'nmExpiring', { crop: b.cropId, kg: kgFmt(a), d: Math.max(d, 0) }, { screen: 'stockDetail', id: b.id });
    if (a <= LOW_STOCK_KG) notify('stock', `low-${b.id}-${Math.ceil(a / 5)}`, 'nmLowStock', { crop: b.cropId, kg: kgFmt(a) }, { screen: 'stockDetail', id: b.id });
  });
}

const Api = {
  validateHarvest(f) {
    const errors = {};
    if (!f.cropId || !crop(f.cropId)) errors.crop = 'errCrop';
    const q = Number(f.qty);
    if (!(q > 0) || !isFinite(q)) errors.qty = 'errQty';
    if (!f.farmerId || !farmer(f.farmerId)) errors.farmer = 'errFarmer';
    if (!f.harvestDate) errors.date = 'errDate';
    else if (parseDay(f.harvestDate) > todayStart()) errors.date = 'errDateFuture';
    if (!GRADES.includes(f.grade)) errors.quality = 'errQuality';
    if (!(Number(f.shelfLifeDays) > 0)) errors.shelf = 'errShelf';
    if (!LOCATIONS.includes(f.location)) errors.location = 'errLocation';
    return errors;
  },

  addHarvest(f) {
    const errors = Api.validateHarvest(f);
    if (Object.keys(errors).length) return { ok: false, errors };
    const id = 'BTB-' + String(nextId('batchNum')).padStart(3, '0');
    const b = {
      id, cropId: f.cropId, farmerId: Number(f.farmerId), harvestDate: f.harvestDate,
      shelfLifeDays: Number(f.shelfLifeDays), grade: f.grade, location: f.location,
      notes: f.notes || '', discountPct: 0, archived: false, createdAt: new Date().toISOString(),
    };
    DB.stockBatches.push(b);
    addTx({ batchId: id, type: 'in', qty: Math.round(Number(f.qty) * 10) / 10 });
    notify('stock', null, 'nmHarvest', { crop: f.cropId, kg: kgFmt(Number(f.qty)), farmer: f.farmerId }, { screen: 'stockDetail', id });
    refreshAlerts();
    persist();
    return { ok: true, batch: b };
  },

  editBatch(id, changes) {
    const b = batch(id);
    if (!b) return { ok: false };
    const notes = [];
    ['grade', 'location', 'shelfLifeDays', 'notes'].forEach((k) => {
      if (changes[k] !== undefined && String(changes[k]) !== String(b[k])) {
        notes.push(k);
        b[k] = k === 'shelfLifeDays' ? Number(changes[k]) : changes[k];
      }
    });
    const cur = avail(b);
    const target = Number(changes.available);
    if (changes.available !== undefined && isFinite(target) && target >= 0 && Math.abs(target - cur) > 0.001) {
      addTx({ batchId: id, type: 'adjust', qty: Math.round((target - cur) * 10) / 10, reason: changes.reason || 'rCorrection' });
    } else if (notes.length) {
      addTx({ batchId: id, type: 'adjust', qty: 0, reason: 'rCorrection', fields: notes });
    }
    if (avail(b) > 0) b.archived = false;
    refreshAlerts();
    persist();
    return { ok: true };
  },

  removeStock(id, qty, reason) {
    const b = batch(id);
    const a = avail(b);
    const q = Math.round(Number(qty) * 10) / 10;
    if (!(q > 0) || q > a) return { ok: false, error: 'errRemoveQty' };
    addTx({ batchId: id, type: 'remove', qty: -q, reason });
    if (avail(b) <= 0) b.archived = true;
    persist();
    return { ok: true };
  },

  setDiscount(id, pct) {
    const b = batch(id);
    b.discountPct = pct;
    persist();
    return { ok: true };
  },

  /** CRITICAL: accepting reserves (deducts) stock automatically, earliest expiry first. */
  acceptOrder(id) {
    const o = order(id);
    if (!o || o.status !== 'new') return { ok: false };
    const item = orderItem(id);
    const plan = planAllocation(item.cropId, item.qty);
    if (!plan.ok) return { ok: false, error: 'notEnough', plan };
    plan.allocations.forEach((a) => addTx({ batchId: a.batchId, type: 'order', qty: -a.qty, orderId: id }));
    o.allocations = plan.allocations;
    o.status = 'preparing';
    o.acceptedAt = new Date().toISOString();
    notify('order', `acc-${id}`, 'nmAccepted', { id, kg: kgFmt(item.qty) }, { screen: 'orderDetail', id });
    DB.notifications.filter((x) => x.key === 'order-' + id).forEach((x) => { x.read = true; });
    refreshAlerts();
    persist();
    return { ok: true };
  },

  rejectOrder(id, reason) {
    const o = order(id);
    if (!o || o.status !== 'new') return { ok: false };
    o.status = 'rejected';
    o.rejectReason = reason;
    o.rejectedAt = new Date().toISOString();
    DB.notifications.filter((x) => x.key === 'order-' + id).forEach((x) => { x.read = true; });
    persist();
    return { ok: true };
  },

  toggleCheck(id, idx) {
    const o = order(id);
    if (!o || o.status !== 'preparing') return { ok: false };
    o.checklist[idx] = !o.checklist[idx];
    persist();
    return { ok: true, allDone: o.checklist.every(Boolean) };
  },

  setFulfilment(id, f) {
    const o = order(id);
    if (!o || !['preparing', 'ready'].includes(o.status)) return { ok: false };
    if (!o.checklist.every(Boolean)) return { ok: false };
    o.fulfilment = f;
    o.method = f.method;
    o.status = 'ready';
    persist();
    return { ok: true };
  },

  startDelivery(id) {
    const o = order(id);
    if (!o || o.status !== 'ready') return { ok: false };
    o.status = 'delivering';
    o.deliveryStartedAt = new Date().toISOString();
    persist();
    return { ok: true };
  },

  completeOrder(id) {
    const o = order(id);
    if (!o || !['ready', 'delivering'].includes(o.status)) return { ok: false };
    const item = orderItem(id);
    o.status = 'completed';
    o.completedAt = new Date().toISOString();
    DB.sales.push({
      orderId: id, cropId: item.cropId, buyerId: o.buyerId, qty: item.qty, revenue: item.subtotal, date: o.completedAt,
      allocations: o.allocations.map((a) => ({ ...a, farmerId: batch(a.batchId).farmerId })),
    });
    notify('order', `done-${id}`, 'nmCompleted', { id }, { screen: 'orderDetail', id });
    refreshAlerts();
    persist();
    return { ok: true };
  },

  /** Cancelling an accepted order releases the reserved stock back. */
  cancelOrder(id) {
    const o = order(id);
    if (!o || !ACTIVE_ORDER.includes(o.status)) return { ok: false };
    o.allocations.forEach((a) => addTx({ batchId: a.batchId, type: 'release', qty: a.qty, orderId: id }));
    o.allocations.forEach((a) => { const b = batch(a.batchId); if (avail(b) > 0) b.archived = false; });
    o.status = 'cancelled';
    o.cancelledAt = new Date().toISOString();
    notify('order', `cancel-${id}`, 'nmCancelled', { id }, { screen: 'orderDetail', id });
    persist();
    return { ok: true };
  },

  addFarmer(f) {
    if (!f.name || !f.name.trim()) return { ok: false, error: 'errName' };
    const nm = f.name.trim();
    const fm = { id: nextId('farmer'), name: { km: nm, en: nm }, phone: (f.phone || '').trim(), location: { km: (f.location || '').trim() || 'ខេត្តបាត់ដំបង', en: (f.location || '').trim() || 'Battambang' } };
    DB.farmers.push(fm);
    persist();
    return { ok: true, farmer: fm };
  },

  addCrop(c) {
    if (!c.name || !c.name.trim()) return { ok: false, error: 'errName' };
    const nm = c.name.trim();
    const id = 'c' + Date.now();
    const cr = { id, name: { km: nm, en: nm }, emoji: '', icon: c.icon || DEFAULT_CROP_ICON, category: 'veg' };
    DB.crops.push(cr);
    persist();
    return { ok: true, crop: cr };
  },

  updateProfile(p) {
    Object.assign(DB.sellerProfile, p);
    persist();
    return { ok: true };
  },

  markRead(id) { const x = byId(DB.notifications, id); if (x) x.read = true; persist(); },
  markAllRead() { DB.notifications.forEach((x) => { x.read = true; }); persist(); },

  resetDemo() { DB = Persistence.reset(); refreshAlerts(); persist(); },

  /** Developer helper: simulate a buyer placing an order. */
  simulateOrder() {
    const withStock = DB.crops.filter((c) => cropAvailable(c.id) > 0);
    const c = withStock.length ? withStock[Math.floor(Math.random() * withStock.length)] : DB.crops[0];
    const others = DB.buyers.filter((x) => !x.linked);   // the linked restaurant orders from the real Buyer app
    const b = others[Math.floor(Math.random() * others.length)];
    const id = 'HF-' + nextId('orderNum');
    const qty = [10, 20, 25, 30, 40, 50, 70][Math.floor(Math.random() * 7)];
    const ref = DB.marketPrices.find((p) => p.cropId === c.id) || { price: 1 };
    DB.orders.unshift({ id, buyerId: b.id, status: 'new', method: Math.random() > 0.5 ? 'delivery' : 'pickup', location: b.location, notes: '', createdAt: new Date().toISOString(), allocations: [], checklist: [false, false, false, false, false] });
    DB.orderItems.push({ id: nextId('orderItem'), orderId: id, cropId: c.id, qty, grade: 'A', unitPrice: ref.price, subtotal: Math.round(qty * ref.price * 100) / 100 });
    notify('new', 'order-' + id, 'nmNewOrder', { buyer: b.name }, { screen: 'orderDetail', id });
    persist();
    return { ok: true, id };
  },
};

refreshAlerts();
persist();
