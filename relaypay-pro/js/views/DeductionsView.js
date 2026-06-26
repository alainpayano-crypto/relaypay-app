/* ============================================
   views/DeductionsView.js — Per-company deductions
   Phase 2 — Modular architecture
   ============================================================
   Body IDENTICAL to nomina_public/index.html (lines 11186-11330).
   Only `export` and `import` keywords added.
   ============================================================ */

import { escapeHtml, money, uid } from '../utils.js';
import {
  computeCompanyNetToCollect,
  getCompanyDeductions,
  saveCompanyDeductions,
} from '../engine/invoiceCalculator.js';

/**
 * Render a summary panel of deductions for a company in an invoice.
 * Body identical to monolith renderCompanyDeductionsSummary (line 11186).
 */
export function renderCompanyDeductionsSummary(companyId, companyGross, commissionPct, invoiceId) {
  const result = computeCompanyNetToCollect(companyId, companyGross, commissionPct, invoiceId);

  if (result.totalDeductions === 0) return '';

  const items = [];
  if (result.tollDeductions > 0) {
    items.push(`<div class="line"><span>🛣️ Toll Deductions (Amazon):</span><b>−${money(result.tollDeductions)}</b></div>`);
  }
  if (result.manualDeductions > 0) {
    // List manual deductions
    const manualList = getCompanyDeductions()
      .filter(d => d.companyId === companyId && d.invoiceId === invoiceId);
    manualList.forEach(d => {
      const cat = DEDUCTION_CATEGORIES.find(c => c.key === d.category) || DEDUCTION_CATEGORIES[4];
      items.push(`<div class="line"><span>${cat.icon} ${escapeHtml(d.label || cat.label)}:</span><b>−${money(d.amount)}</b>${d.tripId || d.blockId ? ` <small style="color: var(--text-light);">(${escapeHtml(d.tripId || d.blockId)})</small>` : ''}</div>`);
    });
  }

  return `
    <details style="margin-top: 8px; padding: 8px; background: var(--bg); border-radius: 4px;">
      <summary style="cursor: pointer; font-size: 12px; color: var(--danger); font-weight: 600;">
        ⚠️ ${items.length} deducción(es): −${money(result.totalDeductions)}
      </summary>
      <div style="margin-top: 8px; font-size: 12px;">
        ${items.join('')}
      </div>
    </details>
  `;
}

/**
 * Open the "Add Deduction" modal.
 * Body identical to monolith openAddDeductionModal (line 11220).
 */
