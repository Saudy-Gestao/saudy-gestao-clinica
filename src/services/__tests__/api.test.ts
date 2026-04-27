import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  requestUseMock,
  responseUseMock,
  createMock,
  resolveApiErrorMessageMock,
} = vi.hoisted(() => {
  const requestUse = vi.fn();
  const responseUse = vi.fn();
  const create = vi.fn(() => ({
    interceptors: {
      request: { use: requestUse },
      response: { use: responseUse },
    },
  }));

  return {
    requestUseMock: requestUse,
    responseUseMock: responseUse,
    createMock: create,
    resolveApiErrorMessageMock: vi.fn(() => 'Mensagem normalizada'),
  };
});

vi.mock('axios', () => ({
  default: {
    create: createMock,
  },
}));

vi.mock('../getApiBaseUrl', () => ({
  getApiBaseUrl: vi.fn(() => 'https://api.test'),
}));

vi.mock('../../lib/apiError', () => ({
  resolveApiErrorMessage: resolveApiErrorMessageMock,
}));

// Import after mocks to capture interceptor handlers from module initialization.
import '../api';

describe('api interceptors', () => {
  beforeEach(() => {
    resolveApiErrorMessageMock.mockClear();
    localStorage.clear();
  });

  it('registers request and response interceptors on module load', async () => {
    const mod = await import('../api');

    expect(mod.default).toBeDefined();
    expect(createMock).toHaveBeenCalledWith({ baseURL: 'https://api.test' });
    expect(requestUseMock).toHaveBeenCalledTimes(1);
    expect(responseUseMock).toHaveBeenCalledTimes(1);
  });

  it('adds bearer token in request interceptor when token exists', async () => {
    localStorage.setItem('token', 'token-123');

    const onFulfilled = requestUseMock.mock.calls[0][0];
    const config = await onFulfilled({ headers: {} });

    expect(config.headers.Authorization).toBe('Bearer token-123');
  });

  it('rejects request interceptor errors', async () => {
    const onRejected = requestUseMock.mock.calls[0][1];
    const requestError = new Error('request failed');

    await expect(onRejected(requestError)).rejects.toBe(requestError);
  });

  it('normalizes response error message and payload fields', async () => {
    const onRejected = responseUseMock.mock.calls[0][1];
    const error: any = {
      message: 'raw error',
      config: { url: '/care/test' },
      response: {
        status: 400,
        data: {
          message: 'raw message',
          error: 'raw error',
          detail: 'raw detail',
        },
      },
    };

    await expect(onRejected(error)).rejects.toBe(error);

    expect(resolveApiErrorMessageMock).toHaveBeenCalledWith(
      error,
      'Não foi possível concluir a solicitação.',
    );
    expect(error.message).toBe('Mensagem normalizada');
    expect(error.userMessage).toBe('Mensagem normalizada');
    expect(error.response.data.message).toBe('Mensagem normalizada');
    expect(error.response.data.error).toBe('Mensagem normalizada');
    expect(error.response.data.detail).toBe('Mensagem normalizada');
    expect(error.response.data.originalMessage).toBe('raw message');
    expect(error.response.data.originalError).toBe('raw error');
    expect(error.response.data.originalDetail).toBe('raw detail');
  });

  it('handles 401 with token by clearing auth and redirecting', async () => {
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
    const replaceMock = vi.fn();
    Object.defineProperty(window, 'location', {
      value: { pathname: '/dashboard', replace: replaceMock },
      configurable: true,
    });

    localStorage.setItem('token', 'token-123');
    localStorage.setItem('user', '{"id":"u1"}');

    const onRejected = responseUseMock.mock.calls[0][1];
    const error: any = {
      config: { url: '/care/test' },
      response: { status: 401, data: null },
    };

    await expect(onRejected(error)).rejects.toBe(error);
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
    expect(dispatchSpy).toHaveBeenCalled();
    expect(replaceMock).toHaveBeenCalledWith('/login');
  });

  it('does not clear auth for auth endpoints on 401', async () => {
    localStorage.setItem('token', 'token-123');
    localStorage.setItem('user', '{"id":"u1"}');

    const onRejected = responseUseMock.mock.calls[0][1];
    const error: any = {
      config: { url: '/auth/login' },
      response: { status: 401, data: {} },
    };

    await expect(onRejected(error)).rejects.toBe(error);
    expect(localStorage.getItem('token')).toBe('token-123');
    expect(localStorage.getItem('user')).toBe('{"id":"u1"}');
  });
});
