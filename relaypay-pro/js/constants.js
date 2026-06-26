/* ============================================
   constants.js — Application-wide constants
   Phase 2 — Modular architecture
   ============================================ */

export const EVENT_NAMES = {
  STATE_CHANGED: 'app:state-changed',
  VIEW_CHANGED: 'app:view-changed',
  USER_LOGIN: 'auth:login',
  USER_LOGOUT: 'auth:logout',
  TOAST_SHOW: 'ui:toast-show',
  MODAL_OPEN: 'ui:modal-open',
  MODAL_CLOSE: 'ui:modal-close',
  LOADING_START: 'ui:loading-start',
  LOADING_STOP: 'ui:loading-stop',
  INVOICE_SAVED: 'invoice:saved',
  COMPANY_CREATED: 'company:created',
  DRIVER_CREATED: 'driver:created',
  TOLL_ASSIGNED: 'toll:assigned',
};

export const TOAST_TYPES = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info',
};

export const VIEWS_IDS = {
  DASHBOARD: 'dashboard',
  COMPANIES: 'companies',
  DRIVERS: 'drivers',
  INVOICE: 'invoice',
  PENDIENTES: 'pendientes',
  TOLLS: 'tolls',
  MY_COMPANY: 'myCompany',
  SEARCH: 'search',
  CONCILIATION: 'conciliation',
  PAYROLL: 'payroll',
  REPORTS: 'reports',
  ARCHIVE: 'archive',
  SETTINGS: 'settings',
};

export const INVOICE_STATUS = {
  PENDING: 'pendiente',
  PAID: 'pagada',
};

export const DRIVER_STATUS = {
  ACTIVE: 'Activo',
  INACTIVE: 'Inactivo',
};

export const DRIVER_TYPE = {
  EMPLOYEE: 'Employee',
  OWNER_OPERATOR: 'Owner Operator',
};

export const TOLL_STATUS = {
  PENDING: 'PENDIENTE',
  DISPUTE: 'DISPUTA',
  PAID: 'PAGADO',
};

export const RECONCILIATION_RESULT = {
  EXACT: 'EXACT',
  ROUNDING: 'ROUNDING',
  RESIDUAL: 'RESIDUAL',
  DISCREPANCY: 'DISCREPANCY',
};