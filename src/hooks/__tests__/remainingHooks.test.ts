import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useQuery } from '@tanstack/react-query';
import appointmentService from '../../services/appointmentService';
import consultationService from '../../services/consultationService';
import deliveryService from '../../services/deliveryService';
import inventoryService from '../../services/inventoryService';
import patientService from '../../services/patientService';
import preAttendanceService from '../../services/preAttendanceService';
import procedureService from '../../services/procedureService';
import reportService from '../../services/reportService';
import reportAddendumService from '../../services/reportAddendumService';
import reportConfigService from '../../services/reportConfigService';
import reportPhraseService from '../../services/reportPhraseService';
import reportTemplateService from '../../services/reportTemplateService';
import reportWorklistService from '../../services/reportWorklistService';
import insuranceService from '../../services/insuranceService';
import sectorService from '../../services/sectorService';
import ticketService from '../../services/ticketService';
import userService from '../../services/userService';
import authService from '../../services/authService';
import teaProfileService from '../../services/teaProfileService';
import teaPreReservationService from '../../services/teaPreReservationService';
import teaEvolutionTemplateService from '../../services/teaEvolutionTemplateService';
import whatsappService from '../../services/whatsappService';
import convenioAuthorizationService from '../../services/convenioAuthorizationService';
import biService from '../../services/biService';

import { fetchAppointments, useAppointmentsQuery } from '../useAppointmentsQuery';
import { fetchClinicalQueue, useClinicalQueueQuery } from '../useClinicalQueueQuery';
import { fetchDeliveries, useDeliveriesQuery } from '../useDeliveriesQuery';
import { fetchInventoryItems, useInventoryItemsQuery } from '../useInventoryItemsQuery';
import { fetchMyTickets, useMyTicketsQuery } from '../useMyTicketsQuery';
import { fetchPatientAppointments, usePatientAppointmentsQuery } from '../usePatientAppointmentsQuery';
import { fetchProceduresAdmin, useProceduresAdminQuery } from '../useProceduresAdminQuery';
import { fetchReportAddendumDraft, useReportAddendumDraftQuery } from '../useReportAddendumDraftQuery';
import { fetchReportPreviousReports, useReportPreviousReportsQuery } from '../useReportPreviousReportsQuery';
import { fetchReports, useReportsQuery } from '../useReportsQuery';
import { fetchRoomsAdmin, useRoomsAdminQuery } from '../useRoomsAdminQuery';
import { useCurrentUserProfileQuery } from '../useCurrentUserProfileQuery';
import { fetchTeaPlans, useTeaPlansQuery } from '../useTeaPlansQuery';
import { fetchTeaProfiles, useTeaProfilesQuery } from '../useTeaProfilesQuery';
import { fetchTeaPit, useTeaPitQuery } from '../useTeaPitQuery';
import { fetchTeaEvolutions, useTeaEvolutionsQuery } from '../useTeaEvolutionsQuery';
import { fetchTeaEvolutionTemplates, useTeaEvolutionTemplatesQuery } from '../useTeaEvolutionTemplatesQuery';
import { fetchTeaCancellationTherapies, useTeaCancellationTherapiesQuery } from '../useTeaCancellationTherapiesQuery';
import { fetchTeaReport, useTeaReportQuery } from '../useTeaReportQuery';
import { fetchWhatsAppPageData, useWhatsAppPageDataQuery } from '../useWhatsAppPageDataQuery';
import { fetchWhatsAppConfig, useWhatsAppConfigQuery } from '../useWhatsAppConfigQuery';
import { fetchConvenioAuthorizations, useConvenioAuthorizationsQuery } from '../useConvenioAuthorizationsQuery';
import { fetchPatientQueue, usePatientQueueQuery } from '../usePatientQueueQuery';
import { fetchPatientTodayAppointments, usePatientTodayAppointmentsQuery } from '../usePatientTodayAppointmentsQuery';
import { useInsuranceDetailQuery, useInsuranceProceduresQuery } from '../useInsuranceDetailQuery';
import { fetchReportExamsPageData, useReportExamsPageDataQuery } from '../useReportExamsPageDataQuery';
import { fetchReportSettingsData, useReportSettingsQuery } from '../useReportSettingsQuery';
import {
  useBIOverviewQuery,
  useBIOccupancyQuery,
  useBIFinancialQuery,
  useBIClinicalQuery,
  useBIResourcesQuery,
  useBIAuthorizationsQuery,
  useBITeaQuery,
  useBIReportsQuery,
  useBICommunicationQuery,
} from '../useBIOverviewQuery';
import { queryKeys } from '../../lib/queryKeys';

vi.mock('@tanstack/react-query', () => ({ useQuery: vi.fn((opts) => opts) }));

