/* ============================================
   views/InvoiceView.js — Invoice processing
   Phase 2 — Modular architecture
   ============================================================ */

import { escapeHtml, money, moneyShort, fmtDate, fmtDateInput, uid, debounce } from '../utils.js';
import { runPayanoPayrollEngine } from '../engine/runPayanoEngine.js';
import { reconcilePendingBlocks } from '../engine/reconciler.js';

export function renderInvoice(APP, ctx = {}) {
  const step = APP._invoiceStep || 1;
  if (step === 1) return renderInvoiceStep1(APP, ctx);
  if (step === 2) return renderInvoiceStep2(APP, ctx);
  if (step === 3) return renderInvoiceStep3(APP, ctx);
  return renderInvoiceStep1(APP, ctx);
}

export function renderInvoiceStep1(APP, ctx = {}) {
  return `
    <div class="view-header">
      <div>
        <h1 class="view-title" data-i18n="inv.title">📄 Procesar Factura</h1>
        <p class="view-subtitle" data-i18n="inv.step1_sub">Paso 1: Sube el archivo Excel/CSV de tu factura</p>
      </div>
    </div>
    <div class="card">
      <div class="card-title" data-i18n="inv.upload_file">📤 Subir Archivo</div>
      <div class="upload-zone" id="invoiceDropZone" style="cursor:pointer;">
        <div class="icon">📄</div>
        <div class="text" data-i18n="inv.click_select">Click para seleccionar archivo</div>
        <div class="hint" data-i18n="inv.drop_hint">O arrastra y suelta aquí · .xlsx, .xls, .csv</div>
        <input type="file" id="invoiceFileInput" accept=".xlsx,.xls,.csv" multiple style="display:none">
      </div>
      <div id="invoiceFilesList"></div>
    </div>
    <div class="alert alert-info">
      <div><b data-i18n="inv.what_does">ℹ️ ¿Qué hace este proceso?</b></div>
      <ol style="margin-top: 8px; padding-left: 20px;">
        <li><span data-i18n="inv.what_1">Sube tu factura de Amazon Relay (.xlsx o .csv)</span></li>
        <li><span data-i18n="inv.what_2">El sistema</span> <b data-i18n="inv.what_2_b">auto-detecta</b> <span data-i18n="inv.what_2_c">las columnas</span></li>
        <li><span data-i18n="inv.what_3">Te muestra el</span> <b data-i18n="inv.what_3_b">rango de fechas</b> <span data-i18n="inv.what_3_c">detectado</span></li>
        <li><span data-i18n="inv.what_4">Tú confirmas el rango a procesar</span></li>
        <li><span data-i18n="inv.what_5">El sistema calcula</span> <b data-i18n="inv.what_5_b">10% de comisión</b></li>
      </ol>
    </div>
  `;
}

export function renderInvoiceStep2(APP, ctx = {}) {
  if (!APP.pendingFiles || APP.pendingFiles.length === 0) {
    APP._invoiceStep = 1;
    return renderInvoiceStep1(APP, ctx);
  }

  const firstFile = APP.pendingFiles[0];
  const cols = firstFile.columns || [];
  const dateCol = cols.find(c => /date|fecha|stop\s*1/i.test(c)) || cols[0];
  const driverCol = cols.find(c => /driver|chofer|conductor/i.test(c)) || cols[1];
  const payCol = cols.find(c => /pay|payment|amount|pago/i.test(c)) || cols[2];
  const contractCol = cols.find(c => /contract/i.test(c)) || cols[3];
  const tractorCol = cols.find(c => /tractor|truck|vehicle|unit/i.test(c)) || cols[4];
  const stageCol = cols.find(c => /stage|status|state/i.test(c)) || '';
  const blockCol = cols.find(c => /block/i.test(c)) || '';
  const tripCol = cols.find(c => /trip/i.test(c)) || '';
  const milesCol = cols.find(c => /mile|millas/i.test(c)) || '';

  // Detect date range
  let minDate = null, maxDate = null;
  APP.pendingFiles.forEach(f => {
    (f.rows || []).forEach(r => {
      const d = parseDateMaybe(r[dateCol]);
      if (d) {
        if (!minDate || d < minDate) minDate = d;
        if (!maxDate || d > maxDate) maxDate = d;
      }
    });
  });

  return `
    <div class="view-header">
      <div>
        <h1 class="view-title">📄 Procesar Factura</h1>
        <p class="view-subtitle">Paso 2: Mapea las columnas y confirma el rango</p>
      </div>
    </div>
    <div class="card">
      <div class="card-title">🗂️ ${APP.pendingFiles.length} archivo(s) cargado(s)</div>
      <ul style="margin-bottom: 16px;">
        ${APP.pendingFiles.map(f => `<li>📄 ${escapeHtml(f.name)} (${(f.rows || []).length} filas)</li>`).join('')}
      </ul>
      <div class="card-title">🎯 Mapeo de columnas</div>
      <div class="form-row-3">
        ${[
          ['colDriver', 'Chofer', driverCol, true],
          ['colPay', 'Pago', payCol, true],
          ['colContract', 'Contract ID', contractCol, true],
          ['colTractor', 'Tractor', tractorCol, true],
          ['colDate', 'Fecha', dateCol, true],
          ['colStage', 'Stage', stageCol, false],
          ['colBlock', 'Block ID', blockCol, false],
          ['colTrip', 'Trip ID', tripCol, false],
          ['colMiles', 'Millas', milesCol, false],
        ].map(([id, label, def, req]) => `
          <div class="form-group">
            <label>${label} ${req ? '*' : ''}</label>
            <select id="${id}">
              ${req ? '' : '<option value="">— Ninguna —</option>'}
              ${cols.map(c => `<option value="${escapeHtml(c)}" ${c === def ? 'selected' : ''}>${escapeHtml(c)}</option>`).join('')}
            </select>
          </div>
        `).join('')}
      </div>
      <div class="form-row-3">
        <div class="form-group">
          <label>📅 Fecha inicio</label>
          <input type="date" id="periodFrom" value="${minDate ? fmtDateInput(minDate) : ''}">
        </div>
        <div class="form-group">
          <label>📅 Fecha fin</label>
          <input type="date" id="periodTo" value="${maxDate ? fmtDateInput(maxDate) : ''}">
        </div>
        <div class="form-group">
          <label>💰 Comisión %</label>
          <input type="number" id="commissionPct" value="${(APP.settings.commissionPct || 10)}" min="0" max="50" step="0.5">
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" data-action="cancelInvoice">Cancelar</button>
        <button class="btn btn-primary" data-action="processInvoicePreview">⚡ Procesar y Previsualizar</button>
      </div>
    </div>
  `;
}

