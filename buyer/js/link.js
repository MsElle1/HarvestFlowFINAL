/* =========================================================
   LINK — connects the Buyer app to the Seller app.

   Both apps run from the same site (seller at /, buyer at /buyer/)
   and share this browser's saved data (localStorage):
     hf_db_v5    → the Seller app's database (the cooperative)
     hf_buyer_v1 → the Buyer app's data (this restaurant)

   Connections:
   1. Stock & prices  Seller → Buyer  (the cooperative shows as a shop, "Live")
   2. New orders      Buyer  → Seller (one seller order per vegetable)
   3. Order status    Seller → Buyer  (accept / reject / prepare / deliver / complete)
   4. Cancel          Buyer  → Seller (only while the order is still new)
   5. Rating, feedback & problem reports  Buyer → Seller
   6. One login screen (the Seller app's role screen opens this app)

   The browser fires a "storage" event in the other window whenever one
   app saves, so two windows side by side update live.
   Later this file is the only thing to swap for a real backend API.
   ========================================================= */

const SELLER_KEY = 'hf_db_v5';
const BUYER_KEY = 'hf_buyer_v1';
const LINK_SHOP = 's0';           // the linked cooperative's shop id in this app
const LINK_BUYER = 'b0';          // this restaurant's id in the Seller app

// Seller crop → Buyer product + category
const CROP_MAP = {
  tomato: { product: 'tomato', category: 'otherveg' },
  cucumber: { product: 'cucumber', category: 'otherveg' },
  cabbage: { product: 'cabbage', category: 'leafy' },
  carrot: { product: 'carrot', category: 'root' },
  chili: { product: 'chili', category: 'otherveg', min: 1 },
};
const REJECT_TEXT = {
  rjStock: { km: 'ស្តុកមិនគ្រប់', en: 'Not enough stock' },
  rjQuality: { km: 'គុណភាពមិនត្រូវ', en: 'Quality mismatch' },
  rjDelivery: { km: 'មិនអាចដឹកជញ្ជូនបាន', en: 'Cannot deliver' },
  rjPrice: { km: 'តម្លៃមិនសមរម្យ', en: 'Price not suitable' },
};
const round1 = (v) => Math.round(v * 10) / 10;

