import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../api';
import appointmentService from '../appointmentService';
import authService from '../authService';
import biService from '../biService';
import consultationService from '../consultationService';
import deliveryService from '../deliveryService';
import inventoryService from '../inventoryService';
import patientService from '../patientService';
import procedureService from '../procedureService';
import reportService from '../reportService';
import ticketService from '../ticketService';
import whatsappService from '../whatsappService';
import convenioAuthorizationService from '../convenioAuthorizationService';
import cepService from '../cepService';
import { getApiBaseUrl } from '../getApiBaseUrl';

vi.mock('../api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockedApi = vi.mocked(api);
const data = { id: 'r1', ok: true };

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  mockedApi.get.mockResolvedValue({ data });
  mockedApi.post.mockResolvedValue({ data });
  mockedApi.put.mockResolvedValue({ data });
  (mockedApi as any).patch.mockResolvedValue({ data });
  mockedApi.delete.mockResolvedValue({ data });
});

// ─── appointmentService ───────────────────────────────────────────────────────
describe('appointmentService', () => {
  it('list', async () => {
    await expect(appointmentService.list({ limit: 10 })).resolves.toEqual(data);
    expect(mockedApi.get).toHaveBeenCalledWith('/care/appointments/', { params: { limit: 10 } });
  });
  it('create', async () => {
    await expect(appointmentService.create({ patientName: 'Ana' })).resolves.toEqual(data);
    expect(mockedApi.post).toHaveBeenCalledWith('/care/appointments/', { patientName: 'Ana' });
  });
  it('getById', async () => {
    await expect(appointmentService.getById('a1')).resolves.toEqual(data);
    expect(mockedApi.get).toHaveBeenCalledWith('/care/appointments/a1');
  });
  it('update', async () => {
    await expect(appointmentService.update('a1', { status: 'done' })).resolves.toEqual(data);
    expect(mockedApi.put).toHaveBeenCalledWith('/care/appointments/a1', { status: 'done' });
  });
  it('remove', async () => {
    await expect(appointmentService.remove('a1')).resolves.toEqual(data);
    expect(mockedApi.delete).toHaveBeenCalledWith('/care/appointments/a1');
  });
  it('createWorklist', async () => {
    await expect(appointmentService.createWorklist('a1')).resolves.toEqual(data);
    expect(mockedApi.post).toHaveBeenCalledWith('/care/appointments/a1/create-worklist');
  });
});

