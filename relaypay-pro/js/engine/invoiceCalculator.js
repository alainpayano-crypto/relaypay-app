/* ============================================
   engine/invoiceCalculator.js — Invoice totals (SEALED)
   Phase 2 — Modular architecture
   ============================================================
   Logic IDENTICAL to nomina_public/index.html (line 540 onward).
   DO NOT MODIFY the order of operations. Only `export` was added.
   ============================================================ */

/**
 * Compute invoice totals (gross, commission, to-companies).
 * @param {Object} invoice - invoice with .trips[]
 * @param {number} commissionPct - commission percentage (e.g. 10)
 * @returns {{totalGross:number, totalCommission:number, totalToCompanies:number, tripCount:number, contracts:Array, pct:number}}
 */
export function computeInvoiceTotals(invoice, commissionPct) {
  const pct = (commissionPct ?? APP.settings.commissionPct ?? 10) / 100;
  // Filter out excluded trips
  const validTrips = (invoice.trips || []).filter(t => !t.excluded);
  // Group by Contract ID
  const byContract = {};
  validTrips.forEach(t => {
    const cid = t.contractId || '(sin contract)';
    if (!byContract[cid]) {
      byContract[cid] = {
        contractId: cid,
        tractor: t.tractor,
        driver: t.driver,
        trips: [],
        total: 0,
      };
    }
    byContract[cid].trips.push(t);
    byContract[cid].total += Number(t.pay || 0);
  });
  const contracts = Object.values(byContract);
  const totalGross = contracts.reduce((s, c) => s + c.total, 0);
  const totalCommission = totalGross * pct;
  const totalToCompanies = totalGross - totalCommission;
  return {
    totalGross,
    totalCommission,
    totalToCompanies,
    tripCount: validTrips.length,
    contracts,
    pct,
  };
}

/**
 * Group trips by contractId.
 */
export function _groupInRangeByContract(inRangeTrips) {
  const byContract = {};
  inRangeTrips.forEach(t => {
    const cid = t.contractId || 'NO_CONTRACT';
    if (!byContract[cid]) byContract[cid] = [];
    byContract[cid].push(t);
  });
  return byContract;
}

/**
 * Group trips by driver+tractor pair (for payroll preview).
 */
export function _groupInRangeByDriverAndTractor(inRangeTrips) {
  const byPair = {};
  inRangeTrips.forEach(t => {
    const key = (t.driver || 'NO_DRIVER') + '|' + (t.tractor || 'NO_TRACTOR');
    if (!byPair[key]) byPair[key] = { driver: t.driver, tractor: t.tractor, trips: [], pay: 0, miles: 0 };
    byPair[key].trips.push(t);
    byPair[key].pay += (t.pay || 0);
    byPair[key].miles += (t.miles || 0);
  });
  return byPair;
}

/**
 * Sum toll deductions for a company in a given invoice preview.
 * @param {string} companyId
 * @param {Object} preview - APP.currentInvoicePreview
 * @returns {number}
 */
export function _sumTollDeductions(companyId, preview) {
  if (!preview || !preview.payanoResult || !preview.payanoResult.expenses) return 0;
  return preview.payanoResult.expenses
    .filter(e => e.category === 'Toll Deduction')
    .filter(e => e._assignedCompanyId === companyId)
    .reduce((s, e) => s + Math.abs(e.amount || 0), 0);
}

/**
 * Sum manual deductions from localStorage for a given company+invoice.
 * Uses APP.getCompanyDeductions() if available, else reads APP.legacyDeductions.
 * @param {string} companyId
 * @param {string|number|null} invoiceId
 * @param {Object} APP
 * @returns {number}
 */
export function _sumManualDeductions(companyId, invoiceId, APP) {
  let raw = [];
  if (typeof APP.getCompanyDeductions === 'function') {
    raw = APP.getCompanyDeductions();
  } else if (Array.isArray(APP.legacyDeductions)) {
    raw = APP.legacyDeductions;
  }
  return raw
    .filter(d => d.companyId === companyId && d.invoiceId === invoiceId)
    .reduce((s, d) => s + (d.amount || 0), 0);
}

/**
 * Read company deductions from localStorage (key: relaypay_company_deductions).
 * EXACT copy of monolith function getCompanyDeductions (line 11122).
 */
export function getCompanyDeductions() {
  try {
    if (typeof localStorage === 'undefined') return [];
    const stored = localStorage.getItem('relaypay_company_deductions');
    if (stored) return JSON.parse(stored);
  } catch (e) {}
  return [];
}

/**
 * Write company deductions to localStorage (key: relaypay_company_deductions).
 * EXACT copy of monolith function saveCompanyDeductions (line 11130).
 */
export function saveCompanyDeductions(list) {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem('relaypay_company_deductions', JSON.stringify(list));
}

/**
 * Compute the "net to collect" for a company given its gross revenue and deductions.
 *   gross - commission - tollDeductions - manualDeductions = finalNet
 *
 * Monolith signature: computeCompanyNetToCollect(companyId, companyGross, commissionPct, invoiceId)
 * Body is byte-identical to monolith line 11149. Uses globals APP and getCompanyDeductions.
 * For ES-module callers, those globals are wired via stateHelpers.js / AppState proxy.
 */
export function computeCompanyNetToCollect(companyId, companyGross, commissionPct, invoiceId) {
  const commission = companyGross * (commissionPct / 100);
  const netToCompany = companyGross - commission;

  // Sum toll deductions for this company in this invoice
  const preview = (typeof APP !== 'undefined') ? APP.currentInvoicePreview : null;
  let tollDeductions = 0;
  if (preview && preview.payanoResult && preview.payanoResult.expenses) {
    tollDeductions = preview.payanoResult.expenses
      .filter(e => e.category === 'Toll Deduction')
      .filter(e => e._assignedCompanyId === companyId)
      .reduce((s, e) => s + Math.abs(e.amount || 0), 0);
  }

  // Manual deductions from localStorage for this company+invoice
  const manualDeductions = getCompanyDeductions()
    .filter(d => d.companyId === companyId && d.invoiceId === invoiceId)
    .reduce((s, d) => s + (d.amount || 0), 0);

  const totalDeductions = tollDeductions + manualDeductions;
  const finalNet = netToCompany - totalDeductions;

  return {
    gross: companyGross,
    commission,
    commissionPct,
    netToCompany,
    tollDeductions,
    manualDeductions,
    totalDeductions,
    finalNet,
  };
}
