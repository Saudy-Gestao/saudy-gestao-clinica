import { notifications } from '@/components/ui';

type ErrorTranslation = {
  pattern: RegExp;
  message: string;
};

type ApiErrorLike = {
  response?: {
    status?: number;
    data?: unknown;
  };
  userMessage?: unknown;
  message?: unknown;
};

const ERROR_MESSAGE_TRANSLATIONS: ErrorTranslation[] = [
  { pattern: /unique.*email|email.*(?:already|exists|duplicate)/i, message: 'Este e-mail já está cadastrado.' },
  { pattern: /unique.*cpf|cpf.*(?:already|exists|duplicate)/i, message: 'Este CPF já está cadastrado.' },
  { pattern: /unique.*crm|crm.*(?:already|exists|duplicate)/i, message: 'Este registro profissional já está cadastrado.' },
  { pattern: /operator reached active conversation limit/i, message: 'Você atingiu o limite de atendimentos ativos.' },
  { pattern: /already assigned to (another )?operator/i, message: 'Essa conversa já foi assumida por outro atendente.' },
  { pattern: /already assigned/i, message: 'Essa conversa já está atribuída.' },
  { pattern: /already closed|conversation closed|closed conversation/i, message: 'Essa conversa já está encerrada.' },
  { pattern: /forbidden|unauthorized|access denied/i, message: 'Você não tem permissão para executar essa ação.' },
  { pattern: /user not associated with a company|user not associated with a branch/i, message: 'Seu usuário não está vinculado corretamente à empresa/unidade.' },
  { pattern: /conversation not found/i, message: 'Conversa não encontrada.' },
  { pattern: /protocol .*not found|protocol not found/i, message: 'Protocolo não encontrado.' },
  { pattern: /network error|failed to fetch|timeout|etimedout|ecconnaborted/i, message: 'Falha de conexão. Verifique sua internet e tente novamente.' },
  { pattern: /invalid credentials|invalid email or password/i, message: 'E-mail ou senha inválidos.' },
  { pattern: /token expired|jwt expired|invalid token/i, message: 'Sua sessão expirou. Faça login novamente.' },
  { pattern: /validation failed|invalid input|bad request/i, message: 'Alguns dados informados são inválidos. Revise e tente novamente.' },
  { pattern: /too many requests|rate limit/i, message: 'Muitas tentativas em sequência. Aguarde um momento e tente novamente.' },
  { pattern: /not found/i, message: 'Registro não encontrado.' },
];

const toStringValue = (value: unknown) => String(value || '').trim();
const REQUIRED_FIELD_PATTERNS = [
  /required/i,
  /is required/i,
  /must not be empty/i,
  /should not be empty/i,
  /campo obrigat[óo]rio/i,
  /obrigat[óo]rio/i,
  /n[ãa]o pode ser vazio/i,
];

const FIELD_LABELS: Record<string, string> = {
  cpf: 'CPF',
  cnpj: 'CNPJ',
  email: 'E-mail',
  phone: 'Telefone',
  cellphone: 'Celular',
  birthDate: 'Data de nascimento',
  legalName: 'Razão social',
  tradeName: 'Nome fantasia',
  name: 'Nome',
  password: 'Senha',
  branchId: 'Filial',
  sectorId: 'Setor',
  moduleIds: 'Módulos',
};

