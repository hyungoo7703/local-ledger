import { AppState, BenefitType, DealItem, PayMethod, SalaryConfig, isBenefitType } from '../types';

const STORAGE_KEY = 'LOCAL_LEDGER_DATA_V3';
const BROKEN_KEY_PREFIX = 'LOCAL_LEDGER_BROKEN_';
const PREIMPORT_KEY_PREFIX = 'LOCAL_LEDGER_PREIMPORT_';
const MAX_SNAPSHOTS = 5;

const BACKUP_APP_ID = 'local-ledger';
const BACKUP_SCHEMA_VERSION = 5;

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

/**
 * 저장된 값이 무엇이든 'credit'이 아니면 계좌/체크로 본다.
 * 결제 수단이 없던 시절의 기록은 전부 계좌로 넘어온다. 근거 없이 신용으로 찍으면
 * 지난 달들이 한꺼번에 한도 초과로 보여서 경고가 의미를 잃는다.
 */
export function toPayMethod(value: unknown): PayMethod {
  return value === 'credit' ? 'credit' : 'debit';
}

/**
 * 저장된 혜택 유형을 읽는다 (저장소와 백업이 같이 쓴다).
 * 'instant'이거나 모르는 값이면 예전과 똑같이 옛 형식의 discountAmount를 보고 정한다.
 * 목록 검사를 빼먹으면 새 유형(cashback)이 불러올 때마다 'instant'로 바뀌어 혜택이 예산에서 사라진다.
 */
export function toBenefitType(deal: any): BenefitType {
  if (isBenefitType(deal?.benefitType) && deal.benefitType !== 'instant') return deal.benefitType;
  return deal?.discountAmount ? 'bill_discount' : 'instant';
}

/**
 * 신용 한도는 한계 소비 안쪽에서만 유효하다.
 * 소비 항목을 줄이면 한도가 저절로 따라 내려와야 하므로, 저장값을 믿지 않고 읽을 때마다 자른다.
 */
export function calculateCreditLimitManwon(config: SalaryConfig): number {
  const raw = Number(config?.creditLimitManwon) || 0;
  if (raw <= 0) return 0;
  return Math.min(Math.round(raw), calculateSpendingLimitManwon(config));
}

/**
 * 신용으로 잡은 결제(승인) 금액의 합. 청구할인은 여기서 빼지 않고 한도 쪽에 더한다
 * (한계 소비 예산이 '소비는 그대로, 예산은 혜택만큼 늘림'으로 보여주는 것과 같은 방식).
 */
export function calculateCreditSpendWon(deals: DealItem[]): number {
  return deals
    .filter((d) => d.payMethod === 'credit')
    .reduce((sum, d) => sum + (Number(d.finalPrice) || 0), 0);
}

/**
 * 이 건이 다음 달 카드값을 실제로 줄이는 금액.
 * 신용 + 청구할인일 때만 카드사가 카드값에서 직접 빼준다. 포인트 적립은 카드값을 줄이지 않고,
 * 계좌/체크 건의 혜택은 카드와 무관하다. 결제 금액보다 큰 할인은 있을 수 없으므로 결제 금액에서 자른다.
 */
export function creditBillDiscountOf(deal: DealItem): number {
  if (deal.payMethod !== 'credit' || deal.benefitType !== 'bill_discount') return 0;
  return Math.min(Number(deal.benefitAmount) || 0, Number(deal.finalPrice) || 0);
}

/** 신용 한도를 늘려주는 청구할인의 합 */
export function calculateCreditBillDiscountWon(deals: DealItem[]): number {
  return deals.reduce((sum, d) => sum + creditBillDiscountOf(d), 0);
}

function createInitialState(): AppState {
  return {
    deals: [],
    salaryConfig: { ...DEFAULT_SALARY_CONFIG, deductions: [], checklist: [] },
    quickTags: [...DEFAULT_QUICK_TAGS]
  };
}

export interface StateSnapshot {
  key: string;
  kind: 'broken' | 'preimport';
  savedAt: number;
  size: number;
}

