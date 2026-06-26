/* ============================================
   StripeService.js — Stripe checkout operations
   Phase 2 — Modular architecture
   ============================================ */

import { api } from './ApiService.js';

class StripeServiceClass {
  async createCheckoutSession(plan) {
    try {
      const response = await api.post('/api/stripe/create-checkout', { plan });
      return response.data;
    } catch (err) {
      throw new Error(err.message || 'Error al abrir opciones de pago');
    }
  }

  async openCheckout(plan) {
    try {
      const { url } = await this.createCheckoutSession(plan);
      window.location.href = url;
    } catch (err) {
      throw err;
    }
  }

  redirectToPortal() {
    window.location.href = '/app/index.html?action=portal';
  }
}

export const StripeService = new StripeServiceClass();