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
import { APP_CONFIG, STORAGE_KEYS, ROLES, VIEWS, SCHEMA_VERSION, SCHEMA_VERSION_KEY } from './config.js';
import { LOGO_URI } from './config/logo.js';
import { readFile as readInvoiceFile } from './services/FileReaderService.js';

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
// Map of action names to view namespaces. Used to resolve `data-action="module.fnName"`
// (e.g. `data-action="navigate"` → DashboardView.navigate or NavigationView.navigate,
// `data-action="saveInvoice"` → InvoiceView.saveInvoice, etc.).
const VIEW_NAMESPACES = {
  navigate: DashboardView,
  navigation: DashboardView,
  Navigation: DashboardView,
  dashboard: DashboardView,
  Dashboard: DashboardView,
  companies: CompaniesView,
  Companies: CompaniesView,
  drivers: DriversView,
  Drivers: DriversView,
  invoice: InvoiceView,
  Invoice: InvoiceView,
  payano: PayanoView,
  Payano: PayanoView,
  myCompany: MyCompanyView,
  MyCompany: MyCompanyView,
  pendientes: PendientesView,
  Pendientes: PendientesView,
  search: SearchView,
  Search: SearchView,
  tolls: TollsView,
  Tolls: TollsView,
  deductions: DeductionsView,
  Deductions: DeductionsView,
  settings: SettingsView,
  Settings: SettingsView,
  login: LoginView,
  Login: LoginView,
  conciliation: ConciliationView,
  Conciliation: ConciliationView,
  reports: ReportsView,
  Reports: ReportsView,
  archive: ArchiveView,
  Archive: ArchiveView,
  modal: Modal,
  Modal: Modal,
};

// Explicit overrides for actions that need custom wrappers (e.g. reload after,
// or arg-shaping). Falls through to dynamic resolution if not present.
const ACTION_BINDINGS = {
  'navigation.show': (APP, view) => showView(view),
  'navigate': (APP, view) => showView(view),
  'login.submit': (APP) => LoginView.handleAuthSubmit && LoginView.handleAuthSubmit(APP, 'login', { onSuccess: () => location.reload() }),
  'settings.changeLanguage': (APP, lang) => SettingsView.changeLanguage && SettingsView.changeLanguage(APP, lang, { onSuccess: () => location.reload() }),
  'changeLanguage': (APP, lang) => changeLanguage && changeLanguage(lang),
  'switchAuthMode': (APP) => LoginView.switchAuthMode && LoginView.switchAuthMode(),
  'handleAuthSubmit': (APP) => LoginView.handleAuthSubmit && LoginView.handleAuthSubmit(APP, 'login', { onSuccess: () => location.reload() }),
  'closeModal': () => closeModal && closeModal(),
  'refreshCurrentView': (APP) => {
    if (APP && APP.currentView) showView(APP.currentView);
  },
  'resetAllData': (APP) => {
    if (confirm('¿Borrar todos los datos? Esta acción no se puede deshacer.')) {
      StorageService.clear();
      location.reload();
    }
  },
  'openMyCompanyEditModal': (APP) => {
    if (typeof MyCompanyView.openEditMyCompanyModal === 'function') {
      MyCompanyView.openEditMyCompanyModal(APP, Modal, { toast: NotificationService?.show, navigate: (v) => showView(v) });
    }
  },
  'saveMyCompanyFromModal': (APP) => {
    if (typeof MyCompanyView.saveMyCompanyFromModal === 'function') {
      MyCompanyView.saveMyCompanyFromModal(APP, {
        toast: NotificationService?.show,
        closeModal: () => closeModal && closeModal(),
        navigate: (v) => showView(v),
      });
    }
  },
  'exportAllData': (APP) => {
    const data = {};
    try { data.companies = APP.companies || []; } catch (e) {}
    try { data.drivers = APP.drivers || []; } catch (e) {}
    try { data.invoices = APP.invoices || []; } catch (e) {}
    try { data.settings = APP.settings || {}; } catch (e) {}
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relaypay-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  },
};

function dispatchAction(action, APP, ...args) {
  // 1) Explicit binding wins
  const explicit = ACTION_BINDINGS[action];
  if (explicit) {
    try { return explicit(APP, ...args); }
    catch (e) { console.error('Action failed:', action, e); return; }
  }

  // 2) Try dynamic resolution as `module.functionName` against imported namespaces
  const dotIdx = action.indexOf('.');
  if (dotIdx > 0) {
    const moduleName = action.slice(0, dotIdx);
    const fnName = action.slice(dotIdx + 1);
    const ns = VIEW_NAMESPACES[moduleName];
    if (ns && typeof ns[fnName] === 'function') {
      try { return ns[fnName](APP, ...args); }
      catch (e) { console.error('Action failed:', action, e); return; }
    }
  }

  // 3) Try treating the action as a bare function name; search all namespaces
  for (const ns of Object.values(VIEW_NAMESPACES)) {
    if (ns && typeof ns[action] === 'function') {
      try { return ns[action](APP, ...args); }
      catch (e) { console.error('Action failed:', action, e); return; }
    }
  }

  console.warn('No action handler for:', action);
}

/* ------------------------------------------------------------
   Sidebar navigation
   ------------------------------------------------------------ */
// Some VIEWS ids use camelCase (e.g. `myCompany`) while VIEW_RENDERERS uses
// snake_case (e.g. `my_company`). Map them so sidebar links resolve correctly.
const VIEW_ID_ALIASES = {
  myCompany: 'my_company',
  my_company: 'myCompany',
};

