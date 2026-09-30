# HarvestFlow — Seller + Buyer (linked)

This repo holds **both HarvestFlow apps, linked together**:

| Path | App | Who uses it |
|---|---|---|
| `index.html` | Shared login screen → **Seller / Cooperative app** | Cooperative staff |
| `buyer/index.html` | **Buyer app** | Restaurants |

The first screen asks **"Who are you?"**. Tap **Seller** to open the Seller app, or **Buyer** to open the Buyer app.

## Linked demo (pitch)

Both apps save to the same browser, so what one app does shows up in the other. With two windows side by side, updates appear **live** (no refresh needed).

| # | Connection | Direction |
|---|---|---|
| 1 | Stock and prices. The cooperative shows up as a shop in the Buyer app with a **Live** tag, and its batch discounts show up as Fresh Deals. | Seller → Buyer |
| 2 | New orders. The restaurant's order lands in Seller › Orders › New, tagged "From Buyer app". | Buyer → Seller |
| 3 | Order status. Accept (stock deducted, earliest expiry first) → Preparing → Ready → On the way → Completed = **Delivered**. A reject shows as Declined, with the refund pending. | Seller → Buyer |
| 4 | Cancel. Works only while the order is still new. | Buyer → Seller |
| 5 | Rating, feedback and problem report. They show on the seller's order and in its notifications. | Buyer → Seller |
| 6 | One login screen for both apps | — |

**How to run it for the pitch (works offline):**
1. Unzip the folder on the laptop. Open `index.html` in **Google Chrome** (double-click it).
2. Open a **second Chrome window** with the same `index.html`, and put the two windows side by side.
3. Left window: tap **Seller** and use PIN **1234**. Right window: tap **Buyer** and use **012 345 678 · 1234**.
4. To start clean, tap **Reset demo (both apps)**. It's in the Buyer app's *Demo* panel and under Seller › Profile › Reset demo.

Other notes:
- Each app loads fresh demo data the first time it's opened on a new day, so all dates match the real day.
- Order numbers are shared by both apps, so they never clash.
- Use the same browser for both windows. Chrome and Edge both work. A private window keeps its own separate data.

---

# Seller / Cooperative App

HarvestFlow helps agricultural cooperatives record harvests, see live stock, handle buyer orders and check reference market prices, with the goal of cutting food waste. This repo holds the **seller (cooperative) interface**. It's a mobile-first web app that runs in any browser, with Khmer as the default language and an English switch.

The **Seller Dashboard** is rebuilt from the Figma design, and every other screen uses the same visual language: the same colors and cards. Vegetables are shown as simple icon tiles, not photos. The cooperative sells vegetables only, and all farmers are in Battambang province.

## Run it

You don't need to build or install anything.

- **Easiest:** open `index.html` in a browser.
- **Recommended:** serve the folder so browser back/forward works:
  ```bash
  python3 -m http.server 8000
  # then open http://localhost:8000
  ```
- **Demo login:** tap *អ្នកលក់ / សហគមន៍* and use PIN **1234**.

On a desktop screen the app shows as a centered phone (390 × 844). On a phone it fills the screen.

## Main flow

```
Role → Seller login → Dashboard
  ├─ Stock (គ្រប់គ្រងស្តុក): batches · expiring · history · farmers
  │    └─ + Add harvest → review → saved → Current Stock (highlighted)
  ├─ Current stock (ស្តុកបច្ចុប្បន្ន): search · filters · sort → Stock detail → edit / remove
  ├─ Orders (ការបញ្ជាទិញ): New → accept (stock auto-deducted) → preparing checklist
  │    → delivery / pickup → ready → on the way → completed (sale recorded)
  ├─ Market prices (តម្លៃទីផ្សារ): reference prices by market, 5-day trend
  ├─ Notifications (bell): each one opens the screen it's about
  └─ Profile: cooperative info, ខ្មែរ | English, notifications, logout
```

