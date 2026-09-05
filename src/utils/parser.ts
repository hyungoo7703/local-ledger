import { BenefitType } from '../types';

export interface ParsedEntry {
  date?: string;
  title: string;
  finalPrice: number;
  benefitType: BenefitType;
  benefitAmount: number;
  dealTag: string;
}

const COMMON_TAGS = [
  '삼성LINK', '신한Tops', 'Tday', 'T-day', 'LINK', 'Tops',
  '네이버페이', '배민', '요기요', '쿠팡', '올영', '올리브영',
  '통신사', 'SKT', 'KT', 'LGU+', '스타벅스', '버거킹',
  '맥도날드', 'GS25', 'CU', '토스', '신한', 'KB', '현대', '삼성'
];

/**
 * 자연어 한 줄 입력 파서
 * 예시 입력:
 * - "15일 멸치국수 12000 삼성LINK 청구할인 2000"
 * - "20일 빕스 60000 Tday 적립 24000"
 * - "버거킹 15000 Tops쿠폰"
 */
export function parseQuickEntry(
  rawInput: string,
  targetYear: number,
  targetMonth: number
): ParsedEntry {
  let text = rawInput.trim();
  if (!text) {
    return {
      title: '',
      finalPrice: 0,
      benefitType: 'instant',
      benefitAmount: 0,
      dealTag: '기타'
    };
  }

  // 혜택 유형 감지
  let benefitType: BenefitType = 'instant';
  if (/적립|캐시백|포인트|페이백/i.test(text)) {
    benefitType = 'point_reward';
  } else if (/청구|결제일|LINK|링크/i.test(text)) {
    benefitType = 'bill_discount';
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

  // 2. 할인/적립 금액 명시 패턴 추출 (예: "청구할인 2000", "적립 24000", "할인 3000", "-3000")
  let benefitAmount = 0;
  const explicitBenefitMatch = text.match(/(?:청구할인|결제일할인|적립|캐시백|할인\s*[:=]?\s*|-)(\d+(?:,\d{3})*|\d+만)(?:원)?/i)
    || text.match(/(\d+(?:,\d{3})*|\d+만)(?:원)?\s*(?:청구할인|적립|캐시백|할인)/i);

  if (explicitBenefitMatch) {
    benefitAmount = parseAmount(explicitBenefitMatch[1]);
    if (benefitType === 'instant' && !/즉시|쿠폰/.test(explicitBenefitMatch[0])) {
      benefitType = 'bill_discount';
    }
    text = text.replace(explicitBenefitMatch[0], ' ').trim();
  }

  // 3. 태그 추출
  let dealTag = '';
  for (const tag of COMMON_TAGS) {
    const regex = new RegExp(`(^|\\s)(${tag})(\\s|$)`, 'i');
    if (regex.test(text)) {
      dealTag = tag;
      text = text.replace(regex, ' ').trim();
      break;
    }
  }

  // 4. 남은 숫자들 추출 (결제 금액 및 남은 혜택금액 처리)
  const numberMatches = Array.from(text.matchAll(/(\d+(?:,\d{3})*|\d+만)(?:원)?/g));
  let finalPrice = 0;

  if (numberMatches.length > 0) {
    if (numberMatches.length >= 2 && benefitAmount === 0) {
      const p1 = parseAmount(numberMatches[0][1]);
      const p2 = parseAmount(numberMatches[1][1]);
      finalPrice = p1;
      benefitAmount = p2;
      if (benefitType === 'instant') benefitType = 'bill_discount';
      text = text.replace(numberMatches[0][0], ' ').replace(numberMatches[1][0], ' ').trim();
    } else {
      finalPrice = parseAmount(numberMatches[0][1]);
      text = text.replace(numberMatches[0][0], ' ').trim();
    }
  }

  // 5. 남은 텍스트는 제목
  let title = text.replace(/\s+/g, ' ').trim();
  if (!title && dealTag) {
    title = dealTag;
  } else if (!title) {
    title = '쇼핑/지출 플랜';
  }

  let formattedDate: string | undefined;
  if (extractedDay !== null) {
    formattedDate = `${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(extractedDay).padStart(2, '0')}`;
  }

  return {
    date: formattedDate,
    title,
    finalPrice,
    benefitType: benefitAmount > 0 ? benefitType : 'instant',
    benefitAmount,
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
