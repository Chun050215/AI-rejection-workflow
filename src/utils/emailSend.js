import emailjs from '@emailjs/browser';
import { buildSubject, SEND_METHODS } from './emailSettings';
import { openGmailCompose } from './email';

let emailjsReadyKey = '';

function ensureEmailJsInit(publicKey) {
  const key = publicKey.trim();
  if (!key) throw new Error('請填寫 EmailJS Public Key');
  if (emailjsReadyKey !== key) {
    emailjs.init({ publicKey: key, blockHeadless: false });
    emailjsReadyKey = key;
  }
}

export function formatEmailJsError(err) {
  const status = err?.status;
  const text = (err?.text || err?.message || String(err || '')).trim();

  if (/insufficient authentication scopes/i.test(text)) {
    return 'Gmail 授權範圍不足。請到 EmailJS 刪除 Gmail 服務後重新連結並允許「傳送郵件」；或改選上方「Gmail 撰寫頁」／「Google 試算表」寄信';
  }
  if (status === 451 || /headless/i.test(text)) {
    return 'EmailJS 阻擋自動化瀏覽器。請改用 Chrome / Safari 一般視窗開啟此頁再寄信';
  }
  if (status === 403 || /forbidden/i.test(text)) {
    return 'EmailJS 拒絕寄信（403）。請確認 Public Key 正確，且 EmailJS 後台已連結寄信服務';
  }
  if (status === 400 || /template|variable|invalid/i.test(text)) {
    return `模板或參數錯誤：${text || '請確認 EmailJS 模板變數為 to_email, to_name, subject, message'}`;
  }
  if (status === 429) {
    return '寄信太頻繁（超過免費額度或速率限制），請稍後再試';
  }
  if (/network|failed to fetch/i.test(text)) {
    return '網路連線失敗，請檢查網路或 AdBlock 是否擋住 api.emailjs.com';
  }
  if (text) return text.length > 160 ? `${text.slice(0, 160)}…` : text;
  return '寄信失敗，請檢查 EmailJS 設定與模板變數';
}

function buildTemplateParams(item, email, company) {
  const subject = buildSubject(item, email, company);
  const message = item.result || '';
  const replyTo = email.gmail?.trim() || '';

  const params = {
    to_email: item.email,
    to_name: item.name,
    subject,
    message,
    from_name: company,
    company,
    position: item.position || '',
  };
  if (replyTo) params.reply_to = replyTo;
  return params;
}

export async function sendViaEmailJS(item, email, company) {
  const { serviceId, templateId, publicKey } = email.emailjs;
  if (!serviceId?.trim() || !templateId?.trim() || !publicKey?.trim()) {
    throw new Error('請先完成 EmailJS 三項設定');
  }
  if (!item.email?.trim()) {
    throw new Error('此筆沒有收件人 Email');
  }

  ensureEmailJsInit(publicKey);
  const templateParams = buildTemplateParams(item, email, company);

  try {
    await emailjs.send(serviceId.trim(), templateId.trim(), templateParams, {
      publicKey: publicKey.trim(),
    });
  } catch (err) {
    throw new Error(formatEmailJsError(err));
  }
}

/** 透過 Google Apps Script（你的 Gmail 帳號）寄信 */
export async function sendViaAppsScript(item, email, company) {
  const url = email.appsScriptUrl?.trim();
  if (!url) {
    throw new Error('請先貼上 Google Apps Script 部署網址');
  }
  if (!item.email?.trim()) {
    throw new Error('此筆沒有收件人 Email');
  }

  const payload = {
    to: item.email.trim(),
    subject: buildSubject(item, email, company),
    body: item.result || '',
    fromName: company,
  };

  const res = await fetch(url, {
    method: 'POST',
    mode: 'cors',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload),
  });

  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(text || `Apps Script 回應異常（HTTP ${res.status}）`);
  }

  if (!res.ok || !data.ok) {
    throw new Error(data.error || `Apps Script 寄信失敗（HTTP ${res.status}）`);
  }
}

/** 依設定選擇寄信方式 */
export async function sendEmail(item, email, company) {
  const method = email.sendMethod || SEND_METHODS.gmail;

  if (method === SEND_METHODS.emailjs) {
    await sendViaEmailJS(item, email, company);
    return { mode: 'sent' };
  }

  if (method === SEND_METHODS.appsScript) {
    await sendViaAppsScript(item, email, company);
    return { mode: 'sent' };
  }

  const opened = openGmailCompose(item, email, company);
  if (!opened) {
    throw new Error('無法開啟 Gmail，請允許瀏覽器彈出視窗');
  }
  return { mode: 'gmail' };
}

export async function sendTestEmail(email, company) {
  const to = email.gmail?.trim();
  if (!to) {
    throw new Error('請先填寫 HR 信箱（測試信會寄到此地址）');
  }
  return sendEmail(
    {
      name: '測試收件人',
      position: '測試職位',
      email: to,
      result:
        '您好，\n\n這是一封測試信。若您收到此信，代表寄信設定正確，可以開始批量寄送感謝信。\n\n祝順心',
    },
    email,
    company
  );
}