export function renderInvoiceStep3(APP, ctx = {}) {
  const p = APP.currentInvoicePreview;
  if (!p) {
    APP._invoiceStep = 1;
    return renderInvoiceStep1(APP, ctx);
  }
  const inRangeTrips = p.inRange || [];
  const totalGross = inRangeTrips.reduce((s, t) => s + (t.pay || 0), 0);

  return `
    <div class="view-header">
      <div>
        <h1 class="view-title">📄 Procesar Factura</h1>
        <p class="view-subtitle">Paso 3: Vista previa y conciliación</p>
      </div>
    </div>
    <div class="stats-grid">
      <div class="stat-card">
        <div class="label">📊 En archivo</div>
        <div class="value">${p.totalRows || 0}</div>
        <div class="sub">viajes totales</div>
      </div>
      <div class="stat-card navy">
        <div class="label">📅 En Período</div>
        <div class="value">${inRangeTrips.length}</div>
        <div class="sub">viajes a pagar</div>
      </div>
      <div class="stat-card purple">
        <div class="label">⏭️ Pendientes</div>
        <div class="value">${(p.pending || []).length}</div>
        <div class="sub">después del rango</div>
      </div>
      <div class="stat-card gold">
        <div class="label">💰 Total Bruto</div>
        <div class="value">${money(totalGross)}</div>
      </div>
    </div>
    <div class="card">
      <div class="card-title">📋 Detalle de viajes (${inRangeTrips.length})</div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Chofer</th>
              <th>Tractor</th>
              <th>Contract</th>
              <th>Block/Trip</th>
              <th class="text-right">Monto</th>
              <th>Método</th>
            </tr>
          </thead>
          <tbody>
            ${inRangeTrips.slice(0, 100).map(t => `
              <tr>
                <td>${fmtDate(t.date)}</td>
                <td>${escapeHtml(t.driver)}</td>
                <td><code>${escapeHtml(t.tractor)}</code></td>
                <td><code style="font-size:11px;">${escapeHtml(t.contractId)}</code></td>
                <td><code style="font-size:11px;">${escapeHtml(t.blockId || t.tripId)}</code></td>
                <td class="text-right money">${money(t.pay)}</td>
                <td><span class="badge badge-${t.calculationMethod === 'MAX' ? 'orange' : 'gray'}">${t.calculationMethod || 'SUM'}</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" data-action="cancelInvoice">Cancelar</button>
      <button class="btn btn-primary" data-action="saveInvoice">💾 Guardar Factura</button>
    </div>
  `;
}

function parseDateMaybe(v) {
  if (!v) return null;
  const d = new Date(v);
  if (!isNaN(d.getTime())) return d;
  const m = String(v).match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/);
  if (m) {
    const [_, a, b, y] = m;
    const isDDMM = +a > 12;
    const dd = isDDMM ? +a : +b;
    const mm = isDDMM ? +b : +a;
    return new Date(+y < 100 ? 2000 + +y : +y, mm - 1, dd);
  }
  return null;
}

export async function handleInvoiceFiles(APP, event, callbacks = {}) {
  const files = Array.from(event.target.files || []);
  if (!files.length) return;
  APP.pendingFiles = [];
  for (const f of files) {
    try {
      const data = await callbacks.readFile(f);
      APP.pendingFiles.push({ name: f.name, rows: data.rows, columns: data.columns });
    } catch (e) {
      console.error(e);
      if (callbacks.toast) callbacks.toast('Error al leer ' + f.name + ': ' + e.message, 'error');
    }
  }
  APP._invoiceStep = 2;
  if (callbacks.toast) callbacks.toast(`${files.length} archivo(s) cargado(s)`, 'success');
  if (callbacks.refreshCurrentView) callbacks.refreshCurrentView();
}

export function processInvoicePreview(APP, callbacks = {}) {
  const get = (id) => {
    const el = typeof document !== 'undefined' ? document.getElementById(id) : null;
    return el ? el.value : '';
  };
  const colDriver = get('colDriver');
  const colPay = get('colPay');
  const colContract = get('colContract');
  const colTractor = get('colTractor');
  const colDate = get('colDate');
  const colStage = get('colStage');
  const colBlock = get('colBlock') || '';
  const colTrip = get('colTrip') || '';
  const colMiles = get('colMiles') || '';

  if (!colDriver || !colPay || !colContract || !colTractor || !colDate) {
    if (callbacks.toast) callbacks.toast('Faltan columnas por mapear (marcadas con *)', 'error');
    return;
  }

  const fromStr = get('periodFrom');
  const toStr = get('periodTo');
  if (!fromStr || !toStr) {
    if (callbacks.toast) callbacks.toast('Define el rango de fechas', 'error');
    return;
  }

  const from = new Date(fromStr + 'T00:00:00');
  const to = new Date(toStr + 'T23:59:59');
  if (from > to) {
    if (callbacks.toast) callbacks.toast('"Desde" no puede ser mayor que "Hasta"', 'error');
    return;
  }
  const commissionPct = Number(get('commissionPct')) || 10;

  const allRows = APP.pendingFiles.reduce((acc, f) => acc.concat(f.rows || []), []);
  const colMap = { colDriver, colPay, colContract, colTractor, colDate, colStage, colBlock, colTrip, colMiles };

  APP.pendingTractorAssignments = {};

  const result = runPayanoPayrollEngine(allRows, colMap, from, to, 0, APP, callbacks.persist);

  const recon = reconcilePendingBlocks(APP, result.trips);

  APP.currentInvoicePreview = {
    colMap,
    from: from.toISOString(),
    to: to.toISOString(),
    commissionPct,
    fileNames: APP.pendingFiles.map(f => f.name),
    totalRows: allRows.length,
    inRange: result.trips,
    beforeRange: result.classified.beforeRange.map(b => ({ blockId: b.block.blockId, ...b.block, ...b })),
    pending: [
      ...result.classified.lastDayExcluded.map(b => ({ blockId: b.block.blockId, ...b.block, isLastDayExcluded: true })),
      ...result.classified.deferred.map(b => ({ blockId: b.block.blockId, ...b.block, isDeferred: true })),
      ...result.classified.afterRange.map(b => ({ blockId: b.block.blockId, ...b.block })),
    ],
    excluded: result.classified.cancelled.map(b => ({ blockId: b.block.blockId, ...b.block, excluded: true })),
    payanoResult: result,
    pendingReconciliation: recon,
    createdAt: new Date().toISOString(),
  };

  APP._invoiceStep = 3;
  if (callbacks.navigate) callbacks.navigate('invoice');
  if (callbacks.toast) callbacks.toast(`⚡ Payano: ${result.inPeriod} in-period · ${recon.paidNow.length} liquidados`, 'success');
}

export function saveInvoice(APP, callbacks = {}) {
  const p = APP.currentInvoicePreview;
  if (!p) return;
  const invoiceId = uid();
  APP.invoices.push({
    id: invoiceId,
    label: p.fileNames[0] || `Factura ${APP.invoices.length + 1}`,
    rangeStart: p.from,
    rangeEnd: p.to,
    createdAt: new Date().toISOString(),
    status: 'pendiente',
    commissionPct: p.commissionPct,
    trips: p.inRange,
    pendingTrips: p.pending,
    excludedTrips: p.excluded,
    totals: p.payanoResult ? {
      totalGross: p.payanoResult.totalGross,
      totalCommission: p.payanoResult.totalGross * (p.commissionPct / 100),
      totalToCompanies: p.payanoResult.totalGross * (1 - p.commissionPct / 100),
      tripCount: p.inRange.length,
    } : null,
    payanoResult: p.payanoResult,
  });
  APP.saveInvoices();
  APP.currentInvoicePreview = null;
  APP.pendingFiles = [];
  APP._invoiceStep = 1;
  if (callbacks.toast) callbacks.toast('✅ Factura guardada', 'success');
  if (callbacks.navigate) callbacks.navigate('dashboard');
}

export function cancelInvoice(APP, callbacks = {}) {
  APP.currentInvoicePreview = null;
  APP.pendingFiles = [];
  APP._invoiceStep = 1;
  if (callbacks.toast) callbacks.toast('Cancelado', 'info');
  if (callbacks.navigate) callbacks.navigate('invoice');
}

export function goToInvoiceStep(APP, step, callbacks = {}) {
  APP._invoiceStep = step;
  if (callbacks.navigate) callbacks.navigate('invoice');
}