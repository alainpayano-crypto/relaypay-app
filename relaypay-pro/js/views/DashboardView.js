/* ============================================
   views/DashboardView.js — Dashboard view
   Phase 2 — Modular architecture
   ============================================================ */

import { escapeHtml, money, moneyShort, fmtDate } from '../utils.js';
import { getDashboardStats, getPendingTripsByInvoice } from '../engine/reconciler.js';
import { LOGO_URI } from '../config/logo.js';

export function renderDashboard(APP, ctx = {}) {
  const stats = getDashboardStats(APP);
  const isNew = APP.companies.length === 0 && APP.drivers.length === 0 && APP.invoices.length === 0;
  const commissionPct = (APP.settings && APP.settings.commissionPct) || 10;

  const html = `
    <div class="view-header">
      <div>
        <h1 class="view-title" data-i18n="nav.dashboard">📊 Dashboard</h1>
        <p class="view-subtitle" data-i18n="dash.subtitle">Resumen general del sistema</p>
      </div>
      <div class="btn-group">
        <button class="btn btn-primary" data-action="navigate" data-view="invoice">📄 <span data-i18n="dash.process_btn">Procesar Factura</span></button>
      </div>
    </div>

    ${isNew ? renderWelcome(APP, ctx) : ''}

    <div class="stats-grid">
      <div class="stat-card">
        <div class="label">💰 <span data-i18n="dash.income">Ingresos Totales</span></div>
        <div class="value">${moneyShort(stats.totalRevenue)}</div>
        <div class="sub">${stats.invoiceCount} <span data-i18n="dash.invoices_processed">factura(s) procesada(s)</span></div>
      </div>
      <div class="stat-card gold">
        <div class="label">⭐ <span data-i18n="dash.commission_pct">Tu Comisión</span> (${commissionPct}%)</div>
        <div class="value money-mine">${moneyShort(stats.totalCommission)}</div>
        <div class="sub" data-i18n="dash.commission_sub">Total acumulado</div>
      </div>
      <div class="stat-card green">
        <div class="label">🏢 <span data-i18n="dash.paid">Pagado a Empresas</span></div>
        <div class="value">${moneyShort(stats.totalRevenue - stats.totalCommission)}</div>
        <div class="sub">${100-commissionPct}% <span data-i18n="dash.subcontracted">subcontratistas</span></div>
      </div>
      <div class="stat-card navy">
        <div class="label">🚛 <span data-i18n="dash.trips">Viajes Totales</span></div>
        <div class="value">${stats.totalTrips}</div>
        <div class="sub">${stats.companyCount} <span data-i18n="settings.companies_short">empresa(s)</span> · ${stats.driverCount} <span data-i18n="settings.drivers_short">chofer(es)</span></div>
      </div>
      <div class="stat-card purple">
        <div class="label">⏭️ <span data-i18n="dash.pending">Viajes Pendientes</span></div>
        <div class="value">${stats.pendingCount}</div>
        <div class="sub">${moneyShort(stats.pendingTotal)} · <span data-i18n="dash.out_of_range">fuera de rango</span></div>
      </div>
    </div>

    ${renderPendingSection(APP)}

    <div class="card">
      <div class="card-header">
        <h3 data-i18n="dash.recent">📋 Facturas Recientes</h3>
        <button class="btn btn-link" data-action="navigate" data-view="invoice" data-i18n="dash.process_new">Procesar nueva →</button>
      </div>
      ${renderRecentInvoices(APP, ctx)}
    </div>
  `;
  return html;
}

export function renderWelcome(APP, ctx) {
  return `
    <div class="welcome-card">
      <div class="logo-display">
        <img src="${ctx.LOGO_URI || LOGO_URI}" alt="RelayPay">
      </div>
      <div style="flex:1;">
        <h2>¡Bienvenido a RelayPay Pro!</h2>
        <p style="opacity:0.9; margin-top:4px;">El sistema más simple para calcular payroll de Amazon Relay</p>
        <div class="steps">
          <div class="step"><div class="step-num">PASO 1</div><div class="step-text">🏢 Agrega las empresas (subcontratistas)</div></div>
          <div class="step"><div class="step-num">PASO 2</div><div class="step-text">👤 Agrega los choferes de cada empresa</div></div>
          <div class="step"><div class="step-num">PASO 3</div><div class="step-text">🚛 Asigna tractores a cada empresa</div></div>
          <div class="step"><div class="step-num">PASO 4</div><div class="step-text">📄 Sube tu factura de Amazon Relay</div></div>
        </div>
      </div>
    </div>
  `;
}

