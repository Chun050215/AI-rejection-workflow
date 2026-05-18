import { useRef, useMemo } from 'react';
import { REASONS } from '../constants';
import BatchItem from './BatchItem';
import ProgressBar from './ProgressBar';
import HumanReviewNotice from './HumanReviewNotice';

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
  onItemResumeChange,
  tone,
  onParseCsv,
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
}) {
  const fileInputRef = useRef(null);
  const batchErrorCount = batch.items.filter((i) => i.status === 'error').length;
  const csvPreviewLimited = useMemo(() => csvPreview.slice(0, 20), [csvPreview]);
  const csvPreviewMore = Math.max(0, csvPreview.length - 20);
  const hasActiveItems = batch.items.some((i) => i.status !== 'idle');

  return (
    <div className="batch-layout">
      <div className="batch-side">
        <div className="card">
          <div className="card-title">匯入應徵者名單</div>
          <p className="csv-hint">
            支援 <strong>CSV 檔案上傳</strong>或<strong>貼上內容</strong>，每行一筆。
            <br />
            最簡格式：<code>姓名,職位</code> 或 <code>姓名,職位,Email</code>（<strong>不必填婉拒原因</strong>，系統自動套用）
            <br />
            進階：可加 <code>履歷</code> 或 <code>履歷摘要</code> 欄（個人化感謝信）、<code>備註</code> 欄（自動判斷原因）
          </p>

          <div className="csv-upload-row">
            <input ref={fileInputRef} type="file" accept=".csv,.txt" hidden onChange={onCsvFile} />
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => fileInputRef.current?.click()}>
              📂 選擇 CSV 檔案
            </button>
            {batch.fileName && <span className="csv-filename">{batch.fileName}</span>}
          </div>

          <textarea
            value={batch.csvText}
            onChange={(e) => setBatch((b) => ({ ...b, csvText: e.target.value }))}
            placeholder={'姓名,職位,Email\n王小明,行銷企劃專員,xiaoming@email.com\n林美華,產品經理,mei@email.com\n陳大文,資深工程師,chen@email.com'}
            rows={14}
            style={{ fontFamily: 'var(--mono)', fontSize: '0.8rem' }}
          />

          <div className="csv-default-reason">
            <label>婉拒原因（自動套用到全部應徵者）</label>
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
              <label htmlFor="autoDetectReason">依備註／職位關鍵字自動判斷原因</label>
            </div>
            {batch.items.length > 0 && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ marginTop: 10 }}
                onClick={onApplyReasonToAll}
                disabled={batch.isProcessing}
              >
                重新套用至全部名單
              </button>
            )}
          </div>

          <div className="btn-row">
            <button type="button" className="btn btn-primary btn-sm" onClick={onParseCsv}>
              解析並載入名單
            </button>
            {batch.items.length > 0 && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={onClearBatch}
                disabled={batch.isProcessing}
              >
                清除名單
              </button>
            )}
          </div>

          {batch.items.length > 0 && (
            <div className="csv-summary">
              已載入 <strong>{batch.items.length}</strong> 位應徵者，可開始批量生成
            </div>
          )}

          {csvPreviewLimited.length > 0 && (
            <>
              <table className="csv-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>姓名</th>
                    <th>職位</th>
                    <th>Email</th>
                    <th>原因</th>
                    <th>履歷</th>
                  </tr>
                </thead>
                <tbody>
                  {csvPreviewLimited.map((row, i) => (
                    <tr key={i}>
                      <td>{i + 1}</td>
                      <td>{row.name}</td>
                      <td>{row.position}</td>
                      <td>{row.email || '—'}</td>
                      <td>{row.reason}</td>
                      <td className="csv-cell-resume">{row.resume ? '✓ 已提供' : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {csvPreviewMore > 0 && (
                <p className="csv-preview-note">預覽前 20 筆，另有 {csvPreviewMore} 筆未顯示</p>
              )}
            </>
          )}
        </div>

        <div className="btn-row" style={{ marginBottom: 16 }}>
          <button
            type="button"
            className="btn btn-primary"
            disabled={batch.isProcessing || !batch.items.length}
            onClick={onStartBatch}
          >
            {batch.isProcessing ? '生成中...' : '⚡ 開始批量生成'}
            {batch.items.length > 0 && !batch.isProcessing && `（${batch.items.length} 筆）`}
          </button>
        </div>

        {(batch.isProcessing || batch.processed > 0) && (
          <ProgressBar label="生成進度" done={batchDoneCount} total={batchTotalCount} percent={progressPercent} />
        )}

        {batch.isSendingEmail && (
          <ProgressBar
            label="Email 寄送進度"
            done={emailSendDone}
            total={emailSendTotal}
            percent={emailSendPercent}
          />
        )}
      </div>

      <div className="batch-main">
        {hasActiveItems &&
          batch.items.map((item, idx) => (
            <BatchItem
              key={item.id}
              item={item}
              index={idx}
              isSendingEmail={batch.isSendingEmail}
              onToggle={onToggle}
              onCopy={onCopy}
              onSend={onSendItemEmail}
              onRetry={onRetryItem}
              onReasonChange={onItemReasonChange}
              onResumeChange={onItemResumeChange}
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
              onClick={onSendBatchEmails}
              disabled={batch.isSendingEmail || !sendableCount}
            >
              {batch.isSendingEmail ? '開啟 Gmail 中...' : '📧 用 Gmail 批量寄送'}
              {sendableCount > 0 && !batch.isSendingEmail && `（${sendableCount} 封）`}
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
            {batchErrorCount > 0 && (
              <button type="button" className="btn btn-secondary" onClick={onRetryFailed}>
                🔄 重新生成失敗項目
              </button>
            )}
          </div>
          </>
        )}
      </div>
    </div>
  );
}