const Link = {
  /** True when the Seller app's code is on this site (combined project). */
  enabled() { return typeof buildSeedData === 'function'; },

  /** Read the Seller database. Creates today's demo data if it does not exist yet. */
  read() {
    if (!Link.enabled()) return null;
    try {
      const raw = localStorage.getItem(SELLER_KEY);
      if (raw) { const d = JSON.parse(raw); if (d && d.version === 1 && d.seededOn === localDay(0)) return d; }
    } catch (e) { console.warn('Seller data unreadable, recreating', e); }
    const d = buildSeedData();
    Link.write(d);
    return d;
  },
  write(d) { try { localStorage.setItem(SELLER_KEY, JSON.stringify(d)); } catch (e) { console.warn('Could not save seller data', e); } },
  /** Read → change → save in one step (always starts from the freshest data). */
  update(fn) { const d = Link.read(); if (!d) return null; const r = fn(d); Link.write(d); return r; },

  nextSellerId(d, kind) { d.nextIds[kind] = (d.nextIds[kind] || 100) + 1; return d.nextIds[kind]; },
  sellerNotify(d, type, key, k, v, id) {
    if (key && d.notifications.some((x) => x.key === key)) return;
    d.notifications.unshift({ id: Link.nextSellerId(d, 'notif'), type, key, msg: { k, v }, link: { screen: 'orderDetail', id }, read: false, at: new Date().toISOString(), buyerApp: true });
  },
  ensureBuyer(d) {
    if (!d.buyers.some((b) => b.id === LINK_BUYER)) {
      d.buyers.unshift({ id: LINK_BUYER, name: DB.restaurant.name, type: { km: 'ភោជនីយដ្ឋាន', en: 'Restaurant' }, phone: DB.restaurant.phone, location: { km: 'ភ្នំពេញ, ខណ្ឌដូនពេញ', en: 'Phnom Penh, Daun Penh' }, linked: true });
    }
  },

  /* ---------- seller-side stock maths (same rules as the Seller app) ---------- */
  avail(d, batchId) { return Math.max(0, round1(d.stockTransactions.filter((x) => x.batchId === batchId).reduce((s, x) => s + x.qty, 0))); },
  daysLeft(b) { return dayDiff(addDays(b.harvestDate, Number(b.shelfLifeDays)), localDay(0)); },
  sellable(d, cropId) {
    return d.stockBatches
      .filter((b) => b.cropId === cropId && !b.archived && Link.avail(d, b.id) > 0 && Link.daysLeft(b) >= 0)
      .sort((a, b) => Link.daysLeft(a) - Link.daysLeft(b) || (a.harvestDate < b.harvestDate ? -1 : 1));
  },
  /** kg this restaurant asked for that the co-op has not answered yet (the Seller app deducts stock only
   *  when it accepts), so the restaurant cannot order the same kilos twice. */
  pending(d, cropId) {
    return d.orders.filter((o) => o.status === 'new' && o.buyerId === LINK_BUYER).reduce((s, o) => {
      const it = d.orderItems.find((i) => i.orderId === o.id);
      return s + (it && it.cropId === cropId ? it.qty : 0);
    }, 0);
  },

  /* ---------- 1. Stock & prices: Seller → Buyer ---------- */
  applyCatalog(d) {
    const p = d.sellerProfile;
    const fb = d.orders.filter((o) => o.buyerFeedback && o.buyerFeedback.stars).map((o) => o.buyerFeedback.stars);
    const baseN = 26, baseR = 4.9;
    const rating = Math.round(((baseR * baseN + fb.reduce((s, x) => s + x, 0)) / (baseN + fb.length)) * 10) / 10;
    const initials = (p.coop.en || 'Co').split(/\s+/).filter((w) => /^[A-Z]/.test(w)).slice(0, 2).map((w) => w[0]).join('') || 'CO';
    const s0 = { id: LINK_SHOP, name: { km: p.coop.km, en: p.coop.en }, rating, reviews: baseN + fb.length, cert: 'GAP', location: p.location, phone: p.phone, since: 2018, initials, color: '#146c2e', linked: true };
    const idx = DB.shops.findIndex((s) => s.id === LINK_SHOP);
    if (idx >= 0) DB.shops[idx] = s0; else DB.shops.unshift(s0);

    const seenDeals = new Set();
    d.crops.forEach((c) => {
      const map = CROP_MAP[c.id] || { product: 'x_' + c.id, category: 'otherveg' };
      if (!DB.products[map.product]) {
        DB.products[map.product] = { name: { km: c.name.km, en: c.name.en }, emoji: '', img: '../' + (c.icon || 'assets/ic-vegetable.png'), tint: ['#eef6e3', '#d9ecc8'], temp: '—' };
      }
      const batches = Link.sellable(d, c.id);
      const first = batches[0];
      const total = batches.reduce((s, b) => s + Link.avail(d, b.id), 0);
      const stock = Math.max(0, Math.floor(total - Link.pending(d, c.id)));
      const mp = d.marketPrices.find((x) => x.cropId === c.id);
      const price = mp ? mp.price : 1;
      const id = 'X-' + c.id;
      const l = {
        id, product: map.product, category: map.category, shopId: LINK_SHOP, cropId: c.id, linked: true,
        grade: first ? first.grade : 'A', price, stock, min: map.min || 2,
        harvested: first ? first.harvestDate : localDay(0), freshDays: first ? Number(first.shelfLifeDays) : 3, available: true,
      };
      const li = DB.listings.findIndex((x) => x.id === id);
      if (li >= 0) DB.listings[li] = l; else DB.listings.unshift(l);

      // A discount on a batch in the Seller app becomes a Fresh Deal here.
      batches.filter((b) => Number(b.discountPct) > 0).forEach((b) => {
        const did = 'XD-' + b.id;
        seenDeals.add(did);
        const dl = {
          id: did, listingId: id, linked: true, type: Link.daysLeft(b) <= 2 ? 'useSoon' : 'surplus',
          was: price, now: r2(price * (1 - b.discountPct / 100)), off: Number(b.discountPct),
          kgLeft: Math.min(Math.floor(Link.avail(d, b.id)), stock), grade: b.grade,
          useBy: addDays(b.harvestDate, Number(b.shelfLifeDays)), note: { km: 'បញ្ចុះតម្លៃដោយសហករណ៍', en: 'Discount set by the co-op' },
        };
        const di = DB.deals.findIndex((x) => x.id === did);
        if (di >= 0) DB.deals[di] = dl; else DB.deals.unshift(dl);
      });
    });
    // Discounts the co-op removed: keep the record (old orders refer to it) but sell nothing.
    DB.deals.forEach((x) => { if (x.linked && !seenDeals.has(x.id)) x.kgLeft = 0; });
  },

  /* ---------- 3. Order status: Seller → Buyer ---------- */
  applyStatuses(d) {
    const POS = { pending: 0, accepted: 1, preparing: 2, dispatched: 3, delivered: 4 };
    const TARGET = { new: 0, preparing: 2, ready: 2, delivering: 3, completed: 4 };
    DB.orders.filter((o) => o.linked).forEach((o) => {
      const so = d.orders.find((x) => x.id === o.id);
      if (!so || !(o.status in POS)) return;               // finished on our side (declined / cancelled)
      if (so.status === 'rejected') {
        const rs = REJECT_TEXT[so.rejectReason] || REJECT_TEXT.rjStock;
        pushStatus(o, 'declined', { reason: rs, refund: CONFIG.refundOnDecline });
        notify('declined', o.id, { km: `${o.id} ត្រូវបានបដិសេធ · ${rs.km}`, en: `${o.id} was declined · ${rs.en}` });
        return;
      }
      if (so.status === 'cancelled') {
        pushStatus(o, 'cancelled', { reason: { km: 'សហករណ៍បានលុបចោល', en: 'Cancelled by the cooperative' }, cancelledBy: 'coop', refund: 'pending' });
        notify('cancelled', o.id, { km: `${o.id} ត្រូវបានលុបចោលដោយសហករណ៍ · ការសងប្រាក់កំពុងដំណើរការ`, en: `${o.id} was cancelled by the co-op · refund pending` });
        return;
      }
      const target = TARGET[so.status];
      if (target === undefined) return;
      const w = CONFIG.timeWindows.find((x) => x.id === o.window) || CONFIG.timeWindows[0];
      while (POS[o.status] < target) {
        const cur = o.status;
        if (cur === 'pending') { pushStatus(o, 'accepted'); notify('accepted', o.id, { km: `${o.id} ត្រូវបានទទួលយក`, en: `${o.id} was accepted` }); }
        else if (cur === 'accepted') { pushStatus(o, 'preparing'); notify('preparing', o.id, { km: `${o.id} កំពុងរៀបចំ`, en: `${o.id} is being prepared` }); }
        else if (cur === 'preparing') {
          if (!hasStep(o, 'qualityChecked')) o.history.push({ status: 'qualityChecked', at: nowIso() });
          const drv = DRIVERS[Number(o.id.replace(/\D/g, '')) % DRIVERS.length];
          pushStatus(o, 'dispatched', { driver: drv, eta: { km: `ស្អែក ${w.eta.km}`, en: `${w.eta.en} tomorrow` } });
          notify('dispatched', o.id, { km: `${o.id} កំពុងដឹកមក · មកដល់ ${o.eta.km}`, en: `${o.id} is on the way · ETA ${o.eta.en}` });
        } else if (cur === 'dispatched') {
          pushStatus(o, 'delivered', { deliveredAt: nowIso() });
          notify('delivered', o.id, { km: `${o.id} បានដឹកដល់ហើយ · មើលបង្កាន់ដៃ`, en: `${o.id} was delivered · view receipt` });
        } else break;
      }
      // "Ready" in the Seller app = packed and quality-checked
      if (so.status === 'ready' && !hasStep(o, 'qualityChecked')) o.history.push({ status: 'qualityChecked', at: nowIso() });
    });
  },

  /** Pull everything from the Seller app. Returns the new buyer notifications (for a toast). */
  sync() {
    const d = Link.read();
    if (!d) return [];
    const before = DB.nextNotif;
    Link.applyCatalog(d);
    Link.applyStatuses(d);
    return DB.notifications.filter((x) => x.id >= before);
  },

  /** Order numbers are shared by both apps so they never clash. */
  nextOrderId(d) {
    const n = d ? Math.max(DB.nextOrderNum, (d.nextIds.orderNum || 1026) + 1) : DB.nextOrderNum;
    DB.nextOrderNum = n + 1;
    if (d) d.nextIds.orderNum = n;
    return 'HF-' + String(n).padStart(4, '0');
  },

  /* ---------- 2. New orders: Buyer → Seller ---------- */
  sendOrder(d, o) {
    Link.ensureBuyer(d);
    const it = o.items[0];
    const l = listing(it.listingId);
    const a = address(o.addressId);
    const w = CONFIG.timeWindows.find((x) => x.id === o.window) || CONFIG.timeWindows[0];
    const grade = it.dealId && deal(it.dealId) ? deal(it.dealId).grade : l.grade;
    const noteParts = [o.note, `${a.recipient} · ${a.phone}`, `${fmtDateEn(o.date)} · ${w.label.en}`].filter(Boolean);
    d.orders.unshift({
      id: o.id, buyerId: LINK_BUYER, status: 'new', method: 'delivery',
      location: { km: a.line, en: a.line }, notes: noteParts.join(' — '),
      createdAt: new Date().toISOString(), allocations: [], checklist: [false, false, false, false, false],
      fromBuyerApp: true, deliveryDate: o.date,
    });
    d.orderItems.push({ id: Link.nextSellerId(d, 'orderItem'), orderId: o.id, cropId: l.cropId, qty: it.qty, grade, unitPrice: it.price, subtotal: r2(it.qty * it.price) });
    Link.sellerNotify(d, 'new', 'order-' + o.id, 'nmNewOrder', { buyer: DB.restaurant.name }, o.id);
  },

  /* ---------- 4. Cancel: Buyer → Seller ---------- */
  cancel(o) {
    return Link.update((d) => {
      const so = d.orders.find((x) => x.id === o.id);
      if (!so || so.status !== 'new') return false;          // the co-op already answered
      so.status = 'cancelled'; so.cancelledAt = new Date().toISOString(); so.cancelledBy = 'buyer';
      d.notifications.filter((x) => x.key === 'order-' + o.id).forEach((x) => { x.read = true; });
      Link.sellerNotify(d, 'order', 'bcancel-' + o.id, 'nmBuyerCancelled', { buyer: DB.restaurant.name, id: o.id }, o.id);
      return true;
    });
  },

  /* ---------- 5. Rating, feedback & report: Buyer → Seller ---------- */
  feedback(o) {
    Link.update((d) => {
      const so = d.orders.find((x) => x.id === o.id);
      if (!so) return;
      const rep = o.report ? { reason: { km: DICT.km[o.report.reason] || o.report.reason, en: DICT.en[o.report.reason] || o.report.reason }, note: o.report.note || '' } : null;
      so.buyerFeedback = { stars: o.rating || 0, comment: o.ratingComment || '', report: rep, at: new Date().toISOString() };
      const stamp = Date.now();
      if (rep) Link.sellerNotify(d, 'urgent', `report-${o.id}-${stamp}`, 'nmReported', { buyer: DB.restaurant.name, id: o.id }, o.id);
      if (o.rating) Link.sellerNotify(d, 'order', `rate-${o.id}-${stamp}`, 'nmRated', { buyer: DB.restaurant.name, id: o.id, stars: o.rating }, o.id);
    });
  },
};

function fmtDateEn(iso) { const d = parseDay(iso); return `${d.getDate()} ${EN_MONTHS[d.getMonth()]} ${d.getFullYear()}`; }
