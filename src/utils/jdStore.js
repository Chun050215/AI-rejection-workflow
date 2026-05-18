/** 職位名稱正規化（比對用） */
export function normalizePositionKey(str) {
  return (str || '').trim().replace(/\s+/g, '').toLowerCase();
}

/** 從 localStorage 設定載入多職位 JD（相容舊版單一 jobDescription） */
export function loadBatchJdState() {
  try {
    const s = JSON.parse(localStorage.getItem('batchSettings') || '{}');
    let jobDescriptions = s.jobDescriptions && typeof s.jobDescriptions === 'object' ? { ...s.jobDescriptions } : {};
    if (typeof s.jobDescription === 'string' && s.jobDescription.trim() && !Object.keys(jobDescriptions).length) {
      jobDescriptions = { 通用: s.jobDescription.trim() };
    }
    const keys = Object.keys(jobDescriptions);
    const activeJdPosition =
      (s.activeJdPosition && jobDescriptions[s.activeJdPosition] !== undefined
        ? s.activeJdPosition
        : '') || keys[0] || '';
    return { jobDescriptions, activeJdPosition };
  } catch {
    return { jobDescriptions: {}, activeJdPosition: '' };
  }
}

/** 是否至少有一份 JD 有內容 */
export function hasAnyJdContent(jobDescriptions = {}) {
  return Object.values(jobDescriptions).some((t) => (t || '').trim());
}

/** 解析應徵者應使用的 JD 鍵名 */
export function resolveJdKey(position, jobDescriptions = {}, overrideKey = '') {
  const keys = Object.keys(jobDescriptions);
  if (!keys.length) return '';

  if (overrideKey && jobDescriptions[overrideKey] !== undefined) return overrideKey;

  const pk = normalizePositionKey(position);
  if (pk) {
    const exact = keys.find((k) => normalizePositionKey(k) === pk);
    if (exact) return exact;
    const partial = keys.find((k) => {
      const nk = normalizePositionKey(k);
      return nk && (pk.includes(nk) || nk.includes(pk));
    });
    if (partial) return partial;
  }

  if (jobDescriptions['通用'] !== undefined) return '通用';
  const filled = keys.find((k) => (jobDescriptions[k] || '').trim());
  return filled || keys[0];
}

/** 取得應徵者對應的 JD 全文 */
export function getJdText(jobDescriptions = {}, position = '', overrideKey = '') {
  const key = resolveJdKey(position, jobDescriptions, overrideKey);
  return key ? (jobDescriptions[key] || '').trim() : '';
}

/** 從名單收集不重複職位 */
export function collectPositions(rows = []) {
  const seen = new Set();
  const out = [];
  for (const row of rows) {
    const p = (row.position || row || '').trim();
    if (!p || seen.has(p)) continue;
    seen.add(p);
    out.push(p);
  }
  return out;
}

/** 將職位加入 JD 對照表（不覆寫既有內容） */
export function mergePositionSlots(jobDescriptions = {}, positions = []) {
  const next = { ...jobDescriptions };
  for (const p of positions) {
    if (p && next[p] === undefined) next[p] = '';
  }
  return next;
}

/** 統計已設定 JD 的職位數 */
export function countFilledJdSlots(jobDescriptions = {}) {
  return Object.values(jobDescriptions).filter((t) => (t || '').trim()).length;
}
