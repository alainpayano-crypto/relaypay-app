/* ============================================
   main.js — Application orchestrator
   Phase 2 — Modular architecture
   ============================================================
   Wires all modules together, bootstraps state, mounts the initial
   view, and exposes globals for legacy onclick attributes.
   ============================================================ */

import { AppState } from './state.js';
import { StorageService } from './services/StorageService.js';
import { NotificationService } from './services/NotificationService.js';
import { LoadingService } from './services/LoadingService.js';
import { modal as Modal, closeModal, showModal } from './components/Modal.js';
import { getApp, installApp } from './stateHelpers.js';
import { setLanguage, getLanguage, applyTranslations, t, changeLanguage } from './i18n.js';
import { APP_CONFIG, STORAGE_KEYS, ROLES, VIEWS } from './config.js';

import * as DashboardView from './views/DashboardView.js';
import * as CompaniesView from './views/CompaniesView.js';
import * as DriversView from './views/DriversView.js';
import * as InvoiceView from './views/InvoiceView.js';
import * as PayanoView from './views/PayanoView.js';
import * as MyCompanyView from './views/MyCompanyView.js';
import * as PendientesView from './views/PendientesView.js';
import * as SearchView from './views/SearchView.js';
import * as TollsView from './views/TollsView.js';
import * as DeductionsView from './views/DeductionsView.js';
import * as SettingsView from './views/SettingsView.js';
import * as LoginView from './views/LoginView.js';
import * as ConciliationView from './views/ConciliationView.js';
import * as ReportsView from './views/ReportsView.js';
import * as ArchiveView from './views/ArchiveView.js';

/* ------------------------------------------------------------
   View registry — maps logical view name → render function
   ------------------------------------------------------------ */
const VIEW_RENDERERS = {
  dashboard: (APP) => DashboardView.renderDashboard(APP, { t }),
  welcome: (APP) => DashboardView.renderWelcome(APP, { t }),
  companies: (APP) => CompaniesView.renderCompanies(APP, { t }),
  drivers: (APP) => DriversView.renderDrivers(APP, { t }),
  invoice: (APP) => InvoiceView.renderInvoice(APP, { t }),
  payano: (APP) => PayanoView.renderOwnerPayrollView(APP, { t }),
  my_company: (APP) => MyCompanyView.renderMyCompanyView(APP, { t }),
  pendientes: (APP) => PendientesView.renderPendientesView(APP, { t }),
  search: (APP) => SearchView.renderSearchView(APP, { t }),
  tolls: (APP) => TollsView.renderTollsView(APP, { t }),
  deductions: (APP) => renderDeductionsFallback(APP),
  settings: (APP) => SettingsView.renderSettings(APP, { t }),
  conciliation: (APP) => ConciliationView.renderConciliationView(APP, { t }),
  reports: (APP) => ReportsView.renderReports(APP, { t }),
  archive: (APP) => ArchiveView.renderArchiveView(APP, { t }),
};

function renderDeductionsFallback(APP) {
  const root = document.getElementById('view-root');
  if (root) {
    root.innerHTML = '<div class="container"><h1>' + t('nav.deductions') + '</h1><p>' + t('common.coming_soon') + '</p></div>';
  }
}

/* ------------------------------------------------------------
   Global action router — handles data-action="module.fnName"
   ------------------------------------------------------------ */
const ACTION_BINDINGS = {
  'navigation.show': (APP, view) => showView(view),
  'login.submit': (APP) => LoginView.handleAuthSubmit && LoginView.handleAuthSubmit(APP, 'login', { onSuccess: () => location.reload() }),
  'settings.changeLanguage': (APP, lang) => SettingsView.changeLanguage(APP, lang, { onSuccess: () => location.reload() }),
};

function dispatchAction(action, APP, ...args) {
  const fn = ACTION_BINDINGS[action];
  if (fn) {
    try { return fn(APP, ...args); }
    catch (e) { console.error('Action failed:', action, e); }
  } else {
    console.warn('No action handler for:', action);
  }
}

/* ------------------------------------------------------------
   View switching
   ------------------------------------------------------------ */
