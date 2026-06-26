/* ============================================
   engine/payanoEngine.js — SEALED Payano Payroll Engine v2.0
   Phase 2 — Modular architecture
   Logic IDENTICAL to nomina_public/index.html (lines 7805-8820).
   DO NOT MODIFY without explicit user permission.
   ============================================ */

import { normalizePayanoDriverName } from './normalize.js';
import { parseMoney, parseDate } from './parseUtils.js';

// ============================================================
// STAGE / PATTERN CONSTANTS (Payano defaults)
// ============================================================
export const PAYANO_DEFERRED_PATTERNS = [
  /will\s+be\s+paid\s+next\s+invoice/i,
  /scheduled\s+to\s+be\s+paid\s+next\s+invoice/i,
  /future\s+settlement/i,
  /to\s+be\s+paid\s+next\s+invoice/i,
];

export const PAYANO_CANCELLED_PATTERNS = [
  /^cancelled$/i,
  /^canceled$/i,
  /^rejected$/i,
];

// ============================================================
// STEP 1: Group items (BLOCK=MAX, LOAD=SUM, dual revenue model)
// ============================================================
export function payanoGroupItems(rows, colMap, appRef) {
  const groups = {};
  const ungroupedRows = [];
  const warnings = [];
  const amazonData = (appRef && appRef.amazonInvoiceData) || null;

  rows.forEach((row, idx) => {
    const blockId = colMap.colBlock ? String(row[colMap.colBlock] || '').trim() : '';
    const tripId = colMap.colTrip ? String(row[colMap.colTrip] || '').trim() : '';
    const drv = normalizePayanoDriverName(String(row[colMap.colDriver] || '').trim());
    const pay = parseMoney(row[colMap.colPay]);
    const stage = String(row[colMap.colStage] || '').trim();

    let groupKey, groupType;
    if (blockId && blockId.toUpperCase().startsWith('B-')) {
      groupKey = blockId;
      groupType = 'BLOCK';
    } else if (tripId) {
      groupKey = tripId;
      groupType = 'LOAD';
    } else if (blockId) {
      groupKey = blockId;
      groupType = 'LOAD';
    } else {
      ungroupedRows.push({ row, idx });
      return;
    }

    if (!groups[groupKey]) {
      groups[groupKey] = {
        key: groupKey,
        type: groupType,
        blockId: groupType === 'BLOCK' ? blockId : '',
        tripId: groupType === 'LOAD' ? tripId : '',
        rows: [],
        drivers: new Set(),
        totalPay: 0,
        maxPay: -Infinity,
        maxRow: null,
        primaryRow: null,
        primaryKey: groupKey,
      };
    }
    const g = groups[groupKey];
    g.rows.push({ row, idx });
    g.totalPay += pay;
    if (drv) g.drivers.add(drv);
    if (pay > g.maxPay) {
      g.maxPay = pay;
      g.maxRow = row;
    }
  });

  Object.values(groups).forEach(g => {
    if (g.type === 'BLOCK') {
      g.grossRevenue = g.maxPay;
      g.primaryRow = g.maxRow;
      g.calculationMethod = 'MAX';
    } else {
      g.grossRevenue = g.totalPay;
      g.primaryRow = g.rows[0]?.row || g.maxRow;
      g.calculationMethod = 'SUM';
    }
    g.allRowsCount = g.rows.length;
    g.driverCount = g.drivers.size;
    g.driversList = Array.from(g.drivers);

    const driverCounts = {};
    g.rows.forEach(item => {
      const d = normalizePayanoDriverName(String(item.row[colMap.colDriver] || '').trim());
      if (d) driverCounts[d] = (driverCounts[d] || 0) + 1;
    });
    g.driverCounts = driverCounts;

    if (g.driverCount > 1) {
      warnings.push({
        type: 'multi_driver_group',
        groupKey: g.key,
        groupType: g.type,
        drivers: g.driversList,
        driverCounts: driverCounts,
        rowCount: g.allRowsCount,
        message: 'WARNING: ' + g.type + ' ID ' + g.key + ' assigned to ' + g.driverCount + ' drivers. Manual review required.',
      });
    }
  });

  // Subdivide LOAD groups that have multiple drivers (1 Group ID = 1 Driver = 1 Company)
  const finalGroups = [];
  Object.values(groups).forEach(g => {
    if (g.type === 'LOAD' && g.driverCount > 1) {
      const perDriver = {};
      g.rows.forEach(item => {
        const d = normalizePayanoDriverName(String(item.row[colMap.colDriver] || '').trim());
        if (!d) return;
        if (!perDriver[d]) {
          perDriver[d] = { ...g, rows: [], totalPay: 0, maxPay: -Infinity, maxRow: null, drivers: new Set(), driverCounts: {} };
        }
        perDriver[d].rows.push(item);
        const p = parseMoney(item.row[colMap.colPay]);
        perDriver[d].totalPay += p;
        perDriver[d].drivers.add(d);
        perDriver[d].driverCounts[d] = (perDriver[d].driverCounts[d] || 0) + 1;
        if (p > perDriver[d].maxPay) {
          perDriver[d].maxPay = p;
          perDriver[d].maxRow = item.row;
        }
      });
      const driverOrder = [];
      g.rows.forEach(item => {
        const d = normalizePayanoDriverName(String(item.row[colMap.colDriver] || '').trim());
        if (d && !driverOrder.includes(d)) driverOrder.push(d);
      });
      Object.entries(perDriver).forEach(([drv, sub]) => {
        sub.originalKey = g.key;
        sub.key = g.key + '|' + drv;
        sub.primaryKey = g.key;
        sub.driver = drv;
        sub.primaryRow = sub.maxRow || sub.rows[0].row;
        sub.driverCount = 1;
        sub.driversList = [drv];
        sub.allRowsCount = sub.rows.length;
        sub.grossRevenue = sub.totalPay;
        sub.calculationMethod = 'SUM';
        sub.splitFromMultiDriver = true;
        sub.isFirstDriver = (driverOrder[0] === drv);
        finalGroups.push(sub);
      });
    } else {
      finalGroups.push(g);
    }
  });

  return {
    groups: finalGroups,
    ungroupedRows,
    multiDriverWarnings: warnings,
    stats: {
      totalBlockGroups: finalGroups.filter(g => g.type === 'BLOCK').length,
      totalLoadGroups: finalGroups.filter(g => g.type === 'LOAD').length,
    },
  };
}