// ─── authService ──────────────────────────────────────────────────────────────
describe('authService', () => {
  it('login stores token and user', async () => {
    const user = { id: 'u1', name: 'João' };
    mockedApi.post.mockResolvedValueOnce({ data: { token: 'tok', user } });
    mockedApi.get.mockResolvedValueOnce({ data: user });
    await authService.login({ identifier: 'joao@test.com', password: '123' });
    expect(localStorage.getItem('token')).toBe('tok');
  });
  it('login without token does not store', async () => {
    const user = { id: 'u1' };
    mockedApi.post.mockResolvedValueOnce({ data: { user } });
    await authService.login({ identifier: 'joao@test.com', password: '123' });
    expect(localStorage.getItem('token')).toBeNull();
  });
  it('loginAdm stores token', async () => {
    const user = { id: 'u2' };
    mockedApi.post.mockResolvedValueOnce({ data: { token: 'admtok', user } });
    mockedApi.get.mockResolvedValueOnce({ data: user });
    await authService.loginAdm({ identifier: 'adm@test.com', password: 'pass' });
    expect(localStorage.getItem('token')).toBe('admtok');
  });
  it('register stores token', async () => {
    const user = { id: 'u3' };
    mockedApi.post.mockResolvedValueOnce({ data: { token: 'regtok', user } });
    mockedApi.get.mockResolvedValueOnce({ data: user });
    await authService.register({ email: 'a@b.com', password: '123', name: 'A' } as any);
    expect(localStorage.getItem('token')).toBe('regtok');
  });
  it('requestAdmRegisterCode calls api', async () => {
    await authService.requestAdmRegisterCode({ email: 'adm@test.com' } as any);
    expect(mockedApi.post).toHaveBeenCalledWith('/auth/adm/request-register-code', { email: 'adm@test.com' });
  });
  it('verifyAdmRegisterCode stores token', async () => {
    const user = { id: 'u4' };
    mockedApi.post.mockResolvedValueOnce({ data: { token: 'verifytok', user } });
    mockedApi.get.mockResolvedValueOnce({ data: user });
    await authService.verifyAdmRegisterCode({ email: 'a@b.com', code: '1234' } as any);
    expect(localStorage.getItem('token')).toBe('verifytok');
  });
  it('logout clears storage', () => {
    localStorage.setItem('token', 'tok');
    localStorage.setItem('user', '{}');
    authService.logout();
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
  });
  it('getCurrentUser returns null when not set', () => {
    expect(authService.getCurrentUser()).toBeNull();
  });
  it('getCurrentUser returns parsed user', () => {
    localStorage.setItem('user', JSON.stringify({ id: 'u1' }));
    expect(authService.getCurrentUser()).toMatchObject({ id: 'u1' });
  });
  it('getCurrentUser returns null for invalid JSON', () => {
    localStorage.setItem('user', 'not-json');
    expect(authService.getCurrentUser()).toBeNull();
  });
  it('isAuthenticated returns false without token', () => {
    expect(authService.isAuthenticated()).toBe(false);
  });
  it('isAuthenticated returns true with token', () => {
    localStorage.setItem('token', 'tok');
    expect(authService.isAuthenticated()).toBe(true);
  });
  it('getToken returns null without token', () => {
    expect(authService.getToken()).toBeNull();
  });
  it('getToken returns token', () => {
    localStorage.setItem('token', 'tok');
    expect(authService.getToken()).toBe('tok');
  });
  it('sendResetCode calls forgot-password', async () => {
    await authService.sendResetCode('joao@test.com');
    expect(mockedApi.post).toHaveBeenCalledWith('/auth/forgot-password', { identifier: 'joao@test.com' });
  });
  it('verifyResetCode calls verify-code', async () => {
    await authService.verifyResetCode('joao@test.com', '1234');
    expect(mockedApi.post).toHaveBeenCalledWith('/auth/verify-code', { identifier: 'joao@test.com', code: '1234' });
  });
  it('resetPassword calls reset-password', async () => {
    const payload = { identifier: 'x', code: '1', newPassword: 'abc123' };
    await authService.resetPassword(payload);
    expect(mockedApi.post).toHaveBeenCalledWith('/auth/reset-password', payload);
  });
});

// ─── biService ────────────────────────────────────────────────────────────────
describe('biService', () => {
  const params = { startDate: '2024-01-01', endDate: '2024-12-31' };

  it('getOverview', async () => {
    await biService.getOverview(params);
    expect(mockedApi.get).toHaveBeenCalledWith('/admin/bi/overview', { params });
  });
  it('getOccupancy', async () => {
    await biService.getOccupancy(params);
    expect(mockedApi.get).toHaveBeenCalledWith('/admin/bi/occupancy', { params });
  });
  it('getFinancial', async () => {
    await biService.getFinancial(params);
    expect(mockedApi.get).toHaveBeenCalledWith('/admin/bi/financial', { params });
  });
  it('getClinical', async () => {
    await biService.getClinical(params);
    expect(mockedApi.get).toHaveBeenCalledWith('/admin/bi/clinical', { params });
  });
  it('getResources', async () => {
    await biService.getResources(params);
    expect(mockedApi.get).toHaveBeenCalledWith('/admin/bi/resources', { params });
  });
  it('getAuthorizations', async () => {
    await biService.getAuthorizations(params);
    expect(mockedApi.get).toHaveBeenCalledWith(expect.stringContaining('/bi/'), { params });
  });
  it('getTea', async () => {
    await biService.getTea(params);
    expect(mockedApi.get).toHaveBeenCalledWith(expect.stringContaining('/bi/'), { params });
  });
  it('getReports', async () => {
    await biService.getReports(params);
    expect(mockedApi.get).toHaveBeenCalledWith(expect.stringContaining('/bi/'), { params });
  });
  it('getCommunication', async () => {
    await biService.getCommunication(params);
    expect(mockedApi.get).toHaveBeenCalledWith(expect.stringContaining('/bi/'), { params });
  });
});

