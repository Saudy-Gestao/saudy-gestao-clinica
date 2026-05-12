import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../api';
import appointmentAttachmentService from '../appointmentAttachmentService';
import branchService from '../branchService';
import documentService from '../documentService';
import financeService from '../financeService';
import invoiceService from '../invoiceService';
import { moduleService } from '../moduleService';
import reportAddendumService from '../reportAddendumService';
import reportAuditLogService from '../reportAuditLogService';
import reportPhraseService from '../reportPhraseService';
import reportTemplateService from '../reportTemplateService';
import sectorService from '../sectorService';

vi.mock('../api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockedApi = vi.mocked(api);
const data = { id: 'resource-1', ok: true };

describe('endpoint services', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedApi.get.mockResolvedValue({ data });
    mockedApi.post.mockResolvedValue({ data });
    mockedApi.put.mockResolvedValue({ data });
    mockedApi.delete.mockResolvedValue({ data });
  });

  it('maps branch CRUD operations to auth branch endpoints', async () => {
    await expect(branchService.listBranches()).resolves.toEqual(data);
    expect(mockedApi.get).toHaveBeenLastCalledWith('/auth/branches');

    await expect(branchService.getBranch('b1')).resolves.toEqual(data);
    expect(mockedApi.get).toHaveBeenLastCalledWith('/auth/branches/b1');

    await expect(branchService.createBranch({ name: 'Centro' })).resolves.toEqual(data);
    expect(mockedApi.post).toHaveBeenLastCalledWith('/auth/branches', { name: 'Centro' });

    await expect(branchService.updateBranch('b1', { name: 'Norte' })).resolves.toEqual(data);
    expect(mockedApi.put).toHaveBeenLastCalledWith('/auth/branches/b1', { name: 'Norte' });

    await expect(branchService.deleteBranch('b1')).resolves.toEqual(data);
    expect(mockedApi.delete).toHaveBeenLastCalledWith('/auth/branches/b1');
  });

  it('maps sector CRUD operations to auth sector endpoints', async () => {
    await sectorService.listSectors();
    expect(mockedApi.get).toHaveBeenLastCalledWith('/auth/sectors');

    await sectorService.getSector('s1');
    expect(mockedApi.get).toHaveBeenLastCalledWith('/auth/sectors/s1');

    await sectorService.createSector({ name: 'Recepcao' });
    expect(mockedApi.post).toHaveBeenLastCalledWith('/auth/sectors', { name: 'Recepcao' });

    await sectorService.updateSector('s1', { active: false });
    expect(mockedApi.put).toHaveBeenLastCalledWith('/auth/sectors/s1', { active: false });

    await sectorService.deleteSector('s1');
    expect(mockedApi.delete).toHaveBeenLastCalledWith('/auth/sectors/s1');
  });

  it('loads modules from the auth module endpoints', async () => {
    await expect(moduleService.getAll()).resolves.toEqual(data);
    expect(mockedApi.get).toHaveBeenLastCalledWith('/auth/modules');

    await expect(moduleService.getById('tea')).resolves.toEqual(data);
    expect(mockedApi.get).toHaveBeenLastCalledWith('/auth/modules/tea');
  });

  it('maps report phrase and template CRUD services', async () => {
    const params = { search: 'eco', limit: 10 };
    const phrase = { examType: 'US', label: 'Normal', text: 'Sem alteracoes' };
    const template = { name: 'Padrao', examType: 'US', content: '<p>Texto</p>' };

    await reportPhraseService.list(params);
    expect(mockedApi.get).toHaveBeenLastCalledWith('/care/report-phrases/', { params });
    await reportPhraseService.create(phrase);
    expect(mockedApi.post).toHaveBeenLastCalledWith('/care/report-phrases/', phrase);
    await reportPhraseService.update('p1', { label: 'Alterado' });
    expect(mockedApi.put).toHaveBeenLastCalledWith('/care/report-phrases/p1', { label: 'Alterado' });
    await reportPhraseService.remove('p1');
    expect(mockedApi.delete).toHaveBeenLastCalledWith('/care/report-phrases/p1');

    await reportTemplateService.list(params);
    expect(mockedApi.get).toHaveBeenLastCalledWith('/care/report-templates/', { params });
    await reportTemplateService.create(template);
    expect(mockedApi.post).toHaveBeenLastCalledWith('/care/report-templates/', template);
    await reportTemplateService.update('t1', { content: '<p>Novo</p>' });
    expect(mockedApi.put).toHaveBeenLastCalledWith('/care/report-templates/t1', { content: '<p>Novo</p>' });
    await reportTemplateService.remove('t1');
    expect(mockedApi.delete).toHaveBeenLastCalledWith('/care/report-templates/t1');
  });

  it('maps report addendum and audit endpoints', async () => {
    const params = { reportId: 'r1', limit: 20 };

    await reportAddendumService.list(params);
    expect(mockedApi.get).toHaveBeenLastCalledWith('/care/report-addendums/', { params });
    await reportAddendumService.create({ reportId: 'r1', content: 'Retificacao' });
    expect(mockedApi.post).toHaveBeenLastCalledWith('/care/report-addendums/', { reportId: 'r1', content: 'Retificacao' });
    await reportAddendumService.update('a1', { status: 'FINAL' });
    expect(mockedApi.put).toHaveBeenLastCalledWith('/care/report-addendums/a1', { status: 'FINAL' });
    await reportAddendumService.remove('a1');
    expect(mockedApi.delete).toHaveBeenLastCalledWith('/care/report-addendums/a1');

    await reportAuditLogService.list(params);
    expect(mockedApi.get).toHaveBeenLastCalledWith('/care/report-audit-logs/', { params });
  });

  it('maps document, finance and invoice services', async () => {
    await documentService.list({ status: 'pending' });
    expect(mockedApi.get).toHaveBeenLastCalledWith('/care/documents/', { params: { status: 'pending' } });
    await documentService.create({ documentType: 'RG', patientName: 'Maria' });
    expect(mockedApi.post).toHaveBeenLastCalledWith('/care/documents/', { documentType: 'RG', patientName: 'Maria' });
    await documentService.update('d1', { status: 'done' });
    expect(mockedApi.put).toHaveBeenLastCalledWith('/care/documents/d1', { status: 'done' });
    await documentService.remove('d1');
    expect(mockedApi.delete).toHaveBeenLastCalledWith('/care/documents/d1');

    await financeService.createEntry({ type: 'income', value: 150 });
    expect(mockedApi.post).toHaveBeenLastCalledWith('/admin/finance/', { type: 'income', value: 150 });
    await financeService.getEntries();
    expect(mockedApi.get).toHaveBeenLastCalledWith('/admin/finance/');
    await financeService.updateEntry(7, { status: 'paid' });
    expect(mockedApi.put).toHaveBeenLastCalledWith('/admin/finance/7', { status: 'paid' });

    await invoiceService.createInvoice({ value: 300 });
    expect(mockedApi.post).toHaveBeenLastCalledWith('/admin/invoices/', { value: 300 });
    await invoiceService.getInvoices();
    expect(mockedApi.get).toHaveBeenLastCalledWith('/admin/invoices/');
    await invoiceService.updateInvoice('i1', { discount: 10 });
    expect(mockedApi.put).toHaveBeenLastCalledWith('/admin/invoices/i1', { discount: 10 });
  });

  it('maps appointment attachment endpoints including blob view', async () => {
    const payload = { fileName: 'pedido.pdf', fileBase64: 'abc', mimeType: 'application/pdf' };

    await appointmentAttachmentService.uploadAttachment('apt1', payload);
    expect(mockedApi.post).toHaveBeenLastCalledWith('/care/appointments/apt1/attachments', payload);

    await appointmentAttachmentService.listAttachments('apt1');
    expect(mockedApi.get).toHaveBeenLastCalledWith('/care/appointments/apt1/attachments');

    await appointmentAttachmentService.viewAttachment('att1');
    expect(mockedApi.get).toHaveBeenLastCalledWith('/care/appointments/attachments/att1/view', {
      responseType: 'blob',
    });
  });
});
