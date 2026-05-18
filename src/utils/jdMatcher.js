import { REASONS } from '../constants';
import { extractResumeHighlights, SKILL_KEYWORDS } from './resumeParser';

const JD_REQUIREMENT_HINTS = /必備|要求|熟悉|具備|精通|掌握|優先|加分|needs?|required|must have|proficient/i;

function normalizeText(text) {
  return (text || '').trim().replace(/\s+/g, ' ');
}

/** 從 JD 擷取技能與條件關鍵字 */
export function extractJdRequirements(jdText = '') {
  const text = normalizeText(jdText);
  if (text.length < 10) return { skills: [], yearsMin: null, education: null, domains: [] };

  const lower = text.toLowerCase();
  const skills = [];
  for (const kw of SKILL_KEYWORDS) {
    if (text.includes(kw) || lower.includes(kw.toLowerCase())) {
      if (!skills.includes(kw)) skills.push(kw);
    }
  }

  const extraPatterns = [
    /B2B|B2C|SaaS|CRM|ERP|AWS|Azure|GCP|Docker|Kubernetes|Figma|Tableau/gi,
    /數據分析|品牌行銷|用戶研究|敏捷開發|全端|後端|前端|DevOps/g,
  ];
  for (const re of extraPatterns) {
    const found = text.match(re);
    if (found) {
      for (const f of found) {
        const k = f.trim();
        if (k && !skills.includes(k)) skills.push(k);
      }
    }
  }

  const yearsMatch = text.match(/(\d{1,2})\s*年以上|至少\s*(\d{1,2})\s*年|(\d{1,2})\+\s*年/);
  const yearsMin = yearsMatch ? Number(yearsMatch[1] || yearsMatch[2] || yearsMatch[3]) : null;

  const eduMatch = text.match(/(博士|碩士|學士|碩博|MBA|EMBA)/);
  const education = eduMatch ? eduMatch[0] : null;

  const domains = [];
  if (/零售|門市|現場|通路/.test(text)) domains.push('零售／現場營運');
  if (/B2B|企業客戶|業務開發/.test(text)) domains.push('B2B 業務開發');
  if (/數據|分析|Data/.test(text)) domains.push('數據分析');
  if (/產品|PM|Product/.test(text)) domains.push('產品管理');

  return { skills: skills.slice(0, 12), yearsMin, education, domains };
}

function inferReasonCategory({ missingSkills, missingDomains, yearsGap, eduGap }) {
  if (eduGap) return '學歷與職位要求不符';
  if (missingSkills.length >= 2 || missingDomains.length) return '技能與現階段需求不匹配';
  if (yearsGap) return '經歷與職位需求不符';
  return '經歷與職位需求不符';
}

function skillMatches(resumeSkill, jdSkill) {
  const a = resumeSkill.toLowerCase();
  const b = jdSkill.toLowerCase();
  return a.includes(b) || b.includes(a);
}

/**
 * 比對履歷與 JD，產生個別婉拒理由與建議類別
 */
export function analyzeResumeAgainstJd(resume, jdText, position = '') {
  const jd = extractJdRequirements(jdText);
  const highlights = extractResumeHighlights(resume, position);
  const resumeText = normalizeText(resume);

  if (!jd.skills.length && !jd.domains.length && !jd.yearsMin && !jd.education) {
    return {
      reasonDetail: '',
      suggestedReason: REASONS[0],
      matchSummary: { matchedSkills: [], gapSkills: [], matchedDomains: [], gapDomains: [], note: 'JD 內容過少，請補充職缺要求' },
    };
  }

  const matchedSkills = jd.skills.filter((js) =>
    highlights?.skills?.some((rs) => skillMatches(rs, js))
  );
  const gapSkills = jd.skills.filter((js) => !matchedSkills.some((m) => skillMatches(m, js)));

  const matchedDomains = jd.domains.filter((d) => resumeText.includes(d.split('／')[0]) || resumeText.includes(d));
  const gapDomains = jd.domains.filter((d) => !matchedDomains.includes(d));

  const resumeYears = highlights?.years ? Number(highlights.years) : null;
  const yearsGap = jd.yearsMin && resumeYears != null && resumeYears < jd.yearsMin;

  const eduGap =
    jd.education &&
    highlights?.education &&
    jd.education !== highlights.education &&
    !resumeText.includes(jd.education);

  const parts = [];

  if (matchedSkills.length) {
    parts.push(`我們肯定您在${matchedSkills.slice(0, 3).join('、')}等方面的專業累積`);
  } else if (highlights?.hasContent && highlights.skills?.length) {
    parts.push(`我們留意到您具備${highlights.skills.slice(0, 2).join('、')}等能力`);
  } else if (highlights?.hasContent) {
    parts.push('我們仔細閱讀您的履歷，對您的背景留下良好印象');
  }

  const gapBits = [];
  if (gapSkills.length) gapBits.push(`${gapSkills.slice(0, 3).join('、')}等技能`);
  if (gapDomains.length) gapBits.push(gapDomains[0]);
  if (yearsGap) gapBits.push(`本職缺期望約 ${jd.yearsMin} 年以上相關經驗`);
  if (eduGap) gapBits.push(`${jd.education}學歷要求`);

  if (gapBits.length) {
    const gapClause =
      gapBits.length === 1
        ? gapBits[0]
        : `${gapBits.slice(0, -1).join('、')}與${gapBits[gapBits.length - 1]}`;
    parts.push(`惟本職缺「${position || '此職位'}」尚需${gapClause}，與您目前履歷呈現的重心略有不同`);
  } else if (matchedSkills.length) {
    parts.push('惟經整體職能與團隊編制綜合評估，本次未能安排進入下一階段');
  } else {
    parts.push('惟經審慎比對職缺需求與您的履歷，本次未能安排進入下一階段');
  }

  const reasonDetail = parts.join('，');
  const suggestedReason = inferReasonCategory({
    missingSkills: gapSkills,
    missingDomains: gapDomains,
    yearsGap,
    eduGap,
  });

  return {
    reasonDetail,
    suggestedReason,
    matchSummary: {
      matchedSkills,
      gapSkills,
      matchedDomains,
      gapDomains,
      yearsGap,
      eduGap,
    },
  };
}

export function formatJdMatchSummary(summary) {
  if (!summary) return [];
  const lines = [];
  if (summary.matchedSkills?.length) lines.push(`✓ 符合：${summary.matchedSkills.join('、')}`);
  if (summary.gapSkills?.length) lines.push(`△ 待加強：${summary.gapSkills.join('、')}`);
  if (summary.matchedDomains?.length) lines.push(`✓ 領域符合：${summary.matchedDomains.join('、')}`);
  if (summary.gapDomains?.length) lines.push(`△ 領域落差：${summary.gapDomains.join('、')}`);
  if (summary.note) lines.push(summary.note);
  return lines;
}