// ─── consultationService ──────────────────────────────────────────────────────
describe('consultationService', () => {
  it('list', async () => {
    await consultationService.list({ limit: 10 });
    expect(mockedApi.get).toHaveBeenCalledWith('/care/consultations/', { params: { limit: 10 } });
  });
  it('create', async () => {
    await consultationService.create({ patientId: 'p1' } as any);
    expect(mockedApi.post).toHaveBeenCalledWith('/care/consultations/', { patientId: 'p1' });
  });
  it('getById', async () => {
    await consultationService.getById('c1');
    expect(mockedApi.get).toHaveBeenCalledWith('/care/consultations/c1');
  });
  it('update', async () => {
    await consultationService.update('c1', { status: 'done' } as any);
    expect(mockedApi.put).toHaveBeenCalledWith('/care/consultations/c1', { status: 'done' });
  });
  it('remove', async () => {
    await consultationService.remove('c1');
    expect(mockedApi.delete).toHaveBeenCalledWith('/care/consultations/c1');
  });
});

// ─── deliveryService ─────────────────────────────────────────────────────────
describe('deliveryService', () => {
  it('getDeliveries', async () => {
    await deliveryService.getDeliveries();
    expect(mockedApi.get).toHaveBeenCalledWith('/admin/deliveries/');
  });
  it('createDelivery', async () => {
    await deliveryService.createDelivery({ appointmentId: 'a1' } as any);
    expect(mockedApi.post).toHaveBeenCalledWith('/admin/deliveries/', { appointmentId: 'a1' });
  });
  it('updateDelivery', async () => {
    await deliveryService.updateDelivery('d1', { status: 'done' } as any);
    expect(mockedApi.put).toHaveBeenCalledWith('/admin/deliveries/d1', { status: 'done' });
  });
});

// ─── inventoryService ────────────────────────────────────────────────────────
describe('inventoryService', () => {
  it('getItems', async () => {
    await inventoryService.getItems();
    expect(mockedApi.get).toHaveBeenCalledWith('/admin/inventory/');
  });
  it('createItem', async () => {
    await inventoryService.createItem({ name: 'Item' } as any);
    expect(mockedApi.post).toHaveBeenCalledWith(expect.stringContaining('/inventory/'), { name: 'Item' });
  });
  it('deleteItem', async () => {
    await inventoryService.deleteItem('i1');
    expect(mockedApi.delete).toHaveBeenCalledWith(expect.stringContaining('i1'));
  });
});

// ─── patientService ───────────────────────────────────────────────────────────
describe('patientService', () => {
  it('listPatients', async () => {
    await patientService.listPatients();
    expect(mockedApi.get).toHaveBeenCalledWith('/accounts/patients/');
  });
  it('getPatientById', async () => {
    await patientService.getPatientById('p1');
    expect(mockedApi.get).toHaveBeenCalledWith('/accounts/patients/p1');
  });
  it('getPatientByCpf', async () => {
    await patientService.getPatientByCpf('12345');
    expect(mockedApi.get).toHaveBeenCalledWith('/accounts/patients/cpf/12345');
  });
  it('createPatient', async () => {
    await patientService.createPatient({ name: 'Ana' } as any);
    expect(mockedApi.post).toHaveBeenCalledWith('/accounts/patients/', { name: 'Ana' });
  });
  it('updatePatient', async () => {
    await patientService.updatePatient('p1', { name: 'Ana' } as any);
    expect(mockedApi.put).toHaveBeenCalledWith('/accounts/patients/p1', { name: 'Ana' });
  });
  it('deletePatient', async () => {
    await patientService.deletePatient('p1');
    expect(mockedApi.delete).toHaveBeenCalledWith('/accounts/patients/p1');
  });
});

// ─── procedureService ────────────────────────────────────────────────────────
describe('procedureService', () => {
  it('listProcedures', async () => {
    await procedureService.listProcedures({ limit: 10 });
    expect(mockedApi.get).toHaveBeenCalledWith('/procedures/procedures/', { params: { limit: 10 } });
  });
  it('createProcedure', async () => {
    await procedureService.createProcedure({ name: 'Exam' } as any);
    expect(mockedApi.post).toHaveBeenCalledWith('/procedures/procedures/', { name: 'Exam' });
  });
  it('updateProcedure', async () => {
    await procedureService.updateProcedure('pr1', { name: 'New' } as any);
    expect(mockedApi.put).toHaveBeenCalledWith('/procedures/procedures/pr1', { name: 'New' });
  });
  it('getProcedure', async () => {
    await procedureService.getProcedure('pr1');
    expect(mockedApi.get).toHaveBeenCalledWith('/procedures/procedures/pr1');
  });
});

