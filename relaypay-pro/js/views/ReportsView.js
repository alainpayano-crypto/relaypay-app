/* ============================================
   views/ReportsView.js — Reports
   Phase 2 — Modular architecture
   ============================================================ */

import { escapeHtml, money, fmtDate } from '../utils.js';

export function renderReports(APP, ctx = {}) {
  const tab = APP._reportTab || 'company';
  const allTrips = [];
  APP.invoices.forEach(inv => {
    (inv.trips || []).forEach(t => allTrips.push({ ...t, _invoice: inv.label, _invoiceId: inv.id }));
  });

  return `
    <div class="view-header">
      <div>
        <h1 class="view-title" data-i18n="nav.reports">📈 Reportes</h1>
        <p class="view-subtitle" data-i18n="rep.subtitle">Análisis de payroll, por empresa, chofer, ruta y viaje</p>
      </div>
    </div>

    <div class="card">
      <div class="btn-group" style="flex-wrap:wrap;">
        <button class="btn btn-${tab === 'company' ? 'primary' : 'secondary'}" data-action="setReportTab" data-tab="company" data-i18n="rep.tab_company">🏢 Por Empresa</button>
        <button class="btn btn-${tab === 'driver' ? 'primary' : 'secondary'}" data-action="setReportTab" data-tab="driver" data-i18n="rep.tab_driver">👤 Por Chofer</button>
        <button class="btn btn-${tab === 'route' ? 'primary' : 'secondary'}" data-action="setReportTab" data-tab="route" data-i18n="rep.tab_route">📋 Por Ruta</button>
        <button class="btn btn-${tab === 'tractor' ? 'primary' : 'secondary'}" data-action="setReportTab" data-tab="tractor" data-i18n="rep.tab_tractor">🚛 Por Tractor</button>
        <button class="btn btn-${tab === 'trip' ? 'primary' : 'secondary'}" data-action="setReportTab" data-tab="trip" data-i18n="rep.tab_trip">🚛 Por Viaje</button>
      </div>
    </div>

    ${tab === 'company' ? renderReportByCompany(allTrips, APP) : ''}
    ${tab === 'driver' ? renderReportByDriver(allTrips, APP) : ''}
    ${tab === 'route' ? renderReportByRoute(allTrips, APP) : ''}
    ${tab === 'tractor' ? renderReportByTractor(allTrips, APP) : ''}
    ${tab === 'trip' ? renderReportByTrip(allTrips, APP) : ''}
  `;
}

function renderReportByCompany(trips, APP) {
  const byComp = {};
  trips.forEach(t => {
    const comp = APP.findCompanyByTractor(t.tractor);
    const key = comp ? comp.id : '__unassigned';
    if (!byComp[key]) byComp[key] = { name: comp ? comp.name : '⚠️ Sin empresa', trips: 0, gross: 0, miles: 0 };
    byComp[key].trips++;
    byComp[key].gross += t.pay || 0;
    byComp[key].miles += t.miles || 0;
  });
  return renderTable('Empresa', Object.values(byComp).sort((a, b) => b.gross - a.gross));
}

function renderReportByDriver(trips, APP) {
  const byDrv = {};
  trips.forEach(t => {
    const k = t.driver || '(sin chofer)';
    if (!byDrv[k]) byDrv[k] = { name: k, trips: 0, gross: 0, miles: 0 };
    byDrv[k].trips++;
    byDrv[k].gross += t.pay || 0;
    byDrv[k].miles += t.miles || 0;
  });
  return renderTable('Chofer', Object.values(byDrv).sort((a, b) => b.gross - a.gross));
}

function renderReportByRoute(trips, APP) {
  const byRoute = {};
  trips.forEach(t => {
    const k = t.contractId || '(sin contract)';
    if (!byRoute[k]) byRoute[k] = { name: k, trips: 0, gross: 0, miles: 0 };
    byRoute[k].trips++;
    byRoute[k].gross += t.pay || 0;
    byRoute[k].miles += t.miles || 0;
  });
  return renderTable('Contract ID', Object.values(byRoute).sort((a, b) => b.gross - a.gross));
}

function renderReportByTractor(trips, APP) {
  const byTr = {};
  trips.forEach(t => {
    const k = t.tractor || '(sin tractor)';
    if (!byTr[k]) byTr[k] = { name: k, trips: 0, gross: 0, miles: 0 };
    byTr[k].trips++;
    byTr[k].gross += t.pay || 0;
    byTr[k].miles += t.miles || 0;
  });
  return renderTable('Tractor', Object.values(byTr).sort((a, b) => b.gross - a.gross));
}