vi.mock('../../services/appointmentService', () => ({ default: { list: vi.fn() } }));
vi.mock('../../services/consultationService', () => ({ default: { list: vi.fn() } }));
vi.mock('../../services/deliveryService', () => ({ default: { getDeliveries: vi.fn() } }));
vi.mock('../../services/inventoryService', () => ({ default: { getItems: vi.fn() } }));
vi.mock('../../services/patientService', () => ({ default: { getById: vi.fn(), getPatientById: vi.fn(), listPatients: vi.fn() } }));
vi.mock('../../services/preAttendanceService', () => ({ default: { list: vi.fn() } }));
vi.mock('../../services/procedureService', () => ({ default: { listProcedures: vi.fn() } }));
vi.mock('../../services/reportService', () => ({ default: { list: vi.fn() } }));
vi.mock('../../services/reportAddendumService', () => ({ default: { list: vi.fn() } }));
vi.mock('../../services/reportConfigService', () => ({ default: { get: vi.fn() } }));
vi.mock('../../services/reportPhraseService', () => ({ default: { list: vi.fn() } }));
vi.mock('../../services/reportTemplateService', () => ({ default: { list: vi.fn() } }));
vi.mock('../../services/reportWorklistService', () => ({ default: { list: vi.fn() } }));
vi.mock('../../services/insuranceService', () => ({ default: { listInsurances: vi.fn(), getInsurance: vi.fn(), listInsuranceProcedures: vi.fn() } }));
vi.mock('../../services/sectorService', () => ({ default: { listSectors: vi.fn() } }));
vi.mock('../../services/ticketService', () => ({ default: { list: vi.fn(), listMine: vi.fn() } }));
vi.mock('../../services/userService', () => ({ default: { getUser: vi.fn() } }));
vi.mock('../../services/authService', () => ({ default: { getCurrentUser: vi.fn() } }));
vi.mock('../../services/teaProfileService', () => ({
  default: {
    list: vi.fn(),
    listPlans: vi.fn(),
    getPit: vi.fn(),
    listEvolutions: vi.fn(),
    getReport: vi.fn(),
  },
}));
vi.mock('../../services/teaPreReservationService', () => ({
  default: {
    listCreated: vi.fn(),
    listCancellationTherapies: vi.fn(),
  },
}));
vi.mock('../../services/teaEvolutionTemplateService', () => ({ default: { list: vi.fn() } }));
vi.mock('../../services/whatsappService', () => ({
  default: {
    listTemplates: vi.fn(),
    getNotificationConfig: vi.fn(),
    getAvailableVariables: vi.fn(),
    listLogs: vi.fn(),
    getConfig: vi.fn(),
  },
}));
vi.mock('../../services/convenioAuthorizationService', () => ({ default: { list: vi.fn() } }));
vi.mock('../../services/biService', () => ({
  default: {
    getOverview: vi.fn(),
    getOccupancy: vi.fn(),
    getFinancial: vi.fn(),
    getClinical: vi.fn(),
    getResources: vi.fn(),
    getAuthorizations: vi.fn(),
    getTea: vi.fn(),
    getReports: vi.fn(),
    getCommunication: vi.fn(),
  },
}));

