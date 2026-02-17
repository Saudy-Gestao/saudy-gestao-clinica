import envelopmentService from '../envelopmentService';
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

describe('envelopmentService', () => {
  beforeEach(() => {
    (api.get as any).mockReset();
    (api.post as any).mockReset();
    (api.put as any).mockReset();
    (api.delete as any).mockReset();
  });

  it('list() should call GET /care/envelopments/ and return data', async () => {
    (api.get as any).mockResolvedValue({ data: [{ id: 1, patientName: 'X' }] });
    const res = await envelopmentService.list({ search: 'x' });
    expect(api.get).toHaveBeenCalledWith('/care/envelopments/', { params: { search: 'x' } });
    expect(res).toEqual([{ id: 1, patientName: 'X' }]);
  });

  it('create/update/remove should call correct endpoints', async () => {
    const payload = { patientName: 'A' };
    (api.post as any).mockResolvedValue({ data: { id: 10, ...payload } });
    const created = await envelopmentService.create(payload as any);
    expect(api.post).toHaveBeenCalledWith('/care/envelopments/', payload);
    expect(created).toEqual({ id: 10, ...payload });

    (api.put as any).mockResolvedValue({ data: { id: '10', patientName: 'B' } });
    const updated = await envelopmentService.update('10', { patientName: 'B' });
    expect(api.put).toHaveBeenCalledWith('/care/envelopments/10', { patientName: 'B' });
    expect(updated).toEqual({ id: '10', patientName: 'B' });

    (api.delete as any).mockResolvedValue({ data: { ok: true } });
    const removed = await envelopmentService.remove('10');
    expect(api.delete).toHaveBeenCalledWith('/care/envelopments/10');
    expect(removed).toEqual({ ok: true });
  });
});