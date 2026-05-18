/** 貼到 script.google.com 新建專案 → 部署為網路應用程式 */
export const APPS_SCRIPT_EMAIL_CODE = `function doPost(e) {
  try {
    var p = JSON.parse(e.postData.contents);
    if (!p.to || !p.subject || !p.body) {
      throw new Error('缺少 to / subject / body');
    }
    GmailApp.sendEmail(
      p.to,
      p.subject,
      p.body,
      { name: p.fromName || 'HR' }
    );
    return ContentService
      .createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: String(err.message || err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}`;