export function payanoGroupByBlock(rows, colMap, appRef) {
  const result = payanoGroupItems(rows, colMap, appRef);
  return {
    blocks: result.groups,
    ungroupedRows: result.ungroupedRows,
    multiDriverWarnings: result.multiDriverWarnings,
  };
}

// ============================================================
// STEP 2: Classify blocks (in-period, deferred, cancelled, etc.)
// ============================================================
export function payanoClassifyBlocks(blocks, rangeStart, rangeEnd, colMap, settings) {
  const inPeriod = [];
  const lastDayExcluded = [];
  const deferred = [];
  const cancelled = [];
  const beforeRange = [];
  const afterRange = [];

  const dateColumn = (settings && settings.payanoDateColumn) || 'stop1';
  const cutoffTime = (settings && settings.payanoCutoffTime) || '00:00';
  const lastDayToNextWeek = !!(settings && settings.payanoLastDayToNextWeek);
  const includeZeroPay = !!(settings && settings.payanoIncludeZeroPay);

  const startDate = new Date(rangeStart);
  startDate.setHours(0, 0, 0, 0);
  const endDate = new Date(rangeEnd);
  endDate.setHours(23, 59, 59, 999);

  const endDayOnly = new Date(endDate);
  endDayOnly.setHours(0, 0, 0, 0);

  const amazonData = (settings && settings.amazonInvoiceData) || null;
  const isInInvoice = (blockId) => {
    if (!amazonData) return false;
    if (amazonData.blocks && amazonData.blocks[blockId]) return true;
    if (amazonData.trips && amazonData.trips[blockId]) return true;
    return false;
  };

  blocks.forEach(block => {
    if (!block.maxRow) return;
    const stage = String(block.maxRow[colMap.colStage] || '').trim();
    const blockId = block.blockId;
    const pay = block.grossRevenue;
    const inInvoice = isInInvoice(blockId);

    if (inInvoice && pay !== 0) {
      inPeriod.push({ block, reason: 'En Amazon invoice', stage, inInvoice: true });
      return;
    }

    if (PAYANO_DEFERRED_PATTERNS.some(p => p.test(stage))) {
      deferred.push({ block, reason: `"${stage}" — pago diferido`, stage });
      return;
    }

    if (PAYANO_CANCELLED_PATTERNS.some(p => p.test(stage))) {
      if (pay <= 0) {
        cancelled.push({ block, reason: `"${stage}"`, stage });
        return;
      }
    }

    if (pay === 0 && !includeZeroPay) {
      cancelled.push({ block, reason: 'Pago $0', stage });
      return;
    }

    let arrivalDate = null;
    if (dateColumn === 'stop2') {
      const findCol = (name) => {
        const target = name.toLowerCase().replace(/\s+/g, ' ').trim();
        for (const k of Object.keys(block.maxRow)) {
          if (k.toLowerCase().replace(/\s+/g, ' ').trim() === target) return block.maxRow[k];
        }
        return '';
      };
      const stop2DateStr = findCol('Stop 2 Actual Departure Date') || findCol('Stop 2  Actual Departure Date');
      const stop2TimeStr = findCol('Stop 2 Actual Departure Time') || findCol('Stop 2  Actual Departure Time');
      if (stop2DateStr) {
        arrivalDate = parseDate(stop2DateStr);
        if (arrivalDate && stop2TimeStr) {
          const t = String(stop2TimeStr).match(/^(\d{1,2}):(\d{2})/);
          if (t) arrivalDate.setHours(+t[1], +t[2], 0, 0);
        }
      }
      if (!arrivalDate) {
        arrivalDate = parseDate(block.maxRow[colMap.colDate]);
      }
    } else {
      arrivalDate = parseDate(block.maxRow[colMap.colDate]);
    }

    if (!arrivalDate) {
      cancelled.push({ block, reason: 'Sin fecha', stage });
      return;
    }

    if (arrivalDate < startDate) {
      beforeRange.push({ block, reason: 'Antes del rango', stage });
      return;
    }
    if (arrivalDate > endDate) {
      afterRange.push({ block, reason: 'Después del rango', stage });
      return;
    }

    if (lastDayToNextWeek) {
      const depDay = new Date(arrivalDate);
      depDay.setHours(0, 0, 0, 0);
      const isLastDay = depDay.getTime() === endDayOnly.getTime();
      if (isLastDay) {
        lastDayExcluded.push({ block, reason: 'Último día del período (mueve a la siguiente semana)', stage });
        return;
      }
    }

    inPeriod.push({ block, reason: 'OK', stage });
  });

  return { inPeriod, lastDayExcluded, deferred, cancelled, beforeRange, afterRange };
}

