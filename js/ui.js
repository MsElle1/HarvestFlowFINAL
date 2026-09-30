/* =========================================================
   UI COMPONENTS — reusable render helpers (return HTML strings)
   ========================================================= */

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function cropName(c) { return c ? L(c.name) : '—'; }
function farmerName(f) { return f ? L(f.name) : '—'; }
function locName(loc) { return t('loc' + loc); }

/** Crop image with optional grade overlay (as in Figma cards). */
function thumb(c, size = 64, grade) {
  // Minimalist crop tile: a large vegetable icon on a soft tinted square (no photos).
  const inner = c && c.icon
    ? `<img class="cicon" src="${c.icon}" alt="" style="width:${Math.round(size * 0.68)}px;height:${Math.round(size * 0.68)}px">`
    : `<img class="cicon" src="${DEFAULT_CROP_ICON}" alt="" style="width:${Math.round(size * 0.68)}px;height:${Math.round(size * 0.68)}px">`;
  return `<div class="thumb" style="width:${size}px;height:${size}px;background:${(c && c.tint) || '#eef3ec'}" role="img" aria-label="${esc(cropName(c))}">${inner}${grade ? `<span class="gr ${grade}">${grade}</span>` : ''}</div>`;
}

const FARMER_COLORS = ['#2c6126', '#8a5a1b', '#3a5a8c', '#b7472a', '#5a3fa6', '#0e7a55'];
/** Small inline vegetable icon used next to crop names (falls back to emoji for custom crops). */
function cropMark(c, size = 20) {
  if (c && c.icon) return `<img class="cmark" src="${c.icon}" alt="" width="${size}" height="${size}">`;
  return c ? `<img class="cmark" src="${DEFAULT_CROP_ICON}" alt="" width="${size}" height="${size}">` : '';
}

function farmerAvatar(f, size = 48) {
  if (f && f.photo) return `<div class="fav" style="width:${size}px;height:${size}px"><img src="${f.photo}" alt=""></div>`;
  const name = farmerName(f);
  const col = FARMER_COLORS[(f ? Number(f.id) || 0 : 0) % FARMER_COLORS.length];
  return `<div class="fav" style="width:${size}px;height:${size}px;background:${col}">${esc(name.slice(0, 1))}</div>`;
}

/** Freshness badge: ⏳ នៅសល់ ២ ថ្ងៃ (ត្រូវលក់ឆាប់) */
function freshBadge(b, withLabel = true) {
  const st = batchStatus(b);
  const d = daysLeft(b);
  if (st === 'soldout') return `<span class="badge soldout">${t('stSoldOut')}</span>`;
  if (st === 'expired') return `<span class="badge expired">${icon('warning', 12)} ${t('stExpired')}</span>`;
  const left = d === 0 ? t('lastDay') : t('daysLeft', { n: n(d) });
  if (st === 'soon') return `<span class="badge soon">${icon('hourglass', 12)} ${left}${withLabel ? ` · ${t('stSoon')}` : ''}</span>`;
  return `<span class="badge fresh">${icon('checkCircle', 12)} ${left}${withLabel ? ` · ${t('stFresh')}` : ''}</span>`;
}
function statusBadge(b) {
  const st = batchStatus(b);
  const map = { fresh: 'stFresh', soon: 'stSoon', expired: 'stExpired', soldout: 'stSoldOut' };
  return `<span class="badge ${st}">${t(map[st])}</span>`;
}
function gradeBadge(g) { return `<span class="badge grade${g}">GRADE ${g}</span>`; }
function locBadge(loc) { return `<span class="badge loc">${loc === 'COLD' ? icon('snow', 11) : ''}${locName(loc)}</span>`; }

const ORDER_STATUS_KEY = { new: 'osNew', preparing: 'osPreparing', ready: 'osReady', delivering: 'osDelivering', completed: 'osCompleted', cancelled: 'osCancelled', rejected: 'osRejected' };
function orderBadge(o) { return `<span class="badge os-${o.status}">${t(ORDER_STATUS_KEY[o.status])}</span>`; }

/* ---------- Layout pieces ---------- */
function header({ title, sub, back = true, right = '' } = {}) {
  return `<header class="hdr">
    ${back ? `<button class="icon-btn plain" data-action="back" aria-label="${t('back')}">${icon('back', 22)}</button>` : ''}
    <div class="hdr-title"><h1>${title}</h1>${sub ? `<p>${sub}</p>` : ''}</div>
    ${right || (back ? `<button class="icon-btn green" data-action="go" data-to="home" aria-label="${t('navHome')}">${icon('home', 20)}</button>` : '')}
  </header>`;
}

function bellButton() {
  const c = unreadCount();
  return `<button class="icon-btn" data-action="go" data-to="notifications" aria-label="${t('notifications')}">${icon('bell', 19)}${c ? `<span class="count">${c > 9 ? '9+' : c}</span>` : ''}</button>`;
}

const NAV_ITEMS = [
  { id: 'home', ic: 'home', k: 'navHome' },
  { id: 'stockMgmt', ic: 'stock', k: 'navStock' },
  { id: 'orders', ic: 'orders', k: 'navOrders' },
  { id: 'market', ic: 'price', k: 'navMarket' },
  { id: 'profile', ic: 'user', k: 'navProfile' },
];
function bottomNav(active) {
  const newCount = ordersByStatus('new').length;
  return `<nav class="bnav">${NAV_ITEMS.map((it) => `
    <button class="${it.id === active ? 'on' : ''}" data-action="tab" data-to="${it.id}" aria-label="${t(it.k)}">
      <span class="nav-ic">${icon(it.ic, 21)}${it.id === 'orders' && newCount ? `<span class="count">${newCount}</span>` : ''}</span>
      <span class="lbl">${t(it.k)}</span>
    </button>`).join('')}</nav>`;
}

