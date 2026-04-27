import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { fetchAnamnesisTemplates, useAnamnesisTemplatesQuery } from '../useAnamnesisTemplatesQuery';
import { fetchConvenioAuthorizations, useConvenioAuthorizationsQuery } from '../useConvenioAuthorizationsQuery';
import { fetchMedicalEquipments, useMedicalEquipmentsQuery } from '../useMedicalEquipmentsQuery';
import { fetchNursingTemplates, useNursingTemplatesQuery } from '../useNursingTemplatesQuery';
import { fetchSettingsAccesses, useSettingsAccessesQuery } from '../useSettingsAccessesQuery';
import { fetchSettingsBranches, useSettingsBranchesQuery } from '../useSettingsBranchesQuery';
import { fetchSettingsCompanies, useSettingsCompaniesQuery } from '../useSettingsCompaniesQuery';
import { fetchSettingsDoctors, useSettingsDoctorsQuery } from '../useSettingsDoctorsQuery';
import { fetchSettingsModules, useSettingsModulesQuery } from '../useSettingsModulesQuery';
import { fetchSettingsSectors, useSettingsSectorsQuery } from '../useSettingsSectorsQuery';
import { fetchSettingsUsers, useSettingsUsersQuery } from '../useSettingsUsersQuery';
import convenioAuthorizationService from '../../services/convenioAuthorizationService';
import procedureAnamnesisTemplateService from '../../services/procedureAnamnesisTemplateService';
import medicalEquipmentService from '../../services/medicalEquipmentService';
import procedureNursingTemplateService from '../../services/procedureNursingTemplateService';
import accessService from '../../services/accessService';
import branchService from '../../services/branchService';
import companyService from '../../services/companyService';
import doctorService from '../../services/doctorService';
import { moduleService } from '../../services/moduleService';
import sectorService from '../../services/sectorService';
import userService from '../../services/userService';

const {
  convenioListMock,
  anamnesisListMock,
  medicalEquipmentListMock,
  nursingListMock,
  settingsAccessesMock,
  settingsBranchesMock,
  settingsCompaniesMock,
  settingsDoctorsMock,
  settingsModulesMock,
  settingsSectorsMock,
  settingsUsersMock,
} = vi.hoisted(() => ({
  convenioListMock: vi.fn(),
  anamnesisListMock: vi.fn(),
  medicalEquipmentListMock: vi.fn(),
  nursingListMock: vi.fn(),
  settingsAccessesMock: vi.fn(),
  settingsBranchesMock: vi.fn(),
  settingsCompaniesMock: vi.fn(),
  settingsDoctorsMock: vi.fn(),
  settingsModulesMock: vi.fn(),
  settingsSectorsMock: vi.fn(),
  settingsUsersMock: vi.fn(),
}));

vi.mock('../../services/convenioAuthorizationService', () => ({
  default: {
    list: convenioListMock,
  },
}));

vi.mock('../../services/procedureAnamnesisTemplateService', () => ({
  default: {
    list: anamnesisListMock,
  },
}));

vi.mock('../../services/medicalEquipmentService', () => ({
  default: {
    list: medicalEquipmentListMock,
  },
}));

vi.mock('../../services/procedureNursingTemplateService', () => ({
  default: {
    list: nursingListMock,
  },
}));

vi.mock('../../services/accessService', () => ({
  default: {
    listAccesses: settingsAccessesMock,
  },
}));

vi.mock('../../services/branchService', () => ({
  default: {
    listBranches: settingsBranchesMock,
  },
}));

vi.mock('../../services/companyService', () => ({
  default: {
    listCompanies: settingsCompaniesMock,
  },
}));

vi.mock('../../services/doctorService', () => ({
  default: {
    listDoctors: settingsDoctorsMock,
  },
}));

vi.mock('../../services/moduleService', () => ({
  moduleService: {
    getAll: settingsModulesMock,
  },
}));

vi.mock('../../services/sectorService', () => ({
  default: {
    listSectors: settingsSectorsMock,
  },
}));

