/* ============================================
   stateHelpers.js — Bridge APP.x ↔ AppState
   Phase 2 — Modular architecture
   ============================================================ */

import { AppState } from './state.js';

/**
 * Create an APP-shaped facade that proxies to AppState.
 * Lets view modules reference APP.companies, APP.drivers, etc.
 */
export function makeAppFacade() {
  const app = {
    // Persistent arrays
    get companies() { return AppState.data.companies; },
    set companies(v) { AppState.data.companies = v; },
    get drivers() { return AppState.data.drivers; },
    set drivers(v) { AppState.data.drivers = v; },
    get invoices() { return AppState.data.invoices; },
    set invoices(v) { AppState.data.invoices = v; },
    get pendingBlocks() { return AppState.data.pendingBlocks; },
    set pendingBlocks(v) { AppState.data.pendingBlocks = v; },
    get settings() { return AppState.data.settings || (AppState.data.settings = {}); },
    set settings(v) { AppState.data.settings = v; },
    get tollAssignments() { return AppState.data.tollAssignments || (AppState.data.tollAssignments = {}); },
    set tollAssignments(v) { AppState.data.tollAssignments = v; },
    get pendingTolls() { return AppState.data.pendingTolls || (AppState.data.pendingTolls = []); },
    set pendingTolls(v) { AppState.data.pendingTolls = v; },
    get driverPayStructures() { return AppState.data.driverPayStructures || (AppState.data.driverPayStructures = {}); },
    set driverPayStructures(v) { AppState.data.driverPayStructures = v; },
    get pendingTractorAssignments() { return AppState.data.pendingTractorAssignments || (AppState.data.pendingTractorAssignments = {}); },
    set pendingTractorAssignments(v) { AppState.data.pendingTractorAssignments = v; },
    get exceptionOverrides() { return AppState.data.exceptionOverrides || (AppState.data.exceptionOverrides = {}); },
    set exceptionOverrides(v) { AppState.data.exceptionOverrides = v; },
    get pendingTripsArchive() { return AppState.data.pendingTripsArchive || (AppState.data.pendingTripsArchive = []); },
    set pendingTripsArchive(v) { AppState.data.pendingTripsArchive = v; },

    // Current view / preview
    get currentView() { return AppState.data.currentView; },
    set currentView(v) { AppState.data.currentView = v; },
    get currentInvoicePreview() { return AppState.data.currentInvoicePreview; },
    set currentInvoicePreview(v) { AppState.data.currentInvoicePreview = v; },
    get amazonInvoiceData() { return AppState.data.amazonInvoiceData; },
    set amazonInvoiceData(v) { AppState.data.amazonInvoiceData = v; },
    get pendingFiles() { return AppState.data.pendingFiles || (AppState.data.pendingFiles = []); },
    set pendingFiles(v) { AppState.data.pendingFiles = v; },

    // Transient UI state
    get _invoiceStep() { return AppState.data._invoiceStep || 1; },
    set _invoiceStep(v) { AppState.data._invoiceStep = v; },
    get _payrollTab() { return AppState.data._payrollTab || 'company'; },
    set _payrollTab(v) { AppState.data._payrollTab = v; },
    get _reportTab() { return AppState.data._reportTab || 'company'; },
    set _reportTab(v) { AppState.data._reportTab = v; },
    get _selectedPayrollInvoiceId() { return AppState.data._selectedPayrollInvoiceId || null; },
    set _selectedPayrollInvoiceId(v) { AppState.data._selectedPayrollInvoiceId = v; },
    get _expandedArchive() { return AppState.data._expandedArchive || {}; },
    set _expandedArchive(v) { AppState.data._expandedArchive = v; },
    get _formTractors() { return AppState.data._formTractors || []; },
    set _formTractors(v) { AppState.data._formTractors = v; },

    // Persistence shims
    saveCompanies() { AppState.saveCompanies(); },
    saveDrivers() { AppState.saveDrivers(); },
    saveInvoices() { AppState.saveInvoices(); },
    savePendingBlocks() { AppState.savePendingBlocks(); },
    saveSettings() { AppState.saveSettings(); },
    saveTollAssignments() { AppState.saveTollAssignments(); },
    savePendingTolls() { AppState.savePendingTolls(); },
    saveDriverPayStructures() { AppState.saveDriverPayStructures(); },
    saveData() {
      AppState.saveCompanies();
      AppState.saveDrivers();
      AppState.saveInvoices();
      AppState.savePendingBlocks();
      AppState.saveSettings();
    },

    // Lookups
    findCompanyByTractor(tractor) { return AppState.findCompanyByTractor(tractor); },
    findDriverByName(name) { return AppState.findDriverByName(name); },

    emit() { AppState.emit(); },
  };

  return app;
}

let _APP = null;

export function getApp() {
  if (!_APP) _APP = makeAppFacade();
  return _APP;
}

export function setApp(app) {
  _APP = app;
  if (typeof window !== 'undefined') window.APP = app;
}

export function installApp() {
  const app = getApp();
  if (typeof window !== 'undefined') window.APP = app;
  return app;
}