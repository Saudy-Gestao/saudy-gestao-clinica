import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../api';
import tissBatchService from '../tissBatchService';

vi.mock('../api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  },
}));

describe('tissBatchService', () => {
  beforeEach(() => {
    vi.mocked(api.get).mockReset();
    vi.mocked(api.post).mockReset();
    vi.mocked(api.patch).mockReset();
  });

  it('covers listing and mutations', async () => {
    const blob = new Blob(['xml']);
    vi.mocked(api.get)
      .mockResolvedValueOnce({ data: { items: [{ id: 'b1' }], total: 1, limit: 10, offset: 0 } } as any)
      .mockResolvedValueOnce({ data: blob } as any);
    vi.mocked(api.post)
      .mockResolvedValueOnce({ data: { id: 'b1' } } as any)
      .mockResolvedValueOnce({ data: { id: 'b1', status: 'GENERATED' } } as any)
      .mockResolvedValueOnce({ data: { id: 'b1', status: 'SENT' } } as any);
    vi.mocked(api.patch)
      .mockResolvedValueOnce({ data: { id: 'b1', status: 'SENT' } } as any)
      .mockResolvedValueOnce({ data: { id: 'b1', protocolNumber: 'P123' } } as any);

    await expect(tissBatchService.list({ convention: 'unimed' })).resolves.toEqual({
      items: [{ id: 'b1' }],
      total: 1,
      limit: 10,
      offset: 0,
    });
    await expect(tissBatchService.create({ competenceMonth: '2026-01', convention: 'unimed', invoiceIds: ['i1'] })).resolves.toEqual({ id: 'b1' });
    await expect(tissBatchService.updateStatus('b1', { status: 'SENT' })).resolves.toEqual({ id: 'b1', status: 'SENT' });
    await expect(tissBatchService.registerProtocol('b1', { protocolNumber: 'P123' })).resolves.toEqual({ id: 'b1', protocolNumber: 'P123' });
    await expect(tissBatchService.registerReturn('b1', { items: [{ status: 'ACCEPTED', guideNumber: 'g1' }] })).resolves.toEqual({ id: 'b1', status: 'GENERATED' });
    await expect(tissBatchService.represent('b1')).resolves.toEqual({ id: 'b1', status: 'SENT' });
    await expect(tissBatchService.downloadXml('b1')).resolves.toBe(blob);

    expect(api.post).toHaveBeenNthCalledWith(3, '/admin/tiss-batches/b1/represent', {});
    expect(api.get).toHaveBeenNthCalledWith(2, '/admin/tiss-batches/b1/xml', { responseType: 'blob' });
  });
});
