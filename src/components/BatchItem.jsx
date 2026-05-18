import { useRef } from 'react';
import { REASONS } from '../constants';
import { RESUME_FILE_ACCEPT } from '../constants/resumeFileAccept';
import { formatJdMatchSummary } from '../utils/jdMatcher';
import { getJdText, resolveJdKey } from '../utils/jdStore';
import ResumeHighlightPreview from './ResumeHighlightPreview';

export default function BatchItem({
  item,
  index,
  isSendingEmail,
  onToggle,
  onCopy,
  onSend,
  directSendEnabled,
  onRetry,
  onReasonChange,
  onResumeFile,
  jobDescriptions = {},
  onJdKeyChange,
  tone = '專業有禮',
}) {
  const resumeInputRef = useRef(null);
  const showBody =
    item.expanded ||
    item.status === 'processing' ||
    item.status === 'done' ||
    item.status === 'error';
  const canEditReason = item.status === 'idle' || item.status === 'done' || item.status === 'error';
  const jdLines = formatJdMatchSummary(item.jdMatch);
  const hasAutoReason = !!(item.reasonDetail || '').trim();
  const jdKey = resolveJdKey(item.position, jobDescriptions, item.jdKey);
  const hasItemJd = !!getJdText(jobDescriptions, item.position, item.jdKey);
  const jdOptions = Object.keys(jobDescriptions);

  return (
    <div className={`batch-item status-${item.status}`}>
      <div className="batch-item-header" onClick={() => onToggle(item)}>
        <div className="batch-item-info">
          <span className="batch-item-num">#{index + 1}</span>
          <span className="batch-item-name">{item.name || '（未命名）'}</span>
          <span className="batch-item-pos">/ {item.position || '（未填職位）'}</span>
          {item.email && <span className="batch-item-pos"> · {item.email}</span>}
          {(item.resume || item.resumeFileName) && (
            <span className="batch-item-resume-badge" title={item.resumeFileName || '已載入履歷'}>
              📄 {item.resumeFileName || '履歷'}
            </span>
          )}
          {hasAutoReason && <span className="batch-item-reason-custom">✓ 已比對</span>}
          <span className="batch-item-reason-tag" title={item.reason}>
            {item.reason}
          </span>
        </div>
        <div className={`status-badge status-${item.status}`}>
          {item.status === 'idle' && <span>⏳ 等待中</span>}
          {item.status === 'processing' && (
            <>
              <span className="spinner" /> ⚡ 生成中...
            </>
          )}
          {item.status === 'done' && <span>✅ 完成</span>}
          {item.status === 'error' && <span>❌ 失敗</span>}
        </div>
      </div>
      {showBody && (
        <div className="batch-item-body">
          {canEditReason && onReasonChange && (
            <div className="batch-reason-row" onClick={(e) => e.stopPropagation()}>
              <label>婉拒原因</label>
              <select
                value={item.reason}
                onChange={(e) => onReasonChange(item.id, e.target.value)}
                disabled={item.status === 'processing'}
              >
                {REASONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
          )}
          {jdOptions.length > 1 && onJdKeyChange && item.status !== 'processing' && (
            <div className="batch-jd-key-row" onClick={(e) => e.stopPropagation()}>
              <label>比對 JD 職位</label>
              <select
                value={item.jdKey || jdKey}
                onChange={(e) => onJdKeyChange(item.id, e.target.value)}
              >
                {jdOptions.map((k) => (
                  <option key={k} value={k}>
                    {k}
                    {(jobDescriptions[k] || '').trim() ? '' : '（未填 JD）'}
                  </option>
                ))}
              </select>
            </div>
          )}
          {onResumeFile && item.status !== 'processing' && (
            <div className="batch-resume-upload-row" onClick={(e) => e.stopPropagation()}>
              <label>
                履歷檔（上傳後自動比對）
                {hasItemJd && jdKey ? `「${jdKey}」JD` : ''}
              </label>
              <input
                ref={resumeInputRef}
                type="file"
                accept={RESUME_FILE_ACCEPT}
                hidden
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onResumeFile(item.id, file);
                  e.target.value = '';
                }}
              />
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => resumeInputRef.current?.click()}
              >
                📎 {item.resumeFileName ? '更換履歷檔' : '上傳履歷檔'}
              </button>
              {!hasItemJd && item.position && (
                <p className="batch-reason-hint">
                  此職位「{item.position}」尚無 JD，上傳後僅載入履歷。請在左側為該職位貼上 JD。
                </p>
              )}
              {hasAutoReason && (
                <div className="reason-auto-block">
                  <span className="reason-auto-label">自動產生的個別理由（寫入信件）</span>
                  <p className="reason-auto-text">{item.reasonDetail}</p>
                </div>
              )}
              {jdLines.length > 0 && (
                <div className="jd-match-preview">
                  <strong>JD 比對摘要</strong>
                  <ul>
                    {jdLines.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </div>
              )}
              {item.resume && (
                <ResumeHighlightPreview resume={item.resume} position={item.position} tone={tone} />
              )}
            </div>
          )}
          {item.status === 'idle' && (
            <p className="batch-idle-hint">
              {hasAutoReason
                ? `已比對「${jdKey || item.position}」JD，可按「開始批量生成」`
                : '未上傳履歷：將僅使用婉拒類別套話（可選上傳履歷以產生個別理由）'}
            </p>
          )}
          {(item.status === 'done' || item.status === 'processing') && (
            <div className={`batch-result ${item.status === 'processing' ? 'cursor-blink' : ''}`}>
              {item.result || (item.status === 'processing' ? '正在生成…' : '')}
            </div>
          )}
          {item.status === 'error' && <div className="batch-error-msg">{item.error}</div>}
          <div className="btn-row" style={{ marginTop: 10 }}>
            {item.status === 'done' && (
              <>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCopy(item.result);
                  }}
                >
                  📋 複製
                </button>
                {item.email && (
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    disabled={isSendingEmail}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSend(item);
                    }}
                  >
                    {directSendEnabled ? '📧 寄出' : '📧 Gmail'}
                  </button>
                )}
                {item.emailStatus === 'sent' && (
                  <span className="status-email-sent">{directSendEnabled ? '✉ 已寄出' : '✉ 已開啟 Gmail'}</span>
                )}
                {item.emailStatus === 'failed' && (
                  <span className="status-email-fail" title={item.emailError || ''}>
                    ✉ 寄信失敗
                    {item.emailError ? `：${item.emailError}` : ''}
                  </span>
                )}
              </>
            )}
            {item.status === 'error' && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onRetry(item);
                }}
              >
                🔄 重試
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
