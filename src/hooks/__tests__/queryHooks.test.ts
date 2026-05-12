import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../../lib/queryKeys';
import accessService from '../../services/accessService';
import branchService from '../../services/branchService';
import branchSettingsService from '../../services/branchSettingsService';
import companyService from '../../services/companyService';
import doctorService from '../../services/doctorService';
import financeService from '../../services/financeService';
import insuranceService from '../../services/insuranceService';
import invoiceService from '../../services/invoiceService';
import leadService from '../../services/leadService';
import medicalEquipmentService from '../../services/medicalEquipmentService';
import { moduleService } from '../../services/moduleService';
import patientService from '../../services/patientService';
import preAttendanceService from '../../services/preAttendanceService';
import preSchedulingService from '../../services/preSchedulingService';
import procedureAnamnesisTemplateService from '../../services/procedureAnamnesisTemplateService';
import procedureNursingTemplateService from '../../services/procedureNursingTemplateService';
import publicCheckInService from '../../services/publicCheckInService';
import sectorService from '../../services/sectorService';
import ticketService from '../../services/ticketService';
import tissBatchService from '../../services/tissBatchService';
import userService from '../../services/userService';
import { fetchAdminLeads, useAdminLeadsQuery } from '../useAdminLeadsQuery';
import { fetchAdminTickets, useAdminTicketsQuery } from '../useAdminTicketsQuery';
import { fetchAnamnesisTemplates, useAnamnesisTemplatesQuery } from '../useAnamnesisTemplatesQuery';
import { fetchBranchSettings, useBranchSettingsQuery } from '../useBranchSettingsQuery';
import { fetchDoctorsAdmin, useDoctorsAdminQuery } from '../useDoctorsAdminQuery';
import { fetchFinanceEntries, useFinanceEntriesQuery } from '../useFinanceEntriesQuery';
import { fetchInsurancesAdmin, useInsurancesAdminQuery } from '../useInsurancesAdminQuery';
import { fetchInvoices, useInvoicesQuery } from '../useInvoicesQuery';
import { fetchMedicalEquipments, useMedicalEquipmentsQuery } from '../useMedicalEquipmentsQuery';
import { fetchNursingTemplates, useNursingTemplatesQuery } from '../useNursingTemplatesQuery';
import { fetchPatientsAdmin, usePatientsAdminQuery } from '../usePatientsAdminQuery';
import { fetchPreSchedulings, usePreSchedulingsQuery } from '../usePreSchedulingsQuery';
import { usePublicBranchInfoQuery } from '../usePublicBranchInfoQuery';
import { usePublicPreSchedulingMetaQuery } from '../usePublicPreSchedulingMetaQuery';
import { fetchReceptionQueue, useReceptionQueueQuery } from '../useReceptionQueueQuery';
import { fetchSettingsAccesses, useSettingsAccessesQuery } from '../useSettingsAccessesQuery';
import { fetchSettingsBranches, useSettingsBranchesQuery } from '../useSettingsBranchesQuery';
import { fetchSettingsCompanies, useSettingsCompaniesQuery } from '../useSettingsCompaniesQuery';
import { fetchSettingsDoctors, useSettingsDoctorsQuery } from '../useSettingsDoctorsQuery';
import { fetchSettingsModules, useSettingsModulesQuery } from '../useSettingsModulesQuery';
import { fetchSettingsSectors, useSettingsSectorsQuery } from '../useSettingsSectorsQuery';
import { fetchSettingsUsers, useSettingsUsersQuery } from '../useSettingsUsersQuery';
import { fetchTissBatches, useTissBatchesQuery } from '../useTissBatchesQuery';

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn((options) => options),
}));

