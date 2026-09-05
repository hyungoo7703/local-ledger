import React, { useState } from 'react';
import { SalaryConfig, SalaryDeductionItem, MonthlyChecklistItem } from '../types';
import { PiggyBank, Plus, Trash2, ShoppingBag, Landmark, ArrowRight, Check, AlertCircle, ListChecks, CheckSquare, Square, RefreshCw, X } from 'lucide-react';
import { formatCompactKRW, generateId } from '../utils/formatters';
import { calculateRemainingSalary, calculateSpendingLimitManwon, calculateTotalDeductions } from '../utils/storage';

interface SalaryRulesProps {
  config: SalaryConfig;
  currentPlannedDealsSpend: number; // in KRW (원)
  totalPostBenefits?: number; // in KRW (원) 사후 혜택 총액
  onUpdateConfig: (newConfig: SalaryConfig) => void;
}

const PRESET_NAMES = ['ISA 저금', '청약 저축', '국민카드', '신한카드', '고정지출(월세/공과)', '비상금'];
const CHECKLIST_PRESETS = ['월세 송금', '관리비 납부', '청약 입금', 'ISA 저축', '적금 이체', '보험료 납부'];

export const SalaryRules: React.FC<SalaryRulesProps> = ({
  config,
  currentPlannedDealsSpend,
  totalPostBenefits = 0,
  onUpdateConfig
}) => {
  const [baseSalaryInput, setBaseSalaryInput] = useState<string>(
    config.baseSalaryManwon ? String(config.baseSalaryManwon) : ''
  );
  const [payday, setPayday] = useState<number>(config.payday || 25);
  const [deductions, setDeductions] = useState<SalaryDeductionItem[]>(config.deductions || []);
  const [checklist, setChecklist] = useState<MonthlyChecklistItem[]>(config.checklist || []);
  const [isChecklistModalOpen, setIsChecklistModalOpen] = useState(false);

  // Quick Add Form States
  const [quickOneLiner, setQuickOneLiner] = useState('');
  const [newName, setNewName] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newIsSpending, setNewIsSpending] = useState(false);

  // Checklist Form State
  const [newChecklistTitle, setNewChecklistTitle] = useState('');

  React.useEffect(() => {
    setBaseSalaryInput(config.baseSalaryManwon ? String(config.baseSalaryManwon) : '');
    setPayday(config.payday || 25);
    setDeductions(config.deductions || []);
    setChecklist(config.checklist || []);
  }, [config]);

  const baseSalaryManwon = parseInt(baseSalaryInput, 10) || 0;
  const currentConfig: SalaryConfig = {
    baseSalaryManwon,
    payday,
    deductions
  };

  const totalDeductionsManwon = calculateTotalDeductions(currentConfig);
  const remainingManwon = calculateRemainingSalary(currentConfig);
  const spendingLimitManwon = calculateSpendingLimitManwon(currentConfig);
  const spendingLimitWon = spendingLimitManwon * 10000;

  const handleSalaryBlur = () => {
    const parsed = parseInt(baseSalaryInput.replace(/\D/g, ''), 10) || 0;
    const updated = { ...config, baseSalaryManwon: parsed, payday, deductions };
    onUpdateConfig(updated);
  };

  const handleToggleSpending = (id: string) => {
    const updated = deductions.map((item) =>
      item.id === id ? { ...item, isSpending: !item.isSpending } : item
    );
    setDeductions(updated);
    onUpdateConfig({ ...config, deductions: updated });
  };

  const handleAmountChange = (id: string, amount: number) => {
    const updated = deductions.map((item) =>
      item.id === id ? { ...item, amountManwon: Math.max(0, amount) } : item
    );
    setDeductions(updated);
    onUpdateConfig({ ...config, deductions: updated });
  };

  const handleStepAmount = (id: string, step: number) => {
    const updated = deductions.map((item) =>
      item.id === id ? { ...item, amountManwon: Math.max(0, item.amountManwon + step) } : item
    );
    setDeductions(updated);
    onUpdateConfig({ ...config, deductions: updated });
  };

  const handleDeleteItem = (id: string) => {
    const updated = deductions.filter((item) => item.id !== id);
    setDeductions(updated);
    onUpdateConfig({ ...config, deductions: updated });
  };

  // 한 줄 퀵 추가 파서 (예: "ISA 100", "국민카드 40 소비")
  const handleQuickAddOneLiner = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = quickOneLiner.trim();
    if (!text) return;

    const isSpending = text.includes('소비') || text.includes('카드');
    // 숫자 추출
    const numMatch = text.match(/(\d+)/);
    const amount = numMatch ? parseInt(numMatch[1], 10) : 0;
    // 이름 추출 (숫자 및 '소비', '만원' 단어 제외)
    let cleanName = text
      .replace(/(\d+)(?:만|만원)?/, '')
      .replace(/\b소비\b/, '')
      .replace(/[:=]/g, '')
      .trim();

    if (!cleanName) cleanName = isSpending ? '카드 소비' : '저축 항목';

    const newItem: SalaryDeductionItem = {
      id: generateId(),
      name: cleanName,
      amountManwon: amount,
      isSpending
    };

    const updated = [...deductions, newItem];
    setDeductions(updated);
    onUpdateConfig({ ...config, deductions: updated });
    setQuickOneLiner('');
  };

  // 수동 폼 추가
  const handleAddManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const amount = parseInt(newAmount.replace(/\D/g, ''), 10) || 0;
    const newItem: SalaryDeductionItem = {
      id: generateId(),
      name: newName.trim(),
      amountManwon: amount,
      isSpending: newIsSpending
    };

    const updated = [...deductions, newItem];
    setDeductions(updated);
    onUpdateConfig({ ...config, deductions: updated });

    setNewName('');
    setNewAmount('');
    setNewIsSpending(false);
  };

  // Checklist Handlers
  const handleToggleCheck = (id: string) => {
    const updated = checklist.map((item) =>
      item.id === id ? { ...item, isChecked: !item.isChecked } : item
    );
    setChecklist(updated);
    onUpdateConfig({ ...config, deductions, checklist: updated });
  };

  const handleResetAllChecks = () => {
    if (checklist.length === 0) return;
    if (window.confirm('새 달 시작: 모든 항목의 체크를 해제할까요?')) {
      const updated = checklist.map((item) => ({ ...item, isChecked: false }));
      setChecklist(updated);
      onUpdateConfig({ ...config, deductions, checklist: updated });
    }
  };

  const handleAddChecklistItem = (title?: string) => {
    const text = (title || newChecklistTitle).trim();
    if (!text) return;

    const newItem: MonthlyChecklistItem = {
      id: generateId(),
      title: text,
      isChecked: false
    };

    const updated = [...checklist, newItem];
    setChecklist(updated);
    onUpdateConfig({ ...config, deductions, checklist: updated });
    setNewChecklistTitle('');
  };

  const handleImportFromDeductions = () => {
    const existingTitles = new Set(checklist.map((c) => c.title));
    // 소비 항목(카드소비 등)은 제외하고 순수 고정 및 저축 차감 항목만 가져옴
    const toAdd = deductions
      .filter((d) => !d.isSpending)
      .map((d) => d.name)
      .filter((name) => !existingTitles.has(name))
      .map((name) => ({ id: generateId(), title: name, isChecked: false }));

    if (toAdd.length === 0) {
      alert('가져올 저축/고정 항목이 없거나 이미 모두 등록되어 있습니다. (소비 항목은 제외됩니다)');
      return;
    }
    const updated = [...checklist, ...toAdd];
    setChecklist(updated);
    onUpdateConfig({ ...config, deductions, checklist: updated });
  };

  const handleDeleteChecklistItem = (id: string) => {
    const updated = checklist.filter((item) => item.id !== id);
    setChecklist(updated);
    onUpdateConfig({ ...config, deductions, checklist: updated });
  };

  const completedCheckCount = checklist.filter((c) => c.isChecked).length;

  return (
    <div className="space-y-4 pb-12">
      {/* 1. Top Card: Salary in Manwon */}
      <div className="bg-gradient-to-br from-slate-900 to-indigo-950/40 rounded-2xl p-4 border border-slate-800 shadow-xl space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="w-8 h-8 rounded-xl bg-indigo-600/30 text-indigo-400 flex items-center justify-center shrink-0">
              <PiggyBank className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-white tracking-tight">월급 차감 룰</h3>
              <p className="text-[11px] text-slate-400 truncate">
                저축·소비를 만원 단위로 차감
              </p>
            </div>
          </div>

          {/* Payday badge */}
          <div className="shrink-0 flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-1.5 rounded-xl border border-slate-700/60">
            <span className="text-[11px] text-slate-400 font-medium">급여일</span>
            <select
              value={payday}
              onChange={(e) => {
                const val = Number(e.target.value);
                setPayday(val);
                onUpdateConfig({ ...config, payday: val });
              }}
              className="bg-transparent text-xs text-indigo-300 font-bold focus:outline-none cursor-pointer"
            >
              {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                <option key={d} value={d} className="bg-slate-800 text-white">
                  {d}일
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Base Salary Input (만원 단위) */}
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">
            월 실수령액 (만원 단위 입력)
          </label>
          <div className="relative">
            <input
              type="text"
              inputMode="numeric"
              placeholder="예: 300 (300만원)"
              value={baseSalaryInput}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '');
                setBaseSalaryInput(val);
              }}
              onBlur={handleSalaryBlur}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-lg font-extrabold text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
            <span className="absolute right-3.5 top-3 text-sm font-bold text-indigo-400">
              만원
            </span>
          </div>

          {baseSalaryManwon > 0 && (
            <div className="text-xs text-slate-400 mt-1 pl-1">
              = {formatCompactKRW(baseSalaryManwon * 10000)}
            </div>
          )}

          {/* Quick Step Buttons */}
          <div className="flex gap-1.5 mt-2">
            {[10, 50, 100].map((step) => (
              <button
                key={step}
                type="button"
                onClick={() => {
                  const current = parseInt(baseSalaryInput.replace(/\D/g, ''), 10) || 0;
                  const next = current + step;
                  setBaseSalaryInput(String(next));
                  onUpdateConfig({ ...config, baseSalaryManwon: next, payday, deductions });
                }}
                className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 text-xs font-medium hover:bg-slate-700 transition"
              >
                +{step}만
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 2. Key Calculation Summary Bar */}
      <div className="grid grid-cols-3 gap-2">
        {/* Total Deductions */}
        <div className="bg-slate-900/80 rounded-xl p-3 border border-slate-800 text-center">
          <span className="text-[11px] text-slate-400 block mb-0.5">차감 합계</span>
          <span className="text-base font-bold text-slate-200">
            {totalDeductionsManwon}
            <span className="text-xs font-normal ml-0.5">만</span>
          </span>
        </div>

        {/* Spending Limit (한계 소비) */}
        <div className="bg-indigo-950/40 rounded-xl p-3 border border-indigo-500/40 text-center relative overflow-hidden">
          <span className="text-[11px] font-semibold text-indigo-300 block mb-0.5 flex items-center justify-center gap-1">
            <ShoppingBag className="w-3 h-3" />
            한계 소비
          </span>
          <span className="text-base font-extrabold text-indigo-400">
            {spendingLimitManwon}
            <span className="text-xs font-normal ml-0.5">만</span>
          </span>
        </div>

        {/* Remaining Money (남은 금액) */}
        <div
          className={`rounded-xl p-3 border text-center ${
            remainingManwon >= 0
              ? 'bg-emerald-950/30 border-emerald-500/40'
              : 'bg-rose-950/30 border-rose-500/40'
          }`}
        >
          <span className="text-[11px] text-slate-400 block mb-0.5">남은 금액</span>
          <span
            className={`text-base font-extrabold ${
              remainingManwon >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {remainingManwon}
            <span className="text-xs font-normal ml-0.5">만</span>
          </span>
        </div>
      </div>

      {/* Spending Limit Alert vs Actual Plan Spend */}
      {spendingLimitWon > 0 && (
        <div className="bg-slate-900/80 rounded-xl p-3 border border-indigo-500/30 text-xs space-y-1.5">
          <div className="flex items-center justify-between text-slate-300">
            <span className="flex items-center gap-1 font-semibold text-indigo-300">
              <ShoppingBag className="w-3.5 h-3.5 text-indigo-400" />
              이번 달 플랜 소비 현황
            </span>
            <div className="text-right">
              <span className="font-bold text-white">
                {formatCompactKRW(currentPlannedDealsSpend)}
              </span>
              <span className="text-slate-400 text-[11px] ml-1">
                / {formatCompactKRW(spendingLimitWon + totalPostBenefits)}
              </span>
            </div>
          </div>
          {totalPostBenefits > 0 && (
            <div className="text-[11px] text-emerald-400 font-medium">
              ✨ 사후 혜택 +{formatCompactKRW(totalPostBenefits)} 반영으로 한계 예산 확대됨
            </div>
          )}
          <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden mt-1">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                currentPlannedDealsSpend > (spendingLimitWon + totalPostBenefits)
                  ? 'bg-rose-500'
                  : 'bg-indigo-500'
              }`}
              style={{
                width: `${Math.min(100, Math.round((currentPlannedDealsSpend / (spendingLimitWon + totalPostBenefits)) * 100))}%`
              }}
            />
          </div>
        </div>
      )}

      {/* 3. Quick Input Section (한 줄 퀵 추가) */}
      <div className="bg-slate-900/80 rounded-2xl p-3.5 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5 text-indigo-400" />
            차감 항목 추가
          </h4>
          <span className="text-[11px] text-slate-400">
            소비 항목은 플랜 한도로 잡힙니다
          </span>
        </div>

        {/* 한 줄 초고속 추가 */}
        <form onSubmit={handleQuickAddOneLiner} className="flex gap-2">
          <input
            type="text"
            value={quickOneLiner}
            onChange={(e) => setQuickOneLiner(e.target.value)}
            placeholder="예: ISA 100 또는 국민카드 40 소비"
            className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
          <button
            type="submit"
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shrink-0 transition active:scale-95 flex items-center gap-1"
          >
            <span>추가</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>

        {/* 또는 상세 폼 */}
        <div className="pt-1 border-t border-slate-800/80">
          <form onSubmit={handleAddManual} className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="항목명 (예: ISA 저금)"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
              <div className="relative">
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="금액"
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value.replace(/\D/g, ''))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
                <span className="absolute right-3 top-2 text-xs text-slate-400">만원</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              {/* Toggle Chip: 소비 vs 저축/고정 */}
              <button
                type="button"
                onClick={() => setNewIsSpending(!newIsSpending)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
                  newIsSpending
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'bg-slate-800 text-slate-400 border border-slate-700 hover:text-slate-200'
                }`}
              >
                {newIsSpending ? (
                  <>
                    <ShoppingBag className="w-3.5 h-3.5" />
                    <span>소비 예산 (플랜 한도 반영)</span>
                  </>
                ) : (
                  <>
                    <Landmark className="w-3.5 h-3.5" />
                    <span>저축 / 고정 차감</span>
                  </>
                )}
              </button>

              <button
                type="submit"
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition active:scale-95"
              >
                + 직접 등록
              </button>
            </div>
          </form>
        </div>

        {/* Quick Presets */}
        <div className="flex flex-wrap gap-1 pt-1">
          {PRESET_NAMES.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => {
                setNewName(preset);
                if (preset.includes('카드') || preset.includes('생활')) {
                  setNewIsSpending(true);
                } else {
                  setNewIsSpending(false);
                }
              }}
              className="px-2 py-0.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-[11px] border border-slate-800"
            >
              +{preset}
            </button>
          ))}
        </div>
      </div>

      {/* 4. Deductions List */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1 gap-2">
          <h4 className="text-xs font-bold text-slate-300 shrink-0">
            설정된 차감 목록 ({deductions.length}개)
          </h4>

          {/* Checklist Modal Trigger Button */}
          <button
            type="button"
            onClick={() => setIsChecklistModalOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-950/70 hover:bg-indigo-900/80 border border-indigo-500/40 text-xs font-medium text-indigo-300 transition active:scale-95 shrink-0"
          >
            <ListChecks className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span className="whitespace-nowrap">고정 처리 체크</span>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold whitespace-nowrap ${
                checklist.length > 0 && completedCheckCount === checklist.length
                  ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/40'
                  : 'bg-indigo-500/30 text-indigo-200 border border-indigo-500/40'
              }`}
            >
              {completedCheckCount}/{checklist.length}
            </span>
          </button>
        </div>

        {deductions.length === 0 ? (
          <div className="bg-slate-900/40 rounded-2xl p-6 border border-slate-800 text-center text-xs text-slate-400">
            차감 항목이 없습니다. 상단에서 ISA 저금, 카드 소비 등을 등록해 보세요!
          </div>
        ) : (
          <div className="space-y-2">
            {deductions.map((item) => (
              <div
                key={item.id}
                className="bg-slate-900/80 rounded-2xl p-3 border border-slate-800 hover:border-slate-700 transition flex items-center justify-between gap-3"
              >
                {/* Left: Type tag & Name */}
                <div className="flex items-center gap-2.5 min-w-0">
                  <button
                    type="button"
                    onClick={() => handleToggleSpending(item.id)}
                    className={`px-2 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition shrink-0 ${
                      item.isSpending
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/30'
                    }`}
                    title="클릭하여 소비/저축 전환"
                  >
                    {item.isSpending ? (
                      <>
                        <ShoppingBag className="w-3 h-3" />
                        <span>소비</span>
                      </>
                    ) : (
                      <>
                        <Landmark className="w-3 h-3" />
                        <span>저축·고정</span>
                      </>
                    )}
                  </button>

                  <span className="text-sm font-semibold text-white truncate">
                    {item.name}
                  </span>
                </div>

                {/* Right: Amount & Step adjustment & Delete */}
                <div className="flex items-center gap-2 shrink-0">
                  {/* Step Buttons */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleStepAmount(item.id, -10)}
                      className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-400"
                      title="-10만원"
                    >
                      -10
                    </button>
                    <button
                      onClick={() => handleStepAmount(item.id, 10)}
                      className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-400"
                      title="+10만원"
                    >
                      +10
                    </button>
                  </div>

                  {/* Amount display / inline edit */}
                  <div className="flex items-center gap-0.5">
                    <input
                      type="number"
                      value={item.amountManwon}
                      onChange={(e) => handleAmountChange(item.id, parseInt(e.target.value, 10) || 0)}
                      className="w-14 bg-slate-800 border border-slate-700 rounded-lg px-1.5 py-1 text-xs text-center font-bold text-white focus:outline-none focus:border-indigo-500"
                    />
                    <span className="text-xs text-slate-400">만</span>
                  </div>

                  {/* Delete button */}
                  <button
                    onClick={() => handleDeleteItem(item.id)}
                    className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg transition"
                    title="삭제"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 5. 이달의 고정 처리 체크리스트 모달 */}
      {isChecklistModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setIsChecklistModalOpen(false)}
          />

          {/* Bottom Sheet Container */}
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-2xl p-5 shadow-2xl z-10 max-h-[85vh] flex flex-col pb-safe">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 gap-2">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <div className="w-7 h-7 rounded-lg bg-indigo-600/30 text-indigo-400 flex items-center justify-center shrink-0">
                  <ListChecks className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span className="truncate">이달의 고정 처리</span>
                    <span
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap shrink-0 ${
                        checklist.length > 0 && completedCheckCount === checklist.length
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                          : 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30'
                      }`}
                    >
                      {completedCheckCount}/{checklist.length} 완료
                    </span>
                  </h3>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {checklist.length > 0 && (
                  <button
                    type="button"
                    onClick={handleResetAllChecks}
                    className="flex items-center gap-1 px-2 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 font-medium border border-slate-700 transition active:scale-95 whitespace-nowrap"
                    title="새 달 시작: 모든 항목의 체크를 해제합니다"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <span>전체 해제</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsChecklistModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
                  aria-label="닫기"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body (Scrollable) */}
            <div className="flex-1 overflow-y-auto space-y-3 pt-3">
              <p className="text-xs text-slate-400 leading-relaxed">
                소비를 제외한 월세, 청약, 적금, 공과금 납부를 체크하고 새 달에는 '전체 해제'로 새로 시작합니다.
              </p>

              {/* 차감 항목에서 가져오기 버튼 (소비 항목 제외) */}
              {deductions.filter((d) => !d.isSpending).length > 0 && (
                <div className="flex items-center justify-between bg-slate-800/40 p-2.5 rounded-xl border border-slate-800 text-xs gap-2">
                  <span className="text-slate-400 text-[11px]">
                    고정·저축 차감 항목을 가져올 수 있습니다.
                  </span>
                  <button
                    type="button"
                    onClick={handleImportFromDeductions}
                    className="px-2.5 py-1 bg-indigo-600/30 hover:bg-indigo-600/40 text-indigo-300 font-medium rounded-lg text-[11px] border border-indigo-500/30 transition shrink-0 whitespace-nowrap"
                  >
                    + 고정·저축 항목 가져오기
                  </button>
                </div>
              )}

              {/* 새 체크 항목 추가 폼 */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleAddChecklistItem();
                }}
                className="flex gap-2"
              >
                <input
                  type="text"
                  placeholder="고정 항목 (예: 월세 이체, 관리비 납부)"
                  value={newChecklistTitle}
                  onChange={(e) => setNewChecklistTitle(e.target.value)}
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="submit"
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shrink-0 transition active:scale-95 flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>추가</span>
                </button>
              </form>

              {/* 프리셋 칩 */}
              <div className="flex flex-wrap gap-1">
                {CHECKLIST_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handleAddChecklistItem(preset)}
                    className="px-2 py-0.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-[11px] border border-slate-800 transition"
                  >
                    +{preset}
                  </button>
                ))}
              </div>

              {/* 체크리스트 목록 */}
              {checklist.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500 bg-slate-950/30 rounded-xl border border-slate-800/60">
                  등록된 고정 처리 항목이 없습니다. 매달 꼭 해야 할 이체·결제 항목을 등록해 보세요.
                </div>
              ) : (
                <div className="space-y-1.5">
                  {checklist.map((item) => (
                    <div
                      key={item.id}
                      className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-all ${
                        item.isChecked
                          ? 'bg-slate-950/40 border-slate-800/50 opacity-60'
                          : 'bg-slate-800/70 border-slate-700/80 hover:border-slate-600'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => handleToggleCheck(item.id)}
                        className="flex items-center gap-2.5 min-w-0 flex-1 text-left active:scale-[0.99] transition"
                      >
                        {item.isChecked ? (
                          <CheckSquare className="w-5 h-5 text-emerald-400 shrink-0" />
                        ) : (
                          <Square className="w-5 h-5 text-slate-500 hover:text-slate-300 shrink-0" />
                        )}
                        <span
                          className={`text-xs font-medium truncate ${
                            item.isChecked
                              ? 'line-through text-slate-400'
                              : 'text-white'
                          }`}
                        >
                          {item.title}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteChecklistItem(item.id)}
                        className="p-1 text-slate-500 hover:text-rose-400 rounded-lg transition shrink-0"
                        title="삭제"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* 완료 축하 배너 */}
              {checklist.length > 0 && completedCheckCount === checklist.length && (
                <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-xs text-emerald-300 font-medium text-center">
                  이번 달 모든 고정 처리가 완료되었습니다. 다음 달에는 상단 '전체 해제'로 새로 시작하세요!
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsChecklistModalOpen(false)}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition active:scale-95"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
