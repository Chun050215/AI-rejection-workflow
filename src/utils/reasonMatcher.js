import { REASONS } from '../constants';

/** 依備註、職位等文字關鍵字自動推斷婉拒原因 */
const RULES = [
  {
    reason: '錄取其他更符合需求的候選人',
    keywords: ['錄取其他', '其他候選', '另有合適', '人選已', '競爭者', '其他應徵'],
  },
  {
    reason: '職缺暫時停止招募',
    keywords: ['暫停招募', '停止招募', '職缺關閉', '暫緩招募', 'on hold', '暫停'],
  },
  {
    reason: '薪資期望超出預算範圍',
    keywords: ['薪資', '薪水', '待遇', '預算', 'salary', '薪資期望'],
  },
  {
    reason: '學歷與職位要求不符',
    keywords: ['學歷', '學位', '碩士', '博士', '大學', 'degree'],
  },
  {
    reason: '技能與現階段需求不匹配',
    keywords: ['技能', '專業', '技術', '工具', '證照', 'skill', '能力'],
  },
  {
    reason: '經歷與職位需求不符',
    keywords: ['經歷', '經驗', '資歷', '年資', '背景', '不符', '不符合', '契合', 'match'],
  },
];

export function inferReason({ note = '', position = '' }, defaultReason) {
  const text = `${note} ${position}`.toLowerCase();
  if (!text.trim()) return defaultReason;

  for (const { reason, keywords } of RULES) {
    if (keywords.some((k) => text.includes(k.toLowerCase()))) {
      return reason;
    }
  }
  return defaultReason;
}

export function resolveReason(row, defaultReason, autoDetect = true) {
  if (row.reason && REASONS.includes(row.reason)) {
    return row.reason;
  }
  if (autoDetect) {
    return inferReason({ note: row.note || '', position: row.position || '' }, defaultReason);
  }
  return defaultReason;
}
