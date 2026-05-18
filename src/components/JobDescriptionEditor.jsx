import { useState } from 'react';
import { countFilledJdSlots, hasAnyJdContent } from '../utils/jdStore';

export default function JobDescriptionEditor({
  jobDescriptions = {},
  activePosition = '',
  onActivePositionChange,
  onJdTextChange,
  positionSuggestions = [],
  onImportFromList,
  compact = false,
}) {
  const [newPosition, setNewPosition] = useState('');
  const keys = Object.keys(jobDescriptions);
  const current = activePosition && jobDescriptions[activePosition] !== undefined ? activePosition : keys[0] || '';
  const currentText = current ? jobDescriptions[current] ?? '' : '';
  const filledCount = countFilledJdSlots(jobDescriptions);
  const suggestionCount = positionSuggestions.length;

  const addPosition = (raw) => {
    const p = (raw || '').trim();
    if (!p) return;
    onJdTextChange(p, jobDescriptions[p] ?? '');
    onActivePositionChange(p);
    setNewPosition('');
  };

  return (
    <div className={`jd-editor ${compact ? 'jd-editor-compact' : ''}`}>
      <div className="jd-editor-toolbar">
        <label htmlFor="jd-position-select">編輯職位 JD</label>
        <select
          id="jd-position-select"
          value={current}
          onChange={(e) => onActivePositionChange(e.target.value)}
          disabled={!keys.length}
        >
          {!keys.length && <option value="">（尚無職位，請新增或從名單帶入）</option>}
          {keys.map((k) => (
            <option key={k} value={k}>
              {k}
              {(jobDescriptions[k] || '').trim() ? ' ✓' : '（未填）'}
            </option>
          ))}
        </select>
      </div>

      <div className="jd-editor-actions">
        <input
          type="text"
          value={newPosition}
          onChange={(e) => setNewPosition(e.target.value)}
          placeholder="新增職位名稱…"
          onKeyDown={(e) => e.key === 'Enter' && addPosition(newPosition)}
        />
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => addPosition(newPosition)}>
          ＋ 新增
        </button>
        {onImportFromList && suggestionCount > 0 && (
          <button type="button" className="btn btn-secondary btn-sm" onClick={onImportFromList}>
            從名單帶入職位（{suggestionCount}）
          </button>
        )}
      </div>

      <textarea
        value={currentText}
        onChange={(e) => current && onJdTextChange(current, e.target.value)}
        placeholder={
          current
            ? `貼上「${current}」的 JD：必備技能、年資、學歷…`
            : '請先選擇或新增職位，再貼上 JD'
        }
        rows={compact ? 5 : 6}
        disabled={!current}
        style={{ fontFamily: 'var(--mono)', fontSize: '0.78rem', marginTop: 8 }}
      />

      <p className="jd-editor-status">
        {keys.length === 0
          ? '尚無職位 JD 槽位'
          : `已設定 ${filledCount} / ${keys.length} 個職位 JD`}
        {hasAnyJdContent(jobDescriptions)
          ? ' · 上傳履歷時會依「應徵職位」自動選用對應 JD'
          : ' · 請為各職位貼上 JD 後再上傳履歷比對'}
      </p>
    </div>
  );
}
