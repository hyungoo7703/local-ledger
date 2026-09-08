import React, { useState } from 'react';
import { AppState } from '../types';
import { Copy, Download, Upload, RotateCcw, ShieldCheck, Check, Smartphone, History, Trash2, Sparkles, Eye, EyeOff, Loader2, AlertTriangle } from 'lucide-react';
import {
  AiConfig,
  DEFAULT_AI_MODEL,
  KNOWN_MODELS,
  KeyTestResult,
  loadAiConfig,
  saveAiConfig,
  clearAiConfig,
  hasApiKey,
  maskApiKey,
  testApiKey
} from '../utils/ai';
import {
  exportBackupJson,
  parseBackupJson,
  applyImportedState,
  summarizeState,
  listSnapshots,
  readSnapshot,
  deleteSnapshot,
  resetToDefault,
  StateSnapshot
} from '../utils/storage';

interface BackupSettingsProps {
  appState: AppState;
  onStateChange: (newState: AppState) => void;
}

export const BackupSettingsModal: React.FC<BackupSettingsProps> = ({
  appState,
  onStateChange
}) => {
  const [copySuccess, setCopySuccess] = useState(false);
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState('');
  const [importSuccess, setImportSuccess] = useState(false);
  const [snapshots, setSnapshots] = useState<StateSnapshot[]>(() => listSnapshots());

  // AI 설정
  const [aiConfig, setAiConfig] = useState<AiConfig>(() => loadAiConfig());
  const [keyDraft, setKeyDraft] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<KeyTestResult | null>(null);

  const savedKey = hasApiKey(aiConfig);

  const handleSaveKey = () => {
    const apiKey = keyDraft.trim();
    if (!apiKey) return;
    const next = { ...aiConfig, apiKey };
    if (!saveAiConfig(next)) {
      setTestResult({ ok: false, message: '설정을 저장하지 못했습니다. 저장 공간을 확인해 주세요.' });
      return;
    }
    setAiConfig(next);
    setKeyDraft('');
    setShowKey(false);
    setTestResult(null);
  };

  const handleModelChange = (model: string) => {
    const next = { ...aiConfig, model };
    setAiConfig(next);
    if (savedKey) saveAiConfig(next);
    setTestResult(null);
  };

  const handleTestKey = async () => {
    setIsTesting(true);
    setTestResult(null);
    const result = await testApiKey({ ...aiConfig, apiKey: keyDraft.trim() || aiConfig.apiKey });
    setTestResult(result);
    setIsTesting(false);
  };

  const handleDeleteKey = () => {
    if (!window.confirm('저장된 API 키를 삭제할까요? 가계부 데이터는 그대로 유지됩니다.')) return;
    clearAiConfig();
    setAiConfig({ apiKey: '', model: aiConfig.model });
    setKeyDraft('');
    setTestResult(null);
  };

  // Copy to clipboard
  const handleCopy = async () => {
    try {
      const json = exportBackupJson(appState);
      await navigator.clipboard.writeText(json);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch {
      alert('클립보드 복사에 실패했습니다.');
    }
  };

  // Download JSON file
  const handleDownload = () => {
    const json = exportBackupJson(appState);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const today = new Date().toISOString().split('T')[0];
    a.href = url;
    a.download = `local-ledger-backup-${today}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // 검증 -> 내용 확인 -> 적용. 확인 전에는 기존 데이터를 건드리지 않는다.
  const runImport = (jsonStr: string, onDone?: () => void) => {
    let parsed: ReturnType<typeof parseBackupJson>;
    try {
      parsed = parseBackupJson(jsonStr);
    } catch (err: any) {
      setImportError(err.message || '유효하지 않은 백업 데이터입니다.');
      setImportSuccess(false);
      return;
    }

    const now = summarizeState(appState);
    const { summary } = parsed;
    const exportedLabel = summary.exportedAt
      ? `\n백업 시점: ${new Date(summary.exportedAt).toLocaleString('ko-KR')}`
      : '';

    const proceed = window.confirm(
      `[가져올 데이터]${exportedLabel}\n` +
        `· 플랜 ${summary.dealCount}건\n` +
        `· 차감 항목 ${summary.deductionCount}건 / 체크리스트 ${summary.checklistCount}건\n` +
        `· 월급 ${summary.baseSalaryManwon}만원\n\n` +
        `[현재 데이터]\n` +
        `· 플랜 ${now.dealCount}건 / 차감 ${now.deductionCount}건 / 월급 ${now.baseSalaryManwon}만원\n\n` +
        `현재 데이터는 위 내용으로 모두 교체됩니다.\n` +
        `교체 직전 상태는 자동으로 백업되어 아래 '되돌리기'에서 복구할 수 있습니다.\n\n` +
        `계속할까요?`
    );
    if (!proceed) return;

    try {
      applyImportedState(parsed.state);
    } catch (err: any) {
      setImportError(err.message || '복원에 실패했습니다.');
      setImportSuccess(false);
      return;
    }

    onStateChange(parsed.state);
    setSnapshots(listSnapshots());
    setImportError('');
    setImportSuccess(true);
    onDone?.();
    setTimeout(() => setImportSuccess(false), 3000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const input = e.target;

    const reader = new FileReader();
    reader.onload = (event) => {
      runImport(String(event.target?.result ?? ''));
      input.value = ''; // 같은 파일을 다시 선택할 수 있도록 초기화
    };
    reader.onerror = () => {
      setImportError('파일을 읽지 못했습니다.');
      input.value = '';
    };
    reader.readAsText(file);
  };

  const handleTextImport = () => {
    if (!importText.trim()) return;
    runImport(importText, () => setImportText(''));
  };

  // 교체 직전 상태 및 손상 데이터 복구
  const handleDownloadSnapshot = (snap: StateSnapshot) => {
    const raw = readSnapshot(snap.key);
    if (!raw) {
      setImportError('백업을 읽지 못했습니다.');
      return;
    }
    const blob = new Blob([raw], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `local-ledger-${snap.kind}-${new Date(snap.savedAt).toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleRestoreSnapshot = (snap: StateSnapshot) => {
    const raw = readSnapshot(snap.key);
    if (!raw) {
      setImportError('백업을 읽지 못했습니다.');
      return;
    }
    runImport(raw);
  };

  const handleDeleteSnapshot = (snap: StateSnapshot) => {
    if (!window.confirm('이 백업을 삭제할까요? 되돌릴 수 없습니다.')) return;
    deleteSnapshot(snap.key);
    setSnapshots(listSnapshots());
  };

  // Complete Reset
  const handleReset = () => {
    if (window.confirm('정말로 모든 데이터(소비 플랜, 월급 및 차감 룰, 고정 체크리스트)를 완전히 초기화하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      const reset = resetToDefault();
      onStateChange(reset);
      setSnapshots(listSnapshots());
      alert('모든 데이터가 초기화되었습니다. 직전 상태는 아래 \'되돌리기\'에서 복구할 수 있습니다.');
    }
  };

  return (
    <div className="space-y-4 pb-12">
      {/* Privacy & Storage Info */}
      <div className="bg-slate-900/80 rounded-2xl p-4 border border-slate-800 space-y-2">
        <div className="flex items-center gap-2 text-indigo-400">
          <ShieldCheck className="w-5 h-5" />
          <h3 className="text-sm font-bold text-white">데이터 보안 & 저장소 안내</h3>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">
          이 앱은 별도의 서버나 데이터베이스를 사용하지 않으며, 모든 가계부 기록과 월급 설정은
          오직 <strong className="text-white">내 기기 브라우저(LocalStorage)</strong>에만 안전하게 보관됩니다.
        </p>
        <p className="text-[11px] text-amber-400/90">
          ⚠️ 기기 변경이나 브라우저 쿠키/캐시 정리 시 데이터가 지워질 수 있으니, 중요한 내역은 아래
          백업 버튼을 통해 주기적으로 복사해 두세요!
        </p>
      </div>

      {/* Backup Actions */}
      <div className="bg-slate-900/80 rounded-2xl p-4 border border-slate-800 space-y-3">
        <h4 className="text-xs font-bold text-slate-300">내 데이터 백업 (내보내기)</h4>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white border border-slate-700 transition active:scale-95"
          >
            {copySuccess ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-400">복사 완료!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-indigo-400" />
                <span>클립보드 복사</span>
              </>
            )}
          </button>

          <button
            onClick={handleDownload}
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white border border-slate-700 transition active:scale-95"
          >
            <Download className="w-4 h-4 text-pink-400" />
            <span>JSON 파일 저장</span>
          </button>
        </div>
      </div>

      {/* Restore Actions */}
      <div className="bg-slate-900/80 rounded-2xl p-4 border border-slate-800 space-y-3">
        <h4 className="text-xs font-bold text-slate-300">데이터 복원 (가져오기)</h4>

        {importSuccess && (
          <div className="p-2.5 rounded-xl bg-emerald-950/50 border border-emerald-500/40 text-xs text-emerald-300 flex items-center gap-1.5">
            <Check className="w-4 h-4 shrink-0" />
            <span>데이터가 성공적으로 복원되었습니다!</span>
          </div>
        )}

        {importError && (
          <div className="p-2.5 rounded-xl bg-rose-950/50 border border-rose-500/40 text-xs text-rose-300">
            {importError}
          </div>
        )}

        {/* File upload */}
        <label className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-xs font-semibold text-slate-300 border border-dashed border-slate-600 cursor-pointer transition">
          <Upload className="w-4 h-4 text-indigo-400" />
          <span>백업 파일(.json) 업로드</span>
          <input
            type="file"
            accept=".json,application/json"
            onChange={handleFileUpload}
            className="hidden"
          />
        </label>

        {/* Or paste text */}
        <div className="space-y-2 pt-1">
          <textarea
            rows={2}
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            placeholder="또는 백업 JSON 텍스트를 여기에 직접 붙여넣으세요..."
            className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
          {importText.trim() && (
            <button
              onClick={handleTextImport}
              className="w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white transition active:scale-95"
            >
              텍스트로 데이터 복원하기
            </button>
          )}
        </div>
      </div>

      {/* AI (Gemini) */}
      <div className="bg-slate-900/80 rounded-2xl p-4 border border-indigo-500/30 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <h4 className="text-xs font-bold text-white">AI 연동 (Gemini)</h4>
          </div>
          <span
            className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
              savedKey
                ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
          >
            {savedKey ? '연결됨' : '꺼짐'}
          </span>
        </div>

        <p className="text-[11px] text-slate-400 leading-relaxed">
          키를 넣으면 자연어 입력 인식에 AI를 쓸 수 있습니다. 넣지 않으면 지금처럼
          기기 안에서만 동작합니다.
        </p>

        {savedKey ? (
          <div className="bg-slate-800/60 rounded-xl p-2.5 border border-slate-700/60 flex items-center gap-2">
            <div className="flex-1 min-w-0">
              <span className="text-[10px] text-slate-400 block">저장된 키</span>
              <code className="text-[11px] text-slate-200 font-mono break-all">
                {maskApiKey(aiConfig.apiKey)}
              </code>
            </div>
            <button
              onClick={handleDeleteKey}
              className="p-1.5 rounded-lg bg-slate-800 text-slate-500 border border-slate-700 hover:text-rose-400 transition active:scale-95 shrink-0"
              title="키 삭제"
              aria-label="키 삭제"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              value={keyDraft}
              onChange={(e) => setKeyDraft(e.target.value)}
              placeholder="AI Studio에서 발급한 API 키 붙여넣기"
              autoComplete="off"
              spellCheck={false}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-3 pr-10 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-2.5 top-2.5 p-1 text-slate-500 hover:text-slate-300"
              aria-label={showKey ? '키 가리기' : '키 보기'}
            >
              {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        )}

        {/* 모델 선택 */}
        <div>
          <label className="block text-[11px] font-medium text-slate-400 mb-1">모델</label>
          <input
            type="text"
            value={aiConfig.model}
            onChange={(e) => handleModelChange(e.target.value)}
            list="ai-model-options"
            placeholder={DEFAULT_AI_MODEL}
            spellCheck={false}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
          />
          <datalist id="ai-model-options">
            {KNOWN_MODELS.map((m) => (
              <option key={m} value={m} />
            ))}
          </datalist>
        </div>

        <div className="flex items-center gap-2">
          {!savedKey && (
            <button
              onClick={handleSaveKey}
              disabled={!keyDraft.trim()}
              className="flex-1 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-xs font-bold text-white transition active:scale-95"
            >
              키 저장
            </button>
          )}
          <button
            onClick={handleTestKey}
            disabled={isTesting || (!savedKey && !keyDraft.trim())}
            className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:text-slate-600 border border-slate-700 text-xs font-semibold text-slate-200 transition active:scale-95 flex items-center justify-center gap-1.5"
          >
            {isTesting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>확인 중…</span>
              </>
            ) : (
              <span>연결 테스트</span>
            )}
          </button>
        </div>

        {testResult && (
          <div
            className={`p-2.5 rounded-xl text-[11px] border space-y-1.5 ${
              testResult.ok && testResult.modelAvailable
                ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-300'
                : testResult.ok
                ? 'bg-amber-950/50 border-amber-500/40 text-amber-300'
                : 'bg-rose-950/50 border-rose-500/40 text-rose-300'
            }`}
          >
            <span className="block">{testResult.message}</span>
            {testResult.ok && !testResult.modelAvailable && testResult.availableFlashModels?.length ? (
              <div className="flex flex-wrap gap-1 pt-0.5">
                {testResult.availableFlashModels.map((m) => (
                  <button
                    key={m}
                    onClick={() => handleModelChange(m)}
                    className="px-1.5 py-0.5 rounded bg-slate-800/80 border border-slate-700 text-[10px] font-mono text-slate-300 hover:text-white transition"
                  >
                    {m}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        )}

        <div className="bg-amber-950/20 border border-amber-800/40 rounded-xl p-2.5 space-y-1">
          <div className="flex items-center gap-1.5 text-amber-400">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span className="text-[11px] font-bold">키 취급 주의</span>
          </div>
          <ul className="text-[10px] text-slate-400 space-y-0.5 pl-4 list-disc leading-relaxed">
            <li>
              키는 이 기기 브라우저에만 저장되며 <strong className="text-slate-300">백업 파일에는 포함되지 않습니다</strong>
            </li>
            <li>
              개발자 도구를 열면 키가 보입니다. <strong className="text-slate-300">결제를 연결하지 않은 무료 키</strong>를
              쓰면 유출되어도 금전 피해가 없습니다
            </li>
            <li>AI Studio에서 키에 API 제한을 걸어두면 더 안전합니다</li>
            <li>AI 기능을 쓰면 입력한 문장이 Google 서버로 전송됩니다 (월급·저축 정보는 보내지 않습니다)</li>
          </ul>
        </div>
      </div>

      {/* Automatic snapshots (되돌리기) */}
      {snapshots.length > 0 && (
        <div className="bg-slate-900/80 rounded-2xl p-4 border border-amber-800/40 space-y-3">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-amber-400" />
            <h4 className="text-xs font-bold text-slate-200">되돌리기 (자동 백업)</h4>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            복원·초기화로 교체되기 직전의 데이터, 그리고 읽지 못한 손상 데이터가 자동으로 보관됩니다.
            최근 5개까지만 유지됩니다.
          </p>

          <div className="space-y-2">
            {snapshots.map((snap) => (
              <div
                key={snap.key}
                className="bg-slate-800/60 rounded-xl p-2.5 border border-slate-700/60 flex items-center gap-2"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                        snap.kind === 'broken'
                          ? 'bg-rose-950/60 text-rose-300 border-rose-800/60'
                          : 'bg-amber-950/60 text-amber-300 border-amber-800/60'
                      }`}
                    >
                      {snap.kind === 'broken' ? '손상 데이터' : '교체 직전'}
                    </span>
                    <span className="text-[11px] text-slate-300 font-medium">
                      {snap.savedAt ? new Date(snap.savedAt).toLocaleString('ko-KR') : '시점 불명'}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500">
                    {(snap.size / 1024).toFixed(1)} KB
                  </span>
                </div>

                <button
                  onClick={() => handleRestoreSnapshot(snap)}
                  className="px-2.5 py-1.5 rounded-lg bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 text-[11px] font-semibold hover:bg-indigo-600/30 transition active:scale-95 shrink-0"
                >
                  복원
                </button>
                <button
                  onClick={() => handleDownloadSnapshot(snap)}
                  className="p-1.5 rounded-lg bg-slate-800 text-slate-400 border border-slate-700 hover:text-white transition active:scale-95 shrink-0"
                  title="JSON 파일로 저장"
                  aria-label="JSON 파일로 저장"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDeleteSnapshot(snap)}
                  className="p-1.5 rounded-lg bg-slate-800 text-slate-500 border border-slate-700 hover:text-rose-400 transition active:scale-95 shrink-0"
                  title="이 백업 삭제"
                  aria-label="이 백업 삭제"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PWA Home screen guide */}
      <div className="bg-slate-900/60 rounded-2xl p-4 border border-slate-800 space-y-2">
        <div className="flex items-center gap-2 text-slate-300">
          <Smartphone className="w-4 h-4 text-indigo-400" />
          <h4 className="text-xs font-bold">스마트폰에 앱으로 설치하는 법</h4>
        </div>
        <ul className="text-[11px] text-slate-400 space-y-1.5 pl-4 list-disc">
          <li>
            <strong>아이폰 (Safari)</strong>: 하단 공유 버튼(네모+화살표) 탭 → [홈 화면에 추가]
          </li>
          <li>
            <strong>갤럭시/안드로이드 (Chrome/삼성인터넷)</strong>: 상단 더보기(점 세개) 메뉴 탭 → [홈 화면에 추가] 또는 [앱 설치]
          </li>
        </ul>
      </div>

      {/* Reset Section */}
      <div className="pt-2">
        <button
          onClick={handleReset}
          className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-rose-950/30 hover:bg-rose-950/60 border border-rose-900/40 text-xs font-semibold text-rose-400 transition"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>가계부 데이터 완전 초기화</span>
        </button>
      </div>
    </div>
  );
};
