import { beforeEach, describe, expect, it, vi } from 'vitest';
import reportService from '../reportService';
import api from '../api';

vi.mock('../api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('reportService', () => {
  beforeEach(() => {
    vi.mocked(api.get).mockReset();
    vi.mocked(api.post).mockReset();
    vi.mocked(api.put).mockReset();
    vi.mocked(api.delete).mockReset();
  });

  it('lists, creates, updates and removes reports', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { items: [{ id: 'r1' }] } } as any);
    vi.mocked(api.post).mockResolvedValueOnce({ data: { id: 'r2' } } as any).mockResolvedValueOnce({ data: { correctedHtml: '<p>ok</p>' } } as any);
    vi.mocked(api.put).mockResolvedValue({ data: { id: 'r2', status: 'DONE' } } as any);
    vi.mocked(api.delete).mockResolvedValue({ data: { success: true } } as any);

    await expect(reportService.list({ appointmentId: 'a1', status: 'DRAFT' })).resolves.toEqual({ items: [{ id: 'r1' }] });
    await expect(reportService.create({ patientName: 'Maria' })).resolves.toEqual({ id: 'r2' });
    await expect(reportService.update('r2', { status: 'DONE' })).resolves.toEqual({ id: 'r2', status: 'DONE' });
    await expect(reportService.remove('r2')).resolves.toEqual({ success: true });
    await expect(reportService.spellCheck('<p>oi</p>')).resolves.toEqual({ correctedHtml: '<p>ok</p>' });

    expect(api.get).toHaveBeenCalledWith('/care/reports/', { params: { appointmentId: 'a1', status: 'DRAFT' } });
    expect(api.post).toHaveBeenNthCalledWith(1, '/care/reports/', { patientName: 'Maria' });
    expect(api.put).toHaveBeenCalledWith('/care/reports/r2', { status: 'DONE' });
    expect(api.delete).toHaveBeenCalledWith('/care/reports/r2');
    expect(api.post).toHaveBeenNthCalledWith(2, '/care/spell-check', { html: '<p>oi</p>' });
  });
});