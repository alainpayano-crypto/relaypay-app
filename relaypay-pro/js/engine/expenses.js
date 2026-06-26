/* ============================================
   engine/expenses.js — Extract / track expenses
   Phase 2 — Modular architecture
   ============================================================
   Logic IDENTICAL to nomina_public/index.html.
   ============================================================ */

export function payanoExtractExpenses(amazonData, tripIdLookup, routeDriverLookup, contractIdLookup) {
  if (!amazonData) return [];

  const expenses = [];

  // 1) Process all invoice files for line-item-level expenses
  (amazonData.allLineItems || []).forEach(li => {
    const itemType = String(li.item || '').toLowerCase();
    const gross = Number(li.gross || 0);
    if (gross >= 0) return;

    let category = 'Adjustment';
    let subType = itemType;
    if (/toll.*recover|trailer.*toll/i.test(itemType)) {
      category = 'Toll Deduction';
    } else if (/cancel/i.test(itemType) && Math.abs(gross) > 0) {
      category = 'Adjustment';
    }

    const tripId = li.tripId || li.loadId || li.blockId;
    let lookup = tripIdLookup[tripId];
    if (!lookup && tripId) {
      const stripped = String(tripId).replace(/^[TB]-/, '');
      if (tripIdLookup[stripped]) lookup = tripIdLookup[stripped];
      else if (tripIdLookup['T-' + stripped]) lookup = tripIdLookup['T-' + stripped];
      else if (tripIdLookup['B-' + stripped]) lookup = tripIdLookup['B-' + stripped];
    }
    if (!lookup && li.contractId && contractIdLookup) lookup = contractIdLookup[li.contractId];
    if (!lookup) lookup = routeDriverLookup[li.route || ''] || {};
    const driver = lookup.driver || '';
    const tractor = lookup.tractor || '';

    expenses.push({
      invoiceNumber: li.invoiceNumber,
      invoiceDate: li.invoiceDate,
      carrier: li.carrier,
      blockId: li.blockId || '',
      tripId: li.tripId || '',
      loadId: li.loadId || '',
      contractId: li.contractId || '',
      itemType: li.item,
      category,
      subType,
      amount: gross,
      absoluteAmount: Math.abs(gross),
      driver,
      tractor,
      route: li.route || '',
    });
  });

  // 2) Process invoice TRIPS that are adjustments/credits/debits
  Object.entries(amazonData.trips || {}).forEach(([tripId, inv]) => {
    const total = Number(inv.total || 0);
    if (inv.invoiceType === 'Main Invoice') return;
    if (total > 0) return;

    let category = 'Adjustment';
    if (/toll.*recover|trailer.*toll|toll/i.test(inv.itemType || '')) {
      category = 'Toll Deduction';
    } else if (inv.invoiceType === 'Credit Memo') {
      category = 'Credit';
    } else if (inv.invoiceType === 'Debit Memo') {
      category = 'Debit';
    }

    let lookup = tripIdLookup[tripId];
    if (!lookup && tripId) {
      const stripped = String(tripId).replace(/^[TB]-/, '');
      if (tripIdLookup[stripped]) lookup = tripIdLookup[stripped];
      else if (tripIdLookup['T-' + stripped]) lookup = tripIdLookup['T-' + stripped];
      else if (tripIdLookup['B-' + stripped]) lookup = tripIdLookup['B-' + stripped];
    }
    if (!lookup && inv.contractId && contractIdLookup) lookup = contractIdLookup[inv.contractId];
    if (!lookup) lookup = routeDriverLookup[inv.route || ''] || {};
    const driver = inv.driver || lookup.driver || '';
    const tractor = inv.tractor || lookup.tractor || '';

    expenses.push({
      invoiceNumber: inv.invoiceNumber,
      invoiceDate: inv.invoiceDate,
      blockId: '',
      tripId,
      loadId: '',
      contractId: inv.contractId || '',
      itemType: inv.itemType || '',
      category,
      subType: inv.invoiceType,
      amount: total,
      absoluteAmount: Math.abs(total),
      driver,
      tractor,
      route: inv.route || '',
    });
  });

  // 3) Process invoice BLOCKS that are pure adjustments
  Object.entries(amazonData.blocks || {}).forEach(([blockId, inv]) => {
    if (inv.invoiceType && inv.invoiceType === 'Main Invoice') return;
    const total = Number(inv.total || 0);

    let category = 'Adjustment';
    if (/toll.*recover|trailer.*toll|toll/i.test(inv.itemType || '')) {
      category = 'Toll Deduction';
    } else if (inv.invoiceType === 'Credit Memo') {
      category = 'Credit';
    } else if (inv.invoiceType === 'Debit Memo') {
      category = 'Debit';
    }

    let lookup = tripIdLookup[blockId];
    if (!lookup && blockId) {
      const stripped = String(blockId).replace(/^B-/, '');
      if (tripIdLookup[stripped]) lookup = tripIdLookup[stripped];
      else if (tripIdLookup['B-' + stripped]) lookup = tripIdLookup['B-' + stripped];
    }
    if (!lookup && inv.contractId && contractIdLookup) lookup = contractIdLookup[inv.contractId];
    const driver = lookup?.driver || '';
    const tractor = lookup?.tractor || '';

    expenses.push({
      invoiceNumber: inv.invoiceNumber,
      invoiceDate: inv.invoiceDate,
      blockId,
      tripId: '',
      loadId: '',
      contractId: inv.contractId || '',
      itemType: inv.itemType || '',
      category,
      subType: inv.invoiceType,
      amount: total,
      absoluteAmount: Math.abs(total),
      driver,
      tractor,
      route: '',
    });
  });

  return expenses;
}

