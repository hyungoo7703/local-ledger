import React from 'react';
import { ChevronLeft, ChevronRight, Calendar, PiggyBank, Settings } from 'lucide-react';
import { formatMonthDisplay } from '../utils/formatters';

interface HeaderProps {
  currentYear: number;
  currentMonth: number;
  activeTab: 'calendar' | 'salary' | 'settings';
  onMonthChange: (year: number, month: number) => void;
  onTabChange: (tab: 'calendar' | 'salary' | 'settings') => void;
  onResetToCurrentMonth: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentYear,
  currentMonth,
  activeTab,
  onMonthChange,
  onTabChange,
  onResetToCurrentMonth
}) => {
  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      onMonthChange(currentYear - 1, 12);
    } else {
      onMonthChange(currentYear, currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      onMonthChange(currentYear + 1, 1);
    } else {
      onMonthChange(currentYear, currentMonth + 1);
    }
  };

  const now = new Date();
  const isCurrentMonth = now.getFullYear() === currentYear && now.getMonth() + 1 === currentMonth;

  return (
    <header className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-md border-b border-slate-800/80 pt-safe px-4 pb-2">
      {/* Top Brand Bar */}
      <div className="flex items-center justify-between py-2">
        <div>
          <h1 className="text-base font-bold tracking-tight text-white">
            로컬 가계부
          </h1>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center bg-slate-800/80 p-1 rounded-xl border border-slate-700/50">
          <button
            onClick={() => onTabChange('calendar')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'calendar'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>플랜</span>
          </button>
          <button
            onClick={() => onTabChange('salary')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'salary'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <PiggyBank className="w-3.5 h-3.5" />
            <span>월급 룰</span>
          </button>
          <button
            onClick={() => onTabChange('settings')}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'settings'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Month Navigator (visible on plan tab) */}
      {activeTab === 'calendar' && (
        <div className="flex items-center justify-between mt-1 pt-1 border-t border-slate-800/50">
          <div className="flex items-center gap-1">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition active:scale-95"
              aria-label="이전 달"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-base font-bold text-slate-100 tracking-tight">
              {formatMonthDisplay(currentYear, currentMonth)}
            </span>
            <button
              onClick={handleNextMonth}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition active:scale-95"
              aria-label="다음 달"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {!isCurrentMonth && (
            <button
              onClick={onResetToCurrentMonth}
              className="text-xs px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium border border-slate-700 transition"
            >
              이번 달
            </button>
          )}
        </div>
      )}
    </header>
  );
};
