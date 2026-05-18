export function loadEmailSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem('emailSettings') || '{}');
    return {
      gmail: saved.gmail || saved.from || '',
      subjectTemplate: saved.subjectTemplate || '{company} 應徵職缺回覆－{position}',
      autoSendAfterBatch: !!saved.autoSendAfterBatch,
    };
  } catch {
    return {
      gmail: '',
      subjectTemplate: '{company} 應徵職缺回覆－{position}',
      autoSendAfterBatch: false,
    };
  }
}

export function saveEmailSettings(email) {
  localStorage.setItem('emailSettings', JSON.stringify(email));
}

export function buildSubject(item, email, company) {
  return (email.subjectTemplate || '{company} 應徵職缺回覆－{position}')
    .replace(/\{company\}/g, company)
    .replace(/\{position\}/g, item.position || '')
    .replace(/\{name\}/g, item.name || '');
}
