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

const isLikelyEnglishError = (value: string) => {
  if (!value) return false;

  const asciiOnly = /^[\x00-\x7F\s.,:'"!?()\-_/]+$/.test(value);
  const englishKeyword = /(operator|conversation|limit|forbidden|not found|already|invalid|failed|error|request|timeout|unauthorized|token|credentials|network|server|internal)/i.test(value);
  return asciiOnly && englishKeyword;
};

export const resolveApiErrorMessage = (error: any, fallback: string) => {
  const raw = toStringValue(
    error?.userMessage
    || error?.response?.data?.error
    || error?.response?.data?.message
    || error?.response?.data?.detail
    || error?.message,
  );

  if (!raw) return fallback;

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
