import { AppState, SalaryConfig } from '../types';

const STORAGE_KEY = 'LOCAL_LEDGER_DATA_V3';

export const DEFAULT_QUICK_TAGS = [
  '삼성LINK',
  'T-day',
  '신한Tops',
  '네이버페이',
  '배민',
  '요기요',
  '쿠팡',
  '올영세일',
  '카드청구할인',
  '포인트적립'
];

export const DEFAULT_SALARY_CONFIG: SalaryConfig = {
  baseSalaryManwon: 0,
  payday: 25,
  deductions: [],
  checklist: []
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
    if (!parsed.salaryConfig.checklist) {
      parsed.salaryConfig.checklist = [];
    }
    const deals = (parsed.deals || []).map((d: any) => ({
      id: String(d.id || Date.now() + Math.random()),
      date: String(d.date || ''),
      title: String(d.title || '플랜'),
      finalPrice: Number(d.finalPrice) || 0,
      benefitType: (d.benefitType === 'bill_discount' || d.benefitType === 'point_reward')
        ? d.benefitType
        : (d.discountAmount ? 'bill_discount' : 'instant'),
      benefitAmount: Number(d.benefitAmount ?? d.discountAmount ?? 0),
      dealTag: String(d.dealTag || '기타'),
      memo: d.memo ? String(d.memo) : '',
      isCompleted: Boolean(d.isCompleted),
      createdAt: Number(d.createdAt || Date.now())
    }));
    return { ...parsed, deals };
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
  let parsed: any;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    throw new Error('올바른 JSON 데이터 형식이 아닙니다.');
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('유효하지 않은 가계부 백업 데이터입니다.');
  }

  // 1. Deals 복원 (혜택 및 즉시할인 호환 복원)
  const deals = Array.isArray(parsed.deals)
    ? parsed.deals.map((d: any) => ({
        id: String(d.id || Date.now() + Math.random()),
        date: String(d.date || ''),
        title: String(d.title || '플랜'),
        finalPrice: Number(d.finalPrice) || 0,
        benefitType: (d.benefitType === 'bill_discount' || d.benefitType === 'point_reward')
          ? d.benefitType
          : (d.discountAmount ? 'bill_discount' : 'instant'),
        benefitAmount: Number(d.benefitAmount ?? d.discountAmount ?? 0),
        dealTag: String(d.dealTag || '기타'),
        memo: d.memo ? String(d.memo) : '',
        isCompleted: Boolean(d.isCompleted),
        createdAt: Number(d.createdAt || Date.now())
      }))
    : [];

  // 2. SalaryConfig 복원 (만원 단위 월급, 차감 룰, 고정 체크리스트 완벽 복원)
  const salaryConfig: SalaryConfig = {
    baseSalaryManwon: Number(parsed.salaryConfig?.baseSalaryManwon) || 0,
    payday: Number(parsed.salaryConfig?.payday) || 25,
    deductions: Array.isArray(parsed.salaryConfig?.deductions)
      ? parsed.salaryConfig.deductions.map((d: any) => ({
          id: String(d.id || Date.now() + Math.random()),
          name: String(d.name || '차감 항목'),
          amountManwon: Number(d.amountManwon) || 0,
          isSpending: Boolean(d.isSpending)
        }))
      : [],
    checklist: Array.isArray(parsed.salaryConfig?.checklist)
      ? parsed.salaryConfig.checklist.map((c: any) => ({
          id: String(c.id || Date.now() + Math.random()),
          title: String(c.title || ''),
          isChecked: Boolean(c.isChecked)
        }))
      : []
  };

  // 3. QuickTags 복원
  const quickTags = Array.isArray(parsed.quickTags) && parsed.quickTags.length > 0
    ? parsed.quickTags
    : DEFAULT_QUICK_TAGS;

  const importedState: AppState = {
    deals,
    salaryConfig,
    quickTags
  };

  saveAppState(importedState);
  return importedState;
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