// ============================================================
// STEP 3: Build trips for in-period groups
// ============================================================
export function payanoBuildTrips(classified, colMap, settings) {
  const useDominantDriver = !!(settings && settings.payanoUseDominantDriver);
  const amazonData = (settings && settings.amazonInvoiceData) || null;

  return classified.inPeriod.map(({ group, block }) => {
    const g = group || block;
    const r = g.primaryRow || g.maxRow;
    const isLoad = g.type === 'LOAD';

    let driverValue = String(r[colMap.colDriver] || '').trim();
    if (useDominantDriver && g.dominantDriver) {
      driverValue = g.dominantDriver;
    }

    let grossRevenue = g.grossRevenue;
    let inInvoice = false;
    let invoiceNumber = '';
    let invoiceDate = '';

    if (g.splitFromMultiDriver) {
      if (g.isFirstDriver && amazonData) {
        let invTotal = 0;
        if (amazonData.trips && amazonData.trips[g.originalKey || g.key]) {
          invTotal = amazonData.trips[g.originalKey || g.key].total || 0;
        } else if (amazonData.blocks && amazonData.blocks[g.originalKey || g.key]) {
          invTotal = amazonData.blocks[g.originalKey || g.key].total || 0;
        }
        if (Math.abs(invTotal) > 0) {
          grossRevenue = invTotal;
          inInvoice = true;
          invoiceNumber = amazonData.trips[g.originalKey || g.key]?.invoiceNumber
            || amazonData.blocks[g.originalKey || g.key]?.invoiceNumber || '';
          invoiceDate = amazonData.trips[g.originalKey || g.key]?.invoiceDate
            || amazonData.blocks[g.originalKey || g.key]?.invoiceDate || '';
        } else {
          grossRevenue = 0;
        }
      } else {
        grossRevenue = 0;
      }
    } else if (amazonData && (Object.keys(amazonData.trips || {}).length + Object.keys(amazonData.blocks || {}).length > 0)) {
      if (!isLoad && amazonData.blocks && amazonData.blocks[g.key]) {
        const inv = amazonData.blocks[g.key];
        if (Math.abs(inv.total || 0) > 0) {
          grossRevenue = inv.total;
          inInvoice = true;
          invoiceNumber = inv.invoiceNumber || '';
          invoiceDate = inv.invoiceDate || '';
        }
      } else if (isLoad && amazonData.trips && amazonData.trips[g.originalKey || g.key]) {
        const inv = amazonData.trips[g.originalKey || g.key];
        if (Math.abs(inv.total || 0) > 0) {
          grossRevenue = inv.total;
          inInvoice = true;
          invoiceNumber = inv.invoiceNumber || '';
          invoiceDate = inv.invoiceDate || '';
        }
      } else {
        grossRevenue = 0;
      }
    }

    const groupKey = g.originalKey || g.key;
    const isOverriddenByAmazon = (grossRevenue !== g.grossRevenue);
    const finalMethod = isOverriddenByAmazon ? (inInvoice ? 'INVOICE' : 'CSV') : g.calculationMethod;
    const trip = {
      driver: driverValue,
      pay: grossRevenue,
      payOriginal: g.grossRevenue,
      payOverridden: isOverriddenByAmazon,
      inInvoice: inInvoice,
      invoiceNumber: invoiceNumber,
      invoiceDate: invoiceDate,
      noInvoiceFound: !inInvoice && amazonData && (Object.keys(amazonData.trips || {}).length + Object.keys(amazonData.blocks || {}).length > 0),
      contractId: String(r[colMap.colContract] || '').trim(),
      blockId: isLoad ? '' : groupKey,
      tripId: isLoad ? groupKey : '',
      primaryKey: groupKey,
      type: g.type,
      calculationMethod: finalMethod,
      tractor: String(r[colMap.colTractor] || '').trim().toUpperCase(),
      date: parseDate(r[colMap.colDate]) ? parseDate(r[colMap.colDate]).toISOString() : null,
      stage: String(r[colMap.colStage] || '').trim(),
      miles: colMap.colMiles ? parseFloat(String(r[colMap.colMiles] || '0').replace(/[^\d.]/g, '')) || 0 : 0,
      rowsCount: g.allRowsCount,
    };
    if (g.splitFromMultiDriver) trip.splitFromMultiDriver = true;
    if (isOverriddenByAmazon) trip.amazonInvoice = true;
    return trip;
  });
}

