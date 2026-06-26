/* ============================================
   utils.js — Pure utility functions
   Phase 2 — Modular architecture
   ============================================ */

export function escapeHtml(s) {
  if (s == null) return '';
  return String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

export function money(n) {
  if (n == null || isNaN(n)) n = 0;
  return '$' + Number(n).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function moneyShort(n) {
  if (n == null || isNaN(n)) n = 0;
  const abs = Math.abs(n);
  if (abs >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
  if (abs >= 1e3) return '$' + (n / 1e3).toFixed(1) + 'K';
  return money(n);
}

export function fmtDate(d) {
  if (!d) return '—';
  try {
    const date = new Date(d);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch (e) {
    return d;
  }
}

export function fmtDateInput(d) {
  if (!d) return '';
  try {
    const date = new Date(d);
    return date.toISOString().split('T')[0];
  } catch (e) {
    return '';
  }
}

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

export function normalizeStr(s) {
  if (!s) return '';
  return String(s).toLowerCase().trim().replace(/\s+/g, ' ');
}

export function normalizeTractor(t) {
  if (!t) return '';
  return String(t).toUpperCase().trim().replace(/\s+/g, '');
}

export function debounce(fn, delay) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn.apply(this, args), delay);
  };
}

export function throttle(fn, limit) {
  let inThrottle;
  return function (...args) {
    if (!inThrottle) {
      fn.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

export function debounceBy(fn, delay = 100) {
  let timer;
  const debounced = function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
  debounced.flush = function () {
    clearTimeout(timer);
  };
  return debounced;
}