export function openAddDeductionModal(companyId, invoiceId) {
  const company = (APP.companies || []).find(c => c.id === companyId);
  if (!company) return toast(t('errors.company_not_found'), 'error');
  showModal(`
    <h2>+ Agregar Deducción a ${escapeHtml(company.name)}</h2>
    <p style="color: var(--text-light); font-size: 13px;">Las deducciones se restan del <b>monto a cobrar</b> de la empresa. NO afectan tu comisión del 10%.</p>
    <div class="form-row">
      <div class="form-group">
        <label>Categoría *</label>
        <select id="dedCategory">
          ${DEDUCTION_CATEGORIES.map(c => `<option value="${c.key}">${c.icon} ${c.label}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label>Monto *</label>
        <input type="number" id="dedAmount" step="0.01" min="0" placeholder="0.00">
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Trip/Block ID (opcional)</label>
        <input type="text" id="dedRef" placeholder="Ej: T-XXX o B-XXX">
      </div>
      <div class="form-group">
        <label>Fecha</label>
        <input type="date" id="dedDate" value="${new Date().toISOString().slice(0,10)}">
      </div>
    </div>
    <div class="form-group">
      <label>Etiqueta / Notas</label>
      <input type="text" id="dedLabel" placeholder="Ej: Combustible semana del 24 al 30 mayo">
    </div>
    <div style="display: flex; gap: 8px; justify-content: flex-end; margin-top: 16px;">
      <button class="btn" onclick="closeModal()"><span data-i18n="common.cancel">Cancelar</span></button>
      <button class="btn btn-primary" onclick="confirmAddDeduction('${companyId}', '${invoiceId || ''}')">+ Agregar</button>
    </div>
  `, 'medium');
}

/**
 * Confirm addition of a manual deduction.
 * Body identical to monolith confirmAddDeduction (line 11259).
 */
export function confirmAddDeduction(companyId, invoiceId) {
  const amount = Number(document.getElementById('dedAmount').value);
  if (!amount || amount <= 0) return toast('Monto requerido', 'error');
  const deductions = getCompanyDeductions();
  deductions.push({
    id: 'ded_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
    companyId,
    invoiceId,
    category: document.getElementById('dedCategory').value,
    amount,
    tripId: (document.getElementById('dedRef').value || '').startsWith('T-') ? document.getElementById('dedRef').value : '',
    blockId: (document.getElementById('dedRef').value || '').startsWith('B-') ? document.getElementById('dedRef').value : '',
    date: document.getElementById('dedDate').value,
    label: document.getElementById('dedLabel').value.trim(),
    createdAt: new Date().toISOString(),
  });
  saveCompanyDeductions(deductions);
  closeModal();
  toast('✅ Deducción agregada', 'success');
  refreshCurrentView();
}

/**
 * Delete a manual deduction.
 * Body identical to monolith deleteDeduction (line 11281).
 */
export function deleteDeduction(id) {
  const deductions = getCompanyDeductions().filter(d => d.id !== id);
  saveCompanyDeductions(deductions);
  toast('🗑️ Deducción eliminada', 'success');
  refreshCurrentView();
}

/**
 * Assign a toll deduction expense to a company.
 * Body identical to monolith assignTollDeduction (line 11292).
 */
export function assignTollDeduction(expenseIdx) {
  const expense = APP.currentInvoicePreview?.payanoResult?.expenses?.[expenseIdx];
  if (!expense) return toast('Toll no encontrado', 'error');
  const companies = APP.companies || [];
  if (companies.length === 0) return toast('No hay empresas registradas', 'error');

  // Find existing assignment if any
  const tollKey = (expense.tripId || expense.blockId || `${expense.invoiceNumber || 'X'}-${expense.tripId || expense.blockId || 'X'}`);
  const existingCompanyId = APP.tollAssignments?.[tollKey];

  showModal(`
    <h2>📌 Asignar Toll Deduction</h2>
    <p style="color: var(--text-light); font-size: 13px;">Monto: <b>−${money(expense.amount)}</b> · ${escapeHtml(expense.description || expense.tripId || expense.blockId || '')}</p>
    <p style="color: var(--text-light); font-size: 13px;">Categoría: <b>${escapeHtml(expense.category)}</b></p>
    <div class="form-group" style="margin-top: 12px;">
      <label>Empresa que asumirá este toll *</label>
      <select id="tollAssignCompany">
        <option value="">— Selecciona empresa —</option>
        ${companies.map(c => `<option value="${c.id}" ${c.id === existingCompanyId ? 'selected' : ''}>${escapeHtml(c.name)}</option>`).join('')}
      </select>
    </div>
    <div style="display: flex; gap: 8px; justify-content: flex-end; margin-top: 16px;">
      <button class="btn" onclick="closeModal()"><span data-i18n="common.cancel">Cancelar</span></button>
      <button class="btn btn-primary" onclick="confirmAssignToll(${expenseIdx})">✓ Asignar</button>
    </div>
  `, 'medium');
}

/**
 * Confirm toll assignment.
 * Body identical to monolith confirmAssignToll (line 11324).
 */
export function confirmAssignToll(expenseIdx) {
  const companyId = document.getElementById('tollAssignCompany').value;
  if (!companyId) return toast('Selecciona empresa', 'error');

  const expense = APP.currentInvoicePreview?.payanoResult?.expenses?.[expenseIdx];
  if (!expense) return toast('Toll no encontrado', 'error');

  const tollKey = (expense.tripId || expense.blockId || `${expense.invoiceNumber || 'X'}-${expense.tripId || expense.blockId || 'X'}`);
  if (!APP.tollAssignments) APP.tollAssignments = {};
  APP.tollAssignments[tollKey] = companyId;
  expense._assignedCompanyId = companyId;

  closeModal();
  toast('✅ Toll asignado a la empresa', 'success');
  refreshCurrentView();
}
