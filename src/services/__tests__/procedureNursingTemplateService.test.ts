import { beforeEach, describe, expect, it, vi } from 'vitest';
import procedureNursingTemplateService from '../procedureNursingTemplateService';
import api from '../api';

vi.mock('../api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('procedureNursingTemplateService', () => {
  beforeEach(() => {
    vi.mocked(api.get).mockReset();
    vi.mocked(api.post).mockReset();
    vi.mocked(api.put).mockReset();
    vi.mocked(api.delete).mockReset();
  });

  it('lists and fetches nursing templates by id', async () => {
    vi.mocked(api.get)
      .mockResolvedValueOnce({ data: { total: 1, items: [{ id: 'n1' }] } } as any)
      .mockResolvedValueOnce({ data: { id: 'n1', name: 'Triagem base' } } as any);

    const list = await procedureNursingTemplateService.list({ isActive: true, limit: 20, offset: 0 });
    const item = await procedureNursingTemplateService.getById('n1');

    expect(api.get).toHaveBeenNthCalledWith(1, '/procedures/nursing-templates', {
      params: { isActive: true, limit: 20, offset: 0 },
    });
    expect(api.get).toHaveBeenNthCalledWith(2, '/procedures/nursing-templates/n1');
    expect(list.items).toEqual([{ id: 'n1' }]);
    expect(item.name).toBe('Triagem base');
  });

  it('creates, updates and deactivates nursing templates', async () => {
    const payload = {
      procedureId: 'p2',
      name: 'Triagem nova',
      collectHeight: true,
      questions: [],
    };

    vi.mocked(api.post).mockResolvedValue({ data: { id: 'n2', name: 'Triagem nova' } } as any);
    vi.mocked(api.put).mockResolvedValue({ data: { id: 'n2', name: 'Triagem atualizada' } } as any);
    vi.mocked(api.delete).mockResolvedValue({ data: { success: true } } as any);

    const created = await procedureNursingTemplateService.create(payload);
    const updated = await procedureNursingTemplateService.update('n2', { collectWeight: true });
    const removed = await procedureNursingTemplateService.deactivate('n2');

    expect(api.post).toHaveBeenCalledWith('/procedures/nursing-templates', payload);
    expect(api.put).toHaveBeenCalledWith('/procedures/nursing-templates/n2', { collectWeight: true });
    expect(api.delete).toHaveBeenCalledWith('/procedures/nursing-templates/n2');
    expect(created.id).toBe('n2');
    expect(updated.name).toBe('Triagem atualizada');
    expect(removed.success).toBe(true);
  });
});