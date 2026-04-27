import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../api';
import ticketService from '../ticketService';

vi.mock('../api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  },
}));

describe('ticketService', () => {
  beforeEach(() => {
    vi.mocked(api.get).mockReset();
    vi.mocked(api.post).mockReset();
    vi.mocked(api.patch).mockReset();
  });

  it('covers create/list/update/message and attachment endpoints', async () => {
    const blob = new Blob(['file']);
    vi.mocked(api.post)
      .mockResolvedValueOnce({ data: { id: 't1' } } as any)
      .mockResolvedValueOnce({ data: { id: 'm-admin' } } as any)
      .mockResolvedValueOnce({ data: { id: 'm-user' } } as any)
      .mockResolvedValueOnce({ data: { id: 't1', status: 'CLOSED' } } as any);
    vi.mocked(api.get)
      .mockResolvedValueOnce({ data: [{ id: 'admin-1' }] } as any)
      .mockResolvedValueOnce({ data: { data: [{ id: 'mine-1' }], total: 'not-number', unreadCount: 'nan' } } as any)
      .mockResolvedValueOnce({ data: { id: 't1' } } as any)
      .mockResolvedValueOnce({ data: { items: [{ id: 'm1' }] } } as any)
      .mockResolvedValueOnce({ data: { items: [{ id: 'm2' }] } } as any)
      .mockResolvedValueOnce({ data: { id: 't2' } } as any)
      .mockResolvedValueOnce({ data: blob } as any)
      .mockResolvedValueOnce({ data: blob } as any);
    vi.mocked(api.patch)
      .mockResolvedValueOnce({ data: { id: 't1', status: 'IN_PROGRESS' } } as any)
      .mockResolvedValueOnce({ data: { id: 't1', priority: 'HIGH' } } as any);

    await expect(ticketService.create({ flow: 'X', module: 'Y', type: 'BUG', description: 'desc' })).resolves.toEqual({ id: 't1' });
    await expect(ticketService.list({ status: 'ALL' })).resolves.toEqual({ items: [{ id: 'admin-1' }], total: 1 });
    await expect(ticketService.listMine({ status: 'ALL' })).resolves.toEqual({ items: [{ id: 'mine-1' }], total: 1, unreadCount: undefined });
    await expect(ticketService.updateStatus('t1', 'IN_PROGRESS')).resolves.toEqual({ id: 't1', status: 'IN_PROGRESS' });
    await expect(ticketService.updatePriority('t1', 'HIGH')).resolves.toEqual({ id: 't1', priority: 'HIGH' });
    await expect(ticketService.getAdminById('t1')).resolves.toEqual({ id: 't1' });
    await expect(ticketService.listAdminMessages('t1')).resolves.toEqual([{ id: 'm1' }]);
    await expect(ticketService.sendAdminMessage('t1', { message: 'oi' })).resolves.toEqual({ id: 'm-admin' });
    await expect(ticketService.listMyMessages('t1')).resolves.toEqual([{ id: 'm2' }]);
    await expect(ticketService.getMineById('t2')).resolves.toEqual({ id: 't2' });
    await expect(ticketService.sendMyMessage('t1', { message: 'ok' })).resolves.toEqual({ id: 'm-user' });
    await expect(ticketService.confirmMyTicketClose('t1')).resolves.toEqual({ id: 't1', status: 'CLOSED' });
    await expect(ticketService.viewAdminMessageAttachment('m1')).resolves.toBe(blob);
    await expect(ticketService.viewMyMessageAttachment('m2')).resolves.toBe(blob);
  });

  it('returns empty message arrays on invalid payloads', async () => {
    vi.mocked(api.get)
      .mockResolvedValueOnce({ data: {} } as any)
      .mockResolvedValueOnce({ data: null } as any);

    await expect(ticketService.listAdminMessages('t1')).resolves.toEqual([]);
    await expect(ticketService.listMyMessages('t1')).resolves.toEqual([]);
  });
});