function renderReportByTrip(trips, APP) {
  const sorted = [...trips].sort((a, b) => b.pay - a.pay);
  return `
    <div class="card">
      <div class="table-wrap">
        <table>
          <thead><tr><th>Fecha</th><th>Chofer</th><th>Tractor</th><th>Contract</th><th>Trip/Block</th><th class="text-right">Monto</th></tr></thead>
          <tbody>
            ${sorted.slice(0, 200).map(t => `
              <tr>
                <td>${fmtDate(t.date)}</td>
                <td>${escapeHtml(t.driver || '—')}</td>
                <td><code>${escapeHtml(t.tractor || '—')}</code></td>
                <td><code style="font-size:11px;">${escapeHtml(t.contractId || '—')}</code></td>
                <td><code style="font-size:11px;">${escapeHtml(t.blockId || t.tripId || '—')}</code></td>
                <td class="text-right money">${money(t.pay)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderTable(label, rows) {
  const total = rows.reduce((s, r) => s + r.gross, 0);
  return `
    <div class="card">
      <div class="table-wrap">
        <table>
          <thead><tr><th>${label}</th><th class="text-right">Viajes</th><th class="text-right">Millas</th><th class="text-right">Total</th></tr></thead>
          <tbody>
            ${rows.map(r => `
              <tr>
                <td>${escapeHtml(r.name)}</td>
                <td class="text-right">${r.trips}</td>
                <td class="text-right">${r.miles}</td>
                <td class="text-right money">${money(r.gross)}</td>
              </tr>
            `).join('')}
            <tr class="total-row">
              <td><b>TOTAL</b></td>
              <td class="text-right">${rows.reduce((s, r) => s + r.trips, 0)}</td>
              <td class="text-right">${rows.reduce((s, r) => s + r.miles, 0)}</td>
              <td class="text-right money"><b>${money(total)}</b></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `;
}

export function setReportTab(APP, tab) {
  APP._reportTab = tab;
}

export function exportReportCSV(APP, callbacks = {}) {
  const tab = APP._reportTab || 'company';
  const trips = [];
  APP.invoices.forEach(inv => (inv.trips || []).forEach(t => trips.push({ ...t, invoice: inv.label })));
  let csv = '';
  if (tab === 'company') {
    csv = 'Empresa,Tractor,Contract,Viajes,Millas,Total\n';
    const byComp = {};
    trips.forEach(t => {
      const c = APP.findCompanyByTractor(t.tractor);
      const k = c ? c.name : 'Sin empresa';
      if (!byComp[k]) byComp[k] = { name: k, trips: 0, miles: 0, total: 0, tractors: new Set(), contracts: new Set() };
      byComp[k].trips++;
      byComp[k].miles += t.miles || 0;
      byComp[k].total += t.pay || 0;
      if (t.tractor) byComp[k].tractors.add(t.tractor);
      if (t.contractId) byComp[k].contracts.add(t.contractId);
    });
    Object.values(byComp).forEach(r => {
      csv += `"${r.name}",${Array.from(r.tractors).join('|')},"${Array.from(r.contracts).join('|')}",${r.trips},${r.miles},${r.total.toFixed(2)}\n`;
    });
  } else if (tab === 'driver') {
    csv = 'Chofer,Viajes,Millas,Total\n';
    const byDrv = {};
    trips.forEach(t => {
      const k = t.driver || '(sin chofer)';
      if (!byDrv[k]) byDrv[k] = { name: k, trips: 0, miles: 0, total: 0 };
      byDrv[k].trips++;
      byDrv[k].miles += t.miles || 0;
      byDrv[k].total += t.pay || 0;
    });
    Object.values(byDrv).forEach(r => {
      csv += `"${r.name}",${r.trips},${r.miles},${r.total.toFixed(2)}\n`;
    });
  } else {
    csv = 'Fecha,Chofer,Tractor,Contract,Trip/Block,Monto\n';
    trips.forEach(t => {
      csv += `${t.date || ''},"${t.driver || ''}","${t.tractor || ''}","${t.contractId || ''}","${t.blockId || t.tripId || ''}",${(t.pay || 0).toFixed(2)}\n`;
    });
  }
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `relaypay_report_${tab}_${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  if (callbacks.toast) callbacks.toast('Reporte exportado', 'success');
}