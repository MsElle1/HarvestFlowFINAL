/* =========================================================
   BOTTOM SHEETS + CONFIRM DIALOG
   ========================================================= */
let SHEET = null;  // { name, data }
let MODAL = null;

function openSheet(name, data = {}) { SHEET = { name, data }; renderSheet(true); }
function closeSheet() {
  const root = document.getElementById('sheet-root');
  const el = root.querySelector('.sheet');
  SHEET = null;
  if (!el) { root.innerHTML = ''; return; }
  el.classList.add('closing');
  const bd = root.querySelector('.backdrop'); if (bd) bd.style.opacity = '0';
  setTimeout(() => { if (!SHEET) root.innerHTML = ''; }, 180);
}
function renderSheet(first = false) {
  const root = document.getElementById('sheet-root');
  if (!SHEET) { root.innerHTML = ''; return; }
  const def = SHEETS[SHEET.name](SHEET.data);
  const bd = root.querySelector('.sheet-bd');
  const prev = bd ? bd.scrollTop : 0;
  root.innerHTML = `<div class="backdrop" ${def.locked ? '' : 'data-action="closeSheet"'} style="${first ? '' : 'animation:none'}"></div>
    <div class="sheet" role="dialog" aria-modal="true" style="${first ? '' : 'animation:none'}">
      <div class="handle"></div>
      ${def.title ? `<div class="sheet-hd"><div class="grow"><h3>${def.title}</h3>${def.sub ? `<p>${def.sub}</p>` : ''}</div>
        ${def.locked ? '' : `<button class="iconbtn soft" data-action="closeSheet" aria-label="${t('close')}">${icon('close', 19)}</button>`}</div>` : ''}
      <div class="sheet-bd">${def.body}</div>
      ${def.footer ? `<div class="sheet-ft">${def.footer}</div>` : ''}
    </div>`;
  const nb = root.querySelector('.sheet-bd'); if (nb) nb.scrollTop = prev;
}

function confirmDialog(opts) { MODAL = opts; MODAL.openedAt = Date.now(); renderModal(); }
function renderModal() {
  const root = document.getElementById('modal-root');
  root.innerHTML = '';
  if (!MODAL) return;
  const m = MODAL;
  root.innerHTML = `<div class="modal-wrap"><div class="backdrop" data-action="modalCancel"></div>
    <div class="modal" role="alertdialog"><div class="mi ${m.tone || ''}">${icon(m.icon || 'help', 30)}</div>
      <h3>${m.title}</h3>${m.text ? `<p>${m.text}</p>` : ''}
      <div class="mbtns"><button class="btn ${m.tone === 'danger' ? 'danger' : 'primary'} block" data-action="modalOk">${m.ok || t('ok')}</button>
        ${m.noCancel ? '' : `<button class="btn soft block" data-action="modalCancel">${m.cancel || t('goBack')}</button>`}</div></div></div>`;
}

/** Creates the payment QR for the current amount (fresh one each time). */
function makePaymentQr(amount, ref) {
  const k = CONFIG.payment.khqr;
  return KHQR.build({ amount, currency: 'USD', billNumber: ref, validMinutes: k.validMinutes });
}

