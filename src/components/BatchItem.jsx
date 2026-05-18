import { REASONS } from '../constants';
import ResumeHighlightPreview from './ResumeHighlightPreview';

export default function BatchItem({
  item,
  index,
  isSendingEmail,
  onToggle,
  onCopy,
  onSend,
  onRetry,
  onReasonChange,
  onResumeChange,
  tone = '專業有禮',
}) {
  const showBody =
    item.expanded && (item.status === 'done' || item.status === 'processing' || item.status === 'error');
  const canEditReason = item.status === 'idle' || item.status === 'done' || item.status === 'error';

  return (
    <div className={`batch-item status-${item.status}`}>
      <div className="batch-item-header" onClick={() => onToggle(item)}>
        <div className="batch-item-info">
          <span className="batch-item-num">#{index + 1}</span>
          <span className="batch-item-name">{item.name || '（未命名）'}</span>
          <span className="batch-item-pos">/ {item.position || '（未填職位）'}</span>
          {item.email && <span className="batch-item-pos"> · {item.email}</span>}
          {item.resume && <span className="batch-item-resume-badge">📄 履歷</span>}
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
          {onResumeChange && item.status !== 'processing' && (
            <div className="batch-resume-row" onClick={(e) => e.stopPropagation()}>
              <label>應徵者履歷（貼上後下方預覽即為將寫入信件的內容）</label>
              <textarea
                value={item.resume || ''}
                onChange={(e) => onResumeChange(item.id, e.target.value)}
                placeholder="工作經歷、技能、專案成果…"
                rows={4}
                style={{ fontFamily: 'var(--mono)', fontSize: '0.78rem' }}
              />
              <ResumeHighlightPreview resume={item.resume} position={item.position} tone={tone} />
            </div>
          )}
          {(item.status === 'done' || item.status === 'processing') && (
            <div className={`batch-result ${item.status === 'processing' ? 'cursor-blink' : ''}`}>
              {item.result}
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
                    📧 Gmail
                  </button>
                )}
                {item.emailStatus === 'sent' && <span className="status-email-sent">✉ 已開啟 Gmail</span>}
                {item.emailStatus === 'failed' && <span className="status-email-fail">✉ 寄信失敗</span>}
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
