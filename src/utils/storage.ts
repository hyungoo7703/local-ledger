import { AppState, SalaryConfig } from '../types';

const STORAGE_KEY = 'LOCAL_LEDGER_DATA_V3';

export const DEFAULT_QUICK_TAGS = [
  '배민',
  '요기요',
  '네이버페이',
  '쿠팡',
  '올영세일',
  '통신사할인',
  '카드청구할인',
  '포인트소진'
];

export const DEFAULT_SALARY_CONFIG: SalaryConfig = {
  baseSalaryManwon: 0,
  payday: 25,
  deductions: []
};

export function calculateTotalDeductions(config: SalaryConfig): number {
  if (!config?.deductions) return 0;
  return config.deductions.reduce((sum, item) => sum + (Number(item.amountManwon) || 0), 0);
}

export function calculateRemainingSalary(config: SalaryConfig): number {
  if (!config) return 0;
  return (config.baseSalaryManwon || 0) - calculateTotalDeductions(config);
}

export function calculateSpendingLimitManwon(config: SalaryConfig): number {
  if (!config?.deductions) return 0;
  return config.deductions
    .filter((item) => item.isSpending)
    .reduce((sum, item) => sum + (Number(item.amountManwon) || 0), 0);
}

export function loadAppState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial: AppState = {
        deals: [],
        salaryConfig: DEFAULT_SALARY_CONFIG,
        quickTags: DEFAULT_QUICK_TAGS
      };
      saveAppState(initial);
      return initial;
    }
    const parsed = JSON.parse(raw) as AppState;
    if (!Array.isArray(parsed.deals) || !parsed.salaryConfig?.deductions) {
      throw new Error('Schema update needed');
    }
    return parsed;
  } catch (err) {
    console.warn('Initializing clean V3 state:', err);
    const initial: AppState = {
      deals: [],
      salaryConfig: DEFAULT_SALARY_CONFIG,
      quickTags: DEFAULT_QUICK_TAGS
    };
    saveAppState(initial);
    return initial;
  }
}

export function saveAppState(state: AppState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.error('Failed to save to localStorage', err);
  }
}

export function exportBackupJson(state: AppState): string {
  return JSON.stringify(state, null, 2);
}

export function importBackupJson(jsonStr: string): AppState {
  const parsed = JSON.parse(jsonStr) as AppState;
  if (!Array.isArray(parsed.deals) || !parsed.salaryConfig?.deductions) {
    throw new Error('유효하지 않은 가계부 백업 데이터 형식입니다.');
  }
  saveAppState(parsed);
  return parsed;
}

export function resetToDefault(): AppState {
  const initial: AppState = {
    deals: [],
    salaryConfig: DEFAULT_SALARY_CONFIG,
    quickTags: DEFAULT_QUICK_TAGS
  };
  saveAppState(initial);
  return initial;
}
