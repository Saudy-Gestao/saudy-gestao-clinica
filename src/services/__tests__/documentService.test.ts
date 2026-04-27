import { beforeEach, describe, expect, it, vi } from 'vitest';
import documentService from '../documentService';
import api from '../api';

vi.mock('../api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('documentService', () => {
  beforeEach(() => {
    vi.mocked(api.get).mockReset();
    vi.mocked(api.post).mockReset();
    vi.mocked(api.put).mockReset();
    vi.mocked(api.delete).mockReset();
  });

  it('lists, creates, updates and removes documents', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { items: [{ id: 'd1' }] } } as any);
    vi.mocked(api.post).mockResolvedValue({ data: { id: 'd2' } } as any);
    vi.mocked(api.put).mockResolvedValue({ data: { id: 'd2', status: 'DONE' } } as any);
    vi.mocked(api.delete).mockResolvedValue({ data: { success: true } } as any);

    await expect(documentService.list({ documentType: 'LAUDO' })).resolves.toEqual({ items: [{ id: 'd1' }] });
    await expect(documentService.create({ documentType: 'LAUDO', patientName: 'Maria' })).resolves.toEqual({ id: 'd2' });
    await expect(documentService.update('d2', { status: 'DONE' })).resolves.toEqual({ id: 'd2', status: 'DONE' });
    await expect(documentService.remove('d2')).resolves.toEqual({ success: true });

    expect(api.get).toHaveBeenCalledWith('/care/documents/', { params: { documentType: 'LAUDO' } });
    expect(api.post).toHaveBeenCalledWith('/care/documents/', { documentType: 'LAUDO', patientName: 'Maria' });
    expect(api.put).toHaveBeenCalledWith('/care/documents/d2', { status: 'DONE' });
    expect(api.delete).toHaveBeenCalledWith('/care/documents/d2');
  });
});