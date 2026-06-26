/* ============================================
   views/LoginView.js — Login / Auth screen
   Phase 2 — Modular architecture
   ============================================================ */

import { escapeHtml } from '../utils.js';
import { AuthService } from '../services/AuthService.js';

export function renderLoginScreen(APP, ctx = {}) {
  const mode = ctx.mode || 'signin';
  return `
    <div class="login-screen">
      <div class="login-card">
        <h1>${mode === 'signin' ? '🔐 Iniciar Sesión' : '📝 Crear Cuenta'}</h1>
        <p>${mode === 'signin' ? 'Accede a tu cuenta RelayPay' : 'Empieza tu prueba gratuita de 14 días'}</p>
        <form id="loginForm" onsubmit="return false;">
          ${mode === 'signup' ? `
            <div class="form-group">
              <label>Nombre completo</label>
              <input type="text" id="authName" required>
            </div>
            <div class="form-group">
              <label>Nombre de empresa</label>
              <input type="text" id="authCompany" required>
            </div>
          ` : ''}
          <div class="form-group">
            <label>Email</label>
            <input type="email" id="authEmail" required>
          </div>
          <div class="form-group">
            <label>🔒 Contraseña</label>
            <input type="password" id="authPassword" required>
          </div>
          <button class="btn btn-primary" data-action="handleAuthSubmit" data-mode="${mode}" style="width:100%;">
            ${mode === 'signin' ? 'Entrar' : 'Crear cuenta'}
          </button>
        </form>
        <div style="margin-top:16px; text-align:center;">
          ${mode === 'signin' ? `
            <p>¿No tienes cuenta? <a href="#" data-action="switchAuthMode" data-mode="signup">Crear cuenta</a></p>
          ` : `
            <p>¿Ya tienes cuenta? <a href="#" data-action="switchAuthMode" data-mode="signin">Iniciar sesión</a></p>
          `}
        </div>
      </div>
    </div>
  `;
}

export async function handleAuthSubmit(APP, mode, callbacks = {}) {
  const get = (id) => typeof document !== 'undefined' ? document.getElementById(id)?.value || '' : '';
  const email = get('authEmail').trim();
  const password = get('authPassword');

  if (!email || !password) {
    if (callbacks.toast) callbacks.toast('Email y contraseña son requeridos', 'error');
    return;
  }

  try {
    let user;
    if (mode === 'signin') {
      user = await AuthService.login(email, password);
    } else {
      const name = get('authName').trim();
      const company = get('authCompany').trim();
      user = await AuthService.signup({ email, password, name, company });
    }
    APP.user = user.user || user;
    APP.token = user.token;
    if (callbacks.toast) callbacks.toast('Bienvenido!', 'success');
    if (callbacks.navigate) callbacks.navigate('dashboard');
  } catch (e) {
    if (callbacks.toast) callbacks.toast(e.message || 'Error de autenticación', 'error');
  }
}

export function checkAuth(APP, callbacks = {}) {
  if (!AuthService.isAuthenticated()) {
    if (callbacks.navigate) callbacks.navigate('login');
    return false;
  }
  return true;
}

export function logout(APP, callbacks = {}) {
  AuthService.logout();
  APP.user = null;
  APP.token = null;
  if (callbacks.toast) callbacks.toast('Sesión cerrada', 'info');
  if (callbacks.navigate) callbacks.navigate('login');
}

export function showUserInfo(APP) {
  const slot = typeof document !== 'undefined' ? document.getElementById('userInfoSlot') : null;
  if (!slot) return;
  const user = AuthService.getCurrentUser();
  if (user) {
    slot.innerHTML = `<span>👤 ${escapeHtml(user.email || user.name || 'User')}</span> <button class="btn btn-sm btn-secondary" data-action="logout">Cerrar Sesión</button>`;
  } else {
    slot.innerHTML = '';
  }
}