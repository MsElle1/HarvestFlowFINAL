/* =========================================================
   SHEETS & MODALS — overlays so the farmer can pick things
   without leaving the current page.
   ========================================================= */

let SHEET = null;   // { name, data }
let MODAL = null;   // { ...opts }

function openSheet(name, data = {}) {
  SHEET = { name, data: Object.assign({}, SHEET_INIT[name] ? SHEET_INIT[name](data) : {}, data) };
  renderSheet(true);
}

function closeSheet() {
  const root = document.getElementById('sheet-root');
  const el = root.querySelector('.sheet');
  SHEET = null;
  if (!el) { root.innerHTML = ''; return; }
  el.classList.add('closing');
  const bd = root.querySelector('.backdrop');
  if (bd) bd.style.opacity = '0';
  setTimeout(() => { if (!SHEET) root.innerHTML = ''; }, 190);
}

function renderSheet(first = false) {
  const root = document.getElementById('sheet-root');
  if (!SHEET) { root.innerHTML = ''; return; }
  const def = SHEETS[SHEET.name](SHEET.data);
  const prevScroll = root.querySelector('.sheet-bd') ? root.querySelector('.sheet-bd').scrollTop : 0;
  root.innerHTML = `<div class="backdrop" data-action="closeSheet"></div>
    <div class="sheet ${first ? '' : 'no-anim'}" role="dialog" aria-modal="true" style="${first ? '' : 'animation:none'}">
      <div class="handle"></div>
      <div class="sheet-hd"><span class="si">${icon(def.icon || 'box', 21)}</span><div class="grow"><h3>${def.title}</h3>${def.sub ? `<p>${def.sub}</p>` : ''}</div>
        <button class="icon-btn plain" data-action="closeSheet" aria-label="${t('close')}">${icon('close', 20)}</button></div>
      <div class="sheet-bd">${def.body}</div>
      ${def.footer ? `<div class="sheet-ft">${def.footer}</div>` : ''}
    </div>`;
  if (!first) root.querySelector('.backdrop').style.animation = 'none';
  root.querySelector('.sheet-bd').scrollTop = prevScroll;
}

/* ---------- Confirm modal ---------- */
function confirmModal(opts) {
  MODAL = opts; MODAL.openedAt = Date.now();
  renderModal();
}
function renderModal() {
  const root = document.getElementById('modal-root');
  root.innerHTML = '';
  if (!MODAL) return;
  const m = MODAL;
  const wrap = document.createElement('div');
  wrap.className = 'modal-wrap';
  wrap.innerHTML = `<div class="backdrop" data-action="modalCancel"></div>
    <div class="modal" role="alertdialog">
      <div class="mi ${m.tone || ''}">${icon(m.icon || 'help', 32)}</div>
      <h3>${m.title}</h3>${m.text ? `<p>${m.text}</p>` : ''}
      ${m.summary ? `<div class="summary">${m.summary}</div>` : ''}
      <div class="btn-row">
        <button class="btn secondary block" data-action="modalCancel">${m.cancelLabel || t('goBack')}</button>
        <button class="btn ${m.tone === 'danger' ? 'danger' : 'primary'} block" data-action="modalOk">${m.okLabel || t('ok')}</button>
      </div>
    </div>`;
  root.appendChild(wrap);
}

