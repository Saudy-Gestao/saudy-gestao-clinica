import { describe, expect, it, vi } from 'vitest';
import { notifications } from '@mantine/notifications';
import { showErrorToast, showInfoToast, showSuccessToast } from '../toast';

const { resolveApiErrorMessageMock } = vi.hoisted(() => ({
  resolveApiErrorMessageMock: vi.fn(() => 'Erro amigavel'),
}));
vi.mock('../apiError', () => ({
  resolveApiErrorMessage: resolveApiErrorMessageMock,
}));

vi.mock('@mantine/notifications', () => ({
  notifications: {
    show: vi.fn(),
  },
}));

describe('toast helpers', () => {
  it('shows success and info toasts with expected colors', () => {
    showSuccessToast({ title: 'Sucesso', message: 'Operacao concluida' });
    showInfoToast({ title: 'Info', message: 'Aviso' });

    expect(notifications.show).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Sucesso',
      message: 'Operacao concluida',
      color: 'green',
    }));

    expect(notifications.show).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Info',
      message: 'Aviso',
      color: 'blue',
    }));
  });

  it('shows error toast with normalized message', () => {
    showErrorToast({ title: 'Erro', error: { message: 'raw' }, fallback: 'Falhou' });

    expect(resolveApiErrorMessageMock).toHaveBeenCalledWith({ message: 'raw' }, 'Falhou');
    expect(notifications.show).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Erro',
      message: 'Erro amigavel',
      color: 'red',
    }));
  });
});
