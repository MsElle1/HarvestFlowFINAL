/* =========================================================
   UI COMPONENTS — small render helpers returning HTML strings
   ========================================================= */
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** Product "photo": soft gradient block + vegetable emoji (no external images). */
function prodImg(p, { h = 96, w = null, round = 14, emo = null, inner = '' } = {}) {
  const [a, b] = p.tint || ['#e8f3e6', '#d3e9cd'];
  const size = emo || Math.round(h * 0.5);
  const art = p.img ? `<img class="pico" src="${p.img}" alt="" style="width:${Math.round(size * 1.15)}px;height:${Math.round(size * 1.15)}px">` : `<span class="pemo" style="font-size:${size}px">${p.emoji}</span>`;
  return `<div class="pimg" style="height:${h}px;${w ? `width:${w}px;flex:none;` : ''}border-radius:${round}px;background:linear-gradient(145deg,${a},${b})">
    ${art}${inner}</div>`;
}

function pname(p) { return L(p.name); }
function pnameSub(p) { return LANG === 'km' ? p.name.en : p.name.km; }
function shopName(s) { return L(s.name); }
/** Rule: every item always shows its shop. */
function byShop(s, link = false) {
  return link ? `<button class="by-shop link" data-action="go" data-to="shop" data-id="${s.id}">${t('by')} ${esc(shopName(s))}</button>`
    : `<span class="by-shop">${t('by')} ${esc(shopName(s))}</span>`;
}

function gradeBadge(g, cls = '') { return `<span class="grade ${g === 'B' ? 'gB' : g === 'A-' ? 'gAm' : 'gA'} ${cls}">${t('grade')} ${g}</span>`; }
function dealTypeBadge(d) {
  return d.type === 'useSoon' ? `<span class="dtype soon">${icon('clock', 12)} ${t('useSoon')}</span>` : `<span class="dtype surplus">${icon('leaf', 12)} ${t('surplus')}</span>`;
}

const STATUS_CLASS = { pending: 'st-pending', accepted: 'st-accepted', preparing: 'st-preparing', dispatched: 'st-dispatched', delivered: 'st-delivered', completed: 'st-completed', declined: 'st-bad', cancelled: 'st-grey', expired: 'st-grey', disputed: 'st-bad' };
function statusChip(st) { return `<span class="schip ${STATUS_CLASS[st] || ''}">${t('s_' + st)}</span>`; }

function money2(v) { return `<span class="num">${money(v)}</span>`; }

/* ---------- bars ---------- */
const TABS = [
  { id: 'home', ic: 'home', k: 'tabHome' },
  { id: 'browse', ic: 'search', k: 'tabBrowse' },
  { id: 'basket', ic: 'cart', k: 'tabBasket' },
  { id: 'orders', ic: 'receipt', k: 'tabOrders' },
  { id: 'account', ic: 'user', k: 'tabAccount' },
];
function tabBar(active) {
  const c = cartCount();
  return `<nav class="tabbar" aria-label="tabs">${TABS.map((x) => `<button class="${x.id === active ? 'on' : ''}" data-action="tab" data-to="${x.id}">
    <span class="ti">${icon(x.ic, 22)}${x.id === 'basket' && c ? `<span class="tbadge">${c}</span>` : ''}</span><span class="tl">${t(x.k)}</span></button>`).join('')}</nav>`;
}

function topBar({ title = '', sub = '', right = '', back = true } = {}) {
  return `<header class="topbar">${back ? `<button class="iconbtn" data-action="back" aria-label="${t('back')}">${icon('back', 22)}</button>` : ''}
    <div class="tb-title ${back ? '' : 'left'}"><h1>${title}</h1>${sub ? `<p>${sub}</p>` : ''}</div>${right || (back ? '<span class="iconbtn ghost"></span>' : '')}</header>`;
}

function bellBtn() {
  const u = DB.notifications.filter((x) => !x.read).length;
  return `<button class="iconbtn soft" data-action="go" data-to="notifications" aria-label="${t('notifications')}">${icon('bell', 20)}${u ? `<span class="dot">${u}</span>` : ''}</button>`;
}

