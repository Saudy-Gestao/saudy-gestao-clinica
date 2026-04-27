import { beforeEach, describe, expect, it, vi } from 'vitest';
import reportAuditLogService from '../reportAuditLogService';
import api from '../api';

vi.mock('../api', () => ({
  default: {
    get: vi.fn(),
  },
}));

describe('reportAuditLogService', () => {
  beforeEach(() => {
    vi.mocked(api.get).mockReset();
  });

  it('lists report audit logs with params', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { items: [{ id: 'l1' }], total: 1 } } as any);

    const result = await reportAuditLogService.list({ reportId: 'r1', addendumId: 'a1', limit: 20, offset: 5 });

    expect(api.get).toHaveBeenCalledWith('/care/report-audit-logs/', {
      params: { reportId: 'r1', addendumId: 'a1', limit: 20, offset: 5 },
    });
    expect(result.total).toBe(1);
  });
});