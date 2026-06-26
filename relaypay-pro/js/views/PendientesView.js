/* ============================================
   views/PendientesView.js — Pending blocks view
   Phase 2 — Modular architecture
   ============================================================ */

import { escapeHtml, money, moneyShort, fmtDate, uid } from '../utils.js';
import { addPendingBlock, removePendingBlock } from '../engine/reconciler.js';

export function renderPendientesView(APP, ctx = {}) {
  const pending = APP.pendingBlocks || [];
  const waitingPayment = pending.filter(p => !p.paidAt);
  const liquidated = pending.filter(p => p.paidAt);

  return `
    <div class="view-header">
      <div>
        <h1 class="view-title" data-i18n="pend.title">⏳ Bloques Pendientes de Pago</h1>
        <p class="view-subtitle" data-i18n="pend.desc">Blocks que no aparecieron en la factura. Se marcan como PENDIENTES.</p>
      </div>
      <div class="btn-group">
        <button class="btn btn-primary" data-action="manualAddPending">+ <span data-i18n="pend.add_block">Marcar Bloque Pendiente</span></button>
      </div>
    </div>

    <div class="stats-grid">
      <div class="stat-card purple">
        <div class="label">⏳ <span data-i18n="pend.waiting_payment">Esperando pago</span></div>
        <div class="value">${waitingPayment.length}</div>
        <div class="sub">${moneyShort(waitingPayment.reduce((s, p) => s + Number(p.pay || 0), 0))}</div>
      </div>
      <div class="stat-card green">
        <div class="label">✅ <span data-i18n="pend.liquidated_later">Liquidados después</span></div>
        <div class="value">${liquidated.length}</div>
        <div class="sub">${moneyShort(liquidated.reduce((s, p) => s + Number(p.pay || 0), 0))}</div>
      </div>
    </div>

    ${waitingPayment.length === 0 ? `
      <div class="card">
        <div class="empty-state">
          <div class="icon">⏳</div>
          <div class="title">No hay bloques pendientes</div>
          <p>Cuando proceses facturas con bloques fuera de rango, aparecerán aquí.</p>
        </div>
      </div>
    ` : `
      <div class="card">
        <div class="card-title">⏳ Bloques Esperando Pago</div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Block ID</th>
                <th>Chofer</th>
                <th>Tractor</th>
                <th>Contract</th>
                <th>Fecha</th>
                <th class="text-right">Monto Est.</th>
                <th>Razón</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              ${waitingPayment.map(p => `
                <tr>
                  <td><code style="font-size:11px;">${escapeHtml(p.blockId)}</code></td>
                  <td>${escapeHtml(p.driver || '—')}</td>
                  <td><code>${escapeHtml(p.tractor || '—')}</code></td>
                  <td><code style="font-size:11px;">${escapeHtml(p.contractId || '—')}</code></td>
                  <td>${fmtDate(p.date)}</td>
                  <td class="text-right money">${money(p.estimatedPay || p.pay)}</td>
                  <td><span class="badge badge-${p.pendingReason === 'deferred' ? 'purple' : 'warning'}">${escapeHtml(p.pendingReason || 'out_of_range')}</span></td>
                  <td>
                    <div class="btn-group">
                      <button class="btn btn-sm btn-success" data-action="markPendingPaid" data-id="${escapeHtml(p.blockId)}">✅</button>
                      <button class="btn btn-sm btn-danger" data-action="deletePending" data-id="${escapeHtml(p.blockId)}">🗑️</button>
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `}

    ${liquidated.length > 0 ? `
      <div class="card">
        <div class="card-title">✅ Bloques Liquidados Después</div>
        <p style="font-size:13px;color:var(--text-light);margin-bottom:12px;">
          Estos bloques fueron liquidados en facturas posteriores.
        </p>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Block ID</th>
                <th>Chofer</th>
                <th class="text-right">Monto</th>
                <th>Pagado</th>
                <th>Origen</th>
              </tr>
            </thead>
            <tbody>
              ${liquidated.slice(0, 50).map(p => `
                <tr>
                  <td><code style="font-size:11px;">${escapeHtml(p.blockId)}</code></td>
                  <td>${escapeHtml(p.driver || '—')}</td>
                  <td class="text-right money">${money(p.pay)}</td>
                  <td>${fmtDate(p.paidAt)}</td>
                  <td><span class="badge badge-success">${escapeHtml(p.paidFrom || 'manual')}</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    ` : ''}
  `;
}

export function manualAddPending(APP, modalApi, callbacks = {}) {
  if (typeof modalApi?.open !== 'function') return;
  const html = `
    <h2 class="modal-title">Marcar Bloque Pendiente</h2>
    <div class="form-group">
      <label>Block ID *</label>
      <input type="text" id="pendBlockId" placeholder="B-XXXXXX">
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Chofer</label>
        <input type="text" id="pendDriver">
      </div>
      <div class="form-group">
        <label>Tractor</label>
        <input type="text" id="pendTractor">
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Contract ID</label>
        <input type="text" id="pendContract">
      </div>
      <div class="form-group">
        <label>Monto Estimado ($)</label>
        <input type="number" id="pendPay" step="0.01" min="0">
      </div>
    </div>
    <div class="form-group">
      <label>Razón</label>
      <select id="pendReason">
        <option value="out_of_range">Fuera de rango</option>
        <option value="deferred">Diferido (Amazon)</option>
        <option value="last_day">Último día</option>
        <option value="dispute">Disputa</option>
      </select>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" data-action="closeModal">Cancelar</button>
      <button class="btn btn-primary" data-action="confirmAddPending">Agregar</button>
    </div>
  `;
  modalApi.open(html);
}

export function confirmAddPending(APP, callbacks = {}) {
  const get = (id) => typeof document !== 'undefined' ? document.getElementById(id)?.value || '' : '';
  const blockId = get('pendBlockId').trim();
  if (!blockId) {
    if (callbacks.toast) callbacks.toast('Block ID es requerido', 'error');
    return;
  }
  addPendingBlock({
    blockId,
    driver: get('pendDriver').trim(),
    tractor: get('pendTractor').trim(),
    contractId: get('pendContract').trim(),
    pay: Number(get('pendPay')) || 0,
    payOriginal: Number(get('pendPay')) || 0,
    estimatedPay: Number(get('pendPay')) || 0,
    date: new Date().toISOString(),
    stage: 'Pending',
    sourceInvoiceId: null,
    sourceInvoiceLabel: 'Manual',
    pendingReason: get('pendReason'),
  }, APP);
  if (callbacks.closeModal) callbacks.closeModal();
  if (callbacks.toast) callbacks.toast('Bloque agregado como pendiente', 'success');
  if (callbacks.navigate) callbacks.navigate('pendientes');
}

export function markPendingPaid(APP, blockId, callbacks = {}) {
  if (!APP.pendingBlocks) return;
  const p = APP.pendingBlocks.find(x => x.blockId === blockId);
  if (!p) return;
  p.paidAt = new Date().toISOString();
  p.paidFrom = 'manual';
  APP.savePendingBlocks();
  if (callbacks.toast) callbacks.toast('Marcado como pagado', 'success');
  if (callbacks.refreshCurrentView) callbacks.refreshCurrentView();
}

export function unmarkPendingPaid(APP, blockId, callbacks = {}) {
  if (!APP.pendingBlocks) return;
  const p = APP.pendingBlocks.find(x => x.blockId === blockId);
  if (!p) return;
  p.paidAt = null;
  p.paidFrom = null;
  APP.savePendingBlocks();
  if (callbacks.refreshCurrentView) callbacks.refreshCurrentView();
}

export function deletePending(APP, blockId, callbacks = {}) {
  removePendingBlock(blockId, APP);
  if (callbacks.toast) callbacks.toast('Bloque eliminado', 'success');
  if (callbacks.refreshCurrentView) callbacks.refreshCurrentView();
}