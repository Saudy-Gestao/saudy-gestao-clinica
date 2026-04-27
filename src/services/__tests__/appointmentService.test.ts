import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../api';
import appointmentService from '../appointmentService';

vi.mock('../api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('appointmentService', () => {
  beforeEach(() => {
    (api.get as any).mockReset();
    (api.post as any).mockReset();
    (api.put as any).mockReset();
    (api.delete as any).mockReset();
  });

  it('lists appointments with params', async () => {
    (api.get as any).mockResolvedValue({ data: { total: 1, items: [{ id: 'ap1' }] } });

    const result = await appointmentService.list({ search: 'maria', status: 'AGENDADO' });

    expect(api.get).toHaveBeenCalledWith('/care/appointments/', {
      params: { search: 'maria', status: 'AGENDADO' },
    });
    expect(result.total).toBe(1);
  });

  it('creates, updates, removes and creates worklist', async () => {
    (api.post as any)
      .mockResolvedValueOnce({ data: { id: 'ap2' } })
      .mockResolvedValueOnce({ data: { ok: true } });
    (api.put as any).mockResolvedValue({ data: { id: 'ap2', status: 'CONFIRMADO' } });
    (api.delete as any).mockResolvedValue({ data: { success: true } });

    const created = await appointmentService.create({ patientName: 'Ana' });
    const updated = await appointmentService.update('ap2', { status: 'CONFIRMADO' });
    const removed = await appointmentService.remove('ap2');
    const worklist = await appointmentService.createWorklist('ap2');

    expect(api.post).toHaveBeenNthCalledWith(1, '/care/appointments/', { patientName: 'Ana' });
    expect(api.put).toHaveBeenCalledWith('/care/appointments/ap2', { status: 'CONFIRMADO' });
    expect(api.delete).toHaveBeenCalledWith('/care/appointments/ap2');
    expect(api.post).toHaveBeenNthCalledWith(2, '/care/appointments/ap2/create-worklist');
    expect(created.id).toBe('ap2');
    expect(updated.status).toBe('CONFIRMADO');
    expect(removed.success).toBe(true);
    expect(worklist.ok).toBe(true);
  });
});
