import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../api';
import invoiceService from '../invoiceService';

vi.mock('../api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
  },
}));

describe('invoiceService', () => {
  beforeEach(() => {
    (api.get as any).mockReset();
    (api.post as any).mockReset();
    (api.put as any).mockReset();
  });

  it('creates and lists invoices', async () => {
    (api.post as any).mockResolvedValue({ data: { id: 'i1' } });
    (api.get as any).mockResolvedValue({ data: [{ id: 'i1' }] });

    const created = await invoiceService.createInvoice({ value: 150 } as any);
    const list = await invoiceService.getInvoices();

    expect(api.post).toHaveBeenCalledWith('/admin/invoices/', { value: 150 });
    expect(api.get).toHaveBeenCalledWith('/admin/invoices/');
    expect(created.id).toBe('i1');
    expect(list).toEqual([{ id: 'i1' }]);
  });

  it('updates invoice by id', async () => {
    (api.put as any).mockResolvedValue({ data: { id: 'i1', status: 'FECHADA' } });

    const updated = await invoiceService.updateInvoice('i1', { status: 'FECHADA' } as any);

    expect(api.put).toHaveBeenCalledWith('/admin/invoices/i1', { status: 'FECHADA' });
    expect(updated.status).toBe('FECHADA');
  });
});
