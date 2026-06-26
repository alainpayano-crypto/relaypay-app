/* ============================================
   components/Modal.js — Modal component
   Phase 2 — Modular architecture
   ============================================ */

import { escapeHtml } from '../utils.js';
import { EVENT_NAMES } from '../constants.js';

class Modal {
  constructor() {
    this.active = null;
    this.setupGlobalClose();
  }

  setupGlobalClose() {
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && this.active) {
        this.close();
      }
    });
  }

  open(title, content, options = {}) {
    this.close();

    const { size = '' } = options;

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal ${size}">
        <div class="modal-header">
          <h2 class="modal-title">${title}</h2>
          <button class="close-btn" aria-label="Cerrar">×</button>
        </div>
        <div class="modal-body">${content}</div>
      </div>
    `;

    overlay.addEventListener('click', e => {
      if (e.target === overlay) this.close();
    });

    overlay.querySelector('.close-btn').addEventListener('click', () => this.close());

    document.body.appendChild(overlay);
    this.active = overlay;

    window.dispatchEvent(new CustomEvent(EVENT_NAMES.MODAL_OPEN));
  }

  close() {
    if (this.active) {
      this.active.style.animation = 'fadeOut 0.2s ease';
      setTimeout(() => {
        this.active?.remove();
        this.active = null;
      }, 200);
      window.dispatchEvent(new CustomEvent(EVENT_NAMES.MODAL_CLOSE));
    }
  }

  isOpen() {
    return !!this.active;
  }

  setFooter(footerHtml) {
    if (!this.active) return;
    const body = this.active.querySelector('.modal-body');
    let modal = this.active.querySelector('.modal');
    let footer = modal.querySelector('.modal-footer');
    if (!footer) {
      footer = document.createElement('div');
      footer.className = 'modal-footer';
      modal.appendChild(footer);
    }
    footer.innerHTML = footerHtml;
  }
}

export const modal = new Modal();
export const closeModal = () => modal.close();
export const showModal = (title, content, options) => modal.open(title, content, options);