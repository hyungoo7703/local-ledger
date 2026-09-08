const AI_CONFIG_KEY = 'LOCAL_LEDGER_AI_CONFIG';
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta';

export const DEFAULT_AI_MODEL = 'gemini-3.8-flash';

// 참고용 목록. 목록에 없는 모델명도 직접 입력할 수 있어야 한다
// (구글이 모델을 새로 내놓아도 앱 수정 없이 쓸 수 있도록).
export const KNOWN_MODELS = [
  'gemini-3.8-flash',
  'gemini-3.7-flash',
  'gemini-3.6-flash',
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite'
];

export const DEFAULT_FALLBACK_MODEL = 'gemini-3.7-flash';

export interface AiConfig {
  apiKey: string;
  model: string;
  /** 기본 모델이 은퇴·한도초과·과부하일 때 쓸 모델. 빈 문자열이면 폴백하지 않는다 */
  fallbackModel: string;
}

export const EMPTY_AI_CONFIG: AiConfig = {
  apiKey: '',
  model: DEFAULT_AI_MODEL,
  fallbackModel: DEFAULT_FALLBACK_MODEL
};

/**
 * AI 설정은 가계부 본체(LOCAL_LEDGER_DATA_V3)와 다른 키에 저장한다.
 * 백업 내보내기는 AppState만 직렬화하므로, 이 분리 덕분에 API 키가
 * 백업 파일에 섞여 나가지 않는다.
 */
export function loadAiConfig(): AiConfig {
  try {
    const raw = localStorage.getItem(AI_CONFIG_KEY);
    if (!raw) return { ...EMPTY_AI_CONFIG };
    const parsed = JSON.parse(raw);
    return {
      apiKey: typeof parsed?.apiKey === 'string' ? parsed.apiKey.trim() : '',
      model: typeof parsed?.model === 'string' && parsed.model.trim() !== ''
        ? parsed.model.trim()
        : DEFAULT_AI_MODEL,
      // 기존 설정에는 이 항목이 없으므로 기본값을 채운다
      fallbackModel: typeof parsed?.fallbackModel === 'string'
        ? parsed.fallbackModel.trim()
        : DEFAULT_FALLBACK_MODEL
    };
  } catch (err) {
    console.error('Failed to load AI config', err);
    return { ...EMPTY_AI_CONFIG };
  }
}

export function saveAiConfig(config: AiConfig): boolean {
  try {
    localStorage.setItem(AI_CONFIG_KEY, JSON.stringify(config));
    return true;
  } catch (err) {
    console.error('Failed to save AI config', err);
    return false;
  }
}

export function clearAiConfig(): void {
  try {
    localStorage.removeItem(AI_CONFIG_KEY);
  } catch (err) {
    console.error('Failed to clear AI config', err);
  }
}

export function hasApiKey(config: AiConfig): boolean {
  return config.apiKey.trim() !== '';
}

export function maskApiKey(key: string): string {
  const trimmed = key.trim();
  if (trimmed.length <= 10) return '•'.repeat(trimmed.length);
  return `${trimmed.slice(0, 6)}${'•'.repeat(12)}${trimmed.slice(-4)}`;
}

export interface KeyTestResult {
  ok: boolean;
  message: string;
  /** 키는 유효하지만 지정한 모델을 쓸 수 없는 경우 false */
  modelAvailable?: boolean;
  availableFlashModels?: string[];
}

/**
 * 키 검증에 generateContent 대신 ListModels를 쓴다.
 * 생성 쿼터(무료 티어에서 하루 요청 수)를 소모하지 않으면서
 * 키 유효성과 모델명 존재 여부를 한 번에 확인할 수 있다.
 */
