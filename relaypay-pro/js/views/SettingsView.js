/* ============================================
   views/SettingsView.js — Settings (language, commission, backup, danger)
   Phase 2 — Modular architecture
   ============================================================ */

import { escapeHtml, money } from '../utils.js';
import { setLanguage, getLanguage, t } from '../i18n.js';

export function renderSettings(APP, ctx = {}) {
  const lang = getLanguage();
  return `
    <div class="view-header">
      <div>
        <h1 class="view-title" data-i18n="settings.title">⚙️ Configuración</h1>
        <p class="view-subtitle" data-i18n="settings.subtitle">Ajustes del sistema, respaldos y datos</p>
      </div>
    </div>

    <div class="card">
      <div class="card-title" data-i18n="settings.language">🌐 Idioma / Language</div>
      <p data-i18n="settings.language_desc">Selecciona el idioma de la interfaz.</p>
      <div class="btn-group" style="margin-top:12px;">
        <button class="btn btn-${lang === 'es' ? 'primary' : 'secondary'}" data-action="changeLanguage" data-lang="es">🇪🇸 Español</button>
        <button class="btn btn-${lang === 'en' ? 'primary' : 'secondary'}" data-action="changeLanguage" data-lang="en">🇺🇸 English</button>
      </div>
    </div>

    <div class="card">
      <div class="card-title" data-i18n="settings.commission">💰 Comisión por Defecto</div>
      <p data-i18n="settings.commission_desc">Porcentaje de comisión que te quedas del total de cada factura.</p>
      <div class="form-row" style="align-items:end;">
        <div class="form-group" style="max-width:200px;">
          <label data-i18n="settings.commission_label">Mi Comisión %</label>
          <input type="number" id="settingsCommissionPct" value="${APP.settings.commissionPct || 10}" min="0" max="50" step="0.5">
        </div>
        <button class="btn btn-primary" data-action="saveCommissionSetting" data-i18n="settings.save">💾 Guardar</button>
      </div>
    </div>

    <div class="card">
      <div class="card-title" data-i18n="settings.payano_rules">⚙️ Reglas del Motor Payano</div>
      <p data-i18n="settings.payano_rules_desc">Configura las reglas de liquidación.</p>
      <div class="form-row-3">
        <div class="form-group">
          <label data-i18n="settings.payano_date">📅 Fecha principal</label>
          <select id="payanoDateColumn">
            <option value="stop1" ${APP.settings.payanoDateColumn !== 'stop2' ? 'selected' : ''} data-i18n="settings.payano_stop1">Stop 1 Actual Arrival Date</option>
            <option value="stop2" ${APP.settings.payanoDateColumn === 'stop2' ? 'selected' : ''} data-i18n="settings.payano_stop2">Stop 2 Actual Departure Date + Time</option>
          </select>
        </div>
        <div class="form-group">
          <label data-i18n="settings.payano_cutoff">⏰ Hora de corte</label>
          <select id="payanoCutoffTime">
            <option value="00:00" ${(APP.settings.payanoCutoffTime || '00:00') === '00:00' ? 'selected' : ''} data-i18n="settings.payano_midnight">12:00 AM PT</option>
            <option value="17:00" ${APP.settings.payanoCutoffTime === '17:00' ? 'selected' : ''} data-i18n="settings.payano_5pm">5:00 PM PT</option>
          </select>
        </div>
        <div class="form-group" style="padding-top:28px;">
          <label><input type="checkbox" id="payanoLastDayToNextWeek" ${APP.settings.payanoLastDayToNextWeek ? 'checked' : ''}> <span data-i18n="settings.payano_lastday">Mover último día</span></label>
        </div>
      </div>
      <div class="form-row" style="margin-top:12px;">
        <label><input type="checkbox" id="payanoIncludeZeroPay" ${APP.settings.payanoIncludeZeroPay ? 'checked' : ''}> <span data-i18n="settings.payano_zero">Incluir filas con $0</span></label>
        <label style="margin-left:24px;"><input type="checkbox" id="payanoUseDominantDriver" ${APP.settings.payanoUseDominantDriver ? 'checked' : ''}> <span data-i18n="settings.payano_dominant">Driver dominante</span></label>
      </div>
      <div class="modal-footer" style="margin-top:16px;">
        <button class="btn btn-secondary" data-action="resetPayanoRules" data-i18n="settings.payano_reset">↩️ Restablecer</button>
        <button class="btn btn-primary" data-action="savePayanoRules" data-i18n="settings.payano_save">💾 Guardar Reglas</button>
      </div>
    </div>

    <div class="card">
      <div class="card-title" data-i18n="settings.stats">📊 Estadísticas del Sistema</div>
      <div class="stats-grid">
        <div class="stat-card"><div class="label">${t('settings.companies')}</div><div class="value">${APP.companies.length}</div></div>
        <div class="stat-card"><div class="label">${t('settings.drivers')}</div><div class="value">${APP.drivers.length}</div></div>
        <div class="stat-card"><div class="label">${t('settings.invoices')}</div><div class="value">${APP.invoices.length}</div></div>
        <div class="stat-card gold"><div class="label">${t('settings.total_commission')}</div><div class="value">${money(APP.invoices.reduce((s, inv) => s + (inv.totals?.totalCommission || 0), 0))}</div></div>
      </div>
    </div>

    <div class="card">
      <div class="card-title" data-i18n="settings.backup">💾 Respaldo de Datos</div>
      <p data-i18n="settings.backup_desc">Exporta todos tus datos a un archivo JSON.</p>
      <div class="btn-group" style="margin-top:12px;">
        <button class="btn btn-primary" data-action="exportAllData" data-i18n="settings.export">📤 Exportar Todo (JSON)</button>
        <label class="btn btn-secondary">
          📥 <span data-i18n="settings.import">Importar Respaldo</span>
          <input type="file" id="importDataFile" accept=".json" style="display:none;">
        </label>
      </div>
    </div>

    <div class="card" style="border-left:4px solid var(--danger);">
      <div class="card-title" style="color:var(--danger);" data-i18n="settings.danger">⚠️ Zona Peligrosa</div>
      <p data-i18n="settings.danger_desc">Borrar todos los datos. Esta acción no se puede deshacer.</p>
      <button class="btn btn-danger" data-action="resetAllData" data-i18n="settings.delete_all">🗑️ Borrar Todos los Datos</button>
    </div>

    <div class="card">
      <div class="card-title" data-i18n="settings.about">ℹ️ Acerca de</div>
      <p data-i18n="settings.about_desc">Sistema de cálculo de payroll para Amazon Relay. Versión 7.6.6.</p>
    </div>
  `;
}

