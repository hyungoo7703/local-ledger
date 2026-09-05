import React, { useState } from 'react';
import { SalaryConfig, SalaryRuleItem } from '../types';
import { PiggyBank, Plus, Trash2, AlertCircle, Check, Info } from 'lucide-react';
import { formatCompactKRW, formatKRW, generateId } from '../utils/formatters';

interface SalaryRulesProps {
  config: SalaryConfig;
  currentPlannedDealsSpend: number;
  onUpdateConfig: (newConfig: SalaryConfig) => void;
}

export const SalaryRules: React.FC<SalaryRulesProps> = ({
  config,
  currentPlannedDealsSpend,
  onUpdateConfig
}) => {
  const [baseSalaryInput, setBaseSalaryInput] = useState<string>(String(config.baseSalary));
  const [payday, setPayday] = useState<number>(config.payday || 25);
  const [rules, setRules] = useState<SalaryRuleItem[]>(config.rules);

  const totalRatio = rules.reduce((sum, r) => sum + (Number(r.ratio) || 0), 0);
  const isRatioValid = totalRatio === 100;

  const handleSalaryBlur = () => {
    const parsed = parseInt(baseSalaryInput.replace(/\D/g, ''), 10) || 0;
    const updated = { ...config, baseSalary: parsed, payday, rules };
    onUpdateConfig(updated);
  };

  const handleRatioChange = (id: string, newRatio: number) => {
    const updatedRules = rules.map((r) =>
      r.id === id ? { ...r, ratio: Math.max(0, Math.min(100, newRatio)) } : r
    );
    setRules(updatedRules);
    onUpdateConfig({ ...config, baseSalary: config.baseSalary, payday, rules: updatedRules });
  };

  const handleAddRule = () => {
    const newRule: SalaryRuleItem = {
      id: generateId(),
      name: '새 항목',
      ratio: 10,
      color: '#a855f7',
      description: '추가 배분 항목'
    };
    const updated = [...rules, newRule];
    setRules(updated);
    onUpdateConfig({ ...config, rules: updated });
  };

  const handleDeleteRule = (id: string) => {
    if (rules.length <= 1) {
      alert('최소 1개 이상의 분배 규칙이 필요합니다.');
      return;
    }
    const updated = rules.filter((r) => r.id !== id);
    setRules(updated);
    onUpdateConfig({ ...config, rules: updated });
  };

  // Find the deal/shopping rule
  const dealRule = rules.find((r) => r.name.includes('특가') || r.name.includes('혜택') || r.name.includes('쇼핑')) || rules[2];
  const dealBudget = dealRule ? Math.round((config.baseSalary * dealRule.ratio) / 100) : 0;
  const remainingDealBudget = dealBudget - currentPlannedDealsSpend;

  return (
    <div className="space-y-4 pb-12">
      {/* Top Card: Base Salary */}
      <div className="bg-gradient-to-br from-slate-900 to-indigo-950/40 rounded-2xl p-4 border border-slate-800 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-600/30 text-indigo-400 flex items-center justify-center">
              <PiggyBank className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">월급 기본 분배 규칙</h3>
              <p className="text-[11px] text-slate-400">
                수입이 들어오면 어디에 얼마를 쓸지 기준을 세워둡니다.
              </p>
            </div>
          </div>

          {/* Payday badge */}
          <div className="text-right">
            <label className="text-[10px] text-slate-400 block">매월 급여일</label>
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

        {/* Base Salary Input */}
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">
            월 실수령액 (기준 예산)
          </label>
          <div className="relative">
            <input
              type="text"
              inputMode="numeric"
              value={Number(baseSalaryInput).toLocaleString()}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '');
                setBaseSalaryInput(val);
              }}
              onBlur={handleSalaryBlur}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-base font-extrabold text-white focus:outline-none focus:border-indigo-500"
            />
            <span className="absolute right-3 top-3 text-xs text-slate-400">원</span>
          </div>

          {/* Quick Add Buttons */}
          <div className="flex gap-1.5 mt-2">
            {[100000, 500000, 1000000].map((addVal) => (
              <button
                key={addVal}
                type="button"
                onClick={() => {
                  const current = parseInt(baseSalaryInput.replace(/\D/g, ''), 10) || 0;
                  const next = current + addVal;
                  setBaseSalaryInput(String(next));
                  onUpdateConfig({ ...config, baseSalary: next, payday, rules });
                }}
                className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 text-xs hover:bg-slate-700 transition"
              >
                +{formatCompactKRW(addVal)}
              </button>
            ))}
          </div>
        </div>

        {/* Deal Budget Alert Banner */}
        {dealRule && (
          <div className="bg-indigo-950/40 rounded-xl p-3 border border-indigo-500/30 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
            <div className="text-xs">
              <div className="text-indigo-200 font-semibold">
                {dealRule.name} 배분액: {formatKRW(dealBudget)} ({dealRule.ratio}%)
              </div>
              <p className="text-slate-400 mt-0.5">
                이번 달 등록한 특가 플랜 ({formatKRW(currentPlannedDealsSpend)}) 대비{' '}
                <strong className={remainingDealBudget >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                  {remainingDealBudget >= 0
                    ? `${formatKRW(remainingDealBudget)} 여유가 있습니다.`
                    : `${formatKRW(Math.abs(remainingDealBudget))} 초과되었습니다!`}
                </strong>
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Distribution Rules List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-1.5">
            <h4 className="text-xs font-bold text-slate-300">카테고리별 분배율</h4>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                isRatioValid
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
              }`}
            >
              합계 {totalRatio}% {isRatioValid ? '(완벽)' : '(100%로 맞춰주세요)'}
            </span>
          </div>

          <button
            onClick={handleAddRule}
            className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" /> 항목 추가
          </button>
        </div>

        {/* Ratio Combined Progress Bar */}
        <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden flex shadow-inner">
          {rules.map((rule) => (
            <div
              key={rule.id}
              style={{
                width: `${rule.ratio}%`,
                backgroundColor: rule.color
              }}
              title={`${rule.name}: ${rule.ratio}%`}
              className="h-full transition-all duration-300 first:rounded-l-full last:rounded-r-full"
            />
          ))}
        </div>

        {/* Cards for each rule */}
        <div className="space-y-2.5">
          {rules.map((rule) => {
            const calculatedAmount = Math.round((config.baseSalary * rule.ratio) / 100);

            return (
              <div
                key={rule.id}
                className="bg-slate-900/80 rounded-2xl p-3.5 border border-slate-800 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: rule.color }}
                    />
                    <input
                      type="text"
                      value={rule.name}
                      onChange={(e) => {
                        const updated = rules.map((r) =>
                          r.id === rule.id ? { ...r, name: e.target.value } : r
                        );
                        setRules(updated);
                        onUpdateConfig({ ...config, rules: updated });
                      }}
                      className="bg-transparent text-sm font-bold text-white border-b border-transparent hover:border-slate-700 focus:border-indigo-500 focus:outline-none transition py-0.5"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-indigo-300">
                      {formatCompactKRW(calculatedAmount)}
                    </span>
                    <button
                      onClick={() => handleDeleteRule(rule.id)}
                      className="text-slate-600 hover:text-rose-400 p-1 transition"
                      title="삭제"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Slider and Ratio Input */}
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={rule.ratio}
                    onChange={(e) => handleRatioChange(rule.id, Number(e.target.value))}
                    className="flex-1 accent-indigo-500 h-2 bg-slate-800 rounded-lg cursor-pointer"
                  />
                  <div className="flex items-center gap-1 w-14 shrink-0">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={rule.ratio}
                      onChange={(e) => handleRatioChange(rule.id, Number(e.target.value))}
                      className="w-10 bg-slate-800 border border-slate-700 rounded-lg px-1.5 py-0.5 text-xs text-center font-bold text-white focus:outline-none focus:border-indigo-500"
                    />
                    <span className="text-xs text-slate-400">%</span>
                  </div>
                </div>

                {/* Description or memo */}
                <input
                  type="text"
                  placeholder="항목 설명 (예: 저축, 투자, 비상금)"
                  value={rule.description || ''}
                  onChange={(e) => {
                    const updated = rules.map((r) =>
                      r.id === rule.id ? { ...r, description: e.target.value } : r
                    );
                    setRules(updated);
                    onUpdateConfig({ ...config, rules: updated });
                  }}
                  className="w-full bg-slate-950/40 text-[11px] text-slate-400 px-2 py-1 rounded-lg border border-slate-800 focus:outline-none focus:border-slate-700"
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
