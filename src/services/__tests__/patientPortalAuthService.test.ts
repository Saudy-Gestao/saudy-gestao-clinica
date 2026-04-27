import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../patientPortalApi';
import patientPortalAuthService from '../patientPortalAuthService';

vi.mock('../patientPortalApi', () => ({
  default: {
    post: vi.fn(),
  },
}));

describe('patientPortalAuthService', () => {
  beforeEach(() => {
    vi.mocked(api.post).mockReset();
    localStorage.clear();
  });

  it('requests code normalizing cpf digits', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { challengeToken: 'c1' } } as any);

    await expect(patientPortalAuthService.requestCode('123.456.789-01', '2000-01-01')).resolves.toEqual({
      challengeToken: 'c1',
    });

    expect(api.post).toHaveBeenCalledWith('/auth/patient-portal/request-code', {
      cpf: '12345678901',
      birthDate: '2000-01-01',
    });
  });

  it('verifies code, saves auth data and emits event when token exists', async () => {
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
    vi.mocked(api.post).mockResolvedValue({
      data: {
        token: 'token-1',
        patient: { id: 'p1', cpf: '123' },
      },
    } as any);

    const result = await patientPortalAuthService.verifyCode('challenge', '12-34');

    expect(api.post).toHaveBeenCalledWith('/auth/patient-portal/verify-code', {
      challengeToken: 'challenge',
      code: '1234',
    });
    expect(localStorage.getItem('patient_portal_token')).toBe('token-1');
    expect(localStorage.getItem('patient_portal_user')).toBe(JSON.stringify({ id: 'p1', cpf: '123' }));
    expect(dispatchSpy).toHaveBeenCalled();
    expect(result.token).toBe('token-1');
  });

  it('selects profile and handles auth helpers', async () => {
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
    vi.mocked(api.post).mockResolvedValue({ data: { token: 'token-2', patient: { id: 'p2', cpf: '999' } } } as any);

    await expect(patientPortalAuthService.selectProfile('p2')).resolves.toEqual({
      token: 'token-2',
      patient: { id: 'p2', cpf: '999' },
    });

    expect(api.post).toHaveBeenCalledWith('/auth/patient-portal/me/select-profile', { patientId: 'p2' });
    expect(patientPortalAuthService.isAuthenticated()).toBe(true);
    expect(patientPortalAuthService.getToken()).toBe('token-2');
    expect(patientPortalAuthService.getCurrentUser()).toEqual({ id: 'p2', cpf: '999' });

    localStorage.setItem('patient_portal_user', '{invalid-json');
    expect(patientPortalAuthService.getCurrentUser()).toBeNull();

    patientPortalAuthService.logout();
    expect(patientPortalAuthService.isAuthenticated()).toBe(false);
    expect(dispatchSpy).toHaveBeenCalled();
  });
});
