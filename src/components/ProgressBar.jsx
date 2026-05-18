export default function ProgressBar({ label, done, total, percent }) {
  return (
    <div className="progress-section">
      <div className="progress-label">
        <span>
          {label}：<strong>{done} / {total}</strong> 完成
        </span>
        <span>{percent}%</span>
      </div>
      <div className="progress-bar-bg">
        <div className="progress-bar-fill" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
