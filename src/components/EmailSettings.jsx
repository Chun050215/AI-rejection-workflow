import { useState } from 'react';
import {
  isDirectSendReady,
  getSendMethodLabel,
  SEND_METHODS,
} from '../utils/emailSettings';
import { APPS_SCRIPT_EMAIL_CODE } from '../constants/appsScriptEmail';

export default function EmailSettings({ email, onChange, onTestSend }) {
  const [showScript, setShowScript] = useState(false);
  const set = (key, val) => onChange({ ...email, [key]: val });
  const setEmailjs = (key, val) =>
    onChange({ ...email, emailjs: { ...email.emailjs, [key]: val } });
  const method = email.sendMethod || SEND_METHODS.gmail;
  const directReady = isDirectSendReady(email);

  const setMethod = (nextMethod) => {
    const next = { ...email, sendMethod: nextMethod };
    if (nextMethod === SEND_METHODS.gmail) {
      next.autoSendAfterBatch = false;
    }
    onChange(next);
  };

  return (
    <div className="email-settings">
      <h3>
        寄信設定
        <span className="email-ready-badge">{getSendMethodLabel(email)}</span>
      </h3>

      <div className="send-method-picker">
        <label className={`send-method-option ${method === SEND_METHODS.gmail ? 'active' : ''}`}>
          <input
            type="radio"
            name="sendMethod"
            checked={method === SEND_METHODS.gmail}
            onChange={() => setMethod(SEND_METHODS.gmail)}
          />
          <span>
            <strong>Gmail 撰寫頁</strong>（推薦）
            <small>開啟 Gmail，過目後手動按傳送，免 API 授權</small>
          </span>
        </label>
        <label className={`send-method-option ${method === SEND_METHODS.appsScript ? 'active' : ''}`}>
          <input
            type="radio"
            name="sendMethod"
            checked={method === SEND_METHODS.appsScript}
            onChange={() => setMethod(SEND_METHODS.appsScript)}
          />
          <span>
            <strong>Google 試算表腳本</strong>
            <small>用你的 Gmail 自動寄，免 EmailJS</small>
          </span>
        </label>
        <label className={`send-method-option ${method === SEND_METHODS.emailjs ? 'active' : ''}`}>
          <input
            type="radio"
            name="sendMethod"
            checked={method === SEND_METHODS.emailjs}
            onChange={() => setMethod(SEND_METHODS.emailjs)}
          />
          <span>
            <strong>EmailJS</strong>
            <small>需正確授權 Gmail；scopes 錯誤請改上方兩種</small>
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

        {method === SEND_METHODS.appsScript && (
          <>
            <div className="full">
              <label>Apps Script 部署網址（結尾為 /exec）</label>
              <input
                type="url"
                value={email.appsScriptUrl || ''}
                onChange={(e) => set('appsScriptUrl', e.target.value)}
                placeholder="https://script.google.com/macros/s/xxxxx/exec"
              />
            </div>
            <div className="full">
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowScript((v) => !v)}>
                {showScript ? '隱藏' : '顯示'} Apps Script 程式碼
              </button>
            </div>
            {showScript && (
              <div className="full">
                <textarea
                  readOnly
                  value={APPS_SCRIPT_EMAIL_CODE}
                  rows={12}
                  style={{ fontFamily: 'var(--mono)', fontSize: '0.72rem', width: '100%' }}
                />
                <p className="csv-preview-note">
                  script.google.com → 新專案 → 貼上 → 部署 → 網路應用程式 → 執行身分：我 → 存取：任何人
                </p>
              </div>
            )}
          </>
        )}

        {method === SEND_METHODS.emailjs && (
          <>
            <div>
              <label>Service ID</label>
              <input
                type="text"
                value={email.emailjs.serviceId}
                onChange={(e) => setEmailjs('serviceId', e.target.value)}
              />
            </div>
            <div>
              <label>Template ID</label>
              <input
                type="text"
                value={email.emailjs.templateId}
                onChange={(e) => setEmailjs('templateId', e.target.value)}
              />
            </div>
            <div className="full">
              <label>Public Key</label>
              <input
                type="text"
                value={email.emailjs.publicKey}
                onChange={(e) => setEmailjs('publicKey', e.target.value)}
              />
            </div>
            <div className="full email-hint email-hint-warn">
              若出現 scopes 錯誤：EmailJS 刪除 Gmail 後重連，或改選「Gmail 撰寫頁」。
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
