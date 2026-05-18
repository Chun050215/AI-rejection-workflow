import { useRef } from 'react';
import { REASONS, SCENARIOS, LETTER_MAX_CJK } from '../constants';
import { RESUME_FILE_ACCEPT } from '../constants/resumeFileAccept';
import { countCjkChars } from '../utils/words';
import { buildPersonalTouchZh } from '../utils/personalize';
import HumanReviewNotice from './HumanReviewNotice';
import ResumeHighlightPreview from './ResumeHighlightPreview';
import { formatJdMatchSummary } from '../utils/jdMatcher';
import JobDescriptionEditor from './JobDescriptionEditor';
import { getJdText } from '../utils/jdStore';

export default function SingleMode({
  single,
  setSingle,
  tone,
  promptPreview,
  onGenerate,
  onCopy,
  onSendEmail,
  isSendingEmail,
  directSendEnabled,
  jobDescriptions = {},
  activeJdPosition = '',
  onActiveJdPositionChange,
  onJdTextChange,
  onImportPositionsFromList,
  onEnsurePositionSlot,
  onResumeFile,
}) {
  const resumeInputRef = useRef(null);
  const jdLines = formatJdMatchSummary(single.jdMatch);
  const hasJd = !!getJdText(jobDescriptions, single.position, single.jdKey);
  const hasAutoReason = !!(single.reasonDetail || '').trim();
  const cjkCount = single.result ? countCjkChars(single.result) : 0;
  const overLimit = cjkCount > LETTER_MAX_CJK;
  const resumeText = (single.resume || '').trim();
  const resumeStale =
    single.result &&
    !single.streaming &&
    resumeText !== (single.lastGeneratedResume || '').trim();

  const expectedTouch =
    resumeText.length >= 15 ? buildPersonalTouchZh(resumeText, single.position, tone) : '';
  const touchMatched =
    expectedTouch && single.result && single.result.includes(expectedTouch.slice(0, Math.min(12, expectedTouch.length)));

  return (
    <>
      <div className="chips">
        {SCENARIOS.map((s) => (
          <span
            key={s.name}
            className="chip"
            title={s.title}
            onClick={() =>
              setSingle((prev) => ({
                ...prev,
                name: s.name,
                position: s.position,
                reason: s.reason,
                reasonDetail: '',
                resume: s.resume || '',
                result: '',
                lastGeneratedResume: '',
              }))
            }
          >
            {s.label}：{s.title}
          </span>
        ))}
      </div>

      <div className="single-layout">
        <div className="card span-full applicant-flow-card">
          <div className="card-title">模組③ 應徵者資訊 → 個人化感謝信</div>

          <section className="flow-section">
            <h4 className="flow-section-title">基本資料</h4>
            <div className="form-grid">
              <div>
                <label>應徵者姓名</label>
                <input
                  type="text"
                  value={single.name}
                  onChange={(e) => setSingle((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="例：王小明"
                />
              </div>
              <div>
                <label>應徵職位</label>
                <input
                  type="text"
                  value={single.position}
                  onChange={(e) => {
                    const position = e.target.value;
                    setSingle((prev) => ({ ...prev, position }));
                    onEnsurePositionSlot?.(position);
                  }}
                  placeholder="例：行銷企劃專員"
                />
              </div>
              <div className="full">
                <label>婉拒原因類別</label>
                <select value={single.reason} onChange={(e) => setSingle((prev) => ({ ...prev, reason: e.target.value }))}>
                  {REASONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
              <div className="full">
                <label>應徵者 Email（選填）</label>
                <input
                  type="email"
                  value={single.email}
                  onChange={(e) => setSingle((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder="candidate@email.com"
                />
              </div>
            </div>
          </section>

          <section className="flow-section">
            <h4 className="flow-section-title">職缺說明 JD（依職位）</h4>
            <JobDescriptionEditor
              jobDescriptions={jobDescriptions}
              activePosition={activeJdPosition || single.position}
              onActivePositionChange={onActiveJdPositionChange}
              onJdTextChange={onJdTextChange}
              positionSuggestions={single.position ? [single.position] : []}
              onImportFromList={onImportPositionsFromList}
              compact
            />
            {jdLines.length > 0 && (
              <div className="jd-match-preview" style={{ marginTop: 10 }}>
                <strong>JD 比對摘要</strong>
                <ul>
                  {jdLines.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          <section className="flow-section flow-section-resume">
            <h4 className="flow-section-title">① 上傳履歷檔（自動比對 JD）</h4>
            <p className="csv-hint" style={{ marginBottom: 8 }}>
              支援 PDF、Word、TXT。上傳後會依 JD 自動產生個別未錄取理由（無需手填）。
            </p>
            <input
              ref={resumeInputRef}
              type="file"
              accept={RESUME_FILE_ACCEPT}
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file && onResumeFile) onResumeFile(file);
                e.target.value = '';
              }}
            />
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={!onResumeFile}
              onClick={() => resumeInputRef.current?.click()}
            >
              📎 {single.resumeFileName ? `已載入：${single.resumeFileName}` : '選擇履歷檔'}
            </button>
            {!hasJd && single.position && (
              <p className="csv-preview-note warn">請先為「{single.position}」貼上 JD（上傳履歷後才會比對）</p>
            )}
            {!single.position && <p className="csv-preview-note warn">請先填寫應徵職位</p>}
            {hasAutoReason && (
              <div className="reason-auto-block" style={{ marginTop: 12 }}>
                <span className="reason-auto-label">自動產生的個別理由（與類別一併寫入信件）</span>
                <p className="reason-auto-text">{single.reasonDetail}</p>
              </div>
            )}
            {single.resume && (
              <ResumeHighlightPreview resume={single.resume} position={single.position} tone={tone} />
            )}
          </section>

          <div className="flow-connector" aria-hidden="true">
            <span className="flow-connector-line" />
            <span className="flow-connector-label">↓ 生成個人化感謝信</span>
            <span className="flow-connector-line" />
          </div>

          <section className="flow-section">
            <div className="btn-row">
              <button type="button" className="btn btn-primary" disabled={single.streaming} onClick={onGenerate}>
                {single.streaming ? '生成中...' : '② 生成感謝信'}
              </button>
            </div>

            <h4 className="flow-section-title">③ 生成結果</h4>
            {resumeStale && (
              <p className="resume-stale-warn">⚠ 履歷已修改，請重新按「②」生成以套用新內容</p>
            )}
            <div className={`result-box result-box-linked ${single.streaming ? 'streaming cursor-blink' : ''}`}>
              {!single.result && !single.streaming ? (
                <span className="result-placeholder">按「②」後，信件會帶入①履歷的個人化內容</span>
              ) : (
                single.result
              )}
            </div>
            {(single.result || single.timeElapsed) && (
              <div className="stats">
                <div>
                  生成時間：<span>{single.timeElapsed}s</span>
                </div>
                <div>
                  字數：<span className={overLimit ? 'stat-warn' : ''}>{single.wordCount}</span>
                  {single.result && (
                    <span className={overLimit ? 'stat-warn' : 'stat-ok'}>
                      {' '}
                      （中文約 {cjkCount} 字）
                    </span>
                  )}
                </div>
              </div>
            )}
            {single.result && !single.streaming && !resumeStale && resumeText.length >= 15 && touchMatched && (
              <p className="resume-linked-ok">✓ 生成結果已包含①履歷的個人化肯定語句</p>
            )}
            {single.result && !single.streaming && !resumeStale && resumeText.length >= 15 && !touchMatched && (
              <p className="resume-stale-warn">⚠ 結果與履歷預覽不一致，請重新生成</p>
            )}
            {single.result && !single.streaming && (
              <>
                <HumanReviewNotice />
                <div className="btn-row">
                  <button type="button" className="btn btn-secondary" onClick={() => onCopy(single.result)}>
                    📋 複製信件
                  </button>
                  <button type="button" className="btn btn-primary" disabled={isSendingEmail} onClick={onSendEmail}>
                    {directSendEnabled ? '📧 確認並自動寄出' : '📧 用 Gmail 開啟草稿（手動傳送）'}
                  </button>
                </div>
              </>
            )}
          </section>
        </div>

        <div className="card span-full">
          <div className="card-title">Prompt 範例（課堂實作素材）</div>
          <div className="prompt-preview">{promptPreview}</div>
        </div>
      </div>
    </>
  );
}