export async function testApiKey(
  config: AiConfig,
  signal?: AbortSignal
): Promise<KeyTestResult> {
  const apiKey = config.apiKey.trim();
  if (!apiKey) {
    return { ok: false, message: 'API 키를 입력해 주세요.' };
  }

  let res: Response;
  try {
    res = await fetch(`${GEMINI_BASE}/models?pageSize=1000`, {
      headers: { 'x-goog-api-key': apiKey },
      signal
    });
  } catch (err) {
    if (signal?.aborted) return { ok: false, message: '연결 테스트를 취소했습니다.' };
    console.error('Gemini request failed', err);
    return { ok: false, message: '네트워크에 연결하지 못했습니다. 인터넷 상태를 확인해 주세요.' };
  }

  if (!res.ok) {
    return { ok: false, message: await describeError(res) };
  }

  let body: any;
  try {
    body = await res.json();
  } catch {
    return { ok: false, message: '응답을 해석하지 못했습니다.' };
  }

  // name은 "models/gemini-3.8-flash" 형태로 온다
  const names: string[] = Array.isArray(body?.models)
    ? body.models
        .map((m: any) => String(m?.name ?? '').replace(/^models\//, ''))
        .filter(Boolean)
    : [];

  const wanted = config.model.trim() || DEFAULT_AI_MODEL;
  const modelAvailable = names.includes(wanted);
  const availableFlashModels = names.filter((n) => n.includes('flash')).slice(0, 8);

  return {
    ok: true,
    modelAvailable,
    availableFlashModels,
    message: modelAvailable
      ? `연결 성공. '${wanted}' 사용 가능합니다.`
      : `키는 정상이지만 '${wanted}' 모델을 찾을 수 없습니다. 아래 목록에서 골라 주세요.`
  };
}

export type AiErrorKind = 'key' | 'quota' | 'model' | 'busy' | 'network' | 'parse' | 'other';

/** 모델을 바꿔 다시 시도할 가치가 있는 실패인지. 키·네트워크 문제는 바꿔도 소용없다. */
const RETRY_WITH_OTHER_MODEL: AiErrorKind[] = ['model', 'quota', 'busy'];

export class AiError extends Error {
  constructor(message: string, public kind: AiErrorKind) {
    super(message);
    this.name = 'AiError';
  }
}

export interface AiParseResult {
  date: string; // YYYY-MM-DD, 해석 실패 시 빈 문자열
  title: string;
  finalPrice: number;
  benefitType: 'instant' | 'bill_discount' | 'point_reward';
  benefitAmount: number;
  dealTag: string;
  /** 계산 근거. 사용자가 눈으로 검산할 수 있도록 UI와 메모에 노출한다 */
  breakdown: string;
  /** 실제로 응답한 모델. 폴백이 일어났는지 사용자가 알 수 있어야 한다 */
  modelUsed: string;
  /** 기본 모델이 실패해 폴백한 경우 그 사유 */
  fallbackReason?: string;
}

// 산술은 AI에게 맡기지 않는다. 읽어낸 조각만 받아서 계산은 아래 코드가 한다.
const ENTRY_SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string', description: '품목이나 가게 이름. 예: 빕스, 와퍼 주니어' },
    date: { type: 'string', description: 'YYYY-MM-DD 형식. 날짜 언급이 없으면 빈 문자열' },
    unitPrice: { type: 'number', description: '1개 또는 1인당 금액(원). 총액만 언급되면 0' },
    quantity: { type: 'integer', description: '개수 또는 인원. 언급이 없으면 1' },
    totalPrice: { type: 'number', description: '총액이 문장에 직접 적혀 있으면 그 값, 아니면 0' },
    benefitType: {
      type: 'string',
      enum: ['instant', 'bill_discount', 'point_reward'],
      description:
        'instant=결제 시 즉시할인/쿠폰, bill_discount=카드 청구할인·결제일 할인, point_reward=포인트/캐시백 적립'
    },
    benefitPercent: { type: 'number', description: '비율로 표현된 혜택(%). 없으면 0' },
    benefitAmount: { type: 'number', description: '금액으로 표현된 혜택(원). 없으면 0' },
    dealTag: { type: 'string', description: '행사/혜택 태그. 없으면 빈 문자열' }
  },
  required: [
    'title',
    'date',
    'unitPrice',
    'quantity',
    'totalPrice',
    'benefitType',
    'benefitPercent',
    'benefitAmount',
    'dealTag'
  ]
};

