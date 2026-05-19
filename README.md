# AI 拒絕感謝信產生器

> **AI 幫你寄出那封你一直沒寄的信** — 用 AI 自動化履歷回覆，打造有溫度的雇主品牌。

瀏覽器端運行的 HR 婉拒信工作台：匯入應徵者、依職位管理 JD、上傳履歷自動比對、批量生成個人化感謝信，並支援 Gmail 寄送。全程強調 **標準化、個人化、人機協作**（AI 起草，HR 過目後寄出）。

**線上儲存庫**：[github.com/Chun050215/AI-rejection-workflow](https://github.com/Chun050215/AI-rejection-workflow)

---

## 功能總覽

| 模組 | 說明 |
|------|------|
| **單筆模式** | 一位應徵者：填資料 → 貼 JD → 上傳履歷 → 生成 → 過目 → 寄信 |
| **批量模式** | 名單匯入 → 多職位 JD → 批量上傳履歷（選填）→ 批量生成 → 批量寄信 |
| **信件內容** | 婉拒類別套話 + 個別未錄取理由（JD 比對自動產生）+ 履歷個人化肯定 |
| **多職位 JD** | 每個職位一份 JD，依應徵職位自動選用；可手動覆寫比對哪一份 |
| **履歷檔** | PDF、Word（.docx）、TXT；檔名含姓名可自動對應名單 |
| **寄信** | Gmail API（OAuth，可真正自動寄出 + 批次 API）／ Gmail 手動草稿（需自行按傳送） |

---

## 技術棧

- **React 18** + **Vite 6**
- **pdfjs-dist** — PDF 履歷文字萃取
- **mammoth** — Word 履歷文字萃取
- **xlsx**、**jszip** — CSV / Excel / Numbers 名單匯入
- **localStorage** — 寄信設定、多職位 JD、批量偏好（無後端）

---

## 快速開始

### 環境需求

- Node.js 18+
- npm

### 安裝與執行

```bash
git clone https://github.com/Chun050215/AI-rejection-workflow.git
cd AI-rejection-workflow
npm install
npm run dev
```

瀏覽器開啟 `http://localhost:5173`。

### 建置正式版

```bash
npm run build
npm run preview
```

### Gmail API（選填，用於自動寄信）

1. 至 [Google Cloud Console](https://console.cloud.google.com) 建立專案並啟用 **Gmail API**
2. 建立 **OAuth 2.0 網頁應用程式** 用戶端 ID
3. **已授權的 JavaScript 來源** 加入 `http://localhost:5173` 與部署網址
4. 複製用戶端 ID，擇一設定：
   - 複製 `.env.example` 為 `.env`，填入 `VITE_GOOGLE_CLIENT_ID`
   - 或在 App 內「寄信設定」手動貼上
5. 在 App 中選 **Gmail API** → **連結 Gmail** → 允許傳送郵件權限

未設定 Gmail API 時，仍可使用 **Gmail 手動過目**（開啟草稿，需自行傳送）與複製／下載功能。

---

## 使用方式

### 單筆模式

1. 設定 **公司名稱**、**語氣**、**語言**（中／英／雙語）
2. 填寫姓名、職位、婉拒原因類別
3. 在 **職缺 JD（依職位）** 為該職位貼上 JD
4. **上傳履歷檔** → 系統自動比對並產生個別理由（唯讀）
5. **生成感謝信** → 過目 → 複製或寄信

可使用頁面上方 **情境 chips** 快速帶入範例資料。

### 批量模式

#### ① 職缺說明 JD（依職位）

- 下拉選單切換要編輯的職位
- **＋ 新增** 職位名稱，或 **從名單帶入職位**
- 為各職位分別貼上 JD（內容互不覆蓋）

#### ② 匯入應徵者名單

格式範例：

```csv
姓名,職位,Email
王小明,行銷企劃專員,xiaoming@example.com
林美華,產品經理,mei@example.com
```

支援：貼上 CSV、上傳 CSV／Excel／Numbers 檔。

#### ③ 上傳履歷檔（選填）

- 支援 **PDF、Word、TXT**，可多選
- 檔名建議含 **姓名**（例：`王小明.pdf`）
- **不必每位都上傳**；有履歷且該職位有 JD 者才會自動比對
- 無履歷者：僅使用婉拒類別套話生成信件

#### 生成與寄信

- 按 **開始批量生成** → 右側逐筆過目
- 完成後可：**批量寄信**、複製全部、下載 TXT、下載郵件合併 CSV

### 婉拒原因類別

系統內建六種類別（可搭配自動比對建議）：

- 經歷與職位需求不符
- 錄取其他更符合需求的候選人
- 職缺暫時停止招募
- 技能與現階段需求不匹配
- 學歷與職位要求不符
- 薪資期望超出預算範圍

信件正文 = **類別套話** + **個別理由**（有 JD 比對時自動產生）。

### JD 自動配對規則

| 情況 | 行為 |
|------|------|
| 應徵職位與 JD 槽位名稱一致 | 使用該職位 JD |
| 名稱部分相符 | 模糊配對 |
| 無對應職位、有「通用」JD | 使用「通用」 |
| 無對應 JD | 履歷仍可載入，但不比對；僅類別套話 |

展開單筆應徵者卡片時，若有多份 JD，可透過 **比對 JD 職位** 下拉手動指定。

---

## 寄信方式

| 方式 | 說明 |
|------|------|
| **Gmail API** | OAuth 連結後可自動寄出；批量模式支援 Gmail Batch API |
| **Gmail 手動過目** | 開啟 Gmail 撰寫視窗預填內容，**需手動按傳送** |

> **人機協作**：請先過目信件內容，確認符合公司形象後再寄出。AI 負責起草，HR 審核後寄送。

可勾選 **批量完成後自動寄出**（需 Gmail API 已連結且名單含 Email）。

---

## 專案結構

```
src/
├── App.jsx                 # 主流程與狀態
├── constants.js            # 婉拒類別、語氣、工作坊文案
├── components/
│   ├── SingleMode.jsx      # 單筆模式
│   ├── BatchMode.jsx       # 批量模式
│   ├── BatchItem.jsx       # 單一應徵者卡片
│   ├── JobDescriptionEditor.jsx  # 多職位 JD 編輯
│   ├── LetterSettings.jsx  # 公司／語氣／語言
│   ├── EmailSettings.jsx   # Gmail 設定
│   └── ...
└── utils/
    ├── letter.js           # 信件模板生成
    ├── reasonPhrase.js     # 類別 + 個別理由組句
    ├── jdMatcher.js        # 履歷 vs JD 比對
    ├── jdStore.js          # 多職位 JD 存取
    ├── resumeFileImport.js # 履歷檔萃取
    ├── gmailApi.js         # Gmail OAuth 與批次寄信
    ├── csv.js              # CSV 解析
    └── spreadsheetImport.js
```

---

## 本地儲存

| 項目 | 說明 |
|------|------|
| `batchSettings` | 多職位 JD、目前編輯職位、預設婉拒類別、自動判斷開關 |
| 寄信設定 | 寄信方式、Gmail、Client ID、批量自動寄出等 |

資料僅存於瀏覽器，不會上傳至第三方伺服器（Gmail 寄信時直接呼叫 Google API）。

---

## 隱私與安全

- 履歷與 JD 在本地處理與生成，無自建後端
- Gmail API 需使用者授權；Access Token 存於瀏覽器 localStorage
- 請勿將含真實個資的 `.env` 或匯出檔案提交至公開儲存庫

---

## 授權

本專案為工作坊實作工具。使用 Gmail API 須遵守 [Google API 服務條款](https://developers.google.com/terms)。

---

## 相關連結

- 儲存庫：https://github.com/Chun050215/AI-rejection-workflow
- 品牌：**先行智庫** — AI 生成式工作坊
