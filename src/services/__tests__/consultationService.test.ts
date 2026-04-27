import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../api';
import consultationService from '../consultationService';

vi.mock('../api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('consultationService', () => {
  beforeEach(() => {
    (api.get as any).mockReset();
    (api.post as any).mockReset();
    (api.put as any).mockReset();
    (api.delete as any).mockReset();
  });

  it('lists consultations with params', async () => {
    (api.get as any).mockResolvedValue({ data: { items: [{ id: 'c1' }] } });

    const result = await consultationService.list({ queueType: 'Fila clínica', limit: 20 });

    expect(api.get).toHaveBeenCalledWith('/care/consultations/', {
      params: { queueType: 'Fila clínica', limit: 20 },
    });
    expect(result.items[0].id).toBe('c1');
  });

  it('creates, updates, submits nursing triage and removes consultation', async () => {
    (api.post as any)
      .mockResolvedValueOnce({ data: { id: 'c2' } })
      .mockResolvedValueOnce({ data: { ok: true } });
    (api.put as any).mockResolvedValue({ data: { id: 'c2', doctorName: 'Dr. A' } });
    (api.delete as any).mockResolvedValue({ data: { success: true } });

    const created = await consultationService.create({ patientName: 'Maria' } as any);
    const updated = await consultationService.update('c2', { doctorName: 'Dr. A' });
    const triage = await consultationService.submitNursingTriage('c2', { bloodPressure: '12x8' });
    const removed = await consultationService.remove('c2');

    expect(api.post).toHaveBeenNthCalledWith(1, '/care/consultations/', { patientName: 'Maria' });
    expect(api.put).toHaveBeenCalledWith('/care/consultations/c2', { doctorName: 'Dr. A' });
    expect(api.post).toHaveBeenNthCalledWith(2, '/care/consultations/c2/nursing-triage', { bloodPressure: '12x8' });
    expect(api.delete).toHaveBeenCalledWith('/care/consultations/c2');
    expect(created.id).toBe('c2');
    expect(updated.doctorName).toBe('Dr. A');
    expect(triage.ok).toBe(true);
    expect(removed.success).toBe(true);
  });
});
