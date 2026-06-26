/* ============================================
   LoadingService.js — Loading state management
   Phase 2 — Modular architecture
   ============================================ */

class LoadingServiceClass {
  constructor() {
    this.activeRequests = new Set();
  }

  start(key = 'default') {
    this.activeRequests.add(key);
    this.render();
  }

  show(key = 'default') {
    this.start(key);
  }

  stop(key = 'default') {
    this.activeRequests.delete(key);
    if (this.activeRequests.size === 0) {
      this.hide();
    }
  }

  isLoading(key = 'default') {
    return this.activeRequests.has(key);
  }

  isAnyLoading() {
    return this.activeRequests.size > 0;
  }

  render() {
    if (this.overlay) {
      this.overlay.remove();
    }
    if (this.activeRequests.size === 0) return;

    const overlay = document.createElement('div');
    overlay.className = 'loading-overlay';
    overlay.innerHTML = `
      <div class="loading-spinner">
        <div class="spinner spinner-lg"></div>
        <div class="loading-message">Cargando...</div>
      </div>
    `;
    document.body.appendChild(overlay);
    this.overlay = overlay;
  }

  hide() {
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
    }
  }

  async withLoading(fn, key = 'default') {
    this.start(key);
    try {
      return await fn();
    } finally {
      this.stop(key);
    }
  }

  setButtonLoading(button, loading = true) {
    if (loading) {
      button.dataset.originalText = button.innerHTML;
      button.classList.add('loading');
      button.disabled = true;
    } else {
      if (button.dataset.originalText) {
        button.innerHTML = button.dataset.originalText;
      }
      button.classList.remove('loading');
      button.disabled = false;
    }
  }
}

export const LoadingService = new LoadingServiceClass();