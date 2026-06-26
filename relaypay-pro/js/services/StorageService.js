/* ============================================
   StorageService.js — Safe localStorage wrapper
   Phase 2 — Modular architecture
   ============================================ */

const _memoryFallback = {};

class StorageServiceClass {
  get(key, fallback = null) {
    try {
      const v = localStorage.getItem(key);
      return v == null ? fallback : v;
    } catch (e) {
      console.warn('StorageService.get failed for', key, e.message);
      return _memoryFallback[key] != null ? _memoryFallback[key] : fallback;
    }
  }

  set(key, value) {
    try {
      localStorage.setItem(key, value);
      _memoryFallback[key] = value;
      return true;
    } catch (e) {
      console.warn('StorageService.set failed for', key, e.message);
      _memoryFallback[key] = value;
      return false;
    }
  }

  remove(key) {
    try {
      localStorage.removeItem(key);
    } catch (e) {}
    delete _memoryFallback[key];
  }

  getJSON(key, fallback = null) {
    const v = this.get(key);
    if (v == null) return fallback;
    try {
      return JSON.parse(v);
    } catch (e) {
      console.warn('StorageService.getJSON parse failed for', key);
      return fallback;
    }
  }

  setJSON(key, value) {
    try {
      return this.set(key, JSON.stringify(value));
    } catch (e) {
      console.warn('StorageService.setJSON failed for', key, e.message);
      return false;
    }
  }

  clear() {
    try {
      localStorage.clear();
    } catch (e) {}
    Object.keys(_memoryFallback).forEach(k => delete _memoryFallback[k]);
  }
}

export const StorageService = new StorageServiceClass();