/** Flow screens: floating basket bar instead of the tab badge. */
function floatingBar() {
  if (!S.cart.length) return '';
  const tt = totals(cartGroups());
  return `<button class="fbar" data-action="go" data-to="basket-flow">
    <span class="fb-ic">${icon('cart', 20)}<span>${S.cart.length}</span></span>
    <span class="fb-t">${t('basket')} · ${t('nItems', { n: S.cart.length })} · <b class="num">${money(tt.items)}</b></span>
    <span class="fb-go">${t('viewBasket')} ${icon('chevronRight', 16)}</span></button>`;
}

/* ---------- controls ---------- */
function stepper(value, { action, id, min, max, size = '' }) {
  return `<div class="stepper ${size}">
    <button data-action="${action}" data-id="${id}" data-d="-1" ${value <= min ? 'aria-disabled="true" class="dim"' : ''} aria-label="-">${icon('minus', 18)}</button>
    <span class="num">${value}<small> kg</small></span>
    <button data-action="${action}" data-id="${id}" data-d="1" ${value >= max ? 'aria-disabled="true" class="dim"' : ''} aria-label="+">${icon('plus', 18)}</button></div>`;
}

function emptyState(emoji, title, sub = '', btn = '') {
  return `<div class="empty"><div class="em">${emoji}</div><h4>${title}</h4>${sub ? `<p>${sub}</p>` : ''}${btn}</div>`;
}
function errorState() {
  return `<div class="empty err"><div class="em">${icon('wifiOff', 40)}</div><h4>${t('errTitle')}</h4><p>${t('errSub')}</p>
    <button class="btn primary" data-action="retry">${icon('refresh', 18)} ${t('retry')}</button></div>`;
}
function skeleton(rows = 4, kind = 'row') {
  return `<div class="skel-wrap">${Array.from({ length: rows }, () => kind === 'card'
    ? '<div class="skel card"><i class="sk-img"></i><i class="sk-l w70"></i><i class="sk-l w40"></i></div>'
    : '<div class="skel row"><i class="sk-sq"></i><div><i class="sk-l w70"></i><i class="sk-l w40"></i></div></div>').join('')}</div>`;
}

/** One Timeline component used on Orders, Order Details and Track Order. */
function timeline(o, withSub = false) {
  const steps = [
    { st: 'pending', k: 'tlSubmitted' },
    { st: 'accepted', k: 'tlAccepted' },
    { st: 'preparing', k: 'tlPreparing' },
    ...(withSub ? [{ st: 'qualityChecked', k: 'tlQuality', sub: true }] : []),
    { st: 'dispatched', k: 'tlDispatched' },
    ...(withSub ? [{ st: 'inTransit', k: 'tlTransit', sub: true }] : []),
    { st: 'delivered', k: 'tlDelivered' },
  ];
  const reached = (st) => {
    if (st === 'inTransit') return o.status === 'dispatched' ? 'current' : hasStep(o, 'delivered') ? 'done' : 'todo';
    if (!hasStep(o, st)) return 'todo';
    return o.status === st && st !== 'delivered' ? 'now' : 'done';
  };
  const stopped = ['declined', 'cancelled', 'expired'].includes(o.status);
  return `<ol class="timeline">${steps.map((s) => {
    const r = stopped && !hasStep(o, s.st) ? 'todo' : reached(s.st);
    const at = stepAt(o, s.st);
    const when = at ? fmtDateTime(at) : r === 'current' ? t('onTheWay') : t('waiting');
    return `<li class="tl-${r} ${s.sub ? 'sub' : ''}"><span class="tl-dot"></span><div><b>${t(s.k)}</b><small>${when}</small></div></li>`;
  }).join('')}
  ${stopped ? `<li class="tl-stop"><span class="tl-dot"></span><div><b>${t('s_' + o.status)}</b><small>${o.reason ? esc(L(o.reason)) : ''}</small></div></li>` : ''}</ol>`;
}

/* ---------- inline add / quantity control (lists, search results, shop page) ---------- */
function qtyCtl(l, size = '') {
  if (!l.available || l.stock < l.min) return `<span class="qc-sold">${t('soldOut')}</span>`;
  const line = cartLine(l.id);
  if (!line) return `<button class="addbtn ${size}" data-action="quickAdd" data-id="${l.id}" aria-label="${t('add')}">${icon('plus', size ? 18 : 20)}</button>`;
  return `<div class="mini-step ${size}"><button data-action="cartStepL" data-id="${l.id}" data-d="-1" aria-label="-">${icon(line.qty <= l.min ? 'trash' : 'minus', 16)}</button>
    <span class="num">${kg(line.qty)}<small>kg</small></span>
    <button data-action="cartStepL" data-id="${l.id}" data-d="1" aria-label="+" ${line.qty >= l.stock ? 'class="dim"' : ''}>${icon('plus', 16)}</button></div>`;
}

