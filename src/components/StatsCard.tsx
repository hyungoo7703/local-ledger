import React from 'react';
import { TrendingDown, Sparkles, CheckCircle2, Wallet } from 'lucide-react';
import { formatCompactKRW, formatKRW } from '../utils/formatters';

interface StatsCardProps {
  totalPlannedSpend: number;
  totalDiscountSaved: number;
  completedCount: number;
  totalCount: number;
  dealBudget: number; // 월급 룰에서 할당된 혜택 소비 예산
}

export const StatsCard: React.FC<StatsCardProps> = ({
  totalPlannedSpend,
  totalDiscountSaved,
  completedCount,
  totalCount,
  dealBudget
}) => {
  const budgetRatio = dealBudget > 0 ? Math.min(100, Math.round((totalPlannedSpend / dealBudget) * 100)) : 0;
  const isOverBudget = dealBudget > 0 && totalPlannedSpend > dealBudget;
  const remainingBudget = dealBudget - totalPlannedSpend;

  return (
    <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/40 rounded-2xl p-4 border border-slate-800 shadow-xl space-y-3">
      {/* Top row: Planned Spend & Saved Discount */}
      <div className="grid grid-cols-2 gap-3">
        {/* Planned Spend */}
        <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/40 relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="font-medium">예정 지출</span>
            <Wallet className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <div className="text-lg font-bold text-white tracking-tight">
            {formatCompactKRW(totalPlannedSpend)}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {formatKRW(totalPlannedSpend)}
          </div>
        </div>

        {/* Saved Discount */}
        <div className="bg-gradient-to-br from-indigo-950/60 to-pink-950/40 rounded-xl p-3 border border-indigo-500/30 relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-pink-300 mb-1">
            <span className="font-medium flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-pink-400" />
              할인 세이브
            </span>
            <TrendingDown className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-lg font-extrabold text-pink-400 tracking-tight">
            +{formatCompactKRW(totalDiscountSaved)}
          </div>
          <div className="text-[11px] text-emerald-400/90 font-medium mt-0.5">
            총 {formatKRW(totalDiscountSaved)} 절약!
          </div>
        </div>
      </div>

      {/* Budget Bar & Progress */}
      {dealBudget > 0 && (
        <div className="bg-slate-800/40 rounded-xl p-2.5 border border-slate-800 text-xs space-y-1.5">
          <div className="flex justify-between items-center text-slate-300">
            <span className="text-slate-400">
              한계 소비 예산 대비 ({formatCompactKRW(dealBudget)})
            </span>
            <span className={`font-semibold ${isOverBudget ? 'text-rose-400' : 'text-indigo-300'}`}>
              {budgetRatio}% ({isOverBudget ? '초과' : `${formatCompactKRW(remainingBudget)} 남음`})
            </span>
          </div>
          <div className="w-full bg-slate-700/60 rounded-full h-2 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                isOverBudget
                  ? 'bg-rose-500'
                  : budgetRatio > 80
                  ? 'bg-amber-500'
                  : 'bg-gradient-to-r from-indigo-500 to-emerald-400'
              }`}
              style={{ width: `${Math.min(100, budgetRatio)}%` }}
            />
          </div>
        </div>
      )}

      {/* Completion status */}
      <div className="flex items-center justify-between text-xs text-slate-400 px-1 pt-0.5">
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />
          <span>체크 완료:</span>
          <span className="text-white font-medium">
            {completedCount} / {totalCount}건
          </span>
        </div>
        {totalCount > 0 && (
          <span className="text-[11px] text-slate-500">
            {Math.round((completedCount / totalCount) * 100)}% 진행됨
          </span>
        )}
      </div>
    </div>
  );
};