function showView(viewName) {
  const APP = getApp();
  const renderer = VIEW_RENDERERS[viewName];
  const root = document.getElementById('view-root');
  if (!root) return;

  if (!renderer) {
    console.warn('Unknown view:', viewName);
    root.innerHTML = `<div class="container"><h2>View not found: ${viewName}</h2></div>`;
    return;
  }

  try {
    LoadingService.show();
    const html = renderer(APP);
    root.innerHTML = html || '';
    if (typeof applyTranslations === 'function') applyTranslations();
    APP.currentView = viewName;
  } catch (e) {
    console.error('Render error:', e);
    NotificationService.show('Render error: ' + e.message, 'error');
  } finally {
    LoadingService.hide();
  }
}

/* ------------------------------------------------------------
   Global event delegation
   ------------------------------------------------------------ */
function installEventDelegation() {
  document.addEventListener('click', (event) => {
    const target = event.target.closest('[data-action]');
    if (!target) return;
    const action = target.getAttribute('data-action');
    const APP = getApp();
    const param = target.getAttribute('data-param') || target.getAttribute('data-view') || null;
    event.preventDefault();
    if (param) dispatchAction(action, APP, param);
    else dispatchAction(action, APP);
  });

  document.addEventListener('change', (event) => {
    const target = event.target.closest('[data-action-change]');
    if (!target) return;
    const action = target.getAttribute('data-action-change');
    const APP = getApp();
    const value = target.value;
    const fn = ACTION_BINDINGS[action];
    if (fn) {
      try { fn(APP, value); }
      catch (e) { console.error('Change action failed:', action, e); }
    }
  });
}

/* ------------------------------------------------------------
   Boot the application
   ------------------------------------------------------------ */
function bootstrap() {
  console.log('[RelayPay] Booting modular build v' + (APP_CONFIG?.version || '7.6.6'));

  // 1) Set language from storage or browser preference
  const lang = StorageService.get(STORAGE_KEYS.language, null) || getLanguage() || 'es';
  try { setLanguage(lang); } catch (e) { console.warn('setLanguage failed:', e); }

  // 2) Install APP facade and load state
  const APP = installApp();
  try { AppState.load(); } catch (e) { console.warn('AppState.load failed:', e); }

  // 3) Apply translations to the empty shell
  try { applyTranslations(); } catch (e) { console.warn('applyTranslations failed:', e); }

  // 4) Install global event delegation
  installEventDelegation();

  // 5) Decide initial view based on session
  const session = AppState.data.session || AppState.data.user;
  if (!session) {
    showView('welcome');
  } else {
    showView('dashboard');
  }

  console.log('[RelayPay] Boot complete. Language:', lang, 'Session:', !!session);
}

/* ------------------------------------------------------------
   Expose globals for legacy onclick attributes + debugging
   ------------------------------------------------------------ */
if (typeof window !== 'undefined') {
  window.APP = getApp();
  window.AppState = AppState;
  window.StorageService = StorageService;
  window.NotificationService = NotificationService;
  window.LoadingService = LoadingService;
  window.Modal = Modal;
  window.t = t;
  window.setLanguage = setLanguage;
  window.getLanguage = getLanguage;
  window.applyTranslations = applyTranslations;
  window.changeLanguage = changeLanguage;
  window.showView = showView;
  window.APP_CONFIG = APP_CONFIG;

  // Expose each view namespace so legacy onclick="PayanoView.foo()" keeps working
  window.DashboardView = DashboardView;
  window.CompaniesView = CompaniesView;
  window.DriversView = DriversView;
  window.InvoiceView = InvoiceView;
  window.PayanoView = PayanoView;
  window.MyCompanyView = MyCompanyView;
  window.PendientesView = PendientesView;
  window.SearchView = SearchView;
  window.TollsView = TollsView;
  window.DeductionsView = DeductionsView;
  window.SettingsView = SettingsView;
  window.LoginView = LoginView;
  window.ConciliationView = ConciliationView;
  window.ReportsView = ReportsView;
  window.ArchiveView = ArchiveView;
}

// Run bootstrap when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}
