export default function EmailSettings({ email, onChange }) {
  const set = (key, val) => onChange({ ...email, [key]: val });

  return (
    <div className="email-settings">
      <h3>Gmail 寄信設定</h3>
      <div className="email-grid">
        <div>
          <label>HR Gmail 帳號</label>
          <input
            type="email"
            value={email.gmail}
            onChange={(e) => set('gmail', e.target.value)}
            placeholder="hr@gmail.com"
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
          主旨可用變數：<code>{'{company}'}</code> <code>{'{position}'}</code> <code>{'{name}'}</code>
        </div>
        <div className="full checkbox-row">
          <input
            type="checkbox"
            id="autoSend"
            checked={email.autoSendAfterBatch}
            onChange={(e) => set('autoSendAfterBatch', e.target.checked)}
          />
          <label htmlFor="autoSend">批量生成完成後，自動開啟 Gmail 撰寫視窗</label>
        </div>
        <div className="full email-hint email-hint-gmail">
          <strong>使用方式：</strong>請先於瀏覽器登入 Gmail。點擊寄信會開啟 Gmail 撰寫頁，收件人、主旨、內文已帶入，請過目後按「傳送」。
          <br />
          批量寄送會依序開啟多個分頁，請允許彈出視窗。
          <a href="https://mail.google.com" target="_blank" rel="noopener noreferrer">
            前往 Gmail
          </a>
        </div>
      </div>
    </div>
  );
}