/* ---------- cards ---------- */
/** Browse / shop list card: image, name, grade, by shop, price, kg left, "+". */
function productRow(l, { pinned = false, hideShop = false } = {}) {
  const p = product(l.product), s = shop(l.shopId);
  const soldOut = !l.available || l.stock <= 0;
  const others = otherShopsCount(l.product) - 1;
  const d = dealForListing(l.id);
  return `<article class="prow ${soldOut ? 'soldout' : ''} ${pinned ? 'pinned' : ''}">
    <button class="prow-main" data-action="go" data-to="product" data-id="${l.id}">
      ${prodImg(p, { h: 76, w: 76, round: 14, inner: soldOut ? `<span class="so-tag">${t('soldOut')}</span>` : '' })}
      <span class="prow-info">
        <b>${esc(pname(p))}</b>
        <span class="sub">${esc(pnameSub(p))}</span>
        ${hideShop ? '' : byShop(s)}
        <span class="meta">${gradeBadge(l.grade)} <span class="left ${l.stock < CONFIG.lowStockKg ? 'low' : ''}">${soldOut ? t('soldOut') : t('kgLeft', { n: kg(l.stock) })}</span>${d ? ` <span class="dealtag">-${d.off}%</span>` : ''}</span>
      </span>
    </button>
    <div class="prow-side">
      <b class="price num">${money(l.price)}<small>/kg</small></b>
      ${qtyCtl(l)}
      ${others > 0 ? `<button class="others" data-action="go" data-to="results" data-q="${l.product}">${t('otherShops', { n: n(others) })}</button>` : ''}
    </div>
  </article>`;
}

/** Fresh Deals full card (hub) */
function dealCard(d) {
  const l = listing(d.listingId), p = product(l.product), s = shop(l.shopId);
  const soldOut = d.kgLeft <= 0;
  const deliverBy = CONFIG.deliveryDate;
  return `<article class="dcard ${soldOut ? 'soldout' : ''}">
    <button class="dimg" data-action="go" data-to="product" data-id="${l.id}" data-deal="${d.id}" ${soldOut ? 'tabindex="-1"' : ''}>
      ${prodImg(p, { h: 150, round: 14, emo: 72, inner: `
        <span class="off">${d.off}% ${t('off')}</span><span class="g-on">${gradeBadge(d.grade, 'dark')}</span>
        <span class="kgl ${d.kgLeft <= 10 ? 'amber' : ''}">${soldOut ? '' : t('kgLeftCaps', { n: kg(d.kgLeft) })}</span>
        <span class="shoptag">${icon('checkCircle', 12)} ${esc(shopName(s))}</span>
        ${soldOut ? `<span class="so-big">${icon('close', 16)} ${t('soldOut')}</span>` : ''}` })}
    </button>
    <div class="dbody">
      <div class="dtitle"><h3>${esc(pname(p))}</h3><div class="dprice"><b class="num">${money(d.now)}<small>/kg</small></b><s class="num">${money(d.was)}/kg</s></div></div>
      ${byShop(s, true)}
      <div class="dtypes">${dealTypeBadge(d)} <span class="dnote">${esc(L(d.note))}</span></div>
      ${soldOut ? '' : goodFor(l.product, true)}
      ${soldOut ? `<div class="dnext">${t('nextBatch')}: <b>${fmtDate(d.nextBatch, false)}</b></div>` : `
      <div class="dbox ${d.type === 'useSoon' ? 'amber' : 'green'}">
        <div><span>${t('harvested')}</span><b>${fmtDate(l.harvested, false)}</b></div>
        <div><span>${t('useBy')}</span><b>${fmtDate(d.useBy, false)}</b></div>
      </div>
      <div class="ddeliv">${icon('truck', 15)} ${t('estDelivery')}: ${fmtDate(deliverBy, false)}, ${L(CONFIG.timeWindows[0].label).split('–')[0].trim()}</div>`}
      <button class="btn ${soldOut ? 'disabled-look' : 'deal'} block" data-action="${soldOut ? 'noop' : 'dealQty'}" data-id="${d.id}" ${soldOut ? 'disabled' : ''}>${soldOut ? t('soldOut') : icon('cart', 18) + ' ' + t('addToCart')}</button>
    </div>
  </article>`;
}

