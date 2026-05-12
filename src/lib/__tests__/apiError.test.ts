import { beforeEach, describe, expect, it, vi } from 'vitest';
import { notifications } from '@mantine/notifications';
import { resolveApiErrorMessage, showApiErrorToast } from '../apiError';

vi.mock('@mantine/notifications', () => ({
  notifications: {
    show: vi.fn(),
  },
}));

describe('apiError utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('builds a required fields message from validation errors', () => {
    const error = {
      response: {
        data: {
          errors: {
            cpf: ['is required'],
            birthDate: ['must not be empty'],
            ignored: ['invalid format'],
          },
        },
      },
    };

    expect(resolveApiErrorMessage(error, 'Fallback')).toBe('Preencha os campos obrigatórios: CPF, Data de nascimento.');
  });

  it('translates known backend messages and status codes', () => {
    expect(resolveApiErrorMessage({
      response: { data: { message: 'operator reached active conversation limit' } },
    }, 'Fallback')).toBe('Você atingiu o limite de atendimentos ativos.');

    expect(resolveApiErrorMessage({
      response: { status: 409, data: { message: 'Unexpected conflict' } },
    }, 'Fallback')).toBe('Conflito de dados. Atualize a tela e tente novamente.');

    expect(resolveApiErrorMessage({
      response: { status: 500, data: { message: 'Internal server error' } },
    }, 'Fallback')).toBe('O servidor encontrou um erro. Tente novamente em instantes.');
  });

  it('keeps frontend runtime errors and hides likely English API messages', () => {
    expect(resolveApiErrorMessage(new Error('Cannot read properties of undefined'), 'Fallback')).toBe(
      'Cannot read properties of undefined',
    );

    expect(resolveApiErrorMessage({
      response: { status: 400, data: { message: 'Unexpected request error' } },
    }, 'Fallback')).toBe('Fallback');

    expect(resolveApiErrorMessage({
      response: { status: 400, data: { message: 'Mensagem amigável do backend' } },
    }, 'Fallback')).toBe('Mensagem amigável do backend');
  });

  it('shows a toast with the resolved error message and default color', () => {
    showApiErrorToast({
      title: 'Falha',
      error: { response: { status: 404, data: { message: 'anything' } } },
      fallback: 'Nao foi possivel carregar',
    });

    expect(notifications.show).toHaveBeenCalledWith({
      title: 'Falha',
      message: 'Registro não encontrado.',
      color: 'red',
    });
  });
});
