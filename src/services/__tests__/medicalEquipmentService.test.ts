import { beforeEach, describe, expect, it, vi } from 'vitest';
import medicalEquipmentService from '../medicalEquipmentService';
import api from '../api';

vi.mock('../api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
  },
}));

describe('medicalEquipmentService', () => {
  beforeEach(() => {
    vi.mocked(api.get).mockReset();
    vi.mocked(api.post).mockReset();
    vi.mocked(api.put).mockReset();
  });

  it('lists equipments from mixed payloads and sorts by normalized name', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: {
        data: {
          items: [
            { equipmentId: '2', nome: 'Zeta', dicomPort: '104', procedures: [{ id: 'p2' }] },
            { id: '1', name: 'Alfa', procedureIds: ['p1'], supportsStore: false },
          ],
        },
      },
    } as any);

    const result = await medicalEquipmentService.list();

    expect(api.get).toHaveBeenCalledWith('/procedures/medical-equipments/');
    expect(result.map((item) => item.name)).toEqual(['Alfa', 'Zeta']);
    expect(result[0].procedureIds).toEqual(['p1']);
    expect(result[1].id).toBe('2');
    expect(result[1].mwlPort).toBe(104);
  });

  it('gets, creates and updates normalized equipments and throws on invalid responses', async () => {
    vi.mocked(api.get)
      .mockResolvedValueOnce({ data: { id: '1', nome: 'Tomógrafo' } } as any)
      .mockResolvedValueOnce({ data: {} } as any);
    vi.mocked(api.post)
      .mockResolvedValueOnce({ data: { id: '2', nome: 'Raio-X' } } as any)
      .mockResolvedValueOnce({ data: { ok: 1, status: 'CONNECTED', message: 'ok', equipment: { id: '9', nome: 'Eco' } } } as any)
      .mockResolvedValueOnce({ data: {} } as any);
    vi.mocked(api.put)
      .mockResolvedValueOnce({ data: { id: '2', nome: 'Raio-X Atualizado' } } as any)
      .mockResolvedValueOnce({ data: {} } as any);

    const got = await medicalEquipmentService.getById('1');
    const created = await medicalEquipmentService.create({ name: 'Raio-X' });
    const updated = await medicalEquipmentService.update('2', { status: 'Inativo' });
    const tested = await medicalEquipmentService.testConnection('9');

    expect(got.name).toBe('Tomógrafo');
    expect(created.name).toBe('Raio-X');
    expect(updated.name).toBe('Raio-X Atualizado');
    expect(tested).toEqual({
      ok: true,
      status: 'CONNECTED',
      message: 'ok',
      equipment: expect.objectContaining({ id: '9', name: 'Eco' }),
    });

    await expect(medicalEquipmentService.getById('404')).rejects.toThrow('Equipamento não encontrado');
    await expect(medicalEquipmentService.create({ name: 'Inválido' })).rejects.toThrow('Resposta inválida ao criar equipamento');
    await expect(medicalEquipmentService.update('2', { name: 'Inválido' })).rejects.toThrow('Resposta inválida ao atualizar equipamento');
  });
});