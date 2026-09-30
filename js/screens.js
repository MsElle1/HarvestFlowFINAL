/* =========================================================
   SCREENS — each returns the HTML for one screen.
   `nav` = which bottom-nav item is highlighted (null = no nav).
   ========================================================= */

const placeholderLeft = '<div style="width:40px;flex:none"></div>';

const SCREENS = {
  /* ---------------- Role selection ---------------- */
  role: {
    nav: null,
    render() {
      return `<div class="auth">
        <div class="auth-top">${langToggle()}</div>
        <div class="auth-brand">
          <img src="assets/logo.png" alt="HarvestFlow">
          <p>${t('appTagline')}</p>
          <div class="auth-hero"><img src="assets/ic-vegetable.png" alt=""><img src="assets/ic-inventory.png" alt=""><img src="assets/ic-market.png" alt=""></div>
        </div>
        <div class="auth-body">
          <h2>${t('chooseRole')}</h2><p>${t('chooseRoleSub')}</p>
          <button class="role primary" data-action="go" data-to="login">
            <span class="ri"><img src="assets/ic-inventory.png" alt=""></span>
            <span class="grow"><b>${t('roleSeller')}</b><small>${t('roleSellerSub')}</small></span>
            ${icon('chevronRight', 22)}
          </button>
          <button class="role" data-action="openBuyer">
            <span class="ri"><img src="assets/ic-order.png" alt=""></span>
            <span class="grow"><b>${t('roleBuyer')}</b><small>${t('roleBuyerSub')}</small></span>
            ${icon('chevronRight', 22)}
          </button>
        </div>
      </div>`;
    },
  },

  /* ---------------- Seller login ---------------- */
  login: {
    nav: null,
    render() {
      const f = appState.ui.login || (appState.ui.login = { phone: DB.sellerProfile.phone, pin: '', err: {} });
      return `<div class="auth">
        <div class="auth-top" style="justify-content:space-between"><button class="icon-btn plain" data-action="back">${icon('back', 22)}</button>${langToggle()}</div>
        <div class="auth-brand"><img src="assets/logo.png" alt="HarvestFlow"></div>
        <div class="auth-body">
          <h2>${t('sellerLogin')}</h2><p>${t('roleSellerSub')}</p>
          <div class="field ${f.err.phone ? 'bad' : ''}">
            <label>${t('phone')}</label>
            <input type="tel" inputmode="tel" data-bind="phone" data-scope="login" value="${esc(f.phone)}" placeholder="012 345 678">
            ${f.err.phone ? `<div class="fe">${t(f.err.phone)}</div>` : ''}
          </div>
          <div class="field ${f.err.pin ? 'bad' : ''}">
            <label>${t('pin')}</label>
            <input type="password" inputmode="numeric" maxlength="4" class="pin-input" data-bind="pin" data-scope="login" value="${esc(f.pin)}" placeholder="••••">
            ${f.err.pin ? `<div class="fe">${t(f.err.pin)}</div>` : ''}
          </div>
          <button class="btn primary block lg" data-action="login">${t('login')} ${icon('arrowRight', 18)}</button>
          <div class="demo-hint">${t('demoHint')}</div>
        </div>
      </div>`;
    },
  },

  /* ---------------- Seller dashboard (Figma source of truth) ---------------- */
  home: {
    nav: 'home',
    render() {
      const p = DB.sellerProfile;
      const s = dashboardSummary();
      const newCount = ordersByStatus('new').length;
      const urgent = urgentBatches();
      return `<header class="hdr">
          <img class="logo" src="assets/logo.png" alt="HarvestFlow">
          <div class="grow"></div>
          <div class="hdr-actions">${bellButton()}<button class="icon-btn" data-action="tab" data-to="profile" aria-label="${t('profile')}">${icon('user', 19)}</button></div>
        </header>
        <main class="scroll">
          <section class="greet">
            <img class="avatar" src="${p.photo}" alt="">
            <div><small>${t('hello')}</small><h2>${esc(L(p.name))}</h2><div class="loc">${icon('pin', 13)} ${esc(L(p.location))}</div></div>
          </section>

          <section class="hero">
            <div class="hero-top">${icon('warehouse', 17)} ${t('totalStock')}</div>
            <div class="hero-num"><b>${kgFmt(s.total)}</b><span>${t('kgLong')}</span></div>
            <div class="pills">
              <button class="pill" data-action="go" data-to="currentStock" data-filter="fresh"><small><i></i>${t('pillAvailable')}</small><b>${kgFmt(s.fresh)}<em>kg</em></b></button>
              <button class="pill warn" data-action="go" data-to="currentStock" data-filter="soon"><small>${t('pillAtRisk')}</small><b>${kgFmt(s.atRisk)}<em>kg</em></b></button>
              <button class="pill" data-action="tab" data-to="orders" data-otab="preparing"><small>${t('pillOrdered')}</small><b>${kgFmt(s.reserved)}<em>kg</em></b></button>
            </div>
          </section>

          <section class="bento">
            <button class="bento-card" data-action="tab" data-to="stockMgmt">
              <img src="assets/ic-inventory.png" alt=""><h3>${t('stockMgmt')}</h3>
              <span class="go">${t('openView')} ${icon('arrowRight', 13)}</span>
            </button>
            <button class="bento-card" data-action="go" data-to="currentStock">
              <img src="assets/ic-vegetable.png" alt=""><h3>${t('currentStock')}</h3>
              <span class="go">${t('checkStock')} ${icon('arrowRight', 13)}</span>
            </button>
            <button class="bento-card" data-action="tab" data-to="orders" data-otab="new">
              ${newCount ? `<span class="badge-new">${t('newBadge', { n: n(newCount) })}</span>` : ''}
              <img src="assets/ic-order.png" alt=""><h3>${t('orders')}</h3>
              <p>${newCount ? t('newOrdersWaiting', { n: n(newCount) }) : t('noNewOrders')}</p>
              <span class="go ${newCount ? 'red' : ''}">${newCount ? t('checkNow') + ' !' : t('openView') + ' ' + icon('arrowRight', 13)}</span>
            </button>
            <button class="bento-card" data-action="tab" data-to="market">
              <img src="assets/ic-market.png" alt=""><h3>${t('marketPrices')}</h3>
              <p>${t('todayPrices')}</p>
              <span class="go">${t('verify')} ${icon('trendUp', 13)}</span>
            </button>
          </section>

          <div class="sec-title">
            <h3 class="red"><img src="assets/ic-alert.png" alt="">${t('sellSoonTitle')}</h3>
            <span class="aside ${urgent.length ? '' : 'muted'}">${t('itemsCount', { n: n(urgent.length) })}</span>
          </div>
          ${urgent.length ? `<div class="hshelf">${urgent.map(urgentCard).join('')}</div>`
            : `<div class="pad"><div class="card" style="text-align:center;color:var(--green-800);font-weight:600">${icon('leaf', 17)} ${t('nothingUrgent')}</div></div>`}

          <button class="cta-big" data-action="go" data-to="addHarvest">${icon('plusCircle', 24)} ${t('addNewCrop')}</button>
        </main>`;
    },
  },

  /* ---------------- Stock management hub ---------------- */
  stockMgmt: {
    nav: 'stockMgmt',
    render() {
      const tab = appState.ui.stockTab;
      const urgentN = urgentBatches().length;
      const tabs = [['batches', 'tabBatches'], ['expiring', 'tabExpiring'], ['history', 'tabHistory'], ['farmers', 'tabFarmers']];
      let body = '';
      if (tab === 'batches') body = stockBatchesTab();
      else if (tab === 'expiring') body = stockExpiringTab();
      else if (tab === 'history') body = historyTab();
      else body = farmersTab();
      return `${header({ title: t('stockMgmt'), sub: t('stockMgmtSub'), back: false, right: `<button class="icon-btn green" data-action="go" data-to="addHarvest" aria-label="${t('addStock')}">${icon('plus', 22)}</button>` }).replace('<header class="hdr">', '<header class="hdr">' + placeholderLeft)}
        <div class="seg">${tabs.map(([id, k]) => `<button class="${tab === id ? 'on' : ''}" data-action="stockTab" data-tab="${id}">${t(k)}${id === 'expiring' && urgentN ? `<span class="cnt">${urgentN}</span>` : ''}</button>`).join('')}</div>
        <main class="scroll">${body}<div class="spacer"></div></main>`;
    },
  },

  /* ---------------- Current stock (live) ---------------- */
  currentStock: {
    nav: 'stockMgmt',
    render() {
      const u = appState.ui;
      const filters = [['all', 'fAll'], ['fresh', 'stFresh'], ['soon', 'stSoon'], ['expired', 'stExpired']];
      const sortKey = { shelf: 'sortShelf', most: 'sortMost', least: 'sortLeast', newest: 'sortNewest' }[u.sort];
      return `${header({ title: t('currentStock'), sub: t('available') })}
        <div class="search">${icon('search', 20)}<input type="text" id="stock-search" placeholder="${t('searchStock')}" value="${esc(u.search)}" data-bind="search" data-scope="ui" autocomplete="off">
          <button class="clear" data-action="clearSearch" style="${u.search ? '' : 'display:none'}" aria-label="clear">${icon('close', 18)}</button></div>
        <div class="chips" style="margin-top:12px">${filters.map(([id, k]) => `<button class="chip st-${id} ${u.filter === id ? 'on' : ''}" data-action="filter" data-f="${id}">${t(k)}</button>`).join('')}</div>
        <div class="toolbar"><span class="count" id="stock-count"></span>
          <button class="sort-btn" data-action="openSheet" data-sheet="sort">${icon('sort', 16)} ${t(sortKey)} ${icon('chevronDown', 14)}</button></div>
        <main class="scroll"><div class="list" id="stock-results"></div><div class="spacer"></div></main>`;
    },
    after() { updateStockResults(); },
  },

  /* ---------------- Stock detail ---------------- */
  stockDetail: {
    nav: null,
    render({ id }) {
      const b = batch(id);
      if (!b) return notFound();
      const c = crop(b.cropId), f = farmer(b.farmerId), q = batchQty(b), st = batchStatus(b);
      const d = daysLeft(b);
      const txs = DB.stockTransactions.filter((x) => x.batchId === b.id).sort((a, z) => new Date(z.at) - new Date(a.at));
      const netAdjust = q.adjusted;
      return `${header({ title: `${cropMark(c)} ${esc(cropName(c))}`, sub: `#${b.id}` })}
        <main class="scroll">
          <div class="d-hero" style="background:${c.tint || '#eef3ec'}"><div class="inner">${thumb(c, 120, b.grade)}</div></div>
          <div class="d-head">
            <h2>${esc(cropName(c))}</h2>
            <div class="qty ${st}">${kgFmt(q.available)}<em>kg</em></div>
            <div class="meta">${t('available')}</div>
            <div class="badges">${freshBadge(b)} ${gradeBadge(b.grade)} ${locBadge(b.location)} ${b.discountPct ? `<span class="badge disc">-${b.discountPct}%</span>` : ''}</div>
          </div>
          ${isSellFirst(b) ? `<div class="first-note">${icon('bolt', 18)} ${t('sellFirstHint')}</div>` : ''}
          <div class="pad stack" style="margin-top:12px">
            ${['soon', 'expired'].includes(st) ? `<button class="btn warm block" data-action="discount" data-id="${b.id}">${icon('tag', 18)} ${b.discountPct ? t('discounted', { n: b.discountPct }) : t('discount')}</button>` : ''}
            <div class="card">
              <div class="info-grid">
                <div class="info wide" style="display:flex;align-items:center;gap:10px">${farmerAvatar(f, 42)}<div><small>${t('farmerLabel')} · ${t('trace')}</small><b>${esc(farmerName(f))}</b><small>${icon('phone', 11)} ${esc(f.phone || '—')} · ${esc(L(f.location))}</small></div></div>
                <div class="info"><small>${icon('calendar', 12)} ${t('harvestDate')}</small><b>${fmtDate(b.harvestDate)}</b></div>
                <div class="info"><small>${icon('hourglass', 12)} ${t('shelfLife')}</small><b>${t('days', { n: n(b.shelfLifeDays) })}</b></div>
                <div class="info"><small>${icon('clock', 12)} ${t('remaining')}</small><b style="color:${st === 'expired' ? 'var(--red-700)' : st === 'soon' ? 'var(--orange-600)' : 'var(--green-700)'}">${d < 0 ? t('stExpired') : d === 0 ? t('lastDay') : t('days', { n: n(d) })}</b></div>
                <div class="info"><small>${icon('calendar', 12)} ${t('expiresOn')}</small><b>${fmtDate(expiryIso(b))}</b></div>
                <div class="info"><small>${icon('shield', 12)} ${t('quality')}</small><b>Grade ${b.grade} · ${t('grade' + b.grade)}</b></div>
                <div class="info"><small>${icon('warehouse', 12)} ${t('storage')}</small><b>${locName(b.location)}</b></div>
                <div class="info wide"><small>${icon('bullet', 12)} ${t('status')}</small><b>${statusBadge(b)}</b></div>
                ${b.notes ? `<div class="info wide"><small>${icon('note', 12)} ${t('notes')}</small><b style="font-weight:500">${esc(b.notes)}</b></div>` : ''}
              </div>
            </div>
            <div class="card">
              <div class="card-title">${icon('scale', 18)} ${t('stockFlow')}</div>
              <div class="flow">
                <div class="flow-row orig"><span class="dotc">${icon('box', 17)}</span><span class="t">${t('original')}</span><span class="v">${kgFmt(q.original)} kg</span></div>
                ${q.sold ? `<div class="flow-arrow">↓</div><div class="flow-row sold"><span class="dotc">${icon('bag', 17)}</span><span class="t">${t('sold')}</span><span class="v">−${kgFmt(q.sold)} kg</span></div>` : ''}
                ${q.reserved ? `<div class="flow-arrow">↓</div><div class="flow-row res"><span class="dotc">${icon('orders', 17)}</span><span class="t">${t('reserved')}</span><span class="v">−${kgFmt(q.reserved)} kg</span></div>` : ''}
                ${q.removed ? `<div class="flow-arrow">↓</div><div class="flow-row rem"><span class="dotc">${icon('trash', 17)}</span><span class="t">${t('removed')}</span><span class="v">−${kgFmt(q.removed)} kg</span></div>` : ''}
                ${netAdjust ? `<div class="flow-arrow">↓</div><div class="flow-row ${netAdjust < 0 ? 'rem' : 'orig'}"><span class="dotc">${icon('edit', 17)}</span><span class="t">${t('txAdjust')}</span><span class="v">${netAdjust > 0 ? '+' : '−'}${kgFmt(Math.abs(netAdjust))} kg</span></div>` : ''}
                <div class="flow-arrow">↓</div>
                <div class="flow-row left"><span class="dotc">${icon('check', 17)}</span><span class="t">${t('remainingNow')}</span><span class="v">${kgFmt(q.available)} kg</span></div>
              </div>
            </div>
            <div class="card">
              <div class="card-title">${icon('history', 18)} ${t('batchHistory')}</div>
              ${txs.map((x) => txRow(x, true)).join('')}
            </div>
          </div>
          <div class="spacer"></div>
        </main>
        <div class="footer-bar"><div class="btn-row">
          <button class="btn danger-outline" data-action="openSheet" data-sheet="removeStock" data-id="${b.id}">${icon('trash', 18)} ${t('removeStock')}</button>
          <button class="btn primary" data-action="openSheet" data-sheet="editStock" data-id="${b.id}">${icon('edit', 18)} ${t('editStock')}</button>
        </div></div>`;
    },
  },

  /* ---------------- Add new harvest ---------------- */
  addHarvest: {
    nav: null,
    render() {
      const F = appState.ui.addForm || (appState.ui.addForm = newAddForm());
      const e = F.errors || {};
      const done = addFormDone(F);
      const refPrice = (cid) => { const p = DB.marketPrices.find((x) => x.cropId === cid && x.marketId === 'btb'); return p ? money(p.price) + '/kg' : ''; };
      const c = crop(F.cropId), fm = farmer(F.farmerId);
      const stepN = (i, ok) => `<span class="stepn ${ok ? 'done' : ''}">${ok ? icon('check', 14) : n(i)}</span>`;
      const err = (k) => (e[k] ? `<div class="err-msg">${icon('alert', 15)} ${t(e[k])}</div>` : '');
      const dateChoice = F.harvestDate === isoDay(0) ? 'today' : F.harvestDate === isoDay(-1) ? 'yday' : F.harvestDate === isoDay(-2) ? 'd2' : (F.harvestDate ? 'other' : '');
      const shelfVal = Number(F.shelf);
      const isCustomShelf = F.shelfCustom;
      return `${header({ title: `${icon('plusCircle', 18)} ${t('addHarvestTitle')}`, sub: t('stockMgmtSub') })}
        <div class="progress"><i style="width:${(done / 7) * 100}%"></i></div>
        <main class="scroll" id="add-scroll"><div class="pad stack" style="padding-top:12px">

          <section class="card ${e.crop ? 'err' : ''}" id="sec-crop">
            <div class="card-title">${stepN(1, !!c)}<span class="grow">${t('stepCrop')}</span>${c ? `<span class="hint">${t('selected', { x: esc(cropName(c)) })}</span>` : ''}</div>
            <div class="crop-grid">
              ${DB.crops.map((x) => `<button class="crop-opt ${F.cropId === x.id ? 'on' : ''}" data-action="form" data-k="cropId" data-v="${x.id}">
                ${thumb(x, 52)}<b>${esc(cropName(x))}</b><small>${refPrice(x.id)}</small></button>`).join('')}
              <button class="crop-opt add" data-action="openSheet" data-sheet="newCrop"><span class="plus">${icon('plus', 22)}</span><b>${t('addCropShort')}</b></button>
            </div>${err('crop')}
          </section>

          <section class="card ${e.qty ? 'err' : ''}" id="sec-qty">
            <div class="card-title">${stepN(2, Number(F.qty) > 0)}<span class="grow">${t('stepQty')}</span></div>
            <div class="qty-box"><div class="qty-row">
              <button class="step" data-action="qtyStep" data-d="-1" aria-label="minus">${icon('minus', 24)}</button>
              <div class="qty-input"><div class="in"><input id="qty-input" type="number" inputmode="decimal" min="0" step="0.5" placeholder="0" value="${F.qty === '' ? '' : esc(F.qty)}" data-bind="qty" data-scope="form"><span class="u">kg</span></div><small>${t('netWeight')}</small></div>
              <button class="step plus" data-action="qtyStep" data-d="1" aria-label="plus">${icon('plus', 24)}</button>
            </div></div>
            <div class="quick">${[10, 25, 50, 100].map((v) => `<button data-action="qtyAdd" data-v="${v}">+${v} kg</button>`).join('')}</div>
            ${err('qty')}
          </section>

          <section class="card ${e.farmer ? 'err' : ''}" id="sec-farmer">
            <div class="card-title">${stepN(3, !!fm)}<span class="grow">${t('stepFarmer')}</span></div>
            ${fm ? `<button class="farmer-pick" data-action="openSheet" data-sheet="farmerPicker">${farmerAvatar(fm, 52)}
                <span class="grow"><b>${esc(farmerName(fm))}</b><small>${icon('phone', 12)} ${esc(fm.phone || '—')}</small><small>${icon('pin', 12)} ${esc(L(fm.location))}</small></span>
                <span class="btn outline sm">${icon('users', 16)} ${t('change')}</span></button>`
              : `<button class="farmer-pick empty-f" data-action="openSheet" data-sheet="farmerPicker">${icon('userPlus', 22)} ${t('chooseFarmer')}</button>`}
            ${err('farmer')}
          </section>

          <section class="card ${e.date ? 'err' : ''}" id="sec-date">
            <div class="card-title">${stepN(4, !!F.harvestDate)}<span class="grow">${t('stepDate')}</span>${F.harvestDate ? `<span class="hint">${fmtDate(F.harvestDate)}</span>` : ''}</div>
            <div class="pick-chips">
              <button class="pick ${dateChoice === 'today' ? 'on' : ''}" data-action="form" data-k="harvestDate" data-v="${isoDay(0)}">${icon('calendar', 16)} ${t('today')}</button>
              <button class="pick ${dateChoice === 'yday' ? 'on' : ''}" data-action="form" data-k="harvestDate" data-v="${isoDay(-1)}">${t('yesterday')}</button>
              <button class="pick ${dateChoice === 'd2' ? 'on' : ''}" data-action="form" data-k="harvestDate" data-v="${isoDay(-2)}">${t('twoDaysAgo')}</button>
              <button class="pick ${dateChoice === 'other' || F.showDate ? 'on' : ''}" data-action="showDate">${t('otherDate')}</button>
            </div>
            ${F.showDate || dateChoice === 'other' ? `<div class="date-other"><input type="date" max="${isoDay(0)}" value="${F.harvestDate}" data-bind="harvestDate" data-scope="form" data-rerender="1"></div>` : ''}
            ${err('date')}
          </section>

          <section class="card ${e.quality ? 'err' : ''}" id="sec-quality">
            <div class="card-title">${stepN(5, !!F.grade)}<span class="grow">${t('stepQuality')}</span></div>
            <div class="opt-grid c3">${GRADES.map((g) => `<button class="opt g-${g} ${F.grade === g ? 'on' : ''}" data-action="form" data-k="grade" data-v="${g}"><b>Grade ${g}</b><small>${g} = ${t('grade' + g)}</small></button>`).join('')}</div>
            ${err('quality')}
          </section>

          <section class="card ${e.shelf ? 'err' : ''}" id="sec-shelf">
            <div class="card-title">${stepN(6, shelfVal > 0)}<span class="grow">${t('stepShelf')}</span>${F.harvestDate && shelfVal > 0 ? `<span class="hint">${t('expiresOn')} ${fmtDate(addDaysIso(F.harvestDate, shelfVal))}</span>` : ''}</div>
            <div class="pick-chips">
              ${SHELF_PRESETS.map((d) => `<button class="pick ${d <= SOON_DAYS ? 'soon' : ''} ${!isCustomShelf && shelfVal === d ? 'on' : ''}" data-action="shelf" data-v="${d}">${t('days', { n: n(d) })}</button>`).join('')}
              <button class="pick ${isCustomShelf ? 'on' : ''}" data-action="shelfCustom">${t('customDays')}</button>
            </div>
            ${isCustomShelf ? `<div class="custom-days"><input type="number" inputmode="numeric" min="1" max="90" value="${F.shelf || ''}" data-bind="shelf" data-scope="form" placeholder="0"><span>${t('enterDays')}</span></div>` : ''}
            ${err('shelf')}
          </section>

          <section class="card ${e.location ? 'err' : ''}" id="sec-location">
            <div class="card-title">${stepN(7, !!F.location)}<span class="grow">${t('stepLocation')}</span></div>
            <div class="opt-grid c3">${LOCATIONS.map((l) => `<button class="opt ${F.location === l ? 'on' : ''}" data-action="form" data-k="location" data-v="${l}"><b>${icon(l === 'COLD' ? 'snow' : 'warehouse', 16)} ${locName(l)}</b><small>${t('loc' + l + 'Temp')}</small></button>`).join('')}</div>
            ${err('location')}
          </section>
        </div><div class="spacer"></div></main>
        <div class="footer-bar">
          <div class="note">${icon('checkCircle', 15)} <span id="done-note">${t('doneOf', { a: n(done), b: n(7) })}</span></div>
          <button class="btn primary block lg" data-action="reviewHarvest">${icon('checkCircle', 20)} ${t('review')}</button>
        </div>`;
    },
  },

  /* ---------------- Orders ---------------- */
  orders: {
    nav: 'orders',
    render() {
      const tab = appState.ui.ordersTab;
      const count = (arr) => DB.orders.filter((o) => arr.includes(o.status)).length;
      const tabs = [['new', 'osNew', ['new']], ['preparing', 'osPreparing', ['preparing']], ['ready', 'osReady', ['ready']], ['delivering', 'osDelivering', ['delivering']], ['completed', 'osCompleted', ['completed']], ['cancelled', 'osCancelled', ['cancelled', 'rejected']], ['all', 'fAll', Object.keys(ORDER_STATUS_KEY)]];
      const cur = tabs.find((x) => x[0] === tab) || tabs[0];
      const list = DB.orders.filter((o) => cur[2].includes(o.status)).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      return `${header({ title: t('orders'), sub: t('ordersSub'), back: false, right: bellButton() }).replace('<header class="hdr">', '<header class="hdr">' + placeholderLeft)}
        <main class="scroll">
          <div class="sum-grid">
            <button class="sum s-new ${tab === 'new' ? 'on' : ''}" data-action="ordersTab" data-tab="new"><small>${t('sumNew')}</small><b>${count(['new'])}</b></button>
            <button class="sum s-prep ${tab === 'preparing' ? 'on' : ''}" data-action="ordersTab" data-tab="preparing"><small>${t('sumPreparing')}</small><b>${count(['preparing'])}</b></button>
            <button class="sum s-del ${tab === 'ready' ? 'on' : ''}" data-action="ordersTab" data-tab="ready"><small>${t('sumToDeliver')}</small><b>${count(['ready', 'delivering'])}</b></button>
          </div>
          <div class="chips" style="margin:14px 0 12px">${tabs.map(([id, k, st]) => `<button class="chip ${tab === id ? 'on' : ''}" data-action="ordersTab" data-tab="${id}">${t(k)} <span class="cnt">${count(st)}</span></button>`).join('')}</div>
          <div class="list">${list.length ? list.map(orderCard).join('') : emptyState('assets/ic-order.png', t('emptyOrders'))}</div>
          <div class="spacer"></div>
        </main>`;
    },
  },

  /* ---------------- Order detail ---------------- */
  orderDetail: {
    nav: null,
    render({ id }) {
      const o = order(id);
      if (!o) return notFound();
      const it = orderItem(o.id), c = crop(it.cropId), by = buyer(o.buyerId);
      const flowSteps = ['osNew', 'osPreparing', 'osReady', 'osDelivering', 'osCompleted'];
      const idx = { new: 0, preparing: 1, ready: 2, delivering: 3, completed: 4 }[o.status];
      const stepper = idx === undefined ? '' : `<div class="ostepper">${flowSteps.map((k, i) => `<div class="ostep ${i < idx || o.status === 'completed' ? 'done' : i === idx ? 'cur' : ''}"><div class="c">${i < idx || o.status === 'completed' ? '✓' : i + 1}</div>${t(k)}</div>`).join('')}</div>`;
      const banner = ['cancelled', 'rejected'].includes(o.status)
        ? `<div class="status-banner ${o.status}">${icon('close', 20)} ${t(ORDER_STATUS_KEY[o.status])}${o.rejectReason ? ` · ${t(o.rejectReason)}` : ''}${o.cancelledBy === 'buyer' ? ` · ${t('byBuyer')}` : ''}</div>`
        : o.status === 'completed' ? `<div class="status-banner completed">${icon('checkCircle', 20)} ${t('completed')}</div>` : '';

      // Cards are ordered so the thing the seller must DO is always first.
      const buyerCard = `<div class="card">
        <div class="card-title">${icon('store', 18)} ${t('buyer')}</div>
        <div style="display:flex;align-items:center;gap:12px">
          <div class="fav" style="background:#3a5a8c;width:48px;height:48px">${esc(by.name.slice(0, 1))}</div>
          <div style="flex:1;min-width:0"><b style="font-size:16px">${esc(by.name)}</b><div class="meta">${esc(L(by.type))} · ${icon('phone', 11)} ${esc(by.phone)}</div></div>
          <a class="phone-btn" href="tel:${by.phone.replace(/\s/g, '')}" aria-label="${t('call')}">${icon('phone', 18)}</a>
        </div>
      </div>`;
      const productCard = `<div class="card">
        <div class="card-title">${icon('box', 18)} ${t('product')}</div>
        <div style="display:flex;gap:12px;align-items:center;margin-bottom:6px">${thumb(c, 60, it.grade)}
          <div><b style="font-size:17px">${esc(cropName(c))}</b><div class="qty">${kgFmt(it.qty)}<em>kg · Grade ${it.grade}</em></div></div></div>
        ${kv(t('price'), `${money(it.unitPrice)} ${t('perKg')}`)}
        ${kv(`${icon(o.method === 'delivery' ? 'truck' : 'store', 15)} ${t('receiveBy')}`, t(o.method === 'delivery' ? 'mDelivery' : 'mPickup'))}
        ${kv(`${icon('pin', 15)} ${t('location')}`, esc(L(o.location)))}
        ${kv(`${icon('clock', 15)} ${t('orderTime')}`, `${fmtDate(o.createdAt)} · ${fmtTime(o.createdAt)}`)}
        ${o.notes ? kv(`${icon('note', 15)} ${t('orderNotes')}`, esc(L(o.notes))) : ''}
        ${kv(t('total'), money(it.subtotal), 'total')}
      </div>`;
      let saleCard = '';
      if (o.status === 'completed') {
        const sale = DB.sales.find((s) => s.orderId === o.id);
        saleCard = `<div class="card"><div class="card-title">${icon('bag', 18)} ${t('saleSummary')}</div>
          ${kv(t('crop'), `${cropMark(c)} ${esc(cropName(c))}`)}${kv(t('qtySold'), `${kgFmt(it.qty)} kg`)}${kv(t('buyer'), esc(by.name))}
          ${kv(t('date'), fmtDate(sale ? sale.date : o.completedAt))}${kv(t('revenue'), money(sale ? sale.revenue : it.subtotal), 'total')}</div>`;
      }
      const fulCard = o.fulfilment && ['ready', 'delivering', 'completed'].includes(o.status) ? fulfilmentCard(o) : '';
      const srcCard = o.allocations && o.allocations.length ? allocationCard(o) : '';
      const fbCard = feedbackCard(o);
      let sections = '';
      if (o.status === 'new') sections = productCard + stockCheckCard(it) + buyerCard;
      else if (o.status === 'preparing') sections = checklistCard(o) + productCard + buyerCard + srcCard;
      else if (o.status === 'ready' || o.status === 'delivering') sections = fulCard + productCard + buyerCard + srcCard;
      else if (o.status === 'completed') sections = saleCard + fulCard + productCard + buyerCard + srcCard;
      else sections = productCard + buyerCard;
      sections = fbCard + sections;
      if (ACTIVE_ORDER.includes(o.status)) sections += `<button class="btn danger-outline block sm" data-action="cancelOrder" data-id="${o.id}">${icon('close', 16)} ${t('cancelOrder')}</button>`;

      return `${header({ title: `#${o.id}`, sub: t('orderDetail') })}
        <main class="scroll">${stepper}${banner}<div class="pad stack" style="margin-top:12px">${sections}</div><div class="spacer"></div></main>
        ${orderFooter(o, it)}`;
    },
  },

  /* ---------------- Market prices ---------------- */
  market: {
    nav: 'market',
    render() {
      const mf = appState.ui.marketFilter;
      const list = DB.marketPrices.filter((p) => mf === 'all' || p.marketId === mf);
      return `${header({ title: t('marketPrices'), sub: t('marketSub'), back: false, right: bellButton() }).replace('<header class="hdr">', '<header class="hdr">' + placeholderLeft)}
        <main class="scroll">
          <div class="ref-note">${icon('alert', 16)} <span>${t('refOnly')}</span></div>
          <div class="sec-title" style="padding-top:16px"><h3>${icon('pin', 17)} ${esc(L(MARKETS[0].name))}</h3><span class="aside muted">${fmtDate(DB.marketPrices[0] ? DB.marketPrices[0].updatedAt : new Date().toISOString())}</span></div>
          <div class="list">${list.map(priceCard).join('')}</div>
          <div class="spacer"></div>
        </main>`;
    },
  },

  /* ---------------- Notifications ---------------- */
  notifications: {
    nav: null,
    render() {
      const list = DB.notifications.slice().sort((a, b) => new Date(b.at) - new Date(a.at));
      const right = `<button class="icon-btn green" data-action="readAll" aria-label="${t('markAllRead')}">${icon('checkCircle', 20)}</button>`;
      const tagKey = { new: 'nNew', stock: 'nStock', urgent: 'nUrgent', order: 'nOrder', price: 'nPrice' };
      const icn = { new: 'orders', stock: 'box', urgent: 'warning', order: 'checkCircle', price: 'trendUp' };
      return `${header({ title: t('notifications'), right })}
        <main class="scroll"><div class="list" style="padding-top:12px">
          ${list.length ? list.map((x) => `<button class="nrow ${x.read ? '' : 'unread'}" data-action="openNotif" data-id="${x.id}">
            <span class="nic ${x.type}">${icon(icn[x.type] || 'bell', 20)}</span>
            <span class="grow"><span class="tag ${x.type}">${t(tagKey[x.type] || 'nNew')}</span><p>${notifText(x)}</p><small>${timeAgo(x.at)}</small></span>
            <span class="chev">${icon('chevronRight', 18)}</span></button>`).join('') : emptyState('bell', t('emptyNotif'))}
        </div><div class="spacer"></div></main>`;
    },
  },

  /* ---------------- Profile / settings ---------------- */
  profile: {
    nav: 'profile',
    render() {
      const p = DB.sellerProfile;
      const activeB = activeBatches().length;
      const done = ordersByStatus('completed').length;
      const row = (ic, label, val, action = 'openSheet', extra = 'data-sheet="editProfile"') => `<button class="mrow" data-action="${action}" ${extra}><span class="mi">${icon(ic, 19)}</span><span class="grow"><small>${label}</small><b>${val}</b></span>${icon('chevronRight', 18)}</button>`;
      return `${header({ title: t('profile'), back: false, right: bellButton() }).replace('<header class="hdr">', '<header class="hdr">' + placeholderLeft)}
        <main class="scroll">
          <div class="p-head"><img class="avatar" src="${p.photo}" alt=""><h2>${esc(L(p.coop))}</h2><p>${esc(L(p.name))} · ${t('roleSellerShort')}</p></div>
          <div class="p-stats">
            <div><b>${DB.farmers.length}</b><small>${t('tabFarmers')}</small></div>
            <div><b>${activeB}</b><small>${t('currentStock')}</small></div>
            <div><b>${done}</b><small>${t('osCompleted')}</small></div>
          </div>
          <div class="pad stack" style="margin-top:16px">
            <div class="menu">
              ${row('store', t('coopName'), esc(L(p.coop)))}
              ${row('user', t('manager'), esc(L(p.name)))}
              ${row('phone', t('phone'), esc(p.phone))}
              ${row('pin', t('location'), esc(L(p.location)))}
              ${row('warehouse', t('storagePoint'), esc(L(p.storage)))}
              ${row('truck', t('deliveryCoverage'), esc(L(p.coverage)))}
            </div>
            <div class="menu">
              <div class="mrow"><span class="mi">${icon('globe', 19)}</span><span class="grow"><b>${t('language')}</b></span>${langToggle()}</div>
              <button class="mrow" data-action="toggleNotif"><span class="mi">${icon('bell', 19)}</span><span class="grow"><b>${t('notifSetting')}</b></span><span class="switch ${p.notificationsOn ? 'on' : ''}"></span></button>
              <div class="mrow"><span class="mi">${icon('scale', 19)}</span><span class="grow"><b>${t('defaultUnit')}</b></span><span class="val">kg</span></div>
              <button class="mrow" data-action="help"><span class="mi">${icon('help', 19)}</span><span class="grow"><b>${t('helpFaq')}</b></span>${icon('chevronRight', 18)}</button>
              <button class="mrow danger" data-action="logout"><span class="mi">${icon('logout', 19)}</span><span class="grow"><b>${t('logout')}</b></span></button>
            </div>
          </div>
          <div class="dev"><small>HarvestFlow Seller v1.0 · ${t('devTools')}</small>
            <button data-action="simulateOrder">${t('simulateOrder')}</button>
            <button data-action="resetDemo">${t('resetDemo')}</button>
          </div>
        </main>`;
    },
  },
};

/* =========================================================
   Screen partials
   ========================================================= */
function notFound() { return `${header({ title: '—' })}<main class="scroll">${emptyState('search', t('noResults'))}</main>`; }

function langToggle() {
  return `<div class="lang-toggle"><button class="${LANG === 'km' ? 'on' : ''}" data-action="lang" data-l="km">ខ្មែរ</button><button class="${LANG === 'en' ? 'on' : ''}" data-action="lang" data-l="en">English</button></div>`;
}

function addDaysIso(iso, d) {
  const x = parseDay(iso); x.setDate(x.getDate() + Number(d));
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
}

function newAddForm() { return { cropId: '', qty: '', farmerId: '', harvestDate: isoDay(0), grade: '', shelf: '', shelfCustom: false, location: '', showDate: false, errors: {} }; }
function addFormDone(F) {
  return [F.cropId, Number(F.qty) > 0, F.farmerId, F.harvestDate, F.grade, Number(F.shelf) > 0, F.location].filter(Boolean).length;
}

function urgentCard(b) {
  const c = crop(b.cropId);
  return `<div class="urgent-card">
    <div class="uc-top">${freshBadge(b, false)}${locBadge(b.location)}</div>
    <div class="uc-body" data-action="go" data-to="stockDetail" data-id="${b.id}">
      ${thumb(c, 64, b.grade)}
      <div><h4>${esc(cropName(c))}</h4><div class="big">${kgFmt(avail(b))}<em>kg</em></div><small>${t('gradeLabel')} Grade ${b.grade}</small></div>
    </div>
    <button class="btn primary block sm" data-action="discount" data-id="${b.id}">${icon('tag', 16)} ${b.discountPct ? t('discounted', { n: b.discountPct }) : t('discount')}</button>
  </div>`;
}

function sortFefo(list) { return list.sort((a, b) => expiryDate(a) - expiryDate(b) || avail(b) - avail(a)); }

function stockBatchesTab() {
  const live = sortFefo(DB.stockBatches.filter((b) => !b.archived && avail(b) > 0));
  const gone = DB.stockBatches.filter((b) => b.archived || avail(b) <= 0);
  const show = appState.ui.showArchived;
  return `<div class="sec-title"><h3><span style="color:var(--red-600)">●</span> ${t('inStockTitle')}</h3><span class="aside muted">${t('itemsCount', { n: n(live.length) })}</span></div>
    <div class="list">
      <button class="btn outline block sm" data-action="go" data-to="currentStock">${icon('search', 16)} ${t('searchStock')}</button>
      ${live.length ? live.map(stockCard).join('') : emptyState('assets/ic-inventory.png', t('emptyStock'), '', `<button class="btn primary" data-action="go" data-to="addHarvest">${t('emptyStockAction')}</button>`)}
      ${gone.length ? `<button class="link-btn" style="justify-content:center;padding:6px" data-action="toggleArchived">${show ? t('hideArchived') : t('showArchived', { n: n(gone.length) })}</button>` : ''}
      ${show ? `<div class="list" style="opacity:.7;padding:0">${gone.map(stockCard).join('')}</div>` : ''}
    </div>
    <button class="cta-big" data-action="go" data-to="addHarvest">${icon('plusCircle', 24)} ${t('addStock')} (${t('addStockSub')})</button>`;
}

function stockExpiringTab() {
  const list = urgentBatches();
  return `<div class="sec-title"><h3 class="red"><img src="assets/ic-alert.png" alt="">${t('sellSoonTitle')}</h3><span class="aside">${t('itemsCount', { n: n(list.length) })}</span></div>
    <div class="list">${list.length ? list.map(stockCard).join('') : emptyState('assets/ic-vegetable.png', t('emptyExpiring'))}</div>`;
}

function farmersTab() {
  const rows = DB.farmers.map((f) => {
    const bs = DB.stockBatches.filter((b) => String(b.farmerId) === String(f.id));
    const kg = bs.reduce((s, b) => s + batchQty(b).original, 0);
    return `<div class="frow">${farmerAvatar(f, 48)}
      <div class="grow"><b>${esc(farmerName(f))}</b><small>${icon('pin', 11)} ${esc(L(f.location) || '—')} · ${t('batchesCount', { n: n(bs.length) })}</small></div>
      <div class="kg"><small>${t('suppliedKg')}</small><b>${kgFmt(kg)}</b> <small style="display:inline">kg</small></div>
      ${f.phone ? `<a class="phone-btn" href="tel:${f.phone.replace(/\s/g, '')}" aria-label="${t('call')}">${icon('phone', 17)}</a>` : ''}
    </div>`;
  }).join('');
  return `<div class="sec-title"><h3>${icon('users', 18)} ${t('tabFarmers')}</h3><span class="aside muted">${t('farmersCount', { n: n(DB.farmers.length) })}</span></div>
    <div class="list"><button class="reg-btn" style="margin:0" data-action="openSheet" data-sheet="newFarmer"><span class="ri">${icon('userPlus', 20)}</span><span class="grow"><b>${t('registerFarmer')}</b><small>${t('registerFarmerSub')}</small></span>${icon('chevronRight', 18)}</button>${rows}</div>`;
}

/* ----- History ----- */
function txMeta(x) {
  const b = batch(x.batchId);
  const c = b ? crop(b.cropId) : null;
  const f = b ? farmer(b.farmerId) : null;
  const o = x.orderId ? order(x.orderId) : null;
  let title = '', sub = '', cls = x.qty > 0 ? 'pos' : x.qty < 0 ? 'neg' : 'zero', badge = '';
  if (x.type === 'in') title = t('txIn');
  else if (x.type === 'order') {
    title = t('txOrder', { id: x.orderId });
    if (o && ACTIVE_ORDER.includes(o.status)) { badge = `<span class="badge os-preparing">${t('txReserved')}</span>`; cls = 'res'; }
    else if (o && o.status === 'completed') badge = `<span class="badge os-completed">✓ ${t('txSold')} · ${money(orderTotal(o))}</span>`;
    else if (o) badge = `<span class="badge os-cancelled">${t('txCancelled')}</span>`;
  } else if (x.type === 'release') title = t('txRelease', { id: x.orderId });
  else if (x.type === 'adjust') title = t('txAdjust') + (x.reason ? ` · ${t(x.reason)}` : '');
  else if (x.type === 'remove') title = t('txRemove') + (x.reason ? ` · ${t(x.reason)}` : '');
  const buyerName = o ? buyer(o.buyerId).name + ' · ' : '';
  sub = `${buyerName}${t('farmerLabel')}: ${f ? esc(farmerName(f)) : '—'} · #${x.batchId}`;
  const amt = x.qty === 0 ? t('edit') : `${x.qty > 0 ? '+' : '−'}${kgFmt(Math.abs(x.qty))} kg`;
  return { c, title, sub, cls, amt, badge };
}

function txRow(x, compact = false) {
  const m = txMeta(x);
  const target = x.orderId ? `data-to="orderDetail" data-id="${x.orderId}"` : `data-to="stockDetail" data-id="${x.batchId}"`;
  const clickable = compact && !x.orderId ? '' : `data-action="go" ${target}`;
  return `<div class="tx ${compact ? 'compact' : ''}" ${clickable}>
    <span class="amt ${m.cls}">${m.amt}</span>
    <span class="body"><b>${compact ? '' : (m.c ? cropMark(m.c) + ' ' + esc(cropName(m.c)) + ' · ' : '')}${m.title}</b><small>${m.sub}</small>${m.badge ? `<span style="display:block;margin-top:3px">${m.badge}</span>` : ''}</span>
    <span class="time">${compact ? fmtDate(x.at).replace(/ \d{4}$/, '') + '<br>' : ''}${fmtTime(x.at)}</span>
  </div>`;
}

function historyTab() {
  const hf = appState.ui.historyFilter;
  const groups = { all: null, in: ['in', 'release'], out: ['order'], adjust: ['adjust', 'remove'] };
  const list = DB.stockTransactions.filter((x) => !groups[hf] || groups[hf].includes(x.type)).sort((a, b) => new Date(b.at) - new Date(a.at));
  const chips = [['all', 'hAll'], ['in', 'hIn'], ['out', 'hOut'], ['adjust', 'hAdjust']];
  let html = `<div class="chips" style="margin-top:12px">${chips.map(([id, k]) => `<button class="chip ${hf === id ? 'on' : ''}" data-action="historyFilter" data-f="${id}">${t(k)}</button>`).join('')}</div>`;
  if (!list.length) return html + emptyState('history', t('emptyHistory'));
  let lastDay = '';
  html += '<div class="tl">';
  list.forEach((x) => {
    const day = new Date(x.at); day.setHours(0, 0, 0, 0);
    const diff = dayDiff(todayStart(), day);
    const label = diff === 0 ? t('today') : diff === 1 ? t('yesterday') : fmtDate(x.at);
    if (label !== lastDay) { if (lastDay) html += '</div>'; html += `<div class="tl-day">${label}</div><div class="pad">`; lastDay = label; }
    html += txRow(x);
  });
  return html + '</div></div>';
}

/* ----- Current stock filtering / sorting ----- */
function filteredStock() {
  const u = appState.ui;
  const q = u.search.trim().toLowerCase();
  let list = DB.stockBatches.filter((b) => !b.archived && avail(b) > 0);
  if (q) {
    list = list.filter((b) => {
      const c = crop(b.cropId), f = farmer(b.farmerId);
      const hay = [c.name.km, c.name.en, f.name.km, f.name.en, t('loc' + b.location), I18N.km['loc' + b.location], I18N.en['loc' + b.location], b.id].join(' ').toLowerCase();
      return hay.includes(q);
    });
  }
  if (['fresh', 'soon', 'expired'].includes(u.filter)) list = list.filter((b) => batchStatus(b) === u.filter);
  const sorters = {
    shelf: (a, b) => expiryDate(a) - expiryDate(b),
    most: (a, b) => avail(b) - avail(a),
    least: (a, b) => avail(a) - avail(b),
    newest: (a, b) => parseDay(b.harvestDate) - parseDay(a.harvestDate) || new Date(b.createdAt) - new Date(a.createdAt),
  };
  return list.sort(sorters[u.sort]);
}

function updateStockResults() {
  const el = document.getElementById('stock-results');
  if (!el) return;
  const list = filteredStock();
  const kg = list.reduce((s, b) => s + avail(b), 0);
  el.innerHTML = list.length ? list.map(stockCard).join('') : emptyState('search', t('noResults'), t('noResultsSub'));
  document.getElementById('stock-count').textContent = t('resultsCount', { n: n(list.length), kg: kgFmt(kg) });
  const clr = document.querySelector('.search .clear');
  if (clr) clr.style.display = appState.ui.search ? '' : 'none';
}

/* ----- Order detail partials ----- */
function stockCheckCard(it) {
  const plan = planAllocation(it.cropId, it.qty);
  const ok = plan.ok;
  const remain = Math.max(0, plan.available - it.qty);
  return `<div class="card"><div class="card-title">${icon('scale', 18)} ${t('stockCheck')}</div>
    <div class="stock-check ${ok ? 'ok' : 'bad'}">
      ${ok ? `<div class="sc-row">
          <div><small>${t('curStock')}</small><b>${kgFmt(plan.available)}</b><small>kg</small></div><span class="op">−</span>
          <div><small>${t('orderQty')}</small><b>${kgFmt(it.qty)}</b><small>kg</small></div><span class="op">=</span>
          <div class="res"><small>${t('afterOrder')}</small><b>${kgFmt(remain)}</b><small>kg</small></div></div>
        <div class="sc-note">${icon('refresh', 16)} ${t('autoDeduct')}</div>
        <div class="alloc"><small class="meta">${t('takeFrom')}:</small>${plan.allocations.map((a, i) => allocRow(a, i === 0 && sellableBatches(it.cropId).length > 1)).join('')}</div>`
      : `<div class="sc-note" style="margin:0 0 10px;font-size:15px">${icon('warning', 18)} ${t('notEnough')}</div>
        <div class="sc-row">
          <div><small>${t('available')}</small><b>${kgFmt(plan.available)}</b><small>kg</small></div><span class="op"></span>
          <div><small>${t('requested')}</small><b>${kgFmt(it.qty)}</b><small>kg</small></div><span class="op"></span>
          <div class="res"><small>${t('shortage')}</small><b>${kgFmt(plan.shortage)}</b><small>kg</small></div></div>`}
    </div></div>`;
}

function allocRow(a, first) {
  const b = batch(a.batchId), f = farmer(b.farmerId);
  return `<div class="alloc-row" data-action="go" data-to="stockDetail" data-id="${b.id}" style="cursor:pointer">
    ${farmerAvatar(f, 30)}<span class="grow">#${b.id} · ${esc(farmerName(f))} ${first ? `<span class="badge first">${icon('bolt', 10)} ${t('sellFirst')}</span>` : ''}<br><small class="meta">${freshBadge(b, false)}</small></span><b>${kgFmt(a.qty)} kg</b></div>`;
}

function checklistCard(o) {
  const steps = [['ckHarvest', 'leaf'], ['ckQuality', 'search'], ['ckWeigh', 'scale'], ['ckPack', 'box'], ['ckReady', 'truck']];
  const done = o.checklist.filter(Boolean).length;
  return `<div class="card"><div class="card-title">${icon('orders', 18)} ${t('prepChecklist')}</div>
    <div class="ck-progress"><span>${t('tapToCheck')}</span></div>
    <div class="ck-progress"><div class="bar"><i style="width:${done / 5 * 100}%"></i></div><b class="num">${done}/5</b></div>
    <div class="checklist">${steps.map(([k, e], i) => `<button class="ck ${o.checklist[i] ? 'on' : ''}" data-action="check" data-id="${o.id}" data-i="${i}"><span class="box">${icon('check', 18)}</span><span class="emo">${icon(e, 20)}</span><span class="lbl">${t(k)}</span></button>`).join('')}</div>
  </div>`;
}

function fulfilmentCard(o) {
  const f = o.fulfilment;
  const dateLbl = (d) => (d === isoDay(0) ? t('today') : d === isoDay(1) ? t('tomorrow') : fmtDate(d));
  let rows = '';
  if (f.method === 'delivery') {
    rows = kv(`${icon('pin', 15)} ${t('destination')}`, esc(f.destination)) + kv(`${icon('phone', 15)} ${t('phone')}`, esc(f.phone)) + kv(`${icon('calendar', 15)} ${t('deliveryDate')}`, dateLbl(f.date)) + (f.notes ? kv(`${icon('note', 15)} ${t('deliveryNotes')}`, esc(f.notes)) : '');
  } else {
    rows = kv(`${icon('pin', 15)} ${t('pickupLocation')}`, f.pickupLocation === 'OFFICE' ? t('coopOffice') : locName(f.pickupLocation)) + kv(`${icon('calendar', 15)} ${t('date')}`, dateLbl(f.pickupDate)) + kv(`${icon('clock', 15)} ${t('pickupTime')}`, t(f.pickupTime));
  }
  return `<div class="card"><div class="card-title">${icon(f.method === 'delivery' ? 'truck' : 'store', 18)}<span class="grow">${t('fulfilment')}: ${t(f.method === 'delivery' ? 'mDelivery' : 'mPickup')}</span>
    ${o.status === 'ready' ? `<button class="link-btn" data-action="openSheet" data-sheet="fulfilment" data-id="${o.id}">${icon('edit', 14)} ${t('change')}</button>` : ''}</div>${rows}</div>`;
}

function allocationCard(o) {
  return `<div class="card"><div class="card-title">${icon('leaf', 18)} ${t('sourceBatch')}</div>
    <div class="alloc" style="margin:0">${o.allocations.map((a) => allocRow(a, false)).join('')}</div></div>`;
}

function orderFooter(o) {
  if (o.status === 'new') {
    const it = orderItem(o.id);
    const ok = planAllocation(it.cropId, it.qty).ok;
    return `<div class="footer-bar">
      ${ok ? `<div class="note">${icon('refresh', 14)} ${t('autoDeduct')}</div>` : ''}
      <div class="btn-row">
        <button class="btn danger-outline fit" data-action="openSheet" data-sheet="reject" data-id="${o.id}">${t('reject')}</button>
        <button class="btn primary" data-action="acceptOrder" data-id="${o.id}" ${ok ? '' : 'disabled'}>${icon('check', 18)} ${t('accept')}</button>
      </div></div>`;
  }
  if (o.status === 'preparing') {
    const all = o.checklist.every(Boolean);
    return `<div class="footer-bar"><button class="btn primary block lg" data-action="openSheet" data-sheet="fulfilment" data-id="${o.id}" ${all ? '' : 'disabled'}>${icon('truck', 20)} ${t('chooseFulfil')}</button></div>`;
  }
  if (o.status === 'ready') {
    if (o.fulfilment && o.fulfilment.method === 'delivery') return `<div class="footer-bar"><button class="btn primary block lg" data-action="startDelivery" data-id="${o.id}">${icon('truck', 20)} ${t('startDelivery')}</button></div>`;
    return `<div class="footer-bar"><button class="btn primary block lg" data-action="completeOrder" data-id="${o.id}">${icon('checkCircle', 20)} ${t('markComplete')}</button></div>`;
  }
  if (o.status === 'delivering') return `<div class="footer-bar"><button class="btn primary block lg" data-action="completeOrder" data-id="${o.id}">${icon('checkCircle', 20)} ${t('markComplete')}</button></div>`;
  return '';
}

/* ----- Market ----- */
function priceChange(p) {
  const d = Math.round((p.price - p.prevPrice) * 100) / 100;
  if (d > 0) return `<span class="chg up">↑ +${money(d)}</span>`;
  if (d < 0) return `<span class="chg down">↓ −${money(-d)}</span>`;
  return `<span class="chg flat">— ${t('noChange')}</span>`;
}
function priceCard(p) {
  const c = crop(p.cropId), m = MARKETS.find((x) => x.id === p.marketId);
  return `<div class="pcard" data-action="openSheet" data-sheet="priceDetail" data-crop="${p.cropId}" data-market="${p.marketId}">
    ${thumb(c, 56)}
    <div class="grow"><h4>${esc(cropName(c))}</h4>
      <div class="sub">${t('prevPrice')} ${money(p.prevPrice)} · ${fmtDate(p.updatedAt).replace(/ \d{4}$/, '')}</div></div>
    <div class="p"><b>${money(p.price)}<em> /kg</em></b>${priceChange(p)}</div>
  </div>`;
}

/* ----- Notifications ----- */
/** Rating, feedback and problem report sent from the Buyer app. */
function feedbackCard(o) {
  const f = o.buyerFeedback;
  if (!f) return '';
  const stars = f.stars ? `<div class="fb-stars" aria-label="${f.stars}/5">${[1, 2, 3, 4, 5].map((k) => `<span class="${k <= f.stars ? 'on' : ''}">★</span>`).join('')}</div>` : '';
  const rep = f.report ? `<div class="fb-report">${icon('warning', 16)}<div><b>${t('buyerReport')} · ${esc(L(f.report.reason))}</b>${f.report.note ? `<p>${esc(f.report.note)}</p>` : ''}</div></div>` : '';
  return `<div class="card fb-card">
    <div class="card-title">${icon('users', 18)} ${t('buyerFeedback')}</div>
    ${stars}${f.comment ? `<p class="fb-comment">“${esc(f.comment)}”</p>` : ''}${rep}
    <div class="meta">${fmtDate(f.at)} · ${fmtTime(f.at)}</div>
  </div>`;
}

function notifText(x) {
  const v = Object.assign({}, x.msg.v);
  if (v.crop && crop(v.crop)) v.crop = cropName(crop(v.crop));
  if (v.farmer && farmer(v.farmer)) v.farmer = farmerName(farmer(v.farmer));
  if (v.d !== undefined) v.d = n(v.d);
  return esc(t(x.msg.k, v));
}
