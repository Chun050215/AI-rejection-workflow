/** 從履歷檔（PDF / Word / 純文字）萃取文字 */
export async function extractTextFromResumeFile(file) {
  const name = (file?.name || '').toLowerCase();
  if (name.endsWith('.txt') || name.endsWith('.rtf')) {
    return (await file.text()).trim();
  }
  if (name.endsWith('.docx') || name.endsWith('.doc')) {
    const mammoth = await import('mammoth');
    const buffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer: buffer });
    return (result.value || '').trim();
  }
  if (name.endsWith('.pdf')) {
    const pdfjs = await import('pdfjs-dist');
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.min.mjs',
      import.meta.url
    ).toString();
    const buffer = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: buffer }).promise;
    const parts = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      parts.push(content.items.map((it) => it.str).join(' '));
    }
    return parts.join('\n').trim();
  }
  throw new Error(`不支援的檔案格式：${file.name}（請用 PDF、Word 或 TXT）`);
}

function normalizeNameKey(str) {
  return (str || '')
    .replace(/\.[^.]+$/, '')
    .replace(/[_\s-]*(履歷|resume|cv|應徵|申請)/gi, '')
    .replace(/\s+/g, '')
    .toLowerCase();
}

/** 依檔名對應名單中的應徵者（檔名建議含姓名，如 王小明.pdf） */
export function matchResumeFileToApplicant(filename, applicants) {
  const key = normalizeNameKey(filename);
  if (!key) return -1;

  let idx = applicants.findIndex((a) => normalizeNameKey(a.name) === key);
  if (idx >= 0) return idx;

  idx = applicants.findIndex((a) => {
    const nameKey = normalizeNameKey(a.name);
    return nameKey && (key.includes(nameKey) || nameKey.includes(key));
  });
  if (idx >= 0) return idx;

  return applicants.findIndex((a) => {
    const nameKey = normalizeNameKey(a.name);
    return nameKey.length >= 2 && key.startsWith(nameKey);
  });
}
