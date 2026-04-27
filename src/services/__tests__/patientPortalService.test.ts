import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getMock, postMock } = vi.hoisted(() => ({
  getMock: vi.fn(),
  postMock: vi.fn(),
}));

vi.mock('../patientPortalApi', () => ({
  default: {
    get: getMock,
    post: postMock,
  },
}));

import patientPortalService from '../patientPortalService';

describe('patientPortalService', () => {
  beforeEach(() => {
    getMock.mockReset();
    postMock.mockReset();
  });

  it('loads portal resources and paginated lists', async () => {
    getMock
      .mockResolvedValueOnce({ data: { patient: { id: 'p1' }, stats: { consultationsCount: 1, examsCount: 2, reportsCount: 3 } } })
      .mockResolvedValueOnce({ data: { principalPatientId: 'p1', activePatientId: 'p1', profiles: [{ id: 'p1' }] } })
      .mockResolvedValueOnce({ data: { items: [{ id: 'c1' }], total: 1 } })
      .mockResolvedValueOnce({ data: { items: [{ id: 'e1' }], total: 1 } })
      .mockResolvedValueOnce({ data: { items: [{ id: 'r1' }], total: 1 } })
      .mockResolvedValueOnce({ data: { items: [{ id: 'u1' }], total: 1 } })
      .mockResolvedValueOnce({ data: new Blob(['pdf']) })
      .mockResolvedValueOnce({ data: { items: [{ id: 'd1' }], total: 1 } })
      .mockResolvedValueOnce({ data: { items: [{ id: 'l1' }], total: 1 } })
      .mockResolvedValueOnce({ data: { items: [{ id: 'doc1' }], total: 1 } })
      .mockResolvedValueOnce({ data: new Blob(['doc']) });
    postMock
      .mockResolvedValueOnce({ data: { appointmentId: 'a1', publicToken: 'tok', publicUrl: '/prep', hasAnamnesis: true, flowStatus: 'OPEN', documentsCount: 0, anamnesisAnswered: false, interactionCompleted: false, expiresAt: null } })
      .mockResolvedValueOnce({ data: { message: 'ok', request: { id: 'req1', status: 'PENDING', availableAt: '2026-01-01' } } });

    await expect(patientPortalService.getSummary()).resolves.toEqual(expect.objectContaining({ patient: { id: 'p1' } }));
    await expect(patientPortalService.listProfiles()).resolves.toEqual(expect.objectContaining({ profiles: [{ id: 'p1' }] }));
    await expect(patientPortalService.listConsultations({ limit: 5 })).resolves.toEqual({ items: [{ id: 'c1' }], total: 1 });
    await expect(patientPortalService.listExams({ limit: 5 })).resolves.toEqual({ items: [{ id: 'e1' }], total: 1 });
    await expect(patientPortalService.listReports({ limit: 5 })).resolves.toEqual({ items: [{ id: 'r1' }], total: 1 });
    await expect(patientPortalService.listUpcomingConsultations({ limit: 5 })).resolves.toEqual({ items: [{ id: 'u1' }], total: 1 });
    await expect(patientPortalService.getPreSchedulingLink('a1')).resolves.toEqual(expect.objectContaining({ appointmentId: 'a1' }));
    await expect(patientPortalService.requestPhysicalReportDelivery('r1', { notes: 'urgente' })).resolves.toEqual(expect.objectContaining({ message: 'ok' }));
    await expect(patientPortalService.downloadReportPdf('r1')).resolves.toBeInstanceOf(Blob);
    await expect(patientPortalService.listDeliveryRequests({ limit: 5 })).resolves.toEqual({ items: [{ id: 'd1' }], total: 1 });
    await expect(patientPortalService.listAccessLogs({ limit: 5 })).resolves.toEqual({ items: [{ id: 'l1' }], total: 1 });
    await expect(patientPortalService.listDocuments({ limit: 5 })).resolves.toEqual({ items: [{ id: 'doc1' }], total: 1 });
    await expect(patientPortalService.downloadDocument('report', 'doc1')).resolves.toBeInstanceOf(Blob);
  });
});