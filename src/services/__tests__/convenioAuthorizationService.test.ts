import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../api';
import convenioAuthorizationService from '../convenioAuthorizationService';

vi.mock('../api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  },
}));

describe('convenioAuthorizationService', () => {
  beforeEach(() => {
    (api.get as any).mockReset();
    (api.post as any).mockReset();
    (api.patch as any).mockReset();
  });

  it('lists authorizations with normalized query params', async () => {
    (api.get as any).mockResolvedValue({ data: { items: [] } });

    const result = await convenioAuthorizationService.list({
      search: 'maria',
      statuses: ['PENDING', 'AUTHORIZED'],
      sourceTypes: ['APPOINTMENT'],
      limit: 10,
      offset: 5,
    });

    expect(api.get).toHaveBeenCalledWith('/care/convenio-authorizations', {
      params: {
        search: 'maria',
        statuses: 'PENDING,AUTHORIZED',
        sourceTypes: 'APPOINTMENT',
        limit: 10,
        offset: 5,
      },
    });
    expect(result.items).toEqual([]);
  });

  it('updates status, uploads attachment, lists attachments and views attachment', async () => {
    const blob = new Blob(['x'], { type: 'application/pdf' });
    (api.patch as any).mockResolvedValue({ data: { status: 'AUTHORIZED' } });
    (api.post as any).mockResolvedValue({ data: { ok: true } });
    (api.get as any)
      .mockResolvedValueOnce({ data: { total: 1, items: [{ id: 'a1' }] } })
      .mockResolvedValueOnce({ data: blob });

    const updated = await convenioAuthorizationService.updateStatus('APPOINTMENT', 'id1', { status: 'AUTHORIZED' });
    const uploaded = await convenioAuthorizationService.uploadAttachment('APPOINTMENT', 'id1', {
      fileName: 'file.pdf',
      fileBase64: 'base64',
    });
    const attachments = await convenioAuthorizationService.listAttachments('APPOINTMENT', 'id1');
    const viewed = await convenioAuthorizationService.viewAttachment('a1');

    expect(api.patch).toHaveBeenCalledWith('/care/convenio-authorizations/APPOINTMENT/id1', { status: 'AUTHORIZED' });
    expect(api.post).toHaveBeenCalledWith('/care/convenio-authorizations/APPOINTMENT/id1/attachments', {
      fileName: 'file.pdf',
      fileBase64: 'base64',
    });
    expect(api.get).toHaveBeenNthCalledWith(1, '/care/convenio-authorizations/APPOINTMENT/id1/attachments');
    expect(api.get).toHaveBeenNthCalledWith(2, '/care/convenio-authorizations/attachments/a1/view', { responseType: 'blob' });
    expect(updated.status).toBe('AUTHORIZED');
    expect(uploaded.ok).toBe(true);
    expect(attachments.total).toBe(1);
    expect(viewed).toBe(blob);
  });
});
