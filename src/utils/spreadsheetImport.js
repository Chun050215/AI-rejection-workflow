import JSZip from 'jszip';
import * as XLSX from 'xlsx';
import { parseCsvContent } from './csv';

function formatCsvCell(value) {
  const s = String(value ?? '').trim();
  if (!s) return '';
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function rowsToCsvText(rows) {
  return rows
    .filter((row) => row.some((cell) => String(cell ?? '').trim()))
    .map((row) => row.map(formatCsvCell).join(','))
    .join('\n');
}

function workbookToRows(workbook) {
  const sheetName = workbook.SheetNames?.[0];
  if (!sheetName) return [];
  const sheet = workbook.Sheets[sheetName];
  return XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
}

function parseWorkbookRows(rows, defaultReason) {
  const text = rowsToCsvText(rows);
  if (!text.trim()) return [];
  return parseCsvContent(text, defaultReason);
}

async function readExcelBuffer(buffer, defaultReason) {
  const workbook = XLSX.read(buffer, { type: 'array' });
  return parseWorkbookRows(workbookToRows(workbook), defaultReason);
}

async function readNumbersZip(buffer, defaultReason) {
  const zip = await JSZip.loadAsync(buffer);
  const entries = Object.keys(zip.files).filter((name) => !zip.files[name].dir);

  const dataFile = entries.find((name) => /\.(csv|tsv|txt)$/i.test(name));
  if (dataFile) {
    const text = await zip.file(dataFile).async('string');
    const parsed = parseCsvContent(text, defaultReason);
    if (parsed.length) return parsed;
  }

  const tableXml = entries.find((name) => /table|sheet|data/i.test(name) && /\.xml$/i.test(name));
  if (tableXml) {
    const xml = await zip.file(tableXml).async('string');
    const rows = xmlToSimpleRows(xml);
    const parsed = parseWorkbookRows(rows, defaultReason);
    if (parsed.length) return parsed;
  }

  return null;
}

/** 從 Numbers 匯出的簡易 XML 表格擷取文字（備援） */
function xmlToSimpleRows(xml) {
  const rows = [];
  const rowMatches = xml.matchAll(/<(?:row|tr)[^>]*>([\s\S]*?)<\/(?:row|tr)>/gi);
  for (const rowMatch of rowMatches) {
    const cells = [];
    const cellMatches = rowMatch[1].matchAll(/<(?:cell|td|th)[^>]*>([\s\S]*?)<\/(?:cell|td|th)>/gi);
    for (const cellMatch of cellMatches) {
      cells.push(cellMatch[1].replace(/<[^>]+>/g, '').trim());
    }
    if (cells.length) rows.push(cells);
  }
  return rows;
}

function getExtension(filename) {
  const lower = (filename || '').toLowerCase();
  if (lower.endsWith('.numbers')) return 'numbers';
  const parts = lower.split('.');
  return parts.length > 1 ? parts.pop() : '';
}

/**
 * 讀取 CSV / Excel / Numbers 檔，回傳應徵者列陣列
 */
export async function importSpreadsheetFile(file, defaultReason) {
  if (!file) return [];

  const ext = getExtension(file.name);
  const buffer = await file.arrayBuffer();

  if (ext === 'csv' || ext === 'txt' || ext === 'tsv') {
    const text = new TextDecoder('utf-8').decode(buffer);
    return parseCsvContent(text, defaultReason);
  }

  if (ext === 'xlsx' || ext === 'xls' || ext === 'ods') {
    return readExcelBuffer(buffer, defaultReason);
  }

  if (ext === 'numbers') {
    const fromZip = await readNumbersZip(buffer, defaultReason);
    if (fromZip?.length) return fromZip;

    try {
      const parsed = await readExcelBuffer(buffer, defaultReason);
      if (parsed.length) return parsed;
    } catch {
      /* Numbers 二進位格式無法用 Excel 解析 */
    }

    throw new Error(
      '無法直接讀取此 .numbers 檔。請在 Numbers 選「檔案 → 輸出到 → Excel（.xlsx）」或「CSV」，再重新上傳。'
    );
  }

  // 未知副檔名：依序嘗試 Excel → ZIP（內含 CSV）
  try {
    const parsed = await readExcelBuffer(buffer, defaultReason);
    if (parsed.length) return parsed;
  } catch {
    /* continue */
  }

  const fromZip = await readNumbersZip(buffer, defaultReason);
  if (fromZip?.length) return fromZip;

  throw new Error('不支援的檔案格式，請使用 CSV、Excel（.xlsx）或 Numbers（.numbers）');
}

export { SPREADSHEET_ACCEPT } from '../constants/spreadsheetAccept';

/** 將解析結果轉回文字，供文字框預覽／編輯 */
export function applicantsToCsvPreview(rows) {
  if (!rows?.length) return '';
  const lines = rows.map((r) =>
    [r.name, r.position, r.email || '', r.reason || '', r.resume || ''].map(formatCsvCell).join(',')
  );
  return lines.join('\n');
}
