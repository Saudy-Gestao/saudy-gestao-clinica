import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../api';
import whatsappConversationService from '../whatsappConversationService';

vi.mock('../api', () => ({
  default: {
    get: vi.fn(),
    put: vi.fn(),
    post: vi.fn(),
  },
}));

describe('whatsappConversationService', () => {
  beforeEach(() => {
    vi.mocked(api.get).mockReset();
    vi.mocked(api.put).mockReset();
    vi.mocked(api.post).mockReset();
  });

  it('handles list and mutation endpoints', async () => {
    vi.mocked(api.get)
      .mockResolvedValueOnce({ data: { items: [{ key: 'FLOW_1', label: 'Flow 1' }] } } as any)
      .mockResolvedValueOnce({ data: { settings: { id: 's1' }, items: [{ userId: 'u1' }] } } as any)
      .mockResolvedValueOnce({ data: { items: [{ id: 'c1' }] } } as any)
      .mockResolvedValueOnce({ data: { conversation: { id: 'c1' }, items: [{ id: 'm1' }] } } as any)
      .mockResolvedValueOnce({ data: { conversation: { id: 'c1' }, protocol: { number: 'P1' }, items: [{ id: 'm2' }] } } as any);
    vi.mocked(api.put)
      .mockResolvedValueOnce({ data: { ok: true } } as any)
      .mockResolvedValueOnce({ data: { ok: true } } as any);
    vi.mocked(api.post)
      .mockResolvedValueOnce({ data: { claimed: true } } as any)
      .mockResolvedValueOnce({ data: { id: 'm3' } } as any)
      .mockResolvedValueOnce({ data: { closed: true } } as any);

    await expect(whatsappConversationService.listFlows()).resolves.toEqual([{ key: 'FLOW_1', label: 'Flow 1' }]);
    await expect(whatsappConversationService.listOperators()).resolves.toEqual({ settings: { id: 's1' }, items: [{ userId: 'u1' }] });
    await expect(whatsappConversationService.saveSettings({ idleTimeoutMinutes: 10, closeWarningMinutes: 2 }, { scope: 'COMPANY', inheritFromCompany: true })).resolves.toEqual({ ok: true });
    await expect(
      whatsappConversationService.saveOperatorConfig('u1', { isActive: true, maxActiveConversations: 5, flowKeys: ['FLOW_1'] }, { scope: 'COMPANY', inheritFromCompany: true }),
    ).resolves.toEqual({ ok: true });
    await expect(whatsappConversationService.listConversations({ status: 'ALL' })).resolves.toEqual([{ id: 'c1' }]);
    await expect(whatsappConversationService.getMessages('c1')).resolves.toEqual({ conversation: { id: 'c1' }, items: [{ id: 'm1' }] });
    await expect(whatsappConversationService.getProtocolHistory('c1', 'P1')).resolves.toEqual({
      conversation: { id: 'c1' },
      protocol: { number: 'P1' },
      items: [{ id: 'm2' }],
    });
    await expect(whatsappConversationService.claimConversation('c1')).resolves.toEqual({ claimed: true });
    await expect(whatsappConversationService.sendMessage('c1', 'oi')).resolves.toEqual({ id: 'm3' });
    await expect(whatsappConversationService.closeConversation('c1', 'até mais')).resolves.toEqual({ closed: true });
  });

  it('falls back for operators/settings/operator config on legacy API', async () => {
    vi.mocked(api.get)
      .mockRejectedValueOnce({ response: { status: 404 } } as any)
      .mockResolvedValueOnce({ data: { settings: { id: 'legacy' }, items: [{ userId: 'u-legacy' }] } } as any);
    vi.mocked(api.put)
      .mockRejectedValueOnce({ response: { status: 405 } } as any)
      .mockResolvedValueOnce({ data: { ok: 'legacy-settings' } } as any)
      .mockRejectedValueOnce({ response: { status: 400 } } as any)
      .mockResolvedValueOnce({ data: { ok: 'legacy-operator' } } as any);

    await expect(whatsappConversationService.listOperators('COMPANY')).resolves.toEqual({
      settings: { id: 'legacy' },
      items: [{ userId: 'u-legacy' }],
    });
    await expect(whatsappConversationService.saveSettings({ idleTimeoutMinutes: 15, closeWarningMinutes: 3 }, { scope: 'COMPANY' })).resolves.toEqual({ ok: 'legacy-settings' });
    await expect(
      whatsappConversationService.saveOperatorConfig('u2', { isActive: false, maxActiveConversations: 1, flowKeys: [] }, { scope: 'COMPANY' }),
    ).resolves.toEqual({ ok: 'legacy-operator' });

    expect(api.get).toHaveBeenNthCalledWith(1, '/care/whatsapp/conversations/operators', { params: { scope: 'COMPANY' } });
    expect(api.get).toHaveBeenNthCalledWith(2, '/care/whatsapp/conversations/operators');
  });

  it('does not fallback when scope is BRANCH and status is unsupported', async () => {
    vi.mocked(api.get).mockRejectedValue({ response: { status: 404 } } as any);
    vi.mocked(api.put).mockRejectedValue({ response: { status: 422 } } as any);

    await expect(whatsappConversationService.listOperators('BRANCH')).rejects.toEqual({ response: { status: 404 } });
    await expect(
      whatsappConversationService.saveSettings({ idleTimeoutMinutes: 15, closeWarningMinutes: 3 }, { scope: 'BRANCH' }),
    ).rejects.toEqual({ response: { status: 422 } });
  });

  it('returns empty protocol history when protocol number is blank', async () => {
    await expect(whatsappConversationService.getProtocolHistory('c1', '   ')).resolves.toEqual({ items: [] });
    expect(api.get).not.toHaveBeenCalled();
  });

  it('falls back to getMessages and filters by protocol metadata', async () => {
    vi.mocked(api.get)
      .mockRejectedValueOnce(new Error('not-found'))
      .mockResolvedValueOnce({
        data: {
          conversation: {
            id: 'c1',
            humanProtocolStartedAt: '2026-01-01T09:00:00Z',
            humanProtocolClosedAt: '2026-01-01T09:10:00Z',
          },
          items: [
            { id: 'm1', metadata: { protocolNumber: 'P-1' } },
            { id: 'm2', metadata: { protocolNumber: 'P-2' } },
            { id: 'm3', metadata: null },
          ],
        },
      } as any);

    await expect(whatsappConversationService.getProtocolHistory('c1', 'P-1')).resolves.toEqual({
      conversation: {
        id: 'c1',
        humanProtocolStartedAt: '2026-01-01T09:00:00Z',
        humanProtocolClosedAt: '2026-01-01T09:10:00Z',
      },
      protocol: {
        number: 'P-1',
        startedAt: '2026-01-01T09:00:00Z',
        closedAt: '2026-01-01T09:10:00Z',
      },
      items: [{ id: 'm1', metadata: { protocolNumber: 'P-1' } }],
    });
  });
});