function buildPrompt(input: string, today: string, quickTags: string[]): string {
  const weekday = ['일', '월', '화', '수', '목', '금', '토'][new Date(today).getDay()] ?? '?';
  return [
    '너는 한국어 가계부 입력을 구조화하는 파서다. 아래 문장에서 값을 읽어 JSON으로만 답하라.',
    '',
    `오늘은 ${today} (${weekday}요일)이다. "내일", "다음주 화요일" 같은 표현은 이 기준으로 계산해 YYYY-MM-DD로 적어라.`,
    '날짜 언급이 전혀 없으면 date는 빈 문자열로 둔다.',
    '',
    '중요: 곱셈이나 퍼센트 계산을 직접 하지 마라. 문장에 적힌 숫자를 그대로 각 필드에 넣기만 하라.',
    '- "인당 49700원, 3인"이면 unitPrice=49700, quantity=3, totalPrice=0 이다. 149100을 계산해 넣지 마라.',
    '- "40프로 적립"이면 benefitPercent=40, benefitAmount=0 이다.',
    '- "3000원 할인"이면 benefitAmount=3000, benefitPercent=0 이다.',
    '',
    '혜택 유형 판단:',
    '- 쿠폰, 즉시할인, 세일가처럼 결제 시점에 이미 깎인 것 -> instant',
    '- 청구할인, 결제일 할인, 카드사 나중에 빼주는 것 -> bill_discount',
    '- 적립, 캐시백, 포인트, 페이백 -> point_reward',
    '',
    quickTags.length > 0
      ? `태그는 가능하면 다음 중에서 고른다: ${quickTags.join(', ')}. 해당 없으면 문장에 나온 표현을 그대로 쓰고, 그것도 없으면 빈 문자열.`
      : '태그는 문장에 나온 행사명을 쓰고, 없으면 빈 문자열.',
    '',
    `문장: ${input.slice(0, 500)}`
  ].join('\n');
}

/**
 * 기본 모델로 시도하고, 모델이 은퇴했거나(404) 한도 초과(429)·과부하(503)면
 * 대체 모델로 한 번 더 시도한다. 키·네트워크 오류는 모델을 바꿔도 소용없으므로 즉시 포기한다.
 */
export async function parseEntryWithGemini(
  input: string,
  ctx: { config: AiConfig; today: string; quickTags: string[] },
  signal?: AbortSignal
): Promise<AiParseResult> {
  if (!ctx.config.apiKey.trim()) throw new AiError('API 키가 설정되지 않았습니다.', 'key');

  const primary = ctx.config.model.trim() || DEFAULT_AI_MODEL;
  const fallback = ctx.config.fallbackModel?.trim() ?? '';
  const chain = fallback && fallback !== primary ? [primary, fallback] : [primary];

  let firstError: AiError | null = null;
  for (const model of chain) {
    try {
      const result = await requestEntry(input, model, ctx, signal);
      return firstError
        ? { ...result, fallbackReason: `${primary} 실패: ${firstError.message}` }
        : result;
    } catch (err) {
      const aiErr = err instanceof AiError ? err : new AiError('AI 인식에 실패했습니다.', 'other');
      if (!firstError) firstError = aiErr;
      if (!RETRY_WITH_OTHER_MODEL.includes(aiErr.kind)) throw aiErr;
    }
  }

  throw firstError ?? new AiError('AI 인식에 실패했습니다.', 'other');
}

