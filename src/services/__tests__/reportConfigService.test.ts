import { beforeEach, describe, expect, it, vi } from 'vitest';
import reportConfigService from '../reportConfigService';
import api from '../api';

vi.mock('../api', () => ({
  default: {
    get: vi.fn(),
    put: vi.fn(),
  },
}));

describe('reportConfigService', () => {
  beforeEach(() => {
    vi.mocked(api.get).mockReset();
    vi.mocked(api.put).mockReset();
  });

  it('gets and updates report config', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { requiresReviewer: true } } as any);
    vi.mocked(api.put).mockResolvedValue({ data: { requiresReviewer: false } } as any);

    await expect(reportConfigService.get()).resolves.toEqual({ requiresReviewer: true });
    await expect(reportConfigService.update({ requiresReviewer: false })).resolves.toEqual({ requiresReviewer: false });

    expect(api.get).toHaveBeenCalledWith('/care/report-config/');
    expect(api.put).toHaveBeenCalledWith('/care/report-config/', { requiresReviewer: false });
  });
});