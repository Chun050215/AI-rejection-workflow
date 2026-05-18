export const REASONS = [
  '經歷與職位需求不符',
  '錄取其他更符合需求的候選人',
  '職缺暫時停止招募',
  '技能與現階段需求不匹配',
  '學歷與職位要求不符',
  '薪資期望超出預算範圍',
];

export const LANG_MAP = { zh: '中文', en: '英文', both: '中英雙語' };

export const WORKSHOP_TAGLINE = 'AI 幫你寄出那封你一直沒寄的信';
export const WORKSHOP_SUBTITLE = '用 AI 自動化履歷回覆，打造有溫度的雇主品牌';
export const LETTER_MAX_CJK = 220;

export const SCENARIOS = [
  {
    label: '情境一',
    title: '經歷不符',
    name: '王小明',
    position: '行銷企劃專員',
    reason: '經歷與職位需求不符',
    resume:
      '5年行銷經驗，曾任職於 OO 股份有限公司。擅長品牌企劃、數據分析與跨部門專案管理，具備 Google Analytics 與 Excel 進階應用能力。',
  },
  {
    label: '情境二',
    title: '錄取其他候選人',
    name: '林美華',
    position: '產品經理',
    reason: '錄取其他更符合需求的候選人',
    resume: '8年產品經驗，曾任職於科技公司。擅長用戶研究、敏捷開發與跨團隊協作。',
  },
  {
    label: '情境三',
    title: '職缺暫停招募',
    name: 'David Chen',
    position: '資深工程師',
    reason: '職缺暫時停止招募',
    resume: '10年軟體開發經驗，精通 Python、React，具大型系統架構與 DevOps 實務。',
  },
];

export const TONES = ['專業有禮', '溫暖親切', '簡潔俐落'];

export const TONE_HINTS = {
  專業有禮: '專業但有人情味（正式版）',
  溫暖親切: '親切版，較有溫度',
  簡潔俐落: '簡潔直接',
};

export const PAIN_POINTS = [
  { icon: '📬', text: '量太大：一個職缺常收到 200+ 份履歷' },
  { icon: '⏱', text: '沒人力：HR 同時處理面試與行政，回信排最後' },
  { icon: '✍️', text: '怕出錯：不知如何寫才不冷漠' },
  { icon: '🔧', text: '沒系統：全靠人工，缺乏標準化流程' },
];

export const TIME_COMPARISON = [
  { label: '一封信', manual: '5–10 分鐘', ai: '約 30 秒' },
  { label: '100 封（一個職缺）', manual: '約 8–16 小時', ai: '約 50 分鐘' },
];

export const AI_CAPABILITIES = [
  '語言生成：依條件組合通順句子，每封略有不同',
  '語氣控制：專業、親切等風格可調',
  '多語言切換：中英版本一鍵產出',
];

export const HUMAN_RESPONSIBILITIES = [
  '決定是否錄取（人的專業判斷）',
  '確認信件是否符合公司形象（過目審核）',
  '按下最終發送（由人確認後寄出）',
];
