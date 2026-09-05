import React, { useState } from 'react';
import { SalaryConfig, SalaryDeductionItem } from '../types';
import { PiggyBank, Plus, Trash2, ShoppingBag, Landmark, ArrowRight, Check, AlertCircle } from 'lucide-react';
import { formatCompactKRW, generateId } from '../utils/formatters';
import { calculateRemainingSalary, calculateSpendingLimitManwon, calculateTotalDeductions } from '../utils/storage';

interface SalaryRulesProps {
  config: SalaryConfig;
  currentPlannedDealsSpend: number; // in KRW (원)
  onUpdateConfig: (newConfig: SalaryConfig) => void;
}

const PRESET_NAMES = ['ISA 저금', '청약 저축', '국민카드', '신한카드', '고정지출(월세/공과)', '비상금'];

export const SalaryRules: React.FC<SalaryRulesProps> = ({
  config,
  currentPlannedDealsSpend,
  onUpdateConfig
}) => {
  const [baseSalaryInput, setBaseSalaryInput] = useState<string>(
    config.baseSalaryManwon ? String(config.baseSalaryManwon) : ''
  );
  const [payday, setPayday] = useState<number>(config.payday || 25);
  const [deductions, setDeductions] = useState<SalaryDeductionItem[]>(config.deductions || []);

  // Quick Add Form States
  const [quickOneLiner, setQuickOneLiner] = useState('');
  const [newName, setNewName] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newIsSpending, setNewIsSpending] = useState(false);

  React.useEffect(() => {
    setBaseSalaryInput(config.baseSalaryManwon ? String(config.baseSalaryManwon) : '');
    setPayday(config.payday || 25);
    setDeductions(config.deductions || []);
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

  return (
    <div className="space-y-4 pb-12">
      {/* 1. Top Card: Salary in Manwon */}
      <div className="bg-gradient-to-br from-slate-900 to-indigo-950/40 rounded-2xl p-4 border border-slate-800 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-600/30 text-indigo-400 flex items-center justify-center">
              <PiggyBank className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">월급 및 차감 룰</h3>
              <p className="text-[11px] text-slate-400">
                월급에서 저축·소비를 만원 단위로 차감하여 틀을 짭니다.
              </p>
            </div>
          </div>

          {/* Payday badge */}
          <div className="text-right">
            <label className="text-[10px] text-slate-400 block">급여일</label>
            <select
              value={payday}
              onChange={(e) => {
                const val = Number(e.target.value);
                setPayday(val);
                onUpdateConfig({ ...config, payday: val });
              }}
              className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs text-indigo-300 font-semibold focus:outline-none"
            >
              {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                <option key={d} value={d}>
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
        <div className="bg-slate-900/80 rounded-xl p-3 border border-indigo-500/30 text-xs space-y-1">
          <div className="flex items-center justify-between text-slate-300">
            <span className="flex items-center gap-1 font-semibold text-indigo-300">
              <ShoppingBag className="w-3.5 h-3.5 text-indigo-400" />
              이번 달 플랜 소비 현황
            </span>
            <span className="font-bold text-white">
              {formatCompactKRW(currentPlannedDealsSpend)} / {formatCompactKRW(spendingLimitWon)}
            </span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden mt-1">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                currentPlannedDealsSpend > spendingLimitWon
                  ? 'bg-rose-500'
                  : 'bg-indigo-500'
              }`}
              style={{
                width: `${Math.min(100, Math.round((currentPlannedDealsSpend / spendingLimitWon) * 100))}%`
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
        <h4 className="text-xs font-bold text-slate-300 px-1">
          설정된 차감 목록 ({deductions.length}개)
        </h4>

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
    </div>
  );
};