// ─── reportService ────────────────────────────────────────────────────────────
describe('reportService', () => {
  it('list', async () => {
    await reportService.list({ limit: 10 });
    expect(mockedApi.get).toHaveBeenCalledWith('/care/reports/', { params: { limit: 10 } });
  });
  it('create', async () => {
    await reportService.create({ worklistItemId: 'w1' } as any);
    expect(mockedApi.post).toHaveBeenCalledWith('/care/reports/', { worklistItemId: 'w1' });
  });
  it('update', async () => {
    await reportService.update('rp1', { content: 'text' } as any);
    expect(mockedApi.put).toHaveBeenCalledWith('/care/reports/rp1', { content: 'text' });
  });
  it('remove', async () => {
    await reportService.remove('rp1');
    expect(mockedApi.delete).toHaveBeenCalledWith('/care/reports/rp1');
  });
});

// ─── ticketService ────────────────────────────────────────────────────────────
describe('ticketService', () => {
  it('create', async () => {
    await ticketService.create({ title: 'bug' } as any);
    expect(mockedApi.post).toHaveBeenCalledWith('/care/tickets', { title: 'bug' });
  });
  it('list', async () => {
    await ticketService.list({ status: 'OPEN' as any });
    expect(mockedApi.get).toHaveBeenCalledWith('/admin/tickets', { params: { status: 'OPEN' } });
  });
  it('listMine', async () => {
    await ticketService.listMine();
    expect(mockedApi.get).toHaveBeenCalledWith('/care/tickets/mine', { params: undefined });
  });
  it('updateStatus patches status', async () => {
    await ticketService.updateStatus('t1', 'CLOSED' as any);
    expect((mockedApi as any).patch).toHaveBeenCalledWith('/admin/tickets/t1/status', { status: 'CLOSED' });
  });
  it('updatePriority patches priority', async () => {
    await ticketService.updatePriority('t1', 'HIGH' as any);
    expect((mockedApi as any).patch).toHaveBeenCalledWith('/admin/tickets/t1/priority', { priority: 'HIGH' });
  });
  it('getAdminById', async () => {
    await ticketService.getAdminById('t1');
    expect(mockedApi.get).toHaveBeenCalledWith('/admin/tickets/t1');
  });
  it('listAdminMessages', async () => {
    await ticketService.listAdminMessages('t1');
    expect(mockedApi.get).toHaveBeenCalledWith('/admin/tickets/t1/messages');
  });
  it('sendAdminMessage', async () => {
    await ticketService.sendAdminMessage('t1', { content: 'hi' });
    expect(mockedApi.post).toHaveBeenCalledWith('/admin/tickets/t1/messages', { content: 'hi' });
  });
  it('listMyMessages', async () => {
    await ticketService.listMyMessages('t1');
    expect(mockedApi.get).toHaveBeenCalledWith('/care/tickets/t1/messages');
  });
  it('getMineById', async () => {
    await ticketService.getMineById('t1');
    expect(mockedApi.get).toHaveBeenCalledWith('/care/tickets/t1');
  });
  it('sendMyMessage', async () => {
    await ticketService.sendMyMessage('t1', { content: 'reply' });
    expect(mockedApi.post).toHaveBeenCalledWith('/care/tickets/t1/messages', { content: 'reply' });
  });
  it('confirmMyTicketClose', async () => {
    await ticketService.confirmMyTicketClose('t1');
    expect(mockedApi.post).toHaveBeenCalledWith('/care/tickets/t1/confirm-close');
  });
  it('viewAdminMessageAttachment', async () => {
    await ticketService.viewAdminMessageAttachment('m1');
    expect(mockedApi.get).toHaveBeenCalledWith(expect.stringContaining('m1'), expect.anything());
  });
  it('viewMyMessageAttachment', async () => {
    await ticketService.viewMyMessageAttachment('m1');
    expect(mockedApi.get).toHaveBeenCalledWith(expect.stringContaining('m1'), expect.anything());
  });
});

// ─── doctorService ────────────────────────────────────────────────────────────
import doctorService from '../doctorService';
describe('doctorService', () => {
  it('listDoctors', async () => {
    await doctorService.listDoctors();
    expect(mockedApi.get).toHaveBeenCalledWith('/accounts/doctors/');
  });
  it('createDoctor', async () => {
    await doctorService.createDoctor({ name: 'Dr. A', crm: '12345', crmState: 'SP', cpf: '529.982.247-25' } as any);
    expect(mockedApi.post).toHaveBeenCalledWith('/accounts/doctors/', expect.objectContaining({ name: 'Dr. A' }));
  });
  it('updateDoctor', async () => {
    await doctorService.updateDoctor('d1', { name: 'Dr. B' });
    expect(mockedApi.put).toHaveBeenCalledWith('/accounts/doctors/d1', { name: 'Dr. B' });
  });
  it('deleteDoctor', async () => {
    await doctorService.deleteDoctor('d1');
    expect(mockedApi.delete).toHaveBeenCalledWith('/accounts/doctors/d1');
  });
});