// ============================================================
// STEP 3b: Add ORPHAN trips from Amazon invoice (SPOT/Load Board)
// ============================================================
export function payanoAddOrphanInvoiceTrips(csvTrips, amazonData, colMap, appRef) {
  if (!amazonData) return { trips: csvTrips, expenses: [], tripIdLookup: {}, routeDriverLookup: {}, contractIdLookup: {} };
  const expenses = [];
  const existingKeys = new Set();
  csvTrips.forEach(t => {
    if (t.primaryKey) existingKeys.add(t.primaryKey);
    if (t.blockId) existingKeys.add(t.blockId);
    if (t.tripId) existingKeys.add(t.tripId);
  });

  const tripIdLookup = {};
  const contractIdLookup = {};
  const routeDriverLookup = {};

  // Scan saved invoices
  if (appRef && appRef.invoices) {
    appRef.invoices.forEach(inv => {
      (inv.trips || []).forEach(t => {
        const primaryKey = t.primaryKey || t.blockId || t.tripId;
        if (primaryKey && t.driver && !tripIdLookup[primaryKey]) {
          tripIdLookup[primaryKey] = { driver: t.driver, tractor: t.tractor || '' };
        }
        if (t.contractId && t.driver && !contractIdLookup[t.contractId]) {
          contractIdLookup[t.contractId] = { driver: t.driver, tractor: t.tractor || '' };
        }
      });
    });
  }

  if (appRef && appRef.pendingFiles) {
    appRef.pendingFiles.forEach(f => {
      (f.rows || []).forEach(r => {
        const blockId = String(r[colMap.colBlock] || '').trim();
        const tripId = String(r[colMap.colTrip] || '').trim();
        const loadId = String(r['Load ID'] || r['LoadID'] || r['loadId'] || r['load_id'] || '').trim();
        const contractId = String(r['Contract ID'] || r['ContractID'] || r['contractId'] || r['contract_id'] || '').trim();
        const driver = String(r[colMap.colDriver] || '').trim();
        const tractor = String(r[colMap.colTractor] || '').trim();
        const route = String(r['Facility Sequence'] || r['Domicile/Route'] || r['Route'] || r['route'] || '').trim();
        if (tripId && driver && !tripIdLookup[tripId]) tripIdLookup[tripId] = { driver, tractor };
        if (loadId && driver && !tripIdLookup[loadId]) tripIdLookup[loadId] = { driver, tractor };
        if (blockId && driver && !tripIdLookup[blockId]) tripIdLookup[blockId] = { driver, tractor };
        if (contractId && driver && !contractIdLookup[contractId]) contractIdLookup[contractId] = { driver, tractor };
        if (route && driver && !routeDriverLookup[route]) routeDriverLookup[route] = { driver, tractor };
      });
    });
  }

  if (amazonData) {
    Object.entries(amazonData.trips || {}).forEach(([tripId, t]) => {
      if (!tripIdLookup[tripId] && t.driver) {
        tripIdLookup[tripId] = { driver: t.driver, tractor: t.tractor || '' };
      }
      if (t.contractId && !contractIdLookup[t.contractId] && t.driver) {
        contractIdLookup[t.contractId] = { driver: t.driver, tractor: t.tractor || '' };
      }
    });
    Object.entries(amazonData.blocks || {}).forEach(([blockId, t]) => {
      if (!tripIdLookup[blockId] && t.driver) {
        tripIdLookup[blockId] = { driver: t.driver, tractor: t.tractor || '' };
      }
    });
  }

  const orphanTrips = [];
  Object.entries(amazonData.trips || {}).forEach(([tripId, inv]) => {
    if (existingKeys.has(tripId)) return;
    const isMainInvoice = !inv.invoiceType || inv.invoiceType === 'Main Invoice';
    const isPositiveDebit = inv.invoiceType === 'Debit Memo' && Number(inv.total || 0) > 0;
    if (!isMainInvoice && !isPositiveDebit) return;
    const lookup = tripIdLookup[tripId] || routeDriverLookup[inv.route || ''] || {};
    const driver = lookup.driver || inv.driver || '';
    const tractor = lookup.tractor || inv.tractor || '';
    orphanTrips.push({
      driver, pay: inv.total || 0, payOriginal: inv.total || 0, payOverridden: true,
      inInvoice: true, invoiceNumber: inv.invoiceNumber || '', invoiceDate: inv.invoiceDate || '',
      noInvoiceFound: false, contractId: inv.contractId || '', blockId: '', tripId,
      primaryKey: tripId, type: 'LOAD', calculationMethod: 'INVOICE-ORPHAN',
      tractor: String(tractor).trim().toUpperCase(), date: inv.date || null,
      stage: 'Completed', miles: 0, rowsCount: 0, orphanFromInvoice: true,
    });
  });

  Object.entries(amazonData.blocks || {}).forEach(([blockId, inv]) => {
    if (existingKeys.has(blockId)) return;
    const isMainInvoice = !inv.invoiceType || inv.invoiceType === 'Main Invoice';
    const isPositiveDebit = inv.invoiceType === 'Debit Memo' && Number(inv.total || 0) > 0;
    if (!isMainInvoice && !isPositiveDebit) return;
    const lookup = tripIdLookup[blockId] || {};
    const driver = lookup.driver || inv.driver || '';
    const tractor = lookup.tractor || inv.tractor || '';
    orphanTrips.push({
      driver, pay: inv.total || 0, payOriginal: inv.total || 0, payOverridden: true,
      inInvoice: true, invoiceNumber: inv.invoiceNumber || '', invoiceDate: inv.invoiceDate || '',
      noInvoiceFound: false, contractId: inv.contractId || '', blockId, tripId: '',
      primaryKey: blockId, type: 'BLOCK', calculationMethod: 'INVOICE-ORPHAN',
      tractor: String(tractor).trim().toUpperCase(), date: inv.date || null,
      stage: 'Completed', miles: 0, rowsCount: 0, orphanFromInvoice: true,
    });
  });

  return { trips: csvTrips.concat(orphanTrips), expenses, tripIdLookup, routeDriverLookup, contractIdLookup };
}


