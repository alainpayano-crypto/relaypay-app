/* ============================================
   services/PdfService.js — PDF generation
   Phase 2 — Modular architecture
   ============================================================ */

import { escapeHtml, money, fmtDate } from '../utils.js';

/**
 * Generate a driver invoice PDF and trigger download.
 * Logic mirrors nomina_public/index.html (lines 9921-10020).
 * @param {Object} driver - { name, id }
 * @param {Array} trips - trips for the driver
 * @param {Object} inv - invoice meta
 * @param {Object} comp - company meta
 * @param {Object} structureOverride - optional pay structure override
 */
export async function generateDriverInvoicePDF(driver, trips, inv, comp, structureOverride) {
  // Use jsPDF if loaded, otherwise fall back to printable HTML in new tab
  const w = typeof window !== 'undefined' ? window : null;
  if (!w) return;
  if (w.jspdf && w.jspdf.jsPDF) {
    return generateJsPdfDriverInvoice(driver, trips, inv, comp, structureOverride);
  }
  return generateHtmlDriverInvoice(driver, trips, inv, comp, structureOverride);
}

function generateJsPdfDriverInvoice(driver, trips, inv, comp, structureOverride) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'pt', format: 'letter' });
  // Header
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(`Factura - ${driver.name}`, 40, 40);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Periodo: ${fmtDate(inv.rangeStart)} → ${fmtDate(inv.rangeEnd)}`, 40, 58);
  doc.text(`Generado: ${new Date().toLocaleString('es-ES')}`, 40, 72);

  // Compute totals
  const totalGross = trips.reduce((s, t) => s + (t.pay || 0), 0);
  const totalMiles = trips.reduce((s, t) => s + (t.miles || 0), 0);
  const pct = (driver && driver.pct) || 85;
  const driverPay = totalGross * (pct / 100);

  // Trips table
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Trip / Block', 40, 100);
  doc.text('Fecha', 200, 100);
  doc.text('Millas', 280, 100);
  doc.text('Monto', 360, 100, { align: 'right' });
  doc.setFont('helvetica', 'normal');

  let y = 116;
  trips.slice(0, 60).forEach(t => {
    if (y > 720) { doc.addPage(); y = 40; }
    doc.text(String(t.blockId || t.tripId || '').slice(0, 18), 40, y);
    doc.text(fmtDate(t.date), 200, y);
    doc.text(String(t.miles || 0), 280, y);
    doc.text(money(t.pay), 560, y, { align: 'right' });
    y += 14;
  });

  // Totals box
  y += 16;
  doc.setFont('helvetica', 'bold');
  doc.text('RESUMEN', 40, y);
  y += 14;
  doc.setFont('helvetica', 'normal');
  doc.text(`Total Bruto:`, 40, y);
  doc.text(money(totalGross), 560, y, { align: 'right' });
  y += 14;
  doc.text(`Millas:`, 40, y);
  doc.text(String(totalMiles), 560, y, { align: 'right' });
  y += 14;
  doc.text(`% Chofer (${pct}%):`, 40, y);
  doc.text(money(driverPay), 560, y, { align: 'right' });

  doc.save(`factura_${driver.name.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.pdf`);
}

function generateHtmlDriverInvoice(driver, trips, inv, comp, structureOverride) {
  const totalGross = trips.reduce((s, t) => s + (t.pay || 0), 0);
  const totalMiles = trips.reduce((s, t) => s + (t.miles || 0), 0);
  const pct = (driver && driver.pct) || 85;
  const driverPay = totalGross * (pct / 100);

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Factura - ${escapeHtml(driver.name)}</title>
    <style>
      body { font-family: Helvetica, Arial, sans-serif; padding: 40px; color: #1a1a1a; }
      h1 { margin: 0 0 8px; font-size: 22px; }
      .meta { color: #555; font-size: 12px; margin-bottom: 24px; }
      table { width: 100%; border-collapse: collapse; margin-top: 16px; }
      th, td { padding: 8px 6px; border-bottom: 1px solid #ddd; font-size: 11px; text-align: left; }
      th { background: #f4f4f4; font-weight: 600; }
      td.money, th.money { text-align: right; font-variant-numeric: tabular-nums; }
      .summary { margin-top: 24px; padding: 16px; background: #f9f9f9; border: 1px solid #ddd; }
      .summary-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 13px; }
      .summary-row.total { border-top: 2px solid #333; padding-top: 8px; margin-top: 8px; font-weight: 700; font-size: 15px; }
      @media print { body { padding: 12px; } .no-print { display: none; } }
    </style></head><body>
    <h1>Factura — ${escapeHtml(driver.name)}</h1>
    <div class="meta">
      <div>Compañía: ${comp ? escapeHtml(comp.name) : '—'}</div>
      <div>Período: ${fmtDate(inv.rangeStart)} → ${fmtDate(inv.rangeEnd)}</div>
      <div>Generado: ${new Date().toLocaleString('es-ES')}</div>
    </div>
    <table>
      <thead><tr><th>Trip / Block</th><th>Fecha</th><th>Millas</th><th class="money">Monto</th></tr></thead>
      <tbody>
        ${trips.map(t => `
          <tr>
            <td>${escapeHtml(t.blockId || t.tripId || '')}</td>
            <td>${fmtDate(t.date)}</td>
            <td>${t.miles || 0}</td>
            <td class="money">${money(t.pay)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
    <div class="summary">
      <div class="summary-row"><span>Total Bruto</span><span>${money(totalGross)}</span></div>
      <div class="summary-row"><span>Millas Totales</span><span>${totalMiles}</span></div>
      <div class="summary-row"><span>% Chofer (${pct}%)</span><span>${money(driverPay)}</span></div>
      <div class="summary-row total"><span>A Pagar al Chofer</span><span>${money(driverPay)}</span></div>
    </div>
    <div class="no-print" style="margin-top:24px;text-align:center;">
      <button onclick="window.print()" style="padding:10px 24px;font-size:14px;cursor:pointer;">🖨️ Imprimir / Guardar PDF</button>
    </div>
    </body></html>`;

  const w = window.open('', '_blank');
  if (w) {
    w.document.write(html);
    w.document.close();
  }
}

export function downloadDriverInvoice(driverId, invoiceId, APP) {
  const driver = APP.drivers.find(d => d.id === driverId);
  const inv = APP.invoices.find(i => i.id === invoiceId);
  if (!driver || !inv) return;
  const trips = (inv.trips || []).filter(t => normalizeStr(t.driver) === normalizeStr(driver.name));
  const comp = APP.companies.find(c => c.id === driver.companyId);
  return generateDriverInvoicePDF(driver, trips, inv, comp);
}

function normalizeStr(s) { return String(s || '').toLowerCase().trim().replace(/\s+/g, ' '); }

export async function downloadMyCompanyInvoicePDF() {
  // Implemented in MyCompanyView.js — placeholder
}