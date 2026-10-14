// 혜택 유형은 이 목록 하나로 정의한다. 저장소·백업·AI가 모두 이 목록으로 값을 검증하므로,
// 여기 없는 값은 불러올 때 'instant'로 바뀐다. 유형을 추가하면 반드시 여기에 넣는다.
export const BENEFIT_TYPES = ['instant', 'bill_discount', 'point_reward', 'cashback'] as const;
export type BenefitType = (typeof BENEFIT_TYPES)[number];
// instant(화면 표기 '일반'): 혜택 없음, 또는 쿠폰·즉시할인처럼 결제 금액에 이미 반영된 것 -> 결제 금액만 소비로 차감
// bill_discount: 결제일(청구) 할인 -> 한계 예산 증가. 신용 결제면 카드값이 실제로 줄어 신용 한도도 증가
// point_reward: 포인트 적립 -> 한계 예산 증가. 카드값은 그대로
// cashback: 캐시백·페이백 -> 한계 예산 증가. 카드값은 그대로 (계산은 point_reward와 같고 표기만 다르다)

export function isBenefitType(value: unknown): value is BenefitType {
  return (BENEFIT_TYPES as readonly unknown[]).includes(value);
}

export type PayMethod = 'debit' | 'credit';
// debit: 계좌/체크 -> 통장에서 바로 빠진다
// credit: 신용 -> 다음 달 카드값으로 청구된다. 한계 소비와 별개로 상한을 따로 둔다

export interface DealItem {
  id: string;
  date: string; // YYYY-MM-DD
  title: string; // e.g. "빕스 Tday", "버거킹 Tops쿠폰", "멸치국수 삼성LINK"
  finalPrice: number; // 실제 결제(승인) 금액 (원 단위)
  payMethod: PayMethod; // 계좌/체크 vs 신용
  benefitType: BenefitType; // 혜택 유형
  benefitAmount: number; // 결제일 할인액 또는 포인트 적립액 (원 단위, 예산 복원 효과)
  dealTag: string; // e.g. "삼성LINK", "Tday", "신한Tops", "네이버페이"
  memo?: string;
  isCompleted: boolean; // 실제 구매/체크 완료 여부
  createdAt: number;
}

export interface SalaryDeductionItem {
  id: string;
  name: string; // e.g. "ISA 저금", "국민카드", "청약", "고정지출"
  amountManwon: number; // 만원 단위 (e.g. 100 = 100만원, 40 = 40만원)
  isSpending: boolean; // 소비(한계소비) 항목 여부 (true: 플랜의 한계소비 기준)
}

export interface MonthlyChecklistItem {
  id: string;
  title: string; // e.g. "월세 이체", "청약 납부", "ISA 입금"
  isChecked: boolean; // 이달 처리 완료 여부
}

export interface SalaryConfig {
  baseSalaryManwon: number; // 월급 실수령액 (만원 단위, e.g. 300 = 300만원)
  payday: number; // 월급일 (1 ~ 31)
  deductions: SalaryDeductionItem[]; // 만원단위 차감 항목 리스트
  checklist?: MonthlyChecklistItem[]; // 이달의 고정 처리 체크리스트
  // 신용카드로 쓸 수 있는 상한 (만원). 한계 소비 안쪽에서만 설정 가능하고,
  // 혜택으로 한계 소비가 늘어도 이 값은 따라 늘지 않는다.
  creditLimitManwon?: number;
}

export interface AppState {
  deals: DealItem[];
  salaryConfig: SalaryConfig;
  quickTags: string[]; // 자주 쓰는 혜택 태그 목록
}
