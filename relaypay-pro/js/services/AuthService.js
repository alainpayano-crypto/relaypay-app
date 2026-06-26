/* ============================================
   AuthService.js — Authentication operations
   Phase 2 — Modular architecture
   ============================================ */

import { api } from './ApiService.js';
import { StorageService } from './StorageService.js';

const SESSION_KEY = 'relaypay_session';

class AuthServiceClass {
  async signup(data) {
    try {
      const response = await api.post('/api/auth/signup', data);
      api.setToken(response.data.token);
      StorageService.setJSON(SESSION_KEY, {
        token: response.data.token,
        user: response.data.user,
      });
      return response.data;
    } catch (err) {
      throw this.handleError(err, 'Error al crear la cuenta');
    }
  }

  async login(email, password) {
    try {
      const response = await api.post('/api/auth/login', { email, password });
      api.setToken(response.data.token);
      StorageService.setJSON(SESSION_KEY, {
        token: response.data.token,
        user: response.data.user,
      });
      return response.data;
    } catch (err) {
      throw this.handleError(err, 'Email o contraseña incorrectos');
    }
  }

  async getMe() {
    try {
      const response = await api.get('/api/auth/me');
      return response.data.user;
    } catch (err) {
      throw this.handleError(err, 'Error al obtener datos del usuario');
    }
  }

  logout() {
    api.clearToken();
    StorageService.remove(SESSION_KEY);
  }

  getSession() {
    return StorageService.getJSON(SESSION_KEY);
  }

  isAuthenticated() {
    const session = this.getSession();
    return !!(session && session.token);
  }

  getCurrentUser() {
    const session = this.getSession();
    return session?.user || null;
  }

  getToken() {
    const session = this.getSession();
    return session?.token || null;
  }

  handleError(err, defaultMessage) {
    if (err.status === 429) {
      return new Error('Demasiados intentos. Espera unos minutos.');
    }
    if (err.status === 401) {
      this.logout();
      return new Error('Sesión expirada. Por favor inicia sesión de nuevo.');
    }
    if (err.status === 403) {
      return new Error('No tienes permiso para realizar esta acción.');
    }
    return new Error(err.message || defaultMessage);
  }
}

export const AuthService = new AuthServiceClass();