/* ---------- Initial data for sheets ---------- */
const SHEET_INIT = {
  editStock: ({ id }) => { const b = batch(id); return { available: avail(b), grade: b.grade, location: b.location, shelf: b.shelfLifeDays, notes: b.notes || '', reason: 'rCorrection' }; },
  removeStock: ({ id }) => { const b = batch(id); return { qty: avail(b), reason: daysLeft(b) < 0 ? 'rExpired' : 'rDamaged' }; },
  discount: ({ id }) => ({ pct: batch(id).discountPct || 20 }),
  reject: ({ id }) => { const it = orderItem(id); return { reason: planAllocation(it.cropId, it.qty).ok ? 'rjQuality' : 'rjStock' }; },
  fulfilment: ({ id }) => {
    const o = order(id), by = buyer(o.buyerId), f = o.fulfilment || {};
    return {
      method: f.method || o.method,
      destination: f.destination || L(o.location), phone: f.phone || by.phone, date: f.date || isoDay(0), notes: f.notes || '',
      pickupLocation: f.pickupLocation || 'A', pickupTime: f.pickupTime || 'morning', pickupDate: f.pickupDate || isoDay(0),
    };
  },
  newFarmer: () => ({ name: '', phone: '', location: '', err: '' }),
  newCrop: () => ({ name: '', icon: DEFAULT_CROP_ICON, category: 'veg', err: '' }),
  editProfile: () => {
    const p = DB.sellerProfile;
    return { name: L(p.name), coop: L(p.coop), phone: p.phone, location: L(p.location), storage: L(p.storage), coverage: L(p.coverage) };
  },
};

/* ---------- Sheet definitions ---------- */
const fieldHtml = (label, key, val, opts = {}) => `<div class="field"><label>${label}${opts.req ? ' <span class="req">*</span>' : ''}</label>
  <input type="${opts.type || 'text'}" ${opts.inputmode ? `inputmode="${opts.inputmode}"` : ''} value="${esc(val)}" data-bind="${key}" data-scope="sheet" placeholder="${esc(opts.ph || '')}"></div>`;

const qtyStepper = (val, key) => `<div class="qty-box"><div class="qty-row">
  <button class="step" data-action="sheetStep" data-k="${key}" data-d="-1">${icon('minus', 22)}</button>
  <div class="qty-input"><div class="in"><input type="number" inputmode="decimal" min="0" value="${val}" data-bind="${key}" data-scope="sheet"><span class="u">kg</span></div></div>
  <button class="step plus" data-action="sheetStep" data-k="${key}" data-d="1">${icon('plus', 22)}</button></div></div>`;

