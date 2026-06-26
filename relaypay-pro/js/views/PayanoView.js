/* ============================================
   views/PayanoView.js — Owner / multi-driver blocks
   Phase 2 — Modular architecture
   ============================================================
   The four sealed multi-driver functions (resolveMultiDriverBlock,
   findNearbyBlocks, applyNearbyBlocksSelection, setPayOverride) live in
   engine/payanoEngine.js (extracted VERBATIM from monolith lines 2956-3224).
   This view file keeps Payano-specific helpers only.
   ============================================================ */

import { escapeHtml, money, moneyShort, uid } from '../utils.js';

export function renderOwnerPayrollView(APP, ctx = {}) {
  const owner = APP.companies.find(c => c.isOwner);
  if (!owner) {
    return `
      <div class="view-header">
        <div>
          <h1 class="view-title">🤖 Conciliación AI</h1>
        </div>
      </div>
      <div class="card">
        <p>No tienes una empresa marcada como "Mi Compañía". Ve a <a href="#" data-action="navigate" data-view="companies">Empresas</a> y marca una con el checkbox "Mi Compañía".</p>
      </div>
    `;
  }

  const ownerTrips = [];
  APP.invoices.forEach(inv => {
    (inv.trips || []).forEach(t => {
      const c = APP.findCompanyByTractor(t.tractor);
      if (c && c.isOwner) ownerTrips.push({ ...t, invoiceLabel: inv.label, invoiceId: inv.id });
    });
  });

  const byDriver = {};
  ownerTrips.forEach(t => {
    if (!byDriver[t.driver]) byDriver[t.driver] = { driver: t.driver, trips: 0, gross: 0, miles: 0 };
    byDriver[t.driver].trips++;
    byDriver[t.driver].gross += t.pay || 0;
    byDriver[t.driver].miles += t.miles || 0;
  });

  return `
    <div class="view-header">
      <div>
        <h1 class="view-title">🤖 Conciliación AI</h1>
        <p class="view-subtitle">Análisis automático del CSV — Multi-driver blocks, near blocks, pay overrides</p>
      </div>
    </div>

    <div class="card">
      <div class="card-title">📋 Reglas del Motor</div>
      <ul style="padding-left: 24px;">
        <li><b>INVOICE = MONEY (gold standard)</b> — Amazon invoice es la única fuente de revenue</li>
        <li><b>Block IDs "B-" = MAX</b>, Trip IDs = SUM</li>
        <li><b>1 Block = 1 Driver = 1 Company</b> — no cross-company, no revenue splitting</li>
        <li><b>Multi-driver trips</b> — First driver (CSV order) gets full invoice, others get 0</li>
      </ul>
    </div>

    <div class="card">
      <div class="card-title">👥 Tu Empresa: ${escapeHtml(owner.name)}</div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Chofer</th><th>Viajes</th><th>Millas</th><th class="text-right">Gross</th><th>Acciones</th></tr></thead>
          <tbody>
            ${Object.values(byDriver).map(d => `
              <tr>
                <td>${escapeHtml(d.driver)}</td>
                <td>${d.trips}</td>
                <td>${d.miles}</td>
                <td class="text-right money">${money(d.gross)}</td>
                <td>
                  <button class="btn btn-sm btn-primary" data-action="openOwnerDriverModal" data-driver="${escapeHtml(d.driver)}">💰</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

export function computeOwnerDriverPay(driver, trips) {
  return trips.reduce((s, t) => s + (t.pay || 0), 0);
}

export function applyDriverAdjustments(driver, gross) {
  return gross;
}
