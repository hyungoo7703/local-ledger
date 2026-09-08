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

export interface AiConfig {
  apiKey: string;
  model: string;
}

export const EMPTY_AI_CONFIG: AiConfig = { apiKey: '', model: DEFAULT_AI_MODEL };

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
        : DEFAULT_AI_MODEL
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

async function describeError(res: Response): Promise<string> {
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