const SHEETS = {
  farmerPicker() {
    const sel = appState.ui.addForm && appState.ui.addForm.farmerId;
    return {
      icon: 'users', title: t('selectFarmer'),
      body: `<button class="reg-btn" data-action="openSheet" data-sheet="newFarmer" data-return="addHarvest"><span class="ri">${icon('userPlus', 20)}</span><span class="grow"><b>${t('registerFarmer')}</b><small>${t('registerFarmerSub')}</small></span>${icon('chevronRight', 18)}</button>
        <div class="label-sm"><span>${t('tabFarmers')}</span><span>${t('farmersCount', { n: n(DB.farmers.length) })}</span></div>
        <div class="sel-list">${DB.farmers.map((f) => `<button class="sel-item ${String(sel) === String(f.id) ? 'on' : ''}" data-action="pickFarmer" data-id="${f.id}">
          ${farmerAvatar(f, 48)}<span class="grow"><b>${esc(farmerName(f))}</b><small>${icon('phone', 11)} ${esc(f.phone || '—')} · ${esc(L(f.location))}</small></span><span class="radio">${icon('check', 14)}</span></button>`).join('')}</div>`,
    };
  },

  newFarmer(d) {
    return {
      icon: 'userPlus', title: t('newFarmer'), sub: t('registerFarmerSub'),
      body: `${fieldHtml(t('farmerName'), 'name', d.name, { req: true, ph: 'សុខា' })}
        ${d.err ? `<div class="err-msg" style="margin:-6px 0 12px">${icon('alert', 15)} ${t(d.err)}</div>` : ''}
        ${fieldHtml(t('phone'), 'phone', d.phone, { type: 'tel', inputmode: 'tel', ph: '012 345 678' })}
        ${fieldHtml(t('location'), 'location', d.location, { ph: 'ស្រុកបាណន់, បាត់ដំបង' })}`,
      footer: `<div class="btn-row"><button class="btn primary" data-action="saveFarmer">${icon('check', 18)} ${d.return ? t('saveAndSelect') : t('save')}</button><button class="btn outline fit" data-action="closeSheet">${t('cancel')}</button></div>`,
    };
  },

  newCrop(d) {
    return {
      icon: 'leaf', title: t('newCrop'),
      body: `${fieldHtml(t('cropName'), 'name', d.name, { req: true, ph: 'ត្រកួន' })}
        ${d.err ? `<div class="err-msg" style="margin:-6px 0 12px">${icon('alert', 15)} ${t(d.err)}</div>` : ''}
        <div class="label-sm">${t('chooseIcon')}</div>
        <div class="emoji-grid icon-grid">${CROP_ICONS.map((src) => `<button class="${d.icon === src ? 'on' : ''}" data-action="sheetSet" data-k="icon" data-v="${src}" aria-label="icon"><img src="${src}" alt=""></button>`).join('')}</div>
`,
      footer: `<div class="btn-row"><button class="btn primary" data-action="saveCrop">${icon('check', 18)} ${t('save')}</button><button class="btn outline fit" data-action="closeSheet">${t('cancel')}</button></div>`,
    };
  },

  sort() {
    const opts = [['shelf', 'sortShelf', 'hourglass'], ['most', 'sortMost', 'trendUp'], ['least', 'sortLeast', 'trendDown'], ['newest', 'sortNewest', 'calendar']];
    return {
      icon: 'sort', title: t('sortBy'),
      body: `<div class="sort-list">${opts.map(([id, k, ic]) => `<button class="${appState.ui.sort === id ? 'on' : ''}" data-action="setSort" data-v="${id}"><span style="display:flex;gap:10px;align-items:center">${icon(ic, 19)} ${t(k)}</span>${appState.ui.sort === id ? icon('check', 20) : ''}</button>`).join('')}</div>`,
    };
  },

  review() {
    const F = appState.ui.addForm;
    const c = crop(F.cropId), f = farmer(F.farmerId);
    const edit = (sec) => `<button class="link-btn" data-action="editSection" data-sec="${sec}">${icon('edit', 13)}</button>`;
    return {
      icon: 'checkCircle', title: t('reviewTitle'),
      body: `<div class="review-top">${thumb(c, 64, F.grade)}<div><h4>${esc(cropName(c))}</h4><div class="qty">${kgFmt(Number(F.qty))}<em>kg</em></div></div></div>
        <div class="review-list">
          ${kv(t('crop'), `${esc(cropName(c))} ${edit('crop')}`)}
          ${kv(t('quantity'), `${kgFmt(Number(F.qty))} kg ${edit('qty')}`)}
          ${kv(t('farmerLabel'), `${esc(farmerName(f))} ${edit('farmer')}`)}
          ${kv(t('harvestDate'), `${fmtDate(F.harvestDate)} ${edit('date')}`)}
          ${kv(t('quality'), `Grade ${F.grade} · ${t('grade' + F.grade)} ${edit('quality')}`)}
          ${kv(t('shelfLife'), `${t('days', { n: n(F.shelf) })} ${edit('shelf')}`)}
          ${kv(t('storage'), `${locName(F.location)} ${edit('location')}`)}
        </div>
        <div class="meta" style="margin-top:10px;text-align:center">${icon('calendar', 12)} ${t('expiresOn')} <b>${fmtDate(addDaysIso(F.harvestDate, F.shelf))}</b></div>`,
      footer: `<button class="btn primary block lg" data-action="confirmHarvest">${icon('check', 20)} ${t('confirmAddStock')}</button>`,
    };
  },

  editStock(d) {
    const b = batch(d.id), c = crop(b.cropId);
    const changed = Math.abs(Number(d.available) - avail(b)) > 0.001;
    return {
      icon: 'edit', title: t('editStock'), sub: `${cropMark(c)} ${esc(cropName(c))} · #${b.id}`,
      body: `<div class="label-sm">${t('available')} <span>${t('editQtyHint')}</span></div>
        ${qtyStepper(d.available, 'available')}
        ${changed ? `<div class="label-sm" style="margin-top:12px">${t('reason')}</div><div class="pick-chips">${['rCorrection', 'rDamaged', 'rOther'].map((r) => `<button class="pick ${d.reason === r ? 'on' : ''}" data-action="sheetSet" data-k="reason" data-v="${r}">${t(r)}</button>`).join('')}</div>` : ''}
        <div class="label-sm" style="margin-top:16px">${t('quality')}</div>
        <div class="opt-grid c3">${GRADES.map((g) => `<button class="opt center g-${g} ${d.grade === g ? 'on' : ''}" data-action="sheetSet" data-k="grade" data-v="${g}"><b>Grade ${g}</b><small>${t('grade' + g)}</small></button>`).join('')}</div>
        <div class="label-sm" style="margin-top:16px">${t('storage')}</div>
        <div class="opt-grid c3">${LOCATIONS.map((l) => `<button class="opt center ${d.location === l ? 'on' : ''}" data-action="sheetSet" data-k="location" data-v="${l}"><b>${icon(l === 'COLD' ? 'snow' : 'warehouse', 15)} ${locName(l)}</b></button>`).join('')}</div>
        <div class="label-sm" style="margin-top:16px">${t('shelfLife')} <span>${t('expiresOn')} ${fmtDate(addDaysIso(b.harvestDate, d.shelf))}</span></div>
        <div class="pick-chips">${[1, 2, 3, 4, 5, 7, 10, 14].map((x) => `<button class="pick ${Number(d.shelf) === x ? 'on' : ''}" data-action="sheetSet" data-k="shelf" data-v="${x}">${t('days', { n: n(x) })}</button>`).join('')}</div>
        <div style="margin-top:16px">${fieldHtml(t('notes'), 'notes', d.notes, { ph: t('optional') })}</div>`,
      footer: `<button class="btn primary block lg" data-action="saveEdit">${icon('check', 20)} ${t('save')}</button>`,
    };
  },

  removeStock(d) {
    const b = batch(d.id), c = crop(b.cropId), a = avail(b);
    const q = Number(d.qty) || 0;
    return {
      icon: 'trash', title: t('removeTitle'), sub: `${cropMark(c)} ${esc(cropName(c))} · ${t('available')} ${kgFmt(a)} kg`,
      body: a <= 0 ? emptyState('box', t('nothingToRemove')) : `<div class="label-sm">${t('removeQty')}</div>
        ${qtyStepper(d.qty, 'qty')}
        <div class="quick" style="grid-template-columns:repeat(3,1fr)">${[5, 10].map((v) => `<button data-action="sheetSet" data-k="qty" data-v="${Math.min(v, a)}">${v} kg</button>`).join('')}<button data-action="sheetSet" data-k="qty" data-v="${a}">${t('removeAll')}</button></div>
        <div class="label-sm" style="margin-top:16px">${t('reason')}</div>
        <div class="opt-grid c2">${[['rDamaged', 'warning'], ['rExpired', 'hourglass'], ['rDonated', 'users'], ['rOther', 'note']].map(([r, e]) => `<button class="opt center ${d.reason === r ? 'on' : ''}" data-action="sheetSet" data-k="reason" data-v="${r}"><b>${icon(e, 17)} ${t(r)}</b></button>`).join('')}</div>
        ${q > a || q <= 0 ? `<div class="err-msg">${icon('alert', 15)} ${t('errRemoveQty')}</div>` : ''}
        <div class="meta" style="text-align:center;margin-top:12px">${icon('history', 12)} ${t('removeNote')}</div>`,
      footer: a <= 0 ? '' : `<button class="btn danger block lg" data-action="confirmRemove" ${q > a || q <= 0 ? 'disabled' : ''}>${icon('trash', 20)} ${t('removeConfirm', { n: kgFmt(q) })}</button>`,
    };
  },

  discount(d) {
    const b = batch(d.id), c = crop(b.cropId);
    const ref = DB.marketPrices.find((p) => p.cropId === b.cropId && p.marketId === 'btb');
    const price = ref ? ref.price : 1;
    return {
      icon: 'tag', title: t('discountTitle'), sub: `${cropMark(c)} ${esc(cropName(c))} · ${kgFmt(avail(b))} kg · ${t('discountSub')}`,
      body: `<div class="disc-grid">${[10, 20, 30, 50].map((p) => `<button class="pick ${Number(d.pct) === p ? 'on' : ''}" data-action="sheetSet" data-k="pct" data-v="${p}">-${p}%</button>`).join('')}</div>
        <div class="price-preview"><div><small>${t('refPrice')}</small><s>${money(price)}</s></div><div style="font-size:22px;color:var(--muted)">→</div><div><small>${t('newPrice')}</small><b>${money(price * (1 - d.pct / 100))}</b><small>/kg</small></div></div>`,
      footer: `<div class="btn-row">${b.discountPct ? `<button class="btn outline fit" data-action="applyDiscount" data-pct="0">${t('removeDiscount')}</button>` : ''}<button class="btn primary" data-action="applyDiscount" data-pct="${d.pct}">${icon('tag', 18)} ${t('applyDiscount')}</button></div>`,
    };
  },

  reject(d) {
    return {
      icon: 'close', title: t('rejectTitle'), sub: `#${d.id}`,
      body: `<div class="label-sm">${t('rejectReason')}</div>
        <div class="sel-list">${['rjStock', 'rjQuality', 'rjDelivery', 'rjPrice', 'rOther'].map((r) => `<button class="sel-item ${d.reason === r ? 'on' : ''}" data-action="sheetSet" data-k="reason" data-v="${r}"><span class="grow"><b>${t(r)}</b></span><span class="radio">${icon('check', 14)}</span></button>`).join('')}</div>`,
      footer: `<button class="btn danger block lg" data-action="confirmReject">${t('confirmReject')}</button>`,
    };
  },

  fulfilment(d) {
    const dateChips = (key) => `<div class="pick-chips">${[[isoDay(0), 'today'], [isoDay(1), 'tomorrow']].map(([v, k]) => `<button class="pick ${d[key] === v ? 'on' : ''}" data-action="sheetSet" data-k="${key}" data-v="${v}">${icon('calendar', 15)} ${t(k)}</button>`).join('')}</div>`;
    const body = `<div class="opt-grid c2" style="margin-bottom:16px">
        <button class="opt center ${d.method === 'delivery' ? 'on' : ''}" data-action="sheetSet" data-k="method" data-v="delivery" style="min-height:84px"><b style="flex-direction:column;gap:4px">${icon('truck', 28)} ${t('mDelivery')}</b></button>
        <button class="opt center ${d.method === 'pickup' ? 'on' : ''}" data-action="sheetSet" data-k="method" data-v="pickup" style="min-height:84px"><b style="flex-direction:column;gap:4px">${icon('store', 28)} ${t('mPickup')}</b></button>
      </div>
      ${d.method === 'delivery' ? `
        ${fieldHtml(t('destination'), 'destination', d.destination, { req: true })}
        ${fieldHtml(t('phone'), 'phone', d.phone, { type: 'tel', inputmode: 'tel' })}
        <div class="label-sm">${t('deliveryDate')}</div>${dateChips('date')}
        <div style="margin-top:14px">${fieldHtml(t('deliveryNotes'), 'notes', d.notes, { ph: t('optional') })}</div>`
      : `<div class="label-sm">${t('pickupLocation')}</div>
        <div class="opt-grid c3">${['A', 'B', 'OFFICE'].map((l) => `<button class="opt center ${d.pickupLocation === l ? 'on' : ''}" data-action="sheetSet" data-k="pickupLocation" data-v="${l}"><b>${icon(l === 'OFFICE' ? 'store' : 'warehouse', 15)}</b><small>${l === 'OFFICE' ? t('coopOffice') : locName(l)}</small></button>`).join('')}</div>
        <div class="label-sm" style="margin-top:14px">${t('date')}</div>${dateChips('pickupDate')}
        <div class="label-sm" style="margin-top:14px">${t('pickupTime')}</div>
        <div class="pick-chips">${['morning', 'afternoon'].map((k) => `<button class="pick ${d.pickupTime === k ? 'on' : ''}" data-action="sheetSet" data-k="pickupTime" data-v="${k}">${icon('clock', 15)} ${t(k)}</button>`).join('')}</div>`}`;
    return {
      icon: 'truck', title: t('fulfilTitle'), sub: `#${d.id}`,
      body,
      footer: `<button class="btn primary block lg" data-action="saveFulfilment">${icon('check', 20)} ${t('confirmReady')}</button>`,
    };
  },

  priceDetail(d) {
    const p = DB.marketPrices.find((x) => x.cropId === d.crop && x.marketId === d.market);
    const c = crop(p.cropId), m = MARKETS.find((x) => x.id === p.marketId);
    const max = Math.max(...p.history) * 1.1;
    const labels = [-4, -3, -2, -1, 0].map((o) => { const x = new Date(); x.setDate(x.getDate() + o); return o === 0 ? t('today') : `${x.getDate()}/${x.getMonth() + 1}`; });
    const mine = cropAvailable(p.cropId);
    return {
      icon: 'price', title: `${cropMark(c)} ${esc(cropName(c))}`, sub: t('priceDetail'),
      body: `<div class="ref-note" style="margin:0 0 14px">${icon('alert', 16)} <span>${t('refOnly')}</span></div>
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">${thumb(c, 60)}<div><div class="qty" style="color:var(--green-700)">${money(p.price)}<em>/kg</em></div>${priceChange(p)}</div></div>
        ${kv(t('prevPrice'), `${money(p.prevPrice)} /kg`)}${kv(t('market'), esc(L(m.name)))}${kv(t('updated'), `${fmtDate(p.updatedAt)} · ${fmtTime(p.updatedAt)}`)}${kv(t('source'), esc(L(p.source)))}
        <div class="label-sm" style="margin-top:16px">${t('last5')}</div>
        <div class="bars">${p.history.map((v, i) => `<div class="bcol ${i === 4 ? 'last' : ''}"><b>${money(v)}</b><i style="height:${(v / max) * 80}%"></i><small>${labels[i]}</small></div>`).join('')}</div>
        ${mine > 0 ? `<div class="card" style="margin-top:16px;background:var(--green-50);box-shadow:none">${kv(t('yourStockValue'), `${kgFmt(mine)} kg`)}${kv(t('estValue'), `≈ ${money(mine * p.price)}`, 'total')}</div>` : ''}`,
    };
  },

  editProfile(d) {
    return {
      icon: 'user', title: t('editProfile'),
      body: `${fieldHtml(t('coopName'), 'coop', d.coop)}${fieldHtml(t('manager'), 'name', d.name)}${fieldHtml(t('phone'), 'phone', d.phone, { type: 'tel' })}
        ${fieldHtml(t('location'), 'location', d.location)}${fieldHtml(t('storagePoint'), 'storage', d.storage)}${fieldHtml(t('deliveryCoverage'), 'coverage', d.coverage)}`,
      footer: `<button class="btn primary block lg" data-action="saveProfile">${icon('check', 20)} ${t('save')}</button>`,
    };
  },

  help() {
    return {
      icon: 'help', title: t('helpFaq'),
      body: `<div class="card" style="box-shadow:none;background:var(--green-50)"><p style="margin:0;font-size:15px;line-height:1.7">${icon('phone', 17)} ${t('helpText')}</p></div>
        <div class="stack" style="margin-top:14px">
          ${[['plusCircle', 'addStock'], ['orders', 'accept'], ['truck', 'chooseFulfil'], ['checkCircle', 'markComplete']].map(([ic, k], i) => `<div class="frow" style="box-shadow:none;background:#f6f8f5"><span class="phone-btn">${icon(ic, 18)}</span><div class="grow"><b>${n(i + 1)}. ${t(k)}</b></div></div>`).join('')}
        </div>`,
    };
  },
};
