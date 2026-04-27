import { beforeEach, describe, expect, it, vi } from 'vitest';
import procedureAnamnesisTemplateService from '../procedureAnamnesisTemplateService';
import api from '../api';

vi.mock('../api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('procedureAnamnesisTemplateService', () => {
  beforeEach(() => {
    vi.mocked(api.get).mockReset();
    vi.mocked(api.post).mockReset();
    vi.mocked(api.put).mockReset();
    vi.mocked(api.delete).mockReset();
  });

  it('lists and fetches anamnesis templates by id', async () => {
    vi.mocked(api.get)
      .mockResolvedValueOnce({ data: { total: 1, items: [{ id: 't1' }] } } as any)
      .mockResolvedValueOnce({ data: { id: 't1', name: 'Ficha inicial' } } as any);

    const list = await procedureAnamnesisTemplateService.list({ search: 'inicial', limit: 10, offset: 5 });
    const item = await procedureAnamnesisTemplateService.getById('t1');

    expect(api.get).toHaveBeenNthCalledWith(1, '/procedures/anamnesis-templates', {
      params: { search: 'inicial', limit: 10, offset: 5 },
    });
    expect(api.get).toHaveBeenNthCalledWith(2, '/procedures/anamnesis-templates/t1');
    expect(list.total).toBe(1);
    expect(item.name).toBe('Ficha inicial');
  });

  it('creates, updates and deactivates anamnesis templates', async () => {
    const payload = {
      procedureId: 'p1',
      name: 'Ficha nova',
      questions: [{ label: 'Pergunta', value: undefined, responseType: 'TEXT' }],
    } as any;

    vi.mocked(api.post).mockResolvedValue({ data: { id: 't2', name: 'Ficha nova' } } as any);
    vi.mocked(api.put).mockResolvedValue({ data: { id: 't2', name: 'Ficha alterada' } } as any);
    vi.mocked(api.delete).mockResolvedValue({ data: { success: true } } as any);

    const created = await procedureAnamnesisTemplateService.create(payload);
    const updated = await procedureAnamnesisTemplateService.update('t2', { name: 'Ficha alterada' });
    const removed = await procedureAnamnesisTemplateService.deactivate('t2');

    expect(api.post).toHaveBeenCalledWith('/procedures/anamnesis-templates', payload);
    expect(api.put).toHaveBeenCalledWith('/procedures/anamnesis-templates/t2', { name: 'Ficha alterada' });
    expect(api.delete).toHaveBeenCalledWith('/procedures/anamnesis-templates/t2');
    expect(created.id).toBe('t2');
    expect(updated.name).toBe('Ficha alterada');
    expect(removed.success).toBe(true);
  });
});