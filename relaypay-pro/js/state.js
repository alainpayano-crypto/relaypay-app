/* ============================================
   state.js — Centralized application state
   Phase 2 — Modular architecture
   ============================================ */

import { StorageService } from './services/StorageService.js';
import { STORAGE_KEYS } from './config.js';
import { EVENT_NAMES } from './constants.js';
import { normalizeStr, normalizeTractor, uid } from './utils.js';

class AppStateClass {
  constructor() {
    this.data = this.getDefaults();
    this.listeners = new Set();
  }

  getDefaults() {
    return {
      user: null,
      company: null,
      token: null,
      settings: {},
      language: 'es',
      theme: 'light',
      session: null,
      companies: [],
      drivers: [],
      invoices: [],
      pendingBlocks: [],
      tollAssignments: {},
      pendingTolls: [],
      driverPayStructures: {},
      pendingTractorAssignments: {},
      exceptionOverrides: {},
      pendingTripsArchive: [],
      currentView: 'dashboard',
      amazonInvoiceData: null,
      currentInvoicePreview: null,
      pendingFiles: [],
      _formTractors: [],
      _invoiceStep: 1,
      _payrollTab: 'company',
      _reportTab: 'company',
      _selectedPayrollInvoiceId: null,
      _expandedArchive: {},
    };
  }

  load() {
    this.data.companies = StorageService.getJSON(STORAGE_KEYS.companies, []);
    this.data.drivers = StorageService.getJSON(STORAGE_KEYS.drivers, []);
    this.data.invoices = StorageService.getJSON(STORAGE_KEYS.invoices, []);
    this.data.pendingBlocks = StorageService.getJSON(STORAGE_KEYS.pendingBlocks, []);
    this.data.tollAssignments = StorageService.getJSON(STORAGE_KEYS.tollAssignments, {});
    this.data.pendingTolls = StorageService.getJSON(STORAGE_KEYS.pendingTolls, []);
    this.data.driverPayStructures = StorageService.getJSON(STORAGE_KEYS.driverPayStructures, {});
    this.data.settings = StorageService.getJSON(STORAGE_KEYS.settings, {});
    this.data.language = StorageService.get(STORAGE_KEYS.language, 'es');

    const session = AuthService?.getSession();
    if (session) {
      this.data.user = session.user;
      this.data.token = session.token;
      this.data.session = session;
    }
  }

  saveCompanies() { StorageService.setJSON(STORAGE_KEYS.companies, this.data.companies); }
  saveDrivers() { StorageService.setJSON(STORAGE_KEYS.drivers, this.data.drivers); }
  saveInvoices() { StorageService.setJSON(STORAGE_KEYS.invoices, this.data.invoices); }
  savePendingBlocks() { StorageService.setJSON(STORAGE_KEYS.pendingBlocks, this.data.pendingBlocks); }
  saveSettings() { StorageService.setJSON(STORAGE_KEYS.settings, this.data.settings); }
  saveTollAssignments() { StorageService.setJSON(STORAGE_KEYS.tollAssignments, this.data.tollAssignments); }
  savePendingTolls() { StorageService.setJSON(STORAGE_KEYS.pendingTolls, this.data.pendingTolls); }
  saveDriverPayStructures() { StorageService.setJSON(STORAGE_KEYS.driverPayStructures, this.data.driverPayStructures); }

  set(key, value) {
    this.data[key] = value;
    this.emit();
  }

  get(key) {
    return this.data[key];
  }

  emit() {
    this.listeners.forEach(fn => {
      try { fn(this.data); } catch (e) { console.error('Listener error:', e); }
    });
  }

  subscribe(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  findCompanyByTractor(tractor) {
    if (!tractor) return null;
    const norm = normalizeTractor(tractor);
    return this.data.companies.find(c =>
      (c.tractors || []).some(x => normalizeTractor(x) === norm)
    );
  }

  findDriverByName(name) {
    if (!name) return null;
    const norm = normalizeStr(name);
    return this.data.drivers.find(d => normalizeStr(d.name) === norm);
  }

  reset() {
    this.data = this.getDefaults();
    this.emit();
  }
}

export const AppState = new AppStateClass();