const rows = [{ id: '1' }];
const mockedUseQuery = vi.mocked(useQuery);

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(appointmentService.list).mockResolvedValue(rows as any);
  vi.mocked(consultationService.list).mockResolvedValue({ items: rows } as any);
  vi.mocked(deliveryService.getDeliveries).mockResolvedValue(rows as any);
  vi.mocked(inventoryService.getItems).mockResolvedValue(rows as any);
  vi.mocked(preAttendanceService.list).mockResolvedValue({ items: rows } as any);
  vi.mocked(procedureService.listProcedures).mockResolvedValue({ items: rows } as any);
  vi.mocked(reportService.list).mockResolvedValue({ items: rows } as any);
  vi.mocked(reportAddendumService.list).mockResolvedValue({ items: rows } as any);
  vi.mocked(reportConfigService.get).mockResolvedValue({} as any);
  vi.mocked(reportPhraseService.list).mockResolvedValue({ items: rows } as any);
  vi.mocked(reportTemplateService.list).mockResolvedValue({ items: rows } as any);
  vi.mocked(reportWorklistService.list).mockResolvedValue({ items: rows } as any);
  vi.mocked(insuranceService.listInsurances).mockResolvedValue(rows as any);
  vi.mocked(sectorService.listSectors).mockResolvedValue(rows as any);
  vi.mocked(ticketService.list).mockResolvedValue(rows as any);
  vi.mocked(ticketService.listMine).mockResolvedValue(rows as any);
  vi.mocked(userService.getUser).mockResolvedValue({ id: 'u1' } as any);
  vi.mocked(authService.getCurrentUser).mockReturnValue({ id: 'u1' } as any);
  vi.mocked(teaProfileService.list).mockResolvedValue({ items: rows } as any);
  vi.mocked(teaProfileService.listPlans).mockResolvedValue({ items: rows } as any);
  vi.mocked(teaProfileService.getPit).mockResolvedValue({ id: 'pit1' } as any);
  vi.mocked(teaProfileService.listEvolutions).mockResolvedValue({ items: rows } as any);
  vi.mocked(teaProfileService.getReport).mockResolvedValue({} as any);
  vi.mocked(teaPreReservationService.listCreated).mockResolvedValue({ items: rows } as any);
  vi.mocked(teaPreReservationService.listCancellationTherapies).mockResolvedValue({ items: rows } as any);
  vi.mocked(teaEvolutionTemplateService.list).mockResolvedValue({ items: rows } as any);
  vi.mocked(whatsappService.listTemplates).mockResolvedValue(rows as any);
  vi.mocked(whatsappService.getNotificationConfig).mockResolvedValue({} as any);
  vi.mocked(whatsappService.getAvailableVariables).mockResolvedValue([] as any);
  vi.mocked(whatsappService.listLogs).mockResolvedValue({ items: [] } as any);
  vi.mocked(whatsappService.getConfig).mockResolvedValue({} as any);
  vi.mocked(convenioAuthorizationService.list).mockResolvedValue({ items: rows } as any);
  vi.mocked(biService.getOverview).mockResolvedValue({} as any);
  vi.mocked(biService.getOccupancy).mockResolvedValue({} as any);
  vi.mocked(biService.getFinancial).mockResolvedValue({} as any);
  vi.mocked(biService.getClinical).mockResolvedValue({} as any);
  vi.mocked(biService.getResources).mockResolvedValue({} as any);
  vi.mocked(biService.getAuthorizations).mockResolvedValue({} as any);
  vi.mocked(biService.getTea).mockResolvedValue({} as any);
  vi.mocked(biService.getReports).mockResolvedValue({} as any);
  vi.mocked(biService.getCommunication).mockResolvedValue({} as any);
  vi.mocked(patientService.getPatientById).mockResolvedValue({ id: 'p1' } as any);
});

describe('fetchAppointments', () => {
  it('returns array from service', async () => {
    await expect(fetchAppointments()).resolves.toEqual(rows);
  });
  it('extracts items from object response', async () => {
    vi.mocked(appointmentService.list).mockResolvedValue({ items: rows } as any);
    await expect(fetchAppointments()).resolves.toEqual(rows);
  });
  it('extracts data from object response', async () => {
    vi.mocked(appointmentService.list).mockResolvedValue({ data: rows } as any);
    await expect(fetchAppointments()).resolves.toEqual(rows);
  });
  it('returns empty array for unrecognized shape', async () => {
    vi.mocked(appointmentService.list).mockResolvedValue({} as any);
    await expect(fetchAppointments()).resolves.toEqual([]);
  });
});

describe('fetchClinicalQueue', () => {
  it('extracts items', async () => {
    await expect(fetchClinicalQueue()).resolves.toEqual(rows);
    expect(consultationService.list).toHaveBeenCalledWith(expect.objectContaining({ queueType: 'Fila clínica' }));
  });
  it('returns array directly', async () => {
    vi.mocked(consultationService.list).mockResolvedValue(rows as any);
    await expect(fetchClinicalQueue()).resolves.toEqual(rows);
  });
});

describe('fetchDeliveries', () => {
  it('returns array', async () => {
    await expect(fetchDeliveries()).resolves.toEqual(rows);
  });
  it('handles data.items shape', async () => {
    vi.mocked(deliveryService.getDeliveries).mockResolvedValue({ data: { items: rows } } as any);
    await expect(fetchDeliveries()).resolves.toEqual(rows);
  });
  it('returns empty for unknown shape', async () => {
    vi.mocked(deliveryService.getDeliveries).mockResolvedValue({} as any);
    await expect(fetchDeliveries()).resolves.toEqual([]);
  });
});

describe('fetchInventoryItems', () => {
  it('returns array', async () => {
    await expect(fetchInventoryItems()).resolves.toEqual(rows);
  });
  it('extracts from data', async () => {
    vi.mocked(inventoryService.getItems).mockResolvedValue({ data: rows } as any);
    await expect(fetchInventoryItems()).resolves.toEqual(rows);
  });
  it('returns empty for unknown shape', async () => {
    vi.mocked(inventoryService.getItems).mockResolvedValue({} as any);
    await expect(fetchInventoryItems()).resolves.toEqual([]);
  });
});

