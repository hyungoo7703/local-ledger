export function formatKRW(amount: number): string {
  return new Intl.NumberFormat('ko-KR').format(amount) + '원';
}

export function formatCompactKRW(amount: number): string {
  if (amount >= 100000000) {
    const eok = Math.floor(amount / 100000000);
    const man = Math.round((amount % 100000000) / 10000);
    return man > 0 ? `${eok}억 ${man}만원` : `${eok}억원`;
  }
  if (amount >= 10000) {
    const man = Math.floor(amount / 10000);
    const rest = amount % 10000;
    return rest > 0 ? `${man}만 ${new Intl.NumberFormat('ko-KR').format(rest)}원` : `${man}만원`;
  }
  return formatKRW(amount);
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
}

export function getTodayString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatMonthDisplay(year: number, month: number): string {
  return `${year}년 ${month}월`;
}

export function parseYearMonth(yearMonthStr: string): { year: number; month: number } {
  const [y, m] = yearMonthStr.split('-').map(Number);
  return { year: y, month: m };
}
