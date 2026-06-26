/* ============================================
   views/ConciliationView.js — Conciliation AI view
   Phase 2 — Modular architecture
   ============================================================ */

import { escapeHtml, money, moneyShort } from '../utils.js';

export function renderConciliationView(APP, ctx = {}) {
  // Aggregate insights across invoices
  const totalInvoices = APP.invoices.length;
  const totalOrphans = APP.invoices.reduce((s, inv) => {
    return s + ((inv.payanoResult && inv.payanoResult.ungroupedRows && inv.payanoResult.ungroupedRows.length) || 0);
  }, 0);
  const totalMultiDriver = APP.invoices.reduce((s, inv) => {
    return s + ((inv.payanoResult && inv.payanoResult.multiDriverWarnings && inv.payanoResult.multiDriverWarnings.length) || 0);
  }, 0);

  return `
    <div class="view-header">
      <div>
        <h1 class="view-title" data-i18n="nav.conciliation">🤖 Conciliación AI</h1>
        <p class="view-subtitle" data-i18n="ai.insights_desc">Análisis automático del CSV</p>
      </div>
    </div>

    <div class="card">
      <div class="card-title" data-i18n="ai.insights_title">🧠 Payano AI Insights</div>
      <div class="stats-grid">
        <div class="stat-card">
          <div class="label">Facturas Procesadas</div>
          <div class="value">${totalInvoices}</div>
        </div>
        <div class="stat-card purple">
          <div class="label">Filas Sin Agrupar</div>
          <div class="value">${totalOrphans}</div>
        </div>
        <div class="stat-card gold">
          <div class="label">Multi-Driver</div>
          <div class="value">${totalMultiDriver}</div>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-title" data-i18n="ai.rules_title">📋 Reglas del Motor de Conciliación</div>
      <ul style="padding-left: 24px;">
        <li><b data-i18n="ai.future_payments">Pagos Futuros</b>: <span data-i18n="ai.future_payments_desc">"Scheduled to be paid next invoice" → pendientes</span></li>
        <li><b data-i18n="ai.cancelled">Cancelados</b>: <span data-i18n="ai.cancelled_desc">excluidos automáticamente</span></li>
        <li><b data-i18n="ai.duplicates">Duplicados</b>: <span data-i18n="ai.duplicates_desc">Block IDs repetidos → solo primera ocurrencia</span></li>
        <li><b data-i18n="ai.zero_value">Sin Valor</b>: <span data-i18n="ai.zero_value_desc">$0 reportados pero no sumados</span></li>
      </ul>
    </div>
  `;
}