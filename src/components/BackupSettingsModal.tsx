import React, { useState } from 'react';
import { AppState } from '../types';
import { Copy, Download, Upload, RotateCcw, ShieldCheck, Check, Smartphone, HelpCircle } from 'lucide-react';
import { exportBackupJson, importBackupJson, resetToDefault } from '../utils/storage';

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

  // Import JSON from file input
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const imported = importBackupJson(text);
        onStateChange(imported);
        setImportSuccess(true);
        setImportError('');
        setTimeout(() => setImportSuccess(false), 3000);
      } catch (err: any) {
        setImportError(err.message || '파일 가져오기에 실패했습니다.');
      }
    };
    reader.readAsText(file);
  };

  // Import from textarea
  const handleTextImport = () => {
    if (!importText.trim()) return;
    try {
      const imported = importBackupJson(importText);
      onStateChange(imported);
      setImportSuccess(true);
      setImportError('');
      setImportText('');
      setTimeout(() => setImportSuccess(false), 3000);
    } catch (err: any) {
      setImportError(err.message || '유효하지 않은 백업 데이터입니다.');
    }
  };

  // Reset to default
  const handleReset = () => {
    if (window.confirm('정말로 모든 데이터를 초기 예시 데이터로 초기화하시겠습니까? (현재 데이터는 삭제됩니다)')) {
      const reset = resetToDefault();
      onStateChange(reset);
      alert('초기화되었습니다.');
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
          오직 **내 기기 브라우저(LocalStorage)**에만 안전하게 보관됩니다.
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

      {/* PWA Home screen guide */}
      <div className="bg-slate-900/60 rounded-2xl p-4 border border-slate-800 space-y-2">
        <div className="flex items-center gap-2 text-slate-300">
          <Smartphone className="w-4 h-4 text-indigo-400" />
          <h4 className="text-xs font-bold">📱 내 폰에 앱으로 설치하는 법</h4>
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
          <span>기본 예시 데이터로 초기화</span>
        </button>
      </div>
    </div>
  );
};
