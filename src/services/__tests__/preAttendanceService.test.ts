import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../api';
import preAttendanceService from '../preAttendanceService';

vi.mock('../api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('preAttendanceService', () => {
  beforeEach(() => {
    (api.get as any).mockReset();
    (api.post as any).mockReset();
    (api.put as any).mockReset();
    (api.delete as any).mockReset();
  });

  it('lists pre attendances with query params', async () => {
    (api.get as any).mockResolvedValue({ data: { total: 1, items: [{ id: 'p1' }] } });

    const result = await preAttendanceService.list({ search: 'maria', status: 'PENDENTE' });

    expect(api.get).toHaveBeenCalledWith('/care/pre-attendances/', {
      params: { search: 'maria', status: 'PENDENTE' },
    });
    expect(result.total).toBe(1);
  });

  it('creates a pre attendance', async () => {
    (api.post as any).mockResolvedValue({ data: { id: 'new-id' } });

    const result = await preAttendanceService.create({
      fullName: 'Maria Silva',
      cpf: '52998224725',
      queueType: 'CONSULTA',
    });

    expect(api.post).toHaveBeenCalledWith('/care/pre-attendances/', {
      fullName: 'Maria Silva',
      cpf: '52998224725',
      queueType: 'CONSULTA',
    });
    expect(result).toEqual({ id: 'new-id' });
  });

  it('updates and removes pre attendance by id', async () => {
    (api.put as any).mockResolvedValue({ data: { id: 'p1', status: 'ATENDIDO' } });
    (api.delete as any).mockResolvedValue({ data: { success: true } });

    const updated = await preAttendanceService.update('p1', { status: 'ATENDIDO' });
    const removed = await preAttendanceService.remove('p1');

    expect(api.put).toHaveBeenCalledWith('/care/pre-attendances/p1', { status: 'ATENDIDO' });
    expect(api.delete).toHaveBeenCalledWith('/care/pre-attendances/p1');
    expect(updated.status).toBe('ATENDIDO');
    expect(removed).toEqual({ success: true });
  });
});
