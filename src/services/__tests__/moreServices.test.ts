import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../api';
import insuranceService from '../insuranceService';
import medicalEquipmentService from '../medicalEquipmentService';
import reportConfigService from '../reportConfigService';
import reportService from '../reportService';
import reportWorklistService from '../reportWorklistService';
import teaEvolutionTemplateService from '../teaEvolutionTemplateService';
import teaPreReservationService from '../teaPreReservationService';
import teaProfileService from '../teaProfileService';
import whatsappConversationService from '../whatsappConversationService';
import whatsappService from '../whatsappService';
import preSchedulingService from '../preSchedulingService';
import inventoryService from '../inventoryService';
import consultationService from '../consultationService';

const mockPublicApi = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
}));

vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => mockPublicApi),
  },
}));

vi.mock('../api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    request: vi.fn(),
    defaults: { baseURL: 'http://localhost:3000' },
  },
}));

const mockedApi = vi.mocked(api);
const data = { id: 'r1', ok: true };

beforeEach(() => {
  vi.clearAllMocks();
  mockedApi.get.mockResolvedValue({ data });
  mockedApi.post.mockResolvedValue({ data });
  mockedApi.put.mockResolvedValue({ data });
  (mockedApi as any).patch.mockResolvedValue({ data });
  mockedApi.delete.mockResolvedValue({ data });
  (mockedApi as any).request.mockResolvedValue({ data });
  mockPublicApi.get.mockResolvedValue({ data });
  mockPublicApi.post.mockResolvedValue({ data });
});

// ─── insuranceService ─────────────────────────────────────────────────────────
describe('insuranceService', () => {
  it('listInsurances', async () => {
    await insuranceService.listInsurances({ limit: 10 });
    expect(mockedApi.get).toHaveBeenCalledWith('/procedures/insurances/', { params: { limit: 10 } });
  });
  it('createInsurance', async () => {
    await insuranceService.createInsurance({ name: 'Unimed' } as any);
    expect(mockedApi.post).toHaveBeenCalledWith('/procedures/insurances/', { name: 'Unimed' });
  });
  it('updateInsurance', async () => {
    await insuranceService.updateInsurance('i1', { name: 'Updated' } as any);
    expect(mockedApi.put).toHaveBeenCalledWith('/procedures/insurances/i1', { name: 'Updated' });
  });
  it('deleteInsurance', async () => {
    await insuranceService.deleteInsurance('i1');
    expect(mockedApi.delete).toHaveBeenCalledWith('/procedures/insurances/i1');
  });
  it('getInsurance', async () => {
    await insuranceService.getInsurance('i1');
    expect(mockedApi.get).toHaveBeenCalledWith('/procedures/insurances/i1');
  });
  it('listInsuranceProcedures', async () => {
    await insuranceService.listInsuranceProcedures('i1', { isActive: true });
    expect(mockedApi.get).toHaveBeenCalledWith('/procedures/insurances/i1/procedures', { params: { isActive: true } });
  });
  it('addInsuranceProcedure', async () => {
    await insuranceService.addInsuranceProcedure('i1', { procedureId: 'p1', price: 100 });
    expect(mockedApi.post).toHaveBeenCalledWith('/procedures/insurances/i1/procedures', { procedureId: 'p1', price: 100 });
  });
  it('updateInsuranceProcedure', async () => {
    await insuranceService.updateInsuranceProcedure('i1', 'ip1', { price: 200 });
    expect(mockedApi.put).toHaveBeenCalledWith('/procedures/insurances/i1/procedures/ip1', { price: 200 });
  });
  it('removeInsuranceProcedure', async () => {
    await insuranceService.removeInsuranceProcedure('i1', 'ip1');
    expect(mockedApi.delete).toHaveBeenCalledWith('/procedures/insurances/i1/procedures/ip1');
  });
});