/* ============================================
   SEALED MULTI-DRIVER + OVERRIDE FUNCTIONS
   Extracted VERBATIM from nomina_public/index.html (lines 2956-3224).
   DO NOT MODIFY. Logic identical to monolith.
   ============================================================ */

export function resolveMultiDriverBlock(keyId, chosenDriver) {
  const p = APP.currentInvoicePreview;
  if (!p || !p.payanoResult) return;
  const r = p.payanoResult;

  // Find the group in any of the classification buckets.
  // The new dual-model engine uses "group" instead of "block" and key === primaryKey.
  const findGroup = (bucket) => {
    if (!bucket) return null;
    const entry = bucket.find(b => {
      const g = b.group || b.block;
      return g && (g.key === keyId || g.blockId === keyId);
    });
    return entry ? (entry.group || entry.block) : null;
  };

  const group = findGroup(r.classified.inPeriod)
             || findGroup(r.classified.lastDayExcluded)
             || findGroup(r.classified.deferred)
             || findGroup(r.classified.cancelled)
             || findGroup(r.classified.beforeRange)
             || findGroup(r.classified.afterRange);

  if (!group) return toast('Bloque/Load no encontrado: ' + keyId, 'error');

  // Find the driver column (flexible: any column containing "driver")
  const findDriverKey = (row) => {
    if (!row) return null;
    return Object.keys(row).find(k => k.toLowerCase().includes('driver'));
  };

  // Update ALL rows of this group to use the chosen driver
  group.rows.forEach(item => {
    const dk = findDriverKey(item.row);
    if (dk) item.row[dk] = chosenDriver;
  });
  // Update primaryRow too
  if (group.primaryRow) {
    const dk = findDriverKey(group.primaryRow);
    if (dk) group.primaryRow[dk] = chosenDriver;
  }
  // Update maxRow too (for BLOCK model)
  if (group.maxRow) {
    const dk = findDriverKey(group.maxRow);
    if (dk) group.maxRow[dk] = chosenDriver;
  }

  // Clear the warning for this key
  r.multiDriverWarnings = r.multiDriverWarnings.filter(w => w.groupKey !== keyId && w.blockId !== keyId);

  // Recalculate affected trips
  if (p.payanoMode) {
    // Find the bucket the group lives in
    const buckets = ['inPeriod', 'lastDayExcluded', 'deferred', 'cancelled', 'beforeRange', 'afterRange'];
    let sourceBucket = null;
    let sourceKey = null;
    for (const bName of buckets) {
      if (r.classified[bName] && r.classified[bName].find(b => {
        const g = b.group || b.block;
        return g && (g.key === keyId || g.blockId === keyId);
      })) {
        sourceBucket = r.classified[bName];
        sourceKey = bName;
        break;
      }
    }
    if (sourceBucket) {
      // Remove from inRange/pending any trip with this key
      p.inRange = p.inRange.filter(t => t.primaryKey !== keyId && t.blockId !== keyId);
      p.pending = p.pending.filter(t => t.primaryKey !== keyId && t.blockId !== keyId);
      // Rebuild the trip from the updated group
      const colMap = p.colMap;
      const rebuiltBucket = {};
      rebuiltBucket[sourceKey] = sourceBucket.filter(b => {
        const g = b.group || b.block;
        return g && (g.key === keyId || g.blockId === keyId);
      });
      const rebuilt = payanoBuildTrips(rebuiltBucket, colMap);
      if (sourceKey === 'inPeriod') {
        p.inRange = p.inRange.concat(rebuilt);
      } else {
        p.pending = p.pending.concat(rebuilt);
      }
    }
  }

  // Update dashboard totals
  p.totalGross = p.inRange.reduce((s, t) => s + t.pay, 0);
  p.totalCommission = p.totalGross * (p.commissionPct / 100);
  p.totalToCompanies = p.totalGross - p.totalCommission;

  toast(`✅ ${keyId} asignado a ${chosenDriver}`, 'success');
  // Re-render the preview
  navigate('invoice');
}