describe('fetchMyTickets', () => {
  it('delegates to ticketService.listMine', async () => {
    await fetchMyTickets();
    expect(ticketService.listMine).toHaveBeenCalledWith(undefined);
  });
  it('passes filters', async () => {
    await fetchMyTickets({ status: 'OPEN' as any });
    expect(ticketService.listMine).toHaveBeenCalledWith({ status: 'OPEN' });
  });
});

describe('fetchPatientAppointments', () => {
  it('returns empty for null patientId', async () => {
    await expect(fetchPatientAppointments(null)).resolves.toEqual([]);
  });
  it('calls service with patientId', async () => {
    vi.mocked(appointmentService.list).mockResolvedValue(rows as any);
    await expect(fetchPatientAppointments('p1')).resolves.toEqual(rows);
    expect(appointmentService.list).toHaveBeenCalledWith(expect.objectContaining({ patientId: 'p1' }));
  });
  it('extracts from items wrapper', async () => {
    vi.mocked(appointmentService.list).mockResolvedValue({ items: rows } as any);
    await expect(fetchPatientAppointments('p1')).resolves.toEqual(rows);
  });
  it('extracts from data.items wrapper', async () => {
    vi.mocked(appointmentService.list).mockResolvedValue({ data: { items: rows } } as any);
    await expect(fetchPatientAppointments('p1')).resolves.toEqual(rows);
  });
  it('extracts from data.data wrapper', async () => {
    vi.mocked(appointmentService.list).mockResolvedValue({ data: rows } as any);
    await expect(fetchPatientAppointments('p1')).resolves.toEqual(rows);
  });
  it('returns empty for unknown shape', async () => {
    vi.mocked(appointmentService.list).mockResolvedValue({} as any);
    await expect(fetchPatientAppointments('p1')).resolves.toEqual([]);
  });
});

describe('fetchProceduresAdmin', () => {
  it('extracts items', async () => {
    await expect(fetchProceduresAdmin()).resolves.toEqual(rows);
  });
});

describe('fetchReportAddendumDraft', () => {
  it('returns null for empty reportId', async () => {
    await expect(fetchReportAddendumDraft(null)).resolves.toBeNull();
  });
  it('returns first item from list', async () => {
    vi.mocked(reportAddendumService.list).mockResolvedValue({ items: [{ id: 'r1' }] } as any);
    await expect(fetchReportAddendumDraft('r1')).resolves.toMatchObject({ id: 'r1' });
  });
  it('returns null when list is empty', async () => {
    vi.mocked(reportAddendumService.list).mockResolvedValue({ items: [] } as any);
    await expect(fetchReportAddendumDraft('r1')).resolves.toBeNull();
  });
  it('returns null when response has no items or array', async () => {
    vi.mocked(reportAddendumService.list).mockResolvedValue({} as any);
    await expect(fetchReportAddendumDraft('r1')).resolves.toBeNull();
  });
});

describe('fetchReportPreviousReports', () => {
  it('returns empty for null cpf', async () => {
    await expect(fetchReportPreviousReports(null)).resolves.toEqual([]);
  });
  it('calls service with cpf', async () => {
    vi.mocked(reportService.list).mockResolvedValue({ items: [] } as any);
    await fetchReportPreviousReports('12345678900');
    expect(reportService.list).toHaveBeenCalledWith(expect.objectContaining({ search: '12345678900' }));
  });
  it('maps full report fields', async () => {
    vi.mocked(reportService.list).mockResolvedValue([
      { id: 'r1', exam: 'ECG', scheduledFor: '2024-01-01', status: 'DONE', conclusion: 'Normal', description: 'Desc' },
    ] as any);
    const result = await fetchReportPreviousReports('123');
    expect(result[0]).toMatchObject({ id: 'r1', examType: 'ECG', summary: 'Normal' });
  });
  it('uses fallbacks when fields missing', async () => {
    vi.mocked(reportService.list).mockResolvedValue([
      { id: 'r2', description: 'Desc2' },
    ] as any);
    const result = await fetchReportPreviousReports('123');
    expect(result[0].examType).toBe('Exame');
    expect(result[0].summary).toBe('Desc2');
  });
  it('extracts from data.data.items wrapper', async () => {
    vi.mocked(reportService.list).mockResolvedValue({ data: { items: [{ id: 'r3' }] } } as any);
    const result = await fetchReportPreviousReports('123');
    expect(result).toHaveLength(1);
  });
  it('filters out items without id', async () => {
    vi.mocked(reportService.list).mockResolvedValue([{ id: '' }, { id: 'r4' }] as any);
    const result = await fetchReportPreviousReports('123');
    expect(result).toHaveLength(1);
  });
});

