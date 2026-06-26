/* ============================================
   views/TollsView.js — Tolls management view
   Phase 2 — Modular architecture
   ============================================================ */

import { escapeHtml, money, normalizeTractor } from '../utils.js';

export function renderTollsView(APP, ctx = {}) {
  const all = [];
  (APP.invoices || []).forEach(inv => {
    const expenses = (inv.payanoResult && inv.payanoResult.expenses) || [];
    expenses.forEach((e, idx) => {
      if (e.category === 'Toll Deduction') {
        all.push({ ...e, sourceInvoice: inv.label, sourceInvoiceId: inv.id, globalIdx: all.length });
      }
    });
  });

  const autoAssigned = all.filter(e => e._resolvedCompanyId);
  const unassigned = all.filter(e => !e._resolvedCompanyId);

  return `
    <div class="view-header">
      <div>
        <h1 class="view-title" data-i18n="nav.tolls">🛣️ Peajes</h1>
        <p class="view-subtitle" data-i18n="tol.subtitle">Gestión de tolls y peajes pendientes</p>
      </div>
      <div class="btn-group">
        <button class="btn btn-secondary" data-action="rebuildTollCatalog">🔄 <span data-i18n="tol.rescan">Re-escanear Todo</span></button>
      </div>
    </div>

    <div class="alert alert-info">
      <div><b data-i18n="tol.how_it_works">ℹ️ Cómo funciona</b></div>
      <p data-i18n="tol.auto_debit_desc">El toll se descuenta del "A Cobrar" de la empresa en la factura final. Tu comisión NO se ve afectada.</p>
    </div>

    <div class="stats-grid">
      <div class="stat-card">
        <div class="label">📊 <span data-i18n="tol.stat_total">Total Tolls</span></div>
        <div class="value">${all.length}</div>
      </div>
      <div class="stat-card green">
        <div class="label">✅ <span data-i18n="tol.stat_auto">Auto-Asignados</span></div>
        <div class="value">${autoAssigned.length}</div>
      </div>
      <div class="stat-card purple">
        <div class="label">⚠️ <span data-i18n="tol.stat_unassigned">Sin Asignar</span></div>
        <div class="value">${unassigned.length}</div>
      </div>
      <div class="stat-card navy">
        <div class="label">💰 Total</div>
        <div class="value">${money(all.reduce((s, e) => s + Math.abs(e.amount || 0), 0))}</div>
      </div>
    </div>

    <div class="card">
      <div class="card-title" data-i18n="tol.debits_companies">🏢 Débitos a Empresas</div>
      ${all.length === 0 ? `
        <div class="empty-state">
          <div class="icon">🛣️</div>
          <p data-i18n="tol.empty">No hay tolls detectados. Procesa una factura Amazon para verlos aquí.</p>
        </div>
      ` : `
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Trip / Block</th>
                <th>Contract</th>
                <th>Driver</th>
                <th>Tractor</th>
                <th class="text-right">Monto</th>
                <th>Empresa</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              ${all.map(e => {
                const comp = e._resolvedCompanyId ? APP.companies.find(c => c.id === e._resolvedCompanyId) : null;
                return `
                  <tr>
                    <td><small>${escapeHtml(e.sourceInvoice || '—')}</small></td>
                    <td><code style="font-size:11px;">${escapeHtml(e.tripId || e.blockId || '—')}</code></td>
                    <td><code style="font-size:11px;">${escapeHtml(e.contractId || '—')}</code></td>
                    <td>${escapeHtml(e.driver || '—')}</td>
                    <td><code>${escapeHtml(e.tractor || '—')}</code></td>
                    <td class="text-right money">${money(Math.abs(e.amount || 0))}</td>
                    <td>${comp ? escapeHtml(comp.name) : '<span style="color:var(--danger);">⚠️ Sin asignar</span>'}</td>
                    <td>
                      ${!comp ? `<button class="btn btn-sm btn-primary" data-action="quickAssignToll" data-idx="${e.globalIdx}">Asignar</button>` : '✓'}
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      `}
    </div>

    ${(APP.pendingTolls && APP.pendingTolls.length > 0) ? `
      <div class="card">
        <div class="card-title">⏳ Tolls Pendientes (histórico)</div>
        <p style="font-size:13px; color:var(--text-light); margin-bottom:12px;">
          ${APP.pendingTolls.length} tolls arrastrados a futuras facturas.
        </p>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Trip</th>
                <th>Driver</th>
                <th>Tractor</th>
                <th class="text-right">Monto</th>
                <th>Estado</th>
                <th>Semanas</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              ${APP.pendingTolls.map(p => `
                <tr>
                  <td><small>${escapeHtml(p.invoiceNumber || '—')}</small></td>
                  <td><code style="font-size:11px;">${escapeHtml(p.tripId || p.blockId || '—')}</code></td>
                  <td>${escapeHtml(p.driver || '—')}</td>
                  <td><code>${escapeHtml(p.tractor || '—')}</code></td>
                  <td class="text-right money">${money(Math.abs(p.amount || 0))}</td>
                  <td><span class="badge badge-${p.status === 'DISPUTA' ? 'danger' : 'warning'}">${escapeHtml(p.status || 'PENDIENTE')}</span></td>
                  <td>${p.weeksUnpaid || 0}</td>
                  <td>
                    <select data-action="assignPendingToll" data-key="${escapeHtml(p.id)}" style="padding:4px;">
                      <option value="">— Asignar —</option>
                      ${APP.companies.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('')}
                    </select>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    ` : ''}
  `;
}

export function buildTollCatalog(APP) {
  // Triggered by "Re-escanear Todo" — rebuild pending tolls from existing invoices
  if (!APP.pendingTolls) APP.pendingTolls = [];
  // Note: full rebuild happens during payano engine run; this is a UI hint
}

export function quickAssignToll(APP, modalApi, globalIdx, callbacks = {}) {
  // globalIdx is the index in the rendered tolls array — derive key
  const all = [];
  (APP.invoices || []).forEach(inv => {
    const expenses = (inv.payanoResult && inv.payanoResult.expenses) || [];
    expenses.forEach(e => {
      if (e.category === 'Toll Deduction') {
        all.push({ ...e, sourceInvoiceId: inv.id });
      }
    });
  });
  const toll = all[globalIdx];
  if (!toll) return;

  const html = `
    <h2 class="modal-title">Asignar Toll a Empresa</h2>
    <p>Trip: <code>${escapeHtml(toll.tripId || toll.blockId)}</code> · Monto: <b>${money(Math.abs(toll.amount))}</b></p>
    <div class="form-group">
      <label>Empresa</label>
      <select id="quickAssignTollCompany" style="width:100%;">
        <option value="">— Selecciona empresa —</option>
        ${APP.companies.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('')}
      </select>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" data-action="closeModal">Cancelar</button>
      <button class="btn btn-primary" data-action="confirmQuickAssignToll" data-idx="${globalIdx}">Asignar</button>
    </div>
  `;
  if (modalApi?.open) modalApi.open(html);
}

export function confirmQuickAssignToll(APP, globalIdx, callbacks = {}) {
  const companyId = typeof document !== 'undefined' ? document.getElementById('quickAssignTollCompany')?.value : '';
  if (!companyId) {
    if (callbacks.toast) callbacks.toast('Selecciona una empresa', 'error');
    return;
  }
  // Rebuild and update _resolvedCompanyId
  const all = [];
  (APP.invoices || []).forEach(inv => {
    const expenses = (inv.payanoResult && inv.payanoResult.expenses) || [];
    expenses.forEach(e => {
      if (e.category === 'Toll Deduction') {
        all.push({ ...e, sourceInvoiceId: inv.id });
      }
    });
  });
  const toll = all[globalIdx];
  if (toll) {
    toll._resolvedCompanyId = companyId;
    // Persist assignment
    if (!APP.tollAssignments) APP.tollAssignments = {};
    const key = `${toll.invoiceNumber || 'X'}-${toll.tripId || toll.blockId || 'X'}`;
    APP.tollAssignments[key] = companyId;
    APP.saveTollAssignments();
  }
  if (callbacks.closeModal) callbacks.closeModal();
  if (callbacks.toast) callbacks.toast('Toll asignado', 'success');
  if (callbacks.refreshCurrentView) callbacks.refreshCurrentView();
}

export function assignPendingToll(APP, key, companyId, callbacks = {}) {
  if (!APP.pendingTolls) return;
  const toll = APP.pendingTolls.find(p => p.id === key);
  if (!toll) return;
  // Remove from pending
  APP.pendingTolls = APP.pendingTolls.filter(p => p.id !== key);
  APP.savePendingTolls();
  if (callbacks.toast) callbacks.toast('Toll asignado y removido de pendientes', 'success');
  if (callbacks.refreshCurrentView) callbacks.refreshCurrentView();
}

export function identifyTollOwner(toll, APP) {
  if (toll.driver) {
    const reg = APP.findDriverByName(toll.driver);
    if (reg && reg.companyId) return reg.companyId;
  }
  if (toll.tractor) {
    const c = APP.findCompanyByTractor(toll.tractor);
    if (c) return c.id;
  }
  return null;
}

export function rebuildTollCatalog(APP, callbacks = {}) {
  buildTollCatalog(APP);
  if (callbacks.toast) callbacks.toast('Catálogo reconstruido', 'success');
  if (callbacks.refreshCurrentView) callbacks.refreshCurrentView();
}