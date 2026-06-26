/* ============================================
   services/FileReaderService.js — CSV/XLSX file reader
   Phase 2 — Modular architecture
   ============================================================ */

/**
 * Read a file (CSV or XLSX) and return { columns, rows }.
 * Uses global XLSX if available, otherwise CSV parsing.
 */
export async function readFile(file) {
  const ext = (file.name || '').split('.').pop().toLowerCase();
  if (ext === 'xlsx' || ext === 'xls') {
    return readXLSX(file);
  }
  return readCSV(file);
}

export async function readCSV(file) {
  const text = await file.text();
  return parseCSV(text);
}

export function parseCSV(text) {
  // Split lines (handle \r\n and quoted multi-line values)
  const rows = [];
  let cur = '';
  let inQuote = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      cur += c;
      inQuote = !inQuote;
    } else if ((c === '\n' || c === '\r') && !inQuote) {
      if (cur.length) rows.push(cur);
      cur = '';
      if (c === '\r' && text[i + 1] === '\n') i++;
    } else {
      cur += c;
    }
  }
  if (cur.length) rows.push(cur);

  if (rows.length === 0) return { columns: [], rows: [] };
  const headerLine = rows.shift();
  const columns = parseCSVLine(headerLine).map(c => c.trim().replace(/^"|"$/g, ''));

  const parsedRows = rows.map(line => {
    const cells = parseCSVLine(line);
    const row = {};
    columns.forEach((col, i) => { row[col] = cells[i] || ''; });
    return row;
  }).filter(r => Object.values(r).some(v => String(v).trim()));

  return { columns, rows: parsedRows };
}

function parseCSVLine(line) {
  const cells = [];
  let cur = '';
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuote && line[i + 1] === '"') { cur += '"'; i++; }
      else inQuote = !inQuote;
    } else if (c === ',' && !inQuote) {
      cells.push(cur); cur = '';
    } else {
      cur += c;
    }
  }
  cells.push(cur);
  return cells;
}

export async function readXLSX(file) {
  if (typeof window === 'undefined' || !window.XLSX) {
    throw new Error('XLSX library not loaded. Please include the xlsx script tag.');
  }
  const buffer = await file.arrayBuffer();
  const wb = window.XLSX.read(buffer, { type: 'array' });
  const sheetName = wb.SheetNames[0];
  const sheet = wb.Sheets[sheetName];
  const json = window.XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false });
  if (json.length === 0) return { columns: [], rows: [] };
  const columns = Object.keys(json[0]);
  return { columns, rows: json };
}

/**
 * Read an Amazon Relay invoice XLSX (multi-sheet, more complex).
 * Returns { trips: {tripId: data}, blocks: {blockId: data}, allLineItems: [...] }
 */
export async function readAmazonInvoiceXLSX(file) {
  if (typeof window === 'undefined' || !window.XLSX) {
    throw new Error('XLSX library not loaded.');
  }
  const buffer = await file.arrayBuffer();
  const wb = window.XLSX.read(buffer, { type: 'array' });
  const result = { trips: {}, blocks: {}, allLineItems: [], files: [file.name] };

  wb.SheetNames.forEach(name => {
    const sheet = wb.Sheets[name];
    const json = window.XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false });
    json.forEach(row => {
      const tripId = String(row['Trip ID'] || row['Load ID'] || '').trim();
      const blockId = String(row['Block ID'] || '').trim();
      const total = Number(row['Gross Pay'] || row['Total'] || row['Pay'] || 0);
      const item = String(row['Item'] || row['Description'] || '').trim();
      const invoiceType = String(row['Invoice Type'] || row['Type'] || '').trim();
      const invoiceNumber = String(row['Invoice Number'] || row['Invoice #'] || name).trim();
      const invoiceDate = String(row['Invoice Date'] || row['Date'] || '').trim();
      const contractId = String(row['Contract ID'] || '').trim();
      const driver = String(row['Driver Name'] || '').trim();
      const tractor = String(row['Tractor'] || row['Vehicle'] || '').trim();
      const route = String(row['Route'] || row['Facility Sequence'] || '').trim();

      if (blockId && blockId.toUpperCase().startsWith('B-')) {
        if (!result.blocks[blockId] || Math.abs(total) > Math.abs(result.blocks[blockId].total || 0)) {
          result.blocks[blockId] = { total, item, invoiceType, invoiceNumber, invoiceDate, contractId, driver, tractor };
        }
      } else if (tripId) {
        if (!result.trips[tripId]) {
          result.trips[tripId] = { total: 0, items: [], invoiceType, invoiceNumber, invoiceDate, contractId, driver, tractor };
        }
        result.trips[tripId].total += total;
        if (Math.abs(total) > Math.abs(result.trips[tripId].maxItemTotal || 0)) {
          result.trips[tripId].maxItemTotal = total;
          result.trips[tripId].invoiceNumber = invoiceNumber;
          result.trips[tripId].invoiceDate = invoiceDate;
          result.trips[tripId].itemType = item;
        }
      }

      result.allLineItems.push({
        item, gross: total, blockId, tripId, contractId, driver, tractor,
        invoiceType, invoiceNumber, invoiceDate, route,
      });
    });
  });

  return result;
}