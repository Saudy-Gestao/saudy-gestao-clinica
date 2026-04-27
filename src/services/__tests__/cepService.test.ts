import { afterEach, describe, expect, it, vi } from 'vitest';
import cepService from '../cepService';

describe('cepService', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns null for invalid cep and falls back from ViaCEP to BrasilAPI', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ erro: true }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ street: 'Rua A', neighborhood: 'Centro', city: 'Recife', state: 'PE', complement: 'Sala 1' }) });

    vi.stubGlobal('fetch', fetchMock as any);

    await expect(cepService.lookup('123')).resolves.toBeNull();
    await expect(cepService.lookup('50000-000')).resolves.toEqual({
      street: 'Rua A',
      neighborhood: 'Centro',
      city: 'Recife',
      state: 'PE',
      complement: 'Sala 1',
    });

    expect(fetchMock).toHaveBeenNthCalledWith(1, 'https://viacep.com.br/ws/50000000/json/', { method: 'GET' });
    expect(fetchMock).toHaveBeenNthCalledWith(2, 'https://brasilapi.com.br/api/cep/v1/50000000', { method: 'GET' });
  });

  it('returns ViaCEP payload when available and null when both providers fail', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ logradouro: 'Rua B', bairro: 'Boa Vista', localidade: 'Recife', uf: 'PE', complemento: '' }) })
      .mockResolvedValueOnce({ ok: false, json: async () => ({}) })
      .mockResolvedValueOnce({ ok: false, json: async () => ({}) });

    vi.stubGlobal('fetch', fetchMock as any);

    await expect(cepService.lookup('50000001')).resolves.toEqual({
      street: 'Rua B',
      neighborhood: 'Boa Vista',
      city: 'Recife',
      state: 'PE',
      complement: '',
    });

    await expect(cepService.lookup('50000002')).resolves.toBeNull();
  });
});