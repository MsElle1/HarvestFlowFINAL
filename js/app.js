/* =========================================================
   APP — navigation, rendering and event handlers
   ========================================================= */
const appEl = document.getElementById('app');
let lastRouteKey = '';
let pushed = 0; // how many browser-history entries we created

/* ---------------- Navigation ---------------- */
const routeKey = (r) => r.name + ':' + JSON.stringify(r.params || {});
const AUTH_FREE = ['role', 'login'];

function currentScroll() { const s = appEl.querySelector('.scroll'); return s ? s.scrollTop : 0; }

function navigate(name, params = {}, { replace = false } = {}) {
  if (!replace) { appState.route.scroll = currentScroll(); appState.stack.push(appState.route); }
  appState.route = { name, params };
  try { history.pushState({ hf: true }, ''); pushed++; } catch (e) { /* file:// may block */ }
  render('fwd');
}

function goTab(name) {
  appState.stack = [];
  appState.route = { name, params: {} };
  render('fwd');
}

function goBack() {
  if (SHEET) { closeSheet(); return; }
  if (MODAL) { MODAL = null; renderModal(); return; }
  if (appState.stack.length) appState.route = appState.stack.pop();
  else if (appState.route.name !== 'home' && appState.currentUser) appState.route = { name: 'home', params: {} };
  else if (appState.route.name === 'login') appState.route = { name: 'role', params: {} };
  render('back');
}

window.addEventListener('popstate', () => { if (pushed > 0) pushed--; goBack(); });

/* ---------------- Rendering ---------------- */
function render(dir) {
  if (!appState.currentUser && !AUTH_FREE.includes(appState.route.name)) appState.route = { name: 'role', params: {} };
  const r = appState.route;
  const def = SCREENS[r.name] || SCREENS.home;
  const key = routeKey(r);
  const same = key === lastRouteKey && !dir;
  const keepScroll = same ? currentScroll() : (dir === 'back' ? (r.scroll || 0) : 0);
  appEl.innerHTML = `<div class="screen ${same ? 'no-anim' : ''} ${dir === 'back' ? 'back-anim' : ''}">${def.render(r.params || {})}</div>${def.nav ? bottomNav(def.nav) : ''}`;
  const sc = appEl.querySelector('.scroll');
  if (sc) sc.scrollTop = keepScroll;
  lastRouteKey = key;
  if (def.after) def.after(r.params || {});
  document.title = 'HarvestFlow — ' + (LANG === 'km' ? 'អ្នកលក់' : 'Seller');
}

/** Re-render the current screen in place (after data changes). */
function refresh() { render(); if (SHEET) renderSheet(); }

/* ---------------- Input binding ---------------- */
document.addEventListener('input', (e) => {
  const el = e.target.closest('[data-bind]');
  if (!el) return;
  const k = el.dataset.bind, scope = el.dataset.scope, v = el.value;
  if (scope === 'sheet' && SHEET) {
    SHEET.data[k] = v;
    if (SHEET.name === 'removeStock' || SHEET.name === 'editStock') softRefreshSheetFooter();
  } else if (scope === 'form') {
    const F = appState.ui.addForm;
    F[k] = v;
    if (F.errors) delete F.errors[{ qty: 'qty', shelf: 'shelf', harvestDate: 'date' }[k]];
    updateAddProgress();
    if (el.dataset.rerender) refresh();
  } else if (scope === 'login') {
    appState.ui.login[k] = v;
  } else if (scope === 'ui') {
    appState.ui[k] = v;
    updateStockResults();
  }
});

/** Update the "x/7 done" indicator without re-rendering (keeps keyboard open). */
function updateAddProgress() {
  const F = appState.ui.addForm;
  const done = addFormDone(F);
  const bar = appEl.querySelector('.progress i');
  if (bar) bar.style.width = (done / 7) * 100 + '%';
  const note = document.getElementById('done-note');
  if (note) note.textContent = t('doneOf', { a: n(done), b: n(7) });
}

function softRefreshSheetFooter() {
  // Re-render only the footer (and the error line) so typing in the quantity box keeps focus.
  const d = SHEET.data;
  if (SHEET.name === 'removeStock') {
    const a = avail(batch(d.id)), q = Number(d.qty) || 0;
    const btn = document.querySelector('[data-action="confirmRemove"]');
    if (btn) { btn.disabled = q > a || q <= 0; btn.innerHTML = `${icon('trash', 20)} ${t('removeConfirm', { n: kgFmt(q) })}`; }
  }
}