export function renderPendingSection(APP) {
  const grouped = getPendingTripsByInvoice(APP);
  const ids = Object.keys(grouped);
  if (ids.length === 0) return '';
  const totalPending = ids.reduce((s, k) => s + grouped[k].trips.length, 0);
  const totalMoney = ids.reduce((s, k) => s + grouped[k].trips.reduce((ss, t) => ss + Number(t.pay || 0), 0), 0);

  return `
    <div class="card">
      <div class="card-header">
        <h3 data-i18n="dash.pending_title">⏭️ Viajes Pendientes (futuras semanas)</h3>
        <span class="badge badge-purple">${totalPending} <span data-i18n="pay.trips">viajes</span> · ${moneyShort(totalMoney)}</span>
      </div>
      <p style="color: var(--text-light); font-size: 13px; margin-bottom: 12px;" data-i18n="dash.pending_explained">
        Estos viajes están en facturas anteriores pero con fecha <b>después</b> del rango que procesaste. Se acumularán automáticamente cuando proceses el rango que los incluya.
      </p>
      <div style="display: flex; flex-direction: column; gap: 12px;">
        ${ids.map(id => {
          const { invoice, trips } = grouped[id];
          const sum = trips.reduce((s, t) => s + Number(t.pay || 0), 0);
          return `
            <details style="background: #faf5ff; border: 1px solid #e9d5ff; border-radius: 8px; padding: 12px;">
              <summary style="cursor: pointer; font-weight: 600; display: flex; justify-content: space-between; align-items: center;">
                <span>📄 ${escapeHtml(invoice.label)}</span>
                <span class="badge badge-purple">${trips.length} <span data-i18n="pay.trips">viajes</span> · ${moneyShort(sum)}</span>
              </summary>
              <div class="table-wrap" style="margin-top: 12px;">
                <table>
                  <thead>
                    <tr><th data-i18n="inv.invoice_date">Fecha</th><th data-i18n="tol.driver">Chofer</th><th data-i18n="tol.tractor">Tractor</th><th>Contract</th><th class="text-right" data-i18n="inv.amount">Monto</th></tr>
                  </thead>
                  <tbody>
                    ${trips.slice(0, 20).map(t => `
                      <tr class="pending-row">
                        <td>${fmtDate(t.date)}</td>
                        <td>${escapeHtml(t.driver)}</td>
                        <td><code>${escapeHtml(t.tractor)}</code></td>
                        <td><code style="font-size: 11px;">${escapeHtml(t.contractId)}</code></td>
                        <td class="text-right money">${money(t.pay)}</td>
                      </tr>
                    `).join('')}
                    ${trips.length > 20 ? `<tr><td colspan="5" class="text-center" style="color:var(--text-light);">... y ${trips.length - 20} <span data-i18n="common.next">más</span></td></tr>` : ''}
                  </tbody>
                </table>
              </div>
            </details>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

export function renderRecentInvoices(APP, ctx) {
  if (APP.invoices.length === 0) {
    return `
      <div class="empty-state">
        <div class="icon">📄</div>
        <div class="title" data-i18n="dash.no_invoices">No hay facturas procesadas todavía</div>
        <p data-i18n="dash.no_invoices_desc">Sube tu primera factura de Amazon Relay para empezar.</p>
        <button class="btn btn-primary" style="margin-top: 12px;" data-action="navigate" data-view="invoice">📄 <span data-i18n="dash.process_btn">Procesar Factura</span></button>
      </div>
    `;
  }
  const pending = APP.invoices.filter(i => !i.status || i.status === 'pendiente');
  const paid = APP.invoices.filter(i => i.status === 'pagada');
  const sortedPending = [...pending].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return `
    <div style="display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; align-items: center;">
      <div class="badge badge-info" style="padding: 8px 14px; font-size: 13px;">📄 <span data-i18n="status.pending_plural">Pendientes</span>: <b>${pending.length}</b></div>
      <div class="badge badge-success" style="padding: 8px 14px; font-size: 13px;">💾 <span data-i18n="status.paid_plural">Pagadas</span>: <b>${paid.length}</b></div>
      ${paid.length > 0 ? `<button class="btn btn-sm btn-secondary" data-action="navigate" data-view="archive">📚 <span data-i18n="dash.view_archive">Ver Archivo de Pagos</span></button>` : ''}
    </div>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th data-i18n="dash.th_invoice">Factura</th>
            <th data-i18n="dash.th_status">Estado</th>
            <th data-i18n="dash.th_range">Rango</th>
            <th class="text-right" data-i18n="dash.th_trips">Viajes</th>
            <th class="text-right" data-i18n="dash.th_total">Total</th>
            <th class="text-right" data-i18n="dash.th_commission">Comisión</th>
            <th class="text-right" data-i18n="dash.th_to_collect">A Cobrar</th>
            <th data-i18n="dash.th_actions">Acciones</th>
          </tr>
        </thead>
        <tbody>
          ${sortedPending.map(inv => `
            <tr style="cursor:pointer;" data-action="viewInvoiceDetail" data-id="${inv.id}">
              <td><b>${escapeHtml(inv.label)}</b></td>
              <td><span class="badge badge-warning">⏳ <span data-i18n="dash.status_pending">Pendiente</span></span></td>
              <td>${fmtDate(inv.rangeStart)} → ${fmtDate(inv.rangeEnd)}</td>
              <td class="text-right">${inv.totals?.tripCount || 0}</td>
              <td class="text-right money">${money(inv.totals?.totalGross || 0)}</td>
              <td class="text-right money money-mine">${money(inv.totals?.totalCommission || 0)}</td>
              <td class="text-right money money-positive">${money(inv.totals?.totalToCompanies || 0)}</td>
              <td>
                <button class="btn btn-sm btn-success" data-action="markInvoiceAsPaid" data-id="${inv.id}">✅ <span data-i18n="dash.mark_paid">Marcar Pagada</span></button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}