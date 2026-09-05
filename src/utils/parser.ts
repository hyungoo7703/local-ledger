export interface ParsedEntry {
  date?: string;
  title: string;
  finalPrice: number;
  discountAmount: number;
  dealTag: string;
}

const COMMON_TAGS = [
  '네이버페이', '배민', '요기요', '쿠팡', '올영', '올리브영',
  '통신사', 'SKT', 'KT', 'LGU+', '스타벅스', '버거킹',
  '맥도날드', 'GS25', 'CU', '토스', '신한', 'KB', '현대', '삼성'
];

/**
 * 자연어 한 줄 입력 파서
 * 예시 입력:
 * - "15일 와퍼세트 6900 배민할인 3000"
 * - "20일 올영 샴푸 15000 올영세일 5000"
 * - "치킨 18000 요기요 -4000"
 * - "버거킹 8000"
 */
export function parseQuickEntry(
  rawInput: string,
  targetYear: number,
  targetMonth: number
): ParsedEntry {
  let text = rawInput.trim();
  if (!text) {
    return { title: '', finalPrice: 0, discountAmount: 0, dealTag: '기타' };
  }

  // 1. 날짜 추출 (예: "15일", "3일", 또는 맨 앞의 숫자 1~31)
  let extractedDay: number | null = null;
  const dayMatch = text.match(/^(\d{1,2})일\s*/i) || text.match(/^(\d{1,2})\s+/);
  if (dayMatch) {
    const day = parseInt(dayMatch[1], 10);
    if (day >= 1 && day <= 31) {
      extractedDay = day;
      text = text.substring(dayMatch[0].length).trim();
    }
  }

  // 2. 할인 금액 명시 패턴 추출 (예: "할인 3000", "3000원 할인", "할인3000", "-3000")
  let discountAmount = 0;
  const explicitDiscountMatch = text.match(/(?:할인\s*[:=]?\s*|-)(\d+(?:,\d{3})*|\d+만)(?:원)?/i)
    || text.match(/(\d+(?:,\d{3})*|\d+만)(?:원)?\s*할인/i);

  if (explicitDiscountMatch) {
    discountAmount = parseAmount(explicitDiscountMatch[1]);
    text = text.replace(explicitDiscountMatch[0], ' ').trim();
  }

  // 3. 태그 추출 (일치하는 공통 태그 찾기)
  let dealTag = '';
  for (const tag of COMMON_TAGS) {
    const regex = new RegExp(`(^|\\s)(${tag})(\\s|$)`, 'i');
    if (regex.test(text)) {
      dealTag = tag;
      text = text.replace(regex, ' ').trim();
      break;
    }
  }

  // 4. 남은 숫자들 추출 (결제 금액 및 남은 할인금액 처리)
  const numberMatches = Array.from(text.matchAll(/(\d+(?:,\d{3})*|\d+만)(?:원)?/g));
  let finalPrice = 0;

  if (numberMatches.length > 0) {
    // 숫자가 2개 이상이고 아직 할인금액이 안 잡혔다면, 첫 번째는 결제금액, 두 번째는 할인금액일 가능성
    if (numberMatches.length >= 2 && discountAmount === 0) {
      const p1 = parseAmount(numberMatches[0][1]);
      const p2 = parseAmount(numberMatches[1][1]);
      finalPrice = p1;
      discountAmount = p2;
      // 텍스트에서 두 숫자 제거
      text = text.replace(numberMatches[0][0], ' ').replace(numberMatches[1][0], ' ').trim();
    } else {
      // 숫자 1개인 경우 -> 결제 금액
      finalPrice = parseAmount(numberMatches[0][1]);
      text = text.replace(numberMatches[0][0], ' ').trim();
    }
  }

  // 5. 남은 텍스트는 제목/품목
  let title = text.replace(/\s+/g, ' ').trim();
  if (!title && dealTag) {
    title = dealTag;
  } else if (!title) {
    title = '쇼핑/지출 플랜';
  }

  // 날짜 조합
  let formattedDate: string | undefined;
  if (extractedDay !== null) {
    formattedDate = `${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(extractedDay).padStart(2, '0')}`;
  }

  return {
    date: formattedDate,
    title,
    finalPrice,
    discountAmount,
    dealTag: dealTag || '기타'
  };
}

function parseAmount(str: string): number {
  if (!str) return 0;
  if (str.endsWith('만')) {
    const num = parseFloat(str.replace('만', '').trim());
    return Math.round(num * 10000);
  }
  return parseInt(str.replace(/,/g, '').trim(), 10) || 0;
}
