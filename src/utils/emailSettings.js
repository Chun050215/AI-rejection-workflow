export const SEND_METHODS = {
  gmail: 'gmail',
  emailjs: 'emailjs',
  appsScript: 'appsScript',
};

export function loadEmailSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem('emailSettings') || '{}');
    const emailjs = {
      serviceId: saved.emailjs?.serviceId || '',
      templateId: saved.emailjs?.templateId || '',
      publicKey: saved.emailjs?.publicKey || '',
    };
    const draft = {
      gmail: saved.gmail || saved.from || '',
      emailjs,
      appsScriptUrl: saved.appsScriptUrl || '',
      sendMethod: saved.sendMethod || SEND_METHODS.gmail,
    };
    const emailjsOk = isEmailjsConfigured(draft);
    return {
      gmail: draft.gmail,
      subjectTemplate: saved.subjectTemplate || '{company} 應徵職缺回覆－{position}',
      autoSendAfterBatch: emailjsOk
        ? saved.autoSendAfterBatch !== false
        : !!saved.autoSendAfterBatch,
      emailjs,
      appsScriptUrl: draft.appsScriptUrl,
      sendMethod: draft.sendMethod,
    };
  } catch {
    return {
      gmail: '',
      subjectTemplate: '{company} 應徵職缺回覆－{position}',
      autoSendAfterBatch: false,
      emailjs: { serviceId: '', templateId: '', publicKey: '' },
      appsScriptUrl: '',
      sendMethod: SEND_METHODS.gmail,
    };
  }
}

export function saveEmailSettings(email) {
  localStorage.setItem('emailSettings', JSON.stringify(email));
}

export function isEmailjsConfigured(email) {
  const e = email?.emailjs;
  return !!(e?.serviceId?.trim() && e?.templateId?.trim() && e?.publicKey?.trim());
}

export function isAppsScriptConfigured(email) {
  return !!(email?.appsScriptUrl?.trim() && /^https:\/\/script\.google\.com\//.test(email.appsScriptUrl.trim()));
}

export function isDirectSendReady(email) {
  const method = email?.sendMethod || SEND_METHODS.gmail;
  if (method === SEND_METHODS.emailjs) return isEmailjsConfigured(email);
  if (method === SEND_METHODS.appsScript) return isAppsScriptConfigured(email);
  return false;
}

export function getSendMethodLabel(email) {
  const method = email?.sendMethod || SEND_METHODS.gmail;
  if (method === SEND_METHODS.emailjs) return 'EmailJS 自動寄信';
  if (method === SEND_METHODS.appsScript) return 'Google 試算表自動寄信';
  return 'Gmail 撰寫頁（推薦）';
}

export function buildSubject(item, email, company) {
  return (email.subjectTemplate || '{company} 應徵職缺回覆－{position}')
    .replace(/\{company\}/g, company)
    .replace(/\{position\}/g, item.position || '')
    .replace(/\{name\}/g, item.name || '');
}
