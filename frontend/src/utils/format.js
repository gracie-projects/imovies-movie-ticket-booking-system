const currency = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

export const formatCurrency = (value) => currency.format(value || 0);

export const formatDate = (value) =>
  new Date(value).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

export const formatShortDate = (value) =>
  new Date(value).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });

export const formatTime = (value) =>
  new Date(value).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });

export const formatDuration = (mins) => `${Math.floor(mins / 60)}h ${mins % 60}m`;

/** Local calendar day key, e.g. "2026-10-25" */
export function dayKey(value) {
  const d = new Date(value);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function seatTypeFor(seatId, premiumRows = []) {
  return premiumRows.includes(seatId[0]) ? 'premium' : 'standard';
}

/** Mirrors the server pricing for the live preview; the server total is authoritative */
export function estimatePrice(seats, prices, premiumRows, feePerSeat = 0) {
  const subtotal = seats.reduce((sum, id) => sum + prices[seatTypeFor(id, premiumRows)], 0);
  const convenienceFee = seats.length * feePerSeat;
  return { subtotal, convenienceFee, total: subtotal + convenienceFee };
}

/** Sorts seat ids naturally: A2 before A10 */
export function sortSeats(seats) {
  return [...seats].sort((a, b) => a[0].localeCompare(b[0]) || Number(a.slice(1)) - Number(b.slice(1)));
}

export function newIdempotencyKey() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}
