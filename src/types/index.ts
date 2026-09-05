export interface DealItem {
  id: string;
  date: string; // YYYY-MM-DD
  title: string; // e.g. "와퍼 주니어 세트", "올리브영 샴푸"
  originalPrice?: number; // 정가
  finalPrice: number; // 실제 결제/예정 금액
  discountAmount: number; // 아낀 금액 (할인액)
  dealTag: string; // e.g. "배민", "네이버페이", "올영세일", "통신사", "카드청구"
  memo?: string;
  isCompleted: boolean; // 실제 구매 완료 여부
  createdAt: number;
}

export interface SalaryDeductionItem {
  id: string;
  name: string; // e.g. "ISA 저금", "국민카드", "청약", "고정지출"
  amountManwon: number; // 만원 단위 (e.g. 100 = 100만원, 40 = 40만원)
  isSpending: boolean; // 소비(한계소비) 항목 여부 (true: 플랜의 한계소비 기준)
}

export interface SalaryConfig {
  baseSalaryManwon: number; // 월급 실수령액 (만원 단위, e.g. 300 = 300만원)
  payday: number; // 월급일 (1 ~ 31)
  deductions: SalaryDeductionItem[]; // 만원단위 차감 항목 리스트
}

export interface AppState {
  deals: DealItem[];
  salaryConfig: SalaryConfig;
  quickTags: string[]; // 자주 쓰는 혜택 태그 목록
}