/* ---------------- Click handling ---------------- */
document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-action]');
  if (!el) return;
  const fn = ACTIONS[el.dataset.action];
  if (!fn) { console.warn('No action', el.dataset.action); return; }
  e.preventDefault();
  fn(el, e);
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && e.target.closest('.auth')) ACTIONS.login();
  if (e.key === 'Escape') goBack();
});

const ACTIONS = {
  /* navigation */
  back: () => { if (pushed > 0 && !SHEET && !MODAL) history.back(); else goBack(); },
  go(el) {
    const to = el.dataset.to;
    if (to === 'home') { goTab('home'); return; }
    const params = {};
    if (el.dataset.id) params.id = el.dataset.id;
    if (to === 'currentStock' && el.dataset.filter) { appState.ui.filter = el.dataset.filter; appState.ui.search = ''; }
    if (to === 'addHarvest') appState.ui.addForm = newAddForm();
    if (SHEET) { SHEET = null; document.getElementById('sheet-root').innerHTML = ''; }
    navigate(to, params);
  },
  tab(el) {
    if (el.dataset.otab) appState.ui.ordersTab = el.dataset.otab;
    goTab(el.dataset.to);
  },
  /** Shared login: choosing Buyer opens the Buyer app (same site, same saved data). */
  openBuyer: () => { window.location.href = 'buyer/index.html#login'; },

  /* auth */
  login() {
    const f = appState.ui.login;
    if (!f) return;
    f.err = {};
    if (!f.phone || f.phone.replace(/\D/g, '').length < 6) f.err.phone = 'errPhone';
    if (f.pin !== '1234') f.err.pin = 'errPin';
    if (Object.keys(f.err).length) { refresh(); return; }
    appState.currentUser = { phone: f.phone, role: 'seller' };
    try { sessionStorage.setItem('hf_session', JSON.stringify(appState.currentUser)); } catch (e) { /* ignore */ }
    appState.ui.login = null;
    goTab('home');
    toast(t('welcomeBack'));
  },
  logout() {
    confirmModal({
      title: t('confirmLogout'), icon: 'logout', tone: 'danger', okLabel: t('yesLogout'),
      onOk() {
        appState.currentUser = null;
        try { sessionStorage.removeItem('hf_session'); } catch (e) { /* ignore */ }
        appState.stack = [];
        appState.route = { name: 'role', params: {} };
        render('back');
      },
    });
  },
  lang(el) {
    setLang(el.dataset.l);
    refresh();
    toast(t('langChanged'), 'info');
  },

  /* sheets & modals */
  openSheet(el) {
    const d = {};
    if (el.dataset.id) d.id = el.dataset.id;
    if (el.dataset.return) d.return = el.dataset.return;
    if (el.dataset.crop) { d.crop = el.dataset.crop; d.market = el.dataset.market; }
    openSheet(el.dataset.sheet, d);
  },
  closeSheet: () => closeSheet(),
  sheetSet(el) {
    const v = el.dataset.v;
    SHEET.data[el.dataset.k] = isNaN(Number(v)) || v === '' || el.dataset.k === 'date' || el.dataset.k === 'pickupDate' ? v : Number(v);
    renderSheet();
  },
  sheetStep(el) {
    const k = el.dataset.k;
    const cur = Number(SHEET.data[k]) || 0;
    SHEET.data[k] = Math.max(0, Math.round((cur + Number(el.dataset.d)) * 10) / 10);
    renderSheet();
  },
  modalOk() { const m = MODAL; if (!m) return; MODAL = null; renderModal(); if (m.onOk) m.onOk(); },
  modalCancel(el) {
    // A quick double-tap on a button must not close the dialog it just opened.
    if (el && el.classList.contains('backdrop') && MODAL && Date.now() - (MODAL.openedAt || 0) < 500) return;
    MODAL = null; renderModal();
  },

  /* dashboard */
  discount(el) { openSheet('discount', { id: el.dataset.id }); },
  applyDiscount(el) {
    const pct = Number(el.dataset.pct);
    Api.setDiscount(SHEET.data.id, pct);
    closeSheet();
    refresh();
    toast(pct ? t('discountApplied') : t('discountRemoved'));
  },

  /* stock management */
  stockTab(el) { appState.ui.stockTab = el.dataset.tab; render(); appEl.querySelector('.scroll').scrollTop = 0; },
  toggleArchived() { appState.ui.showArchived = !appState.ui.showArchived; refresh(); },
  historyFilter(el) { appState.ui.historyFilter = el.dataset.f; refresh(); },
  filter(el) { appState.ui.filter = el.dataset.f; refresh(); },
  clearSearch() { appState.ui.search = ''; const i = document.getElementById('stock-search'); if (i) { i.value = ''; i.focus(); } updateStockResults(); },
  setSort(el) { appState.ui.sort = el.dataset.v; closeSheet(); refresh(); },

  /* add harvest form */
  form(el) {
    const F = appState.ui.addForm;
    F[el.dataset.k] = el.dataset.v;
    if (el.dataset.k === 'harvestDate') F.showDate = false;
    const errKey = { cropId: 'crop', harvestDate: 'date', grade: 'quality', location: 'location' }[el.dataset.k];
    if (F.errors) delete F.errors[errKey];
    refresh();
  },
  showDate() { appState.ui.addForm.showDate = true; refresh(); },
  shelf(el) { const F = appState.ui.addForm; F.shelf = Number(el.dataset.v); F.shelfCustom = false; if (F.errors) delete F.errors.shelf; refresh(); },
  shelfCustom() { const F = appState.ui.addForm; F.shelfCustom = true; if (SHELF_PRESETS.includes(Number(F.shelf))) F.shelf = ''; refresh(); },
  qtyStep(el) {
    const F = appState.ui.addForm;
    F.qty = String(Math.max(0, Math.round(((Number(F.qty) || 0) + Number(el.dataset.d)) * 10) / 10));
    if (F.errors) delete F.errors.qty;
    refresh();
  },
  qtyAdd(el) {
    const F = appState.ui.addForm;
    F.qty = String(Math.round(((Number(F.qty) || 0) + Number(el.dataset.v)) * 10) / 10);
    if (F.errors) delete F.errors.qty;
    refresh();
  },
  pickFarmer(el) {
    appState.ui.addForm.farmerId = el.dataset.id;
    if (appState.ui.addForm.errors) delete appState.ui.addForm.errors.farmer;
    closeSheet();
    refresh();
  },
  saveFarmer() {
    const d = SHEET.data;
    const res = Api.addFarmer(d);
    if (!res.ok) { d.err = res.error; renderSheet(); return; }
    const ret = d.return;
    closeSheet();
    if (ret === 'addHarvest' && appState.ui.addForm) { appState.ui.addForm.farmerId = String(res.farmer.id); if (appState.ui.addForm.errors) delete appState.ui.addForm.errors.farmer; }
    refresh();
    toast(t('farmerAdded'));
  },
  saveCrop() {
    const d = SHEET.data;
    const res = Api.addCrop(d);
    if (!res.ok) { d.err = res.error; renderSheet(); return; }
    closeSheet();
    if (appState.ui.addForm) { appState.ui.addForm.cropId = res.crop.id; if (appState.ui.addForm.errors) delete appState.ui.addForm.errors.crop; }
    refresh();
    toast(t('cropAdded'));
  },
  reviewHarvest() {
    const F = appState.ui.addForm;
    const errors = Api.validateHarvest({ ...F, shelfLifeDays: F.shelf });
    F.errors = errors;
    if (Object.keys(errors).length) {
      refresh();
      toast(t('errMissing'), 'error');
      const first = ['crop', 'qty', 'farmer', 'date', 'quality', 'shelf', 'location'].find((k) => errors[k]);
      const sec = document.getElementById('sec-' + first);
      if (sec) sec.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    openSheet('review');
  },
  editSection(el) {
    closeSheet();
    setTimeout(() => { const sec = document.getElementById('sec-' + el.dataset.sec); if (sec) sec.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 200);
  },
  async confirmHarvest() {
    const F = appState.ui.addForm;
    const res = Api.addHarvest({ ...F, shelfLifeDays: F.shelf });
    if (!res.ok) { closeSheet(); F.errors = res.errors; refresh(); return; }
    SHEET = null; document.getElementById('sheet-root').innerHTML = '';
    const c = crop(res.batch.cropId);
    await successOverlay(t('stockAdded'), `${cropMark(c)} ${cropName(c)} · ${kgFmt(Number(F.qty))} kg · #${res.batch.id}`);
    appState.ui.addForm = null;
    appState.ui.highlightBatch = res.batch.id;
    appState.ui.filter = 'all'; appState.ui.search = ''; appState.ui.sort = 'shelf';
    navigate('currentStock', {}, { replace: true });
    setTimeout(() => { const card = document.getElementById('card-' + res.batch.id); if (card) card.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 250);
    setTimeout(() => { appState.ui.highlightBatch = null; }, 2500);
  },

  /* stock detail */
  saveEdit() {
    const d = SHEET.data;
    const b = batch(d.id);
    const changed = Math.abs(Number(d.available) - avail(b)) > 0.001;
    const doSave = () => {
      Api.editBatch(d.id, { available: Number(d.available), reason: d.reason, grade: d.grade, location: d.location, shelfLifeDays: d.shelf, notes: d.notes });
      closeSheet(); refresh(); toast(t('stockUpdated'));
    };
    if (!(Number(d.available) >= 0)) { toast(t('errQty'), 'error'); return; }
    if (changed) {
      confirmModal({
        title: t('editStock'), icon: 'edit', okLabel: t('confirm'),
        summary: kv(t('before'), `${kgFmt(avail(b))} kg`) + kv(t('after'), `<span style="color:var(--green-700)">${kgFmt(Number(d.available))} kg</span>`) + kv(t('reason'), t(d.reason)),
        onOk: doSave,
      });
    } else doSave();
  },
  confirmRemove() {
    const d = SHEET.data;
    const res = Api.removeStock(d.id, d.qty, d.reason);
    if (!res.ok) { toast(t(res.error), 'error'); return; }
    closeSheet(); refresh(); toast(t('stockRemoved'));
  },

  /* orders */
  ordersTab(el) { appState.ui.ordersTab = el.dataset.tab; refresh(); },
  acceptOrder(el) {
    const id = el.dataset.id;
    const o = order(id), it = orderItem(id), c = crop(it.cropId);
    const plan = planAllocation(it.cropId, it.qty);
    if (!plan.ok) { toast(t('notEnough'), 'error'); refresh(); return; }
    confirmModal({
      title: t('confirmAccept'), icon: 'orders', okLabel: t('yesAccept'), cancelLabel: t('goBack'),
      summary: kv(t('buyer'), esc(buyer(o.buyerId).name)) + kv(t('product'), `${cropMark(c)} ${kgFmt(it.qty)} kg`) + kv(t('curStock'), `${kgFmt(plan.available)} → <span style="color:var(--green-700)">${kgFmt(plan.available - it.qty)} kg</span>`),
      text: t('autoDeduct'),
      onOk() {
        const res = Api.acceptOrder(id);
        if (!res.ok) { toast(t('notEnough'), 'error'); refresh(); return; }
        refresh();
        toast(t('accepted'));
      },
    });
  },
  confirmReject() {
    const d = SHEET.data;
    Api.rejectOrder(d.id, d.reason);
    closeSheet(); refresh(); toast(t('rejected'), 'info');
  },
  check(el) {
    const res = Api.toggleCheck(el.dataset.id, Number(el.dataset.i));
    refresh();
    if (res.allDone) setTimeout(() => openSheet('fulfilment', { id: el.dataset.id }), 250);
  },
  saveFulfilment() {
    const d = SHEET.data;
    const f = d.method === 'delivery'
      ? { method: 'delivery', destination: (d.destination || '').trim(), phone: (d.phone || '').trim(), date: d.date, notes: (d.notes || '').trim() }
      : { method: 'pickup', pickupLocation: d.pickupLocation, pickupTime: d.pickupTime, pickupDate: d.pickupDate };
    if (f.method === 'delivery' && !f.destination) { toast(t('destination') + ' — ' + t('required'), 'error'); return; }
    const res = Api.setFulfilment(d.id, f);
    closeSheet(); refresh();
    if (res.ok) toast(t('nowReady'));
  },
  startDelivery(el) { Api.startDelivery(el.dataset.id); refresh(); toast(t('deliveryStarted'), 'info'); },
  completeOrder(el) {
    const id = el.dataset.id, it = orderItem(id);
    confirmModal({
      title: t('confirmComplete'), icon: 'checkCircle', okLabel: t('yesComplete'),
      summary: kv(t('qtySold'), `${kgFmt(it.qty)} kg`) + kv(t('revenue'), money(it.subtotal)),
      onOk() { Api.completeOrder(id); refresh(); toast(t('completed')); },
    });
  },
  cancelOrder(el) {
    const id = el.dataset.id;
    confirmModal({
      title: t('confirmCancel'), icon: 'warning', tone: 'danger', okLabel: t('yesCancel'),
      onOk() { Api.cancelOrder(id); refresh(); toast(t('orderCancelled'), 'info'); },
    });
  },

  /* market */
  marketFilter(el) { appState.ui.marketFilter = el.dataset.m; refresh(); },

  /* notifications */
  openNotif(el) {
    const x = byId(DB.notifications, el.dataset.id);
    Api.markRead(x.id);
    const l = x.link || {};
    if (l.screen === 'market' || l.screen === 'orders' || l.screen === 'stockMgmt') { goTab(l.screen); return; }
    if (l.screen && (!l.id || (l.screen === 'orderDetail' ? order(l.id) : batch(l.id)))) navigate(l.screen, l.id ? { id: l.id } : {});
    else refresh();
  },
  readAll() { Api.markAllRead(); refresh(); },

  /* profile */
  saveProfile() {
    const d = SHEET.data;
    Api.updateProfile({ name: d.name, coop: d.coop, phone: d.phone, location: d.location, storage: d.storage, coverage: d.coverage });
    closeSheet(); refresh(); toast(t('profileSaved'));
  },
  toggleNotif() { Api.updateProfile({ notificationsOn: !DB.sellerProfile.notificationsOn }); refresh(); },
  help() { openSheet('help'); },
  resetDemo() {
    confirmModal({
      title: t('resetDemo'), text: t('confirmResetBoth'), icon: 'refresh', tone: 'danger', okLabel: t('confirm'),
      onOk() { Api.resetDemo(); appState.stack = []; appState.ui.addForm = null; goTab('home'); toast(t('resetDone')); },
    });
  },
  simulateOrder() {
    const res = Api.simulateOrder();
    appState.ui.ordersTab = 'new';
    toast(t('simulated') + ' #' + res.id, 'info');
    refresh();
  },
};

/* ---------------- Live link with the Buyer app ----------------
   Both apps share this browser's saved data. When the Buyer app places,
   cancels or rates an order, the browser fires a "storage" event here and
   the seller screens update straight away (no refresh needed). */
function reloadFromStorage() {
  const lastNotif = Math.max(0, ...DB.notifications.map((x) => x.id));
  DB = Persistence.load();
  if (!localStorage.getItem(STORAGE_KEY)) persist(); // other app reset everything
  if (!appState.currentUser) { render(); return; }
  if (SHEET && SHEET.data && SHEET.data.id && !order(SHEET.data.id) && !batch(SHEET.data.id)) closeSheet();
  refresh();
  const fresh = DB.notifications.filter((x) => x.id > lastNotif && ['new', 'order', 'urgent'].includes(x.type) && x.buyerApp);
  if (fresh.length) toast(notifText(fresh[0]), fresh[0].type === 'urgent' ? 'error' : 'info');
}
window.addEventListener('storage', (e) => {
  if (e.key !== null && e.key !== STORAGE_KEY) return;
  reloadFromStorage();
});
// Safety net: if an update was missed while this window was in the background, pick it up on focus.
window.addEventListener('focus', () => {
  try { const raw = localStorage.getItem(STORAGE_KEY); if (raw && raw !== JSON.stringify(DB)) reloadFromStorage(); } catch (e) { /* ignore */ }
});

/* ---------------- Boot ---------------- */
setLang(LANG);
if (appState.currentUser) appState.route = { name: 'home', params: {} };
try { history.replaceState({ hf: true }, ''); } catch (e) { /* ignore */ }
render();