// localStorage is the only copy of the user's ledger, so anything about to be
// discarded (unreadable data, or data replaced by an import) is set aside first.
function archiveRaw(prefix: string, raw: string): void {
  try {
    // 같은 밀리초에 두 번 저장해도 서로 덮어쓰지 않도록 임의 접미사를 붙인다.
    const key = `${prefix}${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    localStorage.setItem(key, raw);
    for (const stale of listSnapshots().slice(MAX_SNAPSHOTS)) {
      localStorage.removeItem(stale.key);
    }
  } catch (err) {
    console.error('Failed to archive state', err);
  }
}

export function listSnapshots(): StateSnapshot[] {
  const snapshots: StateSnapshot[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      const prefix = key?.startsWith(BROKEN_KEY_PREFIX)
        ? BROKEN_KEY_PREFIX
        : key?.startsWith(PREIMPORT_KEY_PREFIX)
        ? PREIMPORT_KEY_PREFIX
        : null;
      if (!key || !prefix) continue;
      snapshots.push({
        key,
        kind: prefix === BROKEN_KEY_PREFIX ? 'broken' : 'preimport',
        savedAt: Number(key.slice(prefix.length).split('_')[0]) || 0,
        size: localStorage.getItem(key)?.length ?? 0
      });
    }
  } catch (err) {
    console.error('Failed to list snapshots', err);
  }
  return snapshots.sort((a, b) => b.savedAt - a.savedAt || b.key.localeCompare(a.key));
}

export function readSnapshot(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function deleteSnapshot(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch (err) {
    console.error('Failed to delete snapshot', err);
  }
}

export function loadAppState(): AppState {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch (err) {
    console.error('localStorage is unavailable', err);
    return createInitialState();
  }

  if (!raw) {
    const initial = createInitialState();
    saveAppState(initial);
    return initial;
  }

  try {
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
      payMethod: toPayMethod(d.payMethod),
      benefitType: toBenefitType(d),
      benefitAmount: Number(d.benefitAmount ?? d.discountAmount ?? 0),
      dealTag: String(d.dealTag || '기타'),
      memo: d.memo ? String(d.memo) : '',
      isCompleted: Boolean(d.isCompleted),
      createdAt: Number(d.createdAt || Date.now())
    }));
    return { ...parsed, deals };
  } catch (err) {
    console.warn('Quarantining unreadable state:', err);
    archiveRaw(BROKEN_KEY_PREFIX, raw);
    const initial = createInitialState();
    saveAppState(initial);
    return initial;
  }
}

export function saveAppState(state: AppState): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch (err) {
    console.error('Failed to save to localStorage', err);
    return false;
  }
}

export function exportBackupJson(state: AppState): string {
  const backup = {
    app: BACKUP_APP_ID,
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    ...state
  };
  return JSON.stringify(backup, null, 2);
}

export interface BackupSummary {
  dealCount: number;
  deductionCount: number;
  checklistCount: number;
  baseSalaryManwon: number;
  exportedAt?: string;
}

export function summarizeState(state: AppState, exportedAt?: string): BackupSummary {
  return {
    dealCount: state.deals.length,
    deductionCount: state.salaryConfig.deductions.length,
    checklistCount: state.salaryConfig.checklist?.length ?? 0,
    baseSalaryManwon: state.salaryConfig.baseSalaryManwon,
    exportedAt
  };
}

/**
 * 백업 JSON을 검증 및 정규화만 한다. 저장은 applyImportedState에서 별도로 수행하므로
 * 사용자가 확인하기 전에 기존 데이터가 덮어써지지 않는다.
 */
export function parseBackupJson(jsonStr: string): { state: AppState; summary: BackupSummary } {
  let parsed: any;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    throw new Error('올바른 JSON 형식이 아닙니다. 백업 파일이 맞는지 확인해 주세요.');
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('가계부 백업 데이터가 아닙니다.');
  }

  if (parsed.app && parsed.app !== BACKUP_APP_ID) {
    throw new Error(`다른 앱의 백업 파일입니다: "${String(parsed.app).slice(0, 30)}"`);
  }

  // 가계부 백업이라면 반드시 갖는 형태. 엉뚱한 JSON을 통과시켜 기존 기록을
  // 빈 상태로 덮어쓰는 사고를 막는다.
  if (!Array.isArray(parsed.deals)) {
    throw new Error('가계부 백업 형식이 아닙니다. 플랜 목록(deals)을 찾을 수 없습니다.');
  }
  if (!parsed.salaryConfig || typeof parsed.salaryConfig !== 'object') {
    throw new Error('가계부 백업 형식이 아닙니다. 월급 설정(salaryConfig)을 찾을 수 없습니다.');
  }

  // 1. Deals 복원 (혜택 및 즉시할인 호환 복원)
  const deals = Array.isArray(parsed.deals)
    ? parsed.deals.map((d: any) => ({
        id: String(d.id || Date.now() + Math.random()),
        date: String(d.date || ''),
        title: String(d.title || '플랜'),
        finalPrice: Number(d.finalPrice) || 0,
        payMethod: toPayMethod(d.payMethod),
        benefitType: toBenefitType(d),
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
      : [],
    creditLimitManwon: Math.max(0, Math.round(Number(parsed.salaryConfig?.creditLimitManwon) || 0))
  };

  // 3. QuickTags 복원 (문자열만 통과)
  const cleanTags = Array.isArray(parsed.quickTags)
    ? parsed.quickTags
        .filter((t: unknown): t is string => typeof t === 'string' && t.trim() !== '')
        .map((t: string) => t.trim())
    : [];

  const state: AppState = {
    deals,
    salaryConfig,
    quickTags: cleanTags.length > 0 ? cleanTags : [...DEFAULT_QUICK_TAGS]
  };

  const exportedAt = typeof parsed.exportedAt === 'string' ? parsed.exportedAt : undefined;
  return { state, summary: summarizeState(state, exportedAt) };
}

/** 복원 적용. 교체될 기존 데이터를 먼저 스냅샷으로 남긴다. */
export function applyImportedState(state: AppState): void {
  let current: string | null = null;
  try {
    current = localStorage.getItem(STORAGE_KEY);
  } catch (err) {
    console.error('Failed to read current state before import', err);
  }
  if (current) archiveRaw(PREIMPORT_KEY_PREFIX, current);

  if (!saveAppState(state)) {
    throw new Error('저장소에 쓰지 못했습니다. 저장 공간이 가득 찼거나 브라우저가 저장을 차단하고 있습니다.');
  }
}

export function resetToDefault(): AppState {
  let current: string | null = null;
  try {
    current = localStorage.getItem(STORAGE_KEY);
  } catch (err) {
    console.error('Failed to read current state before reset', err);
  }
  if (current) archiveRaw(PREIMPORT_KEY_PREFIX, current);

  const initial = createInitialState();
  saveAppState(initial);
  return initial;
}
