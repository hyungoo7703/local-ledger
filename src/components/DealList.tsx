import React from 'react';
import { DealItem } from '../types';
import { CheckCircle2, Circle, Sparkles, Tag, Calendar, Plus, Clock } from 'lucide-react';
import { formatKRW } from '../utils/formatters';

interface DealListProps {
  deals: DealItem[];
  selectedDate: string;
  viewMode: 'selectedDate' | 'allMonth';
  onToggleViewMode: (mode: 'selectedDate' | 'allMonth') => void;
  onToggleComplete: (id: string) => void;
  onEditDeal: (deal: DealItem) => void;
  onOpenAddModal: (dateStr?: string) => void;
}

export const DealList: React.FC<DealListProps> = ({
  deals,
  selectedDate,
  viewMode,
  onToggleViewMode,
  onToggleComplete,
  onEditDeal,
  onOpenAddModal
}) => {
  // Filter deals based on viewMode
  const filteredDeals = React.useMemo(() => {
    let list = [...deals];
    if (viewMode === 'selectedDate' && selectedDate) {
      list = list.filter((d) => d.date === selectedDate);
    }
    // Sort chronologically by date
    list.sort((a, b) => a.date.localeCompare(b.date));
    return list;
  }, [deals, viewMode, selectedDate]);

  const selectedDateLabel = React.useMemo(() => {
    if (!selectedDate) return '';
    const parts = selectedDate.split('-');
    return `${parseInt(parts[1], 10)}월 ${parseInt(parts[2], 10)}일`;
  }, [selectedDate]);

  return (
    <div className="space-y-3">
      {/* List Header / View Mode Switcher */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-indigo-400" />
            {viewMode === 'selectedDate' ? `${selectedDateLabel} 플랜` : '이번 달 전체 플랜'}
            <span className="text-xs font-normal text-slate-400">
              ({filteredDeals.length}건)
            </span>
          </h3>
        </div>

        <div className="flex items-center bg-slate-800/80 p-0.5 rounded-lg border border-slate-700/60 text-xs">
          <button
            onClick={() => onToggleViewMode('selectedDate')}
            className={`px-2.5 py-1 rounded-md transition font-medium ${
              viewMode === 'selectedDate'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            선택일
          </button>
          <button
            onClick={() => onToggleViewMode('allMonth')}
            className={`px-2.5 py-1 rounded-md transition font-medium ${
              viewMode === 'allMonth'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            이번 달 전체
          </button>
        </div>
      </div>

      {/* Items list */}
      {filteredDeals.length === 0 ? (
        <div className="bg-slate-900/40 rounded-2xl p-6 border border-slate-800/80 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-800/80 text-slate-400 flex items-center justify-center mx-auto">
            <Calendar className="w-6 h-6 text-indigo-400/60" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-300">
              {viewMode === 'selectedDate'
                ? `${selectedDateLabel}에 등록된 플랜이 없습니다.`
                : '이번 달에 등록된 혜택 플랜이 없습니다.'}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              특가나 쿠폰 행사를 발견하면 1초 만에 기록해 보세요!
            </p>
          </div>
          <button
            onClick={() => onOpenAddModal(viewMode === 'selectedDate' ? selectedDate : undefined)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600/30 text-xs font-semibold border border-indigo-500/30 transition active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>플랜 등록하기</span>
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredDeals.map((deal) => {
            const dateParts = deal.date.split('-');
            const dayText = `${parseInt(dateParts[1], 10)}/${parseInt(dateParts[2], 10)}`;

            return (
              <div
                key={deal.id}
                className={`group bg-slate-900/80 border rounded-2xl p-3 transition-all flex items-start gap-3 relative ${
                  deal.isCompleted
                    ? 'border-slate-800/60 bg-slate-950/40 opacity-70'
                    : 'border-slate-800 hover:border-indigo-500/40 hover:bg-slate-800/40'
                }`}
              >
                {/* Complete Toggle button */}
                <button
                  onClick={() => onToggleComplete(deal.id)}
                  className="mt-0.5 text-slate-400 hover:text-indigo-400 transition shrink-0 active:scale-90"
                  aria-label="완료 체크"
                >
                  {deal.isCompleted ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  ) : (
                    <Circle className="w-5 h-5 text-slate-500 hover:text-slate-300" />
                  )}
                </button>

                {/* Content body - Click to edit */}
                <div
                  className="flex-1 cursor-pointer min-w-0"
                  onClick={() => onEditDeal(deal)}
                >
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    {/* Date badge */}
                    <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                      {dayText}
                    </span>

                    {/* Tag badge */}
                    {deal.dealTag && (
                      <span className="text-[11px] font-medium px-1.5 py-0.5 rounded-md bg-indigo-950/80 text-indigo-300 border border-indigo-800/50 flex items-center gap-1">
                        <Tag className="w-2.5 h-2.5" />
                        {deal.dealTag}
                      </span>
                    )}

                    {deal.isCompleted && (
                      <span className="text-[10px] font-medium text-emerald-400 bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-800/40">
                        구매완료
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <h4
                    className={`text-sm font-semibold text-white truncate ${
                      deal.isCompleted ? 'line-through text-slate-400' : ''
                    }`}
                  >
                    {deal.title}
                  </h4>

                  {/* Memo */}
                  {deal.memo && (
                    <p className="text-xs text-slate-400 truncate mt-0.5">
                      {deal.memo}
                    </p>
                  )}

                  {/* Prices */}
                  <div className="flex items-center gap-3 mt-1.5 text-xs">
                    <div>
                      <span className="text-slate-400 mr-1">결제:</span>
                      <span className="font-bold text-slate-200">
                        {formatKRW(deal.finalPrice)}
                      </span>
                    </div>

                    {deal.discountAmount > 0 && (
                      <div className="flex items-center gap-0.5 text-pink-400 font-semibold">
                        <Sparkles className="w-3 h-3" />
                        <span>-{formatKRW(deal.discountAmount)} 할인</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
