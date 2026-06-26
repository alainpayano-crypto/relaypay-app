/* ============================================
   views/ArchiveView.js — Payment archive
   Phase 2 — Modular architecture
   ============================================================ */

import { escapeHtml, money, fmtDate } from '../utils.js';

export function renderArchiveView(APP, ctx = {}) {
  const paid = APP.invoices.filter(i => i.status === 'pagada').sort((a, b) => new Date(b.paidAt) - new Date(a.paidAt));
  return `
    <div class="view-header">
      <div>
        <h1 class="view-title" data-i18n="nav.archive">📚 Historial de Pagos Pasados</h1>
        <p class="view-subtitle">Facturas pagadas y archivadas</p>
      </div>
    </div>

    ${paid.length === 0 ? `
      <div class="card">
        <div class="empty-state">
          <div class="icon">📚</div>
          <p>No hay facturas pagadas todavía.</p>
        </div>
      </div>
    ` : `
      <div class="card">
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Factura</th>
                <th>Rango</th>
                <th>Pagada</th>
                <th class="text-right">Total</th>
                <th class="text-right">Comisión</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              ${paid.map(inv => `
                <tr>
                  <td><b>${escapeHtml(inv.label)}</b></td>
                  <td>${fmtDate(inv.rangeStart)} → ${fmtDate(inv.rangeEnd)}</td>
                  <td>${fmtDate(inv.paidAt)}</td>
                  <td class="text-right money">${money(inv.totals?.totalGross || 0)}</td>
                  <td class="text-right money money-mine">${money(inv.totals?.totalCommission || 0)}</td>
                  <td><button class="btn btn-sm btn-secondary" data-action="reopenInvoice" data-id="${inv.id}">🔓 Reabrir</button></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `}
  `;
}