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

export interface SalaryRuleItem {
  id: string;
  name: string; // e.g. "고정비", "저축/투자", "특가/쇼핑 예산", "자유 생활비"
  ratio: number; // 퍼센트 (e.g. 30%)
  color: string;
  description?: string;
}

export interface SalaryConfig {
  baseSalary: number; // 월급 (e.g. 3,000,000)
  payday: number; // 월급일 (1 ~ 31)
  rules: SalaryRuleItem[];
}

export interface AppState {
  deals: DealItem[];
  salaryConfig: SalaryConfig;
  quickTags: string[]; // 자주 쓰는 혜택 태그 목록
}
