import internService from '../internService';
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

describe('internService', () => {
  beforeEach(() => {
    (api.get as any).mockReset();
    (api.post as any).mockReset();
    (api.put as any).mockReset();
    (api.delete as any).mockReset();
  });

  it('listInterns fetches without a search param when omitted', async () => {
    (api.get as any).mockResolvedValue({ data: [{ id: '1' }] });
    const result = await internService.listInterns();
    expect(api.get).toHaveBeenCalledWith('/accounts/interns/', { params: undefined });
    expect(result).toEqual([{ id: '1' }]);
  });

  it('listInterns forwards a search param when provided', async () => {
    (api.get as any).mockResolvedValue({ data: [] });
    await internService.listInterns('ana');
    expect(api.get).toHaveBeenCalledWith('/accounts/interns/', { params: { search: 'ana' } });
  });

  it('createIntern posts the payload', async () => {
    (api.post as any).mockResolvedValue({ data: { id: '2' } });
    const payload = { name: 'Ana', professionalIds: ['p1'] };
    const result = await internService.createIntern(payload as any);
    expect(api.post).toHaveBeenCalledWith('/accounts/interns/', payload);
    expect(result).toEqual({ id: '2' });
  });

  it('updateIntern puts the partial payload', async () => {
    (api.put as any).mockResolvedValue({ data: { id: '2', name: 'Bruno' } });
    const result = await internService.updateIntern('2', { name: 'Bruno' });
    expect(api.put).toHaveBeenCalledWith('/accounts/interns/2', { name: 'Bruno' });
    expect(result).toEqual({ id: '2', name: 'Bruno' });
  });

  it('deleteIntern deletes by id', async () => {
    (api.delete as any).mockResolvedValue({ data: { deleted: true } });
    const result = await internService.deleteIntern('2');
    expect(api.delete).toHaveBeenCalledWith('/accounts/interns/2');
    expect(result).toEqual({ deleted: true });
  });
});
