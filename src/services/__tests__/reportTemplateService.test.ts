import { beforeEach, describe, expect, it, vi } from 'vitest';
import reportTemplateService from '../reportTemplateService';
import api from '../api';

vi.mock('../api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('reportTemplateService', () => {
  beforeEach(() => {
    vi.mocked(api.get).mockReset();
    vi.mocked(api.post).mockReset();
    vi.mocked(api.put).mockReset();
    vi.mocked(api.delete).mockReset();
  });

  it('lists, creates, updates and removes report templates', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { items: [{ id: 't1' }] } } as any);
    vi.mocked(api.post).mockResolvedValue({ data: { id: 't2' } } as any);
    vi.mocked(api.put).mockResolvedValue({ data: { id: 't2', name: 'Atualizado' } } as any);
    vi.mocked(api.delete).mockResolvedValue({ data: { success: true } } as any);

    await expect(reportTemplateService.list({ examType: 'MRI', limit: 20 })).resolves.toEqual({ items: [{ id: 't1' }] });
    await expect(reportTemplateService.create({ name: 'Modelo', examType: 'MRI', content: '<p>x</p>' })).resolves.toEqual({ id: 't2' });
    await expect(reportTemplateService.update('t2', { name: 'Atualizado' })).resolves.toEqual({ id: 't2', name: 'Atualizado' });
    await expect(reportTemplateService.remove('t2')).resolves.toEqual({ success: true });

    expect(api.get).toHaveBeenCalledWith('/care/report-templates/', { params: { examType: 'MRI', limit: 20 } });
    expect(api.post).toHaveBeenCalledWith('/care/report-templates/', { name: 'Modelo', examType: 'MRI', content: '<p>x</p>' });
    expect(api.put).toHaveBeenCalledWith('/care/report-templates/t2', { name: 'Atualizado' });
    expect(api.delete).toHaveBeenCalledWith('/care/report-templates/t2');
  });
});