/* ============================================
   engine/normalize.js — Driver name normalization
   Phase 2 — Modular architecture
   ============================================ */

// PAYANO RULE: Normalize driver name.
// - If two parts joined by ';' are EXACTLY the same (or differ only by case/space), keep one.
// - If they are DIFFERENT people, return them joined as-is for manual review (do NOT split revenue).
//   Revenue stays with the Block ID / Trip ID — driver is informational.
export function normalizePayanoDriverName(name) {
  if (!name) return '';
  let s = String(name).trim();
  // Lowercase compare on parts
  const parts = s.split(';').map(x => x.trim()).filter(Boolean);
  if (parts.length > 1) {
    const lower = parts.map(x => x.toLowerCase().replace(/\s+/g, ' '));
    const allSame = lower.every(x => x === lower[0]);
    if (allSame) return parts[0];
    return parts.join('; ');
  }
  return s;
}