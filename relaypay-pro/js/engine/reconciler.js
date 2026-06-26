/* ============================================
   engine/reconciler.js — Pending blocks reconciliation
   Phase 2 — Modular architecture
   ============================================================
   Logic IDENTICAL to nomina_public/index.html (lines 781-870).
   ============================================================ */

import { uid } from '../utils.js';

/**
 * Reconcile pendingBlocks with new trips.
 * - If a pending blockId appears in newTrips -> mark as paid, remove from pending
 * - If a pending blockId does NOT appear in newTrips -> keep as pending (still unpaid)
 * Returns { paidNow, stillPending, stillUnseen }
 */
export function reconcilePendingBlocks(appRef, newTrips) {
  const newBlockIds = new Set((newTrips || []).map(t => t.blockId).filter(Boolean));
  const paidNow = [];
  const stillPending = [];
  const stillUnseen = [];

  if (!appRef.pendingBlocks) appRef.pendingBlocks = [];
  (appRef.pendingBlocks || []).forEach(pb => {
    if (pb.paidAt) {
      paidNow.push(pb);
    } else if (newBlockIds.has(pb.blockId)) {
      pb.paidAt = new Date().toISOString();
      pb.paidFrom = 'reconciled';
      paidNow.push(pb);
    } else {
      stillPending.push(pb);
    }
  });

  if (typeof appRef.savePendingBlocks === 'function') {
    appRef.savePendingBlocks();
  }

  return { paidNow, stillPending, stillUnseen };
}

/**
 * Add a new pending block (when invoice is saved)
 */
export function addPendingBlock(block, appRef) {
  if (!appRef.pendingBlocks) appRef.pendingBlocks = [];
  if (appRef.pendingBlocks.find(pb => pb.blockId === block.blockId)) return;
  appRef.pendingBlocks.push({
    blockId: block.blockId,
    driver: block.driver,
    pay: block.pay,
    payOriginal: block.payOriginal || block.estimatedPay || 0,
    estimatedPay: block.estimatedPay || block.payOriginal || 0,
    contractId: block.contractId,
    tractor: block.tractor,
    date: block.date,
    stage: block.stage,
    sourceInvoiceId: block.sourceInvoiceId,
    sourceInvoiceLabel: block.sourceInvoiceLabel,
    pendingReason: block.pendingReason || 'out_of_range',
    addedAt: new Date().toISOString(),
  });
  if (typeof appRef.savePendingBlocks === 'function') {
    appRef.savePendingBlocks();
  }
}

/**
 * Remove a pending block (e.g. when manually marked as paid).
 */
export function removePendingBlock(blockId, appRef) {
  if (!appRef.pendingBlocks) return;
  appRef.pendingBlocks = appRef.pendingBlocks.filter(pb => pb.blockId !== blockId);
  if (typeof appRef.savePendingBlocks === 'function') {
    appRef.savePendingBlocks();
  }
}

/**
 * Mark an invoice as paid and move to archive.
 */
export function markInvoiceAsPaid(invoiceId, appRef, callbacks) {
  const inv = (appRef.invoices || []).find(i => i.id === invoiceId);
  if (!inv) return;
  inv.status = 'pagada';
  inv.paidAt = new Date().toISOString();
  if (inv.pendingTrips) {
    inv.pendingTrips.forEach(t => removePendingBlock(t.blockId, appRef));
  }
  if (typeof appRef.saveInvoices === 'function') appRef.saveInvoices();
  if (callbacks && typeof callbacks.toast === 'function') {
    callbacks.toast(`✅ Factura "${inv.label}" marcada como PAGADA`, 'success');
  }
  if (callbacks && typeof callbacks.navigate === 'function') {
    callbacks.navigate('invoice');
  }
}

/**
 * Reopen an invoice (mark as pendiente again).
 */
export function reopenInvoice(invoiceId, appRef, callbacks) {
  const inv = (appRef.invoices || []).find(i => i.id === invoiceId);
  if (!inv) return;
  inv.status = 'pendiente';
  inv.paidAt = null;
  if (typeof appRef.saveInvoices === 'function') appRef.saveInvoices();
  if (callbacks && typeof callbacks.toast === 'function') {
    callbacks.toast('Factura reabierta', 'success');
  }
  if (callbacks && typeof callbacks.navigate === 'function') {
    callbacks.navigate('invoice');
  }
}

/**
 * Get all pending trips across all invoice archives.
 */
export function getAllPendingTrips(appRef) {
  const out = [];
  (appRef.invoices || []).forEach(inv => {
    (inv.pendingTrips || []).forEach(t => {
      out.push({ ...t, sourceInvoice: inv.id, sourceInvoiceLabel: inv.label });
    });
  });
  return out;
}

/**
 * Pending trips grouped by source invoice.
 */
export function getPendingTripsByInvoice(appRef) {
  const grouped = {};
  (appRef.invoices || []).forEach(inv => {
    if ((inv.pendingTrips || []).length) {
      grouped[inv.id] = { invoice: inv, trips: inv.pendingTrips };
    }
  });
  return grouped;
}

/**
 * Dashboard stats — aggregate over all invoices.
 */
export function getDashboardStats(appRef) {
  const totalRevenue = (appRef.invoices || []).reduce((s, inv) => s + (inv.totals?.totalGross || 0), 0);
  const totalCommission = (appRef.invoices || []).reduce((s, inv) => s + (inv.totals?.totalCommission || 0), 0);
  const totalTrips = (appRef.invoices || []).reduce((s, inv) => s + (inv.totals?.tripCount || 0), 0);
  const pendingTrips = getAllPendingTrips(appRef);
  return {
    totalRevenue, totalCommission, totalTrips,
    companyCount: (appRef.companies || []).length,
    driverCount: (appRef.drivers || []).length,
    invoiceCount: (appRef.invoices || []).length,
    pendingCount: pendingTrips.length,
    pendingTotal: pendingTrips.reduce((s, t) => s + Number(t.pay || 0), 0),
  };
}