import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../api';
import teaEvolutionTemplateService from '../teaEvolutionTemplateService';

vi.mock('../api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('teaEvolutionTemplateService', () => {
  beforeEach(() => {
    vi.mocked(api.get).mockReset();
    vi.mocked(api.post).mockReset();
    vi.mocked(api.put).mockReset();
    vi.mocked(api.delete).mockReset();
  });

  it('lists, resolves and writes templates', async () => {
    vi.mocked(api.get)
      .mockResolvedValueOnce({ data: { items: [{ id: 't1' }] } } as any)
      .mockResolvedValueOnce({ data: { id: 'resolved' } } as any);
    vi.mocked(api.post).mockResolvedValue({ data: { id: 'new' } } as any);
    vi.mocked(api.put).mockResolvedValue({ data: { id: 'updated' } } as any);
    vi.mocked(api.delete).mockResolvedValue({ data: { ok: true } } as any);

    await expect(teaEvolutionTemplateService.list({ search: 'aba' })).resolves.toEqual({ items: [{ id: 't1' }] });
    await expect(teaEvolutionTemplateService.resolve({ procedureName: 'TO' })).resolves.toEqual({ id: 'resolved' });
    await expect(teaEvolutionTemplateService.upsert({ procedureId: 'p1', name: 'Base' })).resolves.toEqual({ id: 'new' });
    await expect(teaEvolutionTemplateService.update('t1', { name: 'Novo' })).resolves.toEqual({ id: 'updated' });
    await expect(teaEvolutionTemplateService.deactivate('t1')).resolves.toEqual({ ok: true });

    expect(api.get).toHaveBeenNthCalledWith(1, '/care/tea-evolution-templates', { params: { search: 'aba' } });
    expect(api.get).toHaveBeenNthCalledWith(2, '/care/tea-evolution-templates/resolve', { params: { procedureName: 'TO' } });
    expect(api.post).toHaveBeenCalledWith('/care/tea-evolution-templates', { procedureId: 'p1', name: 'Base' });
    expect(api.put).toHaveBeenCalledWith('/care/tea-evolution-templates/t1', { name: 'Novo' });
    expect(api.delete).toHaveBeenCalledWith('/care/tea-evolution-templates/t1');
  });
});
