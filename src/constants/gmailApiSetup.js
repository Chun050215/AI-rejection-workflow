export const GMAIL_API_SCOPE = 'https://www.googleapis.com/auth/gmail.send';

export const GMAIL_API_SETUP_STEPS = [
  '前往 console.cloud.google.com 建立專案',
  'API 和服務 → 啟用「Gmail API」',
  '憑證 → 建立 OAuth 用戶端 ID → 類型：網頁應用程式',
  '已授權的 JavaScript 來源：加入 http://localhost:5173 與你的部署網址',
  '複製「用戶端 ID」貼到下方（或以 .env 設定 VITE_GOOGLE_CLIENT_ID）',
  '點「連結 Gmail」並允許「傳送郵件」權限',
];
