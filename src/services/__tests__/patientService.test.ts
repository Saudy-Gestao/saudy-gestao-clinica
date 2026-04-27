import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../api';
import patientService from '../patientService';

vi.mock('../api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('patientService', () => {
  beforeEach(() => {
    (api.get as any).mockReset();
    (api.post as any).mockReset();
    (api.put as any).mockReset();
    (api.delete as any).mockReset();
  });

  it('lists and fetches patient by id/cpf', async () => {
    (api.get as any)
      .mockResolvedValueOnce({ data: [{ id: 'p1' }] })
      .mockResolvedValueOnce({ data: { id: 'p1', name: 'Maria' } })
      .mockResolvedValueOnce({ data: { id: 'p2', cpf: '52998224725' } });

    const list = await patientService.listPatients();
    const byId = await patientService.getPatientById('p1');
    const byCpf = await patientService.getPatientByCpf('52998224725');

    expect(api.get).toHaveBeenNthCalledWith(1, '/accounts/patients/');
    expect(api.get).toHaveBeenNthCalledWith(2, '/accounts/patients/p1');
    expect(api.get).toHaveBeenNthCalledWith(3, '/accounts/patients/cpf/52998224725');
    expect(list).toEqual([{ id: 'p1' }]);
    expect(byId.name).toBe('Maria');
    expect(byCpf.id).toBe('p2');
  });

  it('creates, updates and deletes patient', async () => {
    (api.post as any).mockResolvedValue({ data: { id: 'p3' } });
    (api.put as any).mockResolvedValue({ data: { id: 'p3', name: 'Novo Nome' } });
    (api.delete as any).mockResolvedValue({ data: { success: true } });

    const createPayload = { name: 'Ana', cpf: '11122233344' };
    const created = await patientService.createPatient(createPayload as any);
    const updated = await patientService.updatePatient('p3', { name: 'Novo Nome' });
    const removed = await patientService.deletePatient('p3');

    expect(api.post).toHaveBeenCalledWith('/accounts/patients/', createPayload);
    expect(api.put).toHaveBeenCalledWith('/accounts/patients/p3', { name: 'Novo Nome' });
    expect(api.delete).toHaveBeenCalledWith('/accounts/patients/p3');
    expect(created.id).toBe('p3');
    expect(updated.name).toBe('Novo Nome');
    expect(removed).toEqual({ success: true });
  });
});
