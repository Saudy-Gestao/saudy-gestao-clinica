import { beforeEach, describe, expect, it, vi } from 'vitest';
import reportAddendumService from '../reportAddendumService';
import api from '../api';

vi.mock('../api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('reportAddendumService', () => {
  beforeEach(() => {
    vi.mocked(api.get).mockReset();
    vi.mocked(api.post).mockReset();
    vi.mocked(api.put).mockReset();
    vi.mocked(api.delete).mockReset();
  });

  it('lists, creates, updates and removes addendums', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { items: [{ id: 'a1' }], total: 1 } } as any);
    vi.mocked(api.post).mockResolvedValue({ data: { id: 'a2' } } as any);
    vi.mocked(api.put).mockResolvedValue({ data: { id: 'a2', status: 'DONE' } } as any);
    vi.mocked(api.delete).mockResolvedValue({ data: { success: true } } as any);

    await expect(reportAddendumService.list({ reportId: 'r1', limit: 10, offset: 0 })).resolves.toEqual({ items: [{ id: 'a1' }], total: 1 });
    await expect(reportAddendumService.create({ reportId: 'r1', content: 'texto' })).resolves.toEqual({ id: 'a2' });
    await expect(reportAddendumService.update('a2', { status: 'DONE' })).resolves.toEqual({ id: 'a2', status: 'DONE' });
    await expect(reportAddendumService.remove('a2')).resolves.toEqual({ success: true });

    expect(api.get).toHaveBeenCalledWith('/care/report-addendums/', { params: { reportId: 'r1', limit: 10, offset: 0 } });
    expect(api.post).toHaveBeenCalledWith('/care/report-addendums/', { reportId: 'r1', content: 'texto' });
    expect(api.put).toHaveBeenCalledWith('/care/report-addendums/a2', { status: 'DONE' });
    expect(api.delete).toHaveBeenCalledWith('/care/report-addendums/a2');
  });
});