import { useMemo } from 'react';
import { extractResumeHighlights, formatHighlightsSummary } from '../utils/resumeParser';
import { buildPersonalTouchZh } from '../utils/personalize';

export default function ResumeHighlightPreview({ resume, position, tone = '專業有禮' }) {
  const text = (resume || '').trim();
  const preview = useMemo(() => {
    if (text.length < 15) return null;
    const highlights = extractResumeHighlights(text, position);
    if (!highlights?.hasContent) return { lines: [], touch: null, weak: true };
    return {
      lines: formatHighlightsSummary(highlights),
      touch: buildPersonalTouchZh(text, position, tone),
      weak: false,
    };
  }, [text, position, tone]);

  if (!text) {
    return (
      <div className="resume-preview resume-preview-empty">
        貼上履歷後，此處會顯示<strong>將寫入感謝信</strong>的個人化語句
      </div>
    );
  }

  if (text.length < 15) {
    return (
      <div className="resume-preview resume-preview-warn">
        履歷內容過短，請再補充約 15 字以上（工作經歷、技能或專案成果）
      </div>
    );
  }

  if (!preview || preview.weak) {
    return (
      <div className="resume-preview resume-preview-warn">
        未能從履歷辨識亮點，請補充具體技能、公司名稱或年資，生成時將使用一般感謝語氣
      </div>
    );
  }

  return (
    <div className="resume-preview resume-preview-active">
      <div className="resume-preview-title">↓ 以下內容將帶入「生成結果」</div>
      <ul className="resume-preview-list">
        {preview.lines.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      <div className="resume-preview-touch">
        <span className="resume-preview-label">信件中的肯定語句：</span>
        「{preview.touch}」
      </div>
    </div>
  );
}
