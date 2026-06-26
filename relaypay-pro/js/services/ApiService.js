/* ============================================
   ApiService.js — Centralized HTTP client
   Phase 2 — Modular architecture
   ============================================ */

import { getApiUrl, REQUEST_TIMEOUT, LIMITS } from '../config.js';

class ApiService {
  constructor() {
    this.baseURL = getApiUrl();
    this.timeout = REQUEST_TIMEOUT;
    this.token = null;
  }

  setToken(token) {
    this.token = token;
  }

  clearToken() {
    this.token = null;
  }

  getHeaders(extraHeaders = {}) {
    const headers = { 'Content-Type': 'application/json', ...extraHeaders };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    return headers;
  }

  async request(method, path, options = {}) {
    const { body, headers, signal } = options;
    const url = `${this.baseURL}${path}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);
    const finalSignal = signal || controller.signal;

    try {
      const response = await fetch(url, {
        method,
        headers: this.getHeaders(headers),
        body: body ? JSON.stringify(body) : undefined,
        signal: finalSignal,
      });

      clearTimeout(timeoutId);

      const contentType = response.headers.get('content-type') || '';
      const data = contentType.includes('application/json')
        ? await response.json().catch(() => ({}))
        : await response.text();

      if (!response.ok) {
        const error = new Error(data.error || `HTTP ${response.status}`);
        error.status = response.status;
        error.data = data;
        throw error;
      }

      return { data, status: response.status, headers: response.headers };
    } catch (err) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        const timeoutError = new Error('Request timeout');
        timeoutError.code = 'TIMEOUT';
        throw timeoutError;
      }
      throw err;
    }
  }

  get(path, options = {}) {
    return this.request('GET', path, options);
  }

  post(path, body, options = {}) {
    return this.request('POST', path, { ...options, body });
  }

  put(path, body, options = {}) {
    return this.request('PUT', path, { ...options, body });
  }

  delete(path, options = {}) {
    return this.request('DELETE', path, options);
  }
}

export const api = new ApiService();