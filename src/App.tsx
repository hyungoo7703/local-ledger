import React, { useState, useEffect, useMemo } from 'react';
import { AppState, DealItem, SalaryConfig } from './types';
import { loadAppState, saveAppState, calculateSpendingLimitManwon } from './utils/storage';
import { getTodayString } from './utils/formatters';
import { Header } from './components/Header';
import { StatsCard } from './components/StatsCard';
import { DealCalendar } from './components/DealCalendar';
import { DealList } from './components/DealList';
import { SalaryRules } from './components/SalaryRules';
import { BackupSettingsModal } from './components/BackupSettingsModal';
import { QuickAddModal } from './components/QuickAddModal';
import { Plus } from 'lucide-react';

export const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(() => loadAppState());

  const today = new Date();
  const [currentYear, setCurrentYear] = useState<number>(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(today.getMonth() + 1);
  const [selectedDate, setSelectedDate] = useState<string>(getTodayString());

  const [activeTab, setActiveTab] = useState<'calendar' | 'salary' | 'settings'>('calendar');
  const [listFilterMode, setListFilterMode] = useState<'selectedDate' | 'allMonth'>('allMonth');

  // Modal states
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [editDealItem, setEditDealItem] = useState<DealItem | null>(null);

  // Auto save to localStorage whenever appState changes
  useEffect(() => {
    saveAppState(appState);
  }, [appState]);

  // Filter deals for the current selected year & month
  const monthPrefix = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;
  const currentMonthDeals = useMemo(() => {
    return appState.deals.filter((d) => d.date.startsWith(monthPrefix));
  }, [appState.deals, monthPrefix]);

  // Statistics for the current month
  const totalPlannedSpend = useMemo(() => {
    return currentMonthDeals.reduce((sum, d) => sum + d.finalPrice, 0);
  }, [currentMonthDeals]);

  const billDiscountTotal = useMemo(() => {
    return currentMonthDeals
      .filter((d) => d.benefitType === 'bill_discount')
      .reduce((sum, d) => sum + (d.benefitAmount || 0), 0);
  }, [currentMonthDeals]);

  const pointRewardTotal = useMemo(() => {
    return currentMonthDeals
      .filter((d) => d.benefitType === 'point_reward')
      .reduce((sum, d) => sum + (d.benefitAmount || 0), 0);
  }, [currentMonthDeals]);

  const totalPostBenefits = useMemo(() => {
    return billDiscountTotal + pointRewardTotal;
  }, [billDiscountTotal, pointRewardTotal]);

  const completedCount = useMemo(() => {
    return currentMonthDeals.filter((d) => d.isCompleted).length;
  }, [currentMonthDeals]);

  // Find deal budget (한계 소비 예산) from salary deductions
  const spendingLimitWon = useMemo(() => {
    const limitManwon = calculateSpendingLimitManwon(appState.salaryConfig);
    return limitManwon * 10000;
  }, [appState.salaryConfig]);

  // Handlers
  const handleSaveDeal = (item: DealItem) => {
    setAppState((prev) => {
      const exists = prev.deals.some((d) => d.id === item.id);
      let updatedDeals: DealItem[];
      if (exists) {
        updatedDeals = prev.deals.map((d) => (d.id === item.id ? item : d));
      } else {
        updatedDeals = [item, ...prev.deals];
      }
      return { ...prev, deals: updatedDeals };
    });
  };

  const handleDeleteDeal = (id: string) => {
    setAppState((prev) => ({
      ...prev,
      deals: prev.deals.filter((d) => d.id !== id)
    }));
  };

  const handleToggleComplete = (id: string) => {
    setAppState((prev) => ({
      ...prev,
      deals: prev.deals.map((d) =>
        d.id === id ? { ...d, isCompleted: !d.isCompleted } : d
      )
    }));
  };

  const handleAddTag = (newTag: string) => {
    if (!appState.quickTags.includes(newTag)) {
      setAppState((prev) => ({
        ...prev,
        quickTags: [...prev.quickTags, newTag]
      }));
    }
  };

  const handleUpdateSalaryConfig = (newConfig: SalaryConfig) => {
    setAppState((prev) => ({
      ...prev,
      salaryConfig: newConfig
    }));
  };

  const handleOpenAddForDate = (dateStr?: string) => {
    if (dateStr) setSelectedDate(dateStr);
    setEditDealItem(null);
    setIsQuickAddOpen(true);
  };

  const handleEditDeal = (deal: DealItem) => {
    setEditDealItem(deal);
    setIsQuickAddOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans max-w-lg mx-auto border-x border-slate-900 shadow-2xl relative">
      {/* Sticky Header */}
      <Header
        currentYear={currentYear}
        currentMonth={currentMonth}
        activeTab={activeTab}
        onMonthChange={(y, m) => {
          setCurrentYear(y);
          setCurrentMonth(m);
          setSelectedDate(`${y}-${String(m).padStart(2, '0')}-01`);
        }}
        onTabChange={setActiveTab}
        onResetToCurrentMonth={() => {
          const now = new Date();
          setCurrentYear(now.getFullYear());
          setCurrentMonth(now.getMonth() + 1);
          setSelectedDate(getTodayString());
        }}
      />

      {/* Main Content Area */}
      <main className="flex-1 p-4 space-y-4 pb-24 overflow-y-auto">
        {activeTab === 'calendar' && (
          <>
            {/* Top Monthly Stats summary */}
            <StatsCard
              totalPlannedSpend={totalPlannedSpend}
              totalPostBenefits={totalPostBenefits}
              billDiscountTotal={billDiscountTotal}
              pointRewardTotal={pointRewardTotal}
              completedCount={completedCount}
              totalCount={currentMonthDeals.length}
              baseBudgetWon={spendingLimitWon}
            />

            {/* Calendar Grid */}
            <DealCalendar
              currentYear={currentYear}
              currentMonth={currentMonth}
              deals={currentMonthDeals}
              selectedDate={selectedDate}
              onSelectDate={(dateStr) => {
                setSelectedDate(dateStr);
                setListFilterMode('selectedDate');
              }}
              onOpenAddModal={(dateStr) => handleOpenAddForDate(dateStr)}
            />

            {/* Deal List / Timeline */}
            <DealList
              deals={currentMonthDeals}
              selectedDate={selectedDate}
              viewMode={listFilterMode}
              onToggleViewMode={setListFilterMode}
              onToggleComplete={handleToggleComplete}
              onEditDeal={handleEditDeal}
              onOpenAddModal={(dateStr) => handleOpenAddForDate(dateStr)}
            />
          </>
        )}

        {activeTab === 'salary' && (
          <SalaryRules
            config={appState.salaryConfig}
            currentPlannedDealsSpend={totalPlannedSpend}
            totalPostBenefits={totalPostBenefits}
            onUpdateConfig={handleUpdateSalaryConfig}
          />
        )}

        {activeTab === 'settings' && (
          <BackupSettingsModal
            appState={appState}
            onStateChange={setAppState}
          />
        )}
      </main>

      {/* Floating Action Button (FAB) for fast one-handed mobile input */}
      {activeTab === 'calendar' && (
        <button
          onClick={() => handleOpenAddForDate(selectedDate)}
          className="fixed bottom-6 right-6 sm:right-auto sm:left-1/2 sm:translate-x-36 z-40 flex items-center gap-2 px-4 py-3.5 rounded-full bg-gradient-to-r from-indigo-600 via-indigo-500 to-pink-500 text-white font-bold shadow-xl shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:scale-105 active:scale-95 transition-all"
          aria-label="새 혜택 플랜 등록"
        >
          <Plus className="w-5 h-5 stroke-[2.5]" />
          <span className="text-sm">플랜 추가</span>
        </button>
      )}

      {/* Bottom Sheet Quick Add Modal */}
      <QuickAddModal
        isOpen={isQuickAddOpen}
        initialDate={selectedDate}
        editItem={editDealItem}
        quickTags={appState.quickTags}
        currentYear={currentYear}
        currentMonth={currentMonth}
        onClose={() => {
          setIsQuickAddOpen(false);
          setEditDealItem(null);
        }}
        onSave={handleSaveDeal}
        onDelete={handleDeleteDeal}
        onAddTag={handleAddTag}
      />
    </div>
  );
};