function renderSidebar(activeViewId) {
  const nav = document.getElementById('sidebar-nav');
  if (!nav) return;
  const html = (VIEWS || []).map(v => {
    const targetId = VIEW_ID_ALIASES[v.id] || v.id;
    const isActive = activeViewId && (activeViewId === v.id || activeViewId === targetId);
    const label = (typeof t === 'function' ? t(v.i18n, v.label) : v.label);
    return `<a href="#" data-action="navigate" data-view="${escapeAttr(targetId)}" class="${isActive ? 'active' : ''}"><span class="nav-icon">${escapeAttr(v.icon)}</span><span class="nav-label">${escapeHtml(label)}</span></a>`;
  }).join('');
  nav.innerHTML = html;
  if (typeof applyTranslations === 'function') applyTranslations();
}

function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttr(s) {
  return escapeHtml(s);
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
    // Update active sidebar link
    try {
      const nav = document.getElementById('sidebar-nav');
      if (nav) {
        nav.querySelectorAll('a').forEach(a => {
          if (a.getAttribute('data-view') === viewName) a.classList.add('active');
          else a.classList.remove('active');
        });
      }
    } catch (e) { /* noop */ }
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
    // Invoice upload zone click → trigger hidden file input
    const dropZone = event.target.closest('#invoiceDropZone');
    if (dropZone) {
      const fileInput = document.getElementById('invoiceFileInput');
      if (fileInput) fileInput.click();
      return;
    }

    const target = event.target.closest('[data-action]');
    if (!target) return;
    const action = target.getAttribute('data-action');
    const APP = getApp();
    const param = target.getAttribute('data-param') || target.getAttribute('data-view') || target.getAttribute('data-id') || null;
    event.preventDefault();
    if (param) dispatchAction(action, APP, param);
    else dispatchAction(action, APP);
  });

  document.addEventListener('change', (event) => {
    const target = event.target;
    // Invoice file input change → load files into APP.pendingFiles
    if (target && target.id === 'invoiceFileInput') {
      const APP = getApp();
      if (target.files && target.files.length > 0 && typeof InvoiceView.handleInvoiceFiles === 'function') {
        InvoiceView.handleInvoiceFiles(APP, { target }, {
          readFile: readInvoiceFile,
          toast: NotificationService?.show,
          refreshCurrentView: () => showView(APP.currentView || 'invoice'),
        });
      }
      return;
    }

    const actionTarget = event.target.closest('[data-action-change]');
    if (!actionTarget) return;
    const action = actionTarget.getAttribute('data-action-change');
    const APP = getApp();
    const value = actionTarget.value;
    const fn = ACTION_BINDINGS[action];
    if (fn) {
      try { fn(APP, value); }
      catch (e) { console.error('Change action failed:', action, e); }
    }
  });

  // Drag & drop for invoice upload zone
  document.addEventListener('dragover', (event) => {
    const dropZone = event.target.closest('#invoiceDropZone');
    if (dropZone) {
      event.preventDefault();
      dropZone.classList.add('dragover');
    }
  });
  document.addEventListener('dragleave', (event) => {
    const dropZone = event.target.closest('#invoiceDropZone');
    if (dropZone) dropZone.classList.remove('dragover');
  });
  document.addEventListener('drop', (event) => {
    const dropZone = event.target.closest('#invoiceDropZone');
    if (!dropZone) return;
    event.preventDefault();
    dropZone.classList.remove('dragover');
    const APP = getApp();
    if (event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files.length > 0
        && typeof InvoiceView.handleInvoiceFiles === 'function') {
      InvoiceView.handleInvoiceFiles(APP, { target: { files: event.dataTransfer.files } }, {
        readFile: readInvoiceFile,
        toast: NotificationService?.show,
        refreshCurrentView: () => showView(APP.currentView || 'invoice'),
      });
    }
  });
}

/* ------------------------------------------------------------
   Boot the application
   ------------------------------------------------------------ */
function bootstrap() {
  console.log('[RelayPay] Booting modular build v' + (APP_CONFIG?.version || '7.6.6'));

  // 0) Inject logo into the sidebar shell (data URL — no external file needed)
  try {
    const logoImg = document.getElementById('appLogo');
    if (logoImg && !logoImg.getAttribute('src')) logoImg.src = LOGO_URI;
  } catch (e) { /* noop */ }

  // 0.5) Schema migration: wipe legacy localStorage from the pre-SaaS build.
  //      The first deployment of this build nukes any pre-existing companies/
  //      drivers/invoices so new paying subscribers start with a clean slate.
  //      Users who already have the marker are left alone.
  try {
    const storedSchema = (typeof localStorage !== 'undefined') ? localStorage.getItem(SCHEMA_VERSION_KEY) : null;
    if (storedSchema !== SCHEMA_VERSION) {
      const keysToWipe = Object.values(STORAGE_KEYS).concat([
        'relaypay_owner_company',
        'relaypay_session',
        'relaypay_user',
      ]);
      keysToWipe.forEach(k => {
        try { if (typeof localStorage !== 'undefined') localStorage.removeItem(k); } catch (e) {}
      });
      try { if (typeof localStorage !== 'undefined') localStorage.setItem(SCHEMA_VERSION_KEY, SCHEMA_VERSION); } catch (e) {}
      console.log('[RelayPay] Schema migration: cleared legacy localStorage');
    }
  } catch (e) { /* noop */ }

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
  const initialView = !session ? 'welcome' : 'dashboard';
  // Render sidebar with the initial active view highlighted
  renderSidebar(initialView);
  showView(initialView);

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
