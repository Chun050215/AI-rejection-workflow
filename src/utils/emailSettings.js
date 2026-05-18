export const SEND_METHODS = {
  gmail: 'gmail',
  gmailApi: 'gmailApi',
};

const LEGACY_METHODS = new Set(['emailjs', 'appsScript']);

function resolveGmailClientIdLocal(email) {
  const fromEnv = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim();
  const fromSettings = email?.gmailApiClientId?.trim();
  return fromSettings || fromEnv || '';
}

function isGmailApiTokenValid() {
  try {
    const auth = JSON.parse(localStorage.getItem('gmailApiAuth') || 'null');
    return !!(auth?.accessToken && auth?.expiresAt > Date.now());
  } catch {
    return false;
  }
}

export function isGmailApiConfigured(email) {
  return !!(resolveGmailClientIdLocal(email) && isGmailApiTokenValid());
}

function normalizeSendMethod(savedMethod, gmailApiOk) {
  if (LEGACY_METHODS.has(savedMethod)) {
    return gmailApiOk ? SEND_METHODS.gmailApi : SEND_METHODS.gmail;
  }
  if (savedMethod === SEND_METHODS.gmailApi || savedMethod === SEND_METHODS.gmail) {
    return savedMethod;
  }
  return SEND_METHODS.gmail;
}

export function loadEmailSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem('emailSettings') || '{}');
    const draft = {
      gmail: saved.gmail || saved.from || '',
      gmailApiClientId: saved.gmailApiClientId || '',
    };
    const gmailApiOk = isGmailApiConfigured(draft);
    const sendMethod = normalizeSendMethod(saved.sendMethod, gmailApiOk);

    return {
      gmail: draft.gmail,
      subjectTemplate: saved.subjectTemplate || '{company} 應徵職缺回覆－{position}',
      autoSendAfterBatch: gmailApiOk
        ? saved.autoSendAfterBatch !== false
        : !!saved.autoSendAfterBatch,
      gmailApiClientId: draft.gmailApiClientId,
      sendMethod,
    };
  } catch {
    return {
      gmail: '',
      subjectTemplate: '{company} 應徵職缺回覆－{position}',
      autoSendAfterBatch: false,
      gmailApiClientId: '',
      sendMethod: SEND_METHODS.gmail,
    };
  }
}

export function saveEmailSettings(email) {
  const { gmail, subjectTemplate, autoSendAfterBatch, gmailApiClientId, sendMethod } = email;
  localStorage.setItem(
    'emailSettings',
    JSON.stringify({ gmail, subjectTemplate, autoSendAfterBatch, gmailApiClientId, sendMethod })
  );
}

export function isDirectSendReady(email) {
  return (email?.sendMethod || SEND_METHODS.gmail) === SEND_METHODS.gmailApi && isGmailApiConfigured(email);
}

export function getSendMethodLabel(email) {
  const method = email?.sendMethod || SEND_METHODS.gmail;
  if (method === SEND_METHODS.gmailApi) return 'Gmail API 已連結';
  return 'Gmail 手動過目';
}

export function isGmailApiMethod(email) {
  return (email?.sendMethod || SEND_METHODS.gmail) === SEND_METHODS.gmailApi;
}

export function isGmailComposeMethod(email) {
  return (email?.sendMethod || SEND_METHODS.gmail) === SEND_METHODS.gmail;
}

export function buildSubject(item, email, company) {
  return (email.subjectTemplate || '{company} 應徵職缺回覆－{position}')
    .replace(/\{company\}/g, company)
    .replace(/\{position\}/g, item.position || '')
    .replace(/\{name\}/g, item.name || '');
}
