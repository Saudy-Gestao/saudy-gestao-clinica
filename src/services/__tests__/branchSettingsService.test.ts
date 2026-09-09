import branchSettingsService from '../branchSettingsService';
import api from '../api';
import { vi, describe, it, expect, beforeEach } from 'vitest';

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

  it('getBranchSettings fetches settings for a branch', async () => {
    (api.get as any).mockResolvedValue({ data: { id: 's1', branchId: 'b1' } });
    const result = await branchSettingsService.getBranchSettings('b1');
    expect(api.get).toHaveBeenCalledWith('/auth/branches/b1/settings');
    expect(result).toEqual({ id: 's1', branchId: 'b1' });
  });

  it('updateBranchSettings sends a partial payload and returns the updated settings', async () => {
    (api.put as any).mockResolvedValue({ data: { id: 's1', branchId: 'b1', publicCheckInEnabled: true } });
    const result = await branchSettingsService.updateBranchSettings('b1', { publicCheckInEnabled: true });
    expect(api.put).toHaveBeenCalledWith('/auth/branches/b1/settings', { publicCheckInEnabled: true });
    expect(result).toEqual({ id: 's1', branchId: 'b1', publicCheckInEnabled: true });
  });
});
