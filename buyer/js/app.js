/* =========================================================
   APP — navigation, rendering, events and actions
   ========================================================= */
const appEl = document.getElementById('app');
let lastKey = '';
let pushed = 0;

/* ---------------- navigation ---------------- */
const MAIN = ['home', 'browse', 'basket', 'orders', 'account'];
const rkey = (r) => r.name + JSON.stringify(r.params || {});
function curScroll() { const s = appEl.querySelector('.scroll'); return s ? s.scrollTop : 0; }

function navigate(name, params = {}, { replace = false } = {}) {
  if (!replace) { S.route.scroll = curScroll(); S.stack.push(S.route); }
  S.route = { name, params, loaded: false };
  try { history.pushState({ hf: 1 }, ''); pushed++; } catch (e) { /* ignore */ }
  render('fwd');
}
function goTab(name) {
  S.stack = [];
  S.route = { name, params: {}, loaded: false };
  render('fwd');
}
function goBack() {
  if (MODAL) { MODAL = null; renderModal(); return; }
  if (SHEET) { closeSheet(); return; }
  if (S.stack.length) S.route = S.stack.pop();
  else if (!MAIN.includes(S.route.name) && S.session) S.route = { name: 'home', params: {}, loaded: false };
  render('back');
}
window.addEventListener('popstate', () => { if (pushed > 0) pushed--; goBack(); });

/* ---------------- render ---------------- */
function render(dir) {
  const r = S.route;
  if (!S.session && !['splash', 'login'].includes(r.name)) { S.route = { name: 'login', params: {} }; return render(dir); }
  const def = SCREENS[r.name] || SCREENS.home;
  const key = rkey(r);
  const same = key === lastKey && !dir;
  const keep = same ? curScroll() : dir === 'back' ? (r.scroll || 0) : 0;
  const isFlow = !def.tab;
  appEl.innerHTML = `<div class="screen ${same ? 'no-anim' : ''} ${dir === 'back' ? 'back-anim' : ''} ${isFlow ? 'flow' : 'main'}">${def.render(r)}</div>
    ${def.tab ? tabBar(def.tab) : def.fbar ? floatingBar() : ''}`;
  const sc = appEl.querySelector('.scroll'); if (sc) sc.scrollTop = keep;
  lastKey = key;
  if (def.after) def.after(r);
  if (def.loads && !r.loaded) {
    setTimeout(() => {
      if (S.route !== r) return;
      r.loaded = true; r.error = S.demo.networkError;
      render();
    }, 450);
  }
  renderDemo();
  Saved.save();
}
function refresh() { render(); if (SHEET) renderSheet(); }

/* ---------------- inputs ---------------- */
document.addEventListener('input', (e) => {
  const el = e.target.closest('[data-bind]');
  if (!el) return;
  const k = el.dataset.bind, scope = el.dataset.scope, v = el.value;
  if (scope === 'login') S.ui.login[k] = v;
  else if (scope === 'ui') {
    S.ui[k] = v;
    if (k === 'searchText') {
      const b = document.getElementById('search-body'); if (b) b.innerHTML = searchBody();
      const c = document.querySelector('.searchfield .clear'); if (c) c.style.display = v ? '' : 'none';
    }
    if (k === 'browseQuery') updateBrowseList();
  } else if (scope === 'pd') S.ui.pd[k] = v;
  else if (scope === 'shopNote') S.shopNotes[k] = v;
  else if (scope === 'sheet' && SHEET) SHEET.data[k] = v;
  else if (scope === 'demo') { DEMO[k] = el.type === 'number' ? v : v; if (el.tagName === 'SELECT') { if (k === 'listingId') DEMO.price = ''; renderDemo(); } }
});
document.addEventListener('change', (e) => {
  const el = e.target.closest('select[data-scope="demo"]');
  if (el) { DEMO[el.dataset.bind] = el.value; if (el.dataset.bind === 'listingId') DEMO.price = ''; renderDemo(); }
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    if (e.target.id === 'search-input') { e.preventDefault(); ACTIONS.doSearch(); }
    else if (e.target.closest('.login')) { e.preventDefault(); ACTIONS.login(); }
  }
  if (e.key === 'Escape') { if (SHEET || MODAL) goBack(); }
});
document.addEventListener('submit', (e) => e.preventDefault());

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-action]');
  if (!el) return;
  if (el.hasAttribute('disabled') || el.getAttribute('aria-disabled') === 'true') {
    if (el.getAttribute('aria-disabled') === 'true') limitToast(el);
    return;
  }
  const fn = ACTIONS[el.dataset.action];
  if (!fn) { console.warn('no action', el.dataset.action); return; }
  if (el.type !== 'checkbox') e.preventDefault();
  fn(el, e);
});