describe('fetchReports', () => {
  it('extracts items', async () => {
    await expect(fetchReports()).resolves.toEqual(rows);
  });
  it('returns array directly', async () => {
    vi.mocked(reportService.list).mockResolvedValue(rows as any);
    await expect(fetchReports()).resolves.toEqual(rows);
  });
  it('extracts from data.data wrapper', async () => {
    vi.mocked(reportService.list).mockResolvedValue({ data: rows } as any);
    await expect(fetchReports()).resolves.toEqual(rows);
  });
  it('returns empty for unknown shape', async () => {
    vi.mocked(reportService.list).mockResolvedValue({} as any);
    await expect(fetchReports()).resolves.toEqual([]);
  });
});

describe('fetchRoomsAdmin', () => {
  it('extracts array', async () => {
    await expect(fetchRoomsAdmin()).resolves.toEqual(rows);
  });
});

describe('fetchTeaPlans', () => {
  it('returns empty when no teaProfileId', async () => {
    await expect(fetchTeaPlans({ teaProfileId: null })).resolves.toEqual([]);
  });
  it('extracts items', async () => {
    vi.mocked(teaProfileService.listPlans).mockResolvedValue({ items: rows } as any);
    await expect(fetchTeaPlans({ teaProfileId: 'tp1' })).resolves.toEqual(rows);
  });
  it('returns array directly', async () => {
    vi.mocked(teaProfileService.listPlans).mockResolvedValue(rows as any);
    await expect(fetchTeaPlans({ teaProfileId: 'tp1' })).resolves.toEqual(rows);
  });
  it('extracts from data.items wrapper', async () => {
    vi.mocked(teaProfileService.listPlans).mockResolvedValue({ data: { items: rows } } as any);
    await expect(fetchTeaPlans({ teaProfileId: 'tp1' })).resolves.toEqual(rows);
  });
  it('extracts from data.data wrapper', async () => {
    vi.mocked(teaProfileService.listPlans).mockResolvedValue({ data: rows } as any);
    await expect(fetchTeaPlans({ teaProfileId: 'tp1' })).resolves.toEqual(rows);
  });
  it('returns empty for unknown shape', async () => {
    vi.mocked(teaProfileService.listPlans).mockResolvedValue({} as any);
    await expect(fetchTeaPlans({ teaProfileId: 'tp1' })).resolves.toEqual([]);
  });
});

describe('fetchTeaProfiles', () => {
  it('extracts items', async () => {
    await expect(fetchTeaProfiles()).resolves.toEqual(rows);
  });
});

describe('fetchTeaPit', () => {
  it('returns null for empty id', async () => {
    await expect(fetchTeaPit(null)).resolves.toBeNull();
  });
  it('calls service', async () => {
    await expect(fetchTeaPit('tp1')).resolves.toMatchObject({ id: 'pit1' });
  });
});

describe('fetchTeaEvolutions', () => {
  it('returns empty for no id', async () => {
    await expect(fetchTeaEvolutions(null)).resolves.toEqual([]);
  });
  it('extracts items', async () => {
    await expect(fetchTeaEvolutions('tp1')).resolves.toEqual(rows);
  });
});

describe('fetchTeaEvolutionTemplates', () => {
  it('extracts items', async () => {
    await expect(fetchTeaEvolutionTemplates()).resolves.toEqual(rows);
  });
});

describe('fetchTeaCancellationTherapies', () => {
  it('returns empty when no teaProfileId', async () => {
    await expect(fetchTeaCancellationTherapies({ teaProfileId: null })).resolves.toEqual([]);
  });
  it('calls service', async () => {
    vi.mocked(teaPreReservationService.listCancellationTherapies).mockResolvedValue({ items: rows } as any);
    await fetchTeaCancellationTherapies({ teaProfileId: 'tp1' });
    expect(teaPreReservationService.listCancellationTherapies).toHaveBeenCalledWith(expect.objectContaining({ teaProfileId: 'tp1' }));
  });
});

describe('fetchTeaReport', () => {
  it('returns null when no id', async () => {
    await expect(fetchTeaReport({ teaProfileId: null })).resolves.toBeNull();
  });
  it('calls service', async () => {
    await fetchTeaReport({ teaProfileId: 'tp1' });
    expect(teaProfileService.getReport).toHaveBeenCalledWith('tp1', expect.any(Object));
  });
});

describe('fetchWhatsAppPageData', () => {
  it('aggregates all whatsapp data', async () => {
    const result = await fetchWhatsAppPageData();
    expect(result).toMatchObject({ templates: rows, notificationConfig: {} });
  });
});

describe('fetchWhatsAppConfig', () => {
  it('calls whatsappService.getConfig', async () => {
    await fetchWhatsAppConfig({ scope: 'BRANCH' as any });
    expect(whatsappService.getConfig).toHaveBeenCalledWith({ scope: 'BRANCH' });
  });
});

