import { useState, useEffect } from 'react';
import {
  isDirectSendReady,
  getSendMethodLabel,
  SEND_METHODS,
} from '../utils/emailSettings';
import { GMAIL_API_SETUP_STEPS } from '../constants/gmailApiSetup';
import {
  connectGmailApi,
  disconnectGmailApi,
  getGmailApiAuth,
  resolveGmailClientId,
  isGmailApiConnected,
} from '../utils/gmailApi';

export default function EmailSettings({ email, onChange, onTestSend, onNotify }) {
  const [connecting, setConnecting] = useState(false);
  const [gmailAuth, setGmailAuth] = useState(() => getGmailApiAuth());
  const set = (key, val) => onChange({ ...email, [key]: val });
  const method = email.sendMethod || SEND_METHODS.gmail;
  const directReady = isDirectSendReady(email);
  const clientId = resolveGmailClientId(email);
  const envClientId = !!import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim();

  useEffect(() => {
    setGmailAuth(getGmailApiAuth());
  }, [email.sendMethod, email.gmailApiClientId]);

  const setMethod = (nextMethod) => {
    const next = { ...email, sendMethod: nextMethod };
    if (nextMethod === SEND_METHODS.gmail) {
      next.autoSendAfterBatch = false;
    }
    onChange(next);
  };

  const handleConnectGmail = async () => {
    setConnecting(true);
    try {
      const auth = await connectGmailApi(clientId);
      setGmailAuth(auth);
      onChange({
        ...email,
        sendMethod: SEND_METHODS.gmailApi,
        gmail: email.gmail || auth.emailAddress || email.gmail,
      });
      onNotify?.(`已連結 Gmail：${auth.emailAddress}`, 'success');
    } catch (e) {
      onNotify?.(e.message || 'Gmail 連結失敗', 'error');
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnectGmail = () => {
    disconnectGmailApi();
    setGmailAuth(null);
    onNotify?.('已解除 Gmail API 連結', 'success');
  };

  const gmailConnected = isGmailApiConnected();

  return (
    <div className="email-settings">
      <h3>
        寄信設定
        <span className="email-ready-badge">{getSendMethodLabel(email)}</span>
      </h3>

      <p className="full email-hint email-hint-warn" style={{ marginBottom: 12 }}>
        若要<strong>自動寄出</strong>並支援<strong>批次 API</strong>，請選「Gmail API」。「手動過目」僅開草稿，無法代按傳送。
      </p>

      <div className="send-method-picker">
        <label className={`send-method-option ${method === SEND_METHODS.gmailApi ? 'active' : ''}`}>
          <input
            type="radio"
            name="sendMethod"
            checked={method === SEND_METHODS.gmailApi}
            onChange={() => setMethod(SEND_METHODS.gmailApi)}
          />
          <span>
            <strong>Gmail API</strong>（推薦）
            <small>OAuth 授權後自動寄信，批量使用 Gmail 批次請求（每批最多 100 封）</small>
          </span>
        </label>
        <label className={`send-method-option ${method === SEND_METHODS.gmail ? 'active' : ''}`}>
          <input
            type="radio"
            name="sendMethod"
            checked={method === SEND_METHODS.gmail}
            onChange={() => setMethod(SEND_METHODS.gmail)}
          />
          <span>
            <strong>Gmail 手動過目</strong>
            <small>開啟草稿，需自己在 Gmail 按傳送</small>
          </span>
        </label>
      </div>

      <div className="email-grid">
        <div>
          <label>HR 信箱（Reply-To / 測試收件）</label>
          <input
            type="email"
            value={email.gmail}
            onChange={(e) => set('gmail', e.target.value)}
            placeholder="hr@company.com"
          />
        </div>
        <div>
          <label>信件主旨模板</label>
          <input
            type="text"
            value={email.subjectTemplate}
            onChange={(e) => set('subjectTemplate', e.target.value)}
            placeholder="{company} 應徵職缺回覆－{position}"
          />
        </div>
        <div className="full email-hint">
          主旨變數：<code>{'{company}'}</code> <code>{'{position}'}</code> <code>{'{name}'}</code>
        </div>

        {method === SEND_METHODS.gmailApi && (
          <>
            <div className="full apps-script-steps">
              <strong>Google Cloud 設定（一次性）</strong>
              <ol>
                {GMAIL_API_SETUP_STEPS.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
              <a
                href="https://console.cloud.google.com/apis/library/gmail.googleapis.com"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary btn-sm"
                style={{ display: 'inline-block', marginTop: 8, marginRight: 8 }}
              >
                啟用 Gmail API ↗
              </a>
            </div>
            {!envClientId && (
              <div className="full">
                <label>OAuth 用戶端 ID</label>
                <input
                  type="text"
                  value={email.gmailApiClientId || ''}
                  onChange={(e) => set('gmailApiClientId', e.target.value)}
                  placeholder="xxxxx.apps.googleusercontent.com"
                />
              </div>
            )}
            {envClientId && (
              <div className="full email-hint">
                已從環境變數 <code>VITE_GOOGLE_CLIENT_ID</code> 載入用戶端 ID
              </div>
            )}
            <div className="full" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              {!gmailConnected ? (
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  disabled={connecting || !clientId}
                  onClick={handleConnectGmail}
                >
                  {connecting ? '連結中…' : '🔗 連結 Gmail'}
                </button>
              ) : (
                <>
                  <span className="email-ready-badge">
                    已連結：{gmailAuth?.emailAddress || 'Gmail'}
                  </span>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={handleDisconnectGmail}>
                    解除連結
                  </button>
                </>
              )}
            </div>
          </>
        )}

        {directReady && onTestSend && (
          <div className="full">
            <button type="button" className="btn btn-secondary btn-sm" onClick={onTestSend}>
              📧 寄送測試信
            </button>
          </div>
        )}

        {method !== SEND_METHODS.gmail && (
          <div className="full checkbox-row">
            <input
              type="checkbox"
              id="autoSend"
              checked={!!email.autoSendAfterBatch}
              disabled={!directReady}
              onChange={(e) => set('autoSendAfterBatch', e.target.checked)}
            />
            <label htmlFor="autoSend">批量生成完成後，自動直接寄出</label>
          </div>
        )}
      </div>
    </div>
  );
}
