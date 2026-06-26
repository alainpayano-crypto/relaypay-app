/* ============================================
   engine/runPayanoEngine.js — Main payano engine runner
   Phase 2 — Modular architecture
   ============================================================
   Logic IDENTICAL to nomina_public/index.html (lines 8766-8820).
   DO NOT MODIFY the order of operations.
   ============================================================ */

import { payanoGroupItems } from './payanoEngine.js';
import { payanoClassifyBlocks, payanoBuildTrips, payanoAddOrphanInvoiceTrips } from './payanoEngine.js';
import { payanoExtractExpenses, trackPendingTolls } from './expenses.js';
import { normalizeStr, normalizeTractor } from '../utils.js';

export function payanoMatchDriverToCompany(driverName, appRef) {
  if (!driverName) return null;
  const n = normalizeStr(driverName);
  const registered = (appRef.drivers || []).find(d => normalizeStr(d.name) === n);
  if (registered && registered.companyId) {
    const comp = (appRef.companies || []).find(c => c.id === registered.companyId);
    if (comp) return comp;
  }
  return null;
}

export function payanoAssignCompany(trip, appRef) {
  const comp = payanoMatchDriverToCompany(trip.driver, appRef);
  if (comp) return comp;
  if (!trip.tractor) return null;
  const norm = normalizeTractor(trip.tractor);
  return (appRef.companies || []).find(c =>
    (c.tractors || []).some(x => normalizeTractor(x) === norm)
  ) || null;
}

export function payanoCalculatePayroll(trips, appRef) {
  const byDriver = {};
  const byCompany = {};

  trips.forEach(t => {
    if (!byDriver[t.driver]) {
      byDriver[t.driver] = { driver: t.driver, trips: 0, grossRevenue: 0, blocks: new Set() };
    }
    byDriver[t.driver].trips++;
    byDriver[t.driver].grossRevenue += t.pay;
    byDriver[t.driver].blocks.add(t.blockId);

    const comp = payanoAssignCompany(t, appRef);
    const compName = comp ? comp.name : '⚠️ Sin empresa';
    if (!byCompany[compName]) {
      byCompany[compName] = { company: comp, drivers: new Set(), trips: 0, grossRevenue: 0, blocks: new Set() };
    }
    byCompany[compName].trips++;
    byCompany[compName].grossRevenue += t.pay;
    byCompany[compName].blocks.add(t.blockId);
    if (t.driver) byCompany[compName].drivers.add(t.driver);
  });

  return { byDriver, byCompany };
}

export function payanoReconcile(calculatedGross, expectedGross, moneyFn) {
  if (!expectedGross || expectedGross <= 0) {
    return { diff: 0, diffPct: 0, status: 'no_expected', message: 'No se proporcionó payroll esperado' };
  }
  const diff = calculatedGross - expectedGross;
  const diffPct = (Math.abs(diff) / expectedGross) * 100;
  let status = 'ok';
  let message = `Diferencia: ${moneyFn ? moneyFn(diff) : diff} (${diffPct.toFixed(2)}%)`;
  if (diffPct > 1) {
    status = 'warning';
    message = `⚠️ Diferencia ${diffPct.toFixed(2)}% > 1%. Revisar bloques pendientes o diferidos.`;
  }
  return { diff, diffPct, status, message };
}

/**
 * MAIN: Run the full Payano Payroll Engine.
 * Order of operations is SEALED — DO NOT change.
 */
export function runPayanoPayrollEngine(rows, colMap, rangeStart, rangeEnd, expectedGross, appRef, persistFn) {
  const amazonData = (appRef && appRef.amazonInvoiceData) || null;
  const settings = {
    payanoDateColumn: appRef && appRef.settings && appRef.settings.payanoDateColumn,
    payanoCutoffTime: appRef && appRef.settings && appRef.settings.payanoCutoffTime,
    payanoLastDayToNextWeek: appRef && appRef.settings && appRef.settings.payanoLastDayToNextWeek,
    payanoIncludeZeroPay: appRef && appRef.settings && appRef.settings.payanoIncludeZeroPay,
    payanoUseDominantDriver: appRef && appRef.settings && appRef.settings.payanoUseDominantDriver,
    amazonInvoiceData: amazonData,
  };

  // Step 1: Group using DUAL REVENUE MODEL
  const grouped = payanoGroupItems(rows, colMap, appRef);
  // Step 2: Classify
  const classified = payanoClassifyBlocks(grouped.groups, rangeStart, rangeEnd, colMap, settings);
  // Step 2.5: Capture multi-driver warnings
  const multiDriverWarnings = grouped.multiDriverWarnings || [];
  // Step 3: Build trips
  let trips = payanoBuildTrips(classified, colMap, settings);
  // Step 3b: Add ORPHAN trips from Amazon invoice that are NOT in CSV
  const orphanResult = payanoAddOrphanInvoiceTrips(trips, amazonData, colMap, appRef);
  trips = orphanResult.trips;
  // Step 3c: Extract EXPENSES (tolls, credits, adjustments)
  const expenses = payanoExtractExpenses(
    amazonData,
    orphanResult.tripIdLookup || {},
    orphanResult.routeDriverLookup || {},
    orphanResult.contractIdLookup || {}
  );
  // Step 3d: Track tolls as pending
  trackPendingTolls(expenses, appRef, persistFn);
  // Step 5: Calculate
  const { byDriver, byCompany } = payanoCalculatePayroll(trips, appRef);
  // Step 6: Reconcile
  const totalGross = trips.reduce((s, t) => s + t.pay, 0);
  const recon = payanoReconcile(totalGross, expectedGross);

  return {
    totalGroups: grouped.groups.length,
    totalBlocks: grouped.groups.length,
    totalBlockGroups: grouped.stats.totalBlockGroups,
    totalLoadGroups: grouped.stats.totalLoadGroups,
    ungroupedRows: grouped.ungroupedRows,
    ungroupedCount: grouped.ungroupedRows.length,
    multiDriverWarnings,
    inPeriod: classified.inPeriod.length,
    lastDayExcluded: classified.lastDayExcluded.length,
    deferred: classified.deferred.length,
    cancelled: classified.cancelled.length,
    beforeRange: classified.beforeRange.length,
    afterRange: classified.afterRange.length,
    trips,
    expenses,
    byDriver,
    byCompany,
    totalGross,
    expectedGross: expectedGross || 0,
    reconciliation: recon,
    classified,
  };
}

export function getPayanoPendingBlocks(classified) {
  return [
    ...classified.lastDayExcluded.map(b => ({ ...b, pendingReason: 'last_day' })),
    ...classified.deferred.map(b => ({ ...b, pendingReason: 'deferred' })),
  ];
}