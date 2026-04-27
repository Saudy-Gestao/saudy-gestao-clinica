import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createMock, requestUseMock, responseUseMock } = vi.hoisted(() => ({
  createMock: vi.fn(),
  requestUseMock: vi.fn(),
  responseUseMock: vi.fn(),
}));

vi.mock('axios', () => ({
  default: {
    create: createMock,
  },
}));

vi.mock('../getApiBaseUrl', () => ({
  getApiBaseUrl: () => 'http://api.test',
}));

describe('patientPortalApi', () => {
  beforeEach(() => {
    vi.resetModules();
    createMock.mockReset();
    requestUseMock.mockReset();
    responseUseMock.mockReset();
    localStorage.clear();

    createMock.mockReturnValue({
      interceptors: {
        request: { use: requestUseMock },
        response: { use: responseUseMock },
      },
    });
  });

  it('registers interceptors and injects bearer token', async () => {
    localStorage.setItem('patient_portal_token', 'abc');
    const module = await import('../patientPortalApi');

    expect(createMock).toHaveBeenCalledWith({ baseURL: 'http://api.test' });
    expect(module.default).toBeDefined();
    expect(requestUseMock).toHaveBeenCalledTimes(1);

    const onRequest = requestUseMock.mock.calls[0][0] as (config: any) => any;
    const result = onRequest({ headers: {} });

    expect(result.headers.Authorization).toBe('Bearer abc');
  });

  it('rejects request interceptor errors', async () => {
    await import('../patientPortalApi');
    const onRequestRejected = requestUseMock.mock.calls[0][1] as (error: any) => Promise<never>;
    const error = new Error('request failed');

    await expect(onRequestRejected(error)).rejects.toBe(error);
  });

  it('handles 401 by clearing auth data and dispatching auth changed event', async () => {
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
    const replaceMock = vi.fn();
    Object.defineProperty(window, 'location', {
      value: { pathname: '/portal/home', replace: replaceMock },
      configurable: true,
    });

    localStorage.setItem('patient_portal_token', 'abc');
    localStorage.setItem('patient_portal_user', '{"id":"p1"}');

    await import('../patientPortalApi');

    const onRejected = responseUseMock.mock.calls[0][1] as (error: any) => Promise<never>;
    const error = {
      response: { status: 401 },
      config: { url: '/auth/patient-portal/me' },
    };

    await expect(onRejected(error)).rejects.toBe(error);
    expect(localStorage.getItem('patient_portal_token')).toBeNull();
    expect(localStorage.getItem('patient_portal_user')).toBeNull();
    expect(dispatchSpy).toHaveBeenCalled();
    expect(replaceMock).toHaveBeenCalledWith('/portal/login');
  });

  it('keeps auth data on auth endpoints even when 401', async () => {
    localStorage.setItem('patient_portal_token', 'abc');

    await import('../patientPortalApi');

    const onRejected = responseUseMock.mock.calls[0][1] as (error: any) => Promise<never>;
    const error = {
      response: { status: 401 },
      config: { url: '/auth/patient-portal/verify-code' },
    };

    await expect(onRejected(error)).rejects.toBe(error);
    expect(localStorage.getItem('patient_portal_token')).toBe('abc');
  });

  it('does not redirect when already on portal login route', async () => {
    const replaceMock = vi.fn();
    Object.defineProperty(window, 'location', {
      value: { pathname: '/portal/login', replace: replaceMock },
      configurable: true,
    });

    localStorage.setItem('patient_portal_token', 'abc');

    await import('../patientPortalApi');

    const onRejected = responseUseMock.mock.calls[0][1] as (error: any) => Promise<never>;
    const error = {
      response: { status: 401 },
      config: { url: '/auth/patient-portal/me' },
    };

    await expect(onRejected(error)).rejects.toBe(error);
    expect(replaceMock).not.toHaveBeenCalled();
  });
});
