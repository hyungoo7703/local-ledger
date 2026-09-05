export type BenefitType = 'instant' | 'bill_discount' | 'point_reward';
// instant: 결제 전 즉시할인(쿠폰/세일) -> 최종 결제금액만 소비로 차감
// bill_discount: 결제일(청구) 할인 -> 결제금액은 그대로지만 결제일 할인으로 한계 예산 증가/실질소비 차감
// point_reward: 포인트/캐시백 적립 -> 결제금액은 그대로지만 포인트 적립으로 한계 예산 증가/실질소비 차감

export interface DealItem {
  id: string;
  date: string; // YYYY-MM-DD
  title: string; // e.g. "빕스 Tday", "버거킹 Tops쿠폰", "멸치국수 삼성LINK"
  finalPrice: number; // 실제 결제(승인) 금액 (원 단위)
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
}

export interface AppState {
  deals: DealItem[];
  salaryConfig: SalaryConfig;
  quickTags: string[]; // 자주 쓰는 혜택 태그 목록
}
