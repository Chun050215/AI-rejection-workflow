import { useState, useCallback, useMemo, useRef } from 'react';
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
import { analyzeResumeAgainstJd } from './utils/jdMatcher';
import {
  loadBatchJdState,
  getJdText,
  hasAnyJdContent,
  collectPositions,
  mergePositionSlots,
  resolveJdKey,
} from './utils/jdStore';
import { extractTextFromResumeFile, matchResumeFileToApplicant } from './utils/resumeFileImport';
import { generateLetterLocal, streamText, buildPrompt } from './utils/letter';
import {
  loadEmailSettings,
  saveEmailSettings,
  isDirectSendReady,
  SEND_METHODS,
} from './utils/emailSettings';
import { downloadMailMergeCsv, downloadTxt, openGmailCompose } from './utils/email';
import { sendEmail, sendTestEmail, sendBatchViaGmailApi } from './utils/emailSend';

let nextId = 4;
const newBatchItem = (row) => ({
  id: nextId++,
  name: row.name,
  position: row.position,
  email: row.email || '',
  reason: row.reason,
  reasonDetail: row.reasonDetail || '',
  resumeFileName: row.resumeFileName || '',
  jdMatch: null,
  jdKey: row.jdKey || '',
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
    reasonDetail: '',
    resume: '',
    lastGeneratedResume: '',
    result: '',
    streaming: false,
    timeElapsed: 0,
    wordCount: 0,
  });

  const initialJd = loadBatchJdState();

  const [batch, setBatch] = useState({
    items: [],
    csvText: '',
    fileName: '',
    jobDescriptions: initialJd.jobDescriptions,
    activeJdPosition: initialJd.activeJdPosition,
    isProcessing: false,
    isSendingEmail: false,
    processed: 0,
  });
  const [csvPreview, setCsvPreview] = useState([]);
  /** 與 batch.items 同步，批量生成迴圈內立即可讀寫（避免 setState 尚未 commit） */
  const batchItemsRef = useRef([]);

  const setBatchItems = useCallback((nextItems) => {
    batchItemsRef.current = nextItems;
    setBatch((b) => ({ ...b, items: nextItems }));
  }, []);

  /** ref 為 [] 時仍用 batch.items（避免 ?? 把空陣列當成有效來源） */
  const getActiveBatchItems = useCallback(() => {
    const fromRef = batchItemsRef.current;
    return fromRef.length > 0 ? fromRef : batch.items;
  }, [batch.items]);

  const patchBatchItem = useCallback((itemId, patch) => {
    setBatch((b) => {
      const base = batchItemsRef.current.length ? batchItemsRef.current : b.items;
      if (!base.some((it) => it.id === itemId)) {
        return b;
      }
      const next = base.map((it) => (it.id === itemId ? { ...it, ...patch } : it));
      batchItemsRef.current = next;
      return { ...b, items: next };
    });
  }, []);

  const updateEmail = useCallback(
    (next) => {
      const wasReady = isDirectSendReady(email);
      const nowReady = isDirectSendReady(next);

      if (next.autoSendAfterBatch && !nowReady) {
        showToast('請先連結 Gmail API，才能開啟自動寄出', 'error');
        next = { ...next, autoSendAfterBatch: false };
      }

      if (nowReady && !wasReady && (next.sendMethod || SEND_METHODS.gmail) !== SEND_METHODS.gmail) {
        next = { ...next, autoSendAfterBatch: true };
        showToast('自動寄信已就緒，已開啟「批量完成後自動寄出」');
      }

      setEmail(next);
      saveEmailSettings(next);
    },
    [email, showToast]
  );

  const letterParams = useCallback(
    (item) => ({
      name: item.name,
      position: item.position,
      reason: item.reason?.trim() || defaultBatchReason,
      reasonDetail: (item.reasonDetail || '').trim(),
      company,
      tone,
      lang,
      resume: item.resume || '',
    }),
    [company, tone, lang, defaultBatchReason]
  );

  const promptPreview = useMemo(
    () =>
      buildPrompt({
        name: single.name || '（姓名）',
        position: single.position || '（職位）',
        reason: single.reason,
        reasonDetail: single.reasonDetail,
        company,
        tone,
        lang,
        resume: single.resume,
      }),
    [single.name, single.position, single.reason, single.reasonDetail, single.resume, company, tone, lang]
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
      showToast('請先上傳履歷檔（①），系統才能產生個人化感謝信', 'error');
      return;
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
        reasonDetail: (row.reasonDetail || '').trim(),
        reason: resolveReason(row, defaultBatchReason, autoDetectReason),
      })),
    [defaultBatchReason, autoDetectReason]
  );

  const persistBatchSettings = useCallback((patch) => {
    try {
      const s = JSON.parse(localStorage.getItem('batchSettings') || '{}');
      localStorage.setItem('batchSettings', JSON.stringify({ ...s, ...patch }));
    } catch {
      /* ignore */
    }
  }, []);

  const applyJdAnalysisToItem = useCallback((item, jobDescriptions) => {
    const jd = getJdText(jobDescriptions, item.position, item.jdKey);
    if (!jd || !item.resume?.trim()) return item;
    const analysis = analyzeResumeAgainstJd(item.resume, jd, item.position);
    const jdKey = resolveJdKey(item.position, jobDescriptions, item.jdKey);
    return {
      ...item,
      jdKey,
      reason: analysis.suggestedReason || item.reason,
      reasonDetail: analysis.reasonDetail,
      jdMatch: analysis.matchSummary,
      expanded: true,
    };
  }, []);

  const autoAnalyzeItemsWithJd = useCallback(
    (items, jobDescriptions) => {
      if (!hasAnyJdContent(jobDescriptions)) return items;
      return items.map((it) => (it.resume?.trim() ? applyJdAnalysisToItem(it, jobDescriptions) : it));
    },
    [applyJdAnalysisToItem]
  );

  const reanalyzeItemsForPosition = useCallback(
    (position, jobDescriptions) => {
      const pk = (position || '').trim();
      if (!pk || !hasAnyJdContent(jobDescriptions)) return;
      const source = getActiveBatchItems();
      const next = source.map((it) => {
        if (!it.resume?.trim()) return it;
        const key = resolveJdKey(it.position, jobDescriptions, it.jdKey);
        if (key !== pk) return it;
        return applyJdAnalysisToItem(it, jobDescriptions);
      });
      setBatchItems(next);
    },
    [getActiveBatchItems, applyJdAnalysisToItem, setBatchItems]
  );

  const importPositionsToJdSlots = useCallback(
    (positions) => {
      const list = collectPositions(positions);
      if (!list.length) {
        showToast('名單中沒有職位欄位', 'error');
        return;
      }
      setBatch((b) => {
        const jobDescriptions = mergePositionSlots(b.jobDescriptions, list);
        persistBatchSettings({ jobDescriptions });
        const activeJdPosition = b.activeJdPosition || list[0];
        return { ...b, jobDescriptions, activeJdPosition };
      });
      showToast(`已帶入 ${list.length} 個職位 JD 槽位`, 'success');
    },
    [persistBatchSettings, showToast]
  );

  const setActiveJdPosition = useCallback(
    (position) => {
      setBatch((b) => ({ ...b, activeJdPosition: position }));
      persistBatchSettings({ activeJdPosition: position });
    },
    [persistBatchSettings]
  );

  const setJdTextForPosition = useCallback(
    (position, text) => {
      if (!position) return;
      setBatch((b) => {
        const jobDescriptions = { ...b.jobDescriptions, [position]: text };
        persistBatchSettings({ jobDescriptions });
        return { ...b, jobDescriptions, activeJdPosition: position };
      });
      reanalyzeItemsForPosition(position, {
        ...batch.jobDescriptions,
        [position]: text,
      });
      setSingle((s) => {
        if (!s.resume?.trim()) return s;
        const key = resolveJdKey(s.position, { ...batch.jobDescriptions, [position]: text }, s.jdKey);
        if (key !== position && (s.position || '').trim() !== position) return s;
        const jd = text.trim();
        if (!jd) return s;
        const analysis = analyzeResumeAgainstJd(s.resume, jd, s.position);
        return {
          ...s,
          reason: analysis.suggestedReason || s.reason,
          reasonDetail: analysis.reasonDetail,
          jdMatch: analysis.matchSummary,
        };
      });
    },
    [persistBatchSettings, reanalyzeItemsForPosition, batch.jobDescriptions]
  );

  const analyzeJdForAll = useCallback(() => {
    if (!hasAnyJdContent(batch.jobDescriptions)) {
      showToast('請先為至少一個職位貼上 JD', 'error');
      return;
    }
    const source = getActiveBatchItems();
    if (!source.length) {
      showToast('請先匯入應徵者名單', 'error');
      return;
    }
    let matched = 0;
    let skipped = 0;
    const next = source.map((it) => {
      if (!it.resume?.trim()) return it;
      const jd = getJdText(batch.jobDescriptions, it.position, it.jdKey);
      if (!jd) {
        skipped++;
        return it;
      }
      matched++;
      return applyJdAnalysisToItem(it, batch.jobDescriptions);
    });
    setBatchItems(next);
    const msg =
      matched > 0
        ? `已比對 ${matched} 位履歷`
        : '名單中沒有履歷，請先上傳履歷檔';
    showToast(skipped > 0 ? `${msg}（${skipped} 位找不到對應職位 JD）` : msg, matched > 0 ? 'success' : 'error');
  }, [batch.jobDescriptions, getActiveBatchItems, applyJdAnalysisToItem, setBatchItems, showToast]);

  const updateItemJdKey = useCallback(
    (itemId, jdKey) => {
      const item = getActiveBatchItems().find((it) => it.id === itemId);
      if (!item) return;
      const updated = applyJdAnalysisToItem({ ...item, jdKey }, batch.jobDescriptions);
      patchBatchItem(itemId, {
        jdKey: updated.jdKey || jdKey,
        reason: updated.reason,
        reasonDetail: updated.reasonDetail,
        jdMatch: updated.jdMatch,
      });
      if (item.resume?.trim() && getJdText(batch.jobDescriptions, item.position, jdKey)) {
        showToast(`已改用「${jdKey}」的 JD 比對`, 'success');
      }
    },
    [batch.jobDescriptions, getActiveBatchItems, applyJdAnalysisToItem, patchBatchItem, showToast]
  );

  const applyParsedRows = (parsed) => {
    const enriched = enrichRowsWithReason(parsed);
    let items = enriched.map((row) =>
      newBatchItem({ ...row, reason: row.reason || defaultBatchReason })
    );
    const jobDescriptions = mergePositionSlots(
      batch.jobDescriptions,
      collectPositions(enriched)
    );
    items = autoAnalyzeItemsWithJd(items, jobDescriptions);
    setCsvPreview(enriched);
    setBatchItems(items);
    setBatch((b) => ({
      ...b,
      processed: 0,
      jobDescriptions,
      activeJdPosition: b.activeJdPosition || collectPositions(enriched)[0] || '',
    }));
    persistBatchSettings({ jobDescriptions });
    return items;
  };

  const handleResumeFilesUpload = useCallback(
    async (fileList) => {
      const files = Array.from(fileList || []);
      if (!files.length) return;

      let items = getActiveBatchItems();
      if (!items.length) {
        showToast('請先匯入應徵者名單（姓名、職位）', 'error');
        return;
      }

      let attached = 0;
      let analyzed = 0;
      let noJd = 0;
      const unmatched = [];
      const next = items.map((it) => ({ ...it }));

      for (const file of files) {
        try {
          const text = await extractTextFromResumeFile(file);
          if (!text || text.length < 20) {
            unmatched.push(`${file.name}（內容過少）`);
            continue;
          }
          const idx = matchResumeFileToApplicant(file.name, next);
          if (idx < 0) {
            unmatched.push(file.name);
            continue;
          }
          const base = { ...next[idx], resume: text, resumeFileName: file.name };
          const jd = getJdText(batch.jobDescriptions, base.position, base.jdKey);
          if (jd) {
            next[idx] = applyJdAnalysisToItem(base, batch.jobDescriptions);
            analyzed++;
          } else {
            next[idx] = base;
            noJd++;
          }
          attached++;
        } catch (e) {
          unmatched.push(`${file.name}（${e.message || '讀取失敗'}）`);
        }
      }

      setBatchItems(next);
      if (attached > 0) {
        const extra =
          noJd > 0 ? `（${noJd} 份找不到對應職位 JD，僅載入履歷）` : '';
        showToast(
          analyzed > 0
            ? `已上傳 ${attached} 份，其中 ${analyzed} 份已完成 JD 比對${extra}`
            : `已上傳 ${attached} 份履歷${extra}`,
          'success'
        );
      }
      if (unmatched.length) {
        showToast(`無法對應名單：${unmatched.slice(0, 3).join('、')}${unmatched.length > 3 ? '…' : ''}`, 'error');
      }
      if (!attached && !unmatched.length) {
        showToast('未選擇檔案', 'error');
      }
    },
    [batch.jobDescriptions, getActiveBatchItems, applyJdAnalysisToItem, setBatchItems, showToast]
  );

  const handleSingleResumeFile = useCallback(
    async (file) => {
      const jd = getJdText(batch.jobDescriptions, single.position, single.jdKey);
      try {
        const text = await extractTextFromResumeFile(file);
        if (!text || text.length < 20) {
          showToast('履歷內容過少，請確認檔案', 'error');
          return;
        }
        if (!single.position?.trim()) {
          showToast('請先填寫應徵職位', 'error');
          return;
        }
        const jobDescriptions = mergePositionSlots(batch.jobDescriptions, [single.position]);
        setBatch((b) => ({ ...b, jobDescriptions }));
        if (!jd) {
          setSingle((s) => ({
            ...s,
            resume: text,
            resumeFileName: file.name,
            result: '',
            lastGeneratedResume: '',
          }));
          showToast(`已載入履歷（請為「${single.position}」貼上 JD 後再比對）`, 'success');
          return;
        }
        const analysis = analyzeResumeAgainstJd(text, jd, single.position);
        setSingle((s) => ({
          ...s,
          resume: text,
          resumeFileName: file.name,
          reason: analysis.suggestedReason || s.reason,
          reasonDetail: analysis.reasonDetail,
          jdMatch: analysis.matchSummary,
          result: '',
          lastGeneratedResume: '',
        }));
        showToast(`已載入履歷並比對「${resolveJdKey(single.position, jobDescriptions)}」JD`, 'success');
      } catch (e) {
        showToast(e.message || '履歷讀取失敗', 'error');
      }
    },
    [batch.jobDescriptions, single.position, single.jdKey, showToast]
  );

  const handleItemResumeFile = useCallback(
    async (itemId, file) => {
      if (!file) return;
      try {
        const text = await extractTextFromResumeFile(file);
        const item = getActiveBatchItems().find((it) => it.id === itemId);
        if (!item) return;
        const base = { ...item, resume: text, resumeFileName: file.name };
        const jd = getJdText(batch.jobDescriptions, base.position, base.jdKey);
        const updated = jd ? applyJdAnalysisToItem(base, batch.jobDescriptions) : base;
        patchBatchItem(itemId, {
          resume: updated.resume,
          resumeFileName: updated.resumeFileName,
          reason: updated.reason,
          reasonDetail: updated.reasonDetail,
          jdMatch: updated.jdMatch,
          jdKey: updated.jdKey,
          expanded: true,
        });
        if (jd) {
          showToast(`已載入並比對「${resolveJdKey(item.position, batch.jobDescriptions, item.jdKey)}」JD`, 'success');
        } else {
          showToast(`已載入履歷（請為「${item.position}」設定 JD）`, 'success');
        }
      } catch (e) {
        showToast(e.message || '履歷讀取失敗', 'error');
      }
    },
    [batch.jobDescriptions, getActiveBatchItems, applyJdAnalysisToItem, patchBatchItem, showToast]
  );

  const parseCsv = () => {
    const parsed = parseCsvContent(batch.csvText, defaultBatchReason);
    if (!parsed.length) {
      showToast('無法解析名單，請確認格式：姓名,職位 或 姓名,職位,Email', 'error');
      return [];
    }
    const items = applyParsedRows(parsed);
    const positions = collectPositions(parsed);
    showToast(
      positions.length
        ? `已載入 ${parsed.length} 位、${positions.length} 個職位。請在左側為各職位貼上 JD`
        : `已載入 ${parsed.length} 位。可開始批量生成（上傳履歷比對需先設定職位 JD）`
    );
    return items;
  };

  const parseCsvAndGenerate = async () => {
    const items = parseCsv();
    if (!items.length) return;
    await runBatchGeneration(items);
  };

  const applyReasonToAll = () => {
    const next = batchItemsRef.current.map((it) => ({
      ...it,
      reason: resolveReason(
        { note: it.note, position: it.position, reason: '' },
        defaultBatchReason,
        autoDetectReason
      ),
    }));
    setBatchItems(next);
    setCsvPreview((prev) =>
      prev.map((row) => ({
        ...row,
        reason: resolveReason(row, defaultBatchReason, autoDetectReason),
      }))
    );
    showToast('已重新套用婉拒原因至全部名單');
  };

  const updateItemReason = (itemId, reason) => {
    patchBatchItem(itemId, { reason });
  };

  const updateItemResume = (itemId, resume) => {
    patchBatchItem(itemId, { resume });
  };

  const processItem = async (item) => {
    const reason = item.reason?.trim() || defaultBatchReason;
    const reasonDetail = (item.reasonDetail || '').trim();
    const payload = { ...item, reason, reasonDetail };

    if (!payload.name?.trim() || !payload.position?.trim()) {
      patchBatchItem(payload.id, { status: 'error', error: '缺少姓名或職位', expanded: true });
      return null;
    }

    const itemId = payload.id;
    patchBatchItem(itemId, { status: 'processing', error: '', expanded: true });
    const params = letterParams(payload);
    try {
      const text = generateLetterLocal(params);
      if (!text?.trim()) {
        throw new Error('信件內容為空');
      }
      // 一次更新為完成，避免「生成中」狀態卡住
      patchBatchItem(itemId, {
        status: 'done',
        result: text,
        error: '',
        expanded: true,
        reason,
        reasonDetail,
      });
      return { ...payload, status: 'done', result: text };
    } catch (e) {
      const errMsg = e.message || '生成失敗';
      patchBatchItem(itemId, { status: 'error', error: errMsg });
      return null;
    }
  };

  const runBatchGeneration = async (listOverride) => {
    let list = listOverride ?? getActiveBatchItems();

    if (!list.length && batch.csvText.trim()) {
      const parsed = parseCsvContent(batch.csvText, defaultBatchReason);
      if (parsed.length) {
        list = applyParsedRows(parsed);
      }
    }

    if (!list.length) {
      showToast('請先匯入名單（貼上 CSV 或選擇檔案）', 'error');
      return;
    }

    batchItemsRef.current = [...list];
    setBatch((b) => ({ ...b, isProcessing: true, processed: 0, items: [...list] }));

    const generated = [];
    try {
      for (let i = 0; i < list.length; i++) {
        setBatch((b) => ({ ...b, processed: i }));
        const latest = batchItemsRef.current.find((it) => it.id === list[i].id) || list[i];
        const done = await processItem(latest);
        if (done) generated.push(done);
        setBatch((b) => ({ ...b, processed: i + 1 }));
        await delay(80);
      }
    } finally {
      setBatch((b) => ({ ...b, isProcessing: false }));
    }

    if (!generated.length) {
      showToast('沒有成功生成，請檢查姓名、職位欄位是否正確', 'error');
      return;
    }

    showToast(`感謝信已生成 ${generated.length} / ${list.length} 封，請在右側過目`);

    if (email.autoSendAfterBatch) {
      if (!isDirectSendReady(email)) {
        showToast('已生成完成。請在寄信設定連結 Gmail API 後才能自動寄出', 'error');
        return;
      }
      const sendable = generated.filter((i) => i.email?.trim() && i.result);
      if (sendable.length) {
        showToast(`即將自動寄出 ${sendable.length} 封，請確認內容`);
        await sendBatchEmails(sendable);
      } else {
        showToast('已生成完成。CSV 需含 Email 欄才能自動寄送', 'error');
      }
    }
  };

  const startBatch = () => runBatchGeneration();

  const directSendEnabled = isDirectSendReady(email);
  const useGmailCompose = (email.sendMethod || SEND_METHODS.gmail) === SEND_METHODS.gmail;
  const useGmailApi = (email.sendMethod || SEND_METHODS.gmail) === SEND_METHODS.gmailApi;

  const sendItemEmail = async (item, silent = false) => {
    if (!item.email) {
      if (!silent) showToast('此筆沒有 Email', 'error');
      return false;
    }
    if (!item.result) {
      if (!silent) showToast('請先生成信件', 'error');
      return false;
    }

    const needConfirm = !useGmailCompose;
    if (
      needConfirm &&
      !silent &&
      !confirm(`確定寄送給 ${item.name}（${item.email}）？\n\n請確認您已在 App 內過目信件內容。`)
    ) {
      return false;
    }

    if (useGmailCompose && !silent && !confirm(`開啟 Gmail 寄給 ${item.name}？\n\n請在 Gmail 按「傳送」。`)) {
      return false;
    }

    try {
      const outcome = await sendEmail(item, email, company);
      if (item.id !== 'single') {
        patchBatchItem(item.id, { emailStatus: 'sent', emailError: '' });
      }
      if (!silent) {
        showToast(
          outcome.mode === 'gmail' ? `已開啟 Gmail：${item.name}，請按傳送` : `已寄出：${item.name}`
        );
      }
      return true;
    } catch (e) {
      const errMsg = e.message || '寄信失敗';
      if (item.id !== 'single') {
        patchBatchItem(item.id, { emailStatus: 'failed', emailError: errMsg });
      }
      if (!silent) showToast(errMsg, 'error');
      return false;
    }
  };

  const sendSingleEmail = () => {
    sendItemEmail(
      { name: single.name, position: single.position, email: single.email, result: single.result, id: 'single' },
      false
    );
  };

  const sendBatchEmails = async (itemsOverride) => {
    const fromExplicitList = Array.isArray(itemsOverride);
    const source = fromExplicitList ? itemsOverride : getActiveBatchItems();
    const items = source.filter((i) => {
      const ready = fromExplicitList ? i.result : i.status === 'done' && i.result;
      return ready && i.email?.trim();
    });
    if (!items.length) {
      const doneNoEmail = source.filter((i) => i.status === 'done' && i.result && !i.email?.trim()).length;
      if (doneNoEmail > 0) {
        showToast(`已有 ${doneNoEmail} 封生成完成，但 CSV 無 Email，無法寄送`, 'error');
      } else {
        showToast('請先按「開始批量生成」完成信件，且 CSV 需含 Email 欄', 'error');
      }
      return;
    }

    if (useGmailCompose) {
      if (
        !confirm(
          `將一次開啟 ${items.length} 個 Gmail 撰寫視窗，請在每個視窗按「傳送」。\n\n請在瀏覽器允許此網站的「彈出式視窗」，是否繼續？`
        )
      ) {
        return;
      }

      setBatch((b) => ({ ...b, isSendingEmail: true }));
      setEmailSendDone(0);
      setEmailSendTotal(items.length);

      let ok = 0;
      // 必須在單次點擊內同步開啟所有視窗；await 之後瀏覽器會擋後續 popup
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const opened = openGmailCompose(item, email, company);
        if (opened) {
          ok++;
          patchBatchItem(item.id, { emailStatus: 'sent', emailError: '' });
        } else {
          patchBatchItem(item.id, {
            emailStatus: 'failed',
            emailError: '無法開啟 Gmail（請允許彈出式視窗）',
          });
        }
        setEmailSendDone(i + 1);
      }

      setBatch((b) => ({ ...b, isSendingEmail: false }));
      if (ok === items.length) {
        showToast(`已開啟 ${ok} 個 Gmail 視窗，請在各視窗按傳送`);
      } else if (ok > 0) {
        showToast(
          `已開啟 ${ok} / ${items.length} 個視窗。其餘被瀏覽器擋下，請允許彈出視窗後對失敗項目按「Gmail」重試`,
          'error'
        );
      } else {
        showToast('無法開啟 Gmail。請在網址列允許此網站彈出式視窗後再試', 'error');
      }
      return;
    }

    if (useGmailApi) {
      if (
        !confirm(
          `將透過 Gmail API 批次寄出 ${items.length} 封（每批最多 100 封）。\n\n請確認每封信已在 App 內過目。`
        )
      ) {
        return;
      }

      setBatch((b) => ({ ...b, isSendingEmail: true }));
      setEmailSendDone(0);
      setEmailSendTotal(items.length);

      try {
        const results = await sendBatchViaGmailApi(items, email, company, (done) => {
          setEmailSendDone(done);
        });
        let ok = 0;
        for (const r of results) {
          if (r.ok) {
            ok++;
            patchBatchItem(r.itemId, { emailStatus: 'sent', emailError: '' });
          } else {
            patchBatchItem(r.itemId, {
              emailStatus: 'failed',
              emailError: r.error || 'Gmail API 寄信失敗',
            });
          }
        }
        showToast(
          ok === items.length
            ? `Gmail API 批次寄送完成：${ok} 封`
            : `Gmail API 寄送：${ok} 成功，${items.length - ok} 失敗`,
          ok === items.length ? 'success' : 'error'
        );
      } catch (e) {
        showToast(e.message || 'Gmail API 批次寄信失敗', 'error');
      } finally {
        setBatch((b) => ({ ...b, isSendingEmail: false }));
      }
      return;
    }

    if (!confirm(`確定自動寄送 ${items.length} 封？\n\n請確認每封信已在 App 內過目。`)) {
      return;
    }

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
    showToast(`寄送完成：${ok} 成功，${items.length - ok} 失敗`);
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
          <EmailSettings
            email={email}
            onChange={updateEmail}
            onNotify={showToast}
            onTestSend={async () => {
              try {
                const r = await sendTestEmail(email, company);
                showToast(
                  r.mode === 'gmail'
                    ? '已開啟 Gmail 測試信，請按傳送'
                    : `測試信已寄至 ${email.gmail}`
                );
              } catch (e) {
                showToast(e.message || '測試寄信失敗', 'error');
              }
            }}
          />
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
            directSendEnabled={directSendEnabled}
            jobDescriptions={batch.jobDescriptions}
            activeJdPosition={batch.activeJdPosition || single.position}
            onActiveJdPositionChange={setActiveJdPosition}
            onJdTextChange={setJdTextForPosition}
            onImportPositionsFromList={() =>
              importPositionsToJdSlots(single.position ? [single.position] : [])
            }
            onEnsurePositionSlot={(position) => {
              const p = (position || '').trim();
              if (!p) return;
              setBatch((b) => {
                const jobDescriptions = mergePositionSlots(b.jobDescriptions, [p]);
                persistBatchSettings({ jobDescriptions });
                return { ...b, jobDescriptions, activeJdPosition: p };
              });
            }}
            onResumeFile={handleSingleResumeFile}
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
              persistBatchSettings({ autoDetectReason: v });
            }}
            jobDescriptions={batch.jobDescriptions}
            activeJdPosition={batch.activeJdPosition}
            onActiveJdPositionChange={setActiveJdPosition}
            onJdTextChange={setJdTextForPosition}
            onImportPositionsFromList={() => importPositionsToJdSlots(getActiveBatchItems())}
            onAnalyzeJdForAll={analyzeJdForAll}
            onApplyReasonToAll={applyReasonToAll}
            onItemReasonChange={updateItemReason}
            onItemJdKeyChange={updateItemJdKey}
            onResumeFilesUpload={handleResumeFilesUpload}
            onItemResumeFile={handleItemResumeFile}
            tone={tone}
            onParseCsv={parseCsv}
            onParseCsvAndGenerate={parseCsvAndGenerate}
            onCsvFile={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              try {
                const { importSpreadsheetFile, applicantsToCsvPreview } = await import(
                  './utils/spreadsheetImport.js'
                );
                const parsed = await importSpreadsheetFile(file, defaultBatchReason);
                if (!parsed.length) {
                  showToast('無法解析名單，請確認第一列為姓名、職位（或含標題列）', 'error');
                  return;
                }
                const previewText =
                  /\.(csv|txt|tsv)$/i.test(file.name) ? await file.text() : applicantsToCsvPreview(parsed);
                setBatch((b) => ({ ...b, csvText: previewText, fileName: file.name }));
                applyParsedRows(parsed);
                showToast(`已載入 ${parsed.length} 位（${file.name}）。請按「開始批量生成」`);
              } catch (err) {
                showToast(err.message || '檔案讀取失敗', 'error');
              }
              e.target.value = '';
            }}
            onClearBatch={() => {
              if (batch.isProcessing) return;
              batchItemsRef.current = [];
              setBatch({ items: [], csvText: '', fileName: '', isProcessing: false, isSendingEmail: false, processed: 0 });
              setCsvPreview([]);
              showToast('已清除名單');
            }}
            onStartBatch={startBatch}
            onRetryFailed={async () => {
              const failed = batch.items.filter((i) => i.status === 'error');
              setBatch((b) => ({ ...b, isProcessing: true }));
              for (const item of failed) {
                await processItem(item);
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
            onRetryItem={(item) => processItem(item)}
            onCopy={copyText}
            onSendItemEmail={(item) => sendItemEmail(item, false)}
            onToggle={(item) => {
              if (item.status === 'done' || item.status === 'error' || item.status === 'processing') {
                patchBatchItem(item.id, { expanded: !item.expanded });
              }
            }}
            batchDoneCount={batchDoneCount}
            batchTotalCount={batchTotalCount}
            progressPercent={progressPercent}
            emailSendDone={emailSendDone}
            emailSendTotal={emailSendTotal}
            emailSendPercent={emailSendPercent}
            sendableCount={sendableCount}
            directSendEnabled={directSendEnabled}
          />
        )}
      </div>
      <Toast toast={toast} />
    </div>
  );
}
