/* ============================================
   views/SearchView.js — Global search
   Phase 2 — Modular architecture
   ============================================================ */

import { escapeHtml, money } from '../utils.js';

export function renderSearchView(APP, ctx = {}) {
  return `
    <div class="view-header">
      <div>
        <h1 class="view-title" data-i18n="search.title">🔍 Buscador Global</h1>
        <p class="view-subtitle" data-i18n="search.desc">Busca por nombre, placa, Block ID, Trip ID, Contract ID, etc.</p>
      </div>
    </div>
    <div class="card">
      <input type="text" id="globalSearchInput" data-i18n-placeholder="search.input_placeholder" placeholder="Escribe para buscar..." style="width:100%; font-size:18px; padding:14px;">
    </div>
    <div id="globalSearchResults"></div>
  `;
}

export function runGlobalSearch(APP, query, callbacks = {}) {
  const q = (query || '').trim().toLowerCase();
  if (!q) {
    const root = typeof document !== 'undefined' ? document.getElementById('globalSearchResults') : null;
    if (root) root.innerHTML = '';
    return;
  }

  const matches = {
    companies: [],
    drivers: [],
    invoices: [],
    blocks: [],
    trips: [],
  };

  // Companies
  APP.companies.forEach(c => {
    if (c.name.toLowerCase().includes(q) ||
        (c.mcNumber || '').toLowerCase().includes(q) ||
        (c.tractors || []).some(t => t.toLowerCase().includes(q))) {
      matches.companies.push(c);
    }
  });

  // Drivers
  APP.drivers.forEach(d => {
    if (d.name.toLowerCase().includes(q) ||
        (d.phone || '').toLowerCase().includes(q) ||
        (d.email || '').toLowerCase().includes(q)) {
      matches.drivers.push(d);
    }
  });

  // Invoices
  APP.invoices.forEach(inv => {
    if ((inv.label || '').toLowerCase().includes(q)) matches.invoices.push(inv);
    (inv.trips || []).forEach(t => {
      if ((t.blockId || '').toLowerCase().includes(q)) matches.blocks.push({ ...t, invoice: inv.label });
      else if ((t.tripId || '').toLowerCase().includes(q)) matches.trips.push({ ...t, invoice: inv.label });
      else if ((t.contractId || '').toLowerCase().includes(q)) matches.blocks.push({ ...t, invoice: inv.label });
      else if ((t.driver || '').toLowerCase().includes(q)) matches.blocks.push({ ...t, invoice: inv.label });
    });
  });

  const root = typeof document !== 'undefined' ? document.getElementById('globalSearchResults') : null;
  if (!root) return;
  root.innerHTML = `
    ${matches.companies.length > 0 ? `
      <div class="card">
        <div class="card-title">🏢 Empresas (${matches.companies.length})</div>
        <ul>${matches.companies.slice(0, 10).map(c => `<li>${escapeHtml(c.name)} ${c.mcNumber ? `· MC: ${escapeHtml(c.mcNumber)}` : ''}</li>`).join('')}</ul>
      </div>
    ` : ''}
    ${matches.drivers.length > 0 ? `
      <div class="card">
        <div class="card-title">👤 Choferes (${matches.drivers.length})</div>
        <ul>${matches.drivers.slice(0, 10).map(d => `<li>${escapeHtml(d.name)}</li>`).join('')}</ul>
      </div>
    ` : ''}
    ${matches.invoices.length > 0 ? `
      <div class="card">
        <div class="card-title">📄 Facturas (${matches.invoices.length})</div>
        <ul>${matches.invoices.slice(0, 10).map(i => `<li>${escapeHtml(i.label)}</li>`).join('')}</ul>
      </div>
    ` : ''}
    ${matches.blocks.length > 0 ? `
      <div class="card">
        <div class="card-title">🚛 Bloques/Trips (${matches.blocks.length})</div>
        <div class="table-wrap"><table>
          <thead><tr><th>Tipo</th><th>ID</th><th>Chofer</th><th>Factura</th><th class="text-right">Monto</th></tr></thead>
          <tbody>
            ${matches.blocks.slice(0, 50).map(b => `
              <tr>
                <td>${b.type || (b.blockId ? 'BLOCK' : 'LOAD')}</td>
                <td><code style="font-size:11px;">${escapeHtml(b.blockId || b.tripId)}</code></td>
                <td>${escapeHtml(b.driver || '—')}</td>
                <td><small>${escapeHtml(b.invoice || '')}</small></td>
                <td class="text-right money">${money(b.pay)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table></div>
      </div>
    ` : ''}
    ${matches.companies.length === 0 && matches.drivers.length === 0 && matches.invoices.length === 0 && matches.blocks.length === 0 ? `
      <div class="card"><div class="empty-state"><p>Sin resultados para "${escapeHtml(q)}"</p></div></div>
    ` : ''}
  `;
}