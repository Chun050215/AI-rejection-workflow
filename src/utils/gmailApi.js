import { buildSubject } from './emailSettings';
import { GMAIL_API_SCOPE } from '../constants/gmailApiSetup';

const AUTH_STORAGE_KEY = 'gmailApiAuth';
const BATCH_LIMIT = 100;
const BATCH_URL = 'https://www.googleapis.com/batch/gmail/v1';
const SEND_URL = 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send';

let gisLoadPromise = null;
let tokenClient = null;
let pendingClientId = '';

function loadGisScript() {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  if (gisLoadPromise) return gisLoadPromise;
  gisLoadPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-gis-client]');
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('無法載入 Google 登入程式')));
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.dataset.gisClient = '1';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('無法載入 Google 登入程式'));
    document.head.appendChild(script);
  });
  return gisLoadPromise;
}

export function resolveGmailClientId(email) {
  const fromEnv = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim();
  const fromSettings = email?.gmailApiClientId?.trim();
  return fromSettings || fromEnv || '';
}

function loadAuth() {
  try {
    return JSON.parse(localStorage.getItem(AUTH_STORAGE_KEY) || 'null');
  } catch {
    return null;
  }
}

function saveAuth(auth) {
  if (!auth) {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    return;
  }
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(auth));
}

export function getGmailApiAuth() {
  return loadAuth();
}

export function isGmailApiConnected() {
  const auth = loadAuth();
  return !!(auth?.accessToken && auth?.expiresAt > Date.now());
}

export function disconnectGmailApi() {
  saveAuth(null);
  tokenClient = null;
}

function encodeMimeHeader(value) {
  if (/^[\x00-\x7F]*$/.test(value)) return value;
  const b64 = btoa(unescape(encodeURIComponent(value)));
  return `=?UTF-8?B?${b64}?=`;
}

