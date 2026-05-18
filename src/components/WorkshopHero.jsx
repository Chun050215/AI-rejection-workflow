import {
  WORKSHOP_TAGLINE,
  WORKSHOP_SUBTITLE,
  PAIN_POINTS,
  TIME_COMPARISON,
  AI_CAPABILITIES,
  HUMAN_RESPONSIBILITIES,
} from '../constants';

export default function WorkshopHero() {
  return (
    <section className="workshop-hero">
      <div className="workshop-hero-main">
        <p className="workshop-eyebrow">AI 生成式工作坊 · 實作工具</p>
        <h2 className="workshop-tagline">{WORKSHOP_TAGLINE}</h2>
        <p className="workshop-subtitle">{WORKSHOP_SUBTITLE}</p>
        <p className="workshop-audience">適用對象：HR 主管 / 招募專員 / 中小企業負責人</p>
      </div>

      <div className="workshop-stat-card">
        <div className="workshop-stat-num">75%</div>
        <div className="workshop-stat-text">
          <strong>的應徵者從未收到任何回音</strong>
          <span>每一封沒寄出的信，都是一次錯過的品牌機會</span>
        </div>
      </div>

      <details className="workshop-details">
        <summary>為什麼企業不寄拒絕信？點此展開痛點與效益</summary>
        <div className="workshop-details-grid">
          <div className="workshop-panel">
            <h4>產業痛點</h4>
            <ul className="workshop-list">
              {PAIN_POINTS.map((p) => (
                <li key={p.text}>
                  <span>{p.icon}</span> {p.text}
                </li>
              ))}
            </ul>
          </div>

          <div className="workshop-panel">
            <h4>時間效益對比</h4>
            <table className="workshop-table">
              <thead>
                <tr>
                  <th>情境</th>
                  <th>人工撰寫</th>
                  <th>AI 輔助</th>
                </tr>
              </thead>
              <tbody>
                {TIME_COMPARISON.map((row) => (
                  <tr key={row.label}>
                    <td>{row.label}</td>
                    <td>{row.manual}</td>
                    <td className="highlight">{row.ai}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="workshop-panel workshop-panel-full">
            <h4>人機協作：AI 負責產出，人負責判斷與確認</h4>
            <div className="workshop-split">
              <div>
                <h5>AI 幫你做</h5>
                <ul className="workshop-list compact">
                  {AI_CAPABILITIES.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h5>仍需你確認</h5>
                <ul className="workshop-list compact">
                  {HUMAN_RESPONSIBILITIES.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </details>
    </section>
  );
}
