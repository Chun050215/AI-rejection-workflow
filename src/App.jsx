import { useState, useCallback, useMemo } from 'react';
import BrandBar from './components/BrandBar';
import AnimatedBackground from './components/AnimatedBackground';
import WorkshopHero from './components/WorkshopHero';
import Toast from './components/Toast';
import LetterSettings from './components/LetterSettings';
import EmailSettings from './components/EmailSettings';
import SingleMode from './components/SingleMode';
import BatchMode from './components/BatchMode';
import { useToast } from './hooks/useToast';
import { REASONS } from './constants';
import { delay } from './utils/delay';
import { countWords } from './utils/words';
import { parseCsvContent } from './utils/csv';
import { resolveReason } from './utils/reasonMatcher';
import { generateLetterLocal, streamText, buildPrompt } from './utils/letter';
import { loadEmailSettings, saveEmailSettings } from './utils/emailSettings';
import { openGmailCompose, downloadMailMergeCsv, downloadTxt } from './utils/email';

let nextId = 4;
const newBatchItem = (row) => ({
  id: nextId++,
  name: row.name,
  position: row.position,
  email: row.email || '',
  reason: row.reason,
  note: row.note || '',
  resume: row.resume || '',
  status: 'idle',
  result: '',
  error: '',
  emailStatus: '',
  emailError: '',
  expanded: false,
});

