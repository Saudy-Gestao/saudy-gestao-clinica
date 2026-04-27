import { describe, expect, it, vi } from 'vitest';
import { resolveApiErrorMessage, showApiErrorToast } from '../apiError';

vi.mock('@mantine/notifications', () => ({
  notifications: {
    show: vi.fn(),
  },
}));

import { notifications } from '@mantine/notifications';

describe('resolveApiErrorMessage', () => {
  it('maps known english errors to localized messages', () => {
    expect(resolveApiErrorMessage({ message: 'Invalid credentials' }, 'Falha')).toBe('E-mail ou senha inválidos.');
    expect(resolveApiErrorMessage({ message: 'conversation not found' }, 'Falha')).toBe('Conversa não encontrada.');
  });

  it('maps status code based errors', () => {
    expect(resolveApiErrorMessage({ response: { status: 401 }, message: 'request failed' }, 'Falha')).toBe('Sua sessão expirou. Faça login novamente.');
    expect(resolveApiErrorMessage({ response: { status: 403 }, message: 'request failed' }, 'Falha')).toBe('Você não tem permissão para executar essa ação.');
    expect(resolveApiErrorMessage({ response: { status: 404 }, message: 'request failed' }, 'Falha')).toBe('Registro não encontrado.');
    expect(resolveApiErrorMessage({ response: { status: 409 }, message: 'request failed' }, 'Falha')).toBe('Conflito de dados. Atualize a tela e tente novamente.');
    expect(resolveApiErrorMessage({ response: { status: 422 }, message: 'request failed' }, 'Falha')).toBe('Os dados informados são inválidos. Revise e tente novamente.');
    expect(resolveApiErrorMessage({ response: { status: 500 }, message: 'request failed' }, 'Falha')).toBe('O servidor encontrou um erro. Tente novamente em instantes.');
  });

  it('extracts required fields validation message', () => {
    const error = {
      response: {
        data: {
          errors: {
            cpf: ['is required'],
            email: ['must not be empty'],
          },
        },
      },
    };

    expect(resolveApiErrorMessage(error, 'Falha')).toContain('Preencha os campos obrigatórios');
    expect(resolveApiErrorMessage(error, 'Falha')).toContain('CPF');
    expect(resolveApiErrorMessage(error, 'Falha')).toContain('E-mail');
  });

  it('extracts required fields from message/details arrays', () => {
    const error = {
      response: {
        data: {
          message: ['field legalName is required', 'campo branchId obrigatorio'],
          details: ['field moduleIds should not be empty'],
        },
      },
    };

    const message = resolveApiErrorMessage(error, 'Falha');
    expect(message).toContain('Preencha os campos obrigatórios');
    expect(message).toContain('Razão social');
    expect(message).toContain('Filial');
  });

  it('extracts required fields from details-only payload and prettifies custom tokens', () => {
    const error = {
      response: {
        data: {
          details: [
            'field user.name is required',
            'campo reportTemplates[0].templateName obrigatório',
          ],
        },
      },
    };

    const message = resolveApiErrorMessage(error, 'Falha');
    expect(message).toContain('Preencha os campos obrigatórios');
    expect(message).toContain('User name');
    expect(message).toContain('Report templates');
  });

  it('supports non-array errors object values when required', () => {
    const error = {
      response: {
        data: {
          errors: {
            moduleIds: 'is required',
          },
        },
      },
    };

    const message = resolveApiErrorMessage(error, 'Falha');
    expect(message).toContain('Módulos');
  });

  it('uses fallback for likely english unknown errors', () => {
    expect(resolveApiErrorMessage({ message: 'operator had unexpected issue' }, 'Falha genérica')).toBe('Falha genérica');
  });

  it('returns raw localized error when not english and not mapped', () => {
    expect(resolveApiErrorMessage({ message: 'Erro específico do backend' }, 'Falha')).toBe('Erro específico do backend');
  });

  it('uses fallback when there is no error text', () => {
    expect(resolveApiErrorMessage({}, 'Falha padrão')).toBe('Falha padrão');
  });

  it('sends toast notification with resolved message and custom color', () => {
    const showSpy = vi.spyOn(notifications, 'show');
    showApiErrorToast({
      title: 'Ops',
      error: { message: 'invalid credentials' },
      fallback: 'Falha',
      color: 'orange',
    });

    expect(showSpy).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Ops',
      message: 'E-mail ou senha inválidos.',
      color: 'orange',
    }));
  });

  it('uses red as default toast color', () => {
    const showSpy = vi.spyOn(notifications, 'show');
    showApiErrorToast({
      title: 'Erro',
      error: { message: 'network error' },
      fallback: 'Falha',
    });

    expect(showSpy).toHaveBeenCalledWith(expect.objectContaining({ color: 'red' }));
  });
});