// ─── medicalEquipmentService ──────────────────────────────────────────────────
describe('medicalEquipmentService', () => {
  it('list', async () => {
    await medicalEquipmentService.list();
    expect(mockedApi.get).toHaveBeenCalledWith('/procedures/medical-equipments/');
  });
  it('getById', async () => {
    await medicalEquipmentService.getById('e1');
    expect(mockedApi.get).toHaveBeenCalledWith('/procedures/medical-equipments/e1');
  });
  it('create', async () => {
    await medicalEquipmentService.create({ name: 'MRI' } as any);
    expect(mockedApi.post).toHaveBeenCalledWith('/procedures/medical-equipments/', { name: 'MRI' });
  });
  it('update', async () => {
    await medicalEquipmentService.update('e1', { name: 'CT' } as any);
    expect(mockedApi.put).toHaveBeenCalledWith('/procedures/medical-equipments/e1', { name: 'CT' });
  });
  it('testConnection', async () => {
    await medicalEquipmentService.testConnection('e1');
    expect(mockedApi.post).toHaveBeenCalledWith('/procedures/medical-equipments/e1/test-connection');
  });
});

// ─── reportConfigService ──────────────────────────────────────────────────────
describe('reportConfigService', () => {
  it('get', async () => {
    await reportConfigService.get();
    expect(mockedApi.get).toHaveBeenCalledWith('/care/report-config/');
  });
  it('update', async () => {
    await reportConfigService.update({ headerHtml: '<h1>Logo</h1>' } as any);
    expect(mockedApi.put).toHaveBeenCalledWith('/care/report-config/', { headerHtml: '<h1>Logo</h1>' });
  });
});

// ─── reportService (remaining) ────────────────────────────────────────────────
describe('reportService - remaining functions', () => {
  it('spellCheck', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: { correctedHtml: '<p>Fixed</p>' } });
    await reportService.spellCheck('<p>text</p>');
    expect(mockedApi.post).toHaveBeenCalledWith(expect.stringContaining('spell'), expect.anything());
  });
  it('uploadTemporaryPriorStudy', async () => {
    await reportService.uploadTemporaryPriorStudy('r1', { file: 'test' } as any);
    expect(mockedApi.post).toHaveBeenCalledWith(expect.stringContaining('r1'), expect.anything());
  });
  it('listTemporaryPriorStudies', async () => {
    await reportService.listTemporaryPriorStudies('r1');
    expect(mockedApi.get).toHaveBeenCalledWith(expect.stringContaining('r1'));
  });
  it('deleteTemporaryPriorStudy', async () => {
    await reportService.deleteTemporaryPriorStudy('r1', 's1');
    expect(mockedApi.delete).toHaveBeenCalledWith(expect.stringContaining('s1'));
  });
});

// ─── reportWorklistService ────────────────────────────────────────────────────
describe('reportWorklistService', () => {
  it('list', async () => {
    await reportWorklistService.list({ limit: 10 });
    expect(mockedApi.get).toHaveBeenCalledWith('/care/report-worklist/', { params: { limit: 10 } });
  });
  it('create', async () => {
    await reportWorklistService.create({ appointmentId: 'a1' } as any);
    expect(mockedApi.post).toHaveBeenCalledWith('/care/report-worklist/', { appointmentId: 'a1' });
  });
  it('update', async () => {
    await reportWorklistService.update('w1', { status: 'done' } as any);
    expect(mockedApi.put).toHaveBeenCalledWith('/care/report-worklist/w1', { status: 'done' });
  });
  it('remove', async () => {
    await reportWorklistService.remove('w1');
    expect(mockedApi.delete).toHaveBeenCalledWith('/care/report-worklist/w1');
  });
});

// ─── teaEvolutionTemplateService ─────────────────────────────────────────────
describe('teaEvolutionTemplateService', () => {
  it('list', async () => {
    await teaEvolutionTemplateService.list({ limit: 10 });
    expect(mockedApi.get).toHaveBeenCalledWith('/care/tea-evolution-templates', { params: { limit: 10 } });
  });
  it('resolve', async () => {
    await teaEvolutionTemplateService.resolve({ procedureId: 'p1' });
    expect(mockedApi.get).toHaveBeenCalledWith('/care/tea-evolution-templates/resolve', { params: { procedureId: 'p1' } });
  });
  it('upsert', async () => {
    await teaEvolutionTemplateService.upsert({ procedureId: 'p1', content: 'c' } as any);
    expect(mockedApi.post).toHaveBeenCalledWith('/care/tea-evolution-templates', expect.objectContaining({ procedureId: 'p1' }));
  });
  it('update', async () => {
    await teaEvolutionTemplateService.update('t1', { content: 'new' } as any);
    expect(mockedApi.put).toHaveBeenCalledWith('/care/tea-evolution-templates/t1', { content: 'new' });
  });
  it('deactivate', async () => {
    await teaEvolutionTemplateService.deactivate('t1');
    expect(mockedApi.delete).toHaveBeenCalledWith('/care/tea-evolution-templates/t1');
  });
});

