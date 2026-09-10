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

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

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
  targetMonth: number,
  userTags: string[] = []
): ParsedEntry {
  let text = rawInput.trim();
  if (!text) {
    return {
      title: '',
      finalPrice: 0,
      benefitType: 'instant',
      benefitAmount: 0,
      dealTag: ''
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
  const explicitBenefitMatch = text.match(/(?:청구할인|결제일할인|적립|캐시백|할인\s*[:=]?\s*|-)(\d+만|\d+(?:,\d{3})*)(?:원)?/i)
    || text.match(/(\d+만|\d+(?:,\d{3})*)(?:원)?\s*(?:청구할인|적립|캐시백|할인)/i);

  if (explicitBenefitMatch) {
    benefitAmount = parseAmount(explicitBenefitMatch[1]);
    if (benefitType === 'instant' && !/즉시|쿠폰/.test(explicitBenefitMatch[0])) {
      benefitType = 'bill_discount';
    }
    text = text.replace(explicitBenefitMatch[0], ' ').trim();
  }

  // 3. 태그 추출 (사용자 태그 우선, 긴 태그부터 매칭해 '삼성LINK'가 '삼성'에 가려지지 않게)
  let dealTag = '';
  const candidateTags = [...new Set([...userTags, ...COMMON_TAGS])].sort(
    (a, b) => b.length - a.length
  );
  for (const tag of candidateTags) {
    const regex = new RegExp(`(^|\\s)(${escapeRegExp(tag)})(\\s|$)`, 'i');
    if (regex.test(text)) {
      dealTag = tag;
      text = text.replace(regex, ' ').trim();
      break;
    }
  }

  // 4. 남은 숫자들 추출 (결제 금액 및 남은 혜택금액 처리)
  const amounts = extractAmounts(text);
  let finalPrice = 0;

  if (amounts.length > 0) {
    const used = [amounts[0]];
    finalPrice = amounts[0].value;
    if (amounts.length >= 2 && benefitAmount === 0) {
      benefitAmount = amounts[1].value;
      if (benefitType === 'instant') benefitType = 'bill_discount';
      used.push(amounts[1]);
    }
    text = cutOut(text, used);
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
    dealTag: dealTag || ''
  };
}

interface Amount {
  value: number;
  start: number;
  end: number;
}

// '만'을 먼저 두지 않으면 "3만"에서 앞쪽 대안이 "3"만 먹고 "만"을 흘린다
const AMOUNT_PATTERN = /(\d+만|\d+(?:,\d{3})*)(원)?/g;
const HANGUL_OR_LETTER = /[가-힣A-Za-z]/;

/**
 * 금액으로 볼 수 있는 숫자만 뽑는다.
 *
 * "11번가"의 11이나 "3인"의 3처럼 낱말에 붙은 숫자는 금액이 아니다.
 * 단 "3만", "4500원"처럼 단위가 붙었으면 뒤에 글자가 이어져도 금액으로 본다
 * ("49700원이었어" 같은 입력을 놓치지 않기 위함).
 */
function extractAmounts(text: string): Amount[] {
  const amounts: Amount[] = [];
  for (const match of text.matchAll(AMOUNT_PATTERN)) {
    const raw = match[1];
    const start = match.index ?? 0;
    const end = start + match[0].length;
    const hasUnit = Boolean(match[2]) || raw.endsWith('만');

    if (!hasUnit) {
      const before = text[start - 1] ?? '';
      const after = text[end] ?? '';
      if (HANGUL_OR_LETTER.test(before) || HANGUL_OR_LETTER.test(after)) continue;
    }
    amounts.push({ value: parseAmount(raw), start, end });
  }
  return amounts;
}

/** 위치 기준으로 잘라낸다. 문자열 replace를 쓰면 "11번가 11"처럼 같은 숫자가 앞에 또 있을 때 엉뚱한 곳을 지운다. */
function cutOut(text: string, ranges: Amount[]): string {
  let out = text;
  for (const { start, end } of [...ranges].sort((a, b) => b.start - a.start)) {
    out = `${out.slice(0, start)} ${out.slice(end)}`;
  }
  return out.replace(/\s+/g, ' ').trim();
}

function parseAmount(str: string): number {
  if (!str) return 0;
  if (str.endsWith('만')) {
    const num = parseFloat(str.replace('만', '').trim());
    return Math.round(num * 10000);
  }
  return parseInt(str.replace(/,/g, '').trim(), 10) || 0;
}