async function requestEntry(
  input: string,
  model: string,
  ctx: { config: AiConfig; today: string; quickTags: string[] },
  signal?: AbortSignal
): Promise<AiParseResult> {
  const apiKey = ctx.config.apiKey.trim();
  const timeout = new AbortController();
  const timer = setTimeout(() => timeout.abort(), 20000);
  if (signal) signal.addEventListener('abort', () => timeout.abort(), { once: true });

  let res: Response;
  try {
    res = await fetch(`${GEMINI_BASE}/models/${encodeURIComponent(model)}:generateContent`, {
      method: 'POST',
      headers: { 'x-goog-api-key': apiKey, 'Content-Type': 'application/json' },
      signal: timeout.signal,
      body: JSON.stringify({
        contents: [{ parts: [{ text: buildPrompt(input, ctx.today, ctx.quickTags) }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: ENTRY_SCHEMA,
          temperature: 0
        }
      })
    });
  } catch (err) {
    if (timeout.signal.aborted) {
      throw new AiError('AI 응답이 너무 오래 걸려 중단했습니다.', 'network');
    }
    console.error('Gemini request failed', err);
    throw new AiError('네트워크에 연결하지 못했습니다.', 'network');
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    throw new AiError(await describeError(res, model), errorKind(res.status));
  }

  let raw: any;
  try {
    const body = await res.json();
    const text = body?.candidates?.[0]?.content?.parts
      ?.map((p: any) => p?.text ?? '')
      .join('')
      .trim();
    if (!text) throw new Error('empty response');
    raw = JSON.parse(text);
  } catch (err) {
    console.error('Failed to read Gemini response', err);
    throw new AiError('AI 응답을 해석하지 못했습니다.', 'parse');
  }

  return { ...toEntry(raw, input), modelUsed: model };
}

function errorKind(status: number): AiErrorKind {
  if (status === 404) return 'model';
  if (status === 429) return 'quota';
  if (status === 400 || status === 403) return 'key';
  if (status >= 500) return 'busy';
  return 'other';
}

/** AI가 읽어낸 조각으로 최종 금액을 계산한다. 산술 환각을 구조적으로 배제하기 위함. */
function toEntry(raw: any, input: string): Omit<AiParseResult, 'modelUsed'> {
  const num = (v: unknown) => {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : 0;
  };

  const unitPrice = num(raw?.unitPrice);
  const quantity = Math.max(1, Math.round(num(raw?.quantity)) || 1);
  const totalPrice = num(raw?.totalPrice);
  const finalPrice = Math.round(totalPrice > 0 ? totalPrice : unitPrice * quantity);

  const benefitType: AiParseResult['benefitType'] =
    raw?.benefitType === 'bill_discount' || raw?.benefitType === 'point_reward'
      ? raw.benefitType
      : 'instant';

  const percent = Math.min(100, num(raw?.benefitPercent));
  const flat = num(raw?.benefitAmount);
  let benefitAmount = percent > 0 ? Math.round((finalPrice * percent) / 100) : flat;
  // instant는 결제 금액에 이미 반영된 것으로 본다 (기존 데이터 모델과 동일)
  if (benefitType === 'instant') benefitAmount = 0;

  const won = (n: number) => n.toLocaleString('ko-KR');
  const parts: string[] = [];
  if (totalPrice <= 0 && quantity > 1 && unitPrice > 0) {
    parts.push(`${won(unitPrice)}원 × ${quantity} = ${won(finalPrice)}원`);
  } else if (finalPrice > 0) {
    parts.push(`결제 ${won(finalPrice)}원`);
  }
  if (benefitAmount > 0) {
    const label = benefitType === 'point_reward' ? '적립' : '청구할인';
    parts.push(percent > 0 ? `${percent}% ${label} = ${won(benefitAmount)}원` : `${label} ${won(benefitAmount)}원`);
  }

  const date = typeof raw?.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw.date) ? raw.date : '';

  return {
    date,
    title: String(raw?.title ?? '').trim() || input.slice(0, 20).trim() || '소비/혜택 플랜',
    finalPrice,
    benefitType,
    benefitAmount,
    dealTag: String(raw?.dealTag ?? '').trim(),
    breakdown: parts.join(' · ')
  };
}

async function describeError(res: Response, model?: string): Promise<string> {
  let reason = '';
  let detail = '';
  try {
    const body = await res.json();
    reason = String(body?.error?.details?.[0]?.reason ?? '');
    detail = String(body?.error?.message ?? '');
  } catch {
    // 본문이 비어 있거나 JSON이 아닐 수 있다. 상태 코드만으로 안내한다
  }

  if (reason === 'API_KEY_INVALID' || res.status === 400) {
    return '유효하지 않은 API 키입니다. AI Studio에서 발급한 키를 다시 확인해 주세요.';
  }
  if (res.status === 404) {
    return model
      ? `'${model}' 모델을 찾을 수 없습니다. 은퇴했거나 이름이 잘못됐을 수 있습니다.`
      : '모델을 찾을 수 없습니다.';
  }
  if (res.status === 403) {
    return '이 키로는 Gemini API를 쓸 수 없습니다. 키의 API 제한 설정을 확인해 주세요.';
  }
  if (res.status === 429) {
    return '무료 사용 한도를 초과했습니다. 잠시 후(보통 다음 날) 다시 시도해 주세요.';
  }
  if (res.status >= 500) {
    return 'Google 서버에 일시적인 문제가 있습니다. 잠시 후 다시 시도해 주세요.';
  }
  return detail || `요청이 실패했습니다. (HTTP ${res.status})`;
}
