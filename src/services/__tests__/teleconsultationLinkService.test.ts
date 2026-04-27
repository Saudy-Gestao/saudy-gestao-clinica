import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../api';
import teleconsultationLinkService from '../teleconsultationLinkService';

const { publicApiGetMock, publicApiPostMock } = vi.hoisted(() => ({
  publicApiGetMock: vi.fn(),
  publicApiPostMock: vi.fn(),
}));

vi.mock('../api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => ({
      get: publicApiGetMock,
      post: publicApiPostMock,
    })),
  },
}));

describe('teleconsultationLinkService', () => {
  beforeEach(() => {
    (api.get as any).mockReset();
    (api.post as any).mockReset();
    publicApiGetMock.mockReset();
    publicApiPostMock.mockReset();
  });

  it('hits eligibility and send link endpoints', async () => {
    (api.get as any).mockResolvedValue({ data: { canSendLink: true } });
    (api.post as any).mockResolvedValue({ data: { message: 'ok' } });

    const eligibility = await teleconsultationLinkService.getPreAttendanceEligibility('pre-1');
    const sent = await teleconsultationLinkService.sendWhatsAppLink('pre-1');

    expect(api.get).toHaveBeenCalledWith('/care/teleconsultation-links/pre-attendance/pre-1/eligibility');
    expect(api.post).toHaveBeenCalledWith('/care/teleconsultation-links/pre-attendance/pre-1/send-whatsapp-link', {});
    expect(eligibility).toEqual({ canSendLink: true });
    expect(sent).toEqual({ message: 'ok' });
  });

  it('uses public endpoints for token, signals and messages', async () => {
    publicApiGetMock.mockResolvedValueOnce({ data: { valid: true } });
    publicApiPostMock.mockResolvedValueOnce({ data: { ok: true, eventId: 1 } });
    publicApiGetMock.mockResolvedValueOnce({ data: { events: [], lastEventId: 0 } });
    publicApiGetMock.mockResolvedValueOnce({ data: { items: [] } });

    const tokenMeta = await teleconsultationLinkService.resolvePublicToken('abc');
    const signal = await teleconsultationLinkService.sendPublicSignal('abc', { type: 'ready' });
    const pulled = await teleconsultationLinkService.pullPublicSignals('abc');
    const messages = await teleconsultationLinkService.listPublicMessages('abc');

    expect(tokenMeta).toEqual({ valid: true });
    expect(signal).toEqual({ ok: true, eventId: 1 });
    expect(pulled).toEqual({ events: [], lastEventId: 0 });
    expect(messages).toEqual({ items: [] });

    expect(publicApiGetMock).toHaveBeenCalledWith('/care/teleconsultation-links/public', {
      params: { token: 'abc' },
    });
    expect(publicApiPostMock).toHaveBeenCalledWith('/care/teleconsultation-links/public/signal', {
      token: 'abc',
      type: 'ready',
      payload: {},
      toRole: undefined,
    });
  });
});