function toBase64Url(str) {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function buildRawEmail({ to, subject, body, replyTo }) {
  const lines = [
    `To: ${to}`,
    `Subject: ${encodeMimeHeader(subject)}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
  ];
  if (replyTo) lines.push(`Reply-To: ${replyTo}`);
  lines.push('', body || '');
  return toBase64Url(lines.join('\r\n'));
}

async function fetchProfile(accessToken) {
  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `無法取得 Gmail 個人資料（HTTP ${res.status}）`);
  }
  return res.json();
}

function requestAccessToken(clientId, { prompt = '' } = {}) {
  return new Promise((resolve, reject) => {
    if (!clientId) {
      reject(new Error('請先填寫 Google OAuth 用戶端 ID'));
      return;
    }

    loadGisScript()
      .then(() => {
        if (!tokenClient || pendingClientId !== clientId) {
          pendingClientId = clientId;
          tokenClient = window.google.accounts.oauth2.initTokenClient({
            client_id: clientId,
            scope: GMAIL_API_SCOPE,
            callback: (response) => {
              if (response.error) {
                reject(new Error(response.error_description || response.error));
                return;
              }
              const expiresAt = Date.now() + (response.expires_in || 3600) * 1000;
              const auth = {
                accessToken: response.access_token,
                expiresAt,
                emailAddress: loadAuth()?.emailAddress || '',
              };
              saveAuth(auth);
              resolve(auth);
            },
          });
        }

        tokenClient.requestAccessToken({ prompt });
      })
      .catch(reject);
  });
}

export async function connectGmailApi(clientId) {
  const auth = await requestAccessToken(clientId, { prompt: 'consent' });
  const profile = await fetchProfile(auth.accessToken);
  const next = {
    ...auth,
    emailAddress: profile.emailAddress || '',
  };
  saveAuth(next);
  return next;
}

export async function getValidAccessToken(clientId) {
  const auth = loadAuth();
  if (auth?.accessToken && auth.expiresAt > Date.now() + 60_000) {
    return auth.accessToken;
  }
  const refreshed = await requestAccessToken(clientId, { prompt: '' });
  return refreshed.accessToken;
}

export async function sendViaGmailApi(item, email, company) {
  const clientId = resolveGmailClientId(email);
  if (!clientId) throw new Error('請先設定 Google OAuth 用戶端 ID');
  if (!item.email?.trim()) throw new Error('此筆沒有收件人 Email');

  const accessToken = await getValidAccessToken(clientId);
  const raw = buildRawEmail({
    to: item.email.trim(),
    subject: buildSubject(item, email, company),
    body: item.result || '',
    replyTo: email.gmail?.trim() || undefined,
  });

  const res = await fetch(SEND_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(formatGmailApiError(err, res.status));
  }
  return res.json();
}

function formatGmailApiError(errBody, status) {
  const msg = errBody?.error?.message || '';
  if (status === 401 || /invalid credentials|unauthorized/i.test(msg)) {
    return 'Gmail 授權已過期，請在寄信設定重新「連結 Gmail」';
  }
  if (status === 403 || /insufficient|scope/i.test(msg)) {
    return 'Gmail API 權限不足。請重新連結並允許「傳送郵件」';
  }
  if (status === 429) return 'Gmail API 寄信太頻繁，請稍後再試';
  return msg || `Gmail API 寄信失敗（HTTP ${status}）`;
}

function parseBatchResponse(responseText, contentType) {
  const boundaryMatch = contentType.match(/boundary=([^;]+)/i);
  if (!boundaryMatch) {
    throw new Error('無法解析 Gmail 批次回應');
  }
  const boundary = boundaryMatch[1].replace(/"/g, '').trim();
  const segments = responseText.split(`--${boundary}`);

  const results = [];
  for (const segment of segments) {
    if (!segment.trim() || segment.trim() === '--') continue;
    const statusMatch = segment.match(/HTTP\/[\d.]+ (\d+)/);
    const status = statusMatch ? Number(statusMatch[1]) : 0;
    const jsonMatch = segment.match(/\{[\s\S]*\}/);
    let error = null;
    let ok = status >= 200 && status < 300;
    if (jsonMatch) {
      try {
        const json = JSON.parse(jsonMatch[0]);
        if (json.error) {
          ok = false;
          error = json.error.message || '寄信失敗';
        }
      } catch {
        if (!ok) error = segment.slice(0, 120);
      }
    } else if (!ok) {
      error = `HTTP ${status}`;
    }
    results.push({ ok, status, error });
  }
  return results;
}

function buildBatchBody(requests) {
  const boundary = `batch_gmail_${Date.now().toString(36)}`;
  const parts = requests.map((req, index) => {
    const contentId = index + 1;
    return [
      `--${boundary}`,
      'Content-Type: application/http',
      `Content-ID: <item${contentId}>`,
      '',
      'POST /gmail/v1/users/me/messages/send HTTP/1.1',
      'Content-Type: application/json',
      '',
      JSON.stringify({ raw: req.raw }),
    ].join('\r\n');
  });

  const body = `${parts.join('\r\n')}\r\n--${boundary}--\r\n`;
  return { boundary, body };
}

/**
 * 使用 Gmail API 批次端點一次送出多封（每批最多 100 封）
 * @returns {{ itemId, ok, error? }[]}
 */
export async function sendBatchViaGmailApi(items, email, company, onProgress) {
  const clientId = resolveGmailClientId(email);
  if (!clientId) throw new Error('請先設定 Google OAuth 用戶端 ID');

  const accessToken = await getValidAccessToken(clientId);
  const replyTo = email.gmail?.trim() || undefined;

  const prepared = items.map((item) => ({
    itemId: item.id,
    raw: buildRawEmail({
      to: item.email.trim(),
      subject: buildSubject(item, email, company),
      body: item.result || '',
      replyTo,
    }),
  }));

  const allResults = [];
  let processed = 0;

  for (let offset = 0; offset < prepared.length; offset += BATCH_LIMIT) {
    const chunk = prepared.slice(offset, offset + BATCH_LIMIT);
    const { boundary, body } = buildBatchBody(chunk);

    const res = await fetch(BATCH_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/mixed; boundary=${boundary}`,
      },
      body,
    });

    const responseText = await res.text();
    if (!res.ok) {
      let errMsg = `Gmail 批次寄信失敗（HTTP ${res.status}）`;
      try {
        const errJson = JSON.parse(responseText);
        errMsg = formatGmailApiError(errJson, res.status);
      } catch {
        /* use default */
      }
      throw new Error(errMsg);
    }

    const contentType = res.headers.get('Content-Type') || '';
    const batchResults = parseBatchResponse(responseText, contentType);

    chunk.forEach((req, i) => {
      const br = batchResults[i] || { ok: false, error: '批次回應缺少此筆結果' };
      allResults.push({
        itemId: req.itemId,
        ok: br.ok,
        error: br.error,
      });
      processed++;
      onProgress?.(processed);
    });
  }

  return allResults;
}
