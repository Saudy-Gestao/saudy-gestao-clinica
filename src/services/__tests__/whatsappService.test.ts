import { beforeEach, describe, expect, it, vi } from 'vitest';
import whatsappService from '../whatsappService';
import api from '../api';

vi.mock('../api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('whatsappService', () => {
  beforeEach(() => {
    vi.mocked(api.get).mockReset();
    vi.mocked(api.post).mockReset();
    vi.mocked(api.delete).mockReset();
  });

  it('gets, saves and deletes config with scope params', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { id: 'cfg1' } } as any);
    vi.mocked(api.post).mockResolvedValue({ data: { id: 'cfg2', inheritFromCompany: true } } as any);
    vi.mocked(api.delete).mockResolvedValue({ data: undefined } as any);

    await expect(whatsappService.getConfig()).resolves.toEqual({ id: 'cfg1' });
    await expect(
      whatsappService.saveConfig(
        { accountSid: 'acc', fromNumber: '5511999999999', isActive: true },
        { scope: 'COMPANY', branchId: 'b1', inheritFromCompany: true },
      ),
    ).resolves.toEqual({ id: 'cfg2', inheritFromCompany: true });
    await expect(whatsappService.deleteConfig({ scope: 'COMPANY', branchId: 'b1' })).resolves.toBeUndefined();

    expect(api.get).toHaveBeenCalledWith('/care/whatsapp/config', { params: { scope: 'BRANCH' } });
    expect(api.post).toHaveBeenCalledWith(
      '/care/whatsapp/config',
      { accountSid: 'acc', fromNumber: '5511999999999', isActive: true, inheritFromCompany: true },
      { params: { scope: 'COMPANY', branchId: 'b1' } },
    );
    expect(api.delete).toHaveBeenCalledWith('/care/whatsapp/config', { params: { scope: 'COMPANY', branchId: 'b1' } });
  });

  it('handles templates and notification config endpoints', async () => {
    vi.mocked(api.get)
      .mockResolvedValueOnce({ data: [{ id: 'tpl1' }] } as any)
      .mockResolvedValueOnce({ data: { id: 'tpl2' } } as any)
      .mockResolvedValueOnce({ data: { id: 'nc1' } } as any)
      .mockResolvedValueOnce({ data: { items: [{ id: 'log1' }], total: 1, limit: 10, offset: 0 } } as any)
      .mockResolvedValueOnce({ data: { id: 'log2' } } as any)
      .mockResolvedValueOnce({ data: [{ key: 'patient_name' }] } as any);
    vi.mocked(api.post)
      .mockResolvedValueOnce({ data: { id: 'tpl3' } } as any)
      .mockResolvedValueOnce({ data: { synced: 1, created: 0, updated: 1, gupshupTemplates: {} } } as any)
      .mockResolvedValueOnce({ data: { success: true, created: 3, updated: 0, total: 3 } } as any)
      .mockResolvedValueOnce({ data: { success: true, gupshupResponse: { id: 'g1' } } } as any)
      .mockResolvedValueOnce({ data: { id: 'nc2' } } as any);
    vi.mocked(api.delete).mockResolvedValue({ data: undefined } as any);

    await expect(whatsappService.listTemplates()).resolves.toEqual([{ id: 'tpl1' }]);
    await expect(whatsappService.getTemplate('tpl2')).resolves.toEqual({ id: 'tpl2' });
    await expect(whatsappService.saveTemplate({ type: 'APPOINTMENT_CREATED', name: 'Novo', message: 'Oi' })).resolves.toEqual({ id: 'tpl3' });
    await expect(whatsappService.syncHsmStatus()).resolves.toEqual({ synced: 1, created: 0, updated: 1, gupshupTemplates: {} });
    await expect(whatsappService.loadDefaultTemplates()).resolves.toEqual({ success: true, created: 3, updated: 0, total: 3 });
    await expect(whatsappService.pushTemplateToGupshup('tpl2')).resolves.toEqual({ success: true, gupshupResponse: { id: 'g1' } });
    await expect(whatsappService.deleteTemplate('tpl2')).resolves.toBeUndefined();
    await expect(whatsappService.getNotificationConfig()).resolves.toEqual({ id: 'nc1' });
    await expect(whatsappService.saveNotificationConfig({ sendReminderEnabled: true })).resolves.toEqual({ id: 'nc2' });
    await expect(whatsappService.listLogs({ limit: 10, offset: 0 })).resolves.toEqual({ items: [{ id: 'log1' }], total: 1, limit: 10, offset: 0 });
    await expect(whatsappService.getLog('log2')).resolves.toEqual({ id: 'log2' });
    await expect(whatsappService.getAvailableVariables()).resolves.toEqual([{ key: 'patient_name' }]);

    expect(api.delete).toHaveBeenCalledWith('/care/whatsapp/templates/tpl2');
    expect(api.get).toHaveBeenCalledWith('/care/whatsapp/logs', { params: { limit: 10, offset: 0 } });
  });

  it('sends, tests and previews messages', async () => {
    vi.mocked(api.post)
      .mockResolvedValueOnce({ data: { queued: true } } as any)
      .mockResolvedValueOnce({ data: { delivered: true } } as any)
      .mockResolvedValueOnce({ data: { preview: 'mensagem' } } as any);

    await expect(whatsappService.sendMessage({ appointmentId: 'a1', messageType: 'CUSTOM', customMessage: 'Oi' })).resolves.toEqual({ queued: true });
    await expect(whatsappService.testMessage({ phone: '5511999', message: 'Teste' })).resolves.toEqual({ delivered: true });
    await expect(whatsappService.previewMessage({ appointmentId: 'a1', template: 'CONFIRM' })).resolves.toEqual({ preview: 'mensagem' });

    expect(api.post).toHaveBeenNthCalledWith(1, '/care/whatsapp/send', { appointmentId: 'a1', messageType: 'CUSTOM', customMessage: 'Oi' });
    expect(api.post).toHaveBeenNthCalledWith(2, '/care/whatsapp/test', { phone: '5511999', message: 'Teste' });
    expect(api.post).toHaveBeenNthCalledWith(3, '/care/whatsapp/preview', { appointmentId: 'a1', template: 'CONFIRM' });
  });
});