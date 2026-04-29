import { notifications } from '@mantine/notifications';

type ErrorTranslation = {
  pattern: RegExp;
  message: string;
};

const ERROR_MESSAGE_TRANSLATIONS: ErrorTranslation[] = [
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

const resolveRequiredFieldsMessage = (error: any): string | null => {
  const data = error?.response?.data;
  if (!data || typeof data !== 'object') return null;

  const requiredFields = new Set<string>();
  const registerField = (field: string) => {
    const pretty = prettifyFieldName(field);
    if (pretty) requiredFields.add(pretty);
  };
  const isRequiredMessage = (msg: string) => REQUIRED_FIELD_PATTERNS.some((pattern) => pattern.test(msg));

  const errorsObject = (data as any).errors;
  if (errorsObject && typeof errorsObject === 'object' && !Array.isArray(errorsObject)) {
    Object.entries(errorsObject).forEach(([field, value]) => {
      const messages = Array.isArray(value) ? value : [value];
      const hasRequired = messages.some((item) => isRequiredMessage(toStringValue(item)));
      if (hasRequired) registerField(field);
    });
  }

  const messageItems = Array.isArray((data as any).message)
    ? (data as any).message
    : Array.isArray((data as any).details)
      ? (data as any).details
      : [];

  messageItems.forEach((item: any) => {
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

const isLikelyEnglishError = (value: string) => {
  if (!value) return false;

  const asciiOnly = /^[\x00-\x7F\s.,:'"!?()\-_/]+$/.test(value);
  const englishKeyword = /(operator|conversation|limit|forbidden|not found|already|invalid|failed|error|request|timeout|unauthorized|token|credentials|network|server|internal)/i.test(value);
  return asciiOnly && englishKeyword;
};

export const resolveApiErrorMessage = (error: any, fallback: string) => {
  const requiredFieldsMessage = resolveRequiredFieldsMessage(error);
  if (requiredFieldsMessage) return requiredFieldsMessage;

  const raw = toStringValue(
    error?.response?.data?.originalError
    || error?.response?.data?.originalMessage
    || error?.response?.data?.originalDetail
    || error?.userMessage
    || error?.response?.data?.error
    || error?.response?.data?.message
    || error?.response?.data?.detail
    || error?.message,
  );

  if (!raw) return fallback;

  // When there is no HTTP response, keep the raw JS/runtime error visible.
  // This helps diagnose frontend errors that happen before the request is sent.
  if (!error?.response) {
    return raw;
  }

  for (const item of ERROR_MESSAGE_TRANSLATIONS) {
    if (item.pattern.test(raw)) return item.message;
  }

  const status = Number(error?.response?.status || 0);
  if (status === 401) return 'Sua sessão expirou. Faça login novamente.';
  if (status === 403) return 'Você não tem permissão para executar essa ação.';
  if (status === 404) return 'Registro não encontrado.';
  if (status === 409) return 'Conflito de dados. Atualize a tela e tente novamente.';
  if (status === 422) return 'Os dados informados são inválidos. Revise e tente novamente.';
  if (status >= 500) return 'O servidor encontrou um erro. Tente novamente em instantes.';

  if (isLikelyEnglishError(raw)) return fallback;

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
