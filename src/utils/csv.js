import { REASONS } from '../constants';

export function parseCsvLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') inQuotes = !inQuotes;
    else if ((ch === ',' || ch === '\t') && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else current += ch;
  }
  result.push(current.trim().replace(/^"|"$/g, ''));
  return result;
}

function isEmail(str) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((str || '').trim());
}

function normalizeHeader(cell) {
  return (cell || '').trim().toLowerCase().replace(/\s/g, '');
}

function isHeaderRow(parts) {
  const joined = parts.join('').toLowerCase();
  return (
    (/姓名|name/.test(joined) && /職位|position|職務|岗位/.test(joined)) ||
    /email|信箱|郵件|e-mail/.test(joined)
  );
}

function buildColumnMap(headers) {
  const map = { name: 0, position: 1 };
  headers.forEach((h, i) => {
    const t = normalizeHeader(h);
    if (/^姓名|^name/.test(t)) map.name = i;
    else if (/職位|position|職務|岗位/.test(t)) map.position = i;
    else if (/email|信箱|郵件|e-mail/.test(t)) map.email = i;
    else if (/個別|未錄取理由|詳細原因|reasondetail/.test(t)) map.reasonDetail = i;
    else if (/原因|reason|婉拒/.test(t)) map.reason = i;
    else if (/備註|評語|notes|note|評估|comment/.test(t)) map.note = i;
    else if (/履歷|简历|resume|cv|履歷摘要/.test(t)) map.resume = i;
  });
  return map;
}

function parseApplicantRowPositional(parts, defaultReason) {
  const name = (parts[0] || '').trim();
  const position = (parts[1] || '').trim();
  if (!name || !position) return null;

  let email = '';
  let reason = '';
  let note = '';

  if (parts.length === 2) {
    return { name, position, email, reason: '', reasonDetail: '', note: '', resume: '' };
  }

  if (parts.length === 3) {
    const p2 = (parts[2] || '').trim();
    let resume = '';
    if (isEmail(p2)) email = p2;
    else if (REASONS.includes(p2)) reason = p2;
    else if (p2.length >= 20) resume = p2;
    else note = p2;
    const reasonDetail = !reason && note && !REASONS.includes(note) ? note : '';
    return { name, position, email, reason, reasonDetail, note: reasonDetail ? '' : note, resume };
  }

  if (parts.length >= 4) {
    const p2 = (parts[2] || '').trim();
    const p3 = (parts[3] || '').trim();
    if (isEmail(p3)) {
      email = p3;
      if (REASONS.includes(p2)) reason = p2;
      else note = p2;
    } else if (isEmail(p2)) {
      email = p2;
      if (REASONS.includes(p3)) reason = p3;
      else note = p3;
    } else {
      if (REASONS.includes(p2)) reason = p2;
      else note = p2;
      if (isEmail(p3)) email = p3;
      else if (REASONS.includes(p3)) reason = p3;
      else note = [note, p3].filter(Boolean).join(' ');
    }
    let resume = '';
    if (parts.length > 4) {
      const extra = parts.slice(4).join(' ').trim();
      if (extra.length >= 20 && !isEmail(extra) && !REASONS.includes(extra)) resume = extra;
      else note = [note, extra].filter(Boolean).join(' ');
    }
    if (parts.length === 4 && !email && !REASONS.includes(p2) && !REASONS.includes(p3) && p2.length >= 15) {
      resume = p2;
    }
    let reasonDetail = '';
    if (note && !REASONS.includes(note) && note.length >= 4) {
      reasonDetail = note;
      note = '';
    }
    return { name, position, email, reason, reasonDetail, note, resume };
  }

  return { name, position, email, reason, reasonDetail: '', note, resume: '' };
}

function parseApplicantRowMapped(parts, map) {
  const get = (key) => (map[key] != null ? (parts[map[key]] || '').trim() : '');
  const name = get('name');
  const position = get('position');
  if (!name || !position) return null;

  const rawReason = get('reason');
  let reason = '';
  let reasonDetail = get('reasonDetail');
  if (REASONS.includes(rawReason)) {
    reason = rawReason;
  } else if (rawReason) {
    reasonDetail = reasonDetail || rawReason;
  }

  const note = get('note');
  if (!reasonDetail && note && note.length >= 4 && !REASONS.includes(note)) {
    reasonDetail = note;
  }

  return {
    name,
    position,
    email: get('email'),
    reason,
    reasonDetail: reasonDetail || '',
    note,
    resume: get('resume'),
  };
}

export function parseCsvContent(text, defaultReason) {
  const cleaned = text.replace(/^\uFEFF/, '');
  const lines = cleaned.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return [];

  let columnMap = null;
  let start = 0;

  const firstParts = parseCsvLine(lines[0]);
  if (isHeaderRow(firstParts)) {
    columnMap = buildColumnMap(firstParts);
    start = 1;
  }

  const parsed = [];
  for (let i = start; i < lines.length; i++) {
    const parts = parseCsvLine(lines[i]);
    const row = columnMap
      ? parseApplicantRowMapped(parts, columnMap)
      : parseApplicantRowPositional(parts, defaultReason);
    if (row) parsed.push(row);
  }
  return parsed;
}
