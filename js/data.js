/* =========================================================
   DATA — demo seed data (simulates the backend database)

   Tables (mirrors the planned backend schema):
   farmers[], crops[], stockBatches[], stockTransactions[] (stock ledger),
   buyers[], orders[], orderItems[], sales[], marketPrices[],
   notifications[], sellerProfile{}

   Dates are generated relative to "today" so the demo always looks
   fresh the first time it is opened (and after "Reset demo data").
   ========================================================= */

const LOCATIONS = ['A', 'B', 'COLD'];
const GRADES = ['A', 'B', 'C'];
const SHELF_PRESETS = [1, 2, 3, 5, 7];
const LOW_STOCK_KG = 20;     // low stock alert threshold
const SOON_DAYS = 2;         // "sell soon" when this many days or fewer remain

// Reference prices come from the local Battambang market only.
const MARKETS = [
  { id: 'btb', name: { km: 'ផ្សារណាត់ បាត់ដំបង', en: 'Nat Market, Battambang' } },
];

// Vegetables only — the cooperative does not sell fruit.
const CROP_ICONS = ['assets/crops/tomato.png', 'assets/crops/cucumber.png', 'assets/crops/cabbage.png', 'assets/crops/carrot.png', 'assets/crops/chili.png', 'assets/ic-vegetable.png'];
const DEFAULT_CROP_ICON = 'assets/ic-vegetable.png';

function isoDay(offsetDays) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + offsetDays);
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}
function isoAt(offsetDays, hour, minute = 0) {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString();
}
function minutesAgo(min) { return new Date(Date.now() - min * 60000).toISOString(); }
/** Today at hh:mm — or a little while ago if that time has not come yet (avoids "future" records). */
function todayAt(hour, minute = 0) {
  const iso = isoAt(0, hour, minute);
  return new Date(iso).getTime() < Date.now() - 10 * 60000 ? iso : minutesAgo(40);
}

