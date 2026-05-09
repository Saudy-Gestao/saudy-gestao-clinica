import { useQuery } from '@tanstack/react-query';
import biService, { type BIOverviewParams } from '../services/biService';
import { queryKeys } from '../lib/queryKeys';

export const useBIOverviewQuery = (params: BIOverviewParams) => useQuery({
  queryKey: [...queryKeys.biOverview, params.startDate, params.endDate, params.branchId || 'all', params.sectorId || 'all', params.doctorId || 'all', params.insuranceId || 'all', params.procedureId || 'all'],
  queryFn: () => biService.getOverview(params),
  refetchInterval: 30_000,
  retry: 1,
});

export const useBIOccupancyQuery = (params: BIOverviewParams) => useQuery({
  queryKey: [...queryKeys.biOccupancy, params.startDate, params.endDate, params.branchId || 'all', params.sectorId || 'all', params.doctorId || 'all', params.insuranceId || 'all', params.procedureId || 'all'],
  queryFn: () => biService.getOccupancy(params),
  refetchInterval: 30_000,
  retry: 1,
});

export const useBIFinancialQuery = (params: BIOverviewParams) => useQuery({
  queryKey: [...queryKeys.biFinancial, params.startDate, params.endDate, params.branchId || 'all', params.sectorId || 'all', params.doctorId || 'all', params.insuranceId || 'all', params.procedureId || 'all'],
  queryFn: () => biService.getFinancial(params),
  refetchInterval: 30_000,
  retry: 1,
});

export const useBIClinicalQuery = (params: BIOverviewParams) => useQuery({
  queryKey: [...queryKeys.biClinical, params.startDate, params.endDate, params.branchId || 'all', params.sectorId || 'all', params.doctorId || 'all', params.insuranceId || 'all', params.procedureId || 'all'],
  queryFn: () => biService.getClinical(params),
  refetchInterval: 30_000,
  retry: 1,
});

export const useBIResourcesQuery = (params: BIOverviewParams) => useQuery({
  queryKey: [...queryKeys.biResources, params.startDate, params.endDate, params.branchId || 'all', params.sectorId || 'all', params.doctorId || 'all', params.insuranceId || 'all', params.procedureId || 'all'],
  queryFn: () => biService.getResources(params),
  refetchInterval: 30_000,
  retry: 1,
});

export const useBIAuthorizationsQuery = (params: BIOverviewParams) => useQuery({
  queryKey: [...queryKeys.biAuthorizations, params.startDate, params.endDate, params.branchId || 'all', params.sectorId || 'all', params.doctorId || 'all', params.insuranceId || 'all', params.procedureId || 'all'],
  queryFn: () => biService.getAuthorizations(params),
  refetchInterval: 30_000,
  retry: 1,
});

export const useBITeaQuery = (params: BIOverviewParams) => useQuery({
  queryKey: [...queryKeys.biTea, params.startDate, params.endDate, params.branchId || 'all', params.sectorId || 'all', params.doctorId || 'all', params.insuranceId || 'all', params.procedureId || 'all'],
  queryFn: () => biService.getTea(params),
  refetchInterval: 30_000,
  retry: 1,
});

export const useBIReportsQuery = (params: BIOverviewParams) => useQuery({
  queryKey: [...queryKeys.biReports, params.startDate, params.endDate, params.branchId || 'all', params.sectorId || 'all', params.doctorId || 'all', params.insuranceId || 'all', params.procedureId || 'all'],
  queryFn: () => biService.getReports(params),
  refetchInterval: 30_000,
  retry: 1,
});

export const useBICommunicationQuery = (params: BIOverviewParams) => useQuery({
  queryKey: [...queryKeys.biCommunication, params.startDate, params.endDate, params.branchId || 'all', params.sectorId || 'all', params.doctorId || 'all', params.insuranceId || 'all', params.procedureId || 'all'],
  queryFn: () => biService.getCommunication(params),
  refetchInterval: 30_000,
  retry: 1,
});