export function trackPendingTolls(expenses, appRef, persistFn) {
  if (!appRef) return;
  if (!appRef.pendingTolls) appRef.pendingTolls = [];

  let pendingTolls = appRef.pendingTolls;
  const now = new Date().toISOString();
  const manualAssignments = appRef.tollAssignments || {};

  expenses.forEach(e => {
    if (e.category !== 'Toll Deduction') return;

    const key = `${e.invoiceNumber || 'X'}-${e.tripId || e.blockId || e.loadId || 'X'}`;
    let companyId = e._assignedCompanyId;

    if (!companyId && manualAssignments[key]) companyId = manualAssignments[key];

    if (!companyId && e.driver && appRef.findDriverByName) {
      const reg = appRef.findDriverByName(e.driver);
      if (reg && reg.companyId) companyId = reg.companyId;
    }

    if (!companyId && e.tractor && appRef.findCompanyByTractor) {
      const tc = appRef.findCompanyByTractor(e.tractor);
      if (tc) companyId = tc.id;
    }

    e._resolvedCompanyId = companyId || null;

    if (!companyId) {
      const existing = pendingTolls.find(p =>
        p.invoiceNumber === e.invoiceNumber &&
        (p.tripId === e.tripId || p.blockId === e.blockId) &&
        Math.abs(p.amount - e.amount) < 0.01
      );
      if (existing) {
        existing.lastSeenAt = now;
        existing.count = (existing.count || 1) + 1;
        existing.amount = e.amount;
        existing.route = e.route || existing.route;
      } else {
        pendingTolls.push({
          id: key,
          invoiceNumber: e.invoiceNumber,
          invoiceDate: e.invoiceDate,
          tripId: e.tripId,
          blockId: e.blockId,
          loadId: e.loadId,
          contractId: e.contractId,
          route: e.route,
          driver: e.driver,
          tractor: e.tractor,
          amount: e.amount,
          itemType: e.itemType,
          status: 'PENDIENTE',
          addedAt: now,
          lastSeenAt: now,
          count: 1,
          weeksUnpaid: 0,
        });
      }
    } else {
      const idx = pendingTolls.findIndex(p =>
        p.invoiceNumber === e.invoiceNumber &&
        (p.tripId === e.tripId || p.blockId === e.blockId)
      );
      if (idx >= 0) pendingTolls.splice(idx, 1);
    }
  });

  pendingTolls.forEach(p => {
    const lastSeen = new Date(p.lastSeenAt || p.addedAt || now);
    const daysSince = (Date.now() - lastSeen.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSince > 7) {
      p.weeksUnpaid = (p.weeksUnpaid || 0) + 1;
      p.lastSeenAt = now;
    }
    if (p.weeksUnpaid >= 4) p.status = 'DISPUTA';
  });

  appRef.pendingTolls = pendingTolls;
  if (typeof persistFn === 'function') {
    persistFn('relaypay_pending_tolls', pendingTolls);
  }

  expenses.forEach(e => {
    if (e.category === 'Toll Deduction') {
      const key = `${e.invoiceNumber || 'X'}-${e.tripId || e.blockId || e.loadId || 'X'}`;
      const pending = pendingTolls.find(p => p.id === key);
      if (pending) {
        e._pendingWeeks = pending.weeksUnpaid || 0;
        e._pendingStatus = pending.status || 'PENDIENTE';
      }
    }
  });
}