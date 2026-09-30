# HarvestFlow — Buyer App (Restaurants)

HarvestFlow is a B2B marketplace. This app is for **Phnom Penh restaurants** buying fresh vegetables from **Battambang cooperatives**. It is a clickable, working prototype that runs in any browser, in Khmer (default) or English.

The Seller side is a separate app (FarmerInterface). Here, anything the cooperative would do is simulated with the **Demo controls** panel next to the phone.

## Run it

You don't need to build or install anything.

```bash
python3 -m http.server 8000     # then open http://localhost:8000
```

You can also double-click `index.html`, or host the folder on GitHub Pages (Settings → Pages → Branch `main`, root).

On a desktop screen the app shows as a phone, with the Demo controls beside it. On a real phone the app fills the screen, and the Demo controls open from the small **Demo** tab on the right edge.

### Demo logins (phone + 4-digit code)
| Phone | Code | Result |
|---|---|---|
| 012 345 678 | 1234 | Restaurant "The Lab by Sokim Heng" (verified) |
| 098 765 432 | any | Cooperative account: politely sent to the Seller app |
| 011 000 000 | 1234 | Restaurant not verified yet: can browse, can't order |

## Test path

1. Log in with 012 345 678 · 1234.
2. Search **tomato** and pick a shop.
3. Open Tomato and tap **Add to Basket**.
4. Go back, pick another shop, and add Tomato again.
5. Tap **View basket**. You'll see 2 shops, both ticked.
6. Tap **Checkout** → **Place Order** → **I have paid**. You get 2 orders and 2 receipts from one payment.
7. Tap **View Orders**. In Demo controls, choose the new order and tap **Accept → Mark Preparing → Mark Dispatched**.
8. Tap **Track Order**. In Demo controls, tap **Mark Delivered**. The order is finished and moves to **History**, with no confirmation step.
9. In **History**, tap the order to see its receipt: order ID, cooperative → restaurant, items, subtotal, delivery, total and payment (Bakong KHQR). From there or from the History card you can **Rate** (stars, feedback and an optional problem report) or **Reorder**.

## Rules the app follows
- **Main screens** (Home, Browse, Basket, Orders, Account) show the tab bar. **Flow screens** show a back arrow and one main button instead.
- There is only one basket indicator per screen: the Basket tab badge on main screens, or the floating basket bar on flow screens.
- Every item shows **"by [Shop]"**: on cards, product details, basket, checkout, orders and receipts.
- A multi-shop checkout means **one payment (Bakong KHQR)**, with **one order and one receipt per shop**. Shops you leave unticked stay in the basket.
- Quantities can't go below the minimum order or above the stock left. The app tells you why when you hit a limit.
- All totals are calculated in code, and the Basket total always equals the Checkout total.
- Order statuses are Pending → Accepted → Preparing → Dispatched → **Delivered (final)**, plus Declined, Cancelled and Expired. Problems are reported from the Rate sheet in History.
- Browse and search results group vegetables under the cooperative that sells them. Sort by **Relevance, Price, Rating or Discount**. Items can be added and changed with − / + right in the list; the floating basket bar appears on flow screens. Orders, Order Details and Track Order all use the same timeline.

## Assumptions to confirm
These are all in the `CONFIG` object at the top of `js/seed.js`:
- Login is phone number + 4-digit code.
- Payment is Bakong KHQR, paid once at Place Order for all shops. The QR is **real**: the app takes the merchant KHQR in `CONFIG.payment.khqr.payload` and builds a new KHQR for every checkout that already contains the amount (USD), a reference number and a 15-minute validity. Any Cambodian banking app (ABA, ACLEDA, Wing, Bakong…) can scan it. If a bank app will not read it, the buyer can switch to the original fixed QR and type the amount.
- **The app does not check the payment itself.** There is no backend, so the buyer taps **I have paid** after paying. Checking payments automatically needs a server that asks Bakong or ABA, using an API key that must never be put in this front-end code.
- To receive money in a different account, replace `payload` (and `staticImage`) in `CONFIG.payment.khqr` with that account's KHQR.
- If a cooperative declines, or you cancel while the order is Pending, that shop's part shows **Refund pending**.
- Delivery costs **$3.00 per shop**. The whole checkout shares one delivery date and time window. The default is tomorrow, 6:00–8:00 AM, with 3 windows to choose from.
- Buy Now checks out only that item and leaves the basket as it is.
- "Today" is the real date and delivery is tomorrow. Fresh demo data loads each new day.
- A Fresh Deal only appears if its use-by date is on or after the delivery date.
- Following the prompt, nothing is saved in the browser, so a refresh starts the demo over.

## Code structure
```
index.html        phone frame + demo controls panel
styles.css        design tokens and all component styles
js/seed.js        CONFIG + mock data (shops, listings, deals, orders…)
js/lang.js        Khmer / English dictionary
js/i18n.js        translation, number and date helpers
js/store.js       state, basket, checkout, order status machine (business logic)
js/ui.js          reusable components (tab bar, cards, stepper, timeline, toast…)
js/screens.js     every screen (F1–F17)
js/sheets.js      bottom sheets (quantity, KHQR payment, rating, address) + confirm dialog
js/link.js        link with the Seller app (stock, orders, status, cancel, rating)
js/demo.js        Demo controls (simulates the other cooperatives)
js/app.js         navigation, events and actions
assets/           logo, category icons, bundled fonts
```


## Linked with the Seller app

When this folder sits inside the Seller project (as `buyer/`), the Buyer app links to it:
- The cooperative from the Seller app (**Banan Agricultural Cooperative**) appears as a **Live** shop. Its stock, prices and discounts come straight from the Seller app.
- Orders from that shop go to the Seller app, one order per vegetable. Their status comes back live: accepted, preparing, on the way, delivered or declined.
- Cancelling an order, and ratings, feedback and problem reports, also go to the Seller app.
- Other shops still use the *Demo* panel.
- Your data (basket, orders, login) is saved in this browser. **Reset demo (both apps)** clears it.

The link code is in `js/link.js`. If the Seller app is not next to this folder, the Buyer app runs on its own.
