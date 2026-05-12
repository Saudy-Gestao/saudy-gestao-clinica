import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../api';
import accessService from '../accessService';
import aiHelpService from '../aiHelpService';
import biService from '../biService';
import leadService from '../leadService';
import medicalRecordService from '../medicalRecordService';
import tissBatchService from '../tissBatchService';
import userService from '../userService';

vi.mock('../api', () => ({
  default: {
    defaults: { baseURL: 'http://api.test' },
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockedApi = vi.mocked(api);
const data = { id: '1', ok: true };

describe('admin services', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedApi.get.mockResolvedValue({ data });
    mockedApi.post.mockResolvedValue({ data });
    mockedApi.put.mockResolvedValue({ data });
    mockedApi.patch.mockResolvedValue({ data });
    mockedApi.delete.mockResolvedValue({ data });
  });

  it('maps access CRUD operations', async () => {
    await expect(accessService.listAccesses()).resolves.toEqual(data);
    expect(mockedApi.get).toHaveBeenLastCalledWith('/auth/accesses');

    await expect(accessService.createAccess({ description: 'Admin', moduleIds: ['m1'] })).resolves.toEqual(data);
    expect(mockedApi.post).toHaveBeenLastCalledWith('/auth/accesses', { description: 'Admin', moduleIds: ['m1'] });

    await expect(accessService.updateAccess('a1', { description: 'Recepcao' })).resolves.toEqual(data);
    expect(mockedApi.put).toHaveBeenLastCalledWith('/auth/accesses/a1', { description: 'Recepcao' });

    await expect(accessService.deleteAccess('a1')).resolves.toEqual(data);
    expect(mockedApi.delete).toHaveBeenLastCalledWith('/auth/accesses/a1');
  });

  it('normalizes lead list responses and maps lead mutations', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: [{ id: 'l1' }, { id: 'l2' }] });
    await expect(leadService.list({ status: 'ALL', search: 'ana' })).resolves.toEqual({
      items: [{ id: 'l1' }, { id: 'l2' }],
      total: 2,
    });
    expect(mockedApi.get).toHaveBeenLastCalledWith('/admin/leads', { params: { status: 'ALL', search: 'ana' } });

    mockedApi.get.mockResolvedValueOnce({ data: { data: [{ id: 'l3' }], total: '9' } });
    await expect(leadService.list()).resolves.toEqual({ items: [{ id: 'l3' }], total: 9 });

    await expect(leadService.create({ name: 'Ana', email: 'ana@test.com' })).resolves.toEqual(data);
    expect(mockedApi.post).toHaveBeenLastCalledWith('/admin/leads', { name: 'Ana', email: 'ana@test.com' });

    await expect(leadService.updateStatus('l1', 'QUALIFIED')).resolves.toEqual(data);
    expect(mockedApi.patch).toHaveBeenLastCalledWith('/admin/leads/l1', { status: 'QUALIFIED' });
  });

  it('maps BI dashboard endpoints and insight generation', async () => {
    const params = { startDate: '2026-01-01', endDate: '2026-01-31', branchId: 'b1' };

    await biService.getOverview(params);
    expect(mockedApi.get).toHaveBeenLastCalledWith('/admin/bi/overview', { params });
    await biService.getOccupancy(params);
    expect(mockedApi.get).toHaveBeenLastCalledWith('/admin/bi/occupancy', { params });
    await biService.getFinancial(params);
    expect(mockedApi.get).toHaveBeenLastCalledWith('/admin/bi/financial', { params });
    await biService.getClinical(params);
    expect(mockedApi.get).toHaveBeenLastCalledWith('/admin/bi/clinical', { params });
    await biService.getResources(params);
    expect(mockedApi.get).toHaveBeenLastCalledWith('/admin/bi/resources', { params });
    await biService.getAuthorizations(params);
    expect(mockedApi.get).toHaveBeenLastCalledWith('/admin/bi/authorizations', { params });
    await biService.getTea(params);
    expect(mockedApi.get).toHaveBeenLastCalledWith('/admin/bi/tea', { params });
    await biService.getReports(params);
    expect(mockedApi.get).toHaveBeenLastCalledWith('/admin/bi/reports', { params });
    await biService.getCommunication(params);
    expect(mockedApi.get).toHaveBeenLastCalledWith('/admin/bi/communication', { params });

    await biService.getInsights({ total: 1 }, params, { branchId: 'b1' }, true);
    expect(mockedApi.post).toHaveBeenLastCalledWith('/admin/bi/insights', {
      data: { total: 1 },
      period: params,
      filters: { branchId: 'b1' },
      force: true,
    });
  });

  it('maps medical record endpoints', async () => {
    await medicalRecordService.list({ patientId: 'p1', limit: 10 });
    expect(mockedApi.get).toHaveBeenLastCalledWith('/accounts/medical-records/', {
      params: { patientId: 'p1', limit: 10 },
    });

    await medicalRecordService.getById('r1');
    expect(mockedApi.get).toHaveBeenLastCalledWith('/accounts/medical-records/r1');

    await medicalRecordService.create({ patientId: 'p1', chiefComplaint: 'Dor' });
    expect(mockedApi.post).toHaveBeenLastCalledWith('/accounts/medical-records/', {
      patientId: 'p1',
      chiefComplaint: 'Dor',
    });

    await medicalRecordService.update('r1', { notes: 'Evolucao' });
    expect(mockedApi.put).toHaveBeenLastCalledWith('/accounts/medical-records/r1', { notes: 'Evolucao' });
  });

  it('maps TISS batch lifecycle endpoints', async () => {
    const params = { competenceMonth: '2026-01', status: 'DRAFT' };
    await tissBatchService.list(params);
    expect(mockedApi.get).toHaveBeenLastCalledWith('/admin/tiss-batches', { params });

    const createPayload = { competenceMonth: '2026-01', convention: 'Convenio', invoiceIds: ['i1'] };
    await tissBatchService.create(createPayload);
    expect(mockedApi.post).toHaveBeenLastCalledWith('/admin/tiss-batches', createPayload);

    await tissBatchService.updateStatus('b1', { status: 'SENT', protocolNumber: '123' });
    expect(mockedApi.patch).toHaveBeenLastCalledWith('/admin/tiss-batches/b1/status', {
      status: 'SENT',
      protocolNumber: '123',
    });

    await tissBatchService.registerProtocol('b1', { protocolNumber: '456' });
    expect(mockedApi.patch).toHaveBeenLastCalledWith('/admin/tiss-batches/b1/protocol', { protocolNumber: '456' });

    const returnPayload = { items: [{ guideNumber: 'g1', status: 'ACCEPTED' as const }] };
    await tissBatchService.registerReturn('b1', returnPayload);
    expect(mockedApi.post).toHaveBeenLastCalledWith('/admin/tiss-batches/b1/return', returnPayload);

    await tissBatchService.represent('b1');
    expect(mockedApi.post).toHaveBeenLastCalledWith('/admin/tiss-batches/b1/represent', {});

    await tissBatchService.downloadXml('b1');
    expect(mockedApi.get).toHaveBeenLastCalledWith('/admin/tiss-batches/b1/xml', { responseType: 'blob' });
  });

  it('maps user CRUD operations and appends missing access once', async () => {
    await userService.listUsers();
    expect(mockedApi.get).toHaveBeenLastCalledWith('/auth/users');
    await userService.createUser({ name: 'Ana' });
    expect(mockedApi.post).toHaveBeenLastCalledWith('/auth/users', { name: 'Ana' });
    await userService.updateUser('u1', { active: true });
    expect(mockedApi.put).toHaveBeenLastCalledWith('/auth/users/u1', { active: true });
    await userService.deleteUser('u1');
    expect(mockedApi.delete).toHaveBeenLastCalledWith('/auth/users/u1');

    mockedApi.get.mockResolvedValueOnce({ data: { accesses: [{ id: 'a1' }] } });
    await userService.addAccessToUser('u1', 'a2');
    expect(mockedApi.put).toHaveBeenLastCalledWith('/auth/users/u1', { accessIds: ['a1', 'a2'] });

    mockedApi.get.mockResolvedValueOnce({ data: { accesses: [{ id: 'a1' }] } });
    await userService.addAccessToUser('u1', 'a1');
    expect(mockedApi.put).toHaveBeenLastCalledWith('/auth/users/u1', { accessIds: ['a1'] });
  });

  it('maps AI help knowledge endpoints', async () => {
    await aiHelpService.getSuggestions('pending');
    expect(mockedApi.get).toHaveBeenLastCalledWith('/admin/knowledge-suggestions', { params: { status: 'pending' } });

    await aiHelpService.getSuggestions();
    expect(mockedApi.get).toHaveBeenLastCalledWith('/admin/knowledge-suggestions', { params: {} });

    await aiHelpService.updateSuggestion('s1', 'approved', 'Resposta');
    expect(mockedApi.patch).toHaveBeenLastCalledWith('/admin/knowledge-suggestions/s1', {
      status: 'approved',
      answer: 'Resposta',
    });

    await expect(aiHelpService.deleteSuggestion('s1')).resolves.toBeUndefined();
    expect(mockedApi.delete).toHaveBeenLastCalledWith('/admin/knowledge-suggestions/s1');

    await aiHelpService.reindex();
    expect(mockedApi.post).toHaveBeenLastCalledWith('/care/help/reindex');
  });
});