// ─── teaPreReservationService ────────────────────────────────────────────────
describe('teaPreReservationService', () => {
  it('listCreated', async () => {
    await teaPreReservationService.listCreated({ limit: 10 });
    expect(mockedApi.get).toHaveBeenCalledWith('/care/tea-pre-reservations/', { params: { limit: 10 } });
  });
  it('listPending', async () => {
    await teaPreReservationService.listPending({ search: 'Ana' });
    expect(mockedApi.get).toHaveBeenCalledWith('/care/tea-pre-reservations/pending', { params: { search: 'Ana' } });
  });
  it('getManualGrid', async () => {
    await teaPreReservationService.getManualGrid('t1', { weekStart: '2024-01-01' });
    expect(mockedApi.get).toHaveBeenCalledWith('/care/tea-pre-reservations/t1/manual-grid', { params: { weekStart: '2024-01-01' } });
  });
  it('create', async () => {
    await teaPreReservationService.create({ pitTherapyId: 't1' } as any);
    expect(mockedApi.post).toHaveBeenCalledWith('/care/tea-pre-reservations', expect.objectContaining({ pitTherapyId: 't1' }));
  });
  it('updateStatus', async () => {
    await teaPreReservationService.updateStatus('r1', { status: 'PROPOSED' as any });
    expect((mockedApi as any).patch).toHaveBeenCalledWith('/care/tea-pre-reservations/r1/status', { status: 'PROPOSED' });
  });
  it('convertToAppointment', async () => {
    await teaPreReservationService.convertToAppointment('r1');
    expect(mockedApi.post).toHaveBeenCalledWith('/care/tea-pre-reservations/r1/convert-to-appointment', {});
  });
  it('getConversionChecklist', async () => {
    await teaPreReservationService.getConversionChecklist('r1');
    expect(mockedApi.get).toHaveBeenCalledWith('/care/tea-pre-reservations/r1/conversion-checklist');
  });
  it('getTimeline', async () => {
    await teaPreReservationService.getTimeline('r1');
    expect(mockedApi.get).toHaveBeenCalledWith('/care/tea-pre-reservations/r1/timeline');
  });
  it('listCancellationTherapies', async () => {
    await teaPreReservationService.listCancellationTherapies({ teaProfileId: 'tp1' });
    expect(mockedApi.get).toHaveBeenCalledWith('/care/tea-pre-reservations/cancellation-therapies', expect.objectContaining({ params: expect.objectContaining({ teaProfileId: 'tp1' }) }));
  });
});