export default function App() {
  const { toast, showToast } = useToast();
  const [company, setCompany] = useState('先行智庫');
  const [tone, setTone] = useState('專業有禮');
  const [lang, setLang] = useState('zh');
  const [activeTab, setActiveTab] = useState('single');
  const [email, setEmail] = useState(loadEmailSettings);
  const [defaultBatchReason, setDefaultBatchReason] = useState(REASONS[0]);
  const [autoDetectReason, setAutoDetectReason] = useState(() => {
    try {
      const s = JSON.parse(localStorage.getItem('batchSettings') || '{}');
      return s.autoDetectReason !== false;
    } catch {
      return true;
    }
  });
  const [emailSendDone, setEmailSendDone] = useState(0);
  const [emailSendTotal, setEmailSendTotal] = useState(0);

  const [single, setSingle] = useState({
    name: '',
    position: '',
    email: '',
    reason: REASONS[0],
    resume: '',
    lastGeneratedResume: '',
    result: '',
    streaming: false,
    timeElapsed: 0,
    wordCount: 0,
  });

  const [batch, setBatch] = useState({
    items: [],
    csvText: '',
    fileName: '',
    isProcessing: false,
    isSendingEmail: false,
    processed: 0,
  });
  const [csvPreview, setCsvPreview] = useState([]);

  const updateEmail = useCallback((next) => {
    setEmail(next);
    saveEmailSettings(next);
  }, []);

  const letterParams = useCallback(
    (item) => ({
      name: item.name,
      position: item.position,
      reason: item.reason,
      company,
      tone,
      lang,
      resume: item.resume || '',
    }),
    [company, tone, lang]
  );

  const promptPreview = useMemo(
    () =>
      buildPrompt({
        name: single.name || '（姓名）',
        position: single.position || '（職位）',
        reason: single.reason,
        company,
        tone,
        lang,
        resume: single.resume,
      }),
    [single.name, single.position, single.reason, single.resume, company, tone, lang]
  );

  const batchDoneCount = batch.items.filter((i) => i.status === 'done').length;
  const batchErrorCount = batch.items.filter((i) => i.status === 'error').length;
  const batchTotalCount = batch.items.length;
  const progressPercent = batchTotalCount
    ? Math.round(
        (batch.items.filter((i) => i.status === 'done' || i.status === 'error').length / batchTotalCount) * 100
      )
    : 0;
  const sendableCount = batch.items.filter((i) => i.status === 'done' && i.email && i.result).length;
  const emailSendPercent = emailSendTotal ? Math.round((emailSendDone / emailSendTotal) * 100) : 0;

  const copyText = useCallback(
    (text) => {
      navigator.clipboard.writeText(text).then(
        () => showToast('已複製到剪貼簿'),
        () => showToast('複製失敗', 'error')
      );
    },
    [showToast]
  );

  const generateStream = useCallback(
    async (params, onChunk) => {
      const text = generateLetterLocal(params);
      await streamText(text, onChunk);
    },
    []
  );

  const generateSingle = async () => {
    if (!single.name?.trim() || !single.position?.trim()) {
      showToast('請填寫姓名與職位', 'error');
      return;
    }
    if (!(single.resume || '').trim()) {
      showToast('建議填寫①應徵者履歷，才能產生個人化感謝信', 'error');
    }
    const start = Date.now();
    const params = letterParams(single);
    setSingle((s) => ({ ...s, result: '', streaming: true, timeElapsed: 0, wordCount: 0 }));
    try {
      let acc = '';
      await generateStream(params, (chunk) => {
        acc += chunk;
        setSingle((prev) => ({ ...prev, result: acc }));
      });
      setSingle((s) => ({
        ...s,
        streaming: false,
        timeElapsed: ((Date.now() - start) / 1000).toFixed(1),
        wordCount: countWords(acc),
        lastGeneratedResume: s.resume || '',
      }));
    } catch (e) {
      setSingle((s) => ({ ...s, streaming: false }));
      showToast(e.message || '生成失敗', 'error');
    }
  };

  const enrichRowsWithReason = useCallback(
    (parsed) =>
      parsed.map((row) => ({
        ...row,
        reason: resolveReason(row, defaultBatchReason, autoDetectReason),
      })),
    [defaultBatchReason, autoDetectReason]
  );

  const persistBatchSettings = useCallback((nextAutoDetect) => {
    try {
      const s = JSON.parse(localStorage.getItem('batchSettings') || '{}');
      localStorage.setItem('batchSettings', JSON.stringify({ ...s, autoDetectReason: nextAutoDetect }));
    } catch {
      /* ignore */
    }
  }, []);

  const applyParsedRows = (parsed) => {
    const enriched = enrichRowsWithReason(parsed);
    setCsvPreview(enriched);
    setBatch((b) => ({ ...b, items: enriched.map(newBatchItem), processed: 0 }));
  };

  const parseCsv = () => {
    const parsed = parseCsvContent(batch.csvText, defaultBatchReason);
    if (!parsed.length) {
      showToast('無法解析名單，請確認格式：姓名,職位 或 姓名,職位,Email', 'error');
      return;
    }
    applyParsedRows(parsed);
    showToast(`已載入 ${parsed.length} 位應徵者（婉拒原因已自動填入）`);
  };

  const applyReasonToAll = () => {
    setBatch((b) => ({
      ...b,
      items: b.items.map((it) => ({
        ...it,
        reason: resolveReason(
          { note: it.note, position: it.position, reason: '' },
          defaultBatchReason,
          autoDetectReason
        ),
      })),
    }));
    setCsvPreview((prev) =>
      prev.map((row) => ({
        ...row,
        reason: resolveReason(row, defaultBatchReason, autoDetectReason),
      }))
    );
    showToast('已重新套用婉拒原因至全部名單');
  };

  const updateItemReason = (itemId, reason) => {
    setBatch((b) => ({
      ...b,
      items: b.items.map((it) => (it.id === itemId ? { ...it, reason } : it)),
    }));
  };

  const updateItemResume = (itemId, resume) => {
    setBatch((b) => ({
      ...b,
      items: b.items.map((it) => (it.id === itemId ? { ...it, resume } : it)),
    }));
  };

  const processItem = async (itemId) => {
    let item = null;
    setBatch((b) => {
      item = b.items.find((i) => i.id === itemId);
      return {
        ...b,
        items: b.items.map((it) =>
          it.id === itemId ? { ...it, status: 'processing', result: '', error: '', expanded: true } : it
        ),
      };
    });
    let acc = '';
    if (!item) return;
    const params = letterParams(item);
    try {
      await generateStream(params, (chunk) => {
        acc += chunk;
        setBatch((b) => ({
          ...b,
          items: b.items.map((it) => (it.id === itemId ? { ...it, result: acc } : it)),
        }));
      });
      setBatch((b) => ({
        ...b,
        items: b.items.map((it) => (it.id === itemId ? { ...it, status: 'done' } : it)),
      }));
    } catch (e) {
      setBatch((b) => ({
        ...b,
        items: b.items.map((it) =>
          it.id === itemId ? { ...it, status: 'error', error: e.message || '生成失敗' } : it
        ),
      }));
    }
  };

  const startBatch = async () => {
    let list = batch.items;
    if (!list.length) {
      if (!batch.csvText.trim()) {
        showToast('請先匯入 CSV 名單', 'error');
        return;
      }
      const parsed = parseCsvContent(batch.csvText, defaultBatchReason);
      if (!parsed.length) {
        showToast('無法解析名單', 'error');
        return;
      }
      const enriched = enrichRowsWithReason(parsed);
      const newItems = enriched.map(newBatchItem);
      setCsvPreview(enriched);
      setBatch((b) => ({ ...b, items: newItems, processed: 0 }));
      list = newItems;
    }

    setBatch((b) => ({ ...b, isProcessing: true, processed: 0 }));

    for (let i = 0; i < list.length; i++) {
      const item = list[i];
      if (!item.name.trim() || !item.position.trim()) continue;
      await processItem(item.id);
      setBatch((b) => ({ ...b, processed: i + 1 }));
      await delay(500);
    }

    setBatch((b) => ({ ...b, isProcessing: false }));
    showToast(`批量生成完成`);

    if (email.autoSendAfterBatch) {
      await sendBatchEmails();
    }
  };

  const sendItemEmail = async (item, silent = false) => {
    if (!item.email) {
      if (!silent) showToast('此筆沒有 Email', 'error');
      return false;
    }
    if (!item.result) {
      if (!silent) showToast('請先生成信件', 'error');
      return false;
    }
    const opened = openGmailCompose(item, email, company);
    if (!opened) {
      if (!silent) showToast('無法開啟 Gmail，請允許瀏覽器彈出視窗', 'error');
      return false;
    }
    if (item.id !== 'single') {
      setBatch((b) => ({
        ...b,
        items: b.items.map((it) =>
          it.id === item.id ? { ...it, emailStatus: 'sent', emailError: '' } : it
        ),
      }));
    }
    if (!silent) showToast(`已開啟 Gmail：${item.name}，請確認後按傳送`);
    return true;
  };

  const sendSingleEmail = () => {
    sendItemEmail(
      { name: single.name, position: single.position, email: single.email, result: single.result, id: 'single' },
      false
    );
  };

  const sendBatchEmails = async () => {
    const items = batch.items.filter((i) => i.status === 'done' && i.email && i.result);
    if (!items.length) {
      showToast('沒有可寄送項目', 'error');
      return;
    }
    if (
      !confirm(
        `將依序開啟 ${items.length} 個 Gmail 撰寫視窗，請確認內容後分別按「傳送」。\n\n請允許瀏覽器彈出視窗，是否繼續？`
      )
    )
      return;

    setBatch((b) => ({ ...b, isSendingEmail: true }));
    setEmailSendDone(0);
    setEmailSendTotal(items.length);
    let ok = 0;
    for (const item of items) {
      if (await sendItemEmail(item, true)) ok++;
      setEmailSendDone((d) => d + 1);
      await delay(800);
    }
    setBatch((b) => ({ ...b, isSendingEmail: false }));
    showToast(`Gmail 已開啟 ${ok} 封，${items.length - ok} 封失敗（可能被瀏覽器阻擋彈出視窗）`);
  };

  return (
    <div className="app-root">
      <AnimatedBackground />
      <BrandBar />
      <div className="page-main page-content">
        <WorkshopHero />
        <header className="header header-compact">
          <div>
            <h1>拒絕（感謝信）一併寄出產生器</h1>
            <p>模組② 工具實作 · 模組③ 情境演練 · 產生後審核、確認寄出</p>
          </div>
          <span className="mode-badge">工作坊實作版</span>
        </header>

        <div className="settings-row">
          <LetterSettings company={company} setCompany={setCompany} tone={tone} setTone={setTone} lang={lang} setLang={setLang} />
          <EmailSettings email={email} onChange={updateEmail} />
        </div>

        <div className="main-tabs">
          <button type="button" className={`main-tab ${activeTab === 'single' ? 'active' : ''}`} onClick={() => setActiveTab('single')}>單筆模式</button>
          <button type="button" className={`main-tab ${activeTab === 'batch' ? 'active' : ''}`} onClick={() => setActiveTab('batch')}>批量模式</button>
        </div>

        {activeTab === 'single' ? (
          <SingleMode
            single={single}
            setSingle={setSingle}
            tone={tone}
            promptPreview={promptPreview}
            onGenerate={generateSingle}
            onCopy={copyText}
            onSendEmail={sendSingleEmail}
            isSendingEmail={batch.isSendingEmail}
          />
        ) : (
          <BatchMode
            batch={batch}
            setBatch={setBatch}
            csvPreview={csvPreview}
            defaultBatchReason={defaultBatchReason}
            setDefaultBatchReason={setDefaultBatchReason}
            autoDetectReason={autoDetectReason}
            setAutoDetectReason={(v) => {
              setAutoDetectReason(v);
              persistBatchSettings(v);
            }}
            onApplyReasonToAll={applyReasonToAll}
            onItemReasonChange={updateItemReason}
            onItemResumeChange={updateItemResume}
            tone={tone}
            onParseCsv={parseCsv}
            onCsvFile={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onload = (ev) => {
                setBatch((b) => ({ ...b, csvText: ev.target.result, fileName: file.name }));
                setTimeout(parseCsv, 0);
              };
              reader.readAsText(file, 'UTF-8');
              e.target.value = '';
            }}
            onClearBatch={() => {
              if (batch.isProcessing) return;
              setBatch({ items: [], csvText: '', fileName: '', isProcessing: false, isSendingEmail: false, processed: 0 });
              setCsvPreview([]);
              showToast('已清除名單');
            }}
            onStartBatch={startBatch}
            onRetryFailed={async () => {
              const failed = batch.items.filter((i) => i.status === 'error');
              setBatch((b) => ({ ...b, isProcessing: true }));
              for (const item of failed) {
                await processItem(item.id);
                await delay(500);
              }
              setBatch((b) => ({ ...b, isProcessing: false }));
              showToast('失敗項目已重新處理');
            }}
            onCopyAll={() => {
              const sep = '\n\n' + '─'.repeat(40) + '\n\n';
              const all = batch.items.filter((i) => i.status === 'done' && i.result).map((i) => `【${i.name} / ${i.position}】\n\n${i.result}`).join(sep);
              if (!all) return showToast('尚無可複製的內容', 'error');
              copyText(all);
            }}
            onDownloadTxt={() => {
              const done = batch.items.filter((i) => i.status === 'done' && i.result);
              if (!done.length) return showToast('尚無可下載的內容', 'error');
              downloadTxt(done);
              showToast('已下載 TXT 檔案');
            }}
            onSendBatchEmails={sendBatchEmails}
            onDownloadMailMerge={() => {
              const done = batch.items.filter((i) => i.status === 'done' && i.result);
              if (!done.length) return showToast('尚無可匯出的信件', 'error');
              downloadMailMergeCsv(done, email, company);
              showToast('已下載郵件合併 CSV');
            }}
            onRetryItem={(item) => processItem(item.id)}
            onCopy={copyText}
            onSendItemEmail={(item) => sendItemEmail(item, false)}
            onToggle={(item) => {
              if (item.status === 'done' || item.status === 'error') {
                setBatch((b) => ({
                  ...b,
                  items: b.items.map((it) => (it.id === item.id ? { ...it, expanded: !it.expanded } : it)),
                }));
              }
            }}
            batchDoneCount={batchDoneCount}
            batchTotalCount={batchTotalCount}
            progressPercent={progressPercent}
            emailSendDone={emailSendDone}
            emailSendTotal={emailSendTotal}
            emailSendPercent={emailSendPercent}
            sendableCount={sendableCount}
          />
        )}
      </div>
      <Toast toast={toast} />
    </div>
  );
}
