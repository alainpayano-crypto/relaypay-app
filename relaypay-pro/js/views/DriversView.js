/* ============================================
   views/DriversView.js — Drivers view
   Phase 2 — Modular architecture
   ============================================================ */

import { escapeHtml, uid, normalizeStr } from '../utils.js';

export function renderDrivers(APP, ctx = {}) {
  const root = (typeof document !== 'undefined') ? document.getElementById('driverSearch') : null;
  const q = (root && root.value) || '';
  const filterRoot = (typeof document !== 'undefined') ? document.getElementById('driverCompanyFilter') : null;
  const filterCompany = (filterRoot && filterRoot.value) || '';
  let list = [...APP.drivers];
  if (q) list = list.filter(d => d.name.toLowerCase().includes(q.toLowerCase()));
  if (filterCompany) list = list.filter(d => d.companyId === filterCompany);

  return `
    <div class="view-header">
      <div>
        <h1 class="view-title" data-i18n="nav.drivers">👤 Choferes</h1>
        <p class="view-subtitle" data-i18n="drv.view_subtitle">Conductores de las empresas</p>
      </div>
      <div class="btn-group">
        <button class="btn btn-secondary" data-action="openImportDriversModal">📥 <span data-i18n="drv.import">Importar Lista</span></button>
        <button class="btn btn-primary" data-action="openDriverModal">+ <span data-i18n="drv.add">Nuevo Chofer</span></button>
      </div>
    </div>

    <div class="filter-bar">
      <input type="text" id="driverSearch" data-i18n-placeholder="drv.search" placeholder="🔍 Buscar chofer..." value="${escapeHtml(q)}" data-action="refreshCurrentView" style="min-width:240px;">
      <select id="driverCompanyFilter" data-action="refreshCurrentView">
        <option value="" data-i18n="drv.all_companies">Todas las empresas</option>
        ${APP.companies.map(c => `<option value="${c.id}" ${filterCompany === c.id ? 'selected' : ''}>${escapeHtml(c.name)}</option>`).join('')}
      </select>
      <span style="color: var(--text-light);">${list.length} chofer(es)</span>
    </div>

    ${list.length === 0 ? `
      <div class="card">
        <div class="empty-state">
          <div class="icon">👤</div>
          <div class="title">No hay choferes registrados</div>
          <p>Crea el primero o importa una lista.</p>
          <div style="display:flex; gap:8px; justify-content:center; margin-top: 12px;">
            <button class="btn btn-secondary" data-action="openImportDriversModal">📥 Importar Lista</button>
            <button class="btn btn-primary" data-action="openDriverModal">+ Nuevo Chofer</button>
          </div>
        </div>
      </div>
    ` : `
      <div class="card">
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th data-i18n="drv.name">Nombre</th>
                <th data-i18n="drv.company">Empresa</th>
                <th>% <span data-i18n="drv.field_pct">de Pago</span></th>
                <th data-i18n="drv.type">Tipo</th>
                <th data-i18n="drv.status">Estado</th>
                <th data-i18n="cmp.actions">Acciones</th>
              </tr>
            </thead>
            <tbody>
              ${list.map(d => {
                const comp = APP.companies.find(c => c.id === d.companyId);
                return `
                  <tr>
                    <td><b>${escapeHtml(d.name)}</b>${d.phone ? `<br><small style="color:var(--text-light);">${escapeHtml(d.phone)}</small>` : ''}</td>
                    <td>${comp ? escapeHtml(comp.name) : '—'}</td>
                    <td><span class="badge badge-orange">${d.pct || 85}%</span></td>
                    <td>${escapeHtml(d.type || 'Employee')}</td>
                    <td><span class="badge badge-${d.status === 'Activo' ? 'success' : 'gray'}">${escapeHtml(d.status || 'Activo')}</span></td>
                    <td>
                      <div class="btn-group">
                        <button class="btn btn-sm btn-secondary" data-action="openDriverModal" data-id="${d.id}">✏️</button>
                        <button class="btn btn-sm btn-danger" data-action="deleteDriver" data-id="${d.id}">🗑️</button>
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

export function openDriverModal(APP, modalApi, driverId) {
  if (typeof modalApi?.open !== 'function') return;
  const isEdit = !!driverId;
  const d = isEdit ? APP.drivers.find(x => x.id === driverId) : { name: '', companyId: '', pct: 85, payType: 'percentage', type: 'Employee', status: 'Activo', phone: '', email: '' };
  if (!d) return;

  const html = `
    <h2 class="modal-title">${isEdit ? '✏️ Editar Chofer' : '+ Nuevo Chofer'}</h2>
    <div class="form-group">
      <label data-i18n="drv.field_name_req">Nombre del chofer *</label>
      <input type="text" id="drvName" value="${escapeHtml(d.name)}">
    </div>
    <div class="form-row">
      <div class="form-group">
        <label data-i18n="drv.field_company_req">Empresa *</label>
        <select id="drvCompany">
          <option value="">— Sin empresa —</option>
          ${APP.companies.map(c => `<option value="${c.id}" ${d.companyId === c.id ? 'selected' : ''}>${escapeHtml(c.name)}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label data-i18n="drv.field_pct">% de Pago</label>
        <input type="number" id="drvPct" value="${d.pct || 85}" min="0" max="100" step="1">
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label data-i18n="drv.field_type">Tipo</label>
        <select id="drvType">
          <option value="Employee" ${d.type === 'Employee' ? 'selected' : ''}>Employee</option>
          <option value="Owner Operator" ${d.type === 'Owner Operator' ? 'selected' : ''}>Owner Operator</option>
        </select>
      </div>
      <div class="form-group">
        <label data-i18n="drv.field_status">Estado</label>
        <select id="drvStatus">
          <option value="Activo" ${d.status === 'Activo' ? 'selected' : ''}>Activo</option>
          <option value="Inactivo" ${d.status === 'Inactivo' ? 'selected' : ''}>Inactivo</option>
        </select>
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label data-i18n="drv.field_phone">Teléfono</label>
        <input type="text" id="drvPhone" value="${escapeHtml(d.phone || '')}">
      </div>
      <div class="form-group">
        <label data-i18n="drv.field_email">Email</label>
        <input type="email" id="drvEmail" value="${escapeHtml(d.email || '')}">
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" data-action="closeModal">Cancelar</button>
      <button class="btn btn-primary" data-action="saveDriverForm" data-id="${driverId || ''}">${isEdit ? 'Guardar' : 'Crear'}</button>
    </div>
  `;
  modalApi.open(html);
}

export function saveDriverForm(APP, driverId, callbacks = {}) {
  const isEdit = !!driverId;
  const name = (typeof document !== 'undefined' && document.getElementById('drvName')) ? document.getElementById('drvName').value.trim() : '';
  if (!name) {
    if (callbacks.toast) callbacks.toast('El nombre es requerido', 'error');
    return;
  }
  const get = (id) => {
    const el = typeof document !== 'undefined' ? document.getElementById(id) : null;
    return el ? el.value : '';
  };

  const data = {
    id: driverId || uid(),
    name,
    companyId: get('drvCompany'),
    pct: Number(get('drvPct')) || 85,
    payType: 'percentage',
    type: get('drvType'),
    status: get('drvStatus'),
    phone: get('drvPhone'),
    email: get('drvEmail'),
    createdAt: isEdit ? (APP.drivers.find(d => d.id === driverId).createdAt) : new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (isEdit) {
    const idx = APP.drivers.findIndex(d => d.id === driverId);
    if (idx >= 0) APP.drivers[idx] = { ...APP.drivers[idx], ...data };
  } else {
    APP.drivers.push(data);
  }

  APP.saveDrivers();
  if (callbacks.closeModal) callbacks.closeModal();
  if (callbacks.toast) callbacks.toast(isEdit ? 'Chofer actualizado' : 'Chofer creado', 'success');
  if (callbacks.navigate) callbacks.navigate('drivers');
}

export function deleteDriver(APP, driverId, callbacks = {}) {
  const d = APP.drivers.find(x => x.id === driverId);
  if (!d) return;
  if (typeof confirm === 'function' && !confirm(`¿Eliminar al chofer "${d.name}"?`)) return;
  APP.drivers = APP.drivers.filter(x => x.id !== driverId);
  APP.saveDrivers();
  if (callbacks.toast) callbacks.toast('Chofer eliminado', 'success');
  if (callbacks.navigate) callbacks.navigate('drivers');
}

export function openImportDriversModal(APP, modalApi, callbacks = {}) {
  if (typeof modalApi?.open !== 'function') return;
  const html = `
    <h2 class="modal-title">📥 Importar Choferes desde Excel/CSV</h2>
    <div class="alert alert-info">
      💡 <div>Sube un Excel/CSV con: <b>Nombre</b>, <b>Empresa</b>, <b>% de Pago</b>, <b>Tipo</b>, <b>Estado</b>, <b>Teléfono</b>, <b>Email</b>.</div>
    </div>
    <div class="upload-zone" id="dropZoneDrivers" style="cursor:pointer;">
      <div class="icon">👤</div>
      <div class="text">Click para seleccionar archivo</div>
      <div class="hint">O arrastra y suelta aquí · .xlsx, .xls, .csv</div>
      <input type="file" id="importDriversFile" accept=".xlsx,.xls,.csv" style="display:none">
    </div>
    <div id="importDriversMappingArea" style="display:none;"></div>
  `;
  modalApi.open(html, 'large');
  setTimeout(() => {
    const dz = typeof document !== 'undefined' ? document.getElementById('dropZoneDrivers') : null;
    const fi = typeof document !== 'undefined' ? document.getElementById('importDriversFile') : null;
    if (!dz || !fi) return;
    dz.addEventListener('click', () => fi.click());
    fi.addEventListener('change', e => handleDriversFile(APP, e, callbacks));
  }, 100);
}

export async function handleDriversFile(APP, event, callbacks = {}) {
  const file = event.target.files[0];
  if (!file) return;
  try {
    if (callbacks.readFile) {
      const data = await callbacks.readFile(file);
      APP._driverImportData = data;
      renderDriverImportMapping(APP, callbacks);
    }
  } catch (e) {
    console.error(e);
    if (callbacks.toast) callbacks.toast('Error al leer el archivo: ' + e.message, 'error');
  }
}

export function renderDriverImportMapping(APP, callbacks = {}) {
  const data = APP._driverImportData;
  if (!data) return;
  const cols = data.columns;
  const area = typeof document !== 'undefined' ? document.getElementById('importDriversMappingArea') : null;
  if (!area) return;
  area.style.display = '';
  area.innerHTML = `
    <h4>Mapeo de columnas</h4>
    <p>${data.rows.length} filas encontradas</p>
    <div class="form-row-3">
      <div class="form-group">
        <label>Columna de Nombre *</label>
        <select id="mapDrvName">${cols.map(c => `<option ${/nombre|name|chofer|driver/i.test(c) ? 'selected' : ''} value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('')}</select>
      </div>
      <div class="form-group">
        <label>Columna de Empresa</label>
        <select id="mapDrvCompany"><option value="">— Ninguna —</option>${cols.map(c => `<option ${/empresa|company/i.test(c) ? 'selected' : ''} value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('')}</select>
      </div>
      <div class="form-group">
        <label>Columna % de Pago</label>
        <select id="mapDrvPct"><option value="">— Ninguna —</option>${cols.map(c => `<option ${/%|percent|pct|pay/i.test(c) ? 'selected' : ''} value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('')}</select>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" data-action="closeModal">Cancelar</button>
      <button class="btn btn-primary" data-action="confirmImportDrivers">✅ Importar ${data.rows.length} chofer(es)</button>
    </div>
  `;
}

export function confirmImportDrivers(APP, callbacks = {}) {
  if (!APP._driverImportData) return;
  const data = APP._driverImportData;
  const colName = (typeof document !== 'undefined' && document.getElementById('mapDrvName')) ? document.getElementById('mapDrvName').value : '';
  if (!colName) {
    if (callbacks.toast) callbacks.toast('Selecciona la columna de Nombre', 'error');
    return;
  }
  const colCompany = (typeof document !== 'undefined' && document.getElementById('mapDrvCompany')) ? document.getElementById('mapDrvCompany').value : '';
  const colPct = (typeof document !== 'undefined' && document.getElementById('mapDrvPct')) ? document.getElementById('mapDrvPct').value : '';

  let imported = 0, skipped = 0;
  data.rows.forEach(r => {
    const name = String(r[colName] || '').trim();
    if (!name) { skipped++; return; }
    if (APP.drivers.some(d => normalizeStr(d.name) === normalizeStr(name))) { skipped++; return; }

    let companyId = null;
    if (colCompany && r[colCompany]) {
      const compName = String(r[colCompany]).trim();
      const comp = APP.companies.find(c => normalizeStr(c.name) === normalizeStr(compName));
      if (comp) companyId = comp.id;
    }

    APP.drivers.push({
      id: uid(), name, companyId,
      pct: colPct ? Number(String(r[colPct]).replace('%', '')) || 85 : 85,
      payType: 'percentage',
      type: 'Employee',
      status: 'Activo',
      createdAt: new Date().toISOString(),
    });
    imported++;
  });
  APP.saveDrivers();
  APP._driverImportData = null;
  if (callbacks.closeModal) callbacks.closeModal();
  if (callbacks.toast) callbacks.toast(`✅ ${imported} chofer(es) importado(s)${skipped ? `, ${skipped} omitido(s)` : ''}`, 'success');
  if (callbacks.navigate) callbacks.navigate('drivers');
}