### Demo scenario (from the brief)
1. Log in, then on the dashboard tap **+ បន្ថែមផលដំណាំថ្មី**.
2. Pick 🍅 tomato, **+100 +10 +10** (120 kg), farmer សុខា, Grade A, a shelf life, ឃ្លាំង A, then **ពិនិត្យ និងបញ្ជាក់ → បញ្ជាក់ និងបញ្ចូលស្តុក**.
3. The new batch shows up highlighted in **ស្តុកបច្ចុប្បន្ន**.
4. Go to **ការបញ្ជាទិញ → #HF-1024 Green Garden Restaurant (30 kg tomato)**. The stock check shows *current stock − order = remaining*.
5. Tap **យល់ព្រមទទួលការបញ្ជាទិញ**, then **បាទ/ចាស ទទួល**. The order becomes **កំពុងរៀបចំ** and 30 kg is taken from stock automatically. The oldest tomato batch goes first ("គួរលក់មុន").
6. Tick the 5 preparation steps, choose **ដឹកជញ្ជូន**, and the order becomes **ត្រៀមដឹកជញ្ជូន**.
7. Tap **ចាប់ផ្តើមដឹកជញ្ជូន**, then **បញ្ជាក់ថាបានបញ្ចប់**. The order becomes **បានបញ្ចប់** and the sale is recorded.
8. **ស្តុក → ប្រវត្តិ** shows `−30 kg · ការបញ្ជាទិញ #HF-1024 · ✓ បានលក់`, and the dashboard totals update.

#HF-1026 (120 kg cabbage, only 90 kg in stock) shows the **ស្តុកមិនគ្រប់គ្រាន់** case. The accept button is disabled and the screen shows the shortage.

## Key business rules (`js/store.js`)

| Rule | How it works |
|---|---|
| Stock is never typed by hand | Available kg is **calculated from the stock ledger** (`stockTransactions`): harvest in, order out, release, adjust, remove. |
| Automatic deduction and reservation | Accepting an order writes `order` ledger entries right away, so the kg can't be sold twice. |
| No double selling | `planAllocation()` checks the kg that can still be sold. If there isn't enough, it shows available, requested and the shortage, and the order can't be accepted. |
| Earliest expiry first | Orders are filled from the batch that expires soonest. That batch is tagged **គួរលក់មុន**. |
| Cancel returns stock | Cancelling an accepted order writes `release` entries, which put the kg back. |
| Traceability | Every batch keeps its farmer, and every sale records which batches (and farmers) it came from. |
| History is never deleted | Removing stock writes a `remove` entry. A batch that reaches 0 is archived, not deleted. |
| Freshness status | Green **ស្រស់**, orange **ត្រូវលក់ឆាប់** (≤ 2 days left), red **ផុតកំណត់**. |

## Code structure

```
index.html        app shell (phone frame)
styles.css        design tokens + all component styles (from the Figma design)
js/icons.js       SVG icon set
js/i18n.js        Khmer / English text, number and date formatting
js/data.js        DATA: demo seed data (farmers, crops, stockBatches, stockTransactions,
                  buyers, orders, orderItems, sales, marketPrices, notifications, sellerProfile)
js/store.js       STATE + BUSINESS LOGIC: persistence, selectors, Api.* write actions
js/ui.js          UI components: header, bottom nav, stock card, order card, badges, toast
js/screens.js     SCREENS: role, login, dashboard, stock, current stock, detail, add harvest,
                  orders, order detail, market, notifications, profile
js/sheets.js      bottom sheets (farmer picker, review, edit, remove, fulfilment…) + confirm modal
js/app.js         NAVIGATION + EVENT HANDLERS (router, back button, actions)
assets/           Figma dashboard illustrations, logo, bundled fonts (works offline)
```

### Connecting a real backend later
Every write goes through the `Api` object in `js/store.js`, and storage is isolated in `Persistence` (currently `localStorage`). To move to a REST API, Firebase, Supabase or Laravel/MySQL, replace `Persistence.load/save` and the bodies of the `Api.*` functions with network calls. The screens don't need to change. The data arrays match the tables in the system-structure document.

### Saved data and demo reset
Harvests, stock, order status and language are saved in `localStorage`, so they survive a refresh. To restore the demo data, go to **Profile**, scroll to the bottom and tap the small grey **កំណត់ទិន្នន័យសាកល្បងឡើងវិញ** link. There is also a **simulate a buyer order** helper.

Market prices are sample reference data and are labeled as reference only.