export function findNearbyBlocks(p) {
  const r = p.payanoResult;
  if (!r || !r.classified) return { dayBefore: [], dayAfter: [] };
  const from = new Date(p.from);
  from.setHours(0, 0, 0, 0);
  const to = new Date(p.to);
  to.setHours(23, 59, 59, 999);
  const dayBeforeDate = new Date(from);
  dayBeforeDate.setDate(dayBeforeDate.getDate() - 1);
  const dayAfterDate = new Date(to);
  dayAfterDate.setDate(dayAfterDate.getDate() + 1);

  const dayBeforeKey = fmtDateInput(dayBeforeDate);
  const dayAfterKey = fmtDateInput(dayAfterDate);

  const beforeGroups = (r.classified.beforeRange || []).map(e => ({ entry: e, type: 'before' }));
  const afterGroups = (r.classified.afterRange || []).map(e => ({ entry: e, type: 'after' }));
  const lastDay = (r.classified.lastDayExcluded || []).map(e => ({ entry: e, type: 'lastday' }));
  const all = [...beforeGroups, ...afterGroups, ...lastDay];

  const dayBeforeList = [];
  const dayAfterList = [];
  all.forEach(({ entry, type }) => {
    const g = entry.group || entry.block;
    if (!g || !g.primaryRow) return;
    const dateStr = g.primaryRow[p.colMap?.colDate] || g.primaryRow['Stop 1  Actual Arrival Date'] || '';
    const arrivalDate = parseDate(dateStr);
    if (!arrivalDate) return;
    const k = fmtDateInput(arrivalDate);
    if (type === 'before' && k === dayBeforeKey) {
      dayBeforeList.push({ group: g, type: 'before' });
    } else if (type === 'after' && k === dayAfterKey) {
      dayAfterList.push({ group: g, type: 'after' });
    } else if (type === 'lastday' && k === dayAfterKey) {
      // lastDay excluded blocks land on the range end day; we want day AFTER (= end+1)
      dayAfterList.push({ group: g, type: 'lastday' });
    }
  });

  return { dayBefore: dayBeforeList, dayAfter: dayAfterList, dayBeforeKey, dayAfterKey };
}