describe('fetchConvenioAuthorizations', () => {
  it('extracts items', async () => {
    await expect(fetchConvenioAuthorizations({})).resolves.toEqual(rows);
  });
  it('returns empty for unknown shape', async () => {
    vi.mocked(convenioAuthorizationService.list).mockResolvedValue({} as any);
    await expect(fetchConvenioAuthorizations({})).resolves.toEqual([]);
  });
});

describe('fetchPatientQueue', () => {
  it('returns empty when no matching status', async () => {
    vi.mocked(preAttendanceService.list).mockResolvedValue({ items: [{ id: '1', status: 'concluido' }] } as any);
    await expect(fetchPatientQueue()).resolves.toEqual([]);
  });
  it('returns filtered queue items', async () => {
    vi.mocked(preAttendanceService.list).mockResolvedValue({
      items: [{ id: '1', status: 'na fila da recepção', createdAt: '2024-01-01T10:00:00Z' }],
    } as any);
    const result = await fetchPatientQueue();
    expect(result).toHaveLength(1);
    expect(result[0].position).toBe(1);
  });
});

describe('fetchPatientTodayAppointments', () => {
  it('returns empty for no patientId', async () => {
    await expect(fetchPatientTodayAppointments(null)).resolves.toEqual([]);
  });
  it('filters by today and maps fields', async () => {
    const d = new Date();
    const today = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    vi.mocked(appointmentService.list).mockResolvedValue([
      { id: 'a1', date: today, doctorName: 'Dr. X', specialty: 'Ortopedia', time: '10:00', status: 'SCHEDULED', room: '1' },
      { id: 'a2', date: '2000-01-01', doctorName: 'Dr. Y', specialty: 'Clínica', time: '09:00', status: 'DONE' },
    ] as any);
    const result = await fetchPatientTodayAppointments('p1');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('a1');
  });
  it('uses fallback field names when primary fields missing', async () => {
    const d = new Date();
    const today = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    vi.mocked(appointmentService.list).mockResolvedValue([
      { id: 'a1', date: today, doctor: { name: 'Dr. Z', specialty: 'Cardiologia' }, roomNumber: '2' },
    ] as any);
    const result = await fetchPatientTodayAppointments('p1');
    expect(result[0].doctorName).toBe('Dr. Z');
    expect(result[0].specialty).toBe('Cardiologia');
    expect(result[0].room).toBe('2');
  });
});

describe('fetchReportExamsPageData', () => {
  it('aggregates all report data', async () => {
    const result = await fetchReportExamsPageData();
    expect(result).toHaveProperty('reportData');
    expect(result).toHaveProperty('templateData');
  });
});

describe('fetchReportSettingsData', () => {
  it('aggregates all settings data', async () => {
    const result = await fetchReportSettingsData();
    expect(result).toHaveProperty('templatesData');
    expect(result).toHaveProperty('configData');
  });
});

