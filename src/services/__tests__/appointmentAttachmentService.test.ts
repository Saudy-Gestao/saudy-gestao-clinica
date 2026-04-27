import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../api';
import appointmentAttachmentService from '../appointmentAttachmentService';

vi.mock('../api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe('appointmentAttachmentService', () => {
  beforeEach(() => {
    vi.mocked(api.get).mockReset();
    vi.mocked(api.post).mockReset();
  });

  it('uploads and lists attachments', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { id: 'att-1' } } as any);
    vi.mocked(api.get).mockResolvedValue({ data: { total: 1, items: [{ id: 'att-1' }] } } as any);

    await expect(
      appointmentAttachmentService.uploadAttachment('ap-1', { fileName: 'a.pdf', fileBase64: 'base64', mimeType: 'application/pdf' }),
    ).resolves.toEqual({ id: 'att-1' });

    await expect(appointmentAttachmentService.listAttachments('ap-1')).resolves.toEqual({
      total: 1,
      items: [{ id: 'att-1' }],
    });

    expect(api.post).toHaveBeenCalledWith('/care/appointments/ap-1/attachments', {
      fileName: 'a.pdf',
      fileBase64: 'base64',
      mimeType: 'application/pdf',
    });
    expect(api.get).toHaveBeenCalledWith('/care/appointments/ap-1/attachments');
  });

  it('views attachment as blob', async () => {
    const blob = new Blob(['data']);
    vi.mocked(api.get).mockResolvedValue({ data: blob } as any);

    await expect(appointmentAttachmentService.viewAttachment('att-1')).resolves.toBe(blob);

    expect(api.get).toHaveBeenCalledWith('/care/appointments/attachments/att-1/view', {
      responseType: 'blob',
    });
  });
});