export function applyNearbyBlocksSelection() {
  const p = APP.currentInvoicePreview;
  if (!p) return;
  const r = p.payanoResult;
  const cbs = document.querySelectorAll('.nearby-block-cb');
  const nearby = findNearbyBlocks(p);
  let movedToInPeriod = 0;
  let keptAsPending = 0;
  cbs.forEach(cb => {
    const when = cb.dataset.when;
    const idx = parseInt(cb.dataset.idx, 10);
    const item = nearby[when === 'before' ? 'dayBefore' : 'dayAfter'][idx];
    if (!item) return;
    const g = item.group;
    // Find which bucket the group is currently in
    const buckets = ['beforeRange', 'afterRange', 'lastDayExcluded'];
    let foundBucket = null;
    for (const bName of buckets) {
      if (r.classified[bName] && r.classified[bName].find(b => {
        const gg = b.group || b.block;
        return gg && (gg.key === g.key || gg.blockId === g.key);
      })) {
        foundBucket = bName;
        break;
      }
    }
    if (!foundBucket) return;

    if (cb.checked) {
      // Move to inPeriod
      const entry = r.classified[foundBucket].find(b => {
        const gg = b.group || b.block;
        return gg && (gg.key === g.key || gg.blockId === g.key);
      });
      r.classified[foundBucket] = r.classified[foundBucket].filter(b => b !== entry);
      r.classified.inPeriod.push(entry);
      // Add a trip
      const colMap = p.colMap;
      const rebuilt = payanoBuildTrips({ inPeriod: [entry] }, colMap);
      p.inRange = p.inRange.concat(rebuilt);
      movedToInPeriod++;
    } else {
      keptAsPending++;
    }
  });
  // Recompute totals
  p.totalGross = p.inRange.reduce((s, t) => s + t.pay, 0);
  p.totalCommission = p.totalGross * (p.commissionPct / 100);
  p.totalToCompanies = p.totalGross - p.totalCommission;
  toast(`✅ ${movedToInPeriod} agregado(s) al pago actual · ${keptAsPending} quedan pendientes`, 'success');
  navigate('invoice');
}


export function setPayOverride(primaryKey, driver, newPay) {
  const p = APP.currentInvoicePreview;
  if (!p) return;
  const v = parseFloat(newPay);
  if (isNaN(v) || v < 0) return;
  const trip = p.inRange.find(t => t.primaryKey === primaryKey && (!driver || t.driver === driver));
  if (!trip) return toast('Trip no encontrado: ' + primaryKey, 'error');
  const old = trip.pay;
  trip.pay = v;
  trip.payOverridden = (v !== trip.payOriginal);
  // Update visible totals in place
  updateInvoiceTotals();
  // Style the input to indicate override
  const input = document.querySelector(`input[data-pk="${CSS.escape(primaryKey)}"][data-driver="${CSS.escape(driver || '')}"]`);
  if (input) {
    input.style.background = trip.payOverridden ? '#fef3c7' : '';
    input.style.borderColor = trip.payOverridden ? '#f59e0b' : '#d1d5db';
  }
  toast(`💰 ${primaryKey}: $${old.toFixed(2)} → $${v.toFixed(2)}`, trip.payOverridden ? 'success' : 'info');
}
