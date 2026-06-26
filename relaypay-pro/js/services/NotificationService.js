/* ============================================
   NotificationService.js — Toast notifications
   Phase 2 — Modular architecture
   ============================================ */

import { TOAST_DURATION } from '../config.js';
import { TOAST_TYPES } from '../constants.js';

class NotificationServiceClass {
  init() {
    if (this.container) return;
    this.container = document.createElement('div');
    this.container.className = 'toast-container';
    document.body.appendChild(this.container);
  }

  show(message, type = TOAST_TYPES.INFO, duration = TOAST_DURATION) {
    this.init();

    const toast = document.createElement('div');
    toast.className = `toast toast-${type} toast-enter`;

    const icon = this.getIcon(type);
    toast.innerHTML = `
      <span class="toast-icon">${icon}</span>
      <span class="toast-message">${this.escape(message)}</span>
      <button class="toast-close" aria-label="Cerrar">×</button>
    `;

    const close = () => {
      toast.classList.remove('toast-enter');
      toast.classList.add('toast-exit');
      setTimeout(() => toast.remove(), 300);
    };

    toast.querySelector('.toast-close').addEventListener('click', close);
    this.container.appendChild(toast);

    if (duration > 0) {
      setTimeout(close, duration);
    }
  }

  success(message, duration) {
    this.show(message, TOAST_TYPES.SUCCESS, duration);
  }

  error(message, duration) {
    this.show(message, TOAST_TYPES.ERROR, duration);
  }

  warning(message, duration) {
    this.show(message, TOAST_TYPES.WARNING, duration);
  }

  info(message, duration) {
    this.show(message, TOAST_TYPES.INFO, duration);
  }

  getIcon(type) {
    const icons = {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️',
    };
    return icons[type] || icons.info;
  }

  escape(s) {
    const div = document.createElement('div');
    div.textContent = String(s);
    return div.innerHTML;
  }
}

export const NotificationService = new NotificationServiceClass();