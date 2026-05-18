import { buildSubject } from './emailSettings';

/** 開啟 Gmail 撰寫視窗（需已登入 Gmail，並允許彈出視窗） */
export function openGmailCompose(item, email, company) {
  const params = new URLSearchParams({
    view: 'cm',
    fs: '1',
    to: item.email,
    su: buildSubject(item, email, company),
    body: item.result || '',
  });
  const url = `https://mail.google.com/mail/?${params.toString()}`;
  const win = window.open(url, '_blank', 'noopener,noreferrer');
  return win != null;
}

export function downloadMailMergeCsv(items, email, company) {
  const escape = (v) => `"${String(v).replace(/"/g, '""')}"`;
  const header = '收件人Email,收件人姓名,主旨,內文\n';
  const rows = items.map((i) =>
    [escape(i.email || ''), escape(i.name), escape(buildSubject(i, email, company)), escape(i.result)].join(',')
  );
  const blob = new Blob(['\ufeff' + header + rows.join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `郵件合併_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadTxt(items) {
  const separator = '\n\n' + '─'.repeat(40) + '\n\n';
  const all = items
    .filter((i) => i.result)
    .map((i) => `【${i.name} / ${i.position}】\n\n${i.result}`)
    .join(separator);
  const blob = new Blob([all], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `婉拒信_${new Date().toISOString().slice(0, 10)}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}
