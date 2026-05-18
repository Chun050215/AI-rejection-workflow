import { LANG_MAP, LETTER_MAX_CJK, TONE_HINTS } from '../constants';
import { delay } from './delay';
import { buildPersonalTouchZh, buildPersonalTouchEn } from './personalize';
import { buildLetterReasonBlock } from './reasonPhrase';

function generateLetterZh({ name, position, reason, reasonDetail, company, tone, resume }) {
  const reasonBlock = buildLetterReasonBlock(reason, reasonDetail, 'zh');
  const touch = buildPersonalTouchZh(resume, position, tone);
  const hasResume = (resume || '').trim().length >= 15;

  const templates = {
    專業有禮: `${name} 您好：\n\n感謝您應徵 ${company}「${position}」一職。${touch}。${reasonBlock}。\n\n${
      hasResume
        ? '我們珍惜與您的交流，也盼日後有合適職缺時能再次邀請您。'
        : '我們珍惜此次交流，誠摯歡迎您關注本公司職缺，期待日後再聯繫。'
    }\n\n${company} 人資團隊 敬上`,
    溫暖親切: `${name} 您好：\n\n非常感謝您對 ${company}「${position}」的用心申請。${touch}。${reasonBlock}，請您見諒。\n\n我們真心欣賞您的努力與態度，也盼望未來若有適合的機會，能再次邀請您加入我們。\n\n祝一切順心\n${company} HR 團隊`,
    簡潔俐落: `${name} 您好：\n\n感謝您申請 ${company}「${position}」。${touch}。${reasonBlock}。\n\n歡迎持續關注本公司職缺。\n\n${company} HR`,
  };
  return templates[tone] || templates['專業有禮'];
}

function generateLetterEn({ name, position, reason, reasonDetail, company, tone, resume }) {
  const reasonBlock = buildLetterReasonBlock(reason, reasonDetail, 'en');
  const touch = buildPersonalTouchEn(resume, position, tone);
  const touchCap = touch.charAt(0).toUpperCase() + touch.slice(1);

  const templates = {
    專業有禮: `Dear ${name},\n\nThank you for applying for the ${position} role at ${company}. ${touchCap}. ${reasonBlock}.\n\nWe truly value your interest and hope to connect again when a suitable opportunity arises.\n\nSincerely,\nHR Team, ${company}`,
    溫暖親切: `Hi ${name},\n\nThank you so much for your interest in the ${position} position at ${company}! ${touchCap}. ${reasonBlock}.\n\nWe genuinely appreciate your effort and hope we can stay in touch for future roles.\n\nWarm regards,\n${company} HR Team`,
    簡潔俐落: `Dear ${name},\n\nThank you for applying for ${position} at ${company}. ${touchCap}. ${reasonBlock}.\n\nPlease watch for future openings.\n\nBest,\n${company} HR`,
  };
  return templates[tone] || templates['專業有禮'];
}

export function generateLetterLocal({
  name,
  position,
  reason,
  reasonDetail = '',
  company,
  tone,
  lang,
  resume = '',
}) {
  const params = { name, position, reason, reasonDetail, company, tone, resume };
  if (lang === 'en') return generateLetterEn(params);
  if (lang === 'both') {
    return `【中文版】\n${generateLetterZh(params)}\n\n【English】\n${generateLetterEn(params)}`;
  }
  return generateLetterZh(params);
}

export async function streamText(text, onChunk) {
  const chars = [...text];
  for (let i = 0; i < chars.length; i++) {
    onChunk(chars[i]);
    await delay(i % 4 === 0 ? 12 : 4);
  }
}

export function buildPrompt({ name, position, reason, reasonDetail = '', company, tone, lang, resume = '' }) {
  const langLabel = LANG_MAP[lang] || '中文';
  const toneHint = TONE_HINTS[tone] || tone;
  const langNote = lang === 'both' ? '\n- 同時生成中文版與英文版' : `\n- 輸出語言：${langLabel}`;
  const resumeBlock = (resume || '').trim()
    ? `\n\n應徵者履歷（摘錄）：\n${resume.trim().slice(0, 800)}${resume.length > 800 ? '…' : ''}\n\n請從履歷中擷取 1～2 項具體亮點寫入感謝信，讓應徵者感受到被認真看待。`
    : '\n\n（未提供履歷，請以一般感謝語氣撰寫）';
  const reasonBlock = buildLetterReasonBlock(reason, reasonDetail, lang === 'en' ? 'en' : 'zh');

  return `你是一位專業的 HR，請幫我撰寫一封履歷感謝信，語氣要真誠有溫度但簡潔。

應徵者姓名：${name}
應徵職位：${position}
公司名稱：${company}
婉拒原因類別：${reason}
${(reasonDetail || '').trim() ? `個別未錄取說明：${reasonDetail.trim()}` : ''}
信件須包含上述類別與個別說明，參考用語：${reasonBlock}${resumeBlock}

要求：
- 約 ${LETTER_MAX_CJK} 字以內（中文，含個人化語句）
- 必須呼應履歷中的具體經歷或技能（若有提供）
- 不要透露過多錄取細節
- 結尾鼓勵未來再應徵
- 語氣：${toneHint}${langNote}

【本工具說明】將依履歷自動嵌入個人化語句；寄出前請 HR 過目確認。`;
}
