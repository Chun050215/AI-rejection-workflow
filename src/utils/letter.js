import { LANG_MAP, LETTER_MAX_CJK, TONE_HINTS } from '../constants';
import { delay } from './delay';
import { buildPersonalTouchZh, buildPersonalTouchEn } from './personalize';

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

function generateLetterZh({ name, position, reason, company, tone, resume }) {
  const rp = REASON_PHRASES_ZH[reason] || '經審慎評估，本次未能進入下一階段';
  const touch = buildPersonalTouchZh(resume, position, tone);
  const hasResume = (resume || '').trim().length >= 15;

  const templates = {
    專業有禮: `${name} 您好：\n\n感謝您應徵 ${company}「${position}」一職。${touch}。${rp}，故未能安排進入下一階段。\n\n${
      hasResume
        ? '我們珍惜與您的交流，也盼日後有合適職缺時能再次邀請您。'
        : '我們珍惜此次交流，誠摯歡迎您關注本公司職缺，期待日後再聯繫。'
    }\n\n${company} 人資團隊 敬上`,
    溫暖親切: `${name} 您好：\n\n非常感謝您對 ${company}「${position}」的用心申請。${touch}。${rp}，請您見諒。\n\n我們真心欣賞您的努力與態度，也盼望未來若有適合的機會，能再次邀請您加入我們。\n\n祝一切順心\n${company} HR 團隊`,
    簡潔俐落: `${name} 您好：\n\n感謝您申請 ${company}「${position}」。${touch}。${rp}，本次無法進入下一階段。\n\n歡迎持續關注本公司職缺。\n\n${company} HR`,
  };
  return templates[tone] || templates['專業有禮'];
}

function generateLetterEn({ name, position, reason, company, tone, resume }) {
  const rp = REASON_PHRASES_EN[reason] || 'we are unable to move forward with your application at this time';
  const cap = rp.charAt(0).toUpperCase() + rp.slice(1);
  const touch = buildPersonalTouchEn(resume, position, tone);
  const touchCap = touch.charAt(0).toUpperCase() + touch.slice(1);

  const templates = {
    專業有禮: `Dear ${name},\n\nThank you for applying for the ${position} role at ${company}. ${touchCap}. ${cap}, and we will not be moving forward to the next stage.\n\nWe truly value your interest and hope to connect again when a suitable opportunity arises.\n\nSincerely,\nHR Team, ${company}`,
    溫暖親切: `Hi ${name},\n\nThank you so much for your interest in the ${position} position at ${company}! ${touchCap}. ${cap}, so we cannot invite you to the next step this time.\n\nWe genuinely appreciate your effort and hope we can stay in touch for future roles.\n\nWarm regards,\n${company} HR Team`,
    簡潔俐落: `Dear ${name},\n\nThank you for applying for ${position} at ${company}. ${touchCap}. ${cap}. We will not proceed further.\n\nPlease watch for future openings.\n\nBest,\n${company} HR`,
  };
  return templates[tone] || templates['專業有禮'];
}

export function generateLetterLocal({ name, position, reason, company, tone, lang, resume = '' }) {
  const params = { name, position, reason, company, tone, resume };
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

export function buildPrompt({ name, position, reason, company, tone, lang, resume = '' }) {
  const langLabel = LANG_MAP[lang] || '中文';
  const toneHint = TONE_HINTS[tone] || tone;
  const langNote = lang === 'both' ? '\n- 同時生成中文版與英文版' : `\n- 輸出語言：${langLabel}`;
  const resumeBlock = (resume || '').trim()
    ? `\n\n應徵者履歷（摘錄）：\n${resume.trim().slice(0, 800)}${resume.length > 800 ? '…' : ''}\n\n請從履歷中擷取 1～2 項具體亮點寫入感謝信，讓應徵者感受到被認真看待。`
    : '\n\n（未提供履歷，請以一般感謝語氣撰寫）';

  return `你是一位專業的 HR，請幫我撰寫一封履歷感謝信，語氣要真誠有溫度但簡潔。

應徵者姓名：${name}
應徵職位：${position}
公司名稱：${company}
原因類別：${reason}${resumeBlock}

要求：
- 約 ${LETTER_MAX_CJK} 字以內（中文，含個人化語句）
- 必須呼應履歷中的具體經歷或技能（若有提供）
- 不要透露過多錄取細節
- 結尾鼓勵未來再應徵
- 語氣：${toneHint}${langNote}

【本工具說明】將依履歷自動嵌入個人化語句；寄出前請 HR 過目確認。`;
}