/** Order card used in Orders (Active / History) */
function orderCard(o) {
  const s = shop(o.shopId), tt = orderTotals(o);
  const first = product(listing(o.items[0].listingId).product);
  const itemsTxt = o.items.map((i) => `${pname(product(listing(i.listingId).product))} ${kg(i.qty)}kg`).join(', ');
  let actions = '';
  if (o.status === 'dispatched') actions = `<button class="btn primary sm" data-action="go" data-to="track" data-id="${o.id}">${icon('truck', 16)} ${t('trackOrder')}</button>`;
  else if (HISTORY.includes(o.status)) {
    actions = `${isDone(o) ? (o.rating ? `<button class="rated" data-action="rate" data-id="${o.id}">${stars(o.rating)}</button>` : `<button class="btn outline sm" data-action="rate" data-id="${o.id}">${icon('star', 15)} ${t('rate')}</button>`) : ''}
      <button class="btn soft sm" data-action="reorder" data-id="${o.id}">${icon('refresh', 15)} ${t('reorder')}</button>`;
  } else actions = `<button class="btn outline sm" data-action="go" data-to="order" data-id="${o.id}">${t('viewDetails')}</button>`;
  return `<article class="ocard">
    <button class="oc-main" data-action="go" data-to="order" data-id="${o.id}">
      <span class="oc-top"><b class="num">#${o.id}</b>${statusChip(o.status)}</span>
      <span class="oc-shop">${icon('store', 15)} ${esc(shopName(s))}</span>
      <span class="oc-row">${prodImg(first, { h: 44, w: 44, round: 10 })}<span class="oc-items">${esc(itemsTxt)}</span><b class="num">${money(tt.grand)}</b></span>
      ${o.reason && ['declined', 'cancelled', 'expired'].includes(o.status) ? `<span class="oc-reason">${icon('alert', 13)} ${esc(L(o.reason))}${o.refund === 'pending' ? ` · ${t('refundPending')}` : ''}</span>` : ''}
      ${o.report ? `<span class="oc-reason">${icon('flag', 13)} ${t('reported')}: ${t(o.report.reason)}</span>` : ''}
      <span class="oc-date">${icon('calendar', 13)} ${t('deliveryOn')} ${fmtDate(o.date, false)}</span>
    </button>
    <div class="oc-actions">${actions}</div>
  </article>`;
}

function stars(nv, size = 14) {
  return `<span class="stars-inline">${[1, 2, 3, 4, 5].map((k) => icon(k <= nv ? 'starFill' : 'star', size)).join('')}</span>`;
}

/** "Good for" dish chips — tap to see what the dish needs. */
function goodFor(productKey, compact = false) {
  const ds = dishesFor(productKey);
  if (!ds.length) return '';
  return `<div class="goodfor ${compact ? 'compact' : ''}"><span class="gf-l">${icon('sparkle', 13)} ${t('goodFor')}</span>
    ${ds.slice(0, compact ? 2 : 4).map((d) => `<button class="gf-chip" data-action="openSheet" data-sheet="dish" data-id="${d.id}">${d.emoji} ${esc(L(d.name))}</button>`).join('')}</div>`;
}

function kv(label, value, cls = '') { return `<div class="kv ${cls}"><span>${label}</span><b>${value}</b></div>`; }

/* ---------- toast ---------- */
function toast(msg, type = 'ok', action = null) {
  const root = document.getElementById('toast-root');
  root.innerHTML = '';
  const el = document.createElement('div');
  el.className = 'toast ' + type;
  el.innerHTML = `<span class="ti">${icon(type === 'err' ? 'alert' : type === 'info' ? 'bell' : 'check', 15)}</span><span class="tm">${msg}</span>${action ? `<button class="tact" data-action="${action.action}">${action.label}</button>` : ''}`;
  root.appendChild(el);
  clearTimeout(toast._t);
  toast._t = setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 250); }, action ? 4500 : 2400);
}