vi.mock('../../services/userService', () => ({
  default: {
    listUsers: settingsUsersMock,
  },
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('template and settings hooks', () => {
  it('normalizes template and authorization fetchers', async () => {
    vi.mocked(procedureAnamnesisTemplateService.list).mockResolvedValue({ items: [{ id: 'a1' }] } as any);
    vi.mocked(procedureNursingTemplateService.list).mockResolvedValue({ data: [{ id: 'n1' }] } as any);
    vi.mocked(convenioAuthorizationService.list).mockResolvedValue({ items: [{ id: 'c1' }] } as any);
    vi.mocked(medicalEquipmentService.list).mockResolvedValue([{ id: 'm1' }] as any);

    await expect(fetchAnamnesisTemplates()).resolves.toEqual([{ id: 'a1' }]);
    await expect(fetchNursingTemplates()).resolves.toEqual([]);
    await expect(
      fetchConvenioAuthorizations({
        search: 'maria',
        sourceFilter: ['APPOINTMENT' as any],
        statusFilter: ['PENDING' as any],
      }),
    ).resolves.toEqual([{ id: 'c1' }]);
    await expect(fetchMedicalEquipments()).resolves.toEqual([{ id: 'm1' }]);

    expect(procedureAnamnesisTemplateService.list).toHaveBeenCalledWith({ limit: 200 });
    expect(procedureNursingTemplateService.list).toHaveBeenCalledWith({ limit: 200 });
    expect(convenioAuthorizationService.list).toHaveBeenCalledWith({
      search: 'maria',
      statuses: ['PENDING'],
      sourceTypes: ['APPOINTMENT'],
      limit: 5000,
      offset: 0,
    });
  });

  it('resolves template hooks with normalized data', async () => {
    vi.mocked(procedureAnamnesisTemplateService.list).mockResolvedValue({ items: [{ id: 'a2' }] } as any);
    vi.mocked(procedureNursingTemplateService.list).mockResolvedValue({ items: [{ id: 'n2' }] } as any);
    vi.mocked(convenioAuthorizationService.list).mockResolvedValue({ items: [{ id: 'c2' }] } as any);
    vi.mocked(medicalEquipmentService.list).mockResolvedValue([{ id: 'm2' }] as any);

    const anamnesis = renderHook(() => useAnamnesisTemplatesQuery(), { wrapper: createWrapper() });
    const nursing = renderHook(() => useNursingTemplatesQuery(), { wrapper: createWrapper() });
    const convenio = renderHook(
      () => useConvenioAuthorizationsQuery({ search: 'joao', sourceFilter: [], statusFilter: [] }),
      { wrapper: createWrapper() },
    );
    const equipments = renderHook(() => useMedicalEquipmentsQuery(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(anamnesis.result.current.isSuccess).toBe(true);
      expect(nursing.result.current.isSuccess).toBe(true);
      expect(convenio.result.current.isSuccess).toBe(true);
      expect(equipments.result.current.isSuccess).toBe(true);
    });

    expect(anamnesis.result.current.data).toEqual([{ id: 'a2' }]);
    expect(nursing.result.current.data).toEqual([{ id: 'n2' }]);
    expect(convenio.result.current.data).toEqual([{ id: 'c2' }]);
    expect(equipments.result.current.data).toEqual([{ id: 'm2' }]);
  });

  it('forwards settings hooks to their services', async () => {
    vi.mocked(accessService.listAccesses).mockResolvedValue([{ id: 'acc1' }] as any);
    vi.mocked(branchService.listBranches).mockResolvedValue([{ id: 'b1' }] as any);
    vi.mocked(companyService.listCompanies).mockResolvedValue([{ id: 'co1' }] as any);
    vi.mocked(doctorService.listDoctors).mockResolvedValue([{ id: 'd1' }] as any);
    vi.mocked(moduleService.getAll).mockResolvedValue([{ id: 'mo1' }] as any);
    vi.mocked(sectorService.listSectors).mockResolvedValue([{ id: 's1' }] as any);
    vi.mocked(userService.listUsers).mockResolvedValue([{ id: 'u1' }] as any);

    await expect(fetchSettingsAccesses()).resolves.toEqual([{ id: 'acc1' }]);
    await expect(fetchSettingsBranches()).resolves.toEqual([{ id: 'b1' }]);
    await expect(fetchSettingsCompanies()).resolves.toEqual([{ id: 'co1' }]);
    await expect(fetchSettingsDoctors()).resolves.toEqual([{ id: 'd1' }]);
    await expect(fetchSettingsModules()).resolves.toEqual([{ id: 'mo1' }]);
    await expect(fetchSettingsSectors()).resolves.toEqual([{ id: 's1' }]);
    await expect(fetchSettingsUsers()).resolves.toEqual([{ id: 'u1' }]);

    const accesses = renderHook(() => useSettingsAccessesQuery(), { wrapper: createWrapper() });
    const branches = renderHook(() => useSettingsBranchesQuery(), { wrapper: createWrapper() });
    const companies = renderHook(() => useSettingsCompaniesQuery(), { wrapper: createWrapper() });
    const doctors = renderHook(() => useSettingsDoctorsQuery(), { wrapper: createWrapper() });
    const modules = renderHook(() => useSettingsModulesQuery(), { wrapper: createWrapper() });
    const sectors = renderHook(() => useSettingsSectorsQuery(), { wrapper: createWrapper() });
    const users = renderHook(() => useSettingsUsersQuery(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(accesses.result.current.isSuccess).toBe(true);
      expect(branches.result.current.isSuccess).toBe(true);
      expect(companies.result.current.isSuccess).toBe(true);
      expect(doctors.result.current.isSuccess).toBe(true);
      expect(modules.result.current.isSuccess).toBe(true);
      expect(sectors.result.current.isSuccess).toBe(true);
      expect(users.result.current.isSuccess).toBe(true);
    });

    expect(accesses.result.current.data).toEqual([{ id: 'acc1' }]);
    expect(branches.result.current.data).toEqual([{ id: 'b1' }]);
    expect(companies.result.current.data).toEqual([{ id: 'co1' }]);
    expect(doctors.result.current.data).toEqual([{ id: 'd1' }]);
    expect(modules.result.current.data).toEqual([{ id: 'mo1' }]);
    expect(sectors.result.current.data).toEqual([{ id: 's1' }]);
    expect(users.result.current.data).toEqual([{ id: 'u1' }]);
  });
});