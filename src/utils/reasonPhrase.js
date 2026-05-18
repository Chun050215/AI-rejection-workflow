const REASON_PHRASES_ZH = {
  經歷與職位需求不符: '經審慎評估，您的經歷與本職缺方向尚未完全契合',
  錄取其他更符合需求的候選人: '我們已錄取其他更符合團隊需求的候選人',
  職缺暫時停止招募: '該職缺目前已暫停招募',
  技能與現階段需求不匹配: '您的技能與團隊現階段需求方向有所不同',
  學歷與職位要求不符: '您的學歷與本職缺要求尚有差距',
  薪資期望超出預算範圍: '薪資期望與本公司預算區間未能共識',
};

const REASON_PHRASES_EN = {
  經歷與職位需求不符: 'after careful review, your experience does not fully align with this role',
  錄取其他更符合需求的候選人: 'we have selected another candidate who better fits our needs',
  職缺暫時停止招募: 'this position is currently on hold',
  技能與現階段需求不匹配: 'your skills differ from what our team needs now',
  學歷與職位要求不符: 'your academic background does not meet this role requirement',
  薪資期望超出預算範圍: 'your salary expectations are beyond our budget range',
};

export function getCategoryPhrase(reason, lang = 'zh') {
  const map = lang === 'en' ? REASON_PHRASES_EN : REASON_PHRASES_ZH;
  const fallback =
    lang === 'en'
      ? 'after careful review, we are unable to move forward with your application at this time'
      : '經審慎評估，本次未能進入下一階段';
  return map[reason] || fallback;
}

/** 信件正文：類別套話 + 個別理由（兩者都會寫入） */
export function buildLetterReasonBlock(reason, reasonDetail, lang = 'zh') {
  const category = getCategoryPhrase(reason, lang);
  const custom = (reasonDetail || '').trim().replace(/。+$/g, '');

  if (lang === 'en') {
    const cat = formatReasonForEn(category);
    if (!custom) return `${cat}, and we will not be moving forward to the next stage`;
    const detail = formatReasonForEn(custom);
    return `${cat}. ${detail}, and we will not be moving forward to the next stage`;
  }

  if (!custom) return `${category}，故未能安排進入下一階段`;
  return `${category}；${custom}，故未能安排進入下一階段`;
}

/** @deprecated 請改用 buildLetterReasonBlock */
export function getEffectiveReasonPhrase(reason, reasonDetail, lang = 'zh') {
  return buildLetterReasonBlock(reason, reasonDetail, lang);
}

export function formatReasonForEn(phrase) {
  const t = (phrase || '').trim();
  if (!t) return t;
  return t.charAt(0).toUpperCase() + t.slice(1);
}
