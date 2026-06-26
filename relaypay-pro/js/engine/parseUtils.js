/* ============================================
   engine/parseUtils.js — Money / Date parsers
   Phase 2 — Modular architecture
   ============================================================
   Logic IDENTICAL to nomina_public/index.html.
   DO NOT MODIFY the parsing semantics — they affect money/date display.
   ============================================================ */

export function parseMoney(v) {
  if (v == null) return 0;
  if (typeof v === 'number') return v;
  const s = String(v).replace(/[$,\s]/g, '').replace(/[^\d.\-]/g, '');
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

export function parseDate(v) {
  if (!v) return null;
  if (v instanceof Date) return v;
  // Try direct Date parse first
  let d = new Date(v);
  if (!isNaN(d.getTime())) return d;

  // Try DD/MM/YYYY or MM/DD/YYYY (heuristic: if first part > 12, it's DD/MM)
  const s = String(v).trim();
  const m1 = s.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/);
  if (m1) {
    let [, a, b, y] = m1;
    a = parseInt(a, 10);
    b = parseInt(b, 10);
    if (a > 12) {
      // DD/MM/YYYY
      d = new Date(+y < 100 ? 2000 + +y : +y, b - 1, a);
    } else {
      // assume MM/DD/YYYY
      d = new Date(+y < 100 ? 2000 + +y : +y, a - 1, b);
    }
    if (!isNaN(d.getTime())) return d;
  }

  // Try "DD MMM YYYY" or "MMM DD, YYYY"
  const m2 = s.match(/^(\d{1,2})\s+([A-Za-z]{3,9})\s+(\d{4})/);
  if (m2) {
    const [, dd, mon, yy] = m2;
    const months = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
    const mi = months.findIndex(x => mon.toLowerCase().startsWith(x));
    if (mi >= 0) {
      d = new Date(+yy, mi, +dd);
      if (!isNaN(d.getTime())) return d;
    }
  }
  return null;
}

export function fmtDateTime(d) {
  if (!d) return '—';
  try {
    const date = new Date(d);
    return date.toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' });
  } catch (e) {
    return d;
  }
}

export function getWeekRange(d) {
  // Return {start, end} (Sunday-Saturday) for the week containing d
  const date = new Date(d);
  const day = date.getDay();
  const start = new Date(date);
  start.setDate(date.getDate() - day);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

export function daysBetween(d1, d2) {
  const a = new Date(d1);
  const b = new Date(d2);
  return Math.round((b - a) / (24 * 60 * 60 * 1000));
}