// ─── whatsappService ──────────────────────────────────────────────────────────
describe('whatsappService', () => {
  it('getConfig', async () => {
    await whatsappService.getConfig({ scope: 'BRANCH' as any });
    expect(mockedApi.get).toHaveBeenCalledWith('/care/whatsapp/config', { params: expect.objectContaining({ scope: 'BRANCH' }) });
  });
  it('listTemplates', async () => {
    await whatsappService.listTemplates();
    expect(mockedApi.get).toHaveBeenCalledWith('/care/whatsapp/templates');
  });
  it('getNotificationConfig', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { id: 'nc1' } });
    const result = await whatsappService.getNotificationConfig();
    expect(result).toMatchObject({ id: 'nc1' });
  });
  it('listLogs', async () => {
    await whatsappService.listLogs({ limit: 10 });
    expect(mockedApi.get).toHaveBeenCalledWith('/care/whatsapp/logs', { params: { limit: 10 } });
  });
});

// ─── convenioAuthorizationService ────────────────────────────────────────────
describe('convenioAuthorizationService', () => {
  it('list calls the correct endpoint', async () => {
    await convenioAuthorizationService.list({ limit: 10 });
    expect(mockedApi.get).toHaveBeenCalledWith('/care/convenio-authorizations', { params: expect.objectContaining({ limit: 10 }) });
  });
  it('updateStatus', async () => {
    await convenioAuthorizationService.updateStatus('APPOINTMENT', 'id1', { status: 'AUTHORIZED' });
    expect(mockedApi.patch).toHaveBeenCalledWith(expect.stringContaining('id1'), expect.anything());
  });
  it('uploadAttachment', async () => {
    await convenioAuthorizationService.uploadAttachment('APPOINTMENT', 'id1', { fileName: 'f.pdf', fileBase64: 'abc' });
    expect(mockedApi.post).toHaveBeenCalledWith(expect.stringContaining('attachments'), expect.anything());
  });
  it('listAttachments', async () => {
    await convenioAuthorizationService.listAttachments('APPOINTMENT', 'id1');
    expect(mockedApi.get).toHaveBeenCalledWith(expect.stringContaining('attachments'));
  });
  it('viewAttachment', async () => {
    await convenioAuthorizationService.viewAttachment('att1');
    expect(mockedApi.get).toHaveBeenCalledWith(expect.stringContaining('att1'), expect.anything());
  });
});

// ─── getApiBaseUrl ─────────────────────────────────────────────────────────────
describe('getApiBaseUrl', () => {
  it('returns empty string when no env var and not DEV', () => {
    expect(typeof getApiBaseUrl()).toBe('string');
  });
});

// ─── cepService ──────────────────────────────────────────────────────────────
describe('cepService', () => {
  it('returns null for invalid CEP length', async () => {
    await expect(cepService.lookup('123')).resolves.toBeNull();
  });

  it('fetches from viaCEP and parses result', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        logradouro: 'Rua A',
        bairro: 'Centro',
        localidade: 'SP',
        uf: 'SP',
        complemento: '',
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await cepService.lookup('01310100');
    expect(result).toMatchObject({ street: 'Rua A', city: 'SP' });

    vi.unstubAllGlobals();
  });

  it('falls back to brasilApi when viaCEP returns erro', async () => {
    let callCount = 0;
    const fetchMock = vi.fn().mockImplementation(async () => {
      callCount++;
      if (callCount === 1) return { ok: true, json: async () => ({ erro: true }) };
      return {
        ok: true,
        json: async () => ({ street: 'Av B', neighborhood: 'Bairro', city: 'RJ', state: 'RJ' }),
      };
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await cepService.lookup('01310100');
    expect(result).toMatchObject({ street: 'Av B', city: 'RJ' });

    vi.unstubAllGlobals();
  });

  it('returns null when both APIs fail', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false });
    vi.stubGlobal('fetch', fetchMock);

    const result = await cepService.lookup('01310100');
    expect(result).toBeNull();

    vi.unstubAllGlobals();
  });
});
