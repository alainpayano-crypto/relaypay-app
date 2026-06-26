/* ============================================
   router.js — Simple SPA router
   Phase 2 — Modular architecture
   ============================================ */

import { EVENT_NAMES } from './constants.js';

class Router {
  constructor() {
    this.routes = new Map();
    this.currentRoute = null;
    this.init();
  }

  init() {
    document.addEventListener('click', e => {
      const link = e.target.closest('a[data-view]');
      if (link) {
        e.preventDefault();
        this.navigate(link.dataset.view);
      }
    });
  }

  register(view, renderFn) {
    this.routes.set(view, renderFn);
  }

  navigate(view, params = {}) {
    if (!this.routes.has(view)) {
      console.warn('Unknown view:', view);
      return;
    }
    this.currentRoute = view;
    window.location.hash = `#${view}`;

    this.updateActiveLinks(view);
    this.render(view, params);
    window.dispatchEvent(new CustomEvent(EVENT_NAMES.VIEW_CHANGED, { detail: { view } }));
  }

  updateActiveLinks(view) {
    document.querySelectorAll('a[data-view]').forEach(link => {
      link.classList.toggle('active', link.dataset.view === view);
    });
  }

  render(view, params) {
    const renderFn = this.routes.get(view);
    if (!renderFn) return;
    const container = document.querySelector('.main .view-container') || document.querySelector('.main');
    if (container) {
      container.innerHTML = renderFn(params);
    }
  }

  getCurrentRoute() {
    return this.currentRoute;
  }
}

export const router = new Router();