/** Empty state with a picture: an image path (.png) or a line-icon name. */
function emptyState(pic, title, sub = '', actionHtml = '') {
  const art = /\.png$/.test(pic) ? `<img src="${pic}" alt="">` : `<span class="em-ic">${icon(pic, 34)}</span>`;
  return `<div class="empty"><div class="em">${art}</div><h4>${title}</h4>${sub ? `<p>${sub}</p>` : ''}${actionHtml}</div>`;
}

/* ---------- Cards ---------- */
/** Stock batch card — same structure as the Figma "Stock management" list. */
function stockCard(b) {
  const c = crop(b.cropId), f = farmer(b.farmerId), q = batchQty(b), st = batchStatus(b);
  const hl = appState.ui.highlightBatch === b.id ? ' hl' : '';
  return `<article class="scard${hl}" data-action="go" data-to="stockDetail" data-id="${b.id}" id="card-${b.id}">
    <div class="scard-top">
      <div class="l">${freshBadge(b)}${isSellFirst(b) ? `<span class="badge first">${icon('bolt', 11)} ${t('sellFirst')}</span>` : ''}${b.discountPct ? `<span class="badge disc">-${b.discountPct}%</span>` : ''}</div>
      ${gradeBadge(b.grade)}
    </div>
    <div class="scard-mid">
      ${thumb(c, 64, b.grade)}
      <div class="sinfo">
        <div class="row1"><h4>${esc(cropName(c))}</h4><span class="loc-t">${locName(b.location)}</span></div>
        <div class="qty ${st}">${kgFmt(q.available)}<em>${t('kgLong')}</em></div>
        <div class="meta">${t('farmerLabel')}: <b>${esc(farmerName(f))}</b> · ${t('code')}: #${b.id}</div>
      </div>
    </div>
    <div class="scard-foot">
      <span>${icon('calendar', 13)} ${t('harvested')}: ${fmtDate(b.harvestDate)}</span>
      ${q.reserved ? `<span style="color:var(--blue-700)">${icon('box', 13)} ${t('reserved')} ${kgFmt(q.reserved)} kg</span>` : statusBadge(b)}
    </div>
  </article>`;
}

function orderCard(o) {
  const it = orderItem(o.id), c = crop(it.cropId), by = buyer(o.buyerId);
  return `<article class="ocard${o.status === 'new' ? ' is-new' : ''}">
    <div class="oc-top"><span class="oc-id">#${o.id}</span><span style="display:flex;gap:8px;align-items:center"><span class="oc-time">${timeAgo(o.createdAt)}</span>${orderBadge(o)}</span></div>
    <div class="oc-buyer">${icon('store', 17)} ${esc(by.name)}${o.fromBuyerApp ? ` <span class="app-tag">${t('fromBuyerApp')}</span>` : ''}${o.buyerFeedback && o.buyerFeedback.stars ? ` <span class="app-stars">★ ${o.buyerFeedback.stars}</span>` : ''}</div>
    <div class="oc-prod">
      ${thumb(c, 52, it.grade)}
      <div class="grow"><h4>${esc(cropName(c))}</h4><div class="qty">${kgFmt(it.qty)}<em>kg · Grade ${it.grade}</em></div></div>
      <div class="price"><small>${money(it.unitPrice)} ${t('perKg')}</small><small>${t('total')}</small><b>${money(it.subtotal)}</b></div>
    </div>
    <div class="oc-meta">
      <span>${icon(o.method === 'delivery' ? 'truck' : 'store', 15)} ${t(o.method === 'delivery' ? 'mDelivery' : 'mPickup')}</span>
      <span>${icon('pin', 15)} ${esc(L(o.location))}</span>
    </div>
    <button class="btn ${o.status === 'new' ? 'primary' : 'outline'} block sm" data-action="go" data-to="orderDetail" data-id="${o.id}">${o.status === 'new' ? icon('search', 16) + ' ' + t('reviewOrder') : t('openOrder') + ' ' + icon('arrowRight', 16)}</button>
  </article>`;
}

function kv(label, value, extra = '') { return `<div class="kv ${extra}"><span>${label}</span><b>${value}</b></div>`; }

/* ---------- Toast ---------- */
function toast(msg, type = 'success') {
  const root = document.getElementById('toast-root');
  root.querySelectorAll('.toast').forEach((x) => x.remove());
  const el = document.createElement('div');
  el.className = 'toast ' + type;
  el.innerHTML = `<span class="ti">${icon(type === 'error' ? 'alert' : type === 'info' ? 'bell' : 'check', 15)}</span><span>${msg}</span>`;
  root.appendChild(el);
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 260); }, 2400);
}

/** Full-screen success feedback (used after adding a harvest). */
function successOverlay(title, sub, ms = 1300) {
  return new Promise((resolve) => {
    const el = document.createElement('div');
    el.className = 'success-ov';
    el.innerHTML = `<div class="ring">${icon('check', 56)}</div><h3>${title}</h3><p>${sub || ''}</p>`;
    document.getElementById('phone').appendChild(el);
    setTimeout(() => { el.remove(); resolve(); }, ms);
  });
}
