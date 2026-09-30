/* =========================================================
   I18N helpers — Khmer (default) / English
   The dictionary itself lives in js/lang.js (DICT).
   ========================================================= */
let LANG = 'km';
const KM_DIGITS = ['០', '១', '២', '៣', '៤', '៥', '៦', '៧', '៨', '៩'];
const KM_MONTHS = ['មករា', 'កុម្ភៈ', 'មីនា', 'មេសា', 'ឧសភា', 'មិថុនា', 'កក្កដា', 'សីហា', 'កញ្ញា', 'តុលា', 'វិច្ឆិកា', 'ធ្នូ'];
const EN_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function t(key, vars) {
  let s = DICT[LANG] && DICT[LANG][key];
  if (s === undefined) s = DICT.en[key];
  if (s === undefined) { console.warn('[i18n] missing', key); s = key; }
  if (vars) for (const k in vars) s = s.split('{' + k + '}').join(vars[k]);
  return s;
}
/** Localized value from {km, en} objects (or plain strings). */
function L(o) { if (o == null) return ''; if (typeof o === 'string') return o; return o[LANG] || o.en || o.km || ''; }
/** Small counters use Khmer digits in Khmer mode. */
function n(v) { const s = String(v); return LANG === 'km' ? s.replace(/[0-9]/g, (d) => KM_DIGITS[d]) : s; }
function money(v) { return '$' + (Math.round(v * 100) / 100).toFixed(2); }
function kg(v) { return (Math.round(v * 10) / 10).toLocaleString('en-US'); }
function fmtDate(iso, withYear = true) {
  const d = parseDay(iso);
  const m = LANG === 'km' ? KM_MONTHS[d.getMonth()] : EN_MONTHS[d.getMonth()];
  return LANG === 'km' ? `${n(d.getDate())} ${m}${withYear ? ' ' + n(d.getFullYear()) : ''}` : `${d.getDate()} ${m}${withYear ? ' ' + d.getFullYear() : ''}`;
}
function fmtTime(iso) {
  const [h, m] = iso.slice(11, 16).split(':').map(Number);
  if (LANG === 'km') return `${n(h > 12 ? h - 12 : h || 12)}:${n(String(m).padStart(2, '0'))} ${h < 12 ? 'ព្រឹក' : h < 17 ? 'រសៀល' : 'ល្ងាច'}`;
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}
function fmtDateTime(iso) { return `${fmtDate(iso, false)}, ${fmtTime(iso)}`; }
/** "Today" / "Tomorrow" relative to the fixed prototype date. */
function relDay(iso) {
  const d = dayDiff(iso, CONFIG.today);
  if (d === 0) return t('today');
  if (d === 1) return t('tomorrow');
  if (d === -1) return t('yesterday');
  return fmtDate(iso, false);
}
