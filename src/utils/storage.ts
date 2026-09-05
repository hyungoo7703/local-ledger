import { AppState, DealItem, SalaryConfig } from '../types';
import { getTodayString } from './formatters';

const STORAGE_KEY = 'LOCAL_LEDGER_DATA_V1';

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
  baseSalary: 3000000,
  payday: 25,
  rules: [
    {
      id: 'rule-fixed',
      name: '고정지출 (월세/공과/보험)',
      ratio: 30,
      color: '#64748b',
      description: '숨만 쉬어도 나가는 필수 고정비'
    },
    {
      id: 'rule-save',
      name: '저축 & 투자',
      ratio: 40,
      color: '#10b981',
      description: '미래를 위한 최우선 배분'
    },
    {
      id: 'rule-deal',
      name: '특가 & 혜택 소비 예산',
      ratio: 15,
      color: '#6366f1',
      description: '세일/이벤트 때 챙겨먹고 살 혜택 예산'
    },
    {
      id: 'rule-flex',
      name: '자유 생활비 / 식비',
      ratio: 15,
      color: '#f59e0b',
      description: '일상 식비 및 유동 지출'
    }
  ]
};

function getInitialSampleDeals(): DealItem[] {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');

  return [
    {
      id: 'sample-1',
      date: `${year}-${month}-05`,
      title: '네이버플러스 멤버십 데이 장보기',
      originalPrice: 45000,
      finalPrice: 35000,
      discountAmount: 10000,
      dealTag: '네이버페이',
      memo: '생필품 및 닭가슴살 포인트 1만원 적립 혜택',
      isCompleted: true,
      createdAt: Date.now() - 86400000 * 2
    },
    {
      id: 'sample-2',
      date: `${year}-${month}-15`,
      title: '버거킹 와퍼주니어 1+1 행사',
      originalPrice: 12000,
      finalPrice: 6000,
      discountAmount: 6000,
      dealTag: '카드청구할인',
      memo: '점심 약속 대용',
      isCompleted: false,
      createdAt: Date.now() - 86400000
    },
    {
      id: 'sample-3',
      date: `${year}-${month}-22`,
      title: '올리브영 정기세일 샴푸 & 스킨',
      originalPrice: 52000,
      finalPrice: 34000,
      discountAmount: 18000,
      dealTag: '올영세일',
      memo: '떨어져가는 생필품 이때 몰아서 구매',
      isCompleted: false,
      createdAt: Date.now()
    }
  ];
}

export function loadAppState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial: AppState = {
        deals: getInitialSampleDeals(),
        salaryConfig: DEFAULT_SALARY_CONFIG,
        quickTags: DEFAULT_QUICK_TAGS
      };
      saveAppState(initial);
      return initial;
    }
    const parsed = JSON.parse(raw) as AppState;
    if (!parsed.deals || !parsed.salaryConfig) {
      throw new Error('Invalid schema');
    }
    return parsed;
  } catch (err) {
    console.warn('Failed to load from localStorage, fallback to defaults', err);
    return {
      deals: getInitialSampleDeals(),
      salaryConfig: DEFAULT_SALARY_CONFIG,
      quickTags: DEFAULT_QUICK_TAGS
    };
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
  if (!Array.isArray(parsed.deals) || !parsed.salaryConfig?.rules) {
    throw new Error('유효하지 않은 가계부 백업 데이터 형식입니다.');
  }
  saveAppState(parsed);
  return parsed;
}

export function resetToDefault(): AppState {
  const initial: AppState = {
    deals: getInitialSampleDeals(),
    salaryConfig: DEFAULT_SALARY_CONFIG,
    quickTags: DEFAULT_QUICK_TAGS
  };
  saveAppState(initial);
  return initial;
}