export function changeLanguage(APP, lang, callbacks = {}) {
  setLanguage(lang);
  if (callbacks.toast) callbacks.toast(lang === 'es' ? '✅ Idioma cambiado a Español' : '✅ Language changed to English', 'success');
  if (callbacks.refreshCurrentView) callbacks.refreshCurrentView();
}

export function saveCommissionSetting(APP, callbacks = {}) {
  const v = (typeof document !== 'undefined' && document.getElementById('settingsCommissionPct')) ? Number(document.getElementById('settingsCommissionPct').value) : 10;
  APP.settings.commissionPct = v || 10;
  APP.saveSettings();
  if (callbacks.toast) callbacks.toast('Comisión guardada', 'success');
}

export function savePayanoRules(APP, callbacks = {}) {
  const get = (id) => {
    const el = typeof document !== 'undefined' ? document.getElementById(id) : null;
    return el ? (el.type === 'checkbox' ? el.checked : el.value) : null;
  };
  APP.settings.payanoDateColumn = get('payanoDateColumn') || 'stop1';
  APP.settings.payanoCutoffTime = get('payanoCutoffTime') || '00:00';
  APP.settings.payanoLastDayToNextWeek = !!get('payanoLastDayToNextWeek');
  APP.settings.payanoIncludeZeroPay = !!get('payanoIncludeZeroPay');
  APP.settings.payanoUseDominantDriver = !!get('payanoUseDominantDriver');
  APP.saveSettings();
  if (callbacks.toast) callbacks.toast('Reglas guardadas', 'success');
}

export function resetPayanoRules(APP, callbacks = {}) {
  APP.settings.payanoDateColumn = 'stop1';
  APP.settings.payanoCutoffTime = '00:00';
  APP.settings.payanoLastDayToNextWeek = false;
  APP.settings.payanoIncludeZeroPay = false;
  APP.settings.payanoUseDominantDriver = false;
  APP.saveSettings();
  if (callbacks.toast) callbacks.toast('Reglas restablecidas', 'success');
  if (callbacks.refreshCurrentView) callbacks.refreshCurrentView();
}

export function exportAllData(APP, callbacks = {}) {
  const data = {
    version: '7.6.6',
    exportedAt: new Date().toISOString(),
    companies: APP.companies,
    drivers: APP.drivers,
    invoices: APP.invoices,
    pendingBlocks: APP.pendingBlocks,
    settings: APP.settings,
    tollAssignments: APP.tollAssignments,
    pendingTolls: APP.pendingTolls,
    driverPayStructures: APP.driverPayStructures,
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `relaypay_backup_${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
  if (callbacks.toast) callbacks.toast('Respaldo exportado', 'success');
}

export async function importData(APP, event, callbacks = {}) {
  const file = event.target.files[0];
  if (!file) return;
  try {
    const text = await file.text();
    const data = JSON.parse(text);
    if (data.companies) APP.companies = data.companies;
    if (data.drivers) APP.drivers = data.drivers;
    if (data.invoices) APP.invoices = data.invoices;
    if (data.pendingBlocks) APP.pendingBlocks = data.pendingBlocks;
    if (data.settings) APP.settings = data.settings;
    if (data.tollAssignments) APP.tollAssignments = data.tollAssignments;
    if (data.pendingTolls) APP.pendingTolls = data.pendingTolls;
    if (data.driverPayStructures) APP.driverPayStructures = data.driverPayStructures;
    APP.saveData();
    if (callbacks.toast) callbacks.toast('Respaldo importado', 'success');
    if (callbacks.refreshCurrentView) callbacks.refreshCurrentView();
  } catch (e) {
    console.error(e);
    if (callbacks.toast) callbacks.toast('Error al importar: ' + e.message, 'error');
  }
}

export function resetAllData(APP, callbacks = {}) {
  if (typeof confirm === 'function' && !confirm('¿Borrar TODOS los datos? Esta acción no se puede deshacer.')) return;
  APP.companies = [];
  APP.drivers = [];
  APP.invoices = [];
  APP.pendingBlocks = [];
  APP.tollAssignments = {};
  APP.pendingTolls = [];
  APP.driverPayStructures = {};
  APP.settings = {};
  APP.saveData();
  if (callbacks.toast) callbacks.toast('Todos los datos borrados', 'success');
  if (callbacks.navigate) callbacks.navigate('dashboard');
}