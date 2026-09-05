import React from 'react';
import { TrendingDown, Sparkles, CheckCircle2, Wallet, CreditCard, Coins } from 'lucide-react';
import { formatCompactKRW, formatKRW } from '../utils/formatters';

interface StatsCardProps {
  totalPlannedSpend: number; // 실제 결제(승인) 예정 총액 (원)
  totalPostBenefits: number; // 사후 혜택 총액 (청구할인 + 적립) (원)
  billDiscountTotal: number; // 결제일 청구할인 합계 (원)
  pointRewardTotal: number; // 포인트/캐시백 적립 합계 (원)
  completedCount: number;
  totalCount: number;
  baseBudgetWon: number; // 월급 룰에서 할당된 기본 한계 소비 예산 (원)
}

export const StatsCard: React.FC<StatsCardProps> = ({
  totalPlannedSpend,
  totalPostBenefits,
  billDiscountTotal,
  pointRewardTotal,
  completedCount,
  totalCount,
  baseBudgetWon
}) => {
  // 사후 혜택(청구할인, 포인트적립)이 발생하면 한계 소비 예산이 늘어남
  const adjustedBudgetWon = baseBudgetWon + totalPostBenefits;
  const netSpend = Math.max(0, totalPlannedSpend - totalPostBenefits);
  const remainingBudgetWon = adjustedBudgetWon - totalPlannedSpend;
  const isOverBudget = adjustedBudgetWon > 0 && totalPlannedSpend > adjustedBudgetWon;
  const budgetRatio = adjustedBudgetWon > 0
    ? Math.min(100, Math.round((totalPlannedSpend / adjustedBudgetWon) * 100))
    : 0;

  return (
    <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/40 rounded-2xl p-4 border border-slate-800 shadow-xl space-y-3">
      {/* Top row: Planned Spend & Post Benefits */}
      <div className="grid grid-cols-2 gap-3">
        {/* Planned Spend Card */}
        <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/40 relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span className="font-semibold flex items-center gap-1 whitespace-nowrap">
                <Wallet className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                소비
              </span>
            </div>
            <div className="text-lg font-bold text-white tracking-tight">
              {formatCompactKRW(totalPlannedSpend)}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5 whitespace-nowrap truncate">
              결제 {formatKRW(totalPlannedSpend)}
            </div>
          </div>

          {totalPostBenefits > 0 && (
            <div className="mt-2 pt-1.5 border-t border-slate-700/50 text-[11px] text-indigo-300 font-medium whitespace-nowrap truncate">
              실질 순소비 {formatKRW(netSpend)}
            </div>
          )}
        </div>

        {/* Post Benefits Card */}
        <div className="bg-gradient-to-br from-indigo-950/60 via-slate-900 to-pink-950/40 rounded-xl p-3 border border-indigo-500/30 relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-pink-300 mb-1">
              <span className="font-semibold flex items-center gap-1 whitespace-nowrap">
                <Sparkles className="w-3.5 h-3.5 text-pink-400 shrink-0" />
                사후 혜택
              </span>
              <TrendingDown className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            </div>
            <div className="text-lg font-extrabold text-pink-400 tracking-tight">
              +{formatCompactKRW(totalPostBenefits)}
            </div>
            <div className="text-[11px] text-slate-300 mt-0.5 flex items-center gap-1.5 whitespace-nowrap overflow-hidden">
              <span className="flex items-center gap-0.5 text-emerald-300">
                <CreditCard className="w-3 h-3 shrink-0" />
                {formatCompactKRW(billDiscountTotal)}
              </span>
              <span>·</span>
              <span className="flex items-center gap-0.5 text-pink-300">
                <Coins className="w-3 h-3 shrink-0" />
                {formatCompactKRW(pointRewardTotal)}
              </span>
            </div>
          </div>

          {totalPostBenefits > 0 && (
            <div className="mt-2 pt-1.5 border-t border-pink-500/20 text-[11px] text-emerald-400 font-semibold whitespace-nowrap truncate">
              예산 +{formatCompactKRW(totalPostBenefits)} 확대
            </div>
          )}
        </div>
      </div>

      {/* Budget Bar & Progress */}
      {baseBudgetWon > 0 && (
        <div className="bg-slate-800/40 rounded-2xl p-3.5 border border-slate-800 text-xs space-y-2.5">
          {/* Top Row: Title vs Remaining Status */}
          <div className="flex justify-between items-center text-slate-300">
            <span className="font-semibold text-slate-300 text-xs">
              한계 소비 예산
            </span>

            <div className="text-right whitespace-nowrap">
              <span className={`font-bold ${isOverBudget ? 'text-rose-400' : 'text-emerald-400'}`}>
                {isOverBudget
                  ? `${formatCompactKRW(Math.abs(remainingBudgetWon))} 초과`
                  : `${formatCompactKRW(remainingBudgetWon)} 남음`}
              </span>
              <span className="text-[11px] text-slate-400 ml-1.5 font-normal">
                ({budgetRatio}%)
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-slate-700/60 rounded-full h-2.5 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                isOverBudget
                  ? 'bg-rose-500'
                  : budgetRatio > 80
                  ? 'bg-amber-500'
                  : 'bg-gradient-to-r from-indigo-500 via-indigo-400 to-emerald-400'
              }`}
              style={{ width: `${Math.min(100, budgetRatio)}%` }}
            />
          </div>

          {/* Bottom Row: Detail Breakdown */}
          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-0.5">
            <div className="truncate">
              <span>소비 </span>
              <strong className="text-slate-200">{formatCompactKRW(totalPlannedSpend)}</strong>
            </div>

            <div className="flex items-center gap-1.5 shrink-0 whitespace-nowrap">
              <span>총 한도</span>
              <strong className="text-indigo-300 font-bold">
                {formatCompactKRW(adjustedBudgetWon)}
              </strong>
              {totalPostBenefits > 0 && (
                <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-950/70 px-1.5 py-0.5 rounded border border-emerald-500/40">
                  +{formatKRW(totalPostBenefits)} 혜택
                </span>
              )}
            </div>
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