describe('hook query key configurations', () => {
  const biParams = { startDate: '2024-01-01', endDate: '2024-12-31' };

  it('useAppointmentsQuery uses correct key and interval', () => {
    useAppointmentsQuery();
    expect(mockedUseQuery).toHaveBeenLastCalledWith(expect.objectContaining({
      queryKey: queryKeys.appointments,
      refetchInterval: 10_000,
    }));
  });

  it('useClinicalQueueQuery uses correct key', () => {
    useClinicalQueueQuery();
    expect(mockedUseQuery).toHaveBeenLastCalledWith(expect.objectContaining({
      queryKey: queryKeys.clinicalQueue,
      refetchInterval: 5_000,
    }));
  });

  it('useDeliveriesQuery uses correct key', () => {
    useDeliveriesQuery();
    expect(mockedUseQuery).toHaveBeenLastCalledWith(expect.objectContaining({ queryKey: queryKeys.deliveries }));
  });

  it('useInventoryItemsQuery uses correct key', () => {
    useInventoryItemsQuery();
    expect(mockedUseQuery).toHaveBeenLastCalledWith(expect.objectContaining({ queryKey: queryKeys.inventoryItems }));
  });

  it('useMyTicketsQuery uses dynamic key', () => {
    useMyTicketsQuery({ status: 'OPEN' as any });
    expect(mockedUseQuery).toHaveBeenLastCalledWith(expect.objectContaining({
      queryKey: [...queryKeys.myTickets, 'OPEN', 'ALL', ''],
    }));
  });

  it('usePatientAppointmentsQuery uses dynamic key', () => {
    usePatientAppointmentsQuery('p1');
    expect(mockedUseQuery).toHaveBeenLastCalledWith(expect.objectContaining({
      queryKey: [...queryKeys.patientAppointments, 'p1'],
    }));
  });

  it('useProceduresAdminQuery uses correct key', () => {
    useProceduresAdminQuery();
    expect(mockedUseQuery).toHaveBeenLastCalledWith(expect.objectContaining({ queryKey: queryKeys.proceduresAdmin }));
  });

  it('useReportAddendumDraftQuery uses dynamic key', () => {
    useReportAddendumDraftQuery('r1');
    expect(mockedUseQuery).toHaveBeenLastCalledWith(expect.objectContaining({
      queryKey: [...queryKeys.reportAddendumDraft, 'r1'],
      enabled: true,
    }));
  });

  it('useReportPreviousReportsQuery disabled for empty cpf', () => {
    useReportPreviousReportsQuery('');
    expect(mockedUseQuery).toHaveBeenLastCalledWith(expect.objectContaining({ enabled: false }));
  });

  it('useReportsQuery uses correct key', () => {
    useReportsQuery();
    expect(mockedUseQuery).toHaveBeenLastCalledWith(expect.objectContaining({ queryKey: queryKeys.reports }));
  });

  it('useRoomsAdminQuery uses correct key', () => {
    useRoomsAdminQuery();
    expect(mockedUseQuery).toHaveBeenLastCalledWith(expect.objectContaining({ queryKey: queryKeys.roomsAdmin }));
  });

  it('useCurrentUserProfileQuery is enabled when user is cached', () => {
    useCurrentUserProfileQuery();
    expect(mockedUseQuery).toHaveBeenLastCalledWith(expect.objectContaining({ enabled: true }));
  });

  it('useTeaPlansQuery disabled when no profileId', () => {
    useTeaPlansQuery({ teaProfileId: null });
    expect(mockedUseQuery).toHaveBeenLastCalledWith(expect.objectContaining({ enabled: false }));
  });

  it('useTeaProfilesQuery uses correct key', () => {
    useTeaProfilesQuery();
    expect(mockedUseQuery).toHaveBeenLastCalledWith(expect.objectContaining({
      queryKey: expect.arrayContaining(['tea-profiles']),
    }));
  });

  it('useTeaPitQuery disabled when no profileId', () => {
    useTeaPitQuery(null);
    expect(mockedUseQuery).toHaveBeenLastCalledWith(expect.objectContaining({ enabled: false }));
  });

  it('useTeaEvolutionsQuery uses dynamic key', () => {
    useTeaEvolutionsQuery('tp1');
    expect(mockedUseQuery).toHaveBeenLastCalledWith(expect.objectContaining({
      queryKey: [...queryKeys.teaEvolutions, 'tp1'],
    }));
  });

  it('useTeaEvolutionTemplatesQuery uses correct key', () => {
    useTeaEvolutionTemplatesQuery();
    expect(mockedUseQuery).toHaveBeenLastCalledWith(expect.objectContaining({ queryKey: queryKeys.teaEvolutionTemplates }));
  });

  it('useTeaCancellationTherapiesQuery uses dynamic key', () => {
    useTeaCancellationTherapiesQuery({ teaProfileId: 'tp1' });
    expect(mockedUseQuery).toHaveBeenLastCalledWith(expect.objectContaining({
      queryKey: expect.arrayContaining(['tp1']),
    }));
  });

  it('useTeaReportQuery disabled when no profileId', () => {
    useTeaReportQuery({ teaProfileId: null });
    expect(mockedUseQuery).toHaveBeenLastCalledWith(expect.objectContaining({ enabled: false }));
  });

  it('useWhatsAppPageDataQuery uses correct key', () => {
    useWhatsAppPageDataQuery();
    expect(mockedUseQuery).toHaveBeenLastCalledWith(expect.objectContaining({ queryKey: queryKeys.whatsappPageData }));
  });

  it('useWhatsAppConfigQuery uses dynamic key', () => {
    useWhatsAppConfigQuery({ scope: 'BRANCH' as any, branchId: 'b1' });
    expect(mockedUseQuery).toHaveBeenLastCalledWith(expect.objectContaining({
      queryKey: [...queryKeys.whatsappConfig, 'BRANCH', 'b1'],
    }));
  });

  it('useConvenioAuthorizationsQuery uses dynamic key', () => {
    useConvenioAuthorizationsQuery({ search: 'test' });
    expect(mockedUseQuery).toHaveBeenLastCalledWith(expect.objectContaining({
      queryKey: expect.arrayContaining(['test']),
    }));
  });

  it('usePatientQueueQuery uses correct key', () => {
    usePatientQueueQuery();
    expect(mockedUseQuery).toHaveBeenLastCalledWith(expect.objectContaining({ queryKey: queryKeys.patientQueue }));
  });

  it('useBIOverviewQuery uses dynamic key', () => {
    useBIOverviewQuery(biParams);
    expect(mockedUseQuery).toHaveBeenLastCalledWith(expect.objectContaining({
      queryKey: expect.arrayContaining(['bi-overview']),
      refetchInterval: 30_000,
    }));
  });

  it('useBIOccupancyQuery, useBIFinancialQuery, useBIClinicalQuery, useBIResourcesQuery', () => {
    useBIOccupancyQuery(biParams);
    expect(mockedUseQuery).toHaveBeenLastCalledWith(expect.objectContaining({ queryKey: expect.arrayContaining(['bi-occupancy']) }));
    useBIFinancialQuery(biParams);
    expect(mockedUseQuery).toHaveBeenLastCalledWith(expect.objectContaining({ queryKey: expect.arrayContaining(['bi-financial']) }));
    useBIClinicalQuery(biParams);
    expect(mockedUseQuery).toHaveBeenLastCalledWith(expect.objectContaining({ queryKey: expect.arrayContaining(['bi-clinical']) }));
    useBIResourcesQuery(biParams);
    expect(mockedUseQuery).toHaveBeenLastCalledWith(expect.objectContaining({ queryKey: expect.arrayContaining(['bi-resources']) }));
  });

  it('useBIAuthorizationsQuery, useBITeaQuery, useBIReportsQuery, useBICommunicationQuery', () => {
    useBIAuthorizationsQuery(biParams);
    expect(mockedUseQuery).toHaveBeenLastCalledWith(expect.objectContaining({ queryKey: expect.arrayContaining(['bi-authorizations']) }));
    useBITeaQuery(biParams);
    expect(mockedUseQuery).toHaveBeenLastCalledWith(expect.objectContaining({ queryKey: expect.arrayContaining(['bi-tea']) }));
    useBIReportsQuery(biParams);
    expect(mockedUseQuery).toHaveBeenLastCalledWith(expect.objectContaining({ queryKey: expect.arrayContaining(['bi-reports']) }));
    useBICommunicationQuery(biParams);
    expect(mockedUseQuery).toHaveBeenLastCalledWith(expect.objectContaining({ queryKey: expect.arrayContaining(['bi-communication']) }));
  });

  it('useReportExamsPageDataQuery uses correct key', () => {
    useReportExamsPageDataQuery();
    expect(mockedUseQuery).toHaveBeenLastCalledWith(expect.objectContaining({ queryKey: queryKeys.reportExamsPageData }));
  });

  it('useReportSettingsQuery uses correct key', () => {
    useReportSettingsQuery();
    expect(mockedUseQuery).toHaveBeenLastCalledWith(expect.objectContaining({ queryKey: queryKeys.reportSettings }));
  });

  it('useInsuranceDetailQuery uses dynamic key and is disabled without id', () => {
    useInsuranceDetailQuery(undefined);
    expect(mockedUseQuery).toHaveBeenLastCalledWith(expect.objectContaining({
      queryKey: [...queryKeys.insuranceDetail, undefined],
      enabled: false,
    }));
    useInsuranceDetailQuery('ins1');
    expect(mockedUseQuery).toHaveBeenLastCalledWith(expect.objectContaining({
      queryKey: [...queryKeys.insuranceDetail, 'ins1'],
      enabled: true,
    }));
  });

  it('useInsuranceProceduresQuery uses dynamic key and is disabled without id', () => {
    useInsuranceProceduresQuery(undefined);
    expect(mockedUseQuery).toHaveBeenLastCalledWith(expect.objectContaining({
      queryKey: [...queryKeys.insuranceProcedures, undefined],
      enabled: false,
    }));
    useInsuranceProceduresQuery('ins1');
    expect(mockedUseQuery).toHaveBeenLastCalledWith(expect.objectContaining({
      queryKey: [...queryKeys.insuranceProcedures, 'ins1'],
      enabled: true,
    }));
  });
});

describe('queryFn invocation coverage', () => {
  it('invokes queryFns to cover arrow functions', async () => {
    vi.mocked(appointmentService.list).mockResolvedValue({ items: [] } as any);
    const opts1 = useAppointmentsQuery() as any;
    await opts1.queryFn();

    vi.mocked(reportAddendumService.list).mockResolvedValue({ items: [] } as any);
    const opts2 = useReportAddendumDraftQuery('r1') as any;
    await opts2.queryFn();

    vi.mocked(reportService.list).mockResolvedValue({ items: [] } as any);
    const opts3 = useReportsQuery() as any;
    await opts3.queryFn();

    vi.mocked(teaProfileService.listPlans).mockResolvedValue({ items: [] } as any);
    const opts4 = useTeaPlansQuery({ teaProfileId: 'tp1' }) as any;
    await opts4.queryFn();

    vi.mocked(convenioAuthorizationService.list).mockResolvedValue({ items: [] } as any);
    const opts5 = useConvenioAuthorizationsQuery({ search: 'test', statusFilter: ['PENDING' as any] }) as any;
    await opts5.queryFn();
  });
});
