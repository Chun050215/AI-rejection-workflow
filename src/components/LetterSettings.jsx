import { TONES, TONE_HINTS } from '../constants';

export default function LetterSettings({ company, setCompany, tone, setTone, lang, setLang }) {
  return (
    <div className="shared-settings">
      <h3>模組② 信件設定（全域）</h3>
      <div className="shared-grid">
        <div>
          <label>公司名稱</label>
          <input type="text" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="例：XX 股份有限公司" />
        </div>
        <div>
          <label>語氣風格</label>
          <select value={tone} onChange={(e) => setTone(e.target.value)}>
            {TONES.map((t) => (
              <option key={t} value={t}>
                {t}（{TONE_HINTS[t]}）
              </option>
            ))}
          </select>
        </div>
        <div>
          <label>輸出語言</label>
          <select value={lang} onChange={(e) => setLang(e.target.value)}>
            <option value="zh">中文</option>
            <option value="en">英文</option>
            <option value="both">中英雙語（同時輸出）</option>
          </select>
        </div>
      </div>
    </div>
  );
}
