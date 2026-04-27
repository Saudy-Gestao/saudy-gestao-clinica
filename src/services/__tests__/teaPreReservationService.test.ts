import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../api';
import teaPreReservationService from '../teaPreReservationService';

vi.mock('../api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  },
}));

describe('teaPreReservationService', () => {
  beforeEach(() => {
    vi.mocked(api.get).mockReset();
    vi.mocked(api.post).mockReset();
    vi.mocked(api.patch).mockReset();
  });

  it('handles listing, suggestions and timeline endpoints', async () => {
    vi.mocked(api.get)
      .mockResolvedValueOnce({ data: { items: [{ id: 'c1' }], total: 1 } } as any)
      .mockResolvedValueOnce({ data: { items: [{ id: 'p1' }] } } as any)
      .mockResolvedValueOnce({ data: { items: [{ date: '2026-01-01' }] } } as any)
      .mockResolvedValueOnce({ data: { week: [] } } as any)
      .mockResolvedValueOnce({ data: { allGood: true } } as any)
      .mockResolvedValueOnce({ data: { items: [{ id: 'ev1' }] } } as any)
      .mockResolvedValueOnce({ data: { items: [{ id: 'th1' }] } } as any);

    await expect(teaPreReservationService.listCreated({ status: 'PROPOSED', limit: 10 })).resolves.toEqual({ items: [{ id: 'c1' }], total: 1 });
    await expect(teaPreReservationService.listPending({ search: 'ana' })).resolves.toEqual({ items: [{ id: 'p1' }] });
    await expect(
      teaPreReservationService.getSuggestions('pt1', { daysAhead: 7, limit: 5, exclude: ['1', '2'] }),
    ).resolves.toEqual({ items: [{ date: '2026-01-01' }] });
    await expect(teaPreReservationService.getManualGrid('pt1', { weekStart: '2026-01-05' })).resolves.toEqual({ week: [] });
    await expect(teaPreReservationService.getConversionChecklist('r1')).resolves.toEqual({ allGood: true });
    await expect(teaPreReservationService.getTimeline('r1')).resolves.toEqual({ items: [{ id: 'ev1' }] });
    await expect(teaPreReservationService.listCancellationTherapies({ teaProfileId: 'tp1' })).resolves.toEqual({ items: [{ id: 'th1' }] });

    expect(api.get).toHaveBeenNthCalledWith(3, '/care/tea-pre-reservations/pt1/suggestions', {
      params: { daysAhead: 7, limit: 5, exclude: '1,2' },
    });
  });

  it('handles create/status conversion and bulk actions', async () => {
    vi.mocked(api.post)
      .mockResolvedValueOnce({ data: { id: 'new' } } as any)
      .mockResolvedValueOnce({ data: { id: 'conv' } } as any)
      .mockResolvedValueOnce({ data: { valid: true } } as any)
      .mockResolvedValueOnce({ data: { accepted: 2 } } as any)
      .mockResolvedValueOnce({ data: { canceled: 1 } } as any);
    vi.mocked(api.patch).mockResolvedValue({ data: { id: 'r1', status: 'AUTHORIZED' } } as any);

    await expect(teaPreReservationService.create({ pitTherapyId: 'pt1', suggestedDate: '2026-01-01' })).resolves.toEqual({ id: 'new' });
    await expect(teaPreReservationService.updateStatus('r1', { status: 'AUTHORIZED' })).resolves.toEqual({ id: 'r1', status: 'AUTHORIZED' });
    await expect(teaPreReservationService.convertToAppointment('r1')).resolves.toEqual({ id: 'conv' });
    await expect(teaPreReservationService.validateWeekly({ pitTherapyId: 'pt1', suggestions: [{ date: '2026-01-01', time: '08:00' }] })).resolves.toEqual({ valid: true });
    await expect(
      teaPreReservationService.acceptGroup({
        items: [{ pitTherapyId: 'pt1', suggestedDate: '2026-01-01', suggestedTime: '08:00' }],
      }),
    ).resolves.toEqual({ accepted: 2 });
    await expect(teaPreReservationService.cancelTherapySeries({ teaProfileId: 'tp1', cancelAll: true })).resolves.toEqual({ canceled: 1 });

    expect(api.post).toHaveBeenNthCalledWith(2, '/care/tea-pre-reservations/r1/convert-to-appointment', {});
  });
});
