import { extractResumeHighlights } from './resumeParser';

const COMPANY_SUFFIX = /(?:股份有限公司|有限公司|公司|Corp\.?|Co\.?,?\s*Ltd\.?|Inc\.?|集團)/gi;

function shortCompany(name) {
  return (name || '').replace(COMPANY_SUFFIX, '').trim() || name;
}

/** 中文：依履歷亮點組一句有溫度的肯定 */
export function buildPersonalTouchZh(resume, position, tone) {
  const h = extractResumeHighlights(resume, position);
  if (!h?.hasContent) {
    if (tone === '溫暖親切') return '我們仔細閱讀了您用心準備的履歷';
    if (tone === '簡潔俐落') return '感謝您投遞履歷';
    return '感謝您撥冗投遞履歷，我們已認真閱讀';
  }

  const bits = [];

  if (h.skills.length >= 2) {
    bits.push(`您在${h.skills.slice(0, 2).join('、')}等領域的專業累積`);
  } else if (h.skills.length === 1) {
    bits.push(`您在${h.skills[0]}方面的實務經驗`);
  }

  if (h.companies.length) {
    bits.push(`於「${shortCompany(h.companies[0])}」等單位的工作歷程`);
  }

  if (h.years && bits.length < 2) {
    bits.push(`約 ${h.years} 年的相關經歷`);
  }

  if (h.education && bits.length < 2) {
    bits.push(`您的${h.education}背景`);
  }

  if (bits.length === 0) {
    return '我們仔細閱讀了您的履歷，對您的背景留下良好印象';
  }

  if (tone === '溫暖親切') {
    return `我們仔細閱讀了您的履歷，尤其欣賞${bits.slice(0, 2).join('，以及')}`;
  }
  if (tone === '簡潔俐落') {
    return `我們已閱讀您的履歷，注意到${bits[0]}`;
  }
  return `感謝您投遞履歷，我們認真閱讀後，注意到${bits.slice(0, 2).join('，並肯定')}`;
}

/** 英文個人化語句 */
export function buildPersonalTouchEn(resume, position, tone) {
  const h = extractResumeHighlights(resume, position);
  if (!h?.hasContent) {
    if (tone === '溫暖親切') return 'We carefully reviewed the resume you prepared';
    return 'We appreciate the time you invested in your application';
  }

  if (h.skills.length >= 2) {
    const s = h.skills.slice(0, 2).join(' and ');
    if (tone === '溫暖親切') return `We especially appreciated your experience in ${s}`;
    return `We noted your strengths in ${s}`;
  }

  if (h.companies.length) {
    return `We were impressed by your experience at ${shortCompany(h.companies[0])}`;
  }

  if (h.years) {
    return `We noted your approximately ${h.years} years of relevant experience`;
  }

  return 'We carefully reviewed your background and were genuinely impressed';
}