vi.mock('../../services/accessService', () => ({ default: { listAccesses: vi.fn() } }));
vi.mock('../../services/branchService', () => ({ default: { listBranches: vi.fn() } }));
vi.mock('../../services/branchSettingsService', () => ({ default: { getBranchSettings: vi.fn() } }));
vi.mock('../../services/companyService', () => ({ default: { listCompanies: vi.fn() } }));
vi.mock('../../services/doctorService', () => ({ default: { listDoctors: vi.fn() } }));
vi.mock('../../services/financeService', () => ({ default: { getEntries: vi.fn() } }));
vi.mock('../../services/insuranceService', () => ({ default: { listInsurances: vi.fn() } }));
vi.mock('../../services/invoiceService', () => ({ default: { getInvoices: vi.fn() } }));
vi.mock('../../services/leadService', () => ({ default: { list: vi.fn() } }));
vi.mock('../../services/medicalEquipmentService', () => ({ default: { list: vi.fn() } }));
vi.mock('../../services/moduleService', () => ({ moduleService: { getAll: vi.fn() } }));
vi.mock('../../services/patientService', () => ({ default: { listPatients: vi.fn() } }));
vi.mock('../../services/preAttendanceService', () => ({ default: { list: vi.fn() } }));
vi.mock('../../services/preSchedulingService', () => ({ default: { list: vi.fn(), getPublicMeta: vi.fn() } }));
vi.mock('../../services/procedureAnamnesisTemplateService', () => ({ default: { list: vi.fn() } }));
vi.mock('../../services/procedureNursingTemplateService', () => ({ default: { list: vi.fn() } }));
vi.mock('../../services/publicCheckInService', () => ({ default: { getBranchInfo: vi.fn() } }));
vi.mock('../../services/sectorService', () => ({ default: { listSectors: vi.fn() } }));
vi.mock('../../services/ticketService', () => ({ default: { list: vi.fn() } }));
vi.mock('../../services/tissBatchService', () => ({ default: { list: vi.fn() } }));
vi.mock('../../services/userService', () => ({ default: { listUsers: vi.fn() } }));

const mockedUseQuery = vi.mocked(useQuery);
const rows = [{ id: '1' }];

