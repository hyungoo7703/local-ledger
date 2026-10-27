import React from 'react';
import { StickyNote, Eraser } from 'lucide-react';
import { formatMonthDisplay } from '../utils/formatters';

interface MonthlyMemoProps {
  year: number;
  month: number;
  text: string;
  /** 보관 기간이 지난 달. 써도 다음에 열 때 지워지므로 입력을 막는다. */
  isExpired: boolean;
  onChange: (text: string) => void;
}

/**
 * 그달 소비·할인 계획을 대충 적어두는 휘발성 메모.
 * 다다음 달이 되면 지워진다 (storage의 sanitizeMonthlyMemos).
 */
export const MonthlyMemo: React.FC<MonthlyMemoProps> = ({ year, month, text, isExpired, onChange }) => {
  const expiresOn = new Date(year, month + 1, 1);

  return (
    <div className="bg-slate-900/80 rounded-2xl p-4 border border-slate-800 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-amber-400">
          <StickyNote className="w-5 h-5" />
          <h3 className="text-sm font-bold text-white">{formatMonthDisplay(year, month)} 메모</h3>
        </div>
        {text && !isExpired && (
          <button
            type="button"
            onClick={() => {
              if (window.confirm('이 달 메모를 모두 지울까요?')) onChange('');
            }}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] text-slate-400 hover:text-rose-300 hover:bg-slate-800 transition active:scale-95"
          >
            <Eraser className="w-3.5 h-3.5" />
            비우기
          </button>
        )}
      </div>

      {isExpired ? (
        <p className="text-xs text-slate-500 text-center py-10 leading-relaxed">
          메모는 지난달 것까지만 남습니다.
          <br />
          이 달 메모는 이미 지워졌습니다.
        </p>
      ) : (
        <>
          <textarea
            value={text}
            onChange={(e) => onChange(e.target.value)}
            placeholder={'이번 달 할인·소비 계획을 대충 적어두세요\n예) Tday 빕스 40% 노리기 / 신용 50만 넘기지 말기'}
            className="w-full min-h-[55vh] resize-none bg-slate-800/60 border border-slate-700 rounded-xl px-3 py-2.5 text-base leading-relaxed text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500/70"
          />
          <p className="text-[11px] text-slate-500">
            입력하는 대로 저장됩니다. {expiresOn.getFullYear()}년 {expiresOn.getMonth() + 1}월 1일부터 자동으로 지워집니다.
          </p>
        </>
      )}
    </div>
  );
};