const SHEETS = {
  /* Deals never go straight to the basket: pick a quantity first. */
  dealQty(d) {
    const dl = deal(d.id), i = info(dl.listingId, dl.id);
    const reason = d.qty < i.min ? t('minOrderMsg', { n: n(i.min) }) : d.qty > i.stock ? t('maxStockMsg', { n: kg(i.stock) }) : '';
    return {
      title: esc(pname(i.p)), sub: `${t('by')} ${esc(shopName(i.s))} · ${dl.off}% ${t('off')}`,
      body: `<div class="dq">${prodImg(i.p, { h: 64, w: 64, round: 14 })}<div><b class="num dq-p">${money(i.price)}<small>/kg</small></b> <s class="num muted">${money(dl.was)}</s><br>${dealTypeBadge(dl)} ${gradeBadge(dl.grade)}</div></div>
        <div class="qc-row">${stepper(d.qty, { action: 'sheetStep', id: 'qty', min: i.min, max: i.stock, size: 'lg' })}</div>
        <div class="qc-hint ${reason ? 'bad' : ''}">${reason ? icon('alert', 14) + ' ' + reason : t('qtyHint', { min: n(i.min), max: kg(i.stock) })}</div>
        <div class="est"><span>${t('lineTotal')}</span><b class="num">${money(d.qty * i.price)}</b></div>`,
      footer: `<button class="btn primary block lg" data-action="dealAdd" ${reason ? 'disabled' : ''}>${icon('cart', 18)} ${t('add')} · <span class="num">${money(d.qty * i.price)}</span></button>`,
    };
  },

  khqr(d) {
    if (d.state === 'processing') {
      return { locked: true, title: t('payKhqr'), body: `<div class="pay-proc"><span class="spin big"></span><b>${t('processing')}</b><small>${t('dontClose')}</small></div>` };
    }
    if (d.state === 'fail') {
      return {
        title: t('paymentFailed'),
        body: `<div class="pay-proc"><div class="big-ic bad">${icon('alert', 40)}</div><b>${t('paymentFailed')}</b><small>${t('paymentFailedSub')}</small></div>`,
        footer: `<button class="btn primary block lg" data-action="payAgain">${icon('refresh', 18)} ${t('tryAgain')}</button><button class="btn soft block" data-action="changePayment">${t('changePayment')}</button>`,
      };
    }
    const until = new Date(d.qr.expiresAt);
    const hhmm = `${String(until.getHours()).padStart(2, '0')}:${String(until.getMinutes()).padStart(2, '0')}`;
    const merchant = esc(KHQR.merchantName());
    const dynamic = d.mode !== 'static';
    return {
      title: t('scanToPay'), sub: t('scanToPaySub'),
      body: `<div class="khqr-card">${dynamic ? '<div class="kh-top">KH<span class="kh-q">QR</span></div>' : ''}
          <div class="kh-mid"><small>${merchant}</small><b class="num">${money(d.amount)}</b></div>
          ${dynamic
            ? `<div class="kh-qr" aria-label="KHQR">${KHQR.svg(d.qr.payload)}</div><small class="muted">${t('ref')}: ${d.ref} · ${t('validUntil', { t: hhmm })}</small>`
            : `<div class="kh-static"><img src="${CONFIG.payment.khqr.staticImage}" alt="KHQR ${merchant}"></div><div class="note warn" style="margin:8px 10px 0">${icon('alert', 15)} <span>${t('typeAmount', { a: money(d.amount), r: d.ref })}</span></div>`}
        </div>
        <div class="kh-actions">
          ${dynamic ? `<a class="btn soft sm" href="${KHQR.dataUrl(d.qr.payload)}" download="HarvestFlow-KHQR-${d.ref}.gif">${icon('image', 16)} ${t('saveQr')}</a>` : ''}
          <button class="btn ghost sm" data-action="toggleQrMode">${dynamic ? t('useStaticQr') : t('useAmountQr')}</button>
        </div>
        <ol class="kh-steps"><li>${t('payStep1')}</li><li>${t('payStep2', { a: money(d.amount) })}</li><li>${t('payStep3')}</li></ol>
        <p class="muted c small">${t('payOnce')}</p>`,
      footer: `<button class="btn primary block lg" data-action="iHavePaid">${icon('checkCircle', 18)} ${t('iHavePaid')}</button>`,
    };
  },

  /** Rate + feedback + (optional) report a problem — one sheet. */
  rate(d) {
    const o = order(d.id), s = shop(o.shopId);
    const reasons = ['rShort', 'rQuality', 'rWrong', 'rLate', 'rOther'];
    const ok = d.stars || (d.report && d.reason);
    return {
      title: t('rateCoop'), sub: `#${o.id} · ${esc(shopName(s))}`,
      body: `<div class="stars">${[1, 2, 3, 4, 5].map((k) => `<button class="${k <= d.stars ? 'on' : ''}" data-action="sheetSet" data-k="stars" data-v="${k}" aria-label="${k}">${icon(k <= d.stars ? 'starFill' : 'star', 34)}</button>`).join('')}</div>
        <label class="field slim"><span>${t('feedback')} <em>(${t('optional')})</em></span><textarea data-bind="comment" data-scope="sheet" placeholder="${t('commentPh')}">${esc(d.comment || '')}</textarea></label>
        <button class="checkrow ${d.report ? 'on' : ''}" data-action="sheetToggle" data-k="report"><span class="cbox ${d.report ? 'on' : ''}">${icon('check', 14)}</span><span class="grow"><b>${icon('flag', 14)} ${t('reportProblem')}</b><small>${t('reportHint')}</small></span></button>
        ${d.report ? `<div class="rep-box">
          <div class="label-sm">${t('reason')}</div>
          <div class="pick-chips">${reasons.map((x) => `<button class="pick ${d.reason === x ? 'on' : ''}" data-action="sheetSet" data-k="reason" data-v="${x}">${t(x)}</button>`).join('')}</div>
          ${o.items.length > 1 ? `<div class="label-sm">${t('whichItems')}</div>${o.items.map((it, i) => { const on = (d.items || []).includes(i); return `<button class="checkrow ${on ? 'on' : ''}" data-action="sheetItem" data-i="${i}"><span class="cbox ${on ? 'on' : ''}">${icon('check', 14)}</span><span class="grow"><b>${esc(pname(product(listing(it.listingId).product)))}</b><small>${kg(it.qty)} kg</small></span></button>`; }).join('')}` : ''}
          <label class="field slim"><span>${t('whatHappened')}</span><textarea data-bind="note" data-scope="sheet" placeholder="${t('reportNotePh')}">${esc(d.note || '')}</textarea></label>
        </div>` : ''}`,
      footer: `<button class="btn primary block lg" data-action="submitRating" ${ok ? '' : 'disabled'}>${d.report ? icon('send', 18) + ' ' + t('submitFeedbackReport') : t('submit')}</button>
        ${ok ? '' : `<div class="why">${t('rateNeed')}</div>`}`,
    };
  },

  /** Dish idea: what it needs, cheapest in-stock listing for each vegetable, add right here. */
  dish(d) {
    const dish = DISHES.find((x) => x.id === d.id);
    const rows = dish.uses.map((key) => {
      const ls = DB.listings.filter((l) => l.product === key && l.available && l.stock >= l.min).sort((a, b) => a.price - b.price);
      const p = product(key);
      if (!ls.length) return `<div class="prow soldout"><div class="prow-main">${prodImg(p, { h: 56, w: 56, round: 12 })}<span class="prow-info"><b>${esc(pname(p))}</b><span class="left">${t('soldOut')}</span></span></div></div>`;
      const pick = dish.grade === 'any' ? ls[0] : (ls.find((l) => l.grade === 'A') || ls[0]);
      return productRow(pick);
    }).join('');
    return {
      title: `${dish.emoji} ${esc(L(dish.name))}`, sub: t('dishNeeds', { n: n(dish.uses.length) }),
      body: `<div class="note ${dish.grade === 'A' ? 'info' : 'warn'}">${icon(dish.grade === 'A' ? 'shield' : 'tag', 15)} <div><b>${dish.grade === 'A' ? t('bestGradeA') : t('gradeBok')}</b><br>${esc(L(dish.tip))}</div></div>
        <div class="label-sm" style="margin-top:14px">${t('dishPick')}</div>
        <div class="dish-list">${rows}</div>`,
      footer: `<button class="btn primary block lg" data-action="addDish" data-id="${dish.id}">${icon('cart', 18)} ${t('addAllDish')}</button>`,
    };
  },

  sort() {
    return {
      title: t('sortBy'),
      body: `<div class="sort-list">${SORTS.map((x) => `<button class="${S.ui.sort === x.id ? 'on' : ''}" data-action="setSort" data-v="${x.id}">
        <span class="so-ic">${icon(x.ic, 18)}</span><span class="grow"><b>${t(x.k)}</b><small>${t(x.sub)}</small></span>${S.ui.sort === x.id ? icon('check', 20) : ''}</button>`).join('')}</div>`,
    };
  },

  pickAddress() {
    return {
      title: t('deliveryAddress'),
      body: `<div class="stack">${DB.addresses.map((a) => `<button class="addr-opt ${S.checkout && S.checkout.addressId === a.id ? 'on' : ''}" data-action="chooseAddress" data-id="${a.id}"><span class="radio ${S.checkout && S.checkout.addressId === a.id ? 'on' : ''}"></span><span><b>${esc(L(a.label))}</b><small>${esc(a.recipient)} · ${esc(a.phone)}</small><small>${esc(a.line)}</small></span></button>`).join('')}</div>`,
      footer: `<button class="btn outline block" data-action="openSheet" data-sheet="editAddress">${icon('plus', 18)} ${t('addAddress')}</button>`,
    };
  },

  editAddress(d) {
    if (!d.init) {
      const a = d.id ? address(d.id) : { label: { km: '', en: '' }, recipient: DB.restaurant.manager, phone: DB.restaurant.phone, line: '' };
      Object.assign(d, { init: true, label: L(a.label), recipient: a.recipient, phone: a.phone, line: a.line, err: '' });
    }
    const f = (k, lbl, ph = '') => `<label class="field slim"><span>${lbl}</span><input type="text" data-bind="${k}" data-scope="sheet" value="${esc(d[k])}" placeholder="${ph}"></label>`;
    return {
      title: d.id ? t('editAddress') : t('addAddress'),
      body: `${f('label', t('addrLabel'), t('addrLabelPh'))}${f('recipient', t('recipient'))}${f('phone', t('phone'))}${f('line', t('address'), 'No. 12, Street 240, Phnom Penh')}
        ${d.err ? `<div class="fe">${t(d.err)}</div>` : ''}`,
      footer: `<button class="btn primary block lg" data-action="saveAddress">${t('save')}</button>`,
    };
  },

  payment() {
    return {
      title: t('paymentMethod'),
      body: `<div class="paysel on"><span class="khqr-logo">KHQR</span><div class="grow"><b>${t('payKhqr')}</b><small>${t('payKhqrSub')}</small></div><span class="radio on"></span></div>
        <p class="muted small">${t('onlyKhqr')}</p>`,
    };
  },
};
