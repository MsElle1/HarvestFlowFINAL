/* =========================================================
   CONFIG — prototype business rules (ASSUMPTIONS TO CONFIRM)
   Change these values in one place.
   ========================================================= */
/** Local calendar day as YYYY-MM-DD (offset in days from today). */
function localDay(offset = 0) {
  const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const CONFIG = {
  today: localDay(0),             // real date — demo data is built relative to today
  deliveryDate: localDay(1),      // next delivery day = tomorrow
  deliveryFeePerShop: 3.0,        // USD, charged once per shop in a checkout
  qtyStep: 1,                     // kg
  timeWindows: [
    { id: 'w1', label: { km: '6:00 – 8:00 ព្រឹក', en: '6:00 – 8:00 AM' }, eta: { km: '6:30 ព្រឹក', en: '6:30 AM' } },
    { id: 'w2', label: { km: '8:00 – 10:00 ព្រឹក', en: '8:00 – 10:00 AM' }, eta: { km: '8:30 ព្រឹក', en: '8:30 AM' } },
    { id: 'w3', label: { km: '2:00 – 4:00 រសៀល', en: '2:00 – 4:00 PM' }, eta: { km: '2:30 រសៀល', en: '2:30 PM' } },
  ],
  defaultWindow: 'w1',
  payment: {
    id: 'khqr', name: 'Bakong KHQR', chargeAt: 'placeOrder',   // one payment for all shops at Place Order
    // Real merchant KHQR (ABA). The app turns it into a dynamic KHQR with the order amount.
    khqr: {
      payload: '00020101021129450016abaakhppxxx@abaa01090062984070208ABA Bank40600006abaP2P01123AACCA61612E020900629840703090062984030404Dual5204000053031165802KH5918SOVANMONY REAKSMEY6010Phnom Penh630473C9',
      staticImage: 'assets/khqr-static.jpg',   // fallback: the original QR (buyer types the amount)
      validMinutes: 15,
    },
  },
  paymentProcessingMs: 2000,
  splashMs: 1800,                 // splash must stay under 2 seconds
  refundOnDecline: 'pending',     // declined/cancelled shop part shows "Refund pending"
  buyNowLeavesBasket: true,       // Buy Now checks out only that item
  dealUseByRule: true,            // a deal only shows if use-by >= delivery date
  login: {
    method: 'phone+code',
    buyer: { phone: '012345678', code: '1234' },
    sellerPhone: '098765432',      // seller account → turned away
    unverifiedPhone: '011000000',  // unverified restaurant → browse only
  },
  lowStockKg: 20,
};

/* =========================================================
   MOCK DATA (the Buyer app only SHOWS what the Seller app publishes)
   ========================================================= */
const CATEGORIES = [
  { id: 'leafy', name: { km: 'បន្លែស្លឹក', en: 'Leafy' }, icon: 'assets/categories/leafy.png' },
  { id: 'root', name: { km: 'បន្លែឫស', en: 'Root' }, icon: 'assets/categories/root.png' },
  { id: 'herbs', name: { km: 'រុក្ខជាតិក្រអូប', en: 'Herbs' }, icon: 'assets/categories/herbs.png' },
  { id: 'flower', name: { km: 'បន្លែផ្កា', en: 'Flower veg' }, icon: 'assets/categories/flower.png' },
  { id: 'mushroom', name: { km: 'ផ្សិត', en: 'Mushroom' }, icon: 'assets/categories/mushroom.png' },
  { id: 'otherveg', name: { km: 'បន្លែផ្សេងៗ', en: 'Other veg' }, emoji: '🥒' }, // vegetables only — no fruit
];

function buildSeed() {
  const D = localDay; // D(-1) = yesterday, D(1) = tomorrow
  const shops = [
    { id: 's1', name: { km: 'សហករណ៍កសិកម្មបាត់ដំបង', en: 'Battambang Ag Co-op' }, rating: 4.8, reviews: 38, cert: 'Organic', location: { km: 'ស្រុកសង្កែ, បាត់ដំបង', en: 'Sangkae, Battambang' }, phone: '012 700 111', since: 2019, initials: 'BA', color: '#0d631b' },
    { id: 's2', name: { km: 'បណ្តាញកសិករមោងឫស្សី', en: 'Moung Ruessei Farmer Network' }, rating: 4.6, reviews: 22, cert: 'Organic', location: { km: 'ស្រុកមោងឫស្សី, បាត់ដំបង', en: 'Moung Ruessei, Battambang' }, phone: '012 700 222', since: 2020, initials: 'MR', color: '#8a5a1b' },
    { id: 's3', name: { km: 'សហករណ៍តំបន់ខ្ពង់រាបសំឡូត', en: 'Samlot Highland Co-op' }, rating: 4.7, reviews: 12, cert: 'GAP', location: { km: 'ស្រុកសំឡូត, បាត់ដំបង', en: 'Samlot, Battambang' }, phone: '012 700 333', since: 2021, initials: 'SH', color: '#2a4f86' },
  ];

  // product = the vegetable; listing = one shop selling it
  const products = {
    morningglory: { name: { km: 'ត្រកួន', en: 'Morning Glory (Trakuon)' }, emoji: '🥬', img: 'assets/crops/morningglory.png', tint: ['#e6f4df', '#cfe8c4'], temp: '4–8°C' },
    tomato: { name: { km: 'ប៉េងប៉ោះ', en: 'Tomato' }, emoji: '🍅', img: 'assets/crops/tomato.png', tint: ['#fde8e4', '#f9d2c9'], temp: '10–13°C' },
    cucumber: { name: { km: 'ត្រសក់', en: 'Cucumber' }, emoji: '🥒', img: 'assets/crops/cucumber.png', tint: ['#e5f3e1', '#cbe7c2'], temp: '10–12°C' },
    lemongrass: { name: { km: 'ស្លឹកគ្រៃ', en: 'Lemongrass' }, emoji: '🌿', img: 'assets/crops/lemongrass.png', tint: ['#eef5dc', '#dcebb9'], temp: '8–12°C' },
    bokchoy: { name: { km: 'ស្ពៃតឿ', en: 'Baby White Stem (Bok Choy)' }, emoji: '🥬', img: 'assets/crops/cabbage.png', tint: ['#e8f5e6', '#d0eacb'], temp: '2–4°C' },
    sweetcorn: { name: { km: 'ពោតផ្អែម', en: 'Sweet Corn' }, emoji: '🌽', tint: ['#fdf4d8', '#f8e5a8'], temp: '2–5°C' },
    kailan: { name: { km: 'ខាត់ណា', en: 'Kai Lan (Chinese broccoli)' }, emoji: '🥦', img: 'assets/crops/kailan.png', tint: ['#e3f1e3', '#c5e2c6'], temp: '2–4°C' },
    oyster: { name: { km: 'ផ្សិតអយស្ទ័រ', en: 'Oyster Mushrooms' }, emoji: '🍄', img: 'assets/crops/oyster.png', tint: ['#f3ece4', '#e6d8c7'], temp: '2–4°C' },
    carrot: { name: { km: 'ការ៉ុត', en: 'Carrot' }, emoji: '🥕', img: 'assets/crops/carrot.png', tint: ['#fff0e0', '#fddcb8'], temp: '0–4°C' },
    // sold by the linked cooperative (Seller app)
    cabbage: { name: { km: 'ស្ពៃ', en: 'Chinese Cabbage' }, emoji: '🥬', img: 'assets/crops/cabbage.png', tint: ['#eef6e3', '#d9ecc8'], temp: '0–4°C' },
    chili: { name: { km: 'ម្ទេស', en: 'Chili' }, emoji: '🌶️', img: 'assets/crops/chili.png', tint: ['#fdeceb', '#f8d3cf'], temp: '7–10°C' },
  };

  const L = (id, product, category, shopId, grade, price, stock, min, harvested, freshDays) =>
    ({ id, product, category, shopId, grade, price, stock, min, harvested, freshDays, available: true });
  const listings = [
    L('L1', 'morningglory', 'leafy', 's1', 'A', 0.80, 45, 2, D(-1), 5),
    L('L2', 'morningglory', 'leafy', 's2', 'A', 0.85, 60, 2, D(-1), 5),
    L('L3', 'tomato', 'otherveg', 's3', 'A', 2.50, 120, 2, D(-2), 6),
    L('L4', 'tomato', 'otherveg', 's1', 'A-', 2.30, 18, 2, D(-2), 5),
    L('L5', 'tomato', 'otherveg', 's2', 'B', 1.90, 40, 3, D(-3), 4),
    L('L6', 'cucumber', 'otherveg', 's2', 'A', 1.10, 70, 2, D(-1), 6),
    L('L7', 'lemongrass', 'herbs', 's1', 'A', 1.60, 30, 1, D(-1), 10),
    L('L8', 'bokchoy', 'leafy', 's1', 'A', 1.20, 50, 2, D(-1), 5),
    L('L9', 'sweetcorn', 'otherveg', 's3', 'A', 1.40, 80, 3, D(-1), 4),
    L('L10', 'kailan', 'flower', 's3', 'A', 1.75, 25, 2, D(-1), 5),
    L('L11', 'oyster', 'mushroom', 's2', 'A', 2.90, 0, 1, D(-4), 3),
    L('L12', 'carrot', 'root', 's3', 'A', 1.05, 90, 3, D(-3), 14),
  ];

  const deals = [
    { id: 'D1', listingId: 'L8', type: 'useSoon', was: 1.20, now: 0.96, off: 20, kgLeft: 8, grade: 'B', useBy: D(3), note: { km: 'ការប៉ាន់ស្មានរបស់សហករណ៍', en: 'Co-op estimate' } },
    { id: 'D2', listingId: 'L2', type: 'surplus', was: 0.85, now: 0.72, off: 15, kgLeft: 45, grade: 'A', useBy: D(4), note: { km: 'ទុកបានយូរ', en: 'Extended shelf' } },
    { id: 'D3', listingId: 'L5', type: 'useSoon', was: 1.90, now: 1.33, off: 30, kgLeft: 4, grade: 'B', useBy: D(3), note: { km: 'ល្អសម្រាប់ធ្វើទឹកជ្រលក់', en: 'Good for sauces and purees' } },
    { id: 'D4', listingId: 'L11', type: 'surplus', was: 2.90, now: 2.30, off: 20, kgLeft: 0, grade: 'A', useBy: D(2), note: { km: 'លក់អស់', en: 'Sold out' }, nextBatch: D(3) },
  ];

  // Reference wholesale prices from the market (USD/kg)
  const marketPrices = [
    { product: 'tomato', market: 2.80 },
    { product: 'morningglory', market: 1.00 },
    { product: 'cucumber', market: 1.30 },
    { product: 'carrot', market: 1.25 },
    { product: 'bokchoy', market: 1.40 },
    { product: 'lemongrass', market: 1.80 },
    { product: 'sweetcorn', market: 1.60 },
    { product: 'kailan', market: 2.00 },
    { product: 'cabbage', market: 1.40 },
    { product: 'chili', market: 3.50 },
  ];

  const restaurant = {
    name: 'The Lab by Sokim Heng',
    manager: 'Chenda Meas',
    phone: '012 345 678',
    verified: true,
  };
  const addresses = [
    { id: 'a1', label: { km: 'ភោជនីយដ្ឋាន', en: 'Restaurant' }, recipient: 'Chenda Meas', phone: '012 345 678', line: 'No. 12, Street 240, Daun Penh, Phnom Penh' },
    { id: 'a2', label: { km: 'ផ្ទះបាយកណ្តាល', en: 'Central kitchen' }, recipient: 'Dara Chan', phone: '015 222 918', line: 'No. 88, Street 51, Boeng Keng Kang 1, Phnom Penh' },
  ];

  const item = (listingId, qty, price) => ({ listingId, dealId: null, qty, price });
  const at = (d, hm) => `${d}T${hm}:00+07:00`;
  const orders = [
    {
      id: 'HF-1001', checkoutId: 'C-900', shopId: 's3', items: [item('L3', 5, 2.50)], note: '', deliveryFee: 3, window: 'w1', date: D(1), addressId: 'a1',
      status: 'dispatched', createdAt: at(D(-1), '14:05'),
      history: [
        { status: 'pending', at: at(D(-1), '14:05') }, { status: 'accepted', at: at(D(-1), '14:15') },
        { status: 'preparing', at: at(D(-1), '16:00') }, { status: 'qualityChecked', at: at(D(-1), '17:30') },
        { status: 'dispatched', at: at(D(0), '05:40') },
      ],
      driver: { name: 'Vanna Chea', plate: '2A-4821', phone: '012 555 019' }, eta: { km: 'ស្អែក 6:30 ព្រឹក', en: '6:30 AM tomorrow' },
    },
    {
      id: 'HF-1002', checkoutId: 'C-901', shopId: 's1', items: [item('L7', 2, 1.60), item('L8', 3, 1.20)], note: '', deliveryFee: 3, window: 'w1', date: D(1), addressId: 'a1',
      status: 'preparing', createdAt: at(D(0), '08:10'),
      history: [{ status: 'pending', at: at(D(0), '08:10') }, { status: 'accepted', at: at(D(0), '08:32') }, { status: 'preparing', at: at(D(0), '10:05') }],
    },
    {
      id: 'HF-0998', checkoutId: 'C-880', shopId: 's2', items: [item('L6', 4, 1.10)], note: '', deliveryFee: 3, window: 'w1', date: D(-4), addressId: 'a1',
      status: 'delivered', createdAt: at(D(-5), '09:00'), deliveredAt: at(D(-4), '06:50'), rating: 5, ratingComment: 'Very fresh, well packed.',
      history: [
        { status: 'pending', at: at(D(-5), '09:00') }, { status: 'accepted', at: at(D(-5), '09:20') }, { status: 'preparing', at: at(D(-5), '13:00') },
        { status: 'dispatched', at: at(D(-4), '05:30') }, { status: 'delivered', at: at(D(-4), '06:50') },
      ],
    },
    {
      id: 'HF-0995', checkoutId: 'C-870', shopId: 's1', items: [item('L1', 6, 0.80)], note: '', deliveryFee: 3, window: 'w1', date: D(-6), addressId: 'a1',
      status: 'cancelled', createdAt: at(D(-7), '10:00'), reason: { km: 'អស់ស្តុក', en: 'Out of stock' }, cancelledBy: 'coop', refund: 'refunded',
      history: [{ status: 'pending', at: at(D(-7), '10:00') }, { status: 'cancelled', at: at(D(-7), '11:30') }],
    },
  ];
  orders.forEach((o) => { o.payment = { method: 'khqr', paidAt: o.createdAt }; });

  const notifications = [
    { id: 1, type: 'dispatched', orderId: 'HF-1001', msg: { km: 'HF-1001 កំពុងដឹកមកហើយ · មកដល់ ស្អែក 6:30 ព្រឹក', en: 'HF-1001 is on the way · ETA 6:30 AM tomorrow' }, at: at(D(0), '05:40'), read: false },
    { id: 2, type: 'preparing', orderId: 'HF-1002', msg: { km: 'HF-1002 កំពុងរៀបចំ', en: 'HF-1002 is being prepared' }, at: at(D(0), '10:05'), read: true },
  ];

  return {
    shops, products, listings, deals, marketPrices, restaurant, addresses, orders, notifications,
    recentSearches: ['Tomato', 'Morning Glory'],
    nextOrderNum: 1003, nextCheckout: 902, nextNotif: 10,
  };
}

/* =========================================================
   DISH IDEAS — "Good for" suggestions (a few Khmer dishes for now)
   grade: 'A' = best with fresh Grade A · 'any' = Grade B / Fresh Deals are fine
   ========================================================= */
const DISHES = [
  { id: 'chaTrakuon', emoji: '🥘', name: { km: 'ឆាត្រកួន', en: 'Stir-fried morning glory' }, uses: ['morningglory'], grade: 'A',
    tip: { km: 'ឆាភ្លើងខ្លាំងជាមួយខ្ទឹមស និងទឹកស៊ីអ៊ីវ', en: 'Quick, very hot wok with garlic and soy sauce' } },
  { id: 'samlorMju', emoji: '🍲', name: { km: 'សម្លម្ជូរ', en: 'Khmer sour soup' }, uses: ['tomato', 'morningglory', 'lemongrass'], grade: 'any',
    tip: { km: 'ប៉េងប៉ោះ Grade B ឬផលបញ្ចុះតម្លៃ ល្អសម្រាប់ស៊ុប', en: 'Grade B or deal tomatoes are perfect for soup' } },
  { id: 'lokLak', emoji: '🥩', name: { km: 'ឡុកឡាក់សាច់គោ', en: 'Beef lok lak' }, uses: ['tomato', 'cucumber'], grade: 'A',
    tip: { km: 'ប៉េងប៉ោះ និងត្រសក់ស្រស់ Grade A សម្រាប់សាឡាត់', en: 'Fresh Grade A tomato and cucumber for the side salad' } },
  { id: 'amok', emoji: '🐟', name: { km: 'អាម៉ុកត្រី', en: 'Fish amok' }, uses: ['lemongrass', 'bokchoy'], grade: 'A',
    tip: { km: 'ស្លឹកគ្រៃសម្រាប់គ្រឿង ស្លឹកស្ពៃសម្រាប់ក្រាលចាន', en: 'Lemongrass for the kroeung paste, greens to line the cups' } },
  { id: 'chaKailan', emoji: '🍄', name: { km: 'ឆាខាត់ណាផ្សិត', en: 'Kai lan & mushroom stir-fry' }, uses: ['kailan', 'oyster'], grade: 'A',
    tip: { km: 'ចម្អិនភ្លាមៗ ដើម្បីរក្សាពណ៌បៃតង', en: 'Cook fast to keep the stems green and crisp' } },
  { id: 'chaBanle', emoji: '🥕', name: { km: 'ឆាបន្លែចម្រុះ', en: 'Mixed vegetable stir-fry' }, uses: ['carrot', 'bokchoy', 'sweetcorn'], grade: 'any',
    tip: { km: 'ល្អសម្រាប់ប្រើបន្លែ Grade B ឬផលលើស', en: 'A good way to use Grade B and surplus vegetables' } },
  { id: 'chruok', emoji: '🥒', name: { km: 'ជ្រក់ត្រសក់ការ៉ុត', en: 'Pickled cucumber & carrot' }, uses: ['cucumber', 'carrot'], grade: 'any',
    tip: { km: 'Grade B ក៏ល្អដែរ ព្រោះត្រាំទឹកខ្មេះ', en: 'Grade B works well — it goes into pickling brine' } },
];
function dishesFor(productKey) { return DISHES.filter((d) => d.uses.includes(productKey)); }
