/* ============================================
   engine/seedData.js — Default seed data
   Phase 2 — Modular architecture
   ============================================================
   For SaaS version, the PAYANO_DEFAULT_* maps are EMPTY —
   users create their own companies/drivers. seedPayanoDefaults()
   is a no-op for the public/SaaS build (nomina_public).
   ============================================================ */

// In nomina_public (SaaS build) these are intentionally empty.
const PAYANO_DEFAULT_DRIVER_COMPANIES = {};
const PAYANO_DEFAULT_DRIVER_TRACTORS = {};

/**
 * Seed default companies/drivers from the PAYANO_DEFAULT_* maps.
 * No-op when the maps are empty (SaaS / public version).
 * Idempotent: only seeds if there are no existing companies.
 */
export function seedPayanoDefaults(appRef, callbacks) {
  if (!appRef) return;
  if ((appRef.companies || []).length > 0) return;

  const now = new Date().toISOString();
  const companyNames = Array.from(new Set(Object.values(PAYANO_DEFAULT_DRIVER_COMPANIES || {})));
  const companyIds = {};

  const companyNamesByDriver = {};
  Object.entries(PAYANO_DEFAULT_DRIVER_COMPANIES || {}).forEach(([driverName, companyName]) => {
    if (!companyNamesByDriver[companyName]) companyNamesByDriver[companyName] = new Set();
    const driverTractors = (PAYANO_DEFAULT_DRIVER_TRACTORS && PAYANO_DEFAULT_DRIVER_TRACTORS[driverName]) || [];
    driverTractors.forEach(t => companyNamesByDriver[companyName].add(t));
  });

  companyNames.forEach(name => {
    const id = (callbacks && callbacks.uid) ? callbacks.uid() : `co_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
    companyIds[name] = id;
    appRef.companies.push({
      id,
      name,
      tractors: Array.from(companyNamesByDriver[name] || []),
      defaultPct: 90,
      isOwner: /payano express/i.test(name),
      createdAt: now,
      updatedAt: now,
    });
  });

  if (typeof appRef.saveCompanies === 'function') appRef.saveCompanies();

  Object.entries(PAYANO_DEFAULT_DRIVER_COMPANIES || {}).forEach(([driverName, companyName]) => {
    appRef.drivers.push({
      id: (callbacks && callbacks.uid) ? callbacks.uid() : `dr_${Date.now()}_${Math.random().toString(36).slice(2,8)}`,
      name: driverName,
      companyId: companyIds[companyName] || null,
      pct: 85,
      payType: 'percentage',
      status: 'Activo',
      createdAt: now,
    });
  });

  if (typeof appRef.saveDrivers === 'function') appRef.saveDrivers();
}

export { PAYANO_DEFAULT_DRIVER_COMPANIES, PAYANO_DEFAULT_DRIVER_TRACTORS };