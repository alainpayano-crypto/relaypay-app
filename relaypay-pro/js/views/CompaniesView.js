/* ============================================
   views/CompaniesView.js — Companies view
   Phase 2 — Modular architecture
   ============================================================ */

import { escapeHtml, money, moneyShort, normalizeStr } from '../utils.js';
import { uid } from '../utils.js';

export function renderCompanies(APP, ctx = {}) {
  const root = (typeof document !== 'undefined') ? document.getElementById('companySearch') : null;
  const q = (root && root.value) || '';
  let list = [...APP.companies];
  if (q) {
    const ql = q.toLowerCase();
    list = list.filter(c => c.name.toLowerCase().includes(ql) || (c.tractors || []).some(t => t.toLowerCase().includes(ql)));
  }

  return `
    <div class="view-header">
      <div>
        <h1 class="view-title" data-i18n="nav.companies">🏢 Empresas</h1>
        <p class="view-subtitle" data-i18n="cmp.view_subtitle">Subcontratistas y dueñas de camiones</p>
      </div>
      <div class="btn-group">
        <button class="btn btn-secondary" data-action="openImportCompaniesModal">📥 <span data-i18n="cmp.import">Importar Lista</span></button>
        <button class="btn btn-primary" data-action="openCompanyModal">+ <span data-i18n="cmp.add">Nueva Empresa</span></button>
      </div>
    </div>

    <div class="filter-bar">
      <input type="text" id="companySearch" data-i18n-placeholder="cmp.search" placeholder="🔍 Buscar por nombre o tractor..." value="${escapeHtml(q)}" data-action="refreshCurrentView" style="min-width:300px;">
      <span style="color: var(--text-light);">${list.length} empresa(s)</span>
    </div>

    ${list.length === 0 ? `
      <div class="card">
        <div class="empty-state">
          <div class="icon">🏢</div>
          <div class="title">No hay empresas registradas</div>
          <p>Crea la primera o importa una lista desde Excel/CSV.</p>
          <div style="display:flex; gap:8px; justify-content:center; margin-top: 12px;">
            <button class="btn btn-secondary" data-action="openImportCompaniesModal">📥 Importar Lista</button>
            <button class="btn btn-primary" data-action="openCompanyModal">+ Nueva Empresa</button>
          </div>
        </div>
      </div>
    ` : `
      <div class="card">
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th data-i18n="cmp.name">Empresa</th>
                <th data-i18n="cmp.contact">Contacto</th>
                <th data-i18n="drv.title_short">Choferes</th>
                <th data-i18n="cmp.tractors">Tractores</th>
                <th>% <span data-i18n="cmp.to_company">a Empresa</span></th>
                <th>💰 <span data-i18n="pay.my_commission">Mi Comisión</span></th>
                <th data-i18n="cmp.actions">Acciones</th>
              </tr>
            </thead>
            <tbody>
              ${list.map(c => {
                const driverCount = APP.drivers.filter(d => d.companyId === c.id).length;
                return `
                  <tr>
                    <td>
                      <b style="color: var(--navy);">${escapeHtml(c.name)}</b>
                      ${c.mcNumber ? `<br><span class="badge badge-gray" style="margin-top:4px;">MC: ${escapeHtml(c.mcNumber)}</span>` : ''}
                    </td>
                    <td>${escapeHtml(c.contactName || '—')}<br><span style="font-size:12px; color: var(--text-light);">${escapeHtml(c.contactPhone || c.contactEmail || '')}</span></td>
                    <td><span class="badge badge-info">${driverCount} chofer(es)</span></td>
                    <td>
                      <div class="tractors-list" style="background: transparent; border: none; padding: 0; min-height: 0;">
                        ${(c.tractors || []).slice(0, 5).map(t => `<span class="tractor-chip">${escapeHtml(t)}</span>`).join('')}
                        ${(c.tractors || []).length > 5 ? `<span class="badge badge-gray">+${(c.tractors || []).length - 5}</span>` : ''}
                        ${(c.tractors || []).length === 0 ? '<span style="color: var(--text-light); font-size: 12px;">—</span>' : ''}
                      </div>
                    </td>
                    <td><span class="badge badge-orange">${c.defaultPct || 90}%</span></td>
                    <td>
                      <span class="badge" style="background: var(--success); color: white; padding: 4px 8px; font-weight: 700;">
                        ${c.commissionPct != null ? c.commissionPct : (APP.settings.commissionPct || 10)}%
                      </span>
                      <br><small style="color: var(--text-light);">${c.commissionPct != null ? 'Personalizado' : 'Default'}</small>
                    </td>
                    <td>
                      <div class="btn-group">
                        <button class="btn btn-sm btn-secondary" data-action="openCompanyModal" data-id="${c.id}">✏️ <span data-i18n="common.edit">Editar</span></button>
                        <button class="btn btn-sm btn-danger" data-action="deleteCompany" data-id="${c.id}">🗑️</button>
                      </div>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `}
  `;
}

// Modal openers — call into the Modal component
export function openCompanyModal(APP, modalApi, companyId) {
  if (typeof modalApi?.open !== 'function') return;
  const isEdit = !!companyId;
  const c = isEdit ? APP.companies.find(x => x.id === companyId) : { name: '', tractors: [], contactName: '', contactPhone: '', contactEmail: '', mcNumber: '', dotNumber: '', defaultPct: 90, address: '', ein: '', contactIsDriver: false, driverPct: 85 };
  if (!c) return;
  APP._formTractors = [...(c.tractors || [])];

  const html = `
    <h2 class="modal-title">${isEdit ? '✏️ Editar Empresa' : '+ Nueva Empresa'}</h2>
    <div class="form-group">
      <label data-i18n="cmp.field_name_req">Nombre de la empresa *</label>
      <input type="text" id="cmpName" value="${escapeHtml(c.name)}" placeholder="Ej: PAYANO EXPRESS LLC">
    </div>
    <div class="form-row">
      <div class="form-group">
        <label data-i18n="cmp.mc">MC Number</label>
        <input type="text" id="cmpMc" value="${escapeHtml(c.mcNumber || '')}" placeholder="1234567">
      </div>
      <div class="form-group">
        <label data-i18n="cmp.dot">DOT Number</label>
        <input type="text" id="cmpDot" value="${escapeHtml(c.dotNumber || '')}" placeholder="1234567">
      </div>
    </div>
    <div class="form-group">
      <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
        <input type="checkbox" id="cmpIsOwner" ${c.isOwner ? 'checked' : ''}>
        <span><b data-i18n="cmp.my_company_check">★ Mi Compañía (no cobra 10%)</b></span>
      </label>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>EIN</label>
        <input type="text" id="cmpEin" value="${escapeHtml(c.ein || '')}">
      </div>
      <div class="form-group">
        <label data-i18n="cmp.driver_pct">% Default del chofer</label>
        <input type="number" id="cmpPct" value="${c.defaultPct || 90}" min="0" max="100" step="1">
      </div>
      <div class="form-group">
        <label data-i18n="cmp.commission_field">💰 % Comisión (tu pago)</label>
        <input type="number" id="cmpCommissionPct" value="${c.commissionPct != null ? c.commissionPct : (APP.settings.commissionPct || 10)}" min="0" max="50" step="0.5">
      </div>
    </div>
    <div class="form-group">
      <label data-i18n="cmp.address">Dirección</label>
      <input type="text" id="cmpAddress" value="${escapeHtml(c.address || '')}">
    </div>
    <h4 data-i18n="cmp.contact_person">📞 Persona de Contacto</h4>
    <div class="form-row">
      <div class="form-group">
        <label data-i18n="cmp.contact_name">Nombre</label>
        <input type="text" id="cmpContactName" value="${escapeHtml(c.contactName || '')}">
      </div>
      <div class="form-group">
        <label data-i18n="cmp.contact_phone">Teléfono</label>
        <input type="text" id="cmpContactPhone" value="${escapeHtml(c.contactPhone || '')}">
      </div>
    </div>
    <div class="form-group">
      <label data-i18n="cmp.contact_email">Email</label>
      <input type="email" id="cmpContactEmail" value="${escapeHtml(c.contactEmail || '')}">
    </div>
    <h4 data-i18n="cmp.tractors_label">🚛 Tractores</h4>
    <div class="tractor-input-row">
      <input type="text" id="newTractorInput" placeholder="Ej: K662AA">
      <button class="btn btn-primary" data-action="addTractorToForm">+ Agregar</button>
    </div>
    <div class="tractors-list" id="tractorsListForm"></div>
    <div class="modal-footer">
      <button class="btn btn-secondary" data-action="closeModal">Cancelar</button>
      <button class="btn btn-primary" data-action="saveCompanyForm" data-id="${companyId || ''}">Guardar</button>
    </div>
  `;
  modalApi.open(html, 'large');
  setTimeout(() => refreshTractorList(APP), 50);
}

export function refreshTractorList(APP) {
  const el = typeof document !== 'undefined' ? document.getElementById('tractorsListForm') : null;
  if (!el) return;
  el.innerHTML = (APP._formTractors || []).length === 0
    ? '<span style="color: var(--text-light); font-size: 12px;">Sin tractores asignados</span>'
    : APP._formTractors.map(t => `<span class="tractor-chip">${escapeHtml(t)} <span class="remove" data-action="removeTractorFromForm" data-tractor="${escapeHtml(t)}">×</span></span>`).join('');
}

export function addTractorToForm(APP) {
  const inp = typeof document !== 'undefined' ? document.getElementById('newTractorInput') : null;
  if (!inp) return;
  const v = inp.value.trim().toUpperCase();
  if (!v) return;
  if (!APP._formTractors) APP._formTractors = [];
  if (APP._formTractors.includes(v)) return;
  APP._formTractors.push(v);
  inp.value = '';
  refreshTractorList(APP);
}

export function removeTractorFromForm(APP, t) {
  if (!APP._formTractors) return;
  APP._formTractors = APP._formTractors.filter(x => x !== t);
  refreshTractorList(APP);
}

export function saveCompanyForm(APP, companyId, callbacks = {}) {
  const isEdit = !!companyId;
  const name = (typeof document !== 'undefined' && document.getElementById('cmpName')) ? document.getElementById('cmpName').value.trim() : '';
  if (!name) {
    if (callbacks.toast) callbacks.toast('El nombre es requerido', 'error');
    return;
  }

  const get = (id) => {
    const el = typeof document !== 'undefined' ? document.getElementById(id) : null;
    return el ? (el.type === 'checkbox' ? el.checked : el.value) : '';
  };

  const data = {
    id: companyId || uid(),
    name,
    mcNumber: get('cmpMc').trim?.() || '',
    dotNumber: get('cmpDot').trim?.() || '',
    ein: get('cmpEin').trim?.() || '',
    address: get('cmpAddress').trim?.() || '',
    defaultPct: Number(get('cmpPct')) || 90,
    commissionPct: Number(get('cmpCommissionPct')) || (APP.settings.commissionPct || 10),
    isOwner: !!get('cmpIsOwner'),
    contactName: (get('cmpContactName') || '').trim?.() || '',
    contactPhone: (get('cmpContactPhone') || '').trim?.() || '',
    contactEmail: (get('cmpContactEmail') || '').trim?.() || '',
    contactIsDriver: !!get('cmpContactIsDriver'),
    tractors: [...(APP._formTractors || [])],
    createdAt: isEdit ? (APP.companies.find(c => c.id === companyId).createdAt) : new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (isEdit) {
    const idx = APP.companies.findIndex(c => c.id === companyId);
    if (idx >= 0) APP.companies[idx] = { ...APP.companies[idx], ...data };
  } else {
    APP.companies.push(data);
  }

  if (data.contactIsDriver && data.contactName) {
    const existing = APP.findDriverByName(data.contactName);
    if (!existing) {
      APP.drivers.push({
        id: uid(), name: data.contactName, companyId: data.id,
        pct: data.driverPct, status: 'Activo', type: 'Owner Operator',
        createdAt: new Date().toISOString(),
      });
      APP.saveDrivers();
    }
  }

  APP.saveCompanies();
  if (callbacks.closeModal) callbacks.closeModal();
  APP._formTractors = [];
  if (callbacks.toast) callbacks.toast(isEdit ? 'Empresa actualizada' : 'Empresa creada', 'success');
  if (callbacks.navigate) callbacks.navigate('companies');
}

export function deleteCompany(APP, companyId, callbacks = {}) {
  const c = APP.companies.find(x => x.id === companyId);
  if (!c) return;
  const driverCount = APP.drivers.filter(d => d.companyId === companyId).length;
  if (typeof confirm === 'function' && !confirm(`¿Eliminar "${c.name}"? ${driverCount} chofer(es) quedarán sin empresa.`)) return;
  APP.companies = APP.companies.filter(x => x.id !== companyId);
  APP.drivers.forEach(d => { if (d.companyId === companyId) d.companyId = null; });
  APP.saveCompanies();
  APP.saveDrivers();
  if (callbacks.toast) callbacks.toast('Empresa eliminada', 'success');
  if (callbacks.navigate) callbacks.navigate('companies');
}

// Import modal — delegates to CSV/XLSX reader service
export function openImportCompaniesModal(APP, modalApi, callbacks = {}) {
  if (typeof modalApi?.open !== 'function') return;
  const html = `
    <h2 class="modal-title">📥 Importar Empresas desde Excel/CSV</h2>
    <div class="alert alert-info">
      💡 <div>Sube un Excel/CSV con las columnas: <b>Nombre</b>, <b>Tractores</b>, <b>MC</b>, <b>DOT</b>, <b>Contacto</b>, <b>Teléfono</b>, <b>Email</b>, <b>% Default</b>. La columna Tractores puede tener varios separados por coma, espacio o salto de línea.</div>
    </div>
    <div class="upload-zone" id="dropZone" style="cursor:pointer;">
      <div class="icon">📄</div>
      <div class="text">Click para seleccionar archivo</div>
      <div class="hint">O arrastra y suelta aquí · .xlsx, .xls, .csv</div>
      <input type="file" id="importCompaniesFile" accept=".xlsx,.xls,.csv" style="display:none">
    </div>
    <div id="importMappingArea" style="display:none;"></div>
  `;
  modalApi.open(html, 'large');

  setTimeout(() => {
    const dz = typeof document !== 'undefined' ? document.getElementById('dropZone') : null;
    const fileInput = typeof document !== 'undefined' ? document.getElementById('importCompaniesFile') : null;
    if (!dz || !fileInput) return;
    dz.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', e => handleCompaniesFile(APP, e, callbacks));
  }, 100);
}

export async function handleCompaniesFile(APP, event, callbacks = {}) {
  const file = event.target.files[0];
  if (!file) return;
  try {
    if (callbacks.readFile) {
      const data = await callbacks.readFile(file);
      APP._companyImportData = data;
      renderCompanyImportMapping(APP, callbacks);
    }
  } catch (e) {
    console.error(e);
    if (callbacks.toast) callbacks.toast('Error al leer el archivo: ' + e.message, 'error');
  }
}

export function renderCompanyImportMapping(APP, callbacks = {}) {
  const data = APP._companyImportData;
  if (!data) return;
  const cols = data.columns;
  const area = typeof document !== 'undefined' ? document.getElementById('importMappingArea') : null;
  if (!area) return;
  area.style.display = '';
  area.innerHTML = `
    <h4 style="margin-top:16px; color: var(--navy);">Mapeo de columnas</h4>
    <p style="font-size: 13px; color: var(--text-light); margin-bottom: 12px;">${data.rows.length} filas encontradas</p>
    <div class="form-row-3">
      <div class="form-group">
        <label>Columna de Nombre *</label>
        <select id="mapCmpName">${cols.map(c => `<option ${/nombre|name|empresa|company/i.test(c) ? 'selected' : ''} value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('')}</select>
      </div>
      <div class="form-group">
        <label>Columna de Tractores</label>
        <select id="mapCmpTractors"><option value="">— Ninguna —</option>${cols.map(c => `<option ${/tractor|truck|vehicle|placa|unit/i.test(c) ? 'selected' : ''} value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('')}</select>
      </div>
      <div class="form-group">
        <label>Columna de Contacto</label>
        <select id="mapCmpContact"><option value="">— Ninguna —</option>${cols.map(c => `<option ${/contact|contacto/i.test(c) ? 'selected' : ''} value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('')}</select>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" data-action="closeModal">Cancelar</button>
      <button class="btn btn-primary" data-action="confirmImportCompanies">✅ Importar ${data.rows.length} empresa(s)</button>
    </div>
  `;
}

export function confirmImportCompanies(APP, callbacks = {}) {
  if (!APP._companyImportData) return;
  const data = APP._companyImportData;
  const colName = typeof document !== 'undefined' ? document.getElementById('mapCmpName')?.value : '';
  if (!colName) {
    if (callbacks.toast) callbacks.toast('Selecciona la columna de Nombre', 'error');
    return;
  }
  const colTractors = typeof document !== 'undefined' ? document.getElementById('mapCmpTractors')?.value : '';
  const colContact = typeof document !== 'undefined' ? document.getElementById('mapCmpContact')?.value : '';
  const colMc = typeof document !== 'undefined' ? document.getElementById('mapCmpMc')?.value : '';
  const colPhone = typeof document !== 'undefined' ? document.getElementById('mapCmpPhone')?.value : '';
  const colPct = typeof document !== 'undefined' ? document.getElementById('mapCmpPct')?.value : '';

  let imported = 0, skipped = 0;
  data.rows.forEach(r => {
    const name = String(r[colName] || '').trim();
    if (!name) { skipped++; return; }
    if (APP.companies.some(c => normalizeStr(c.name) === normalizeStr(name))) { skipped++; return; }
    let tractors = [];
    if (colTractors && r[colTractors]) {
      tractors = String(r[colTractors]).split(/[,\n;]+/).map(s => s.trim().toUpperCase()).filter(Boolean);
    }
    APP.companies.push({
      id: uid(), name, tractors,
      mcNumber: colMc ? String(r[colMc] || '').trim() : '',
      contactName: colContact ? String(r[colContact] || '').trim() : '',
      contactPhone: colPhone ? String(r[colPhone] || '').trim() : '',
      defaultPct: colPct ? Number(String(r[colPct]).replace('%', '')) || 90 : 90,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    imported++;
  });
  APP.saveCompanies();
  APP._companyImportData = null;
  if (callbacks.closeModal) callbacks.closeModal();
  if (callbacks.toast) callbacks.toast(`✅ ${imported} empresa(s) importada(s)${skipped ? `, ${skipped} omitida(s)` : ''}`, 'success');
  if (callbacks.navigate) callbacks.navigate('companies');
}