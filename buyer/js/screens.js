/* =========================================================
   SCREENS
   tab: which tab is highlighted (main screen) — null = flow screen (no tab bar)
   fbar: show the floating basket bar (flow screens only)
   loads: shows a skeleton first (and the error state when "Simulate network error" is on)
   ========================================================= */

/** Loading / error gate for list screens. Returns HTML to show instead of content, or null. */
function gate(r, kind = 'row', rows = 4) {
  if (r.error) return errorState();
  if (!r.loaded) return skeleton(rows, kind);
  return null;
}

function matchProducts(q) {
  const s = String(q || '').trim().toLowerCase();
  if (!s) return [];
  if (DB.products[s]) return [s];
  return Object.keys(DB.products).filter((k) => {
    const p = DB.products[k];
    return p.name.en.toLowerCase().includes(s) || p.name.km.includes(s) || k.includes(s);
  });
}

const SCREENS = {
  /* ================= F1: splash / login ================= */
  splash: {
    render() {
      return `<div class="splash"><img src="assets/logo-white.png" alt="HarvestFlow"></div>`;
    },
  },

  login: {
    render() {
      const f = S.ui.login || (S.ui.login = { phone: '', code: '', err: null });
      return `<div class="login">
        <div class="login-top">
          <div class="lt-row">${Link.enabled() ? `<button class="lt-back" data-action="toRoles" aria-label="${t('back')}">${icon('back', 22)}</button>` : '<span></span>'}${langToggle()}</div>
          <img src="assets/logo-white.png" alt="HarvestFlow">
          <h1>${t('loginTitle')}</h1>
          <p>${t('loginSub')}</p>
        </div>
        <div class="login-card">
          ${S.returnTo ? `<div class="note info">${icon('lock', 16)} ${t('sessionExpired')}</div>` : ''}
          ${f.err === 'seller' ? `<div class="note warn lgnote">${icon('store', 20)}<div><b>${t('sellerTitle')}</b><span>${t('sellerMsg')}</span>${Link.enabled() ? `<button class="btn ghost sm" data-action="toRoles">${t('openSellerApp')}</button>` : ''}</div></div>` : ''}
          <label class="field ${f.err === 'phone' ? 'bad' : ''}"><span>${t('phone')}</span>
            <input type="tel" inputmode="tel" data-bind="phone" data-scope="login" value="${esc(f.phone)}" placeholder="012 345 678" autocomplete="tel"></label>
          ${f.err === 'phone' ? `<div class="fe">${t('errPhone')}</div>` : ''}
          <label class="field ${f.err === 'code' ? 'bad' : ''}"><span>${t('code')}</span>
            <input type="password" inputmode="numeric" maxlength="4" class="code" data-bind="code" data-scope="login" value="${esc(f.code)}" placeholder="••••"></label>
          ${f.err === 'code' ? `<div class="fe">${t('errCode')}</div>` : ''}
          <button class="btn primary block lg" data-action="login">${t('login')}</button>
          <div class="demo-hint"><b>${t('demoAccounts')}</b>
            <button data-action="fillLogin" data-p="012 345 678">${t('demoBuyer')}: 012 345 678 · 1234</button>
            <button data-action="fillLogin" data-p="098 765 432">${t('demoSeller')}: 098 765 432</button>
            <button data-action="fillLogin" data-p="011 000 000">${t('demoUnverified')}: 011 000 000 · 1234</button>
          </div>
        </div>
      </div>`;
    },
  },

  verify: {
    render() {
      return `<div class="center-page">
        <div class="big-ic amber">${icon('hourglass', 44)}</div>
        <h2>${t('verifyTitle')}</h2><p>${t('verifySub')}</p>
        <button class="btn primary block lg" data-action="tab" data-to="home">${icon('search', 18)} ${t('browseMarket')}</button>
        <button class="btn ghost block" data-action="logout">${t('logout')}</button>
      </div>`;
    },
  },

  /* ================= HOME ================= */
  home: {
    tab: 'home',
    render() {
      const deals = visibleDeals().filter((d) => d.kgLeft > 0);
      const avail = DB.listings.filter((l) => l.available && l.stock > 0).sort((a, b) => a.price - b.price);
      const mp = marketRows();
      const best = mp.filter((x) => x.hf !== null).sort((a, b) => b.pct - a.pct)[0];
      const recent = recentOrderedListings();
      const unverified = S.session && !S.session.verified;
      return `<header class="home-hdr">
          <img class="logo" src="assets/logo.png" alt="HarvestFlow">
          <div class="hh-right">${langPill()}${bellBtn()}<button class="avatar-btn" data-action="tab" data-to="account" aria-label="${t('tabAccount')}"><img src="assets/avatar-buyer.png" alt=""></button></div>
        </header>
        <main class="scroll">
          ${unverified ? `<div class="note warn m16">${icon('hourglass', 16)} ${t('verifyBanner')}</div>` : ''}
          <button class="searchbar" data-action="go" data-to="search">${icon('search', 20)}<span>${t('searchPh')}</span></button>

          <div class="sec-h"><h2>${t('categories')}</h2></div>
          <div class="cats">${CATEGORIES.map((c) => `<button class="cat" data-action="goBrowse" data-cat="${c.id}">
            <span class="cat-ic">${c.icon ? `<img src="${c.icon}" alt="">` : `<span class="emo">${c.emoji}</span>`}</span><span>${esc(L(c.name))}</span></button>`).join('')}</div>

          <button class="mp-banner" data-action="go" data-to="market">
            <span class="mp-ic">${icon('trendUp', 22)}</span>
            <span class="mp-t"><b>${t('marketBanner')}</b><small>${best ? t('marketBannerSub', { p: esc(pname(product(best.product))), pct: n(best.pct) }) : ''}</small></span>
            ${icon('chevronRight', 20)}</button>

          <div class="sec-h deals-h">
            <span class="flash">${icon('bolt', 13)} ${t('limitedBatches')}</span>
            <button class="viewall" data-action="go" data-to="deals">${t('viewAll')} (${n(visibleDeals().length)}) ${icon('chevronRight', 14)}</button>
          </div>
          <button class="deals-title" data-action="go" data-to="deals"><h2>${t('freshDeals')}</h2><p>${t('freshDealsSub')}</p></button>
          <div class="hscroll">${deals.map((d) => homeDealCard(d)).join('') || `<div class="empty-inline">${t('noDeals')}</div>`}</div>

          <div class="sec-h"><h2>${t('availableToday')}</h2><button class="viewall" data-action="goBrowse" data-cat="all">${t('viewAll')} (${n(avail.length)}) ${icon('chevronRight', 14)}</button></div>
          <div class="hscroll">${avail.slice(0, 8).map(homeProdCard).join('')}</div>

          <div class="sec-h"><h2>${t('recentlyOrdered')}</h2></div>
          <div class="list">${recent.length ? recent.map(recentRow).join('') : `<div class="empty-inline">${t('noRecent')}</div>`}</div>
          <div class="spacer"></div>
        </main>`;
    },
  },

  /* ================= F3: Browse ================= */
  browse: {
    tab: 'browse', loads: true,
    render(r) {
      const cat = S.ui.browseCat;
      const chips = [{ id: 'all', name: { km: 'ទាំងអស់', en: 'All' } }, ...CATEGORIES];
      return `${topBar({ title: t('browseTitle'), back: false, right: bellBtn() })}
        <div class="searchfield in-browse">${icon('search', 18)}<input id="browse-input" type="text" placeholder="${t('browsePh')}" value="${esc(S.ui.browseQuery)}" data-bind="browseQuery" data-scope="ui" autocomplete="off"></div>
        <div class="chips">${chips.map((c) => `<button class="chip ${cat === c.id ? 'on' : ''}" data-action="browseCat" data-cat="${c.id}">${c.icon ? `<img src="${c.icon}" alt="">` : c.emoji ? `<span>${c.emoji}</span>` : ''}${esc(L(c.name))}</button>`).join('')}</div>
        <div class="toolbar"><span class="muted" id="browse-count"></span>${sortButton()}</div>
        <main class="scroll"><div class="list" id="browse-list">${gate(r, 'row', 5) || ''}</div><div class="spacer"></div></main>`;
    },
    after(r) { if (r.loaded && !r.error) updateBrowseList(); },
  },

  /* ================= F2: Search ================= */
  search: {
    fbar: true,
    render() {
      const q = S.ui.searchText;
      return `<header class="topbar search-top"><button class="iconbtn" data-action="back" aria-label="${t('back')}">${icon('back', 22)}</button>
          <form class="searchfield" data-action-submit="doSearch">${icon('search', 18)}
            <input id="search-input" type="text" enterkeyhint="search" autocomplete="off" placeholder="${t('searchPh')}" value="${esc(q)}" data-bind="searchText" data-scope="ui">
            <button type="button" class="clear" data-action="clearSearch" style="${q ? '' : 'display:none'}" aria-label="clear">${icon('close', 16)}</button></form>
          <button class="iconbtn go-search" data-action="doSearch" aria-label="${t('search')}">${icon('search', 20)}</button></header>
        <main class="scroll" id="search-body">${searchBody()}</main>`;
    },
    after() { const i = document.getElementById('search-input'); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } },
  },

  results: {
    fbar: true, loads: true,
    render(r) {
      const q = r.params.q || '';
      const keys = matchProducts(q);
      const title = keys.length === 1 ? pname(product(keys[0])) : q;
      const g = gate(r, 'card', 3);
      let body = g;
      let count = 0;
      if (!g) {
        const shops = resultShops(keys);
        count = shops.length;
        body = shops.length ? shops.map((x) => resultShopCard(x, keys)).join('')
          : emptyState('🔍', t('noShopHas', { q: esc(title) }), t('noShopHasSub'), `<button class="btn primary" data-action="goBrowse" data-cat="all">${t('browseAll')}</button>`);
      }
      return `${topBar({ title: esc(title), sub: g ? '' : t('shopsFound', { n: n(count) }) })}
        <div class="res-bar"><button class="searchbar mini" data-action="go" data-to="search">${icon('search', 16)}<span>${esc(title)}</span></button>${sortButton()}</div>
        <main class="scroll"><div class="list">${body}</div><div class="spacer"></div></main>`;
    },
  },

  shop: {
    fbar: true,
    render(r) {
      const s = shop(r.params.id);
      const keys = r.params.q ? [...new Set(String(r.params.q).split(',').flatMap(matchProducts))] : [];
      const ls = DB.listings.filter((l) => l.shopId === s.id).sort((a, b) => (keys.includes(b.product) - keys.includes(a.product)) || a.price - b.price);
      return `${topBar({ title: esc(shopName(s)), sub: t('cooperative') })}
        <main class="scroll">
          ${keys.length ? `<div class="pinned-q">${icon('search', 15)} ${t('youSearched')}: <b>${esc(keys.map((k) => pname(product(k))).join(', '))}</b></div>` : ''}
          <div class="shop-head card m16">
            <span class="shop-av lg" style="background:${s.color}">${s.initials}</span>
            <div class="grow"><h2>${esc(shopName(s))}</h2>
              <div class="meta">${icon('starFill', 13, 'star')} <b>${s.rating}</b> (${n(s.reviews)} ${t('reviews')}) · ${icon('pin', 12)} ${esc(L(s.location))}</div>
              <div class="chips-row"><span class="cert">${icon('certificate', 13)} ${s.cert}</span><span class="cert grey">${t('since')} ${s.since}</span></div></div>
            <button class="iconbtn soft" data-action="toastMsg" data-k="contactCoopToast" aria-label="${t('contactCoop')}">${icon('phone', 18)}</button>
          </div>
          <div class="sec-h"><h2>${t('itsVegetables')} (${n(ls.length)})</h2></div>
          <div class="list">${ls.map((l) => productRow(l, { pinned: keys.includes(l.product) })).join('')}</div>
          <div class="spacer"></div>
        </main>`;
    },
  },

  /* ================= F5: Product details ================= */
  product: {
    fbar: true,
    render(r) {
      const i = info(r.params.id, r.params.deal);
      const st = S.ui.pd;
      const reason = !i.available ? t('soldOut') : st.qty < i.min ? t('minOrderMsg', { n: n(i.min) }) : st.qty > i.stock ? t('maxStockMsg', { n: kg(i.stock) }) : '';
      const ok = !reason;
      const fresh = i.dl ? i.dl.useBy : useBy(i.l);
      const others = otherShopsCount(i.l.product) - 1;
      const total = r2(st.qty * i.price);
      return `${topBar({ title: esc(pname(i.p)), sub: esc(shopName(i.s)) })}
        <main class="scroll">
          <div class="pd-img">${prodImg(i.p, { h: 200, round: 20, emo: 104, inner: `${i.dl ? `<span class="off">${i.dl.off}% ${t('off')}</span>` : ''}` })}</div>
          <div class="pd-head">
            <div class="pd-badges">${gradeBadge(i.grade)}${i.dl ? dealTypeBadge(i.dl) : ''}${!i.available ? `<span class="schip st-grey">${t('soldOut')}</span>` : ''}</div>
            <h2>${esc(pname(i.p))}</h2><div class="sub">${esc(pnameSub(i.p))}</div>
            ${byShop(i.s, true)}
            <div class="pd-price"><b class="num">${money(i.price)}</b><small>/kg</small>${i.dl ? `<s class="num">${money(i.l.price)}/kg</s>` : ''}</div>
            ${i.dl ? `<div class="note warn">${icon('clock', 15)} ${t('dealNote', { d: fmtDate(i.dl.useBy, false) })} · ${esc(L(i.dl.note))}</div>` : ''}
          </div>
          <div class="pad"><div class="grid2">
            <div class="info"><small>${icon('box', 13)} ${t('stockLeft')}</small><b class="${i.stock < CONFIG.lowStockKg ? 'amber-t' : ''}">${kg(i.stock)} kg</b></div>
            <div class="info"><small>${icon('scale', 13)} ${t('minOrder')}</small><b>${n(i.min)} kg</b></div>
            <div class="info"><small>${icon('calendar', 13)} ${t('harvested')}</small><b>${fmtDate(i.l.harvested, false)}</b></div>
            <div class="info"><small>${icon('hourglass', 13)} ${t('freshUntil')}</small><b>${fmtDate(fresh, false)}</b></div>
            <div class="info wide"><small>${icon('truck', 13)} ${t('deliveryPromise')}</small><b>${relDay(CONFIG.deliveryDate)} ${fmtDate(CONFIG.deliveryDate, false)} · ${L(CONFIG.timeWindows[0].label)}</b></div>
            <div class="info"><small>${icon('thermo', 13)} ${t('storageTemp')}</small><b>${i.p.temp}</b></div>
            <div class="info"><small>${icon('certificate', 13)} ${t('certificate')}</small><b>${i.s.cert}</b></div>
          </div>
          ${goodFor(i.l.product) ? `<div class="card gf-card">${goodFor(i.l.product)}</div>` : ''}
          ${others > 0 ? `<button class="others-link" data-action="go" data-to="results" data-q="${i.l.product}">${icon('store', 16)} ${t('otherShops', { n: n(others) })} ${icon('chevronRight', 16)}</button>` : ''}
          <div class="card qty-card">
            <div class="qc-row"><b>${t('quantity')}</b>${stepper(st.qty, { action: 'pdStep', id: 'pd', min: i.min, max: i.stock, size: 'lg' })}</div>
            <div class="qc-hint ${reason ? 'bad' : ''}">${reason ? icon('alert', 14) + ' ' + reason : t('qtyHint', { min: n(i.min), max: kg(i.stock) })}</div>
            <label class="field slim"><span>${t('noteToCoop')} <em>(${t('optional')})</em></span>
              <input type="text" data-bind="note" data-scope="pd" value="${esc(st.note)}" placeholder="${t('notePh')}"></label>
            <div class="est"><span>${t('estTotal')}</span><b class="num">${money(total)}</b></div>
          </div></div>
          <div class="spacer"></div>
        </main>
        <div class="pd-actions">
          <button class="btn primary block lg" data-action="addToBasket" ${ok ? '' : 'disabled'}>${icon('cart', 20)} ${t('addToBasket')}</button>
          <button class="btn outline block" data-action="buyNow" ${ok ? '' : 'disabled'}>${t('buyNow')}</button>
          ${!ok ? `<div class="why">${reason}</div>` : ''}
        </div>`;
    },
  },

  /* ================= F4: Fresh Deals ================= */
  deals: {
    fbar: true, loads: true,
    render(r) {
      const f = S.ui.dealFilter;
      const all = visibleDeals();
      let list = all.filter((d) => f === 'all' || d.type === f);
      const sortKey = S.ui.dealSort || 'shelf';
      list = list.sort((a, b) => ((b.kgLeft > 0) - (a.kgLeft > 0)) || (sortKey === 'shelf' ? a.useBy.localeCompare(b.useBy) : b.off - a.off));
      const g = gate(r, 'card', 2);
      return `${topBar({ title: t('freshDeals'), right: `<span class="flash sm">${icon('bolt', 12)} ${t('flashBatches')}</span>` })}
        <div class="chips">${[['all', 'allDeals', all.length], ['useSoon', 'useSoon', all.filter((d) => d.type === 'useSoon').length], ['surplus', 'surplus', all.filter((d) => d.type === 'surplus').length]]
          .map(([id, k, c]) => `<button class="chip ${f === id ? 'on' : ''}" data-action="dealFilter" data-f="${id}">${t(k)} <span class="cnt">${n(c)}</span></button>`).join('')}</div>
        <div class="toolbar"><span class="muted">${t('dealsRule')}</span><button class="sortbtn" data-action="toggleDealSort">${icon('sort', 15)} ${sortKey === 'shelf' ? t('shortestShelf') : t('biggestDiscount')}</button></div>
        <main class="scroll"><div class="list">${g || (list.length ? list.map(dealCard).join('') : emptyState('🥬', t('noDeals')))}</div><div class="spacer"></div></main>`;
    },
  },

  /* ================= F16: Market prices ================= */
  market: {
    fbar: true, loads: true,
    render(r) {
      const g = gate(r, 'row', 6);
      return `${topBar({ title: t('marketPrices'), sub: t('lastUpdated') })}
        <main class="scroll">
          <div class="note info m16">${icon('alert', 16)} ${t('marketNote')}</div>
          ${g || `<div class="mtable">
            <div class="mt-h"><span>${t('product')}</span><span>${t('marketPrice')}</span><span>${t('hfLowest')}</span></div>
            ${marketRows().map((x) => {
              const p = product(x.product);
              return `<button class="mt-row" data-action="go" data-to="results" data-q="${x.product}">
                <span class="mt-p">${prodImg(p, { h: 40, w: 40, round: 10 })}<span><b>${esc(pname(p))}</b><small>${esc(pnameSub(p))}</small></span></span>
                <span class="num mt-m">${money(x.market)}</span>
                <span class="mt-hf"><b class="num">${x.hf !== null ? money(x.hf) : '—'}</b>${x.hf !== null ? `<small class="${x.pct > 0 ? 'good' : ''}">${x.pct > 0 ? t('cheaperBy', { n: n(x.pct) }) : t('noSaving')}</small>` : `<small>${t('soldOut')}</small>`}</span>
              </button>`;
            }).join('')}</div>`}
          <div class="spacer"></div>
        </main>`;
    },
  },

  /* ================= F7: Basket ================= */
  basket: {
    tab: 'basket',
    render() {
      normalizeCart();
      const groups = cartGroups();
      if (!groups.length) {
        return `${topBar({ title: t('basketTitle'), back: false })}
          <main class="scroll">${emptyState('🧺', t('basketEmpty'), t('basketEmptySub'), `<button class="btn primary" data-action="goBrowse" data-cat="all">${icon('search', 18)} ${t('browseVeg')}</button>`)}</main>`;
      }
      const ticked = groups.filter((g) => S.shopTicked[g.shopId]);
      const tt = totals(ticked);
      const blocked = ticked.some((g) => g.blocked);
      const allOn = groups.every((g) => S.shopTicked[g.shopId]);
      const reason = !ticked.length ? t('selectOneShop') : blocked ? t('removeUnavailable') : '';
      return `${topBar({ title: t('basketTitle'), sub: t('basketSub', { n: n(groups.length) }), back: false })}
        <main class="scroll">
          <button class="selall" data-action="selectAll"><span class="cbox ${allOn ? 'on' : ''}">${icon('check', 14)}</span> ${t('selectAll')} (${n(groups.length)} ${t('shops')})</button>
          <div class="list">${groups.map((g) => basketGroup(g)).join('')}</div>
          <div class="spacer"></div>
        </main>
        <div class="checkout-bar">
          <div class="cb-sum"><span>${t('itemsTotal')} <b class="num">${money(tt.items)}</b> + ${t('deliveryShort')} <b class="num">${money(tt.delivery)}</b></span></div>
          <button class="btn primary block lg" data-action="checkoutBasket" ${reason ? 'disabled' : ''}>${t('checkoutBtn', { n: n(ticked.length), total: money(tt.grand) })}</button>
          ${reason ? `<div class="why">${reason}</div>` : ''}
        </div>`;
    },
  },

  /* ================= F8: Checkout ================= */
  checkout: {
    render() {
      if (!S.checkout) return `${topBar({ title: t('checkout') })}<main class="scroll">${emptyState('🧾', t('nothingToCheckout'), '', `<button class="btn primary" data-action="tab" data-to="basket">${t('basket')}</button>`)}</main>`;
      const c = S.checkout;
      const groups = cartGroups(checkoutLines());
      const tt = totals(groups);
      const a = address(c.addressId);
      const unverified = !S.session.verified;
      return `${topBar({ title: t('checkout'), sub: c.mode === 'buynow' ? t('buyNowSub') : t('checkoutSub', { n: n(groups.length) }) })}
        <main class="scroll"><div class="pad stack">
          <section class="card">
            <h3 class="blk"><span class="bn">1</span> ${t('delivery')}</h3>
            <div class="addr"><b>${esc(DB.restaurant.name)}</b><span>${t('recipient')}: ${esc(a.recipient)} · ${esc(a.phone)}</span><span>${icon('pin', 13)} ${esc(a.line)}</span>
              <button class="link" data-action="openSheet" data-sheet="pickAddress">${icon('edit', 14)} ${t('change')}</button></div>
            <div class="sched"><div class="sd"><small>${t('date')}</small><b>${relDay(CONFIG.deliveryDate)}, ${fmtDate(CONFIG.deliveryDate, false)}</b></div></div>
            <div class="label-sm">${t('timeWindow')}</div>
            <div class="win-grid">${CONFIG.timeWindows.map((w) => `<button class="win ${c.windowId === w.id ? 'on' : ''}" data-action="pickWindow" data-id="${w.id}">${icon('clock', 15)} ${L(w.label)}</button>`).join('')}</div>
          </section>
          <section>
            <h3 class="blk out"><span class="bn">2</span> ${t('yourOrders')}</h3>
            ${groups.map((g, idx) => checkoutShopCard(g, idx, groups.length)).join('')}
          </section>
          <section class="card">
            <h3 class="blk"><span class="bn">3</span> ${t('payment')}</h3>
            <div class="paysel on"><span class="khqr-logo">KHQR</span><div class="grow"><b>${t('payKhqr')}</b><small>${t('payKhqrSub')}</small></div><span class="radio on"></span></div>
            <p class="muted small">${icon('checkCircle', 13)} ${t('payOnce')}</p>
          </section>
          <section class="card">
            <h3 class="blk"><span class="bn">4</span> ${t('summary')}</h3>
            ${kv(t('itemsTotal'), money(tt.items))}${kv(t('deliveryTotal') + ` (${n(groups.length)} × ${money(CONFIG.deliveryFeePerShop)})`, money(tt.delivery))}${kv(t('grandTotal'), money(tt.grand), 'total')}
          </section>
          ${unverified ? `<div class="note warn">${icon('lock', 16)} ${t('notVerifiedBlock')}</div>` : ''}
        </div><div class="spacer"></div></main>
        <div class="checkout-bar">
          <button class="btn primary block lg" data-action="placeOrder" ${c.placing || !groups.length ? 'disabled' : ''}>${c.placing ? `<span class="spin"></span> ${t('checking')}` : `${t('placeOrder')} · <span class="num">${money(tt.grand)}</span>`}</button>
          ${unverified ? `<div class="why">${t('notVerifiedShort')}</div>` : ''}
        </div>`;
    },
  },

  /* ================= F9: Order submitted ================= */
  submitted: {
    render() {
      const r = S.lastSubmitted;
      if (!r) return SCREENS.orders.render({ params: {}, loaded: true });
      const os = r.orderIds.map(order);
      return `<main class="scroll center-top">
        <div class="success-ic">${icon('check', 46)}</div>
        <h2 class="c">${t('orderSent')}</h2><p class="c muted">${t('eachCoopConfirms')}</p>
        <div class="pad stack">
          <div class="card">${os.map((o, i) => {
            const tt = orderTotals(o);
            return `<div class="rcpt"><span class="rn">${n(i + 1)}</span><div class="grow"><b class="num">#${o.id}</b><small>${esc(shopName(shop(o.shopId)))} · ${t('nItems', { n: o.items.length })}</small></div><b class="num">${money(tt.grand)}</b></div>`;
          }).join('')}
          ${kv(t('paidTotal'), money(r.total), 'total')}
          <div class="paid-ok">${icon('checkCircle', 16)} ${t('paidVia')}</div></div>
          <div class="note info">${icon('bell', 16)} ${t('submittedNote')}</div>
        </div>
      </main>
      <div class="checkout-bar"><button class="btn primary block lg" data-action="viewOrders">${t('viewOrders')}</button>
        <button class="btn ghost block" data-action="tab" data-to="home">${t('continueShopping')}</button></div>`;
    },
  },

  /* ================= F10: Orders ================= */
  orders: {
    tab: 'orders', loads: true,
    render(r) {
      const tab = S.ui.ordersTab;
      const f = S.ui.ordersFilter;
      const filterMap = { pending: ['pending'], preparing: ['accepted', 'preparing'], ontheway: ['dispatched'] };
      let list = DB.orders.filter((o) => (tab === 'active' ? ACTIVE : HISTORY).includes(o.status));
      if (tab === 'active' && f) list = list.filter((o) => filterMap[f].includes(o.status));
      list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      const ac = DB.orders.filter((o) => ACTIVE.includes(o.status)).length;
      const hc = DB.orders.filter((o) => HISTORY.includes(o.status)).length;
      const g = gate(r, 'card', 3);
      return `${topBar({ title: t('ordersTitle'), back: false, right: bellBtn() })}
        <div class="seg"><button class="${tab === 'active' ? 'on' : ''}" data-action="ordersTab" data-t="active">${t('active')} <span class="cnt">${n(ac)}</span></button>
          <button class="${tab === 'history' ? 'on' : ''}" data-action="ordersTab" data-t="history">${t('history')} <span class="cnt">${n(hc)}</span></button></div>
        ${tab === 'active' && f ? `<div class="fpill-row"><span class="fpill">${icon('sliders', 14)} ${t('f_' + f)} <button data-action="clearOrdersFilter" aria-label="clear">${icon('close', 14)}</button></span></div>` : ''}
        <main class="scroll"><div class="list">${g || (list.length ? list.map(orderCard).join('')
          : emptyState(tab === 'active' ? '📦' : '🧾', tab === 'active' ? t('noActive') : t('noHistory'), '', `<button class="btn primary" data-action="goBrowse" data-cat="all">${t('browseVeg')}</button>`))}</div><div class="spacer"></div></main>`;
    },
  },

  /* ================= F11: Order details (active) / Receipt (history) ================= */
  order: {
    render(r) {
      const o = order(r.params.id);
      if (isDone(o)) return receiptView(o);
      const s = shop(o.shopId), tt = orderTotals(o);
      const a = address(o.addressId) || DB.addresses[0];
      const w = CONFIG.timeWindows.find((x) => x.id === o.window) || CONFIG.timeWindows[0];
      const stopped = ['declined', 'cancelled', 'expired'].includes(o.status);
      let primary = '';
      if (o.status === 'pending') primary = `<button class="btn danger-outline block" data-action="cancelOrder" data-id="${o.id}">${icon('close', 18)} ${t('cancelOrder')}</button>`;
      else if (o.status === 'dispatched') primary = `<button class="btn primary block lg" data-action="go" data-to="track" data-id="${o.id}">${icon('truck', 20)} ${t('trackOrder')}</button>`;
      else if (['declined', 'expired'].includes(o.status)) primary = `<button class="btn primary block lg" data-action="findAnother" data-id="${o.id}">${icon('search', 20)} ${t('findAnother')}</button>`;
      else if (o.status === 'cancelled') primary = `<button class="btn primary block lg" data-action="reorder" data-id="${o.id}">${icon('refresh', 20)} ${t('reorder')}</button>`;
      return `${topBar({ title: `#${o.id}`, sub: t('orderDetails') })}
        <main class="scroll"><div class="pad stack">
          <div class="card">
            <div class="od-top"><div><small class="muted">${t('orderId')}</small><b class="num big">#${o.id}</b></div>${statusChip(o.status)}</div>
            ${o.eta && o.status === 'dispatched' ? `<div class="eta"><small>${t('estArrival')}</small><b>${esc(L(o.eta))}</b></div>` : ''}
            ${stopped ? `<div class="note ${o.status === 'cancelled' && o.cancelledBy === 'buyer' ? 'info' : 'bad'}">${icon('alert', 16)} <div><b>${t('s_' + o.status)}</b> · ${esc(L(o.reason))}${o.refund === 'pending' ? `<br>${t('refundPending')}` : o.refund === 'refunded' ? `<br>${t('refunded')}` : ''}</div></div>` : ''}
          </div>
          ${routeCard(o)}
          <div class="card">
            <h3 class="ch">${icon('receipt', 17)} ${t('items')}</h3>
            <div class="items">${o.items.map((it, idx) => orderItemRow(o, it, idx)).join('')}</div>
            ${kv(t('subtotal'), money(tt.items))}${kv(t('deliveryFee'), money(tt.delivery))}${kv(t('total'), money(tt.grand), 'total')}
            <div class="paid-ok">${icon('checkCircle', 15)} ${t('paidVia')}</div>
          </div>
          <div class="card">
            <h3 class="ch">${icon('truck', 17)} ${t('delivery')}</h3>
            ${kv(t('date'), `${fmtDate(o.date, false)} · ${L(w.label)}`)}
          </div>
          <div class="card"><h3 class="ch">${icon('history', 17)} ${t('timelineTitle')}</h3>${timeline(o, false)}</div>
          ${o.note ? `<div class="card">${kv(t('noteToCoop'), esc(o.note))}</div>` : ''}
          <button class="btn soft block" data-action="toastMsg" data-k="supportToast">${icon('help', 18)} ${t('contactSupport')}</button>
        </div><div class="spacer"></div></main>
        ${primary ? `<div class="checkout-bar">${primary}</div>` : ''}`;
    },
  },

  track: {
    render(r) {
      const o = order(r.params.id);
      const s = shop(o.shopId), tt = orderTotals(o);
      const done = isDone(o);
      return `${topBar({ title: t('trackOrder'), sub: `#${o.id}` })}
        <main class="scroll"><div class="pad stack">
          ${done ? `<div class="arrived">${icon('checkCircle', 20)}<div><b>${t('deliveredTitle')}</b><span>${t('deliveredSub')}</span></div></div>` : ''}
          <div class="card">
            <div class="od-top"><div><small class="muted">${t('orderId')}</small><b class="num big">#${o.id}</b></div>${statusChip(o.status)}</div>
            <div class="eta"><small>${done ? t('deliveredAt') : t('estArrival')}</small><b>${done && o.deliveredAt ? fmtDateTime(o.deliveredAt) : o.eta ? esc(L(o.eta)) : `${fmtDate(o.date, false)} · ${L((CONFIG.timeWindows.find((x) => x.id === o.window) || CONFIG.timeWindows[0]).label)}`}</b></div>
          </div>
          <div class="card">
            <h3 class="ch">${t('itemsBought')}</h3>
            <div class="tbl-h"><span>${t('item')}</span><span>${t('qty')}</span><span>${t('total')}</span></div>
            ${o.items.map((it) => { const p = product(listing(it.listingId).product); return `<div class="tbl-r"><span><b>${esc(pname(p))}</b><small>${t('by')} ${esc(shopName(s))}</small></span><span class="num">${kg(it.qty)} kg</span><span class="num">${money(it.qty * it.price)}</span></div>`; }).join('')}
            ${kv(t('totalCost'), money(tt.grand), 'total')}
          </div>
          ${routeCard(o)}
          <h3 class="sec-inline">${t('deliveryTimeline')}</h3>
          <div class="card">${timeline(o, true)}</div>
          ${o.driver ? `<div class="card driver"><span class="drv-av">${icon('user', 22)}</span><div class="grow"><b>${t('driver')}: ${esc(o.driver.name)}</b><small>${t('plate')}: ${esc(o.driver.plate)} · ${esc(o.driver.phone)}</small></div></div>`
            : `<div class="note info">${icon('truck', 16)} ${t('driverSoon')}</div>`}
        </div><div class="spacer"></div></main>
        <div class="checkout-bar">
          ${done ? `<button class="btn primary block lg" data-action="go" data-to="order" data-id="${o.id}">${icon('receipt', 20)} ${t('viewReceipt')}</button>` : `
          <div class="btn-row"><button class="btn primary" data-action="callDriver" data-id="${o.id}" ${o.driver ? '' : 'disabled'}>${icon('phone', 18)} ${t('callDriver')}</button>
          <button class="btn soft" data-action="toastMsg" data-k="supportToast">${t('contactSupport')}</button></div>`}
        </div>`;
    },
  },

  /* ================= F15: Account ================= */
  account: {
    tab: 'account',
    render() {
      const R = DB.restaurant;
      const verified = S.session && S.session.verified;
      const cnt = (arr) => DB.orders.filter((o) => arr.includes(o.status)).length;
      const def = DB.addresses[0];
      const row = (ic, label, val, attrs) => `<button class="mrow" ${attrs}><span class="mi">${icon(ic, 19)}</span><span class="grow"><b>${label}</b>${val ? `<small>${val}</small>` : ''}</span>${icon('chevronRight', 18)}</button>`;
      return `${topBar({ title: t('accountTitle'), back: false, right: bellBtn() })}
        <main class="scroll"><div class="pad stack">
          <div class="acc-head">
            <span class="acc-av"><img src="assets/avatar-buyer.png" alt=""></span>
            <div class="grow"><h2>${esc(R.name)}</h2><small>${t('manager')}: ${esc(R.manager)}</small>
              ${verified ? `<span class="verified">${icon('shield', 13)} ${t('verifiedB2B')}</span>` : `<span class="verified pending">${icon('hourglass', 13)} ${t('beingVerified')}</span>`}</div>
          </div>
          <div class="shortcuts">
            ${[['pending', 'hourglass', ['pending']], ['preparing', 'box', ['accepted', 'preparing']], ['ontheway', 'truck', ['dispatched']]].map(([k, ic, st]) =>
              `<button data-action="ordersShortcut" data-f="${k}"><span class="sc-ic">${icon(ic, 20)}${cnt(st) ? `<span class="sc-n">${cnt(st)}</span>` : ''}</span><span>${t('f_' + k)}</span></button>`).join('')}
          </div>
          <div class="menu">
            ${row('pin', t('deliveryAddress'), esc(def.line), 'data-action="go" data-to="addresses"')}
            ${row('qr', t('paymentMethod'), 'Bakong KHQR', 'data-action="openSheet" data-sheet="payment"')}
            <button class="mrow" data-action="toggleNotif"><span class="mi">${icon('bell', 19)}</span><span class="grow"><b>${t('pushNotif')}</b><small>${S.ui.notifOn ? t('on') : t('off')}</small></span><span class="switch ${S.ui.notifOn ? 'on' : ''}"></span></button>
            ${row('orders', t('notifications'), t('unreadN', { n: n(DB.notifications.filter((x) => !x.read).length) }), 'data-action="go" data-to="notifications"')}
            <div class="mrow"><span class="mi">${icon('globe', 19)}</span><span class="grow"><b>${t('language')}</b></span>${langToggle()}</div>
            ${row('help', t('helpCenter'), '', 'data-action="go" data-to="help"')}
            <button class="mrow danger" data-action="logout"><span class="mi">${icon('logout', 19)}</span><span class="grow"><b>${t('logout')}</b></span></button>
          </div>
          <p class="muted c small">HarvestFlow Buyer · v1.0</p>
        </div></main>`;
    },
  },

  addresses: {
    render() {
      return `${topBar({ title: t('deliveryAddress') })}
        <main class="scroll"><div class="pad stack">
          ${DB.addresses.map((a, i) => `<div class="card addr-card ${i === 0 ? 'def' : ''}">
            <button class="grow addr-sel" data-action="setDefaultAddr" data-id="${a.id}"><span class="radio ${i === 0 ? 'on' : ''}"></span>
              <span><b>${esc(L(a.label))}</b>${i === 0 ? ` <span class="tag">${t('default')}</span>` : ''}<small>${esc(a.recipient)} · ${esc(a.phone)}</small><small>${esc(a.line)}</small></span></button>
            <button class="iconbtn soft" data-action="openSheet" data-sheet="editAddress" data-id="${a.id}" aria-label="${t('edit')}">${icon('edit', 17)}</button></div>`).join('')}
          <button class="btn outline block" data-action="openSheet" data-sheet="editAddress">${icon('plus', 18)} ${t('addAddress')}</button>
        </div></main>`;
    },
  },

  help: {
    render() {
      const qs = ['faq1', 'faq2', 'faq3', 'faq4', 'faq5'];
      return `${topBar({ title: t('helpCenter') })}
        <main class="scroll"><div class="pad stack">
          ${qs.map((q) => `<details class="faq card"><summary>${t(q + 'q')}</summary><p>${t(q + 'a')}</p></details>`).join('')}
          <button class="btn primary block" data-action="toastMsg" data-k="supportToast">${icon('phone', 18)} ${t('contactSupport')}</button>
        </div></main>`;
    },
  },

  /* ================= F17: Notifications ================= */
  notifications: {
    render() {
      const list = DB.notifications.slice().sort((a, b) => b.at.localeCompare(a.at));
      const ic = { sent: 'send', accepted: 'checkCircle', declined: 'close', preparing: 'box', dispatched: 'truck', delivered: 'bell', completed: 'checkCircle', cancelled: 'close', expired: 'clock', disputed: 'flag', stock: 'warning', price: 'trendUp' };
      return `${topBar({ title: t('notifications'), right: `<button class="iconbtn soft" data-action="readAll" aria-label="${t('markAllRead')}">${icon('checkCircle', 19)}</button>` })}
        <main class="scroll"><div class="list" style="padding-top:12px">
          ${list.length ? list.map((x) => `<button class="nrow ${x.read ? '' : 'unread'}" data-action="openNotif" data-id="${x.id}">
            <span class="nic n-${x.type}">${icon(ic[x.type] || 'bell', 19)}</span><span class="grow"><b>${esc(L(x.msg))}</b><small>${fmtDateTime(x.at)}</small></span>${x.read ? '' : '<span class="udot"></span>'}</button>`).join('')
            : emptyState('🔔', t('noNotif'))}
        </div></main>`;
    },
  },
};

/* =========================================================
   Screen partials
   ========================================================= */
function langToggle() {
  return `<div class="lang-toggle"><button class="${LANG === 'km' ? 'on' : ''}" data-action="lang" data-l="km">ខ្មែរ</button><button class="${LANG === 'en' ? 'on' : ''}" data-action="lang" data-l="en">EN</button></div>`;
}
function langPill() { return `<button class="langpill" data-action="lang" data-l="${LANG === 'km' ? 'en' : 'km'}">${icon('globe', 15)} ${LANG === 'km' ? 'ខ្មែរ' : 'EN'}</button>`; }

function marketRows() {
  return DB.marketPrices.map((m) => {
    const hf = lowestPrice(m.product);
    return { ...m, hf, pct: hf !== null ? Math.round(((m.market - hf) / m.market) * 100) : 0 };
  });
}

function recentOrderedListings() {
  const seen = new Set(), out = [];
  DB.orders.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)).forEach((o) => o.items.forEach((it) => {
    if (!seen.has(it.listingId)) { seen.add(it.listingId); out.push({ l: listing(it.listingId), qty: it.qty }); }
  }));
  return out.slice(0, 4);
}

function homeDealCard(d) {
  const l = listing(d.listingId), p = product(l.product), s = shop(l.shopId);
  return `<article class="hdeal">
    <button class="hd-img" data-action="go" data-to="product" data-id="${l.id}" data-deal="${d.id}">${prodImg(p, { h: 130, round: 12, emo: 64, inner: `<span class="off">${d.off}% ${t('off')}</span><span class="g-on">${gradeBadge(d.grade, 'dark')}</span><span class="dt-on">${dealTypeBadge(d)}</span>` })}</button>
    <button class="hd-body" data-action="go" data-to="product" data-id="${l.id}" data-deal="${d.id}">
      <span class="shopcaps">${esc(shopName(s))}</span><b>${esc(pname(p))}</b>
      <span class="hd-price"><b class="num">${money(d.now)}</b><small>/kg</small> <s class="num">${money(d.was)}</s></span></button>
    <div class="hd-foot"><span class="${d.kgLeft <= 10 ? 'amber-t' : 'green-t'}">${icon('box', 13)} ${t('kgLeftCaps', { n: kg(d.kgLeft) })}</span>
      <button class="addsq" data-action="dealQty" data-id="${d.id}" aria-label="${t('add')}">${icon('plus', 18)}</button></div>
  </article>`;
}

function homeProdCard(l) {
  const p = product(l.product), s = shop(l.shopId);
  return `<button class="hprod" data-action="go" data-to="product" data-id="${l.id}">
    ${prodImg(p, { h: 96, round: 12, emo: 52, inner: `<span class="g-on tl">${gradeBadge(l.grade, 'light')}</span>` })}
    <b>${esc(pname(p))}</b><small class="sub">${esc(pnameSub(p))}</small>${byShop(s)}
    <span class="hp-row"><b class="num green-t">${money(l.price)}/kg</b><small>${t('leftShort', { n: kg(l.stock) })}</small></span></button>`;
}

function recentRow({ l, qty }) {
  const p = product(l.product), s = shop(l.shopId);
  const ok = l.available && l.stock >= l.min;
  return `<div class="rrow"><button class="grow rr-main" data-action="go" data-to="product" data-id="${l.id}">${prodImg(p, { h: 48, w: 48, round: 10 })}
    <span><b>${esc(pname(p))}</b>${byShop(s)}<small class="num">${money(l.price)}/kg · ${t('lastOrdered')}: ${kg(qty)} kg</small></span></button>
    <button class="addsq light" data-action="quickAdd" data-id="${l.id}" ${ok ? '' : 'disabled'} aria-label="${t('add')}">${icon('plus', 18)}</button></div>`;
}

/* ---------- sorting: Relevance · Price · Rating · Discount ---------- */
const SORTS = [
  { id: 'relevance', k: 'sortRelevance', ic: 'sparkle', sub: 'sortRelevanceSub' },
  { id: 'price', k: 'sortPrice', ic: 'tag', sub: 'sortPriceSub' },
  { id: 'rating', k: 'sortRating', ic: 'star', sub: 'sortRatingSub' },
  { id: 'discount', k: 'sortDiscount', ic: 'bolt', sub: 'sortDiscountSub' },
];
function sortButton() {
  const cur = SORTS.find((x) => x.id === S.ui.sort) || SORTS[0];
  return `<button class="sortbtn" data-action="openSheet" data-sheet="sort">${icon('sort', 15)} ${t('sortBy')}: <b>${t(cur.k)}</b> ${icon('chevronDown', 14)}</button>`;
}
const inStock = (l) => l.available && l.stock >= l.min;
const offOf = (l) => { const d = dealForListing(l.id); return d ? d.off : 0; };
function cmpListings(a, b, keys = []) {
  const avail = (inStock(b) ? 1 : 0) - (inStock(a) ? 1 : 0);
  if (avail) return avail;                                       // sold-out always last
  const sort = S.ui.sort;
  if (sort === 'price') return a.price - b.price;
  if (sort === 'rating') return shop(b.shopId).rating - shop(a.shopId).rating || a.price - b.price;
  if (sort === 'discount') return offOf(b) - offOf(a) || a.price - b.price;
  const match = (keys.includes(b.product) ? 1 : 0) - (keys.includes(a.product) ? 1 : 0);
  return match || offOf(b) - offOf(a) || (b.grade === 'A') - (a.grade === 'A') || a.price - b.price;
}
/** Groups listings by shop and orders the shops by the chosen sort. */
function groupByShop(listings, keys = []) {
  const map = {};
  listings.forEach((l) => { (map[l.shopId] = map[l.shopId] || []).push(l); });
  const groups = Object.keys(map).map((sid) => {
    const items = map[sid].sort((a, b) => cmpListings(a, b, keys));
    const live = items.filter(inStock);
    return { s: shop(sid), items, best: live.length ? Math.min(...live.map((x) => x.price)) : Infinity, maxOff: Math.max(0, ...items.map(offOf)), live: live.length };
  });
  const sort = S.ui.sort;
  return groups.sort((a, b) => {
    if (sort === 'price') return a.best - b.best;
    if (sort === 'rating') return b.s.rating - a.s.rating;
    if (sort === 'discount') return b.maxOff - a.maxOff || a.best - b.best;
    return (b.s.linked ? 1 : 0) - (a.s.linked ? 1 : 0) || b.live - a.live || b.items.length - a.items.length || b.s.rating - a.s.rating;
  });
}
function shopHead(s, q = '') {
  return `<button class="rs-head" data-action="go" data-to="shop" data-id="${s.id}" ${q ? `data-q="${q}"` : ''}>
    <span class="shop-av" style="background:${s.color}">${s.initials}</span>
    <span class="grow"><b>${esc(shopName(s))}${s.linked ? ` <span class="live-tag">${t('liveTag')}</span>` : ''}</b><small>${icon('starFill', 12, 'star')} ${s.rating} (${n(s.reviews)}) · ${s.cert} · ${icon('pin', 11)} ${esc(L(s.location))}</small></span>
    <span class="view-shop">${t('viewShop')} ${icon('chevronRight', 15)}</span></button>`;
}

/** Browse: only the chosen category's vegetables, grouped under the shop that sells them. */
function updateBrowseList() {
  const el = document.getElementById('browse-list');
  if (!el) return;
  const cat = S.ui.browseCat, q = S.ui.browseQuery.trim().toLowerCase();
  const list = DB.listings.filter((l) => {
    if (cat !== 'all' && l.category !== cat) return false;
    if (!q) return true;
    const p = product(l.product), s = shop(l.shopId);
    return [p.name.en, p.name.km, s.name.en, s.name.km].join(' ').toLowerCase().includes(q);
  });
  const groups = groupByShop(list);
  el.innerHTML = groups.length ? groups.map((g) => `<section class="card shopgroup">
      ${shopHead(g.s)}
      <div class="sg-list">${g.items.map((l) => productRow(l, { hideShop: true })).join('')}</div>
    </section>`).join('')
    : emptyState('🥬', t('noBrowse'), t('noShopHasSub'), `<button class="btn primary" data-action="browseCat" data-cat="all">${t('showAll')}</button>`);
  const c = document.getElementById('browse-count');
  if (c) c.textContent = t('nVegShops', { n: n(list.length), s: n(groups.length) });
}

function searchBody() {
  const q = S.ui.searchText.trim();
  if (!q) {
    return `<div class="sec-h"><h2>${t('recentSearches')}</h2>${DB.recentSearches.length ? `<button class="viewall" data-action="clearRecent">${t('clear')}</button>` : ''}</div>
      <div class="pick-chips pad">${DB.recentSearches.map((s) => `<button class="pick" data-action="searchFor" data-q="${esc(s)}">${icon('history', 14)} ${esc(s)}</button>`).join('') || `<span class="muted">${t('noRecentSearch')}</span>`}</div>
      <div class="sec-h"><h2>${t('popular')}</h2></div>
      <div class="list">${['tomato', 'morningglory', 'carrot', 'kailan'].map((k) => suggestRow(k)).join('')}</div>`;
  }
  const keys = matchProducts(q);
  return `<div class="list" style="padding-top:12px">${keys.length ? keys.map((k) => suggestRow(k)).join('')
    : emptyState('🔍', t('noShopHas', { q: esc(q) }), t('noShopHasSub'), `<button class="btn primary" data-action="goBrowse" data-cat="all">${t('browseAll')}</button>`)}</div>`;
}
function suggestRow(k) {
  const p = product(k);
  const shopsN = new Set(DB.listings.filter((l) => l.product === k && l.available && l.stock > 0).map((l) => l.shopId)).size;
  const low = lowestPrice(k);
  return `<button class="sugg" data-action="searchFor" data-q="${k}">${prodImg(p, { h: 40, w: 40, round: 10 })}
    <span class="grow"><b>${esc(pname(p))}</b><small>${t('shopsN', { n: n(shopsN) })}${low !== null ? ` · ${t('from')} ${money(low)}/kg` : ''}</small></span>${icon('chevronRight', 18)}</button>`;
}

function resultShops(keys) {
  const groups = groupByShop(DB.listings.filter((l) => keys.includes(l.product)), keys);
  const live = groups.filter((g) => g.best < Infinity);
  const cheapest = live.length ? Math.min(...live.map((g) => g.best)) : null;
  groups.forEach((g) => { g.isCheapest = g.best === cheapest; });
  return groups;
}

/** Search result: one card per shop — the searched vegetables with + / − right here,
 *  plus a few other vegetables from the same shop. */
function resultShopCard(g, keys) {
  const s = g.s;
  const others = DB.listings.filter((l) => l.shopId === s.id && !keys.includes(l.product)).sort((a, b) => cmpListings(a, b)).slice(0, 4);
  const mini = (l) => {
    const p = product(l.product);
    return `<div class="rtile ${inStock(l) ? '' : 'so'}">
      <button class="rt-main" data-action="go" data-to="product" data-id="${l.id}">${prodImg(p, { h: 58, round: 10, emo: 30 })}
        <b>${esc(pname(p))}</b><span class="num green-t pr">${money(l.price)}/kg</span></button>
      <div class="rt-ctl">${qtyCtl(l, 'sm')}</div></div>`;
  };
  return `<article class="card rshop">
    ${shopHead(s, keys.join(','))}
    <div class="sg-list">${g.items.map((l) => productRow(l, { hideShop: true, pinned: g.isCheapest && l.price === g.best && inStock(l) })).join('')}</div>
    ${g.isCheapest ? `<div class="cheap-note">${icon('tag', 13)} ${t('cheapestShop')}</div>` : ''}
    ${others.length ? `<div class="also-h">${t('alsoFromShop')}</div><div class="rtiles">${others.map(mini).join('')}</div>` : ''}
  </article>`;
}

function basketGroup(g) {
  const s = shop(g.shopId);
  const on = !!S.shopTicked[g.shopId];
  return `<section class="card bgroup ${on ? 'ticked' : 'unticked'}">
    <div class="bg-head"><button class="bg-tick" data-action="tickShop" data-id="${g.shopId}"><span class="cbox ${on ? 'on' : ''}">${icon('check', 14)}</span></button>
      <span class="shop-av sm" style="background:${s.color}">${s.initials}</span><button class="grow bg-name" data-action="go" data-to="shop" data-id="${s.id}"><b>${esc(shopName(s))}</b><small>${icon('starFill', 11, 'star')} ${s.rating} · ${s.cert}</small></button></div>
    ${g.lines.map((line) => basketLine(line)).join('')}
    <label class="field slim note-f"><span>${icon('note', 13)} ${t('noteToShop')}</span><input type="text" data-bind="${g.shopId}" data-scope="shopNote" value="${esc(S.shopNotes[g.shopId] || '')}" placeholder="${t('notePh')}"></label>
    <div class="bg-sub">${kv(t('subtotal'), money(g.subtotal))}${kv(t('deliveryFee'), money(g.fee))}</div>
    ${g.blocked ? `<div class="note bad">${icon('alert', 15)} ${t('shopBlocked')}</div>` : ''}
  </section>`;
}

function basketLine(line) {
  const w = lineStatus(line), i = w.i;
  const lineTotal = r2(i.price * line.qty);
  return `<div class="bline ${w.unavailable ? 'unavail' : ''}">
    ${prodImg(i.p, { h: 56, w: 56, round: 12 })}
    <div class="grow">
      <div class="bl-top"><b>${esc(pname(i.p))}</b>${i.dl ? `<span class="dealtag">${t('deal')}</span>` : ''}</div>
      ${byShop(i.s)}
      <small class="num">${money(i.price)}/kg · ${gradeBadge(i.grade)}</small>
      ${w.unavailable ? `<div class="warn-line bad">${icon('alert', 13)} ${t('noLongerAvailable')}</div>` : ''}
      ${w.priceChanged && !w.unavailable ? `<div class="warn-line">${icon('alert', 13)} ${t('priceChanged', { a: money(line.priceAtAdd), b: money(i.price) })} <button class="link" data-action="ackPrice" data-id="${line.key}">${t('ok')}</button></div>` : ''}
      ${w.lowered && !w.unavailable ? `<div class="warn-line">${icon('alert', 13)} ${t('onlyLeft', { n: kg(i.stock) })}</div>` : ''}
      <div class="bl-bottom">${w.unavailable ? '<span></span>' : stepper(line.qty, { action: 'cartStep', id: line.key, min: i.min, max: i.stock })}
        <b class="num">${money(lineTotal)}</b>
        <button class="iconbtn danger-soft" data-action="removeLine" data-id="${line.key}" aria-label="${t('remove')}">${icon('trash', 17)}</button></div>
    </div></div>`;
}

function checkoutShopCard(g, idx, total) {
  const s = shop(g.shopId);
  const probs = (S.checkout.problems || {})[g.shopId] || [];
  return `<div class="card co-shop ${probs.length ? 'has-prob' : ''}">
    <div class="co-h"><span class="ord-n">${t('orderXofY', { x: n(idx + 1), y: n(total) })}</span><b>${esc(shopName(s))}</b></div>
    ${probs.map((p) => {
      const line = checkoutLines().find((l) => l.key === p.key);
      const nm = line ? pname(info(line.listingId, line.dealId).p) : '';
      if (p.type === 'price') return `<div class="note warn">${icon('alert', 15)} <div>${t('probPrice', { p: esc(nm), a: money(p.from), b: money(p.to) })}</div></div>`;
      if (p.type === 'stock') return `<div class="note bad">${icon('alert', 15)} <div>${t('probStock', { p: esc(nm), n: kg(p.left) })} <button class="link" data-action="fixStock" data-id="${p.key}">${t('setTo', { n: kg(p.left) })}</button></div></div>`;
      return `<div class="note bad">${icon('alert', 15)} <div>${t('probUnavailable', { p: esc(nm) })} <button class="link" data-action="fixRemove" data-id="${p.key}">${t('remove')}</button></div></div>`;
    }).join('')}
    ${g.lines.map((l) => { const i = info(l.listingId, l.dealId); return `<div class="co-line">${prodImg(i.p, { h: 44, w: 44, round: 10 })}<div class="grow"><b>${esc(pname(i.p))}</b>${i.dl ? ` <span class="dealtag">${t('deal')}</span>` : ''}${byShop(i.s)}<small class="num">${kg(l.qty)} kg × ${money(i.price)}</small></div><b class="num">${money(l.qty * i.price)}</b></div>`; }).join('')}
    <label class="field slim"><span>${t('noteToShop')} <em>(${t('optional')})</em></span><input type="text" data-bind="${g.shopId}" data-scope="shopNote" value="${esc(S.shopNotes[g.shopId] || '')}" placeholder="${t('notePh')}"></label>
    ${kv(t('subtotal'), money(g.subtotal))}${kv(t('deliveryFee'), money(g.fee))}
  </div>`;
}

function orderItemRow(o, it, idx) {
  const l = listing(it.listingId), p = product(l.product), s = shop(o.shopId);
  const rec = o.received && o.received.items[idx];
  return `<div class="oi">${prodImg(p, { h: 44, w: 44, round: 10 })}<div class="grow"><b>${esc(pname(p))}</b>${it.dealId ? ` <span class="dealtag">${t('deal')}</span>` : ''}${byShop(s)}
    <small class="num">${kg(it.qty)} kg × ${money(it.price)}${rec && rec.qty !== it.qty ? ` · ${t('received')} ${kg(rec.qty)} kg` : ''}${rec && !rec.ok ? ` · ${t('notOk')}` : ''}</small></div><b class="num">${money(it.qty * it.price)}</b></div>`;
}

/** From which cooperative → to which restaurant */
function routeCard(o) {
  const s = shop(o.shopId), a = address(o.addressId) || DB.addresses[0];
  return `<div class="card route">
    <h3 class="ch">${icon('truck', 17)} ${t('route')}</h3>
    <div class="rt"><span class="rdot from"></span><div><small>${t('from')}</small><b>${esc(shopName(s))}</b><span>${esc(L(s.location))}</span></div></div>
    <div class="rt"><span class="rdot to"></span><div><small>${t('to')}</small><b>${esc(DB.restaurant.name)}</b><span>${esc(a.line)}</span></div></div>
  </div>`;
}

/** Receipt of a delivered order (History → tap an order). */
function receiptView(o) {
  const s = shop(o.shopId), tt = orderTotals(o);
  const paidAt = (o.payment && o.payment.paidAt) || o.createdAt;
  return `${topBar({ title: t('receipt'), sub: `#${o.id}` })}
    <main class="scroll"><div class="pad stack">
      <div class="card">
        <div class="od-top"><div><small class="muted">${t('orderId')}</small><b class="num big">#${o.id}</b></div>${statusChip(o.status)}</div>
        <div class="eta"><small>${t('deliveredAt')}</small><b>${o.deliveredAt ? fmtDateTime(o.deliveredAt) : fmtDate(o.date, false)}</b></div>
      </div>
      ${routeCard(o)}
      <div class="card">
        <h3 class="ch">${icon('receipt', 17)} ${t('items')}</h3>
        <div class="items">${o.items.map((it, idx) => orderItemRow(o, it, idx)).join('')}</div>
        ${kv(t('subtotal'), money(tt.items))}${kv(t('deliveryFee'), money(tt.delivery))}${kv(t('total'), money(tt.grand), 'total')}
      </div>
      <div class="card">
        <h3 class="ch">${icon('qr', 17)} ${t('payment')}</h3>
        ${kv(t('paidWith'), 'Bakong KHQR')}${kv(t('paidOn'), fmtDateTime(paidAt))}${kv(t('amount'), money(tt.grand))}
        <div class="paid-ok">${icon('checkCircle', 15)} ${t('paidVia')}</div>
      </div>
      ${o.rating || o.report ? `<div class="card">
        <h3 class="ch">${icon('star', 17)} ${t('yourFeedback')}</h3>
        ${o.rating ? `<div class="fb-stars">${stars(o.rating, 18)}</div>${o.ratingComment ? `<p class="fb-text">“${esc(o.ratingComment)}”</p>` : ''}` : ''}
        ${o.report ? `<div class="note bad">${icon('flag', 15)} <div><b>${t('reported')}: ${t(o.report.reason)}</b>${o.report.note ? `<br>${esc(o.report.note)}` : ''}<br><small>${t('coopWillReply')}</small></div></div>` : ''}
      </div>` : ''}
    </div><div class="spacer"></div></main>
    <div class="checkout-bar"><div class="btn-row">
      <button class="btn outline" data-action="rate" data-id="${o.id}">${icon('star', 18)} ${o.rating ? t('editRating') : t('rate')}</button>
      <button class="btn primary" data-action="reorder" data-id="${o.id}">${icon('refresh', 18)} ${t('reorder')}</button>
    </div></div>`;
}
