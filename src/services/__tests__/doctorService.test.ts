import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../api';
import doctorService from '../doctorService';

vi.mock('../api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('doctorService', () => {
  beforeEach(() => {
    (api.get as any).mockReset();
    (api.post as any).mockReset();
    (api.put as any).mockReset();
    (api.delete as any).mockReset();
  });

  it('lists doctors', async () => {
    (api.get as any).mockResolvedValue({ data: [{ id: 'd1' }] });

    const result = await doctorService.listDoctors();

    expect(api.get).toHaveBeenCalledWith('/accounts/doctors/');
    expect(result).toEqual([{ id: 'd1' }]);
  });

  it('creates, updates and deletes doctor', async () => {
    (api.post as any).mockResolvedValue({ data: { id: 'd2' } });
    (api.put as any).mockResolvedValue({ data: { id: 'd2', specialty: 'Cardio' } });
    (api.delete as any).mockResolvedValue({ data: { success: true } });

    const createPayload = {
      crm: '123',
      crmState: 'SP',
      name: 'Dr. Silva',
      cpf: '52998224725',
    };

    const created = await doctorService.createDoctor(createPayload as any);
    const updated = await doctorService.updateDoctor('d2', { specialty: 'Cardio' });
    const removed = await doctorService.deleteDoctor('d2');

    expect(api.post).toHaveBeenCalledWith('/accounts/doctors/', createPayload);
    expect(api.put).toHaveBeenCalledWith('/accounts/doctors/d2', { specialty: 'Cardio' });
    expect(api.delete).toHaveBeenCalledWith('/accounts/doctors/d2');
    expect(created.id).toBe('d2');
    expect(updated.specialty).toBe('Cardio');
    expect(removed).toEqual({ success: true });
  });
});