const prettifyFieldName = (field: string) => {
  const cleaned = String(field || '')
    .replace(/\[(\d+)\]/g, ' $1 ')
    .replace(/[._-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return '';

  if (FIELD_LABELS[field]) return FIELD_LABELS[field];

  const firstToken = cleaned.split(' ')[0];
  if (FIELD_LABELS[firstToken]) return FIELD_LABELS[firstToken];

  const camelSpaced = cleaned.replace(/([a-z])([A-Z])/g, '$1 $2');
  const normalized = camelSpaced.toLowerCase();
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
};

const extractFieldFromMessage = (message: string) => {
  const raw = toStringValue(message);
  if (!raw) return '';

  const quotedMatch = raw.match(/["'`]?([a-zA-Z0-9_.-]+)["'`]?\s+(?:is|required|must|should)/i);
  if (quotedMatch?.[1]) return quotedMatch[1];

  const forMatch = raw.match(/(?:campo|field)\s+["'`]?([a-zA-Z0-9_.-]+)["'`]?/i);
  if (forMatch?.[1]) return forMatch[1];

  return '';
};

const resolveRequiredFieldsMessage = (error: ApiErrorLike): string | null => {
  const data = error?.response?.data;
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
  const responseData = data as Record<string, unknown>;

  const requiredFields = new Set<string>();
  const registerField = (field: string) => {
    const pretty = prettifyFieldName(field);
    if (pretty) requiredFields.add(pretty);
  };
  const isRequiredMessage = (msg: string) => REQUIRED_FIELD_PATTERNS.some((pattern) => pattern.test(msg));

  const errorsObject = responseData.errors;
  if (errorsObject && typeof errorsObject === 'object' && !Array.isArray(errorsObject)) {
    Object.entries(errorsObject).forEach(([field, value]) => {
      const messages = Array.isArray(value) ? value : [value];
      const hasRequired = messages.some((item) => isRequiredMessage(toStringValue(item)));
      if (hasRequired) registerField(field);
    });
  }

  const messageItems = Array.isArray(responseData.message)
    ? responseData.message
    : Array.isArray(responseData.details)
      ? responseData.details
      : [];

  messageItems.forEach((item) => {
    const text = toStringValue(item);
    if (!text || !isRequiredMessage(text)) return;
    const extracted = extractFieldFromMessage(text);
    if (extracted) registerField(extracted);
  });

  if (requiredFields.size === 0) return null;

  const fields = Array.from(requiredFields).slice(0, 5);
  const list = fields.join(', ');
  return `Preencha os campos obrigatórios: ${list}.`;
};

const resolveFieldErrorsMessage = (error: ApiErrorLike): string | null => {
  const data = error?.response?.data;
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
  const fields = (data as Record<string, unknown>).fields;
  if (!fields || typeof fields !== 'object' || Array.isArray(fields)) return null;

  const messages = Object.values(fields)
    .map((value) => toStringValue(value))
    .filter(Boolean);
  if (messages.length === 0) return null;

  return messages.slice(0, 3).join(' ');
};

const collectErrorText = (value: unknown): string[] => {
  if (typeof value === 'string' || typeof value === 'number') {
    const text = String(value).trim();
    return text ? [text] : [];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => collectErrorText(item));
  }

  if (!value || typeof value !== 'object') return [];

  const record = value as Record<string, unknown>;
  for (const key of ['message', 'detail', 'error', 'title']) {
    const nested = collectErrorText(record[key]);
    if (nested.length > 0) return nested;
  }

  return [];
};

const isGenericApiMessage = (value: string) => {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return true;

  return [
    /^bad request\.?$/i,
    /^validation failed\.?$/i,
    /^internal(?: server)? error\.?$/i,
    /^unexpected conflict\.?$/i,
    /^conflict\.?$/i,
    /^scheduling conflict\.?$/i,
    /^request failed(?: with status code \d+)?\.?$/i,
    /^error\.?$/i,
    /^failed to (?:create|update|delete|save|load|fetch|process|generate|send|register|complete|finalize)\b[^.!?]*[.!?]?$/i,
    /^conflito de dados(?:\.|$)/i,
    /^erro interno(?: do servidor)?(?:\.|$)/i,
  ].some((pattern) => pattern.test(normalized));
};

const resolveServerMessages = (error: ApiErrorLike): string[] => {
  const data = error?.response?.data;
  if (!data || typeof data !== 'object' || Array.isArray(data)) return [];
  const responseData = data as Record<string, unknown>;

  const candidates = [
    responseData.originalMessage,
    responseData.message,
    responseData.originalDetail,
    responseData.detail,
    responseData.details,
    responseData.originalError,
    responseData.error,
  ].flatMap((value) => collectErrorText(value));

  return Array.from(new Set(candidates.map((value) => value.trim()).filter(Boolean)));
};

const resolveServerErrorMessage = (error: ApiErrorLike): string => {
  const messages = resolveServerMessages(error);
  if (messages.length === 0) return '';

  const responseData = error.response?.data as Record<string, unknown>;

  // Prefer the actionable message over wrappers such as "Scheduling conflict"
  // or "Failed to create...". This is important because the API commonly
  // returns both fields in the same response.
  const meaningfulMessages = messages.filter((message) => !isGenericApiMessage(message));
  const primary = meaningfulMessages[0] || messages[0];
  const detail = meaningfulMessages.find((message) => (
    message !== primary
    && (message === String(responseData.details || '').trim()
      || message === String(responseData.originalDetail || '').trim()
      || message === String(responseData.detail || '').trim())
  ));

  return detail && !primary.includes(detail) ? `${primary} ${detail}` : primary;
};

const isLikelyEnglishError = (value: string) => {
  if (!value) return false;

  const asciiOnly = Array.from(value).every((character) => character.charCodeAt(0) <= 0x7f);
  const englishKeyword = /(operator|conversation|limit|forbidden|not found|already|invalid|failed|error|request|timeout|unauthorized|token|credentials|network|server|internal)/i.test(value);
  return asciiOnly && englishKeyword;
};

export const resolveApiErrorMessage = (error: unknown, fallback: string) => {
  const apiError = (error && typeof error === 'object' ? error : {}) as ApiErrorLike;
  const requiredFieldsMessage = resolveRequiredFieldsMessage(apiError);
  if (requiredFieldsMessage) return requiredFieldsMessage;

  // Field-level API errors contain the actionable reason (for example,
  // "Este e-mail já está cadastrado"). Prefer them over the route-level
  // "Validation failed" envelope so every screen can show a useful message.
  const fieldErrorsMessage = resolveFieldErrorsMessage(apiError);
  if (fieldErrorsMessage) return fieldErrorsMessage;

  const raw = resolveServerErrorMessage(apiError)
    || toStringValue(apiError.userMessage || apiError.message);

  if (!raw) return fallback;

  // When there is no HTTP response, keep the raw JS/runtime error visible.
  // This helps diagnose frontend errors that happen before the request is sent.
  if (!apiError.response) {
    return raw;
  }

  const translatedMessage = ERROR_MESSAGE_TRANSLATIONS.find((item) => item.pattern.test(raw))?.message;
  if (translatedMessage) {
    const details = resolveServerMessages(apiError)
      .filter((message) => message !== raw && !isGenericApiMessage(message))
      .find((message) => (
        message === String((apiError.response?.data as Record<string, unknown>)?.details || '').trim()
        || message === String((apiError.response?.data as Record<string, unknown>)?.originalDetail || '').trim()
        || message === String((apiError.response?.data as Record<string, unknown>)?.detail || '').trim()
      ));
    return details && !translatedMessage.includes(details)
      ? `${translatedMessage} ${details}`
      : translatedMessage;
  }

  const status = Number(apiError.response?.status || 0);
  if (status === 401) return 'Sua sessão expirou. Faça login novamente.';
  if (status === 403) return 'Você não tem permissão para executar essa ação.';
  if (status === 404) return 'Registro não encontrado.';

  // Technical wrappers such as "Internal server error" do not contain a
  // reason to show. Keep the status-based wording for those only.
  if (isGenericApiMessage(raw)) {
    if (status === 409) return 'Conflito de dados. Atualize a tela e tente novamente.';
    if (status === 422) return 'Os dados informados são inválidos. Revise e tente novamente.';
    if (status >= 500) return 'O servidor encontrou um erro. Tente novamente em instantes.';
  }

  // Once the API provides a specific, user-facing reason, never replace it
  // with the status-based fallback (especially the generic 409 message).
  // Unknown technical messages in English remain behind the existing safe
  // fallback until the backend exposes a clearer message.
  if (isLikelyEnglishError(raw)) return fallback;
  if (!isGenericApiMessage(raw)) return raw;

  if (status === 409) return 'Conflito de dados. Atualize a tela e tente novamente.';
  if (status === 422) return 'Os dados informados são inválidos. Revise e tente novamente.';
  if (status >= 500) return 'O servidor encontrou um erro. Tente novamente em instantes.';

  return raw;
};

export const showApiErrorToast = (params: {
  title: string;
  error: unknown;
  fallback: string;
  color?: string;
}) => {
  notifications.show({
    title: params.title,
    message: resolveApiErrorMessage(params.error, params.fallback),
    color: params.color || 'red',
  });
};