/** When a stepper hits its limit, explain why (quantity rules). */
function limitToast(el) {
  const up = el.dataset.d === '1';
  toast(up ? t('limitMax') : t('limitMin'), 'info');
}

/** Clamp a quantity step and explain limits. */
function stepQty(cur, d, min, max) {
  const want = cur + d * CONFIG.qtyStep;
  if (want < min) { toast(t('minOrderMsg', { n: n(min) }), 'info'); return min; }
  if (want > max) { toast(t('maxStockMsg', { n: kg(max) }), 'info'); return max; }
  return want;
}

function addedToast(p, qty) { toast(t('addedMsg', { n: kg(qty), p: esc(pname(p)) })); }

/* ---------------- actions ---------------- */
const ACTIONS = {
  noop() {},
  back() { if (pushed > 0 && !SHEET && !MODAL) history.back(); else goBack(); },
  go(el) {
    const to = el.dataset.to;
    if (to === 'basket-flow') { if (SHEET) closeSheet(); goTab('basket'); return; }
    const params = {};
    if (el.dataset.id) params.id = el.dataset.id;
    if (el.dataset.deal) params.deal = el.dataset.deal;
    if (el.dataset.q) params.q = el.dataset.q;
    if (to === 'product') { const i = info(params.id, params.deal); S.ui.pd = { qty: i.min, note: '' }; }
    if (to === 'search') S.ui.searchText = '';
    if (SHEET) { SHEET = null; document.getElementById('sheet-root').innerHTML = ''; }
    navigate(to, params);
  },
  tab(el) { goTab(el.dataset.to); },
  goBrowse(el) { S.ui.browseCat = el.dataset.cat || 'all'; S.ui.browseQuery = ''; goTab('browse'); },
  lang(el) { LANG = el.dataset.l; document.documentElement.lang = LANG; try { localStorage.setItem('hf_lang', LANG); } catch (e) { /* ignore */ } refresh(); },
  /** Shared login screen (Seller app's "Seller or Buyer?" page). */
  toRoles() { window.location.href = '../index.html'; },
  toastMsg(el) { toast(t(el.dataset.k), 'info'); },
  retry() { S.route.loaded = false; S.route.error = false; render(); },

  /* F1 login */
  fillLogin(el) { S.ui.login = { phone: el.dataset.p, code: el.dataset.p.startsWith('098') ? '' : '1234', err: null }; render(); },
  login() {
    const f = S.ui.login;
    const ph = (f.phone || '').replace(/\D/g, '');
    f.err = null;
    if (ph === CONFIG.login.sellerPhone) f.err = 'seller';
    else if (![CONFIG.login.buyer.phone, CONFIG.login.unverifiedPhone].includes(ph)) f.err = 'phone';
    else if (f.code !== CONFIG.login.buyer.code) f.err = 'code';
    if (f.err) { render(); return; }
    S.session = { phone: ph, verified: ph !== CONFIG.login.unverifiedPhone };
    S.ui.login = null;
    if (S.returnTo) { S.route = S.returnTo.route; S.route.loaded = false; S.stack = S.returnTo.stack; S.returnTo = null; render('fwd'); toast(t('welcomeBack')); return; }
    if (!S.session.verified) { S.stack = []; S.route = { name: 'verify', params: {} }; render('fwd'); return; }
    goTab('home');
    toast(t('welcomeBack'));
  },
  logout() {
    confirmDialog({
      title: t('logoutQ'), text: t('logoutSub'), icon: 'logout', tone: 'danger', ok: t('logout'),
      onOk() {
        S.session = null; S.cart = []; S.shopNotes = {}; S.shopTicked = {}; S.buyNow = null; S.checkout = null; S.stack = []; S.ui.login = null; S.route = { name: 'login', params: {} };
        render('back');
        if (Link.enabled()) ACTIONS.toRoles();   // back to the shared "Seller or Buyer?" screen
      },
    });
  },

  /* sheets / modals */
  openSheet(el) { const d = {}; if (el.dataset.id) d.id = el.dataset.id; openSheet(el.dataset.sheet, d); },
  closeSheet() { closeSheet(); },
  sheetSet(el) { const v = el.dataset.v; SHEET.data[el.dataset.k] = isNaN(Number(v)) ? v : Number(v); renderSheet(); },
  sheetStep(el) {
    const d = SHEET.data;
    if (SHEET.name === 'dealQty') { const dl = deal(d.id), i = info(dl.listingId, dl.id); d.qty = stepQty(d.qty, Number(el.dataset.d), i.min, i.stock); }
    renderSheet();
  },
  modalOk() { const m = MODAL; if (!m) return; MODAL = null; renderModal(); if (m.onOk) m.onOk(); },
  modalCancel(el) {
    // A quick double-tap on a button must not close the dialog it just opened.
    if (el && el.classList.contains('backdrop') && MODAL && Date.now() - (MODAL.openedAt || 0) < 500) return;
    MODAL = null; renderModal();
  },

  /* F2 search */
  clearSearch() { S.ui.searchText = ''; const i = document.getElementById('search-input'); if (i) { i.value = ''; i.focus(); } document.getElementById('search-body').innerHTML = searchBody(); },
  doSearch() {
    const q = S.ui.searchText.trim();
    if (!q) { toast(t('typeSomething'), 'info'); return; }
    const keys = matchProducts(q);
    const label = keys.length === 1 ? product(keys[0]).name.en : q;
    DB.recentSearches = [label, ...DB.recentSearches.filter((x) => x.toLowerCase() !== label.toLowerCase())].slice(0, 6);
    navigate('results', { q: keys.length === 1 ? keys[0] : q });
  },
  searchFor(el) {
    const q = el.dataset.q;
    if (DB.products[q]) {
      DB.recentSearches = [DB.products[q].name.en, ...DB.recentSearches.filter((x) => x !== DB.products[q].name.en)].slice(0, 6);
      navigate('results', { q });
    } else { S.ui.searchText = q; ACTIONS.doSearch(); }
  },
  clearRecent() { DB.recentSearches = []; document.getElementById('search-body').innerHTML = searchBody(); },
  setSort(el) { S.ui.sort = el.dataset.v; closeSheet(); render(); },
  /* inline − / + on product rows and search results (floating basket bar shows on flow screens) */
  cartStepL(el) {
    const l = listing(el.dataset.id);
    const res = stepCart(l.id, Number(el.dataset.d));
    if (res === 'max') toast(t('maxStockMsg', { n: kg(l.stock) }), 'info');
    else if (res === 'removed') toast(t('removedMsg', { p: esc(pname(product(l.product))) }), 'info');
    refresh();
  },
  addDish(el) {
    const dish = DISHES.find((x) => x.id === el.dataset.id);
    const added = [];
    dish.uses.forEach((key) => {
      const ls = DB.listings.filter((l) => l.product === key && l.available && l.stock >= l.min).sort((a, b) => a.price - b.price);
      if (!ls.length) return;
      const pick = dish.grade === 'any' ? ls[0] : (ls.find((l) => l.grade === 'A') || ls[0]);
      if (!cartLine(pick.id)) { addToCart(pick.id, null, pick.min); added.push(pname(product(key))); }
    });
    closeSheet(); refresh();
    toast(added.length ? t('dishAdded', { p: esc(added.join(', ')) }) : t('dishAlready'), added.length ? 'ok' : 'info');
  },

  /* F3 browse */
  browseCat(el) { S.ui.browseCat = el.dataset.cat; render(); },

  /* F4 deals */
  dealFilter(el) { S.ui.dealFilter = el.dataset.f; render(); },
  toggleDealSort() { S.ui.dealSort = (S.ui.dealSort || 'shelf') === 'shelf' ? 'discount' : 'shelf'; render(); },
  dealQty(el) {
    const dl = deal(el.dataset.id);
    if (!dl || dl.kgLeft <= 0) { toast(t('soldOut'), 'info'); return; }
    openSheet('dealQty', { id: dl.id, qty: listing(dl.listingId).min });
  },
  dealAdd() {
    const d = SHEET.data, dl = deal(d.id);
    const res = addToCart(dl.listingId, dl.id, d.qty);
    closeSheet();
    if (!res.ok) { toast(t('soldOut'), 'err'); return; }
    addedToast(product(listing(dl.listingId).product), d.qty);
    if (res.capped) toast(t('maxStockMsg', { n: kg(deal(d.id).kgLeft) }), 'info');
    refresh();
  },

  /* quick add (+) — adds the minimum order quantity */
  quickAdd(el) {
    const l = listing(el.dataset.id);
    if (!l.available || l.stock < l.min) { toast(t('soldOut'), 'info'); return; }
    const res = addToCart(l.id, null, l.min);
    if (!res.ok) { toast(t('soldOut'), 'err'); return; }
    if (res.capped) toast(t('maxStockMsg', { n: kg(l.stock) }), 'info'); else addedToast(product(l.product), l.min);
    refresh();
  },

  /* F5 product details */
  pdStep(el) {
    const i = info(S.route.params.id, S.route.params.deal);
    S.ui.pd.qty = stepQty(S.ui.pd.qty, Number(el.dataset.d), i.min, i.stock);
    render();
  },
  addToBasket() {
    const { id, deal: dId } = S.route.params;
    const i = info(id, dId);
    const res = addToCart(id, dId, S.ui.pd.qty);
    if (!res.ok) { toast(t('soldOut'), 'err'); return; }
    if (S.ui.pd.note) S.shopNotes[i.s.id] = S.ui.pd.note;
    addedToast(i.p, S.ui.pd.qty);
    render();
  },
  /* F6 Buy now — checkout only this item, basket untouched */
  buyNow() {
    const { id, deal: dId } = S.route.params;
    const i = info(id, dId);
    S.buyNow = { key: i.key, listingId: id, dealId: dId || null, qty: S.ui.pd.qty, priceAtAdd: i.price };
    if (S.ui.pd.note) S.shopNotes[i.s.id] = S.ui.pd.note;
    startCheckout('buynow');
    navigate('checkout');
  },

  /* F7 basket */
  tickShop(el) { S.shopTicked[el.dataset.id] = !S.shopTicked[el.dataset.id]; render(); },
  selectAll() {
    const gs = cartGroups();
    const all = gs.every((g) => S.shopTicked[g.shopId]);
    gs.forEach((g) => { S.shopTicked[g.shopId] = !all; });
    render();
  },
  cartStep(el) {
    const line = cartLine(el.dataset.id); const i = info(line.listingId, line.dealId);
    line.qty = stepQty(line.qty, Number(el.dataset.d), i.min, i.stock); line.notice = null;
    render();
  },
  removeLine(el) {
    const res = removeFromCart(el.dataset.id);
    if (!res) return;
    ACTIONS._undo = res;
    render();
    toast(t('removedMsg', { p: esc(pname(info(res.line.listingId, res.line.dealId).p)) }), 'info', { action: 'undoRemove', label: t('undo') });
  },
  undoRemove() {
    const u = ACTIONS._undo; if (!u) return;
    S.cart.splice(u.idx, 0, u.line); ACTIONS._undo = null;
    document.getElementById('toast-root').innerHTML = '';
    render();
  },
  ackPrice(el) { const line = cartLine(el.dataset.id); line.priceAtAdd = info(line.listingId, line.dealId).price; render(); },
  checkoutBasket() {
    const g = tickedGroups();
    if (!g.length) { toast(t('selectOneShop'), 'info'); return; }
    if (g.some((x) => x.blocked)) { toast(t('removeUnavailable'), 'err'); return; }
    startCheckout('basket');
    navigate('checkout');
  },

  /* F8 checkout */
  pickWindow(el) { S.checkout.windowId = el.dataset.id; render(); },
  chooseAddress(el) { S.checkout.addressId = el.dataset.id; closeSheet(); render(); },
  placeOrder() {
    const c = S.checkout;
    if (!S.session.verified) { confirmDialog({ title: t('notVerifiedTitle'), text: t('notVerifiedBlock'), icon: 'lock', ok: t('ok'), noCancel: true }); return; }
    c.placing = true; render();
    setTimeout(() => {
      if (S.checkout !== c) return;
      c.placing = false;
      const probs = finalCheck();
      c.problems = probs;
      if (Object.keys(probs).length) { render(); toast(t('fixFirst'), 'err'); const el = appEl.querySelector('.co-shop.has-prob'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
      render();
      const grand = totals(cartGroups(checkoutLines())).grand;
      const ref = 'HF' + Date.now().toString().slice(-8);
      openSheet('khqr', { state: 'qr', mode: 'dynamic', amount: grand, ref, qr: makePaymentQr(grand, ref) });
    }, 700);
  },
  iHavePaid() {
    SHEET.data.state = 'processing'; renderSheet();
    setTimeout(() => {
      if (!SHEET || SHEET.name !== 'khqr') return;
      if (S.demo.paymentFail) { SHEET.data.state = 'fail'; renderSheet(); return; }
      placeOrders();
      SHEET = null; document.getElementById('sheet-root').innerHTML = '';
      S.stack = []; S.route = { name: 'submitted', params: {} };
      render('fwd');
    }, CONFIG.paymentProcessingMs);
  },
  payAgain() { const d = SHEET.data; d.state = 'qr'; d.qr = makePaymentQr(d.amount, d.ref); renderSheet(); },
  toggleQrMode() { const d = SHEET.data; d.mode = d.mode === 'static' ? 'dynamic' : 'static'; if (d.mode === 'dynamic' && Date.now() > d.qr.expiresAt) d.qr = makePaymentQr(d.amount, d.ref); renderSheet(); },
  changePayment() { toast(t('onlyKhqr'), 'info'); },
  fixStock(el) {
    const line = S.checkout.mode === 'buynow' ? S.buyNow : cartLine(el.dataset.id);
    const i = info(line.listingId, line.dealId);
    line.qty = i.stock;
    Object.keys(S.checkout.problems).forEach((k) => { S.checkout.problems[k] = S.checkout.problems[k].filter((p) => p.key !== line.key); if (!S.checkout.problems[k].length) delete S.checkout.problems[k]; });
    render();
  },
  fixRemove(el) {
    if (S.checkout.mode === 'buynow') { S.buyNow = null; S.checkout = null; toast(t('itemRemoved'), 'info'); goBack(); return; }
    removeFromCart(el.dataset.id);
    Object.keys(S.checkout.problems).forEach((k) => { S.checkout.problems[k] = S.checkout.problems[k].filter((p) => p.key !== el.dataset.id); if (!S.checkout.problems[k].length) delete S.checkout.problems[k]; });
    if (!checkoutLines().length) { S.checkout = null; toast(t('itemRemoved'), 'info'); goTab('basket'); return; }
    render();
  },

  /* F9 / F10 orders */
  viewOrders() { S.ui.ordersTab = 'active'; S.ui.ordersFilter = null; goTab('orders'); },
  viewHistory() { S.ui.ordersTab = 'history'; S.ui.ordersFilter = null; goTab('orders'); },
  ordersTab(el) { S.ui.ordersTab = el.dataset.t; if (el.dataset.t === 'history') S.ui.ordersFilter = null; render(); },
  clearOrdersFilter() { S.ui.ordersFilter = null; render(); },
  ordersShortcut(el) { S.ui.ordersTab = 'active'; S.ui.ordersFilter = el.dataset.f; goTab('orders'); },

  /* F11 details */
  cancelOrder(el) {
    const o = order(el.dataset.id);
    confirmDialog({
      title: t('cancelQ'), text: t('cancelSub'), icon: 'warning', tone: 'danger', ok: t('yesCancel'),
      onOk() { if (BuyerActions.cancel(o)) { refresh(); toast(t('cancelledToast'), 'info'); } else { refresh(); toast(t('coopAnswered'), 'error'); } },
    });
  },
  findAnother(el) { const o = order(el.dataset.id); navigate('results', { q: listing(o.items[0].listingId).product }); },
  callDriver(el) { const o = order(el.dataset.id); toast(t('callingDriver', { n: esc(o.driver.name), p: esc(o.driver.phone) }), 'info'); },

  /* F14 rate / reorder */
  rate(el) { const o = order(el.dataset.id); openSheet('rate', { id: o.id, stars: o.rating || 0, comment: o.ratingComment || '', report: false, reason: '', items: [], note: '' }); },
  sheetToggle(el) { SHEET.data[el.dataset.k] = !SHEET.data[el.dataset.k]; renderSheet(); },
  sheetItem(el) { const d = SHEET.data, i = Number(el.dataset.i); d.items = d.items.includes(i) ? d.items.filter((x) => x !== i) : [...d.items, i]; renderSheet(); },
  submitRating() {
    const d = SHEET.data, o = order(d.id);
    const rep = d.report && d.reason ? { reason: d.reason, items: d.items.length ? d.items : o.items.map((_, i) => i), note: (d.note || '').trim() } : null;
    BuyerActions.rate(o, d.stars, (d.comment || '').trim(), rep);
    closeSheet(); refresh();
    toast(rep ? t('reportSentToast') : t('thanksRating', { n: d.stars }));
  },
  reorder(el) {
    const res = BuyerActions.reorder(order(el.dataset.id));
    goTab('basket');
    if (res.skipped.length) toast(t('reorderSkipped', { p: res.skipped.map((p) => esc(pname(p))).join(', ') }), 'err');
    else toast(t('reorderDone', { n: res.added.length }));
  },

  /* F15 account */
  toggleNotif() { S.ui.notifOn = !S.ui.notifOn; render(); toast(S.ui.notifOn ? t('notifOnToast') : t('notifOffToast'), 'info'); },
  setDefaultAddr(el) {
    const i = DB.addresses.findIndex((a) => a.id === el.dataset.id);
    const [a] = DB.addresses.splice(i, 1); DB.addresses.unshift(a);
    render(); toast(t('defaultSet'));
  },
  saveAddress() {
    const d = SHEET.data;
    if (!d.line.trim() || !d.recipient.trim()) { d.err = 'errAddress'; renderSheet(); return; }
    const vals = { label: { km: d.label || 'ទីតាំងថ្មី', en: d.label || 'New address' }, recipient: d.recipient.trim(), phone: d.phone.trim(), line: d.line.trim() };
    let id = d.id;
    if (id) Object.assign(address(id), vals);
    else { id = 'a' + Date.now(); DB.addresses.push({ id, ...vals }); }
    if (S.checkout && !d.id) S.checkout.addressId = id;
    closeSheet(); render(); toast(t('saved'));
  },

  /* F17 notifications */
  readAll() { DB.notifications.forEach((x) => { x.read = true; }); render(); },
  openNotif(el) {
    const x = DB.notifications.find((y) => String(y.id) === el.dataset.id);
    x.read = true;
    if (x.orderId && order(x.orderId)) {
      const o = order(x.orderId);
      navigate(o.status === 'dispatched' ? 'track' : 'order', { id: o.id });
    } else if (['stock', 'price'].includes(x.type)) goTab('basket');
    else render();
  },

  /* Demo controls (Seller simulation) */
  demoToggle() { document.body.classList.toggle('demo-open'); },
  demoOrder(el) {
    const o = order(DEMO.orderId);
    const msg = SellerSim.run(o, el.dataset.a, DECLINE_REASONS[DEMO.reason]);
    if (!msg) return;
    refresh();
    if (el.dataset.a === 'deliver') toast(esc(L(msg)), 'info', { action: 'openDelivered', label: t('viewReceipt') });
    else toast(esc(L(msg)), 'info');
    ACTIONS._delivered = o.id;
  },
  openDelivered() { document.getElementById('toast-root').innerHTML = ''; if (ACTIONS._delivered && S.session) navigate('order', { id: ACTIONS._delivered }); },
  demoStock() {
    const l = listing(DEMO.listingId), v = Math.max(0, Math.round(Number(DEMO.stockN) || 0));
    l.stock = v; notifyBasketChange(l, v > 0 ? 'stock' : 'unavailable');
    const d = DB.deals.find((x) => x.listingId === l.id); if (d) d.kgLeft = Math.min(d.kgLeft, v);
    refresh(); toast(`${esc(product(l.product).name.en)}: ${v} kg`, 'info');
  },
  demoPrice() {
    const l = listing(DEMO.listingId), v = Number(DEMO.price);
    if (!(v > 0)) return;
    l.price = r2(v); notifyBasketChange(l, 'price');
    const d = DB.deals.find((x) => x.listingId === l.id); if (d) { d.was = l.price; if (d.now >= l.price) d.now = r2(l.price * (1 - d.off / 100)); }
    DEMO.price = '';
    refresh(); toast(`${esc(product(l.product).name.en)}: ${money(l.price)}/kg`, 'info');
  },
  demoAvail() {
    const l = listing(DEMO.listingId);
    l.available = !l.available; if (!l.available) notifyBasketChange(l, 'unavailable');
    refresh();
  },
  demoSwitch(el) { S.demo[el.dataset.k] = !S.demo[el.dataset.k]; renderDemo(); },
  demoExpireSession() {
    if (!S.session) return;
    const r = S.route;
    S.returnTo = { route: { name: r.name, params: r.params }, stack: S.stack.slice() };
    S.session = null; SHEET = null; document.getElementById('sheet-root').innerHTML = ''; MODAL = null; renderModal();
    S.ui.login = { phone: '012 345 678', code: '', err: null };
    S.stack = []; S.route = { name: 'login', params: {} };
    render('fwd');
  },
  demoReset() {
    resetDemo();
    Link.sync();
    SHEET = null; document.getElementById('sheet-root').innerHTML = ''; MODAL = null; renderModal();
    if (S.session) goTab('home'); else render();
    toast('Demo reset (both apps)', 'info');
  },
};

/* ---------------- live link with the Seller app ----------------
   The Seller app saves → the browser fires "storage" here → we pull the
   new stock, prices and order statuses and show them straight away. */
function pullFromSeller() {
  const fresh = Link.sync();
  normalizeCart();
  if (S.route.name === 'splash') { Saved.save(); return; }
  refresh();
  if (!fresh.length || !S.session) return;
  const x = fresh[0];   // newest update
  if (x.type === 'delivered' || x.type === 'dispatched') { ACTIONS._delivered = x.orderId; toast(esc(L(x.msg)), 'info', { action: 'openDelivered', label: t(x.type === 'delivered' ? 'viewReceipt' : 'viewOrder') }); }
  else toast(esc(L(x.msg)), x.type === 'declined' || x.type === 'cancelled' ? 'error' : 'info');
}
window.addEventListener('storage', (e) => {
  if (e.key === SELLER_KEY) { pullFromSeller(); return; }
  // "Reset demo" pressed in the Seller app clears everything → start again from today's demo data
  if ((e.key === null || e.key === 'hf_buyer_v1') && e.newValue === null) {
    resetDemo({ local: true }); Link.sync();
    SHEET = null; document.getElementById('sheet-root').innerHTML = ''; MODAL = null; renderModal();
    if (S.session) goTab('home'); else render();
  }
  if (e.key === 'hf_lang' && e.newValue && e.newValue !== LANG) { LANG = e.newValue; document.documentElement.lang = LANG; refresh(); }
});
window.addEventListener('focus', () => { if (Link.enabled()) pullFromSeller(); });

/* ---------------- boot: splash (< 2 s) → login ---------------- */
try { const l = localStorage.getItem('hf_lang'); if (l === 'km' || l === 'en') LANG = l; } catch (e) { /* ignore */ }
document.documentElement.lang = LANG;
Saved.load();
Link.sync();
normalizeCart();
try { history.replaceState({ hf: 1 }, ''); } catch (e) { /* ignore */ }
if (location.hash === '#login' || S.session) {
  // Coming from the shared login screen (or already logged in): no splash.
  S.route = S.session ? { name: 'home', params: {} } : { name: 'login', params: {} };
  try { history.replaceState({ hf: 1 }, '', location.pathname + location.search); } catch (e) { /* ignore */ }
  render('fwd');
} else {
  render();
  setTimeout(() => {
    S.route = S.session ? { name: 'home', params: {} } : { name: 'login', params: {} };
    render('fwd');
  }, CONFIG.splashMs);
}