// ─── teaProfileService ────────────────────────────────────────────────────────
describe('teaProfileService', () => {
  it('list', async () => {
    await teaProfileService.list({ limit: 10 });
    expect(mockedApi.get).toHaveBeenCalledWith('/care/tea-profiles/', { params: { limit: 10 } });
  });
  it('getById', async () => {
    await teaProfileService.getById('tp1');
    expect(mockedApi.get).toHaveBeenCalledWith('/care/tea-profiles/tp1');
  });
  it('upsert', async () => {
    await teaProfileService.upsert({ patientId: 'p1' } as any);
    expect(mockedApi.post).toHaveBeenCalledWith('/care/tea-profiles/upsert', { patientId: 'p1' });
  });
  it('listPlans', async () => {
    await teaProfileService.listPlans('tp1', { isActive: true });
    expect(mockedApi.get).toHaveBeenCalledWith('/care/tea-profiles/tp1/plans', { params: { isActive: true } });
  });
  it('createPlan', async () => {
    await teaProfileService.createPlan('tp1', { name: 'Plan A', procedureIds: [] } as any);
    expect(mockedApi.post).toHaveBeenCalledWith('/care/tea-profiles/tp1/plans', expect.objectContaining({ name: 'Plan A' }));
  });
  it('updatePlan', async () => {
    await teaProfileService.updatePlan('pl1', { name: 'Updated' } as any);
    expect(mockedApi.put).toHaveBeenCalledWith('/care/tea-profiles/plans/pl1', expect.objectContaining({ name: 'Updated' }));
  });
  it('deactivatePlan', async () => {
    await teaProfileService.deactivatePlan('pl1');
    expect(mockedApi.delete).toHaveBeenCalledWith('/care/tea-profiles/plans/pl1');
  });
  it('listEvolutions', async () => {
    await teaProfileService.listEvolutions('tp1');
    expect(mockedApi.get).toHaveBeenCalledWith('/care/tea-profiles/tp1/evolutions');
  });
  it('getPit', async () => {
    await teaProfileService.getPit('tp1');
    expect(mockedApi.get).toHaveBeenCalledWith('/care/tea-profiles/tp1/pit');
  });
  it('getReport', async () => {
    await teaProfileService.getReport('tp1', { startDate: '2024-01-01' });
    expect(mockedApi.get).toHaveBeenCalledWith('/care/tea-profiles/tp1/reports', { params: { startDate: '2024-01-01' } });
  });
});

// ─── whatsappConversationService ─────────────────────────────────────────────
describe('whatsappConversationService', () => {
  it('listFlows', async () => {
    await whatsappConversationService.listFlows();
    expect(mockedApi.get).toHaveBeenCalledWith('/care/whatsapp/conversations/flows');
  });
  it('listTemplates', async () => {
    await whatsappConversationService.listTemplates();
    expect(mockedApi.get).toHaveBeenCalledWith('/care/whatsapp/conversations/templates');
  });
  it('createTemplate', async () => {
    await whatsappConversationService.createTemplate({ name: 'T1', text: 'hi' });
    expect(mockedApi.post).toHaveBeenCalledWith('/care/whatsapp/conversations/templates', { name: 'T1', text: 'hi' });
  });
  it('listConversations', async () => {
    await whatsappConversationService.listConversations({ limit: 10 });
    expect(mockedApi.get).toHaveBeenCalledWith('/care/whatsapp/conversations', { params: { limit: 10 } });
  });
  it('getMessages', async () => {
    await whatsappConversationService.getMessages('c1');
    expect(mockedApi.get).toHaveBeenCalledWith(expect.stringContaining('c1'), expect.anything());
  });
  it('listOperators', async () => {
    await whatsappConversationService.listOperators();
    expect(mockedApi.get).toHaveBeenCalledWith('/care/whatsapp/conversations/operators', expect.anything());
  });
});

