/** 常見技能關鍵字（用於從履歷擷取亮點） */
const SKILL_KEYWORDS = [
  '行銷', '品牌', '數據分析', '專案管理', '產品', 'UX', 'UI', '設計',
  'Python', 'Java', 'JavaScript', 'React', 'SQL', 'Excel', 'Power BI',
  '溝通', '簡報', '領導', '跨部門', '敏捷', 'Scrum', 'AI', '機器學習',
  '內容行銷', 'SEO', '社群', '客戶關係', '業務', '財務', '會計',
  '人資', '招募', '法務', '供應鏈', '品管', '研發',
];

/** 從履歷文字擷取可寫入信件的亮點 */
export function extractResumeHighlights(resume = '', position = '') {
  const text = (resume || '').trim().replace(/\s+/g, ' ');
  if (text.length < 15) return null;

  const skills = [];
  const lower = text.toLowerCase();
  for (const kw of SKILL_KEYWORDS) {
    if (text.includes(kw) || lower.includes(kw.toLowerCase())) {
      if (!skills.includes(kw)) skills.push(kw);
    }
  }

  const companies = [];
  const companyPatterns = [
    /(?:於|在|任職於|服務於)\s*([^\s，,、]{2,24}(?:股份有限公司|有限公司|公司))/g,
    /([^\s，,、]{2,20}(?:股份有限公司|有限公司))/g,
  ];
  for (const re of companyPatterns) {
    let m;
    while ((m = re.exec(text)) && companies.length < 3) {
      const c = m[1].trim();
      if (c.length >= 2 && !companies.includes(c)) companies.push(c);
    }
  }

  const yearsMatch = text.match(/(\d{1,2})\s*年/);
  const years = yearsMatch ? yearsMatch[1] : null;

  const eduMatch = text.match(/(博士|碩士|學士|碩博|MBA|EMBA)/);
  const education = eduMatch ? eduMatch[0] : null;

  return {
    skills: skills.slice(0, 4),
    companies: companies.slice(0, 2),
    years,
    education,
    hasContent: skills.length > 0 || companies.length > 0 || years || education,
  };
}

/** 將亮點整理成可讀摘要（供 UI 預覽） */
export function formatHighlightsSummary(highlights) {
  if (!highlights?.hasContent) return [];
  const lines = [];
  if (highlights.skills?.length) lines.push(`技能／專長：${highlights.skills.join('、')}`);
  if (highlights.companies?.length) lines.push(`任職單位：${highlights.companies.join('、')}`);
  if (highlights.years) lines.push(`年資：約 ${highlights.years} 年`);
  if (highlights.education) lines.push(`學歷：${highlights.education}`);
  return lines;
}
