import { AppState, SalaryConfig } from '../types';

const STORAGE_KEY = 'LOCAL_LEDGER_DATA_V3';
const BROKEN_KEY_PREFIX = 'LOCAL_LEDGER_BROKEN_';
const PREIMPORT_KEY_PREFIX = 'LOCAL_LEDGER_PREIMPORT_';
const MAX_SNAPSHOTS = 5;

const BACKUP_APP_ID = 'local-ledger';
const BACKUP_SCHEMA_VERSION = 3;

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