function buildSeedData() {
  const farmers = [
    { id: 1, name: { km: 'សុខា', en: 'Sokha' }, phone: '012 889 234', location: { km: 'ស្រុកបាណន់, បាត់ដំបង', en: 'Banan, Battambang' } },
    { id: 2, name: { km: 'វណ្ណា', en: 'Vanna' }, phone: '097 554 112', location: { km: 'ស្រុកសង្កែ, បាត់ដំបង', en: 'Sangkae, Battambang' } },
    { id: 3, name: { km: 'ដារ៉ា', en: 'Dara' }, phone: '088 345 678', location: { km: 'ស្រុកថ្មគោល, បាត់ដំបង', en: 'Thma Koul, Battambang' } },
    { id: 4, name: { km: 'សុភា', en: 'Sophea' }, phone: '010 445 566', location: { km: 'ស្រុកមោងឫស្សី, បាត់ដំបង', en: 'Moung Ruessei, Battambang' } },
  ];

  const crops = [
    { id: 'tomato', name: { km: 'ប៉េងប៉ោះ', en: 'Tomato' }, icon: 'assets/crops/tomato.png', category: 'veg', tint: '#fdecea' },
    { id: 'cucumber', name: { km: 'ត្រសក់', en: 'Cucumber' }, icon: 'assets/crops/cucumber.png', category: 'veg', tint: '#e9f5e4' },
    { id: 'cabbage', name: { km: 'ស្ពៃ', en: 'Chinese cabbage' }, icon: 'assets/crops/cabbage.png', category: 'veg', tint: '#eef6e3' },
    { id: 'carrot', name: { km: 'ការ៉ុត', en: 'Carrot' }, icon: 'assets/crops/carrot.png', category: 'veg', tint: '#fff1e2' },
    { id: 'chili', name: { km: 'ម្ទេស', en: 'Chili' }, icon: 'assets/crops/chili.png', category: 'veg', tint: '#fdeceb' },
  ];

  const buyers = [
    // b0 = the restaurant that uses the HarvestFlow Buyer app (linked demo)
    { id: 'b0', name: 'The Lab by Sokim Heng', type: { km: 'ភោជនីយដ្ឋាន', en: 'Restaurant' }, phone: '012 345 678', location: { km: 'ភ្នំពេញ, ខណ្ឌដូនពេញ', en: 'Phnom Penh, Daun Penh' }, linked: true },
    { id: 'b1', name: 'Green Garden Restaurant', type: { km: 'ភោជនីយដ្ឋាន', en: 'Restaurant' }, phone: '012 345 678', location: { km: 'ភ្នំពេញ, ខណ្ឌទួលគោក', en: 'Phnom Penh, Toul Kork' } },
    { id: 'b2', name: 'Sovann Mini Mart', type: { km: 'ហាងលក់ទំនិញ', en: 'Mini mart' }, phone: '092 118 220', location: { km: 'ក្រុងបាត់ដំបង', en: 'Battambang city' } },
    { id: 'b3', name: 'Riverside Hotel', type: { km: 'សណ្ឋាគារ', en: 'Hotel' }, phone: '017 660 331', location: { km: 'បាត់ដំបង, សង្កាត់ស្វាយប៉ោ', en: 'Battambang, Svay Por' } },
    { id: 'b4', name: 'Bopha Kitchen', type: { km: 'ភោជនីយដ្ឋាន', en: 'Restaurant' }, phone: '015 902 447', location: { km: 'ភ្នំពេញ, ខណ្ឌចំការមន', en: 'Phnom Penh, Chamkarmon' } },
    { id: 'b5', name: 'Kampot Fresh Shop', type: { km: 'ហាងបន្លែ', en: 'Produce shop' }, phone: '096 771 205', location: { km: 'ក្រុងកំពត', en: 'Kampot town' } },
  ];

  // Harvest batches. shelfLifeDays is counted from the harvest date.
  const stockBatches = [
    { id: 'BTB-042', cropId: 'tomato', farmerId: 1, harvestDate: isoDay(-1), shelfLifeDays: 3, grade: 'A', location: 'A', notes: '', discountPct: 0, archived: false, createdAt: isoAt(-1, 8) },
    { id: 'BTB-019', cropId: 'cucumber', farmerId: 2, harvestDate: isoDay(-1), shelfLifeDays: 5, grade: 'A', location: 'A', notes: '', discountPct: 0, archived: false, createdAt: isoAt(-1, 9) },
    { id: 'BTB-088', cropId: 'cabbage', farmerId: 3, harvestDate: isoDay(-1), shelfLifeDays: 4, grade: 'B', location: 'B', notes: '', discountPct: 0, archived: false, createdAt: isoAt(-1, 10) },
    { id: 'BTB-012', cropId: 'carrot', farmerId: 4, harvestDate: isoDay(-2), shelfLifeDays: 3, grade: 'A', location: 'A', notes: '', discountPct: 0, archived: false, createdAt: isoAt(-2, 8) },
    { id: 'BTB-051', cropId: 'chili', farmerId: 1, harvestDate: isoDay(-1), shelfLifeDays: 7, grade: 'A', location: 'COLD', notes: '', discountPct: 0, archived: false, createdAt: isoAt(-1, 16) },
    { id: 'BTB-007', cropId: 'cucumber', farmerId: 3, harvestDate: isoDay(-6), shelfLifeDays: 5, grade: 'C', location: 'B', notes: '', discountPct: 0, archived: false, createdAt: isoAt(-6, 8) },
  ];

  // Stock ledger. Available quantity is ALWAYS calculated from these records.
  // type: in | order | release | adjust | remove
  const stockTransactions = [
    { id: 1, batchId: 'BTB-042', type: 'in', qty: 150, at: isoAt(-1, 8) },
    { id: 2, batchId: 'BTB-019', type: 'in', qty: 180, at: isoAt(-1, 9) },
    { id: 3, batchId: 'BTB-088', type: 'in', qty: 90, at: isoAt(-1, 10) },
    { id: 4, batchId: 'BTB-012', type: 'in', qty: 135, at: isoAt(-2, 8) },
    { id: 5, batchId: 'BTB-051', type: 'in', qty: 50, at: isoAt(-1, 16) },
    { id: 7, batchId: 'BTB-007', type: 'in', qty: 20, at: isoAt(-6, 8) },
    { id: 8, batchId: 'BTB-007', type: 'remove', qty: -5, reason: 'rDamaged', at: isoAt(-4, 15) },
    { id: 9, batchId: 'BTB-042', type: 'order', qty: -30, orderId: 'HF-1020', at: minutesAgo(300) },
    { id: 10, batchId: 'BTB-012', type: 'order', qty: -60, orderId: 'HF-1023', at: minutesAgo(250) },
    { id: 11, batchId: 'BTB-051', type: 'order', qty: -10, orderId: 'HF-1021', at: minutesAgo(200) },
  ];

  const orders = [
    { id: 'HF-1024', buyerId: 'b1', status: 'new', method: 'delivery', location: buyers[0].location, notes: { km: 'សូមដឹកមុនម៉ោង 10 ព្រឹក', en: 'Please deliver before 10 AM' }, createdAt: minutesAgo(12), allocations: [], checklist: [false, false, false, false, false] },
    { id: 'HF-1025', buyerId: 'b2', status: 'new', method: 'pickup', location: buyers[1].location, notes: '', createdAt: minutesAgo(45), allocations: [], checklist: [false, false, false, false, false] },
    { id: 'HF-1026', buyerId: 'b3', status: 'new', method: 'delivery', location: buyers[2].location, notes: { km: 'សម្រាប់ពិធីមង្គលការ', en: 'For a wedding event' }, createdAt: minutesAgo(130), allocations: [], checklist: [false, false, false, false, false] },
    { id: 'HF-1023', buyerId: 'b4', status: 'preparing', method: 'delivery', location: buyers[3].location, notes: '', createdAt: minutesAgo(400), acceptedAt: minutesAgo(250), allocations: [{ batchId: 'BTB-012', qty: 60 }], checklist: [true, true, false, false, false] },
    { id: 'HF-1021', buyerId: 'b5', status: 'ready', method: 'pickup', location: buyers[4].location, notes: '', createdAt: minutesAgo(500), acceptedAt: minutesAgo(200), allocations: [{ batchId: 'BTB-051', qty: 10 }], checklist: [true, true, true, true, true], fulfilment: { method: 'pickup', pickupLocation: 'A', pickupTime: 'afternoon', pickupDate: isoDay(0) } },
    { id: 'HF-1020', buyerId: 'b1', status: 'completed', method: 'delivery', location: buyers[0].location, notes: '', createdAt: minutesAgo(420), acceptedAt: minutesAgo(300), completedAt: minutesAgo(90), allocations: [{ batchId: 'BTB-042', qty: 30 }], checklist: [true, true, true, true, true], fulfilment: { method: 'delivery', destination: buyers[0].location.km, phone: buyers[0].phone, date: isoDay(0), notes: '' } },
    { id: 'HF-1019', buyerId: 'b2', status: 'rejected', method: 'pickup', location: buyers[1].location, notes: '', createdAt: minutesAgo(1600), rejectedAt: minutesAgo(1500), rejectReason: 'rjStock', allocations: [], checklist: [false, false, false, false, false] },
  ];

  const orderItems = [
    { id: 1, orderId: 'HF-1024', cropId: 'tomato', qty: 30, grade: 'A', unitPrice: 2.40 },
    { id: 2, orderId: 'HF-1025', cropId: 'cucumber', qty: 50, grade: 'A', unitPrice: 1.10 },
    { id: 3, orderId: 'HF-1026', cropId: 'cabbage', qty: 120, grade: 'B', unitPrice: 1.20 },
    { id: 4, orderId: 'HF-1023', cropId: 'carrot', qty: 60, grade: 'A', unitPrice: 1.05 },
    { id: 5, orderId: 'HF-1021', cropId: 'chili', qty: 10, grade: 'A', unitPrice: 3.00 },
    { id: 6, orderId: 'HF-1020', cropId: 'tomato', qty: 30, grade: 'A', unitPrice: 2.30 },
    { id: 7, orderId: 'HF-1019', cropId: 'cabbage', qty: 150, grade: 'A', unitPrice: 1.20 },
  ];
  orderItems.forEach((i) => { i.subtotal = Math.round(i.qty * i.unitPrice * 100) / 100; });

  const sales = [
    { orderId: 'HF-1020', cropId: 'tomato', buyerId: 'b1', qty: 30, revenue: 69, date: minutesAgo(90), allocations: [{ batchId: 'BTB-042', qty: 30, farmerId: 1 }] },
  ];

  // Reference market prices (USD/kg). history = last 5 days, oldest → newest.
  const basePrices = {
    tomato: [2.20, 2.25, 2.30, 2.30, 2.40],
    cucumber: [1.00, 1.00, 1.05, 1.05, 1.10],
    cabbage: [1.25, 1.25, 1.20, 1.20, 1.20],
    carrot: [0.95, 1.00, 1.00, 1.00, 1.05],
    chili: [3.20, 3.10, 3.00, 3.00, 3.00],
  };
  const marketFactor = { btb: 1 };
  const marketPrices = [];
  MARKETS.forEach((m) => {
    Object.keys(basePrices).forEach((cropId) => {
      const hist = basePrices[cropId].map((p) => Math.round(p * marketFactor[m.id] * 100) / 100);
      marketPrices.push({
        cropId, marketId: m.id,
        price: hist[4], prevPrice: hist[3], history: hist,
        updatedAt: todayAt(7),
        source: { km: 'ការស្ទង់តម្លៃរបស់សហគមន៍ (ទិន្នន័យសាកល្បង)', en: 'Cooperative price survey (demo data)' },
      });
    });
  });

  const notifications = [
    { id: 1, type: 'new', key: 'order-HF-1024', msg: { k: 'nmNewOrder', v: { buyer: 'Green Garden Restaurant' } }, link: { screen: 'orderDetail', id: 'HF-1024' }, read: false, at: minutesAgo(12) },
    { id: 2, type: 'new', key: 'order-HF-1025', msg: { k: 'nmNewOrder', v: { buyer: 'Sovann Mini Mart' } }, link: { screen: 'orderDetail', id: 'HF-1025' }, read: false, at: minutesAgo(45) },
    { id: 3, type: 'price', key: 'price-tomato', msg: { k: 'nmPrice', v: { crop: 'tomato', p: '2.40' } }, link: { screen: 'market' }, read: true, at: todayAt(7) },
    { id: 4, type: 'order', key: 'done-HF-1020', msg: { k: 'nmCompleted', v: { id: 'HF-1020' } }, link: { screen: 'orderDetail', id: 'HF-1020' }, read: true, at: minutesAgo(90) },
  ];

  const sellerProfile = {
    name: { km: 'លឹម សុខា', en: 'Lim Sokha' },
    coop: { km: 'សហគមន៍កសិកម្ម បាណន់', en: 'Banan Agricultural Cooperative' },
    phone: '012 889 234',
    location: { km: 'ស្រុកបាណន់ ខេត្តបាត់ដំបង', en: 'Banan, Battambang' },
    storage: { km: 'ឃ្លាំងសហគមន៍ ភូមិកន្ទឺ', en: 'Cooperative warehouse, Kanteu village' },
    coverage: { km: 'បាត់ដំបង, ភ្នំពេញ, សៀមរាប, កំពត', en: 'Battambang, Phnom Penh, Siem Reap, Kampot' },
    photo: 'assets/avatar.png',
    notificationsOn: true,
    unit: 'kg',
  };

  return {
    version: 1,
    seededOn: isoDay(0),
    farmers, crops, buyers, stockBatches, stockTransactions,
    orders, orderItems, sales, marketPrices, notifications, sellerProfile,
    nextIds: { tx: 100, notif: 100, orderNum: 1027, batchNum: 100, orderItem: 100, farmer: 10 },
  };
}
