import { useRef, useMemo } from 'react';
import { REASONS } from '../constants';
import { SPREADSHEET_ACCEPT, NUMBERS_FILE_ACCEPT } from '../constants/spreadsheetAccept';
import { RESUME_FILE_ACCEPT } from '../constants/resumeFileAccept';
import BatchItem from './BatchItem';
import JobDescriptionEditor from './JobDescriptionEditor';
import ProgressBar from './ProgressBar';
import HumanReviewNotice from './HumanReviewNotice';
import { collectPositions, hasAnyJdContent, getJdText } from '../utils/jdStore';

export default function BatchMode({
  batch,
  setBatch,
  csvPreview,
  defaultBatchReason,
  setDefaultBatchReason,
  autoDetectReason,
  setAutoDetectReason,
  onApplyReasonToAll,
  onItemReasonChange,
  onItemResumeFile,
  onResumeFilesUpload,
  tone,
  onParseCsv,
  onParseCsvAndGenerate,
  onCsvFile,
  onClearBatch,
  onStartBatch,
  onRetryFailed,
  onCopyAll,
  onDownloadTxt,
  onSendBatchEmails,
  onDownloadMailMerge,
  onRetryItem,
  onCopy,
  onSendItemEmail,
  onToggle,
  batchDoneCount,
  batchTotalCount,
  progressPercent,
  emailSendDone,
  emailSendTotal,
  emailSendPercent,
  sendableCount,
  directSendEnabled,
  jobDescriptions = {},
  activeJdPosition = '',
  onActiveJdPositionChange,
  onJdTextChange,
  onImportPositionsFromList,
  onAnalyzeJdForAll,
  onItemJdKeyChange,
}) {
  const fileInputRef = useRef(null);
  const numbersFileInputRef = useRef(null);
  const anyFileInputRef = useRef(null);
  const resumeFilesInputRef = useRef(null);
  const batchErrorCount = batch.items.filter((i) => i.status === 'error').length;
  const csvPreviewLimited = useMemo(() => csvPreview.slice(0, 20), [csvPreview]);
  const csvPreviewMore = Math.max(0, csvPreview.length - 20);
  const hasJd = hasAnyJdContent(jobDescriptions);
  const positionSuggestions = useMemo(
    () => collectPositions(batch.items),
    [batch.items]
  );
  const resumeCount = useMemo(
    () => batch.items.filter((i) => (i.resume || '').trim() || i.resumeFileName).length,
    [batch.items]
  );
  const canGenerate = batch.items.length > 0 && !batch.isProcessing;

  return (
    <div className="batch-layout">
      <div className="batch-side">
        <div className="card">
          <div className="card-title">① 職缺說明 JD（依職位）</div>
          <p className="csv-hint">
            不同職位可設定不同 JD。上傳履歷時會依應徵者的<strong>職位</strong>自動選用對應 JD 比對。
          </p>
          <JobDescriptionEditor
            jobDescriptions={jobDescriptions}
            activePosition={activeJdPosition}
            onActivePositionChange={onActiveJdPositionChange}
            onJdTextChange={onJdTextChange}
            positionSuggestions={positionSuggestions}
            onImportFromList={onImportPositionsFromList}
          />
        </div>

        <div className="card" style={{ marginTop: 12 }}>
          <div className="card-title">② 匯入應徵者名單</div>
          <p className="csv-hint">
            格式：<code>姓名,職位</code> 或 <code>姓名,職位,Email</code>（不必在 CSV 貼整份履歷）
          </p>

          <div className="csv-upload-row">
            <input ref={fileInputRef} type="file" accept={SPREADSHEET_ACCEPT} hidden onChange={onCsvFile} />
            <input
              ref={numbersFileInputRef}
              type="file"
              accept={NUMBERS_FILE_ACCEPT}
              hidden
              onChange={onCsvFile}
            />
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => fileInputRef.current?.click()}>
              📂 CSV / Excel
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => numbersFileInputRef.current?.click()}
            >
              📊 Numbers 檔
            </button>
            <input ref={anyFileInputRef} type="file" hidden onChange={onCsvFile} />
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => anyFileInputRef.current?.click()}>
              所有檔案…
            </button>
            {batch.fileName && <span className="csv-filename">{batch.fileName}</span>}
          </div>

          <textarea
            value={batch.csvText}
            onChange={(e) => setBatch((b) => ({ ...b, csvText: e.target.value }))}
            placeholder={'姓名,職位,Email\n王小明,行銷企劃專員,xiaoming@email.com\n林美華,產品經理,mei@email.com'}
            rows={8}
            style={{ fontFamily: 'var(--mono)', fontSize: '0.8rem' }}
          />

          <div className="btn-row" style={{ marginTop: 8 }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={onParseCsv}>
              載入名單
            </button>
            {batch.items.length > 0 && (
              <button type="button" className="btn btn-secondary btn-sm" onClick={onClearBatch} disabled={batch.isProcessing}>
                清除
              </button>
            )}
          </div>
        </div>

        <div className="card" style={{ marginTop: 12 }}>
          <div className="card-title">③ 上傳履歷檔（選填，自動比對 JD）</div>
          <p className="csv-hint">
            <strong>不必每位都上傳。</strong>支援 PDF、Word、TXT，檔名請含<strong>姓名</strong>（例：<code>王小明.pdf</code>），可多選一次上傳；有履歷才比對 JD。
          </p>
          <input
            ref={resumeFilesInputRef}
            type="file"
            accept={RESUME_FILE_ACCEPT}
            multiple
            hidden
            onChange={(e) => {
              onResumeFilesUpload(e.target.files);
              e.target.value = '';
            }}
          />
          <button
            type="button"
            className="btn btn-primary btn-sm"
            disabled={!batch.items.length || batch.isProcessing}
            onClick={() => resumeFilesInputRef.current?.click()}
          >
            📎 選擇履歷檔（可多選）
          </button>
          {!batch.items.length && <p className="csv-preview-note warn">請先完成步驟 ② 載入名單</p>}
          {batch.items.length > 0 && !hasJd && (
            <p className="csv-preview-note warn">尚未設定任何職位 JD，履歷僅會載入、不會比對</p>
          )}
          {batch.items.length > 0 && hasJd && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              style={{ marginLeft: 8 }}
              onClick={onAnalyzeJdForAll}
              disabled={batch.isProcessing}
            >
              🔄 重新比對全部
            </button>
          )}
        </div>

        <div className="card" style={{ marginTop: 12 }}>
          <div className="csv-default-reason">
            <label>預設婉拒原因類別</label>
            <select
              value={defaultBatchReason}
              onChange={(e) => setDefaultBatchReason(e.target.value)}
              style={{ marginTop: 6 }}
            >
              {REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <div className="checkbox-row" style={{ marginTop: 10 }}>
              <input
                type="checkbox"
                id="autoDetectReason"
                checked={autoDetectReason}
                onChange={(e) => setAutoDetectReason(e.target.checked)}
              />
              <label htmlFor="autoDetectReason">依備註／職位關鍵字自動判斷類別</label>
            </div>
          </div>

          {batch.items.length > 0 && (
            <>
              <button
                type="button"
                className="btn btn-gold"
                style={{ marginTop: 12, width: '100%' }}
                onClick={onStartBatch}
                disabled={!canGenerate}
              >
                ⚡ 開始批量生成
              </button>
              <p className="csv-preview-note" style={{ marginTop: 8 }}>
                已載入 {batch.items.length} 人
                {resumeCount > 0 ? ` · 履歷 ${resumeCount} 份（其餘僅用類別套話）` : ' · 未上傳履歷，將僅用婉拒類別套話'}
              </p>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ marginTop: 8, width: '100%' }}
                onClick={onParseCsvAndGenerate}
                disabled={!canGenerate}
              >
                重新載入名單並生成
              </button>
            </>
          )}

          {csvPreviewLimited.length > 0 && (
            <table className="csv-table" style={{ marginTop: 12 }}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>姓名</th>
                  <th>職位</th>
                  <th>JD</th>
                  <th>履歷</th>
                </tr>
              </thead>
              <tbody>
                {csvPreviewLimited.map((row, i) => {
                  const item = batch.items[i];
                  const jdOk = getJdText(jobDescriptions, row.position, item?.jdKey);
                  return (
                  <tr key={i}>
                    <td>{i + 1}</td>
                    <td>{row.name}</td>
                    <td>{row.position}</td>
                    <td className={jdOk ? 'csv-cell-resume' : ''}>{jdOk ? '✓' : '—'}</td>
                    <td>{item?.resume || item?.resumeFileName ? '✓' : '—'}</td>
                  </tr>
                );})}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="batch-main">
        {batch.isProcessing && (
          <ProgressBar label="批量生成進度" percent={progressPercent} detail={`${batch.processed} / ${batchTotalCount}`} />
        )}
        {batch.isSendingEmail && (
          <ProgressBar label="寄信進度" percent={emailSendPercent} detail={`${emailSendDone} / ${emailSendTotal}`} />
        )}

        {batch.items.length > 0 && batchDoneCount === 0 && !batch.isProcessing && (
          <div className="batch-main-cta">
            <p>
              名單已載入 {batch.items.length} 人
              {resumeCount > 0
                ? `（履歷 ${resumeCount} 份，其餘僅類別套話）`
                : '（可選上傳履歷以產生個別理由）'}
            </p>
            <button
              type="button"
              className="btn btn-gold"
              style={{ marginTop: 10 }}
              onClick={onStartBatch}
              disabled={!canGenerate}
            >
              ⚡ 開始批量生成
            </button>
          </div>
        )}

        {batch.items.map((item, idx) => (
          <BatchItem
            key={item.id}
            item={item}
            index={idx}
            isSendingEmail={batch.isSendingEmail}
            onToggle={onToggle}
            onCopy={onCopy}
            onSend={onSendItemEmail}
            directSendEnabled={directSendEnabled}
            onRetry={onRetryItem}
            onReasonChange={onItemReasonChange}
            onResumeFile={onItemResumeFile}
            jobDescriptions={jobDescriptions}
            onJdKeyChange={onItemJdKeyChange}
            tone={tone}
          />
        ))}

        {batchDoneCount > 0 && !batch.isProcessing && (
          <>
            <HumanReviewNotice />
            <div className="btn-row">
              <button
                type="button"
                className="btn btn-gold"
                onClick={() => onSendBatchEmails()}
                disabled={batch.isSendingEmail || !sendableCount}
              >
                {directSendEnabled ? '📧 確認並批量自動寄出' : '📧 用 Gmail 批量開啟（需手動傳送）'}
                {sendableCount > 0 && `（${sendableCount} 封）`}
              </button>
              <button type="button" className="btn btn-secondary" onClick={onDownloadMailMerge}>
                📊 下載郵件合併 CSV
              </button>
              <button type="button" className="btn btn-gold" onClick={onCopyAll}>
                📋 複製全部
              </button>
              <button type="button" className="btn btn-secondary" onClick={onDownloadTxt}>
                ⬇ 下載 TXT
              </button>
            </div>
            {batchErrorCount > 0 && (
              <button type="button" className="btn btn-secondary" style={{ marginTop: 8 }} onClick={onRetryFailed}>
                🔄 重試失敗項目（{batchErrorCount}）
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
