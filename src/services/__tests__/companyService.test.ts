import companyService from '../companyService';
import api from '../api';
import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('../api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('companyService', () => {
  beforeEach(() => {
    (api.get as any).mockReset();
    (api.post as any).mockReset();
    (api.put as any).mockReset();
    (api.delete as any).mockReset();
  });

  it('createCompany should transform payload and POST to /auth/register', async () => {
    const payload = {
      admin: { name: 'A', email: 'a@b', password: 'p' },
      company: { cnpj: '1', phone: '2', razaoSocial: 'R', nomeFantasia: 'N', address: 'E' },
      branchesCount: 3,
      modulo: 'tea',
    };

    // capture body by mocking api.post
    (api.post as any).mockResolvedValue({ data: { ok: true } });

    const res = await companyService.createCompany(payload as any);

    expect(api.post).toHaveBeenCalledWith('/auth/register', expect.objectContaining({
      company: expect.objectContaining({ cnpj: '1', legalName: 'R', tradeName: 'N' }),
      user: expect.objectContaining({ name: 'A', email: 'a@b', password: 'p' }),
      sector: expect.objectContaining({ name: 'Admin' }),
      accesses: expect.any(Array),
      branch: expect.objectContaining({ tradeName: 'N' }),
      branchesCount: 3,
      modulo: 'tea',
    }));
    expect(res).toEqual({ ok: true });
  });

  it('other methods should hit correct endpoints', async () => {
    (api.get as any).mockResolvedValue({ data: { id: '1' } });
    const list = await companyService.listCompanies();
    expect(api.get).toHaveBeenCalledWith('/auth/companies');
    expect(list).toEqual({ id: '1' });

    (api.get as any).mockResolvedValue({ data: { id: '2' } });
    const single = await companyService.getCompany('2');
    expect(api.get).toHaveBeenCalledWith('/auth/companies/2');
    expect(single).toEqual({ id: '2' });

    (api.put as any).mockResolvedValue({ data: { ok: true } });
    const upd = await companyService.updateCompany('5', { foo: 1 });
    expect(api.put).toHaveBeenCalledWith('/auth/companies/5', { foo: 1 });
    expect(upd).toEqual({ ok: true });

    (api.delete as any).mockResolvedValue({ data: { deleted: true } });
    const del = await companyService.deleteCompany('9');
    expect(api.delete).toHaveBeenCalledWith('/auth/companies/9');
    expect(del).toEqual({ deleted: true });
  });
});
