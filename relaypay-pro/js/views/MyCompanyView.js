/* ============================================
   views/MyCompanyView.js — Owner's company view
   Phase 2 — Modular architecture
   ============================================================ */

import { escapeHtml, money, moneyShort, fmtDate, uid, normalizeStr } from '../utils.js';
import { downloadDriverInvoice } from '../services/PdfService.js';

// SaaS build: the owner company name must be empty by default so paying
// subscribers enter their own company name on first visit. Anyone who
// already has a company saved in localStorage keeps it.
const OWNER_DEFAULT_COMPANY = {
  name: '',
  mcNumber: '',
  dotNumber: '',
  ein: '',
  defaultPct: 100,
  createdAt: null,
};

export function getMyCompany() {
  try {
    const stored = localStorage.getItem('relaypay_owner_company');
    if (stored) return JSON.parse(stored);
  } catch (e) {}
  const fresh = { ...OWNER_DEFAULT_COMPANY, createdAt: new Date().toISOString() };
  try { localStorage.setItem('relaypay_owner_company', JSON.stringify(fresh)); } catch (e) {}
  return fresh;
}

export function saveMyCompany(company, APP, callbacks = {}) {
  if (!company || typeof company !== 'object') return;
  const cleaned = {
    name: String(company.name || '').trim(),
    mcNumber: String(company.mcNumber || '').trim(),
    dotNumber: String(company.dotNumber || '').trim(),
    ein: String(company.ein || '').trim(),
    defaultPct: Number(company.defaultPct) || 100,
    createdAt: company.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  try { localStorage.setItem('relaypay_owner_company', JSON.stringify(cleaned)); } catch (e) {}
  if (callbacks.toast) callbacks.toast('Información de tu empresa guardada', 'success');
  return cleaned;
}

export function openEditMyCompanyModal(APP, modalApi, callbacks = {}) {
  if (typeof modalApi?.open !== 'function') return;
  const owner = getMyCompany();
  const html = `
    <h2 class="modal-title">🏠 Editar Mi Compañía</h2>
    <p style="margin-bottom:16px;color:#64748b;font-size:13px;">Esta información es privada y solo se usa para tu empresa. No se comparte con otros suscriptores.</p>
    <div class="form-group">
      <label>Nombre de la Empresa *</label>
      <input type="text" id="myCompanyName" value="${escapeHtml(owner.name)}" placeholder="Ej: Tu Empresa LLC" maxlength="120">
    </div>
    <div class="form-group">
      <label>MC Number</label>
      <input type="text" id="myCompanyMC" value="${escapeHtml(owner.mcNumber)}" placeholder="Ej: MC-123456">
    </div>
    <div class="form-group">
      <label>DOT Number</label>
      <input type="text" id="myCompanyDOT" value="${escapeHtml(owner.dotNumber)}" placeholder="Ej: 1234567">
    </div>
    <div class="form-group">
      <label>EIN (Tax ID)</label>
      <input type="text" id="myCompanyEIN" value="${escapeHtml(owner.ein)}" placeholder="Ej: 12-3456789">
    </div>
    <div class="form-group">
      <label>% Por Defecto (default para choferes)</label>
      <input type="number" id="myCompanyPct" value="${owner.defaultPct || 100}" min="0" max="100" step="0.5">
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" data-action="closeModal">Cancelar</button>
      <button class="btn btn-primary" data-action="saveMyCompanyFromModal">💾 Guardar</button>
    </div>
  `;
  modalApi.open(html);
}

export function saveMyCompanyFromModal(APP, callbacks = {}) {
  const name = (typeof document !== 'undefined' && document.getElementById('myCompanyName')) ? document.getElementById('myCompanyName').value : '';
  const mcNumber = (typeof document !== 'undefined' && document.getElementById('myCompanyMC')) ? document.getElementById('myCompanyMC').value : '';
  const dotNumber = (typeof document !== 'undefined' && document.getElementById('myCompanyDOT')) ? document.getElementById('myCompanyDOT').value : '';
  const ein = (typeof document !== 'undefined' && document.getElementById('myCompanyEIN')) ? document.getElementById('myCompanyEIN').value : '';
  const pct = (typeof document !== 'undefined' && document.getElementById('myCompanyPct')) ? Number(document.getElementById('myCompanyPct').value) : 100;
  if (!name.trim()) {
    if (callbacks.toast) callbacks.toast('El nombre de la empresa es requerido', 'error');
    return;
  }
  const owner = getMyCompany();
  saveMyCompany({ ...owner, name: name.trim(), mcNumber, dotNumber, ein, defaultPct: pct }, APP, callbacks);
  if (callbacks.closeModal) callbacks.closeModal();
  if (callbacks.navigate) callbacks.navigate('myCompany');
}

export function renderMyCompanyView(APP, ctx = {}) {
  const owner = getMyCompany();
  const ownerDrivers = (APP.drivers || []).filter(d => normalizeStr(d.companyName || '') === normalizeStr(owner.name) || d.isOwner);
  const ownerInvoices = (APP.invoices || []).map(inv => {
    const trips = (inv.trips || []).filter(t => {
      const comp = APP.findCompanyByTractor(t.tractor);
      return comp && comp.isOwner;
    });
    return { inv, trips };
  }).filter(x => x.trips.length > 0);

  const totalRevenue = ownerInvoices.reduce((s, x) => s + x.trips.reduce((ss, t) => ss + (t.pay || 0), 0), 0);

  return `
    <div class="view-header">
      <div>
        <h1 class="view-title" data-i18n="nav.my_company">🏠 Mi Compañía</h1>
        <p class="view-subtitle" data-i18n="myco.subtitle">Sección dedicada para tu empresa (no entra en totales globales)</p>
      </div>
      <button class="btn btn-secondary" data-action="openMyCompanyEditModal">✏️ ${owner.name ? 'Editar' : 'Configurar'} Mi Empresa</button>
    </div>

    ${owner.name ? `
      <div class="alert alert-success">
        <div><b data-i18n="myco.banner_title">💰 Tu Empresa — 100% para ti</b></div>
        <p><b>${escapeHtml(owner.name)}</b> <span data-i18n="myco.banner_desc">Esta empresa</span> <b data-i18n="myco.not_in_totals">NO está incluida en los totales globales</b> <span data-i18n="myco.of_payroll">de Payroll</span></p>
        ${owner.mcNumber || owner.dotNumber || owner.ein ? `<p style="margin-top:8px;font-size:12px;color:#94a3b8;">${owner.mcNumber ? 'MC: ' + escapeHtml(owner.mcNumber) : ''}${owner.dotNumber ? ' · DOT: ' + escapeHtml(owner.dotNumber) : ''}${owner.ein ? ' · EIN: ' + escapeHtml(owner.ein) : ''}</p>` : ''}
      </div>
    ` : `
      <div class="alert alert-warning">
        <div><b>⚠️ Aún no has configurado tu empresa</b></div>
        <p>Haz clic en <b>"Configurar Mi Empresa"</b> arriba para ingresar el nombre de tu compañía. Esta sección mostrará tu revenue, choferes y facturas separadas de los totales globales.</p>
      </div>
    `}

    <div class="stats-grid">
      <div class="stat-card">
        <div class="label" data-i18n="myco.revenue_total">💰 Revenue Total</div>
        <div class="value">${money(totalRevenue)}</div>
      </div>
      <div class="stat-card green">
        <div class="label" data-i18n="myco.pay_drivers">👥 Pago a Choferes</div>
        <div class="value">${money(totalRevenue * 0.85)}</div>
        <div class="sub" data-i18n="myco.pay_drivers_sub">Total pagado a tus choferes</div>
      </div>
      <div class="stat-card gold">
        <div class="label" data-i18n="myco.your_money">💼 Tu Dinero (100%)</div>
        <div class="value">${money(totalRevenue)}</div>
      </div>
    </div>

    <div class="card">
      <div class="card-title" data-i18n="myco.my_drivers">👥 Mis Choferes — Pago por Driver</div>
      ${ownerDrivers.length === 0 ? `
        <p>Aún no tienes choferes asignados a esta empresa. Marca una empresa como "Mi Compañía" en su edición para incluirla aquí.</p>
      ` : `
        <div class="table-wrap">
          <table>
            <thead><tr><th>Chofer</th><th>% Pago</th><th>Estado</th><th>Acciones</th></tr></thead>
            <tbody>
              ${ownerDrivers.map(d => `
                <tr>
                  <td>${escapeHtml(d.name)}</td>
                  <td>${d.pct || 85}%</td>
                  <td>${escapeHtml(d.status || 'Activo')}</td>
                  <td><button class="btn btn-sm btn-secondary" data-action="openDriverPayStructureModal" data-id="${d.id}">💰 Estructura de Pago</button></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `}
    </div>

    ${ownerInvoices.length > 0 ? `
      <div class="card">
        <div class="card-title" data-i18n="myco.summary">📋 Resumen para tu Empresa</div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Factura</th><th>Rango</th><th class="text-right">Viajes</th><th class="text-right">Revenue</th><th>Acciones</th></tr></thead>
            <tbody>
              ${ownerInvoices.map(({ inv, trips }) => `
                <tr>
                  <td>${escapeHtml(inv.label)}</td>
                  <td>${fmtDate(inv.rangeStart)} → ${fmtDate(inv.rangeEnd)}</td>
                  <td class="text-right">${trips.length}</td>
                  <td class="text-right money">${money(trips.reduce((s, t) => s + (t.pay || 0), 0))}</td>
                  <td><button class="btn btn-sm btn-primary" data-action="downloadMyCompanyInvoicePDF" data-id="${inv.id}">📄 PDF</button></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    ` : ''}
  `;
}

export function downloadMyCompanyInvoicePDF(APP, invoiceId, callbacks = {}) {
  if (callbacks.toast) callbacks.toast('Generando PDF...', 'info');
  // Delegate to PdfService
  if (typeof window !== 'undefined' && window.PdfService?.downloadMyCompanyInvoicePDF) {
    return window.PdfService.downloadMyCompanyInvoicePDF(invoiceId, APP);
  }
  // Inline fallback — open new window with printable HTML
  const inv = APP.invoices.find(i => i.id === invoiceId);
  if (!inv) return;
  const ownerTrips = (inv.trips || []).filter(t => {
    const comp = APP.findCompanyByTractor(t.tractor);
    return comp && comp.isOwner;
  });
  if (ownerTrips.length === 0) {
    if (callbacks.toast) callbacks.toast('No hay viajes de tu empresa en esta factura', 'warning');
    return;
  }
  const w = window.open('', '_blank');
  if (!w) return;
  const total = ownerTrips.reduce((s, t) => s + (t.pay || 0), 0);
  w.document.write(`<!DOCTYPE html><html><head><title>Factura Mi Empresa</title>
    <style>body{font-family:Helvetica,Arial,sans-serif;padding:40px;}
    table{width:100%;border-collapse:collapse;}th,td{padding:6px;border-bottom:1px solid #ddd;font-size:11px;}
    th{background:#f4f4f4;text-align:left;}td.money{text-align:right;}</style></head>
    <body><h1>Mi Empresa — ${escapeHtml(inv.label)}</h1>
    <p>Período: ${fmtDate(inv.rangeStart)} → ${fmtDate(inv.rangeEnd)}</p>
    <table><thead><tr><th>Trip/Block</th><th>Fecha</th><th>Chofer</th><th>Tractor</th><th class="money">Monto</th></tr></thead>
    <tbody>${ownerTrips.map(t => `
      <tr><td>${escapeHtml(t.blockId || t.tripId || '')}</td><td>${fmtDate(t.date)}</td>
      <td>${escapeHtml(t.driver || '')}</td><td>${escapeHtml(t.tractor || '')}</td>
      <td class="money">${money(t.pay)}</td></tr>
    `).join('')}</tbody></table>
    <h3>Total: ${money(total)}</h3>
    <button onclick="window.print()" style="padding:10px 24px;cursor:pointer;">🖨️ Imprimir</button>
    </body></html>`);
  w.document.close();
}

export function openDriverPayStructureModal(APP, modalApi, driverId, callbacks = {}) {
  if (typeof modalApi?.open !== 'function') return;
  const driver = APP.drivers.find(d => d.id === driverId);
  if (!driver) return;
  const structure = getDriverPayStructure(driverId, APP);
  const html = `
    <h2 class="modal-title">💰 Estructura de Pago — ${escapeHtml(driver.name)}</h2>
    <div class="form-group">
      <label>Tipo de Pago</label>
      <select id="payType">
        <option value="percentage" ${structure.type === 'percentage' ? 'selected' : ''}>Porcentaje</option>
        <option value="per_mile" ${structure.type === 'per_mile' ? 'selected' : ''}>Por Milla</option>
        <option value="fixed_per_block" ${structure.type === 'fixed_per_block' ? 'selected' : ''}>Fijo por Bloque</option>
        <option value="fixed_per_load" ${structure.type === 'fixed_per_load' ? 'selected' : ''}>Fijo por Carga</option>
        <option value="hybrid" ${structure.type === 'hybrid' ? 'selected' : ''}>Híbrido</option>
      </select>
    </div>
    <div class="form-group">
      <label>Valor (%) / ($)</label>
      <input type="number" id="payValue" value="${structure.value || 85}" step="0.01">
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" data-action="closeModal">Cancelar</button>
      <button class="btn btn-primary" data-action="saveDriverPayStructureFromModal" data-id="${driverId}">Guardar</button>
    </div>
  `;
  modalApi.open(html);
}

export function getDriverPayStructure(driverId, APP) {
  if (!APP.driverPayStructures) APP.driverPayStructures = {};
  return APP.driverPayStructures[driverId] || { type: 'percentage', value: 85 };
}

export function saveDriverPayStructure(driverId, structure, APP) {
  if (!APP.driverPayStructures) APP.driverPayStructures = {};
  APP.driverPayStructures[driverId] = structure;
  APP.saveDriverPayStructures();
}

export function saveDriverPayStructureFromModal(APP, driverId, callbacks = {}) {
  const type = (typeof document !== 'undefined' && document.getElementById('payType')) ? document.getElementById('payType').value : 'percentage';
  const value = (typeof document !== 'undefined' && document.getElementById('payValue')) ? Number(document.getElementById('payValue').value) : 85;
  saveDriverPayStructure(driverId, { type, value }, APP);
  if (callbacks.closeModal) callbacks.closeModal();
  if (callbacks.toast) callbacks.toast('Estructura guardada', 'success');
}

export function calcDriverPayByStructure(driver, trips, structure) {
  const totalGross = trips.reduce((s, t) => s + (t.pay || 0), 0);
  const totalMiles = trips.reduce((s, t) => s + (t.miles || 0), 0);
  switch (structure?.type) {
    case 'per_mile': return totalMiles * (structure.value || 0);
    case 'fixed_per_block': return trips.length * (structure.value || 0);
    case 'fixed_per_load': return trips.length * (structure.value || 0);
    case 'hybrid': return totalGross * 0.5 + totalMiles * 0.5 * (structure.value || 0.5);
    case 'percentage':
    default: return totalGross * ((structure?.value || 85) / 100);
  }
}

export { downloadDriverInvoice };