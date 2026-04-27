import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../api';
import branchSettingsService from '../branchSettingsService';

vi.mock('../api', () => ({
  default: {
    get: vi.fn(),
    put: vi.fn(),
  },
}));

describe('branchSettingsService', () => {
  beforeEach(() => {
    (api.get as any).mockReset();
    (api.put as any).mockReset();
  });

  it('gets branch settings by branch id', async () => {
    (api.get as any).mockResolvedValue({ data: { id: 'bs1', branchId: 'b1', publicCheckInEnabled: true } });

    const result = await branchSettingsService.getBranchSettings('b1');

    expect(api.get).toHaveBeenCalledWith('/auth/branches/b1/settings');
    expect(result.branchId).toBe('b1');
  });

  it('updates branch settings', async () => {
    (api.put as any).mockResolvedValue({ data: { id: 'bs1', branchId: 'b1', noShowToleranceMinutes: 15 } });

    const result = await branchSettingsService.updateBranchSettings('b1', { noShowToleranceMinutes: 15 });

    expect(api.put).toHaveBeenCalledWith('/auth/branches/b1/settings', { noShowToleranceMinutes: 15 });
    expect(result.noShowToleranceMinutes).toBe(15);
  });
});
