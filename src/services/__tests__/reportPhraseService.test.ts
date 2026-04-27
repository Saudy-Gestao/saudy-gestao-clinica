import { beforeEach, describe, expect, it, vi } from 'vitest';
import reportPhraseService from '../reportPhraseService';
import api from '../api';

vi.mock('../api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('reportPhraseService', () => {
  beforeEach(() => {
    vi.mocked(api.get).mockReset();
    vi.mocked(api.post).mockReset();
    vi.mocked(api.put).mockReset();
    vi.mocked(api.delete).mockReset();
  });

  it('lists, creates, updates and removes report phrases', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { items: [{ id: 'p1' }] } } as any);
    vi.mocked(api.post).mockResolvedValue({ data: { id: 'p2' } } as any);
    vi.mocked(api.put).mockResolvedValue({ data: { id: 'p2', label: 'Atualizada' } } as any);
    vi.mocked(api.delete).mockResolvedValue({ data: { success: true } } as any);

    await expect(reportPhraseService.list({ examType: 'XRAY', search: 'tórax' })).resolves.toEqual({ items: [{ id: 'p1' }] });
    await expect(reportPhraseService.create({ examType: 'XRAY', label: 'Base', text: 'Texto' })).resolves.toEqual({ id: 'p2' });
    await expect(reportPhraseService.update('p2', { label: 'Atualizada' })).resolves.toEqual({ id: 'p2', label: 'Atualizada' });
    await expect(reportPhraseService.remove('p2')).resolves.toEqual({ success: true });

    expect(api.get).toHaveBeenCalledWith('/care/report-phrases/', { params: { examType: 'XRAY', search: 'tórax' } });
    expect(api.post).toHaveBeenCalledWith('/care/report-phrases/', { examType: 'XRAY', label: 'Base', text: 'Texto' });
    expect(api.put).toHaveBeenCalledWith('/care/report-phrases/p2', { label: 'Atualizada' });
    expect(api.delete).toHaveBeenCalledWith('/care/report-phrases/p2');
  });
});