describe('query hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(accessService.listAccesses).mockResolvedValue(rows as any);
    vi.mocked(branchService.listBranches).mockResolvedValue(rows as any);
    vi.mocked(branchSettingsService.getBranchSettings).mockResolvedValue({ theme: 'blue' } as any);
    vi.mocked(companyService.listCompanies).mockResolvedValue(rows as any);
    vi.mocked(doctorService.listDoctors).mockResolvedValue(rows as any);
    vi.mocked(financeService.getEntries).mockResolvedValue({ data: rows } as any);
    vi.mocked(insuranceService.listInsurances).mockResolvedValue(rows as any);
    vi.mocked(invoiceService.getInvoices).mockResolvedValue({ items: rows } as any);
    vi.mocked(leadService.list).mockResolvedValue(rows as any);
    vi.mocked(medicalEquipmentService.list).mockResolvedValue(rows as any);
    vi.mocked(moduleService.getAll).mockResolvedValue(rows as any);
    vi.mocked(patientService.listPatients).mockResolvedValue(rows as any);
    vi.mocked(preAttendanceService.list).mockResolvedValue({ items: rows } as any);
    vi.mocked(preSchedulingService.list).mockResolvedValue({ items: rows } as any);
    vi.mocked(preSchedulingService.getPublicMeta).mockResolvedValue({ branchName: 'Centro' } as any);
    vi.mocked(procedureAnamnesisTemplateService.list).mockResolvedValue({ items: rows } as any);
    vi.mocked(procedureNursingTemplateService.list).mockResolvedValue({ items: rows } as any);
    vi.mocked(publicCheckInService.getBranchInfo).mockResolvedValue({ name: 'Centro' } as any);
    vi.mocked(sectorService.listSectors).mockResolvedValue(rows as any);
    vi.mocked(ticketService.list).mockResolvedValue(rows as any);
    vi.mocked(tissBatchService.list).mockResolvedValue({ items: rows } as any);
    vi.mocked(userService.listUsers).mockResolvedValue(rows as any);
  });

  it('fetches settings data through the expected services', async () => {
    await expect(fetchSettingsAccesses()).resolves.toEqual(rows);
    await expect(fetchSettingsBranches()).resolves.toEqual(rows);
    await expect(fetchSettingsCompanies()).resolves.toEqual(rows);
    await expect(fetchSettingsDoctors()).resolves.toEqual(rows);
    await expect(fetchSettingsModules()).resolves.toEqual(rows);
    await expect(fetchSettingsSectors()).resolves.toEqual(rows);
    await expect(fetchSettingsUsers()).resolves.toEqual(rows);

    expect(accessService.listAccesses).toHaveBeenCalled();
    expect(branchService.listBranches).toHaveBeenCalled();
    expect(companyService.listCompanies).toHaveBeenCalled();
    expect(doctorService.listDoctors).toHaveBeenCalled();
    expect(moduleService.getAll).toHaveBeenCalled();
    expect(sectorService.listSectors).toHaveBeenCalled();
    expect(userService.listUsers).toHaveBeenCalled();
  });

  it('normalizes list responses from admin fetchers', async () => {
    await expect(fetchFinanceEntries()).resolves.toEqual(rows);
    await expect(fetchInvoices()).resolves.toEqual(rows);
    await expect(fetchTissBatches()).resolves.toEqual(rows);
    await expect(fetchReceptionQueue()).resolves.toEqual(rows);
    await expect(fetchPreSchedulings({ search: 'ana', status: null, resolvedOnly: false })).resolves.toEqual(rows);
    await expect(fetchAnamnesisTemplates()).resolves.toEqual(rows);
    await expect(fetchNursingTemplates()).resolves.toEqual(rows);

    expect(preSchedulingService.list).toHaveBeenCalledWith({
      search: 'ana',
      status: undefined,
      resolvedOnly: false,
      limit: 500,
    });
    expect(preAttendanceService.list).toHaveBeenCalledWith({ queueType: 'Autorização e Recepção' });
    expect(procedureAnamnesisTemplateService.list).toHaveBeenCalledWith({ limit: 200 });
    expect(procedureNursingTemplateService.list).toHaveBeenCalledWith({ limit: 200 });
  });

  it('passes filters to ticket and lead services', async () => {
    const leadFilters = { status: 'OPEN' as const, search: 'Maria' };
    const ticketFilters = { status: 'OPEN' as const, type: 'SUPPORT' as const, priority: 'HIGH' as const, search: 'bug' };

    await fetchAdminLeads(leadFilters);
    await fetchAdminTickets(ticketFilters);

    expect(leadService.list).toHaveBeenCalledWith(leadFilters);
    expect(ticketService.list).toHaveBeenCalledWith(ticketFilters);
  });

  it('configures query keys and refresh intervals for simple hooks', () => {
    useSettingsAccessesQuery();
    expect(mockedUseQuery).toHaveBeenLastCalledWith(expect.objectContaining({ queryKey: queryKeys.settingsAccesses, refetchInterval: 30_000 }));

    useSettingsBranchesQuery();
    expect(mockedUseQuery).toHaveBeenLastCalledWith(expect.objectContaining({ queryKey: queryKeys.settingsBranches, refetchInterval: 30_000 }));

    useSettingsCompaniesQuery();
    expect(mockedUseQuery).toHaveBeenLastCalledWith(expect.objectContaining({ queryKey: queryKeys.settingsCompanies, refetchInterval: 30_000 }));

    useSettingsDoctorsQuery();
    expect(mockedUseQuery).toHaveBeenLastCalledWith(expect.objectContaining({ queryKey: queryKeys.settingsDoctors, refetchInterval: 30_000 }));

    useSettingsModulesQuery();
    expect(mockedUseQuery).toHaveBeenLastCalledWith(expect.objectContaining({ queryKey: queryKeys.settingsModules, refetchInterval: 60_000 }));

    useSettingsSectorsQuery();
    expect(mockedUseQuery).toHaveBeenLastCalledWith(expect.objectContaining({ queryKey: queryKeys.settingsSectors, refetchInterval: 30_000 }));

    useSettingsUsersQuery();
    expect(mockedUseQuery).toHaveBeenLastCalledWith(expect.objectContaining({ queryKey: queryKeys.settingsUsers, refetchInterval: 30_000 }));
  });

  it('configures admin and public query hooks with dynamic keys', () => {
    useAdminLeadsQuery({ status: 'OPEN', search: 'maria' } as any);
    expect(mockedUseQuery).toHaveBeenLastCalledWith(expect.objectContaining({
      queryKey: [...queryKeys.adminLeads, 'OPEN', 'maria'],
      refetchInterval: 10_000,
    }));

    useAdminTicketsQuery({ status: 'OPEN', type: 'BUG', priority: 'HIGH', sort: 'OLDEST', search: 'erro' } as any);
    expect(mockedUseQuery).toHaveBeenLastCalledWith(expect.objectContaining({
      queryKey: [...queryKeys.adminTickets, 'OPEN', 'BUG', 'HIGH', 'OLDEST', 'erro'],
      refetchInterval: 10_000,
    }));

    useBranchSettingsQuery('b1');
    expect(mockedUseQuery).toHaveBeenLastCalledWith(expect.objectContaining({
      queryKey: [...queryKeys.settingsBranchSettings, 'b1'],
      enabled: true,
      refetchInterval: 30_000,
    }));

    usePublicBranchInfoQuery('', true);
    expect(mockedUseQuery).toHaveBeenLastCalledWith(expect.objectContaining({
      queryKey: [...queryKeys.publicBranchInfo, ''],
      enabled: false,
      retry: false,
    }));

    usePublicPreSchedulingMetaQuery('token-1');
    expect(mockedUseQuery).toHaveBeenLastCalledWith(expect.objectContaining({
      queryKey: [...queryKeys.publicPreSchedulingMeta, 'token-1'],
      enabled: true,
      retry: false,
    }));
  });

  it('configures remaining list hooks with their query keys', () => {
    useDoctorsAdminQuery();
    expect(mockedUseQuery).toHaveBeenLastCalledWith(expect.objectContaining({ queryKey: queryKeys.doctorsAdmin }));
    useInsurancesAdminQuery();
    expect(mockedUseQuery).toHaveBeenLastCalledWith(expect.objectContaining({ queryKey: queryKeys.insurancesAdmin }));
    usePatientsAdminQuery();
    expect(mockedUseQuery).toHaveBeenLastCalledWith(expect.objectContaining({ queryKey: queryKeys.patientsAdmin }));
    useMedicalEquipmentsQuery();
    expect(mockedUseQuery).toHaveBeenLastCalledWith(expect.objectContaining({ queryKey: queryKeys.medicalEquipments }));
    useFinanceEntriesQuery();
    expect(mockedUseQuery).toHaveBeenLastCalledWith(expect.objectContaining({ queryKey: queryKeys.financeEntries }));
    useInvoicesQuery();
    expect(mockedUseQuery).toHaveBeenLastCalledWith(expect.objectContaining({ queryKey: queryKeys.invoices }));
    useTissBatchesQuery();
    expect(mockedUseQuery).toHaveBeenLastCalledWith(expect.objectContaining({ queryKey: queryKeys.tissBatches }));
    useReceptionQueueQuery();
    expect(mockedUseQuery).toHaveBeenLastCalledWith(expect.objectContaining({ queryKey: queryKeys.receptionQueue, refetchInterval: 5_000 }));
    useAnamnesisTemplatesQuery();
    expect(mockedUseQuery).toHaveBeenLastCalledWith(expect.objectContaining({ queryKey: queryKeys.anamnesisTemplates }));
    useNursingTemplatesQuery();
    expect(mockedUseQuery).toHaveBeenLastCalledWith(expect.objectContaining({ queryKey: queryKeys.nursingTemplates }));
    usePreSchedulingsQuery({ search: '', status: 'pending', resolvedOnly: true });
    expect(mockedUseQuery).toHaveBeenLastCalledWith(expect.objectContaining({
      queryKey: [...queryKeys.preSchedulings, '', 'pending', 'history'],
      refetchInterval: 10_000,
    }));
  });

  it('uses dynamic fetchers from public and branch settings hooks', async () => {
    await expect(fetchBranchSettings('b1')).resolves.toEqual({ theme: 'blue' });
    expect(branchSettingsService.getBranchSettings).toHaveBeenCalledWith('b1');

    const branchInfoOptions = usePublicBranchInfoQuery('b1') as any;
    await expect(branchInfoOptions.queryFn()).resolves.toEqual({ name: 'Centro' });
    expect(publicCheckInService.getBranchInfo).toHaveBeenCalledWith('b1');

    const metaOptions = usePublicPreSchedulingMetaQuery('token-1') as any;
    await expect(metaOptions.queryFn()).resolves.toEqual({ branchName: 'Centro' });
    expect(preSchedulingService.getPublicMeta).toHaveBeenCalledWith('token-1');
  });
});
