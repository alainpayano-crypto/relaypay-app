/* ============================================
   config.js — Application configuration constants
   Phase 2 — Modular architecture
   ============================================ */

export const APP_CONFIG = {
  name: 'RelayPay Pro',
  version: '7.6.6',
  apiVersion: 'v1',
  environment: 'production',
};

// Auto-detect API URL based on environment
export function getApiUrl() {
  const hostname = window.location.hostname;

  // Local development
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '') {
    return 'http://localhost:3000';
  }

  // Production / GitHub Pages
  return 'https://relaypay-backend-production.up.railway.app';
}

export const SCHEMA_VERSION = '7.6.6-saas-clean';
export const SCHEMA_VERSION_KEY = 'relaypay_schema_version';

export const STORAGE_KEYS = {
  companies: 'relaypay_v6_companies',
  drivers: 'relaypay_v6_drivers',
  invoices: 'relaypay_v6_invoices',
  settings: 'relaypay_v6_settings',
  pendingBlocks: 'relaypay_v7_pending_blocks',
  tollAssignments: 'relaypay_toll_assignments',
  pendingTolls: 'relaypay_pending_tolls',
  driverPayStructures: 'relaypay_driver_pay_structures',
  session: 'relaypay_v7_session',
  users: 'relaypay_v7_users',
  language: 'relaypay_language',
  seeded: 'relaypay_v7_seeded',
};

export const LIMITS = {
  passwordMinLength: 8,
  nameMaxLength: 100,
  emailMaxLength: 254,
  mcMaxLength: 50,
  einMaxLength: 20,
  tractorMaxCount: 100,
  addressMaxLength: 500,
  commentMaxLength: 1000,
  bodySizeLimit: '1mb',
  defaultCommissionPct: 10,
  defaultDriverPct: 85,
  trialDays: 14,
  twoWeeksMs: 14 * 24 * 60 * 60 * 1000,
  reconciliationThreshold: 0.05,
  residualThreshold: 1.00,
};

export const TIERS = {
  starter: {
    name: 'Starter',
    price: 50,
    maxCompanies: 3,
    maxTrucks: 7,
    maxDrivers: 15,
  },
  pro: {
    name: 'Pro',
    price: 150,
    maxCompanies: 6,
    maxTrucks: 15,
    maxDrivers: 30,
  },
  enterprise: {
    name: 'Enterprise',
    price: 250,
    maxCompanies: 21,
    maxTrucks: 50,
    maxDrivers: 60,
  },
};

export const ROLES = {
  admin: { label: 'Administrador', permissions: ['*'] },
  supervisor: { label: 'Supervisor', permissions: ['view', 'edit', 'approve'] },
  dispatcher: { label: 'Despachador', permissions: ['view', 'edit_tractors', 'edit_drivers'] },
  accountant: { label: 'Contador', permissions: ['view', 'export', 'payroll'] },
};

export const VIEWS = [
  { id: 'dashboard', icon: '📊', label: 'Dashboard', i18n: 'nav.dashboard' },
  { id: 'companies', icon: '🏢', label: 'Empresas', i18n: 'nav.companies' },
  { id: 'drivers', icon: '👤', label: 'Choferes', i18n: 'nav.drivers' },
  { id: 'invoice', icon: '📄', label: 'Procesar Factura', i18n: 'nav.invoice' },
  { id: 'pendientes', icon: '⏳', label: 'Pendientes', i18n: 'nav.pendientes' },
  { id: 'tolls', icon: '🛣️', label: 'Peajes', i18n: 'nav.tolls' },
  { id: 'myCompany', icon: '🏠', label: 'Mi Compañía', i18n: 'nav.my_company' },
  { id: 'search', icon: '🔍', label: 'Búsqueda', i18n: 'nav.search' },
  { id: 'conciliation', icon: '🤖', label: 'Conciliación AI', i18n: 'nav.conciliation' },
  { id: 'payroll', icon: '💰', label: 'Payroll', i18n: 'nav.payroll' },
  { id: 'reports', icon: '📈', label: 'Reportes', i18n: 'nav.reports' },
  { id: 'archive', icon: '📚', label: 'Historial', i18n: 'nav.archive' },
  { id: 'settings', icon: '⚙️', label: 'Configuración', i18n: 'nav.settings' },
];

export const TOAST_DURATION = 4000;
export const REQUEST_TIMEOUT = 30000;
export const DEBOUNCE_DELAY = 300;