// ─── whatsappService - remaining ─────────────────────────────────────────────
describe('whatsappService - remaining', () => {
  it('saveConfig', async () => {
    await whatsappService.saveConfig({ apiKey: 'key' } as any);
    expect(mockedApi.post).toHaveBeenCalledWith('/care/whatsapp/config', expect.anything(), expect.anything());
  });
  it('deleteConfig', async () => {
    await whatsappService.deleteConfig({ scope: 'BRANCH' as any });
    expect(mockedApi.delete).toHaveBeenCalledWith('/care/whatsapp/config', expect.anything());
  });
  it('saveTemplate', async () => {
    await whatsappService.saveTemplate({ name: 'T', text: 'msg' } as any);
    expect(mockedApi.post).toHaveBeenCalledWith('/care/whatsapp/templates', expect.anything());
  });
  it('getTemplate', async () => {
    await whatsappService.getTemplate('t1');
    expect(mockedApi.get).toHaveBeenCalledWith('/care/whatsapp/templates/t1');
  });
  it('deleteTemplate', async () => {
    await whatsappService.deleteTemplate('t1');
    expect(mockedApi.delete).toHaveBeenCalledWith('/care/whatsapp/templates/t1');
  });
  it('saveNotificationConfig', async () => {
    await whatsappService.saveNotificationConfig({ enabled: true } as any);
    expect(mockedApi.post).toHaveBeenCalledWith('/care/whatsapp/notification-config', expect.anything());
  });
  it('sendMessage', async () => {
    await whatsappService.sendMessage({ phone: '11999', message: 'hi' } as any);
    expect(mockedApi.post).toHaveBeenCalledWith('/care/whatsapp/send', expect.anything());
  });
  it('getAvailableVariables', async () => {
    await whatsappService.getAvailableVariables();
    expect(mockedApi.get).toHaveBeenCalledWith('/care/whatsapp/available-variables');
  });
  it('previewMessage', async () => {
    await whatsappService.previewMessage({ appointmentId: 'a1', template: 'T' });
    expect(mockedApi.post).toHaveBeenCalledWith('/care/whatsapp/preview', expect.anything());
  });
  it('listLogs', async () => {
    await whatsappService.listLogs({ limit: 10 });
    expect(mockedApi.get).toHaveBeenCalledWith('/care/whatsapp/logs', expect.anything());
  });
  it('getLog', async () => {
    await whatsappService.getLog('l1');
    expect(mockedApi.get).toHaveBeenCalledWith('/care/whatsapp/logs/l1');
  });
});

// ─── preSchedulingService - remaining ────────────────────────────────────────
describe('preSchedulingService', () => {
  it('list', async () => {
    await preSchedulingService.list({ limit: 10 });
    expect(mockedApi.get).toHaveBeenCalledWith(expect.stringContaining('pre-scheduling'), expect.anything());
  });
  it('preAuthorize', async () => {
    await preSchedulingService.preAuthorize('a1', { guideNumber: 'G1' });
    expect(mockedApi.post).toHaveBeenCalledWith(expect.stringContaining('a1'), expect.anything());
  });
  it('sendLink', async () => {
    (mockedApi.post as any).mockResolvedValueOnce({ data: { message: 'ok', publicUrl: 'url', whatsapp: { provider: 'mock', message: 'msg' } } });
    await preSchedulingService.sendLink('a1', { notes: 'note' });
    expect(mockedApi.post).toHaveBeenCalledWith(expect.stringContaining('send-link'), expect.anything());
  });
  it('getDocuments', async () => {
    await preSchedulingService.getDocuments('a1');
    expect(mockedApi.get).toHaveBeenCalledWith(expect.stringContaining('documents'));
  });
  it('reviewDocuments', async () => {
    await preSchedulingService.reviewDocuments('a1', { action: 'APPROVE' });
    expect(mockedApi.post).toHaveBeenCalledWith(expect.stringContaining('review-documents'), expect.anything());
  });
  it('manualFinalize', async () => {
    await preSchedulingService.manualFinalize('a1');
    expect(mockedApi.post).toHaveBeenCalledWith(expect.stringContaining('manual-finalize'));
  });
  it('viewDocument', async () => {
    await preSchedulingService.viewDocument('a1', 'd1');
    expect(mockedApi.get).toHaveBeenCalledWith(expect.stringContaining('d1'), expect.anything());
  });
  it('getPublicMeta', async () => {
    await preSchedulingService.getPublicMeta('token-1');
    expect(mockPublicApi.get).toHaveBeenCalledWith(expect.stringContaining('token-1'));
  });
  it('verifyPublic', async () => {
    await preSchedulingService.verifyPublic('token-1', { recognizedCpf: '123' });
    expect(mockPublicApi.post).toHaveBeenCalledWith(expect.stringContaining('verify'), expect.anything());
  });
  it('uploadPublicDocument', async () => {
    await preSchedulingService.uploadPublicDocument('token-1', { documentType: 'ID', fileName: 'f.pdf', fileBase64: 'abc' });
    expect(mockPublicApi.post).toHaveBeenCalledWith(expect.stringContaining('upload'), expect.anything());
  });
  it('submitPublicAnamnesis', async () => {
    await preSchedulingService.submitPublicAnamnesis('token-1', { answers: [] });
    expect(mockPublicApi.post).toHaveBeenCalledWith(expect.stringContaining('anamnesis'), expect.anything());
  });
  it('finalizePublicDocuments', async () => {
    await preSchedulingService.finalizePublicDocuments('token-1', { patientComplaints: 'none' });
    expect(mockPublicApi.post).toHaveBeenCalledWith(expect.stringContaining('finalize'), expect.anything());
  });
});

