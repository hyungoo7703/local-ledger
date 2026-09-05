import React from 'react';
import { DealItem } from '../types';
import { Sparkles } from 'lucide-react';

interface DealCalendarProps {
  currentYear: number;
  currentMonth: number;
  deals: DealItem[];
  selectedDate: string;
  onSelectDate: (dateStr: string) => void;
  onOpenAddModal: (dateStr: string) => void;
}

export const DealCalendar: React.FC<DealCalendarProps> = ({
  currentYear,
  currentMonth,
  deals,
  selectedDate,
  onSelectDate,
  onOpenAddModal
}) => {
  // Compute days in month
  const firstDayIndex = new Date(currentYear, currentMonth - 1, 1).getDay();
  const totalDays = new Date(currentYear, currentMonth, 0).getDate();

  // Today string
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  // Map deals by date
  const dealsByDate = React.useMemo(() => {
    const map = new Map<string, DealItem[]>();
    for (const d of deals) {
      if (!map.has(d.date)) {
        map.set(d.date, []);
      }
      map.get(d.date)!.push(d);
    }
    return map;
  }, [deals]);

  const weekDays = ['일', '월', '화', '수', '목', '금', '토'];

  const cells = [];
  // Empty slots before 1st day
  for (let i = 0; i < firstDayIndex; i++) {
    cells.push(<div key={`empty-${i}`} className="h-14 sm:h-16" />);
  }

  // Days 1 to totalDays
  for (let day = 1; day <= totalDays; day++) {
    const dayStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayDeals = dealsByDate.get(dayStr) || [];
    const isToday = dayStr === todayStr;
    const isSelected = dayStr === selectedDate;
    const hasDeals = dayDeals.length > 0;
    const totalDiscount = dayDeals.reduce((sum, item) => sum + item.discountAmount, 0);

    cells.push(
      <button
        key={dayStr}
        onClick={() => {
          onSelectDate(dayStr);
        }}
        onDoubleClick={() => {
          onOpenAddModal(dayStr);
        }}
        className={`h-14 sm:h-16 p-1 rounded-xl flex flex-col justify-between items-center transition-all relative group border text-left active:scale-95 ${
          isSelected
            ? 'bg-indigo-600/30 border-indigo-500 shadow-md ring-1 ring-indigo-500'
            : isToday
            ? 'bg-slate-800/80 border-slate-600'
            : 'bg-slate-900/40 border-slate-800/60 hover:bg-slate-800/50'
        }`}
      >
        {/* Date number */}
        <div className="w-full flex items-center justify-between px-1">
          <span
            className={`text-xs font-semibold ${
              isSelected
                ? 'text-indigo-300 font-bold'
                : isToday
                ? 'text-amber-400 font-bold'
                : 'text-slate-300'
            }`}
          >
            {day}
          </span>
          {isToday && (
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" title="오늘" />
          )}
        </div>

        {/* Deals Indicator / Discount preview */}
        {hasDeals ? (
          <div className="w-full px-0.5 mt-auto">
            {totalDiscount > 0 ? (
              <div className="text-[9px] font-bold text-pink-400 truncate flex items-center justify-center gap-0.5 bg-pink-950/40 rounded py-0.5 border border-pink-500/20">
                <Sparkles className="w-2.5 h-2.5 shrink-0" />
                <span>-{Math.round(totalDiscount / 1000)}k</span>
              </div>
            ) : (
              <div className="text-[9px] font-medium text-indigo-300 truncate text-center bg-indigo-950/40 rounded py-0.5">
                {dayDeals.length}건
              </div>
            )}
          </div>
        ) : (
          <div className="h-4" />
        )}
      </button>
    );
  }

  return (
    <div className="bg-slate-900/60 rounded-2xl p-3 border border-slate-800 shadow-lg">
      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1 text-center mb-1">
        {weekDays.map((w, idx) => (
          <span
            key={w}
            className={`text-[11px] font-semibold py-1 ${
              idx === 0 ? 'text-rose-400' : idx === 6 ? 'text-sky-400' : 'text-slate-400'
            }`}
          >
            {w}
          </span>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-1">{cells}</div>
    </div>
  );
};
