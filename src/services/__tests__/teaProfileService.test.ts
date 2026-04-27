import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../api';
import teaProfileService from '../teaProfileService';

vi.mock('../api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('teaProfileService', () => {
  beforeEach(() => {
    vi.mocked(api.get).mockReset();
    vi.mocked(api.post).mockReset();
    vi.mocked(api.put).mockReset();
    vi.mocked(api.delete).mockReset();
  });

  it('covers profile, plan, evolution and pit endpoints', async () => {
    vi.mocked(api.get)
      .mockResolvedValueOnce({ data: { items: [{ id: 'tp1' }], total: 1 } } as any)
      .mockResolvedValueOnce({ data: { id: 'tp1' } } as any)
      .mockResolvedValueOnce({ data: { items: [{ id: 'pl1' }] } } as any)
      .mockResolvedValueOnce({ data: { items: [{ id: 'ev1' }] } } as any)
      .mockResolvedValueOnce({ data: { report: true } } as any)
      .mockResolvedValueOnce({ data: { id: 'pit1' } } as any);
    vi.mocked(api.post)
      .mockResolvedValueOnce({ data: { id: 'tp1' } } as any)
      .mockResolvedValueOnce({ data: { id: 'pl1' } } as any)
      .mockResolvedValueOnce({ data: { id: 'ev1' } } as any)
      .mockResolvedValueOnce({ data: { id: 'pit1' } } as any);
    vi.mocked(api.put)
      .mockResolvedValueOnce({ data: { id: 'pl1', status: 'DONE' } } as any)
      .mockResolvedValueOnce({ data: { id: 'ev1', progressScore: 7 } } as any);
    vi.mocked(api.delete)
      .mockResolvedValueOnce({ data: { ok: true } } as any)
      .mockResolvedValueOnce({ data: { removed: true } } as any)
      .mockResolvedValueOnce({ data: { removed: true } } as any);

    await expect(teaProfileService.list({ search: 'ana' })).resolves.toEqual({ items: [{ id: 'tp1' }], total: 1 });
    await expect(teaProfileService.getById('tp1')).resolves.toEqual({ id: 'tp1' });
    await expect(teaProfileService.upsert({ patientId: 'p1' })).resolves.toEqual({ id: 'tp1' });
    await expect(teaProfileService.listPlans('tp1', { isActive: true })).resolves.toEqual({ items: [{ id: 'pl1' }] });
    await expect(teaProfileService.createPlan('tp1', { title: 'Plano' })).resolves.toEqual({ id: 'pl1' });
    await expect(teaProfileService.updatePlan('pl1', { status: 'DONE' })).resolves.toEqual({ id: 'pl1', status: 'DONE' });
    await expect(teaProfileService.deactivatePlan('pl1')).resolves.toEqual({ ok: true });
    await expect(teaProfileService.listEvolutions('tp1')).resolves.toEqual({ items: [{ id: 'ev1' }] });
    await expect(teaProfileService.createEvolution('tp1', { notes: 'ok' })).resolves.toEqual({ id: 'ev1' });
    await expect(teaProfileService.updateEvolution('tp1', 'ev1', { editReason: 'fix' })).resolves.toEqual({ id: 'ev1', progressScore: 7 });
    await expect(teaProfileService.getReport('tp1', { startDate: '2026-01-01' })).resolves.toEqual({ report: true });
    await expect(teaProfileService.getPit('tp1')).resolves.toEqual({ id: 'pit1' });
    await expect(teaProfileService.upsertPit('tp1', { title: 'PIT' })).resolves.toEqual({ id: 'pit1' });
    await expect(teaProfileService.deletePit('tp1', 'pit1')).resolves.toEqual({ removed: true });
    await expect(teaProfileService.deletePit('tp1')).resolves.toEqual({ removed: true });

    expect(api.delete).toHaveBeenNthCalledWith(2, '/care/tea-profiles/tp1/pit', {
      params: { pitId: 'pit1' },
      data: { pitId: 'pit1' },
    });
    expect(api.delete).toHaveBeenNthCalledWith(3, '/care/tea-profiles/tp1/pit', {
      params: undefined,
      data: undefined,
    });
  });
});
