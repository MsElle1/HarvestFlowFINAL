/* =========================================================
   KHQR — builds a real, scannable Bakong KHQR for each payment

   Starts from the merchant's own static KHQR (ABA) and turns it into a
   dynamic KHQR that already contains the order amount, so the buyer's
   banking app (ABA, ACLEDA, Wing, Bakong…) opens with the amount filled in.
   Format: EMVCo merchant-presented QR, as used by the NBC KHQR standard.
   ========================================================= */
const KHQR = {
  /** Tag-length-value parser: "000201…" → [{tag, value}] */
  parse(s) {
    const out = [];
    let i = 0;
    while (i < s.length) {
      const tag = s.slice(i, i + 2), len = parseInt(s.slice(i + 2, i + 4), 10);
      out.push({ tag, value: s.slice(i + 4, i + 4 + len) });
      i += 4 + len;
    }
    return out;
  },
  tlv(tag, value) { return tag + String(value.length).padStart(2, '0') + value; },

  /** CRC-16/CCITT-FALSE (poly 0x1021, init 0xFFFF) over the payload including "6304". */
  crc16(str) {
    let crc = 0xffff;
    const bytes = new TextEncoder().encode(str);
    for (const b of bytes) {
      crc ^= b << 8;
      for (let k = 0; k < 8; k++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
    return crc.toString(16).toUpperCase().padStart(4, '0');
  },

  /** Checks a payload's CRC (used to validate the configured static QR). */
  isValid(payload) {
    return /6304[0-9A-F]{4}$/.test(payload) && KHQR.crc16(payload.slice(0, -4)) === payload.slice(-4);
  },

  /**
   * Dynamic KHQR with amount (USD), bill number and a validity window.
   * Keeps the merchant's account info (tags 29/40), name and city unchanged.
   */
  build({ amount, currency = 'USD', billNumber = '', validMinutes = 15 }) {
    const base = CONFIG.payment.khqr.payload;
    const tags = KHQR.parse(base).filter((t) => !['01', '53', '54', '62', '63', '99'].includes(t.tag));
    const now = Date.now();
    const add = [
      { tag: '01', value: '12' },                                        // 12 = dynamic (one-time, has amount)
      { tag: '53', value: currency === 'USD' ? '840' : '116' },          // 840 = USD, 116 = KHR
      { tag: '54', value: currency === 'USD' ? Number(amount).toFixed(2) : String(Math.round(amount)) },
    ];
    if (billNumber) add.push({ tag: '62', value: KHQR.tlv('01', billNumber.slice(0, 25)) });
    add.push({ tag: '99', value: KHQR.tlv('00', String(now)) + KHQR.tlv('01', String(now + validMinutes * 60000)) });
    const order = ['00', '01', '29', '30', '40', '52', '53', '54', '58', '59', '60', '62', '99'];
    const all = [...tags, ...add].sort((a, b) => order.indexOf(a.tag) - order.indexOf(b.tag));
    const body = all.map((t) => KHQR.tlv(t.tag, t.value)).join('') + '6304';
    return { payload: body + KHQR.crc16(body), expiresAt: now + validMinutes * 60000 };
  },

  /** Merchant name as encoded in the QR (tag 59). */
  merchantName() { const t = KHQR.parse(CONFIG.payment.khqr.payload).find((x) => x.tag === '59'); return t ? t.value : ''; },

  /** SVG for a payload (uses the bundled qrcode-generator library). */
  svg(payload, cell = 4) {
    const qr = qrcode(0, 'M');
    qr.addData(payload);
    qr.make();
    return qr.createSvgTag({ cellSize: cell, margin: 2, scalable: true });
  },
  /** PNG/GIF data URL (for "Save QR image"). */
  dataUrl(payload) {
    const qr = qrcode(0, 'M');
    qr.addData(payload);
    qr.make();
    return qr.createDataURL(8, 16);
  },
};
