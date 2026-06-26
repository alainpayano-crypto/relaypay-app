/* ============================================
   UserService.js — User and company data operations
   Phase 2 — Modular architecture
   ============================================ */

import { api } from './ApiService.js';
import { StorageService } from './StorageService.js';

class UserServiceClass {
  async getCompanies() {
    try {
      const response = await api.get('/api/companies');
      return response.data.companies || [];
    } catch (err) {
      console.error('UserService.getCompanies error:', err);
      return [];
    }
  }

  async createCompany(data) {
    try {
      const response = await api.post('/api/companies', data);
      return response.data.company;
    } catch (err) {
      if (err.data?.details) {
        const messages = err.data.details.map(d => `${d.field}: ${d.message}`).join(', ');
        throw new Error(messages);
      }
      throw new Error(err.message || 'Error al crear empresa');
    }
  }

  async getDrivers() {
    try {
      const response = await api.get('/api/drivers');
      return response.data.drivers || [];
    } catch (err) {
      console.error('UserService.getDrivers error:', err);
      return [];
    }
  }

  async createDriver(data) {
    try {
      const response = await api.post('/api/drivers', data);
      return response.data.driver;
    } catch (err) {
      if (err.data?.details) {
        const messages = err.data.details.map(d => `${d.field}: ${d.message}`).join(', ');
        throw new Error(messages);
      }
      throw new Error(err.message || 'Error al crear chofer');
    }
  }
}

export const UserService = new UserServiceClass();