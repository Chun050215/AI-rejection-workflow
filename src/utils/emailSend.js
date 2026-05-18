import { SEND_METHODS } from './emailSettings';
import { openGmailCompose } from './email';
import { sendViaGmailApi, sendBatchViaGmailApi } from './gmailApi';

export { sendBatchViaGmailApi };

/** 依設定選擇寄信方式 */
export async function sendEmail(item, email, company) {
  const method = email.sendMethod || SEND_METHODS.gmail;

  if (method === SEND_METHODS.gmailApi) {
    await sendViaGmailApi(item, email, company);
    return { mode: 'sent' };
  }

  const opened = openGmailCompose(item, email, company);
  if (!opened) {
    throw new Error('無法開啟 Gmail，請允許瀏覽器彈出視窗');
  }
  return { mode: 'gmail' };
}

export async function sendTestEmail(email, company) {
  const to = email.gmail?.trim();
  if (!to) {
    throw new Error('請先填寫 HR 信箱（測試信會寄到此地址）');
  }
  return sendEmail(
    {
      name: '測試收件人',
      position: '測試職位',
      email: to,
      result:
        '您好，\n\n這是一封測試信。若您收到此信，代表寄信設定正確，可以開始批量寄送感謝信。\n\n祝順心',
    },
    email,
    company
  );
}