// ─── inventoryService - remaining ────────────────────────────────────────────
describe('inventoryService - remaining', () => {
  it('getMovements', async () => {
    await inventoryService.getMovements('i1', { limit: 10 });
    expect(mockedApi.get).toHaveBeenCalledWith(expect.stringContaining('i1'), expect.anything());
  });
  it('createMovement', async () => {
    await inventoryService.createMovement('i1', { quantity: 5 } as any);
    expect(mockedApi.post).toHaveBeenCalledWith(expect.stringContaining('i1'), expect.anything());
  });
  it('getLots', async () => {
    await inventoryService.getLots('i1', { limit: 5 });
    expect(mockedApi.get).toHaveBeenCalledWith(expect.stringContaining('lots'), expect.anything());
  });
  it('createLot', async () => {
    await inventoryService.createLot('i1', { quantity: 10 } as any);
    expect(mockedApi.post).toHaveBeenCalledWith(expect.stringContaining('lots'), expect.anything());
  });
  it('getKits', async () => {
    await inventoryService.getKits();
    expect(mockedApi.get).toHaveBeenCalledWith('/admin/inventory/kits', expect.anything());
  });
  it('createKit', async () => {
    await inventoryService.createKit({ name: 'Kit A', items: [] } as any);
    expect(mockedApi.post).toHaveBeenCalledWith('/admin/inventory/kits', expect.anything());
  });
  it('updateKit', async () => {
    await inventoryService.updateKit('k1', { name: 'Kit B' } as any);
    expect(mockedApi.put).toHaveBeenCalledWith('/admin/inventory/kits/k1', expect.anything());
  });
});

// ─── consultationService - remaining ─────────────────────────────────────────
describe('consultationService - remaining', () => {
  it('list', async () => {
    await consultationService.list({ limit: 5 });
    expect(mockedApi.get).toHaveBeenCalledWith(expect.stringContaining('consultation'), expect.anything());
  });
  it('create', async () => {
    await consultationService.create({ patientId: 'p1' } as any);
    expect(mockedApi.post).toHaveBeenCalledWith(expect.stringContaining('consultation'), expect.anything());
  });
  it('getById', async () => {
    await consultationService.getById('c1');
    expect(mockedApi.get).toHaveBeenCalledWith(expect.stringContaining('c1'));
  });
  it('update', async () => {
    await consultationService.update('c1', { notes: 'n' } as any);
    expect(mockedApi.put).toHaveBeenCalledWith(expect.stringContaining('c1'), expect.anything());
  });
  it('submitNursingTriage', async () => {
    await consultationService.submitNursingTriage('c1', { bloodPressure: '120/80' } as any);
    expect(mockedApi.post).toHaveBeenCalledWith(expect.stringContaining('c1'), expect.anything());
  });
  it('createExamOrder', async () => {
    await consultationService.createExamOrder('c1', { procedureId: 'p1' } as any);
    expect(mockedApi.post).toHaveBeenCalledWith(expect.stringContaining('c1'), expect.anything());
  });
  it('getExamOrderConfig', async () => {
    await consultationService.getExamOrderConfig();
    expect(mockedApi.get).toHaveBeenCalledWith(expect.stringContaining('exam'));
  });
  it('listExamProcedures', async () => {
    await consultationService.listExamProcedures('c1');
    expect(mockedApi.get).toHaveBeenCalledWith(expect.stringContaining('c1'));
  });
  it('listExamSlots', async () => {
    await consultationService.listExamSlots('c1', { procedureId: 'p1' });
    expect(mockedApi.get).toHaveBeenCalledWith(expect.stringContaining('c1'), expect.anything());
  });
  it('remove', async () => {
    await consultationService.remove('c1');
    expect(mockedApi.delete).toHaveBeenCalledWith(expect.stringContaining('c1'));
  });
});
